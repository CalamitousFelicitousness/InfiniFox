/**
 * Memory optimization service for large images
 * Manages image quality, resizing, and memory usage
 */

import type { LayerNode } from '../../store/slices/layerSystemSlice'

interface MemoryConfig {
  maxImageSize: number // Maximum dimension in pixels
  maxMemoryUsage: number // Maximum memory in MB
  compressionQuality: number // 0-1 for JPEG quality
  enableAutoDownscale: boolean
  enableMemoryWarnings: boolean
}

interface ImageMetrics {
  width: number
  height: number
  memoryUsage: number // in bytes
  needsOptimization: boolean
}

class LayerMemoryOptimizer {
  private config: MemoryConfig = {
    maxImageSize: 4096,
    maxMemoryUsage: 500, // 500MB
    compressionQuality: 0.85,
    enableAutoDownscale: true,
    enableMemoryWarnings: true,
  }

  private currentMemoryUsage = 0
  private layerMemoryMap = new Map<string, number>()

  /**
   * Optimize image before loading
   */
  async optimizeImage(
    source: string | Blob,
    targetDimensions?: { width: number; height: number }
  ): Promise<{ url: string; metrics: ImageMetrics }> {
    const img = new Image()
    const sourceUrl = typeof source === 'string' ? source : URL.createObjectURL(source)

    return new Promise((resolve, reject) => {
      img.onload = async () => {
        const metrics = this.calculateImageMetrics(img)

        if (!metrics.needsOptimization && !targetDimensions) {
          resolve({ url: sourceUrl, metrics })
          return
        }

        // Optimize image
        const optimized = await this.resizeAndCompress(img, targetDimensions)

        // Clean up source if it was a blob URL
        if (typeof source !== 'string') {
          URL.revokeObjectURL(sourceUrl)
        }

        resolve(optimized)
      }

      img.onerror = () => {
        reject(new Error('Failed to load image for optimization'))
      }

      img.src = sourceUrl
    })
  }

  /**
   * Calculate optimal dimensions for layer
   */
  calculateOptimalDimensions(
    originalWidth: number,
    originalHeight: number,
    viewportScale: number
  ): { width: number; height: number } {
    const maxDimension = this.config.maxImageSize

    // Scale based on viewport
    const targetScale = Math.min(1, viewportScale * 2) // Never upscale beyond 2x viewport
    let width = originalWidth * targetScale
    let height = originalHeight * targetScale

    // Enforce maximum dimensions
    if (width > maxDimension || height > maxDimension) {
      const scale = maxDimension / Math.max(width, height)
      width *= scale
      height *= scale
    }

    return {
      width: Math.round(width),
      height: Math.round(height),
    }
  }

  /**
   * Check if layer needs optimization
   */
  shouldOptimizeLayer(layer: LayerNode, viewportScale: number): boolean {
    if (layer.type !== 'image' || !layer.imageProps) {
      return false
    }

    const { width, height } = layer.imageProps
    const pixelCount = width * height
    const memoryUsage = pixelCount * 4 // 4 bytes per pixel (RGBA)

    // Check if image is too large
    if (width > this.config.maxImageSize || height > this.config.maxImageSize) {
      return true
    }

    // Check if memory usage is high
    if (memoryUsage > 10 * 1024 * 1024) {
      // 10MB threshold
      return true
    }

    // Check if significantly zoomed out
    if (viewportScale < 0.5) {
      return true
    }

    return false
  }

  /**
   * Track memory usage for a layer
   */
  trackLayerMemory(layerId: string, memoryBytes: number): void {
    const previousUsage = this.layerMemoryMap.get(layerId) || 0
    this.layerMemoryMap.set(layerId, memoryBytes)

    this.currentMemoryUsage += memoryBytes - previousUsage

    if (this.config.enableMemoryWarnings) {
      this.checkMemoryWarnings()
    }
  }

  /**
   * Untrack memory for a layer
   */
  untrackLayerMemory(layerId: string): void {
    const usage = this.layerMemoryMap.get(layerId)
    if (usage) {
      this.currentMemoryUsage -= usage
      this.layerMemoryMap.delete(layerId)
    }
  }

  /**
   * Get current memory usage
   */
  getMemoryUsage(): {
    current: number
    limit: number
    percentage: number
    layerCount: number
  } {
    const limitBytes = this.config.maxMemoryUsage * 1024 * 1024

    return {
      current: this.currentMemoryUsage,
      limit: limitBytes,
      percentage: (this.currentMemoryUsage / limitBytes) * 100,
      layerCount: this.layerMemoryMap.size,
    }
  }

  /**
   * Create thumbnail for layer
   */
  async createThumbnail(imageUrl: string, maxSize: number = 256): Promise<string> {
    const img = new Image()

    return new Promise((resolve, reject) => {
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        // Calculate thumbnail dimensions
        const scale = maxSize / Math.max(img.width, img.height)
        canvas.width = img.width * scale
        canvas.height = img.height * scale

        // Draw and compress
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(URL.createObjectURL(blob))
            } else {
              reject(new Error('Failed to create thumbnail'))
            }
          },
          'image/jpeg',
          0.7
        )
      }

      img.onerror = () => {
        reject(new Error('Failed to load image for thumbnail'))
      }

      img.src = imageUrl
    })
  }

  /**
   * Clear all tracked memory
   */
  clearMemoryTracking(): void {
    this.layerMemoryMap.clear()
    this.currentMemoryUsage = 0
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<MemoryConfig>): void {
    Object.assign(this.config, config)
  }

  // Private methods

  private calculateImageMetrics(img: HTMLImageElement): ImageMetrics {
    const memoryUsage = img.width * img.height * 4 // RGBA
    const needsOptimization =
      img.width > this.config.maxImageSize ||
      img.height > this.config.maxImageSize ||
      memoryUsage > 10 * 1024 * 1024 // 10MB

    return {
      width: img.width,
      height: img.height,
      memoryUsage,
      needsOptimization,
    }
  }

  private async resizeAndCompress(
    img: HTMLImageElement,
    targetDimensions?: { width: number; height: number }
  ): Promise<{ url: string; metrics: ImageMetrics }> {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Failed to get canvas context')
    }

    // Calculate target size
    let targetWidth: number
    let targetHeight: number

    if (targetDimensions) {
      targetWidth = targetDimensions.width
      targetHeight = targetDimensions.height
    } else {
      const scale = this.config.maxImageSize / Math.max(img.width, img.height)
      targetWidth = img.width * Math.min(1, scale)
      targetHeight = img.height * Math.min(1, scale)
    }

    canvas.width = targetWidth
    canvas.height = targetHeight

    // Enable image smoothing for better quality
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    // Draw resized image
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'))
            return
          }

          const url = URL.createObjectURL(blob)
          const metrics: ImageMetrics = {
            width: targetWidth,
            height: targetHeight,
            memoryUsage: targetWidth * targetHeight * 4,
            needsOptimization: false,
          }

          resolve({ url, metrics })
        },
        'image/jpeg',
        this.config.compressionQuality
      )
    })
  }

  private checkMemoryWarnings(): void {
    const usage = this.getMemoryUsage()

    if (usage.percentage > 90) {
      console.warn(`High memory usage: ${usage.percentage.toFixed(1)}% of limit`)

      // Could emit event for UI warning
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(
          new CustomEvent('layer-memory-warning', {
            detail: usage,
          })
        )
      }
    }
  }
}

// Export singleton instance
export const layerMemoryOptimizer = new LayerMemoryOptimizer()

// Export types
export type { MemoryConfig, ImageMetrics }
