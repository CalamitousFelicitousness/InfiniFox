import Konva from 'konva'
import React, { useEffect, useRef } from 'react'
import { Layer, Image as KonvaImage, Transformer } from 'react-konva'

import { CanvasTool } from '../hooks/useCanvasTools'
import type { KonvaImageData } from '../hooks/useImageManagement'

interface ImageLayerProps {
  // Image data
  images: KonvaImageData[]
  selectedId: string | null
  activeImageRoles: Array<{ imageId: string; role: string }>
  canvasSelectionMode: {
    active: boolean
    mode?: string
  }

  // Tool state
  currentTool: CanvasTool

  // Callbacks
  onImageSelect: (imageId: string | null) => void
  onImageDragStart: (imageId: string) => void
  onImageDragMove: (imageId: string, x: number, y: number) => { x: number; y: number }
  onImageDragEnd: (imageId: string, newX: number, newY: number) => void
  onImageTransformEnd: (imageId: string, node: Konva.Node) => void
  onContextMenu: (e: Konva.KonvaEventObject<PointerEvent>, imageId: string) => void

  // Utilities
  isImageDraggable: (imageId: string) => boolean
  getImageBorderColor: (imageId: string) => string
  getImageOpacity: (imageId: string) => number
  getTransformerConfig: () => Partial<Konva.TransformerConfig>
}

/**
 * Layer component responsible for rendering images and handling selection/transformation
 * Separated from the main Canvas component for better organization and performance
 */
function ImageLayerComponent({
  images,
  selectedId,
  activeImageRoles,
  _canvasSelectionMode,
  currentTool,
  onImageSelect,
  onImageDragStart,
  onImageDragMove,
  onImageDragEnd,
  onImageTransformEnd,
  onContextMenu,
  isImageDraggable,
  getImageBorderColor,
  getImageOpacity,
  getTransformerConfig,
}: ImageLayerProps) {
  const transformerRef = useRef<Konva.Transformer>(null)
  const layerRef = useRef<Konva.Layer>(null)

  /**
   * Update transformer when selection changes
   */
  useEffect(() => {
    if (!transformerRef.current || !layerRef.current) {
      return
    }

    const transformer = transformerRef.current
    const layer = layerRef.current

    if (selectedId && currentTool === CanvasTool.SELECT) {
      // Find the selected node
      const selectedNode = layer.findOne(`#${selectedId}`)

      if (selectedNode) {
        // Attach transformer to the selected node
        transformer.nodes([selectedNode])
        layer.batchDraw()
      }
    } else {
      // Clear transformer
      transformer.nodes([])
      layer.batchDraw()
    }
  }, [selectedId, currentTool])

  /**
   * Cleanup transformer on unmount only
   */
  useEffect(() => {
    return () => {
      if (transformerRef.current) {
        transformerRef.current.nodes([])
        transformerRef.current.destroy()
      }
    }
  }, [])

  /**
   * Handle drag start
   */
  const handleDragStart = (e: Konva.KonvaEventObject<DragEvent>, imageId: string) => {
    // Select on drag start if not already selected
    if (currentTool === CanvasTool.SELECT && selectedId !== imageId) {
      onImageSelect(imageId)
    }

    // Notify snapping system
    onImageDragStart(imageId)

    // Don't cache layers - causes more issues than it solves
    // Just ensure smooth dragging through Konva's internal optimizations
    e.target.cache()
    e.target.getLayer()?.batchDraw()
  }

  /**
   * Handle drag move with snapping
   */
  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>, imageId: string) => {
    const node = e.target
    
    // Apply snapping
    const snappedPos = onImageDragMove(imageId, node.x(), node.y())
    node.x(snappedPos.x)
    node.y(snappedPos.y)
    
    // Keep image on screen
    if (!node.isClientRectOnScreen()) {
      const stage = node.getStage()
      if (stage) {
        const box = node.getClientRect()
        const stageBox = {
          x: 0,
          y: 0,
          width: stage.width(),
          height: stage.height(),
        }
        const minVisible = 50
        if (box.x > stageBox.width - minVisible) {
          node.x(node.x() - (box.x - stageBox.width + minVisible))
        }
        if (box.y > stageBox.height - minVisible) {
          node.y(node.y() - (box.y - stageBox.height + minVisible))
        }
        if (box.x + box.width < minVisible) {
          node.x(node.x() - (box.x + box.width - minVisible))
        }
        if (box.y + box.height < minVisible) {
          node.y(node.y() - (box.y + box.height - minVisible))
        }
      }
    }
  }

  /**
   * Handle drag end
   */
  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>, imageId: string) => {
    const node = e.target

    // Clear cache from dragged image
    node.clearCache()

    // Update position
    onImageDragEnd(imageId, node.x(), node.y())

    // Force redraw
    node.getLayer()?.batchDraw()
  }

  /**
   * Handle transform end
   */
  const handleTransformEnd = () => {
    if (selectedId && transformerRef.current) {
      const nodes = transformerRef.current.nodes()
      if (nodes.length > 0) {
        const node = nodes[0]
        onImageTransformEnd(selectedId, node)
      }
    }
  }

  /**
   * Get stroke width based on selection and role
   */
  const getStrokeWidth = (imageId: string) => {
    const isSelected = selectedId === imageId
    const hasRole = activeImageRoles.some((r) => r.imageId === imageId)
    return isSelected || hasRole ? 3 : 0
  }

  /**
   * Get shadow properties for selected images
   */
  const getShadowProps = (imageId: string) => {
    if (selectedId === imageId) {
      return {
        shadowBlur: 10,
        shadowColor: getImageBorderColor(imageId),
        shadowOpacity: 0.5,
      }
    }
    return {}
  }

  return (
    <Layer ref={layerRef}>
      {/* Render images */}
      {images.map((img) => (
        <KonvaImage
          key={img.id}
          id={img.id}
          image={img.image}
          x={img.x}
          y={img.y}
          scaleX={img.scaleX || 1}
          scaleY={img.scaleY || 1}
          rotation={img.rotation || 0}
          draggable={isImageDraggable(img.id)}
          dragDistance={1} // Small threshold to prevent accidental drags
          // Selection
          onPointerDown={(e) => {
            if (currentTool === CanvasTool.SELECT) {
              onImageSelect(img.id)
              e.cancelBubble = true // Stop event from bubbling to stage
            }
          }}
          // Dragging
          onDragStart={(e) => handleDragStart(e, img.id)}
          onDragMove={(e) => handleDragMove(e, img.id)}
          onDragEnd={(e) => handleDragEnd(e, img.id)}
          // Styling
          stroke={getImageBorderColor(img.id)}
          strokeWidth={getStrokeWidth(img.id)}
          hitStrokeWidth={0} // Prevent stroke from interfering with events
          opacity={getImageOpacity(img.id)}
          {...getShadowProps(img.id)}
          // Events
          listening={true}
          onContextMenu={(e) => onContextMenu(e, img.id)}
        />
      ))}

      {/* Transformer for selected image */}
      <Transformer
        ref={transformerRef}
        {...getTransformerConfig()}
        onTransformEnd={handleTransformEnd}
      />
    </Layer>
  )
}

// Memoize to prevent re-renders when snap guides change
export const ImageLayer = React.memo(ImageLayerComponent)
