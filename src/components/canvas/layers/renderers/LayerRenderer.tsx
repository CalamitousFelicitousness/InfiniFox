import Konva from 'konva'
import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react'
import { Group, Rect, Image as KonvaImage, Line } from 'react-konva'

import { CanvasTool } from '../../../../features/canvas/hooks/useCanvasTools'
import { snappingManager } from '../../../../services/canvas/SnappingManager'
import type { SnapGuide } from '../../../../services/canvas/SnappingManager'
import { viewportCulling } from '../../../../services/canvas/ViewportCullingService'
import type {
  LayerNode,
  BlendMode,
  SelectionContext,
} from '../../../../store/slices/layerSystemSlice'
import { useStore } from '../../../../store/store'
import { getSelectionGlowStyles } from '../../../../utils/selectionStyles'

interface LayerRendererProps {
  layer: LayerNode
  currentTool?: CanvasTool
  parentScale: number
  onContextMenu?: (e: Konva.KonvaEventObject<PointerEvent>, layerId: string) => void
  viewport?: { x: number; y: number; width: number; height: number; scale: number }
  onSnapGuidesChange?: (guides: SnapGuide[]) => void
  onDragStart?: (layerId: string) => void
  onDragEnd?: () => void
  onLayerSelect?: (
    layerId: string,
    addToSelection?: boolean,
    rangeSelect?: boolean,
    context?: SelectionContext
  ) => void
  isDraggingLayer?: boolean
  draggingLayerId?: string | null
  artboardId?: string
}

/**
 * Recursive layer renderer for rendering layers anywhere on canvas
 */
