/**
 * Unified ImageStorageService - Single source of truth for all blob storage
 * Manages blob persistence, URL lifecycle, and layer references
 */

import Dexie from 'dexie'

export interface ImageMetadata {
  type: 'generated' | 'uploaded' | 'reference' | 'migrated'
  prompt?: string
  negativePrompt?: string
  seed?: number
  steps?: number
  cfgScale?: number
  width: number
  height: number
  sampler?: string
  denoisingStrength?: number
  usedIn?: Set<'img2img' | 'inpaint' | 'controlnet' | 'layer-system'>
}

export interface StoredImage {
  id: string
  blob: Blob
  metadata: ImageMetadata
  timestamp: number
  position?: { x: number; y: number }
  layerReferences: Set<string>
}

export interface PersistedImage {
  id: string
  blob: Blob
  metadata: ImageMetadata
  timestamp: number
  position?: { x: number; y: number }
  layerReferences: string[] // Array for IndexedDB serialization
}

class UnifiedImageDatabase extends Dexie {
  images!: Dexie.Table<PersistedImage, string>

  constructor() {
    super('infinifox-unified-images')

    this.version(1).stores({
      images: 'id, timestamp, [metadata.type]',
    })

    // Version 2: Add layer references
    this.version(2)
      .stores({
        images: 'id, timestamp, [metadata.type]',
      })
      .upgrade(async (tx) => {
        // Add empty layerReferences to existing images
        const images = await tx.table('images').toArray()
        for (const img of images) {
          if (!img.layerReferences) {
            img.layerReferences = []
            await tx.table('images').put(img)
          }
        }
      })
  }
}

export class UnifiedImageStorageService {
  private static instance: UnifiedImageStorageService
  private db: UnifiedImageDatabase
  private objectUrls: Map<string, string> = new Map()
  private urlRefCount: Map<string, number> = new Map()
  private cleanupTimer: NodeJS.Timeout | null = null

  private constructor() {
    this.db = new UnifiedImageDatabase()
    this.schedulePeriodicCleanup()
  }

  static getInstance(): UnifiedImageStorageService {
    if (!UnifiedImageStorageService.instance) {
      UnifiedImageStorageService.instance = new UnifiedImageStorageService()
    }
    return UnifiedImageStorageService.instance
  }

  /**
   * Create image from blob with metadata
   */
  async createFromBlob(id: string, blob: Blob, metadata: ImageMetadata): Promise<StoredImage> {
    const persistedImage: PersistedImage = {
      id,
      blob,
      metadata,
      timestamp: Date.now(),
      layerReferences: [],
    }

    await this.db.images.put(persistedImage)

    return {
      ...persistedImage,
      layerReferences: new Set(persistedImage.layerReferences),
    }
  }

