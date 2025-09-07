/**
 * ImageStorageService - Manages efficient image storage using Object URLs and IndexedDB
 * Replaces inefficient Base64 storage with modern browser APIs
 */

export interface StoredImage {
  id: string
  objectUrl: string
  blob: Blob
  metadata: ImageMetadata
  timestamp: number
}

export interface ImageMetadata {
  type: 'generated' | 'uploaded' | 'reference'
  prompt?: string
  negativePrompt?: string
  seed?: number
  steps?: number
  cfgScale?: number
  width: number
  height: number
  sampler?: string
  denoisingStrength?: number
  usedIn?: Set<'img2img' | 'inpaint' | 'controlnet'>
}

export interface PersistedImage {
  id: string
  blob: Blob
  metadata: ImageMetadata
  timestamp: number
  position?: { x: number; y: number }
}

class ImageStorageService {
  private static instance: ImageStorageService
  private objectUrls: Map<string, string> = new Map()
  private dbName = 'infinifox-images'
  private dbVersion = 1
  private db: IDBDatabase | null = null

  private constructor() {
    this.initDB()
  }

  static getInstance(): ImageStorageService {
    if (!ImageStorageService.instance) {
      ImageStorageService.instance = new ImageStorageService()
    }
    return ImageStorageService.instance
  }

