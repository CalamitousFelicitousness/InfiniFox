// import Konva from 'konva'

import type { LayerNode } from '../../store/slices/layerSystemSlice'

export interface Viewport {
  x: number
  y: number
  width: number
  height: number
  scale: number
}

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

export class ViewportCullingService {
  private viewport: Viewport = { x: 0, y: 0, width: 0, height: 0, scale: 1 }
  private cullingMargin = 100 // Extra margin in pixels to prevent pop-in

  /**
   * Update viewport dimensions
   */
  updateViewport(viewport: Viewport): void {
    this.viewport = viewport
  }

  /**
   * Check if layer is visible in viewport
   */
  isLayerVisible(layer: LayerNode): boolean {
    const bounds = this.getLayerBounds(layer)
    if (!bounds) return true // Show by default if bounds unknown

    return this.boundsIntersectViewport(bounds)
  }

  /**
   * Check if bounds intersect with viewport
   */
  boundsIntersectViewport(bounds: Bounds): boolean {
    const viewportBounds = this.getViewportBounds()

    return !(
      bounds.x + bounds.width < viewportBounds.x ||
      bounds.x > viewportBounds.x + viewportBounds.width ||
      bounds.y + bounds.height < viewportBounds.y ||
      bounds.y > viewportBounds.y + viewportBounds.height
    )
  }

  /**
   * Get viewport bounds in canvas coordinates
   */
  getViewportBounds(): Bounds {
    const margin = this.cullingMargin / this.viewport.scale

    return {
      x: this.viewport.x - margin,
      y: this.viewport.y - margin,
      width: this.viewport.width / this.viewport.scale + margin * 2,
      height: this.viewport.height / this.viewport.scale + margin * 2,
    }
  }

  /**
   * Get layer bounds in canvas coordinates
   */
  getLayerBounds(layer: LayerNode): Bounds | null {
    // Get base position
    let x = layer.x || 0
    let y = layer.y || 0
    let width = 0
    let height = 0

    // Calculate bounds based on layer type
    switch (layer.type) {
      case 'artboard':
        width = layer.artboardProps?.width || 800
        height = layer.artboardProps?.height || 600
        break

      case 'image':
        width = (layer.imageProps?.width || 0) * (layer.scaleX || 1)
        height = (layer.imageProps?.height || 0) * (layer.scaleY || 1)
        break

      case 'text':
        // Estimate text bounds
        width = layer.textProps?.width || 200
        height = (layer.textProps?.fontSize || 16) * 2
        break

      case 'shape': {
        const shapeProps = layer.shapeProps
        if (shapeProps?.shapeType === 'rect') {
          width = shapeProps.width || 100
          height = shapeProps.height || 100
        } else if (shapeProps?.shapeType === 'circle') {
          const radius = shapeProps.radius || 50
          width = radius * 2
          height = radius * 2
        } else if (shapeProps?.shapeType === 'ellipse') {
          width = (shapeProps.radiusX || 50) * 2
          height = (shapeProps.radiusY || 50) * 2
        }
        break
      }

      case 'group':
        // For groups, calculate bounds from children
        if (layer.children && layer.children.length > 0) {
          // This would need access to child layers
          // For now, return a default size
          width = 400
          height = 400
        }
        break

      case 'drawing': {
        // Calculate bounds from stroke points
        const strokes = layer.drawingProps?.strokes || []
        if (strokes.length > 0) {
          let minX = Infinity,
            minY = Infinity
          let maxX = -Infinity,
            maxY = -Infinity

          strokes.forEach((stroke) => {
            for (let i = 0; i < stroke.points.length; i += 2) {
              minX = Math.min(minX, stroke.points[i])
              maxX = Math.max(maxX, stroke.points[i])
              minY = Math.min(minY, stroke.points[i + 1])
              maxY = Math.max(maxY, stroke.points[i + 1])
            }
          })

          if (isFinite(minX)) {
            x += minX
            y += minY
            width = maxX - minX
            height = maxY - minY
          }
        }
        break
      }
    }

    // Apply rotation if present (expand bounds to contain rotated rect)
    if (layer.rotation) {
      const angle = (layer.rotation * Math.PI) / 180
      const cos = Math.abs(Math.cos(angle))
      const sin = Math.abs(Math.sin(angle))

      const rotatedWidth = width * cos + height * sin
      const rotatedHeight = width * sin + height * cos

      // Adjust position to center of rotation
      x -= (rotatedWidth - width) / 2
      y -= (rotatedHeight - height) / 2

      width = rotatedWidth
      height = rotatedHeight
    }

    return { x, y, width, height }
  }

  /**
   * Get level of detail based on zoom
   */
  getLevelOfDetail(scale: number): 'high' | 'medium' | 'low' {
    if (scale > 1.5) return 'high'
    if (scale > 0.5) return 'medium'
    return 'low'
  }

  /**
   * Should use lower quality rendering for performance
   */
  shouldReduceQuality(scale: number): boolean {
    return scale < 0.5
  }

  /**
   * Calculate pixel ratio for current zoom level
   */
  getOptimalPixelRatio(scale: number): number {
    if (scale < 0.25) return 0.5
    if (scale < 0.5) return 0.75
    if (scale > 2) return Math.min(scale, 2) // Cap at 2x for performance
    return 1
  }

  /**
   * Filter layers to only visible ones
   */
  filterVisibleLayers(layers: LayerNode[]): LayerNode[] {
    return layers.filter((layer) => this.isLayerVisible(layer))
  }

  /**
   * Calculate visible region for clipping
   */
  getVisibleRegion(): { x: number; y: number; width: number; height: number } {
    const bounds = this.getViewportBounds()
    return {
      x: Math.floor(bounds.x),
      y: Math.floor(bounds.y),
      width: Math.ceil(bounds.width),
      height: Math.ceil(bounds.height),
    }
  }

  /**
   * Check if artboard needs high-quality rendering
   */
  shouldRenderHighQuality(layer: LayerNode, isSelected: boolean): boolean {
    const scale = this.viewport.scale

    // Always high quality for selected items
    if (isSelected) return true

    // Reduce quality for very small or distant items
    if (scale < 0.3) return false

    // Check if layer is near viewport center (focus area)
    const bounds = this.getLayerBounds(layer)
    if (bounds) {
      const viewportCenter = {
        x: this.viewport.x + this.viewport.width / (2 * this.viewport.scale),
        y: this.viewport.y + this.viewport.height / (2 * this.viewport.scale),
      }

      const layerCenter = {
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2,
      }

      const distance = Math.sqrt(
        Math.pow(layerCenter.x - viewportCenter.x, 2) +
          Math.pow(layerCenter.y - viewportCenter.y, 2)
      )

      // High quality for items near center
      const maxDistance = Math.max(this.viewport.width, this.viewport.height) / this.viewport.scale
      return distance < maxDistance * 0.5
    }

    return true
  }
}

// Singleton instance
export const viewportCulling = new ViewportCullingService()
