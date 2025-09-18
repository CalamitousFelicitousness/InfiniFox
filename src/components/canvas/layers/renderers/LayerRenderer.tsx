import Konva from 'konva'
import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react'
import { Group, Rect, Image as KonvaImage } from 'react-konva'

import { viewportCulling } from '../../../../services/canvas/ViewportCullingService'
import type { LayerNode, BlendMode } from '../../../../store/slices/layerSystemSlice'
import { useStore } from '../../../../store/store'

interface LayerRendererProps {
  layer: LayerNode
  parentScale: number
  onContextMenu?: (e: Konva.KonvaEventObject<PointerEvent>, layerId: string) => void
  viewport?: { x: number; y: number; width: number; height: number; scale: number }
}

/**
 * Recursive layer renderer for rendering layers anywhere on canvas
 */
export const LayerRenderer: React.FC<LayerRendererProps> = ({
  layer,
  parentScale,
  onContextMenu,
  viewport,
}) => {
  const nodeRef = useRef<Konva.Node>(null)
  const { getLayerChildren, updateLayerDirect, selectedLayerIds } = useStore()

  // Image state - only used for image layers
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)

  // Check viewport culling
  const isVisible = useMemo(() => {
    if (!viewport) return true // No culling if viewport not provided
    viewportCulling.updateViewport(viewport)
    return viewportCulling.isLayerVisible(layer)
  }, [viewport, layer])

  // Determine level of detail
  const levelOfDetail = useMemo(() => {
    if (!viewport) return 'high'
    return viewportCulling.getLevelOfDetail(viewport.scale)
  }, [viewport])

  const shouldRenderHighQuality = useMemo(() => {
    if (!viewport) return true
    return viewportCulling.shouldRenderHighQuality(layer, selectedLayerIds.has(layer.id))
  }, [viewport, layer, selectedLayerIds])

  // Apply caching and filters for individual layers
  React.useEffect(() => {
    if (!nodeRef.current || !layer.filters?.length) return

    const node = nodeRef.current

    if (layer.filters.length > 0 && !layer.cached) {
      node.cache()

      // Apply filters
      const konvaFilters = layer.filters
        .filter((f) => f.enabled)
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

      node.filters(konvaFilters as Konva.Filter[])
    } else if (layer.filters?.length === 0 && layer.cached) {
      node.clearCache()
      node.filters([])
      updateLayerDirect(layer.id, { cached: false })
    }
  }, [layer.filters, layer.cached, layer.id, updateLayerDirect])

  // Image loading effect - only runs for image layers
  useEffect(() => {
    if (layer.type !== 'image' || !layer.imageProps) return

    const loadImage = async () => {
      try {
        let src: string | null = null

        // Handle new unified storage system
        if (layer.imageProps.imageId) {
          const { imageStorage } = await import(
            '../../../../services/storage/UnifiedImageStorageService'
          )
          src = await imageStorage.getOrCreateObjectUrl(layer.imageProps.imageId)
        }
        // Fallback to legacy src field
        else if (layer.imageProps.src) {
          src = layer.imageProps.src
        }

        if (!src) {
          console.error('No image source found for layer:', layer.id)
          setImageLoaded(false)
          return
        }

        console.log('Loading image for layer:', layer.id, src)
        const img = new window.Image()
        img.crossOrigin = 'anonymous'
        img.src = src

        img.onload = () => {
          console.log('Image loaded for layer:', layer.id)
          setImage(img)
          setImageLoaded(true)
        }

        img.onerror = (e) => {
          console.error('Failed to load image:', src, e)
          setImageLoaded(false)
        }
      } catch (error) {
        console.error('Failed to load image for layer:', layer.id, error)
        setImageLoaded(false)
      }
    }

    loadImage()
  }, [layer.type, layer.id, layer.imageProps])

  // Handle drag start for layer
  const handleDragStart = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    e.cancelBubble = true // Stop propagation to parent artboard
  }, [])

  // Handle drag end for layer
  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      e.cancelBubble = true // Stop propagation to parent artboard
      const node = e.target
      updateLayerDirect(layer.id, {
        x: node.x(),
        y: node.y(),
      })
    },
    [layer.id, updateLayerDirect]
  )

  // Handle context menu
  const handleContextMenu = useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>) => {
      e.evt.preventDefault()
      e.cancelBubble = true
      if (onContextMenu) {
        onContextMenu(e, layer.id)
      }
    },
    [layer.id, onContextMenu]
  )

  const isSelected = selectedLayerIds.has(layer.id)

  // Skip rendering if not visible
  if (!isVisible) {
    return null
  }

  // Apply blend mode
  const blendMode = layer.blendMode || 'normal'
  const globalCompositeOperation = getKonvaBlendMode(blendMode)

  // Render based on layer type
  switch (layer.type) {
    case 'group': {
      const children = getLayerChildren(layer.id)
      return (
        <Group
          ref={nodeRef}
          id={layer.id}
          x={layer.x}
          y={layer.y}
          rotation={layer.rotation}
          scaleX={layer.scaleX}
          scaleY={layer.scaleY}
          opacity={layer.opacity}
          visible={layer.visible}
          draggable={!layer.locked}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onContextMenu={handleContextMenu}
        >
          {children.map((child) => (
            <LayerRenderer
              key={child.id}
              layer={child}
              parentScale={parentScale}
              onContextMenu={onContextMenu}
              viewport={viewport}
            />
          ))}
        </Group>
      )
    }

    case 'image': {
      if (!layer.imageProps) {
        console.log('Layer missing imageProps:', layer)
        return null
      }

      if (!imageLoaded || !image) {
        return null
      }

      return (
        <>
          <KonvaImage
            ref={nodeRef}
            id={layer.id}
            image={image}
            x={layer.x}
            y={layer.y}
            width={layer.imageProps.width}
            height={layer.imageProps.height}
            rotation={layer.rotation}
            scaleX={layer.scaleX}
            scaleY={layer.scaleY}
            opacity={layer.opacity}
            visible={layer.visible}
            draggable={!layer.locked}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onContextMenu={handleContextMenu}
            globalCompositeOperation={globalCompositeOperation}
            // Reduce image quality for performance when zoomed out
            imageSmoothingEnabled={shouldRenderHighQuality}
            pixelPerfect={levelOfDetail === 'high'}
          />
          {isSelected && (
            <Rect
              x={layer.x}
              y={layer.y}
              width={layer.imageProps.width * (layer.scaleX || 1)}
              height={layer.imageProps.height * (layer.scaleY || 1)}
              rotation={layer.rotation}
              stroke="#00aaff"
              strokeWidth={2 / parentScale}
              strokeScaleEnabled={false}
              fill="transparent"
              listening={false}
            />
          )}
        </>
      )
    }

    case 'text':
      // TODO: Implement text layer rendering
      return null

    case 'shape':
      // TODO: Implement shape layer rendering
      return null

    case 'drawing':
      // TODO: Implement drawing layer rendering
      return null

    default:
      return null
  }
}

// Map layer blend modes to Konva globalCompositeOperation
function getKonvaBlendMode(blendMode: BlendMode): GlobalCompositeOperation {
  switch (blendMode) {
    case 'multiply':
      return 'multiply'
    case 'screen':
      return 'screen'
    case 'overlay':
      return 'overlay'
    case 'darken':
      return 'darken'
    case 'lighten':
      return 'lighten'
    case 'color-dodge':
      return 'color-dodge'
    case 'color-burn':
      return 'color-burn'
    case 'normal':
    default:
      return 'source-over'
  }
}
