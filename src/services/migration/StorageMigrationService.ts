/**
 * Migration service to unify image storage from dual-database to single source
 * Transfers LayerStorageService blobs to ImageStorageService
 */

import Dexie from 'dexie'

import type { LayerNode } from '../../store/slices/layerSystemSlice'
import { imageStorage } from '../storage/UnifiedImageStorageService'
import { layerStorage } from '../storage/UpdatedLayerStorageService'

export class StorageMigrationService {
  private static MIGRATION_KEY = 'infinifox-storage-migration-v2'

  /**
   * Check if migration is needed
   */
  static async isMigrationNeeded(): Promise<boolean> {
    const migrated = localStorage.getItem(this.MIGRATION_KEY)
    if (migrated === 'complete') return false

    // Check if layerBlobs table exists and has data
    try {
      const count = await layerStorage.db.layerBlobs.count()
      return count > 0
    } catch {
      return false
    }
  }

  /**
   * Perform migration from dual storage to unified storage
   */
  static async migrate(): Promise<void> {
    console.log('Starting storage migration to unified system...')

    try {
      // Start transaction across both databases
      await this.transferBlobsToImageStorage()
      await this.updateLayersToUseImageIds()
      await this.cleanupLayerBlobsTable()

      // Mark migration complete
      localStorage.setItem(this.MIGRATION_KEY, 'complete')
      console.log('Storage migration completed successfully')
    } catch (error) {
      console.error('Storage migration failed:', error)
      throw error
    }
  }

  /**
   * Transfer all blobs from LayerStorageService to ImageStorageService
   */
  private static async transferBlobsToImageStorage(): Promise<void> {
    const layerBlobs = await layerStorage.db.layerBlobs.toArray()
    console.log(`Transferring ${layerBlobs.length} blobs to unified storage`)

    for (const layerBlob of layerBlobs) {
      // Generate consistent image ID
      const imageId = this.generateImageId(layerBlob.layerId)

      // Check if already exists in ImageStorageService
      const existing = await imageStorage.loadFromIndexedDB(imageId)
      if (existing) {
        console.log(`Image ${imageId} already exists, skipping`)
        continue
      }

      // Get layer metadata for image dimensions
      const layer = await layerStorage.db.layers.get(layerBlob.layerId)
      if (!layer || layer.type !== 'image') {
        console.warn(`Layer ${layerBlob.layerId} not found or not image type`)
        continue
      }

      // Transfer blob to ImageStorageService
      await imageStorage.createFromBlob(imageId, layerBlob.blob, {
        type: 'migrated',
        width: layer.imageProps?.width || 512,
        height: layer.imageProps?.height || 512,
        usedIn: new Set(['layer-system']),
      })

      console.log(`Migrated blob for layer ${layerBlob.layerId} as ${imageId}`)
    }
  }

  /**
   * Update all image layers to use imageId references instead of blob URLs
   */
  private static async updateLayersToUseImageIds(): Promise<void> {
    const layers = await layerStorage.db.layers.toArray()
    const imageLayers = layers.filter((l) => l.type === 'image')

    console.log(`Updating ${imageLayers.length} image layers to use imageId references`)

    for (const layer of imageLayers) {
      if (!layer.imageProps) continue

      const imageId = this.generateImageId(layer.id)

      // Update layer to use imageId instead of src/blobId
      const updatedLayer: LayerNode = {
        ...layer,
        imageProps: {
          ...layer.imageProps,
          imageId, // Add imageId reference
          src: undefined, // Remove direct URL
          blobId: undefined, // Remove old blob reference
        },
      }

      await layerStorage.db.layers.put(updatedLayer)

      // Track layer reference in ImageStorageService
      await imageStorage.addLayerReference(imageId, layer.id)
    }
  }

  /**
   * Remove layerBlobs table from LayerStorageService database
   */
  private static async cleanupLayerBlobsTable(): Promise<void> {
    console.log('Removing layerBlobs table from LayerStorageService')

    // Close current database connection
    layerStorage.db.close()

    // Reopen with new schema version
    const db = new Dexie('InfiniFoxLayerStorage')
    db.version(2).stores({
      layers: 'id, type, parentId, createdAt',
      layerMetadata: 'id',
      // layerBlobs table removed
    })

    await db.open()
    db.close()

    console.log('LayerBlobs table removed')
  }

  /**
   * Generate consistent image ID from layer ID
   */
  private static generateImageId(layerId: string): string {
    // Use consistent format for migrated images
    if (layerId.startsWith('layer-')) {
      return layerId.replace('layer-', 'img-')
    }
    return `img-${layerId}`
  }

  /**
   * Rollback migration if needed (for recovery)
   */
  static async rollback(): Promise<void> {
    console.warn('Rolling back storage migration...')

    // Clear migration flag
    localStorage.removeItem(this.MIGRATION_KEY)

    // Note: Actual rollback would require database backups
    // This is a placeholder for the rollback logic
    console.warn('Rollback complete - manual database restoration may be required')
  }
}