export const LayerRenderer: React.FC<LayerRendererProps> = ({
  layer,
  currentTool,
  parentScale,
  onContextMenu,
  viewport,
  onSnapGuidesChange,
  onDragStart,
  onDragEnd,
  onLayerSelect,
}) => {
  const nodeRef = useRef<Konva.Node>(null)
  // Store the latest callback in a ref to avoid stale closures
  const onSnapGuidesChangeRef = useRef(onSnapGuidesChange)
  onSnapGuidesChangeRef.current = onSnapGuidesChange

  // RAF ref for throttling snap guide updates
  const rafRef = useRef<number | null>(null)
  const pendingGuidesRef = useRef<SnapGuide[] | null>(null)

  // Ref for tracking drop targets during drag
  const previousDropTargetRef = useRef<Konva.Node | null>(null)

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  // Throttled snap guide update function
  const updateSnapGuidesThrottled = useCallback((guides: SnapGuide[]) => {
    // Don't update if guides haven't changed
    if (JSON.stringify(pendingGuidesRef.current) === JSON.stringify(guides)) {
      return
    }

    pendingGuidesRef.current = guides

    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        if (pendingGuidesRef.current !== null && onSnapGuidesChangeRef.current) {
          onSnapGuidesChangeRef.current(pendingGuidesRef.current)
          pendingGuidesRef.current = null
        }
        rafRef.current = null
      })
    }
  }, [])
  const {
    getLayerChildren,
    updateLayerDirect,
    selectedLayerIds,
    selectLayer,
    getLayer,
    moveLayer,
    activeLayerRoles,
  } = useStore()

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
  const handleDragStart = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      console.log('Layer drag start:', layer.id, 'type:', layer.type)
      e.cancelBubble = true // Stop propagation to parent artboard

      // Set current object for snapping manager
      snappingManager.setCurrentObject(layer.id)
      onDragStart?.(layer.id)
    },
    [layer.id, layer.type, onDragStart]
  )

  // Handle drag move with snapping and drop target detection
  const handleDragMove = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      e.cancelBubble = true
      const node = e.target as Konva.Node
      const stage = node.getStage()

      // Get dimensions based on layer type
      let width = 0
      let height = 0
      if (layer.type === 'image' && layer.imageProps) {
        width = layer.imageProps.width
        height = layer.imageProps.height
      } else if (layer.type === 'shape' && layer.shapeProps) {
        width = layer.shapeProps.width || 100
        height = layer.shapeProps.height || 100
      } else if (layer.type === 'drawing' && layer.drawingProps) {
        // Calculate bounds for drawing layer
        const bounds = getDrawingBounds(layer.drawingProps)
        width = bounds.width
        height = bounds.height
      }

      // Get snapped position
      const snapResult = snappingManager.snap(node.x(), node.y(), width, height)

      // Apply snapped position
      node.x(snapResult.x)
      node.y(snapResult.y)

      // Update snap guides with throttling
      updateSnapGuidesThrottled(snapResult.guides)

      // Detect drop targets (artboards) for image and drawing layers
      if (stage && (layer.type === 'image' || layer.type === 'drawing')) {
        const pos = stage.getPointerPosition()
        if (pos) {
          // Find what's under the pointer
          const shape = stage.getIntersection(pos)

          if (shape && shape !== node) {
            // Check if the shape belongs to an artboard by checking its parent group
            let parent: any = shape.getParent()
            // Navigate up to find the artboard group
            while (parent && parent.className !== 'Group') {
              parent = parent.getParent()
            }

            if (parent && parent.id()) {
              const parentId = parent.id()
              // Check if this is an artboard
              const potentialArtboard = getLayer(parentId)
              if (
                potentialArtboard &&
                potentialArtboard.type === 'artboard' &&
                parentId !== layer.parentId
              ) {
                // Find the Rect child of the artboard Group that has the drag handlers
                const rectChildren = parent.find('Rect')
                if (rectChildren && rectChildren.length > 0) {
                  const dropTarget = rectChildren[0]

                  // Check if we're over a different target
                  if (
                    previousDropTargetRef.current &&
                    dropTarget !== previousDropTargetRef.current
                  ) {
                    // Fire dragleave on previous target
                    previousDropTargetRef.current.fire('dragleave', { evt: e.evt }, true)
                  }

                  // Fire dragenter if it's a new target
                  if (dropTarget !== previousDropTargetRef.current) {
                    dropTarget.fire('dragenter', { evt: e.evt }, true)
                    previousDropTargetRef.current = dropTarget
                  }
                }
              } else if (previousDropTargetRef.current) {
                // Not over a valid artboard, clear previous
                previousDropTargetRef.current.fire('dragleave', { evt: e.evt }, true)
                previousDropTargetRef.current = null
              }
            } else if (previousDropTargetRef.current) {
              // No valid parent, clear previous
              previousDropTargetRef.current.fire('dragleave', { evt: e.evt }, true)
              previousDropTargetRef.current = null
            }
          } else if (previousDropTargetRef.current) {
            // No shape under pointer or it's the dragged node itself, clear previous
            previousDropTargetRef.current.fire('dragleave', { evt: e.evt }, true)
            previousDropTargetRef.current = null
          }
        }
      }
    },
    [layer, updateSnapGuidesThrottled, getLayer]
  )

  // Handle drag end for layer
  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      e.cancelBubble = true // Stop propagation to parent artboard
      const node = e.target
      const stage = node.getStage()

      // Clear snapping state
      snappingManager.setCurrentObject(null)

      // Cancel any pending RAF and clear guides immediately
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      pendingGuidesRef.current = null
      onSnapGuidesChangeRef.current?.([])

      // Track if we successfully drop on an artboard
      let droppedOnArtboard = false

      // Check for drop on artboard
      console.log('Checking for drop, layer type:', layer.type, 'stage:', !!stage)
      if (stage && (layer.type === 'image' || layer.type === 'drawing')) {
        const pos = stage.getPointerPosition()
        console.log('Pointer position:', pos)
        if (pos) {
          // Find all groups in the stage (potential artboards)
          const allGroups = stage.find('Group')
          console.log('Found groups in stage:', allGroups.length)

          // Check if the pointer is over any artboard
          let targetArtboard = null
          for (const group of allGroups) {
            const groupId = group.id()
            if (groupId) {
              const potentialArtboard = getLayer(groupId)
              if (potentialArtboard && potentialArtboard.type === 'artboard') {
                // Check if the pointer is within this artboard's bounds
                const absPos = group.getAbsolutePosition()
                const width = potentialArtboard.artboardProps?.width || 1024
                const height = potentialArtboard.artboardProps?.height || 1024

                console.log('Checking artboard bounds:', {
                  id: groupId,
                  absPos,
                  width,
                  height,
                  pointerPos: pos,
                })

                if (
                  pos.x >= absPos.x &&
                  pos.x <= absPos.x + width &&
                  pos.y >= absPos.y &&
                  pos.y <= absPos.y + height &&
                  groupId !== layer.parentId
                ) {
                  targetArtboard = group
                  console.log('Found target artboard:', groupId)
                  break
                }
              }
            }
          }

          if (targetArtboard) {
            // Find the Rect child of the artboard Group that has the drop handler
            const rectChildren = targetArtboard.find('Rect')
            console.log('Found rect children:', rectChildren?.length)
            if (rectChildren && rectChildren.length > 0) {
              // Fire drop event on the first Rect (the background rect with drop handler)
              const dropTarget = rectChildren[0]
              console.log('Firing drop event on rect', dropTarget)
              dropTarget.fire('drop', { evt: e.evt, target: dropTarget }, true)
              droppedOnArtboard = true
            }
          }

          // Old approach as fallback
          const shape = stage.getIntersection(pos)
          console.log(
            'Shape under pointer (fallback):',
            shape,
            'shape className:',
            shape?.className,
            'shape id:',
            shape?.id()
          )

          if (shape) {
            // Check if the shape is an artboard background Rect
            if (shape.className === 'Rect') {
              // Check if its parent is a Group with an artboard ID
              const parent = shape.getParent()
              console.log(
                'Rect parent:',
                parent,
                'parent id:',
                parent?.id(),
                'parent className:',
                parent?.className
              )

              if (parent && parent.className === 'Group' && parent.id()) {
                const parentId = parent.id()
                const potentialArtboard = getLayer(parentId)
                console.log('Found potential artboard:', potentialArtboard)

                if (
                  potentialArtboard &&
                  potentialArtboard.type === 'artboard' &&
                  parentId !== layer.parentId
                ) {
                  console.log('Firing drop event on artboard rect')
                  shape.fire('drop', { evt: e.evt, target: shape }, true)
                }
              }
            } else {
              // Try to navigate up to find an artboard group
              let parent: any = shape.getParent()
              console.log('Initial parent:', parent, 'className:', parent?.className)
              while (parent && parent.className !== 'Group') {
                parent = parent.getParent()
                console.log('Traversing up, parent:', parent, 'className:', parent?.className)
              }

              if (parent && parent.id()) {
                console.log('Found parent with ID:', parent.id())
                const parentId = parent.id()
                const potentialArtboard = getLayer(parentId)
                console.log('Checking drop target:', {
                  parentId,
                  potentialArtboard,
                  layerParentId: layer.parentId,
                  layerId: layer.id,
                })

                // Check if we're dropping on an artboard that's not our current parent
                if (
                  potentialArtboard &&
                  potentialArtboard.type === 'artboard' &&
                  parentId !== layer.parentId
                ) {
                  // Find the Rect child of the artboard Group that has the drop handler
                  const rectChildren = parent.find('Rect')
                  console.log('Found rect children:', rectChildren?.length)
                  if (rectChildren && rectChildren.length > 0) {
                    // Fire drop event on the first Rect (the background rect with drop handler)
                    const dropTarget = rectChildren[0]
                    console.log('Firing drop event on rect', dropTarget)
                    dropTarget.fire('drop', { evt: e.evt, target: dropTarget }, true)
                  }
                }
              }
            }
          }
        }
      }

      // Clear previous drop target reference
      previousDropTargetRef.current = null

      onDragEnd?.()

      // Update position after drop ONLY if the layer wasn't dropped on an artboard
      // (If it was dropped onto an artboard, the artboard handler will set the correct position)
      if (!droppedOnArtboard) {
        updateLayerDirect(layer.id, {
          x: node.x(),
          y: node.y(),
        })
      } else {
        console.log('Layer was dropped on artboard, skipping position update in handleDragEnd')
      }
    },
    [layer.id, layer.type, layer.parentId, updateLayerDirect, onDragEnd, getLayer]
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

  // Handle click for selection
  const handleClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true
      // Check for modifier keys
      const addToSelection = e.evt.ctrlKey || e.evt.metaKey
      const rangeSelect = e.evt.shiftKey
      // Use passed handler or default to store's selectLayer
      if (onLayerSelect) {
        onLayerSelect(layer.id, addToSelection, rangeSelect, 'canvas')
      } else {
        selectLayer(layer.id, addToSelection, rangeSelect, 'canvas')
      }
    },
    [layer.id, onLayerSelect, selectLayer]
  )

  const isSelected = selectedLayerIds.has(layer.id)

  // Check if this layer has a role
  const layerRole = useMemo(() => {
    const role = activeLayerRoles.find((r) => r.layerId === layer.id)?.role || null
    return role
  }, [activeLayerRoles, layer.id])

  // Get border color based on role
  const getBorderColor = useCallback(() => {
    if (layerRole === 'img2img_init') return '#4ade80' // Green
    if (layerRole === 'inpaint_image') return '#fbbf24' // Yellow/amber
    if (layerRole === 'controlnet') return '#3b82f6' // Blue
    if (isSelected) return '#646cff' // Selection blue
    return 'transparent'
  }, [layerRole, isSelected])

  // Get children for group layers (must be before any returns for React hooks rule)
  const children = useMemo(
    () => (layer.type === 'group' ? getLayerChildren(layer.id) : []),
    [layer.type, layer.id, getLayerChildren]
  )

  // Calculate group bounds for selection rendering (must be before any returns for React hooks rule)
  const groupBounds = useMemo(() => {
    if (layer.type !== 'group' || !isSelected || children.length === 0) return null

    let minX = Infinity,
      minY = Infinity
    let maxX = -Infinity,
      maxY = -Infinity

    children.forEach((child) => {
      const bounds = {
        x: child.x,
        y: child.y,
        width: 0,
        height: 0,
      }

      // Get size based on child type
      if (child.type === 'image' && child.imageProps) {
        bounds.width = child.imageProps.width * (child.scaleX || 1)
        bounds.height = child.imageProps.height * (child.scaleY || 1)
      } else if (child.type === 'artboard' && child.artboardProps) {
        bounds.width = child.artboardProps.width
        bounds.height = child.artboardProps.height
      }

      minX = Math.min(minX, bounds.x)
      minY = Math.min(minY, bounds.y)
      maxX = Math.max(maxX, bounds.x + bounds.width)
      maxY = Math.max(maxY, bounds.y + bounds.height)
    })

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    }
  }, [layer.type, children, isSelected])

  // Helper function to get bounds of drawing strokes
  const getDrawingBounds = (drawingProps: NonNullable<LayerNode['drawingProps']>) => {
    let minX = Infinity,
      minY = Infinity
    let maxX = -Infinity,
      maxY = -Infinity

    drawingProps.strokes.forEach((stroke) => {
      for (let i = 0; i < stroke.points.length; i += 2) {
        const x = stroke.points[i]
        const y = stroke.points[i + 1]
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    })

    // Add padding for stroke width
    const padding = Math.max(...drawingProps.strokes.map((s) => s.strokeWidth)) / 2

    const bounds = {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
    }

    return bounds
  }

  // Apply blend mode
  const blendMode = layer.blendMode || 'normal'
  const globalCompositeOperation = getKonvaBlendMode(blendMode)

  // Skip rendering if not visible
  if (!isVisible) {
    return null
  }

  // Render based on layer type
  switch (layer.type) {
    case 'group': {
      // Don't render empty groups - they should be automatically deleted
      if (children.length === 0) {
        return null
      }

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
          draggable={!layer.locked && currentTool === CanvasTool.SELECT}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onContextMenu={handleContextMenu}
          onClick={handleClick}
        >
          {/* Selection indicator for group */}
          {isSelected && groupBounds && (
            <Rect
              x={groupBounds.x}
              y={groupBounds.y}
              width={groupBounds.width}
              height={groupBounds.height}
              stroke="rgba(100, 108, 255, 0.5)"
              strokeWidth={1.5}
              strokeScaleEnabled={false}
              fill="transparent"
              listening={false}
              dash={[10, 5]}
              dashEnabled={true}
              cornerRadius={4}
            />
          )}
          {children.map((child) => (
            <LayerRenderer
              key={child.id}
              layer={child}
              currentTool={currentTool}
              parentScale={parentScale}
              onContextMenu={onContextMenu}
              viewport={viewport}
              onSnapGuidesChange={onSnapGuidesChange}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onLayerSelect={onLayerSelect}
              isDraggingLayer={isDraggingLayer}
              draggingLayerId={draggingLayerId}
              artboardId={artboardId}
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
          draggable={!layer.locked && currentTool === CanvasTool.SELECT}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onContextMenu={handleContextMenu}
          onClick={handleClick}
        >
          <KonvaImage
            image={image}
            x={0}
            y={0}
            width={layer.imageProps.width}
            height={layer.imageProps.height}
            globalCompositeOperation={globalCompositeOperation}
            // Reduce image quality for performance when zoomed out
            imageSmoothingEnabled={shouldRenderHighQuality}
            pixelPerfect={levelOfDetail === 'high'}
          />
          {/* Selection/role border rendered on top */}
          {(isSelected || layerRole) && (
            <Rect
              x={0}
              y={0}
              width={layer.imageProps.width}
              height={layer.imageProps.height}
              stroke={getBorderColor()}
              strokeWidth={layerRole ? 3 : 2}
              fill="transparent"
              listening={false}
            />
          )}
        </Group>
      )
    }

    case 'text':
      // TODO: Implement text layer rendering
      return null

    case 'shape':
      // TODO: Implement shape layer rendering
      return null

    case 'drawing': {
      if (!layer.drawingProps) return null

      const drawingBounds = getDrawingBounds(layer.drawingProps)

      // Render drawing layer - same approach as image layer
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
          draggable={!layer.locked && currentTool === CanvasTool.SELECT}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
        >
          {/* Invisible hit area for selection and dragging */}
          <Rect
            x={drawingBounds.x}
            y={drawingBounds.y}
            width={drawingBounds.width}
            height={drawingBounds.height}
            fill="transparent"
            listening={true}
          />

          {/* Render each stroke */}
          {layer.drawingProps.strokes.map((stroke, index) => {
            // If we have an outline from PerfectFreehand, render as filled polygon
            if (stroke.outline && stroke.outline.length > 0) {
              const flatPoints = stroke.outline.flat()
              return (
                <Line
                  key={`${layer.id}-stroke-${index}`}
                  points={flatPoints}
                  fill={stroke.color}
                  closed={true}
                  opacity={stroke.opacity}
                  listening={false}
                />
              )
            }
            // Fallback to regular line if no outline
            return (
              <Line
                key={`${layer.id}-stroke-${index}`}
                points={stroke.points}
                stroke={stroke.color}
                strokeWidth={stroke.strokeWidth}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
                opacity={stroke.opacity}
                listening={false}
              />
            )
          })}

          {/* Selection indicator with role-based coloring */}
          {(selectedLayerIds.has(layer.id) || layerRole) && (
            <Rect
              x={drawingBounds.x}
              y={drawingBounds.y}
              width={drawingBounds.width}
              height={drawingBounds.height}
              stroke={getBorderColor()}
              strokeWidth={layerRole ? 3 / parentScale : 2 / parentScale}
              strokeScaleEnabled={false}
              fill="transparent"
              listening={false}
              dash={[5, 5]}
              shadowBlur={layerRole ? 15 : 0}
              shadowColor={getBorderColor()}
              shadowOpacity={layerRole ? 0.6 : 0}
            />
          )}
        </Group>
      )
    }

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