  /**
   * Create image from base64 with metadata
   */
  async createFromBase64(
    id: string,
    base64: string,
    metadata: ImageMetadata
  ): Promise<{ objectUrl: string; metadata: ImageMetadata }> {
    const binaryString = atob(base64.startsWith('data:') ? base64.split(',')[1] : base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    const blob = new Blob([bytes], { type: 'image/png' })

    await this.createFromBlob(id, blob, metadata)
    const objectUrl = await this.getOrCreateObjectUrl(id)

    return { objectUrl: objectUrl || '', metadata }
  }

  /**
   * Get or create object URL for image
   */
  async getOrCreateObjectUrl(id: string): Promise<string | null> {
    // Check existing URL
    let url = this.objectUrls.get(id)
    if (url && this.isUrlValid(url)) {
      this.incrementRefCount(url)
      return url
    }

    // Load from database and create new URL
    const image = await this.db.images.get(id)
    if (!image) return null

    url = URL.createObjectURL(image.blob)
    this.objectUrls.set(id, url)
    this.urlRefCount.set(url, 1)

    return url
  }

  /**
   * Release object URL reference
   */
  releaseObjectUrl(id: string): void {
    const url = this.objectUrls.get(id)
    if (!url) return

    const count = (this.urlRefCount.get(url) || 1) - 1
    if (count <= 0) {
      // Schedule for cleanup, not immediate revocation
      this.scheduleUrlCleanup(id, url)
    } else {
      this.urlRefCount.set(url, count)
    }
  }

  /**
   * Add layer reference to image
   */
  async addLayerReference(imageId: string, layerId: string): Promise<void> {
    const image = await this.db.images.get(imageId)
    if (!image) return

    const refs = new Set(image.layerReferences)
    refs.add(layerId)
    image.layerReferences = Array.from(refs)

    await this.db.images.put(image)
  }

  /**
   * Remove layer reference from image
   */
  async removeLayerReference(imageId: string, layerId: string): Promise<void> {
    const image = await this.db.images.get(imageId)
    if (!image) return

    const refs = new Set(image.layerReferences)
    refs.delete(layerId)
    image.layerReferences = Array.from(refs)

    await this.db.images.put(image)

    // Delete image if no references remain
    if (image.layerReferences.length === 0 && !image.position) {
      await this.deleteImage(imageId)
    }
  }

  /**
   * Update image position in database
   */
  async updateImagePosition(id: string, x: number, y: number): Promise<void> {
    const image = await this.db.images.get(id)
    if (!image) return

    image.position = { x, y }
    await this.db.images.put(image)
  }

  /**
   * Export image as base64 string
   */
  async exportAsBase64(id: string): Promise<string> {
    const image = await this.db.images.get(id)
    if (!image) throw new Error(`Image ${id} not found`)

    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = reader.result as string
        resolve(base64.split(',')[1])
      }
      reader.onerror = reject
      reader.readAsDataURL(image.blob)
    })
  }

  /**
   * Load image from database
   */
  async loadFromIndexedDB(id: string): Promise<StoredImage | null> {
    const image = await this.db.images.get(id)
    if (!image) return null

    return {
      ...image,
      layerReferences: new Set(image.layerReferences),
    }
  }

  /**
   * Delete image and cleanup
   */
  async deleteImage(id: string): Promise<void> {
    // Revoke URL if exists
    const url = this.objectUrls.get(id)
    if (url) {
      URL.revokeObjectURL(url)
      this.objectUrls.delete(id)
      this.urlRefCount.delete(url)
    }

    // Delete from database
    await this.db.images.delete(id)
  }

  /**
   * Check if URL is still valid
   */
  private isUrlValid(url: string): boolean {
    // Simple check - could be enhanced with actual fetch test
    return url.startsWith('blob:') && this.urlRefCount.has(url)
  }

  /**
   * Increment reference count for URL
   */
  private incrementRefCount(url: string): void {
    const count = this.urlRefCount.get(url) || 0
    this.urlRefCount.set(url, count + 1)
  }

  /**
   * Schedule URL for cleanup
   */
  private scheduleUrlCleanup(id: string, url: string): void {
    // Wait 5 seconds before cleanup to handle rapid mount/unmount
    setTimeout(() => {
      const currentCount = this.urlRefCount.get(url) || 0
      if (currentCount <= 0) {
        URL.revokeObjectURL(url)
        this.objectUrls.delete(id)
        this.urlRefCount.delete(url)
      }
    }, 5000)
  }

  /**
   * Periodic cleanup of orphaned URLs
   */
  private schedulePeriodicCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupOrphanedUrls()
    }, 60000) // Every minute
  }

  /**
   * Clean orphaned URLs
   */
  private cleanupOrphanedUrls(): void {
    const orphaned: string[] = []

    this.urlRefCount.forEach((count, url) => {
      if (count <= 0) {
        orphaned.push(url)
      }
    })

    orphaned.forEach((url) => {
      URL.revokeObjectURL(url)
      this.urlRefCount.delete(url)

      // Find and remove from objectUrls map
      for (const [id, storedUrl] of this.objectUrls.entries()) {
        if (storedUrl === url) {
          this.objectUrls.delete(id)
          break
        }
      }
    })

    if (orphaned.length > 0) {
      console.log(`Cleaned up ${orphaned.length} orphaned blob URLs`)
    }
  }

  /**
   * Clear all stored images and cleanup URLs
   */
  async clearAll(): Promise<void> {
    // Revoke all object URLs
    this.objectUrls.forEach((url) => URL.revokeObjectURL(url))
    this.objectUrls.clear()
    this.urlRefCount.clear()

    // Clear database
    await this.db.images.clear()
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    imageCount: number
    totalSize: number
    activeUrls: number
    orphanedImages: number
    flatSystemImages: number
    layerSystemImages: number
    sharedImages: number
  }> {
    const images = await this.db.images.toArray()

    const totalSize = images.reduce((sum, img) => sum + img.blob.size, 0)

    let flatSystemImages = 0
    let layerSystemImages = 0
    let sharedImages = 0
    let orphanedImages = 0

    images.forEach((img) => {
      const hasPosition = !!img.position
      const hasLayerRefs = img.layerReferences.length > 0

      if (hasPosition && hasLayerRefs) {
        sharedImages++
      } else if (hasPosition) {
        flatSystemImages++
      } else if (hasLayerRefs) {
        layerSystemImages++
      } else {
        orphanedImages++
      }
    })

    return {
      imageCount: images.length,
      totalSize,
      activeUrls: this.objectUrls.size,
      orphanedImages,
      flatSystemImages,
      layerSystemImages,
      sharedImages,
    }
  }

  /**
   * Load all images from database
   */
  async loadAllFromIndexedDB(): Promise<StoredImage[]> {
    const images = await this.db.images.toArray()
    return images.map((img) => ({
      ...img,
      layerReferences: new Set(img.layerReferences),
    }))
  }

  /**
   * Cleanup on unmount (alias for dispose)
   */
  cleanup(): void {
    this.dispose()
  }

  /**
   * Cleanup on unmount
   */
  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }

    // Revoke all URLs
    this.objectUrls.forEach((url) => URL.revokeObjectURL(url))
    this.objectUrls.clear()
    this.urlRefCount.clear()
  }
}

// Export singleton
export const imageStorage = UnifiedImageStorageService.getInstance()
