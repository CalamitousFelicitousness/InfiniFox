/**
 * LayerStorageService - Manages layer hierarchy persistence
 * References images by ID, delegates blob storage to UnifiedImageStorageService
 */

import Dexie from 'dexie'
import type { Table } from 'dexie'

import type { LayerNode } from '../../store/slices/layerSystemSlice'

export interface LayerStorageMetadata {
  id: 'layer-metadata'
  layerOrder: string[]
  activeArtboardId: string | null
  version: number
  lastUpdated: number
}

// Updated ImageLayerProps to use imageId reference
export interface ImageLayerProps {
  imageId: string // Reference to UnifiedImageStorageService
  width: number
  height: number
  naturalWidth?: number
  naturalHeight?: number
}

class LayerStorageDatabase extends Dexie {
  layers!: Table<LayerNode>
  layerMetadata!: Table<LayerStorageMetadata>

  constructor() {
    super('InfiniFoxLayerStorage')

    // Version 1: Original schema
    this.version(1).stores({
      layers: 'id, type, parentId, createdAt',
      layerBlobs: 'blobId, layerId, createdAt',
      layerMetadata: 'id',
    })

    // Version 2: Remove blob storage
    this.version(2).stores({
      layers: 'id, type, parentId, createdAt',
      layerMetadata: 'id',
      // layerBlobs table removed
    })
  }
}

export class UpdatedLayerStorageService {
  private db: LayerStorageDatabase

  constructor() {
    this.db = new LayerStorageDatabase()
  }

  /**
   * Save layer structure with image ID references
   */
  async saveLayerStructure(
    layers: Map<string, LayerNode>,
    layerOrder: string[],
    activeArtboardId: string | null
  ): Promise<void> {
    try {
      await this.db.transaction('rw', this.db.layers, this.db.layerMetadata, async () => {
        // Clear existing layers
        await this.db.layers.clear()

        // Save each layer with imageId references
        const layerArray = Array.from(layers.values())
        for (const layer of layerArray) {
          // Ensure image layers use imageId
          if (layer.type === 'image' && layer.imageProps) {
            const processedLayer = {
              ...layer,
              imageProps: {
                ...layer.imageProps,
                // Keep imageId, remove src and blobId
                imageId: 'imageId' in layer.imageProps ? layer.imageProps.imageId : '',
                width: layer.imageProps.width,
                height: layer.imageProps.height,
                naturalWidth: layer.imageProps.naturalWidth,
                naturalHeight: layer.imageProps.naturalHeight,
              },
            }
            await this.db.layers.put(processedLayer)
          } else {
            await this.db.layers.put(layer)
          }
        }

        // Save metadata
        const metadata: LayerStorageMetadata = {
          id: 'layer-metadata',
          layerOrder,
          activeArtboardId,
          version: 2,
          lastUpdated: Date.now(),
        }
        await this.db.layerMetadata.put(metadata)
      })
    } catch (error) {
      console.error('Failed to save layer structure:', error)
      throw error
    }
  }

  /**
   * Load layer structure (URLs resolved separately by components)
   */
  async loadLayerStructure(): Promise<{
    layers: Map<string, LayerNode>
    layerOrder: string[]
    activeArtboardId: string | null
  } | null> {
    try {
      const metadata = await this.db.layerMetadata.get('layer-metadata')
      if (!metadata) return null

      const layerArray = await this.db.layers.toArray()
      const layers = new Map<string, LayerNode>()

      for (const layer of layerArray) {
        // Image URLs will be resolved by components using imageId
        layers.set(layer.id, layer)
      }

      return {
        layers,
        layerOrder: metadata.layerOrder,
        activeArtboardId: metadata.activeArtboardId,
      }
    } catch (error) {
      console.error('Failed to load layer structure:', error)
      return null
    }
  }

  /**
   * Save a single layer
   */
  async saveLayer(layer: LayerNode): Promise<void> {
    // Ensure image layers use imageId
    if (layer.type === 'image' && layer.imageProps) {
      const processedLayer = {
        ...layer,
        imageProps: {
          imageId: 'imageId' in layer.imageProps ? layer.imageProps.imageId : '',
          width: layer.imageProps.width,
          height: layer.imageProps.height,
          naturalWidth: layer.imageProps.naturalWidth,
          naturalHeight: layer.imageProps.naturalHeight,
        },
      }
      await this.db.layers.put(processedLayer)
    } else {
      await this.db.layers.put(layer)
    }
  }

  /**
   * Delete a layer
   */
  async deleteLayer(layerId: string): Promise<void> {
    const layer = await this.db.layers.get(layerId)
    if (!layer) return

    // Note: Image cleanup handled by UnifiedImageStorageService.removeLayerReference()
    await this.db.layers.delete(layerId)

    // Recursively delete children
    if (layer.children) {
      for (const childId of layer.children) {
        await this.deleteLayer(childId)
      }
    }
  }

  /**
   * Clear all persisted layers and metadata
   */
  async clearAll(): Promise<void> {
    try {
      await this.db.transaction('rw', this.db.layers, this.db.layerMetadata, async () => {
        await this.db.layers.clear()
        await this.db.layerMetadata.clear()
      })
      console.log('Cleared all persisted layer data')
    } catch (error) {
      console.error('Failed to clear layer storage:', error)
      throw error
    }
  }

  /**
   * Get storage info
   */
  async getStorageInfo(): Promise<{
    layerCount: number
    version: number
  }> {
    const layerCount = await this.db.layers.count()
    const metadata = await this.db.layerMetadata.get('layer-metadata')

    return {
      layerCount,
      version: metadata?.version || 1,
    }
  }
}

// Export singleton
export const layerStorage = new UpdatedLayerStorageService()
