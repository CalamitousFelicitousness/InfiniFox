/**
 * Lazy loading service for layer content
 * Loads layer images and data on-demand to improve performance
 */

import type { LayerNode } from '../../store/slices/layerSystemSlice'
import { imageStorage } from '../storage'

interface LoaderConfig {
  preloadDistance: number // Pixels from viewport edge to start loading
  maxConcurrentLoads: number
  cacheTimeout: number // Milliseconds before unloading unused content
}

class LayerLazyLoader {
  private loadedLayers = new Map<
    string,
    {
      image?: HTMLImageElement
      loadedAt: number
      lastUsed: number
    }
  >()

  private loadingPromises = new Map<string, Promise<HTMLImageElement | null>>()
  private currentLoads = 0
  private config: LoaderConfig = {
    preloadDistance: 200,
    maxConcurrentLoads: 3,
    cacheTimeout: 30000, // 30 seconds
  }

  private cleanupTimer: NodeJS.Timeout | null = null

  constructor() {
    this.startCleanupTimer()
  }

  /**
   * Load layer content if needed
   */
  async loadLayer(layer: LayerNode): Promise<HTMLImageElement | null> {
    if (layer.type !== 'image' || !layer.imageProps) {
      return null
    }

    const layerId = layer.id

    // Check if already loaded
    const cached = this.loadedLayers.get(layerId)
    if (cached?.image) {
      cached.lastUsed = Date.now()
      return cached.image
    }

    // Check if already loading
    const loadingPromise = this.loadingPromises.get(layerId)
    if (loadingPromise) {
      return loadingPromise
    }

    // Wait if too many concurrent loads
    if (this.currentLoads >= this.config.maxConcurrentLoads) {
      await this.waitForLoadSlot()
    }

    // Start loading
    const promise = this.loadImage(layer)
    this.loadingPromises.set(layerId, promise)

    try {
      const image = await promise

      if (image) {
        this.loadedLayers.set(layerId, {
          image,
          loadedAt: Date.now(),
          lastUsed: Date.now(),
        })
      }

      return image
    } finally {
      this.loadingPromises.delete(layerId)
    }
  }

  /**
   * Preload layers that are near the viewport
   */
  async preloadNearbyLayers(
    layers: LayerNode[],
    viewport: { x: number; y: number; width: number; height: number }
  ): Promise<void> {
    const expandedViewport = {
      x: viewport.x - this.config.preloadDistance,
      y: viewport.y - this.config.preloadDistance,
      width: viewport.width + this.config.preloadDistance * 2,
      height: viewport.height + this.config.preloadDistance * 2,
    }

    const layersToPreload = layers.filter((layer) => {
      if (layer.type !== 'image' || !layer.imageProps) return false
      if (this.loadedLayers.has(layer.id)) return false
      if (this.loadingPromises.has(layer.id)) return false

      // Check if layer bounds intersect expanded viewport
      const bounds = this.getLayerBounds(layer)
      return this.boundsIntersect(bounds, expandedViewport)
    })

    // Preload up to maxConcurrentLoads layers
    const promises = layersToPreload
      .slice(0, this.config.maxConcurrentLoads - this.currentLoads)
      .map((layer) => this.loadLayer(layer))

    await Promise.allSettled(promises)
  }

  /**
   * Unload unused layer content to free memory
   */
  unloadUnusedLayers(keepLayerIds?: Set<string>): void {
    const now = Date.now()
    const timeout = this.config.cacheTimeout

    for (const [layerId, cached] of this.loadedLayers) {
      // Skip if should keep
      if (keepLayerIds?.has(layerId)) {
        continue
      }

      // Unload if not used recently
      if (now - cached.lastUsed > timeout) {
        this.unloadLayer(layerId)
      }
    }
  }

  /**
   * Force unload a specific layer
   */
  unloadLayer(layerId: string): void {
    const cached = this.loadedLayers.get(layerId)
    if (cached?.image) {
      // Revoke blob URL if applicable
      if (cached.image.src.startsWith('blob:')) {
        URL.revokeObjectURL(cached.image.src)
      }
      cached.image.src = ''
    }

    this.loadedLayers.delete(layerId)
  }

  /**
   * Get loaded image for a layer
   */
  getLoadedImage(layerId: string): HTMLImageElement | null {
    const cached = this.loadedLayers.get(layerId)
    if (cached) {
      cached.lastUsed = Date.now()
      return cached.image || null
    }
    return null
  }

  /**
   * Check if layer content is loaded
   */
  isLoaded(layerId: string): boolean {
    return this.loadedLayers.has(layerId)
  }

  /**
   * Clear all loaded content
   */
  clearAll(): void {
    for (const layerId of this.loadedLayers.keys()) {
      this.unloadLayer(layerId)
    }
    this.loadingPromises.clear()
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<LoaderConfig>): void {
    Object.assign(this.config, config)
  }

  // Private methods

  private async loadImage(layer: LayerNode): Promise<HTMLImageElement | null> {
    if (layer.type !== 'image' || !layer.imageProps) {
      return null
    }

    this.currentLoads++

    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'

      // Load from blob storage if available
      if (layer.imageProps.blobId) {
        try {
          const blob = await imageStorage.getImage(layer.imageProps.blobId)
          if (blob) {
            const url = URL.createObjectURL(blob)
            img.src = url
          } else {
            img.src = layer.imageProps.src
          }
        } catch (error) {
          console.error('Failed to load from blob storage:', error)
          img.src = layer.imageProps.src
        }
      } else {
        img.src = layer.imageProps.src
      }

      return new Promise((resolve) => {
        img.onload = () => resolve(img)
        img.onerror = () => {
          console.error('Failed to load image:', layer.imageProps!.src)
          resolve(null)
        }
      })
    } finally {
      this.currentLoads--
    }
  }

  private async waitForLoadSlot(): Promise<void> {
    while (this.currentLoads >= this.config.maxConcurrentLoads) {
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  }

  private getLayerBounds(layer: LayerNode): {
    x: number
    y: number
    width: number
    height: number
  } {
    if (layer.type === 'image' && layer.imageProps) {
      return {
        x: layer.x,
        y: layer.y,
        width: layer.imageProps.width * (layer.scaleX || 1),
        height: layer.imageProps.height * (layer.scaleY || 1),
      }
    }

    // Default bounds
    return { x: layer.x, y: layer.y, width: 100, height: 100 }
  }

  private boundsIntersect(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number }
  ): boolean {
    return !(
      a.x + a.width < b.x ||
      b.x + b.width < a.x ||
      a.y + a.height < b.y ||
      b.y + b.height < a.y
    )
  }

  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }

    // Run cleanup every 10 seconds
    this.cleanupTimer = setInterval(() => {
      this.unloadUnusedLayers()
    }, 10000)
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    this.clearAll()
  }
}

// Export singleton instance
export const layerLazyLoader = new LayerLazyLoader()

// Export type
export type { LoaderConfig }
