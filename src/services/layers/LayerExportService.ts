import Konva from 'konva'

import type { LayerNode } from '../../store/slices/layerSystemSlice'
import { useStore } from '../../store/store'

export class LayerExportService {
  /**
   * Export an artboard as PNG/JPEG
   */
  static async exportArtboard(
    artboardId: string,
    format: 'png' | 'jpeg' = 'png',
    quality: number = 0.92
  ): Promise<Blob | null> {
    const { getLayer, getLayerChildren } = useStore.getState()
    const artboard = getLayer(artboardId)

    if (!artboard || artboard.type !== 'artboard') {
      console.error('Invalid artboard ID')
      return null
    }

    const { width = 800, height = 600, backgroundColor = '#ffffff' } = artboard.artboardProps || {}

    // Create temporary stage for export
    const tempContainer = document.createElement('div')
    tempContainer.style.position = 'absolute'
    tempContainer.style.left = '-9999px'
    document.body.appendChild(tempContainer)

    try {
      const stage = new Konva.Stage({
        container: tempContainer,
        width,
        height,
      })

      const layer = new Konva.Layer()
      stage.add(layer)

      // Add background
      const bg = new Konva.Rect({
        width,
        height,
        fill: backgroundColor,
      })
      layer.add(bg)

      // Recursively add layers
      await this.renderLayersToKonva(artboard, layer, getLayer, getLayerChildren)

      // Export to data URL
      const dataURL = stage.toDataURL({
        mimeType: format === 'jpeg' ? 'image/jpeg' : 'image/png',
        quality,
        pixelRatio: 1,
      })

      // Convert to blob
      const response = await fetch(dataURL)
      return await response.blob()
    } finally {
      // Cleanup
      document.body.removeChild(tempContainer)
    }
  }

  /**
   * Export selected layers as PNG
   */
  static async exportSelectedLayers(
    layerIds: Set<string>,
    format: 'png' | 'jpeg' = 'png',
    quality: number = 0.92
  ): Promise<Blob | null> {
    const { getLayer, getLayerBounds } = useStore.getState()

    // Calculate bounding box of all selected layers
    let minX = Infinity,
      minY = Infinity
    let maxX = -Infinity,
      maxY = -Infinity

    layerIds.forEach((id) => {
      const bounds = getLayerBounds(id)
      if (bounds) {
        minX = Math.min(minX, bounds.x)
        minY = Math.min(minY, bounds.y)
        maxX = Math.max(maxX, bounds.x + bounds.width)
        maxY = Math.max(maxY, bounds.y + bounds.height)
      }
    })

    if (!isFinite(minX) || !isFinite(minY)) {
      console.error('No valid layers to export')
      return null
    }

    const width = maxX - minX
    const height = maxY - minY

    // Create temporary stage
    const tempContainer = document.createElement('div')
    tempContainer.style.position = 'absolute'
    tempContainer.style.left = '-9999px'
    document.body.appendChild(tempContainer)

    try {
      const stage = new Konva.Stage({
        container: tempContainer,
        width,
        height,
      })

      const layer = new Konva.Layer()
      stage.add(layer)

      // Add each selected layer
      for (const layerId of layerIds) {
        const layerNode = getLayer(layerId)
        if (layerNode) {
          await this.addLayerToKonva(layerNode, layer, -minX, -minY)
        }
      }

      // Export
      const dataURL = stage.toDataURL({
        mimeType: format === 'jpeg' ? 'image/jpeg' : 'image/png',
        quality,
        pixelRatio: 1,
      })

      const response = await fetch(dataURL)
      return await response.blob()
    } finally {
      document.body.removeChild(tempContainer)
    }
  }

  /**
   * Export entire canvas with layer structure as JSON
   */
  static exportLayerStructure(): string {
    const { exportLayerStructure } = useStore.getState()
    return exportLayerStructure()
  }

