import React, { useEffect, useRef } from 'react'
import { Layer, Image as KonvaImage, Transformer } from 'react-konva'
import Konva from 'konva'
import type { KonvaImageData } from '../hooks/useImageManagement'
import { CanvasTool } from '../hooks/useCanvasTools'

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
  onImageDragEnd: (imageId: string, newX: number, newY: number) => void
  onImageTransformEnd: (imageId: string, node: Konva.Node) => void
  onContextMenu: (e: Konva.KonvaEventObject<PointerEvent>, imageId: string) => void
  
  // Utilities
  isImageDraggable: (imageId: string) => boolean
  getImageBorderColor: (imageId: string) => string
  getImageOpacity: (imageId: string) => number
  getTransformerConfig: () => any
}

/**
 * Layer component responsible for rendering images and handling selection/transformation
 * Separated from the main Canvas component for better organization and performance
 */
export function ImageLayer({
  images,
  selectedId,
  activeImageRoles,
  canvasSelectionMode,
  currentTool,
  onImageSelect,
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
   * Handle image click/selection
   */
  const handleImageClick = (imageId: string) => {
    if (currentTool === CanvasTool.SELECT) {
      onImageSelect(imageId)
    }
  }

  /**
   * Handle drag start
   */
  const handleDragStart = (e: Konva.KonvaEventObject<DragEvent>, imageId: string) => {
    // Select on drag start if not already selected
    if (currentTool === CanvasTool.SELECT && selectedId !== imageId) {
      onImageSelect(imageId)
    }
    
    // Force cache to prevent buffer issues
    e.target.cache()
    e.target.getLayer()?.batchDraw()
  }

  /**
   * Handle drag move to keep image on screen
   */
  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target
    if (!node.isClientRectOnScreen()) {
      // If the image is being dragged off-screen, limit the movement
      const stage = node.getStage()
      if (stage) {
        const box = node.getClientRect()
        const stageBox = {
          x: 0,
          y: 0,
          width: stage.width(),
          height: stage.height(),
        }
        // Keep at least part of the image visible
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
    
    // Clear cache after drag
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
          onDragMove={handleDragMove}
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