  /**
   * Initialize IndexedDB for persistent storage
   */
  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        console.log('IndexedDB initialized successfully')
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains('images')) {
          const imageStore = db.createObjectStore('images', { keyPath: 'id' })
          imageStore.createIndex('timestamp', 'timestamp')
          imageStore.createIndex('type', 'metadata.type')
        }

        if (!db.objectStoreNames.contains('sessions')) {
          const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' })
          sessionStore.createIndex('timestamp', 'timestamp')
        }
      }
    })
  }

  /**
   * Convert Base64 string to Blob
   */
  private base64ToBlob(base64: string, mimeType: string = 'image/png'): Blob {
    // Remove data URL prefix if present
    const base64Data = base64.includes(',') ? base64.split(',')[1] : base64

    const byteCharacters = atob(base64Data)
    const byteNumbers = new Array(byteCharacters.length)

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }

    const byteArray = new Uint8Array(byteNumbers)
    return new Blob([byteArray], { type: mimeType })
  }

  /**
   * Create an image from Base64 and return Object URL
   */
  async createFromBase64(
    id: string,
    base64: string,
    metadata: ImageMetadata
  ): Promise<StoredImage> {
    // Convert base64 to blob
    const blob = this.base64ToBlob(base64)

    // Create object URL for immediate display
    const objectUrl = URL.createObjectURL(blob)

    // Track the URL for cleanup
    this.objectUrls.set(id, objectUrl)

    const storedImage: StoredImage = {
      id,
      objectUrl,
      blob,
      metadata,
      timestamp: Date.now(),
    }

    // Save to IndexedDB for persistence
    await this.saveToIndexedDB(storedImage)

    return storedImage
  }

  /**
   * Create an image from a File object (for uploads)
   */
  async createFromFile(id: string, file: File, metadata: ImageMetadata): Promise<StoredImage> {
    // Create object URL directly from file
    const objectUrl = URL.createObjectURL(file)

    // Track the URL for cleanup
    this.objectUrls.set(id, objectUrl)

    const storedImage: StoredImage = {
      id,
      objectUrl,
      blob: file,
      metadata,
      timestamp: Date.now(),
    }

    // Save to IndexedDB for persistence
    await this.saveToIndexedDB(storedImage)

    return storedImage
  }

  /**
   * Save image to IndexedDB for persistence
   */
  private async saveToIndexedDB(
    image: StoredImage,
    position?: { x: number; y: number }
  ): Promise<void> {
    if (!this.db) {
      await this.initDB()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction(['images'], 'readwrite')
      const store = transaction.objectStore('images')

      const persistedImage: PersistedImage = {
        id: image.id,
        blob: image.blob,
        metadata: image.metadata,
        timestamp: image.timestamp,
        position: position, // Save position if provided
      }

      const request = store.put(persistedImage)

      request.onsuccess = () => {
        console.log(`Image ${image.id} saved to IndexedDB${position ? ' with position' : ''}`)
        resolve()
      }

      request.onerror = () => {
        console.error(`Failed to save image ${image.id}:`, request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Update image position in IndexedDB
   */
  async updateImagePosition(id: string, x: number, y: number): Promise<void> {
    if (!this.db) {
      await this.initDB()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction(['images'], 'readwrite')
      const store = transaction.objectStore('images')
      const getRequest = store.get(id)

      getRequest.onsuccess = () => {
        const result = getRequest.result as PersistedImage | undefined
        if (result) {
          result.position = { x, y }
          const putRequest = store.put(result)

          putRequest.onsuccess = () => {
            console.log(`Updated position for image ${id}: x=${x}, y=${y}`)
            resolve()
          }

          putRequest.onerror = () => {
            reject(putRequest.error)
          }
        } else {
          reject(new Error(`Image ${id} not found in IndexedDB`))
        }
      }

      getRequest.onerror = () => {
        reject(getRequest.error)
      }
    })
  }

  /**
   * Load image from IndexedDB
   */
  async loadFromIndexedDB(
    id: string
  ): Promise<(StoredImage & { position?: { x: number; y: number } }) | null> {
    if (!this.db) {
      await this.initDB()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction(['images'], 'readonly')
      const store = transaction.objectStore('images')
      const request = store.get(id)

      request.onsuccess = () => {
        const result = request.result as PersistedImage | undefined
        if (result) {
          // Create new object URL from stored blob
          const objectUrl = URL.createObjectURL(result.blob)
          this.objectUrls.set(id, objectUrl)

          resolve({
            id: result.id,
            objectUrl,
            blob: result.blob,
            metadata: result.metadata,
            timestamp: result.timestamp,
            position: result.position, // Include position in return
          })
        } else {
          resolve(null)
        }
      }

      request.onerror = () => {
        console.error(`Failed to load image ${id}:`, request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Load all images from IndexedDB
   */
  async loadAllFromIndexedDB(): Promise<(StoredImage & { position?: { x: number; y: number } })[]> {
    if (!this.db) {
      await this.initDB()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction(['images'], 'readonly')
      const store = transaction.objectStore('images')
      const request = store.getAll()

      request.onsuccess = () => {
        const results = request.result as PersistedImage[]
        const storedImages = results.map((result) => {
          // Create new object URL from stored blob
          const objectUrl = URL.createObjectURL(result.blob)
          this.objectUrls.set(result.id, objectUrl)

          return {
            id: result.id,
            objectUrl,
            blob: result.blob,
            metadata: result.metadata,
            timestamp: result.timestamp,
            position: result.position, // Include position in return
          }
        })

        console.log(`Loaded ${storedImages.length} images from IndexedDB`)
        resolve(storedImages)
      }

      request.onerror = () => {
        console.error('Failed to load images:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Delete image from both memory and IndexedDB
   */
  async deleteImage(id: string): Promise<void> {
    // Revoke object URL to free memory
    const objectUrl = this.objectUrls.get(id)
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl)
      this.objectUrls.delete(id)
    }

    // Delete from IndexedDB
    if (!this.db) {
      await this.initDB()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction(['images'], 'readwrite')
      const store = transaction.objectStore('images')
      const request = store.delete(id)

      request.onsuccess = () => {
        console.log(`Image ${id} deleted`)
        resolve()
      }

      request.onerror = () => {
        console.error(`Failed to delete image ${id}:`, request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Clear all images from memory and database
   */
  async clearAll(): Promise<void> {
    // Revoke all object URLs
    this.objectUrls.forEach((url) => URL.revokeObjectURL(url))
    this.objectUrls.clear()

    // Clear IndexedDB
    if (!this.db) {
      await this.initDB()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction(['images'], 'readwrite')
      const store = transaction.objectStore('images')
      const request = store.clear()

      request.onsuccess = () => {
        console.log('All images cleared')
        resolve()
      }

      request.onerror = () => {
        console.error('Failed to clear images:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    imageCount: number
    totalSize: number
    memoryUrls: number
  }> {
    if (!this.db) {
      await this.initDB()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction(['images'], 'readonly')
      const store = transaction.objectStore('images')
      const countRequest = store.count()
      const getAllRequest = store.getAll()

      Promise.all([
        new Promise((res) => (countRequest.onsuccess = () => res(countRequest.result))),
        new Promise((res) => (getAllRequest.onsuccess = () => res(getAllRequest.result))),
      ])
        .then(([count, images]) => {
          const totalSize = (images as PersistedImage[]).reduce(
            (sum, img) => sum + img.blob.size,
            0
          )

          resolve({
            imageCount: count as number,
            totalSize,
            memoryUrls: this.objectUrls.size,
          })
        })
        .catch(reject)
    })
  }

  /**
   * Export image as Base64 (for API requests)
   */
  async exportAsBase64(id: string): Promise<string> {
    const image = await this.loadFromIndexedDB(id)
    if (!image) {
      throw new Error(`Image ${id} not found`)
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result as string
        // Remove data URL prefix to get pure base64
        const base64Data = base64.split(',')[1]
        resolve(base64Data)
      }
      reader.onerror = reject
      reader.readAsDataURL(image.blob)
    })
  }

  /**
   * Get object URL for an image (creates if needed)
   */
  async getObjectUrl(id: string): Promise<string | null> {
    // Check if already in memory
    const existingUrl = this.objectUrls.get(id)
    if (existingUrl) {
      return existingUrl
    }

    // Try to load from IndexedDB
    const image = await this.loadFromIndexedDB(id)
    return image ? image.objectUrl : null
  }

  /**
   * Cleanup object URLs (call periodically or on unmount)
   */
  cleanup(): void {
    console.log(`Cleaning up ${this.objectUrls.size} object URLs`)
    this.objectUrls.forEach((url) => URL.revokeObjectURL(url))
    this.objectUrls.clear()
  }
}

// Export singleton instance
export const imageStorage = ImageStorageService.getInstance()
