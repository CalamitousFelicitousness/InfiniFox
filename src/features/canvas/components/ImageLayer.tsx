import Konva from 'konva'
import React, { useEffect, useRef } from 'react'
import { Layer, Image as KonvaImage } from 'react-konva'
import { useStore } from '../../../store/store'
import { MultiTransformer } from './MultiTransformer'
import { CanvasTool } from '../hooks/useCanvasTools'
import type { KonvaImageData } from '../hooks/useImageManagement'

interface ImageLayerProps {
  // Image data
  images: KonvaImageData[]
  activeImageRoles: Array<{ imageId: string; role: string }>
  canvasSelectionMode: {
    active: boolean
    mode?: string
  }

  // Tool state
  currentTool: CanvasTool

  // Callbacks
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
  activeImageRoles,
  canvasSelectionMode: _canvasSelectionMode,
  currentTool,
  onImageDragStart,
  onImageDragMove,
  onImageDragEnd,
  onImageTransformEnd,
  onContextMenu,
  isImageDraggable,
  getImageBorderColor,
  getImageOpacity,
}: ImageLayerProps) {
  const layerRef = useRef<Konva.Layer>(null)

  // Add ref to track if selection box just completed
  const selectionBoxJustCompleted = useRef(false)
  
  // Get multi-selection state from store
  const selectedIds = useStore((state) => state.selectedIds)
  const selectItem = useStore((state) => state.selectItem)
  const deselectAll = useStore((state) => state.deselectAll)
  const isSelected = useStore((state) => state.isSelected)
  const selectionBox = useStore((state) => state.selectionBox)

  /**
   * Handle image selection with modifier keys
   */
  const handleImageSelect = (imageId: string, e: Konva.KonvaEventObject<PointerEvent>) => {
    if (currentTool !== CanvasTool.SELECT) return

    const evt = e.evt
    
    // Check if this is a right-click (button 2)
    if (evt.button === 2) {
      // If the image is already selected, don't change selection
      if (isSelected(imageId)) {
        e.cancelBubble = true
        return
      }
      // If right-clicking an unselected image, select only that image
      selectItem(imageId, 'none')
      e.cancelBubble = true
      return
    }
    
    let modifier: 'none' | 'shift' | 'ctrl' | 'ctrl-shift' = 'none'

    if (evt.ctrlKey || evt.metaKey) {
      modifier = evt.shiftKey ? 'ctrl-shift' : 'ctrl'
    } else if (evt.shiftKey) {
      modifier = 'shift'
    }

    selectItem(imageId, modifier)
    e.cancelBubble = true // Stop event from bubbling to stage
  }

  /**
   * Handle drag start
   */
  const handleDragStart = (e: Konva.KonvaEventObject<DragEvent>, imageId: string) => {
    // If dragging an unselected image, select only that image
    if (!isSelected(imageId)) {
      selectItem(imageId, 'none')
    }

    // Notify snapping system
    onImageDragStart(imageId)

    // Cache for performance
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

    // If multiple items selected, move them all together
    if (selectedIds.size > 1) {
      const deltaX = snappedPos.x - images.find(img => img.id === imageId)!.x
      const deltaY = snappedPos.y - images.find(img => img.id === imageId)!.y
      
      // Move other selected items
      selectedIds.forEach((id) => {
        if (id !== imageId) {
          const otherNode = layerRef.current?.findOne(`#${id}`)
          if (otherNode) {
            const img = images.find(i => i.id === id)
            if (img) {
              otherNode.x(img.x + deltaX)
              otherNode.y(img.y + deltaY)
            }
          }
        }
      })
    }

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

    // If multiple items selected, update all their positions
    if (selectedIds.size > 1) {
      const batchUpdatePositions = useStore.getState().batchUpdatePositions
      const updates = Array.from(selectedIds).map((id) => {
        const imgNode = layerRef.current?.findOne(`#${id}`)
        if (imgNode) {
          return { id, x: imgNode.x(), y: imgNode.y() }
        }
        return null
      }).filter(Boolean) as Array<{id: string, x: number, y: number}>
      
      if (updates.length > 0) {
        batchUpdatePositions(updates)
      }
    }

    // Force redraw
    node.getLayer()?.batchDraw()
  }

  /**
   * Handle transform end for multi-selection
   */
  const handleMultiTransformEnd = () => {
    if (selectedIds.size > 0) {
      const batchUpdateTransforms = useStore.getState().batchUpdateTransforms
      const updates = Array.from(selectedIds).map((id) => {
        const node = layerRef.current?.findOne(`#${id}`)
        if (node) {
          return {
            id,
            transform: {
              x: node.x(),
              y: node.y(),
              scaleX: node.scaleX(),
              scaleY: node.scaleY(),
              rotation: node.rotation(),
            }
          }
        }
        return null
      }).filter(Boolean) as Array<{id: string, transform: any}>
      
      if (updates.length > 0) {
        batchUpdateTransforms(updates)
      }
    }
  }

  /**
   * Get stroke width based on selection and role
   */
  const getStrokeWidth = (imageId: string) => {
    const selected = isSelected(imageId)
    const hasRole = activeImageRoles.some((r) => r.imageId === imageId)
    return selected || hasRole ? 3 : 0
  }

  /**
   * Get shadow properties for selected images
   */
  const getShadowProps = (imageId: string) => {
    if (isSelected(imageId)) {
      return {
        shadowBlur: 10,
        shadowColor: getImageBorderColor(imageId),
        shadowOpacity: 0.5,
      }
    }
    return {}
  }

  // Track when selection box changes
  useEffect(() => {
    if (selectionBox === null) {
      // Selection box just completed
      selectionBoxJustCompleted.current = true
      setTimeout(() => {
        selectionBoxJustCompleted.current = false
      }, 100)
    }
  }, [selectionBox])

  // Handle clicks on empty stage area
  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return

    const stage = layer.getStage()
    if (!stage) return

    const handleStageClick = (e: Konva.KonvaEventObject<PointerEvent>) => {
      // Don't deselect if event was cancelled (e.g., from selection box)
      if (e.cancelBubble) return
      
      // Don't deselect if selection box just completed
      if (selectionBoxJustCompleted.current) return
      
      // Check if we clicked on empty area
      if (e.target === stage || e.target === layer) {
        deselectAll()
      }
    }

    stage.on('click', handleStageClick)
    return () => {
      stage.off('click', handleStageClick)
    }
  }, [deselectAll])

  // Sort images by z-index for proper rendering order
  const sortedImages = [...images].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))

  return (
    <Layer ref={layerRef}>
      {/* Render images */}
      {sortedImages.map((img) => (
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
          onPointerDown={(e) => handleImageSelect(img.id, e)}
          // Dragging
          onDragStart={(e) => handleDragStart(e, img.id)}
          onDragMove={(e) => handleDragMove(e, img.id)}
          onDragEnd={(e) => handleDragEnd(e, img.id)}
          // Styling
          stroke={isSelected(img.id) ? 'rgb(59, 130, 246)' : getImageBorderColor(img.id)}
          strokeWidth={getStrokeWidth(img.id)}
          hitStrokeWidth={0} // Prevent stroke from interfering with events
          opacity={getImageOpacity(img.id)}
          {...getShadowProps(img.id)}
          // Events
          listening={true}
          onContextMenu={(e) => {
            // Ensure image is selected before showing context menu
            if (!isSelected(img.id)) {
              // If not selected, select only this image
              selectItem(img.id, 'none')
            }
            onContextMenu(e, img.id)
          }}
        />
      ))}

      {/* Multi-selection transformer */}
      {currentTool === CanvasTool.SELECT && selectedIds && selectedIds.size > 0 && (
        <MultiTransformer 
          selectedIds={Array.from(selectedIds)}
          onTransformEnd={handleMultiTransformEnd}
        />
      )}
    </Layer>
  )
}

// Memoize to prevent re-renders when snap guides change
export const ImageLayer = React.memo(ImageLayerComponent)