  /**
   * Download blob as file
   */
  static downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  /**
   * Recursively render layers to Konva
   */
  private static async renderLayersToKonva(
    parentLayer: LayerNode,
    konvaParent: Konva.Layer | Konva.Group,
    getLayer: (id: string) => LayerNode | undefined,
    getLayerChildren: (id: string) => LayerNode[]
  ): Promise<void> {
    const children = getLayerChildren(parentLayer.id)

    for (const child of children) {
      if (!child.visible) continue

      switch (child.type) {
        case 'group': {
          const group = new Konva.Group({
            x: child.x,
            y: child.y,
            rotation: child.rotation,
            scaleX: child.scaleX,
            scaleY: child.scaleY,
            opacity: child.opacity,
          })
          konvaParent.add(group)

          // Recursively add children
          await this.renderLayersToKonva(child, group, getLayer, getLayerChildren)

          // Apply filters if needed
          if (child.filters && child.filters.length > 0) {
            this.applyFilters(group, child.filters)
          }
          break
        }

        case 'image': {
          if (child.imageProps) {
            // Load image from unified storage or legacy src
            let img: HTMLImageElement | null = null

            if (child.imageProps.imageId) {
              // Load from unified storage
              const { imageStorage } = await import(
                '../../services/storage/UnifiedImageStorageService'
              )
              const objectUrl = await imageStorage.getOrCreateObjectUrl(child.imageProps.imageId)
              if (objectUrl) {
                img = await this.loadImage(objectUrl)
              }
            } else if (child.imageProps.src) {
              // Legacy fallback
              img = await this.loadImage(child.imageProps.src)
            }

            if (img) {
              const konvaImage = new Konva.Image({
                x: child.x,
                y: child.y,
                image: img,
                width: child.imageProps.width,
                height: child.imageProps.height,
                rotation: child.rotation,
                scaleX: child.scaleX,
                scaleY: child.scaleY,
                opacity: child.opacity,
              })
              konvaParent.add(konvaImage)

              if (child.filters && child.filters.length > 0) {
                this.applyFilters(konvaImage, child.filters)
              }
            }
          }
          break
        }

        case 'drawing': {
          if (child.drawingProps) {
            const drawGroup = new Konva.Group({
              x: child.x,
              y: child.y,
              opacity: child.opacity,
            })

            child.drawingProps.strokes.forEach((stroke) => {
              const line = new Konva.Line({
                points: stroke.points,
                stroke: stroke.color,
                strokeWidth: stroke.strokeWidth,
                opacity: stroke.opacity,
                lineCap: 'round',
                lineJoin: 'round',
                tension: 0.5,
              })
              drawGroup.add(line)
            })

            konvaParent.add(drawGroup)
          }
          break
        }

        // TODO: Add text and shape rendering
      }
    }
  }

  /**
   * Add single layer to Konva with offset
   */
  private static async addLayerToKonva(
    layer: LayerNode,
    konvaParent: Konva.Layer | Konva.Group,
    offsetX: number = 0,
    offsetY: number = 0
  ): Promise<void> {
    if (!layer.visible) return

    switch (layer.type) {
      case 'image': {
        if (layer.imageProps) {
          // Load image from unified storage or legacy src
          let img: HTMLImageElement | null = null

          if (layer.imageProps.imageId) {
            // Load from unified storage
            const { imageStorage } = await import(
              '../../services/storage/UnifiedImageStorageService'
            )
            const objectUrl = await imageStorage.getOrCreateObjectUrl(layer.imageProps.imageId)
            if (objectUrl) {
              img = await this.loadImage(objectUrl)
            }
          } else if (layer.imageProps.src) {
            // Legacy fallback
            img = await this.loadImage(layer.imageProps.src)
          }

          if (img) {
            const konvaImage = new Konva.Image({
              x: layer.x + offsetX,
              y: layer.y + offsetY,
              image: img,
              width: layer.imageProps.width,
              height: layer.imageProps.height,
              rotation: layer.rotation,
              scaleX: layer.scaleX,
              scaleY: layer.scaleY,
              opacity: layer.opacity,
            })
            konvaParent.add(konvaImage)

            if (layer.filters && layer.filters.length > 0) {
              this.applyFilters(konvaImage, layer.filters)
            }
          }
        }
        break
      }

      // TODO: Handle other layer types
    }
  }

  /**
   * Load image from URL
   */
  private static loadImage(src: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = () => resolve(null)
      img.src = src
    })
  }

  /**
   * Apply filters to Konva node
   */
  private static applyFilters(
    node: Konva.Node,
    filters: Array<{ enabled: boolean; type: string; params?: Record<string, number> }>
  ): void {
    const enabledFilters = filters.filter((f) => f.enabled)
    if (enabledFilters.length === 0) return

    node.cache()

    const konvaFilters = enabledFilters
      .map((f) => {
        switch (f.type) {
          case 'blur':
            node.blurRadius(f.params.radius || 5)
            return Konva.Filters.Blur
          case 'brightness':
            node.brightness(f.params.brightness || 0)
            return Konva.Filters.Brighten
          case 'contrast':
            node.contrast(f.params.contrast || 0)
            return Konva.Filters.Contrast
          case 'grayscale':
            return Konva.Filters.Grayscale
          case 'sepia':
            return Konva.Filters.Sepia
          case 'invert':
            return Konva.Filters.Invert
          case 'hue':
            node.hue(f.params.hue || 0)
            return Konva.Filters.HSL
          case 'saturation':
            node.saturation(f.params.saturation || 0)
            return Konva.Filters.HSL
          case 'pixelate':
            node.pixelSize(f.params.pixelSize || 5)
            return Konva.Filters.Pixelate
          case 'noise':
            node.noise(f.params.noise || 0.5)
            return Konva.Filters.Noise
          default:
            return null
        }
      })
      .filter(Boolean)

    node.filters(konvaFilters)
  }
}
