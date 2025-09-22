import Konva from 'konva'
import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react'
import { Group, Rect, Text } from 'react-konva'

import { CanvasTool } from '../../../features/canvas/hooks/useCanvasTools'
import { snappingManager } from '../../../services/canvas/SnappingManager'
import type { SnapGuide } from '../../../services/canvas/SnappingManager'
import { viewportCulling } from '../../../services/canvas/ViewportCullingService'
import type { LayerNode, SelectionContext } from '../../../store/slices/layerSystemSlice'
import { useStore } from '../../../store/store'
import {
  getSelectionBorderStyles,
  getSelectionGlowStyles,
  getDragHoverStyles,
} from '../../../utils/selectionStyles'

import { ArtboardLoadingOverlay } from './ArtboardLoadingOverlay'
import { LayerRenderer } from './renderers/LayerRenderer'

interface ArtboardComponentProps {
  artboard: LayerNode
  isActive: boolean
  currentTool?: CanvasTool
  scale: number
  viewport?: { x: number; y: number; width: number; height: number }
  onSelect?: (
    artboardId: string,
    addToSelection?: boolean,
    rangeSelect?: boolean,
    context?: SelectionContext
  ) => void
  onContextMenu?: (e: Konva.KonvaEventObject<PointerEvent>, artboardId: string) => void
  onSnapGuidesChange?: (guides: SnapGuide[]) => void
  onDragStart?: (layerId: string) => void
  onDragEnd?: () => void
  onLayerSelect?: (layerId: string) => void
  isDraggingLayer?: boolean
  draggingLayerId?: string | null
}

/**
 * Artboard component that renders a clipped group with background
 * This implements the Subcanvas tier in the Photoshop-like system
 */
export const ArtboardComponent: React.FC<ArtboardComponentProps> = ({
  artboard,
  isActive,
  currentTool,
  scale,
  viewport,
  onSelect,
  onContextMenu,
  onSnapGuidesChange,
  onDragStart,
  onDragEnd,
  onLayerSelect,
  isDraggingLayer = false,
  draggingLayerId = null,
}) => {
  const groupRef = useRef<Konva.Group>(null)
  // Store the latest callback in a ref to avoid stale closures
  const onSnapGuidesChangeRef = useRef(onSnapGuidesChange)
  onSnapGuidesChangeRef.current = onSnapGuidesChange

  // State for drag hover effect
  const [isDragHovering, setIsDragHovering] = useState(false)

  // RAF ref for throttling snap guide updates
  const rafRef = useRef<number | null>(null)
  const pendingGuidesRef = useRef<SnapGuide[] | null>(null)

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
    pendingGuidesRef.current = guides

    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        if (pendingGuidesRef.current !== null) {
          onSnapGuidesChangeRef.current?.(pendingGuidesRef.current)
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
    operationLoadingStates,
    moveLayer,
    getLayer,
    getLayerRole,
  } = useStore()

  // Get artboard properties
  const {
    x,
    y,
    opacity,
    visible,
    locked,
    artboardProps = { width: 800, height: 600, backgroundColor: '#ffffff' },
    filters = [],
    cached = false,
  } = artboard

  const { width, height, backgroundColor, clipped } = artboardProps

  // Get child layers
  const children = useMemo(() => getLayerChildren(artboard.id), [artboard.id, getLayerChildren])

  // Check for active loading operations on this artboard
  const loadingOperation = useMemo(() => {
    const states = Array.from(operationLoadingStates.entries())
    for (const [key, isLoading] of states) {
      if (isLoading && key.includes(artboard.id)) {
        // Extract operation type from key (e.g., "duplicate-artboard-123" -> "Duplicating...")
        if (key.startsWith('duplicate-')) return 'Duplicating...'
        if (key.startsWith('clear-')) return 'Clearing...'
        if (key.startsWith('arrange-')) return 'Arranging...'
        if (key.startsWith('fit-')) return 'Fitting to contents...'
        return 'Processing...'
      }
    }
    return null
  }, [operationLoadingStates, artboard.id])

  // Check if artboard is visible in viewport
  const isArtboardVisible = useMemo(() => {
    if (!viewport) return true
    viewportCulling.updateViewport({ ...viewport, scale })
    return viewportCulling.isLayerVisible(artboard)
  }, [viewport, scale, artboard])

  // Apply caching and filters if needed
  React.useEffect(() => {
    if (!groupRef.current) return

    const group = groupRef.current

    if (filters.length > 0 && !cached) {
      // Apply caching for filters
      group.cache()

      // Apply each filter
      const konvaFilters = filters
        .filter((f) => f.enabled)
        .map((f) => {
          switch (f.type) {
            case 'blur':
              group.blurRadius(f.params.radius || 5)
              return Konva.Filters.Blur
            case 'brightness':
              group.brightness(f.params.brightness || 0)
              return Konva.Filters.Brighten
            case 'contrast':
              group.contrast(f.params.contrast || 0)
              return Konva.Filters.Contrast
            case 'grayscale':
              return Konva.Filters.Grayscale
            case 'sepia':
              return Konva.Filters.Sepia
            case 'invert':
              return Konva.Filters.Invert
            case 'hue':
              group.hue(f.params.hue || 0)
              return Konva.Filters.HSL
            case 'saturation':
              group.saturation(f.params.saturation || 0)
              return Konva.Filters.HSL
            case 'pixelate':
              group.pixelSize(f.params.pixelSize || 5)
              return Konva.Filters.Pixelate
            case 'noise':
              group.noise(f.params.noise || 0.5)
              return Konva.Filters.Noise
            default:
              return null
          }
        })
        .filter(Boolean)

      group.filters(konvaFilters as Konva.Filter[])
    } else if (filters.length === 0 && cached) {
      // Clear cache if no filters
      group.clearCache()
      group.filters([])
      updateLayerDirect(artboard.id, { cached: false })
    }
  }, [filters, cached, artboard.id, updateLayerDirect])

  // Handle drag start
  const handleDragStart = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const target = e.target

      // Check if a child initiated the drag
      // For nested Groups, Konva might trigger both drags
      if (target.id() !== artboard.id) {
        console.log('Artboard drag prevented - initiated by child:', target.id())
        // Stop the artboard from dragging
        e.target.stopDrag()
        return
      }

      // Set current object for snapping manager
      snappingManager.setCurrentObject(artboard.id)
      onDragStart?.(artboard.id)
    },
    [artboard.id, onDragStart]
  )

  // Handle drag move with snapping
  const handleDragMove = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      // If the target is not the artboard itself, ignore
      if (e.target.id() !== artboard.id) {
        return
      }

      const node = e.target as Konva.Group
      const { width = 800, height = 600 } = artboard.artboardProps || {}

      // Get snapped position
      const snapResult = snappingManager.snap(node.x(), node.y(), width, height)

      // Apply snapped position
      node.x(snapResult.x)
      node.y(snapResult.y)

      // Update snap guides with throttling
      updateSnapGuidesThrottled(snapResult.guides)
    },
    [artboard.id, artboard.artboardProps, updateSnapGuidesThrottled]
  )

  // Handle drag end
  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      // If the target is not the artboard itself, ignore
      if (e.target.id() !== artboard.id) {
        return
      }

      const node = e.target as Konva.Group

      // Clear snapping state
      snappingManager.setCurrentObject(null)

      // Cancel any pending RAF and clear guides immediately
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      pendingGuidesRef.current = null
      onSnapGuidesChangeRef.current?.([])

      onDragEnd?.()

      // Persist the snapped position
      updateLayerDirect(artboard.id, {
        x: node.x(),
        y: node.y(),
      })
    },
    [artboard.id, updateLayerDirect, onDragEnd]
  )

  // Handle click
  const handleClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Pass modifier key information for multi-selection
      const addToSelection = e.evt.ctrlKey || e.evt.metaKey
      const rangeSelect = e.evt.shiftKey
      onSelect?.(artboard.id, addToSelection, rangeSelect, 'canvas')
    },
    [artboard.id, onSelect]
  )

  // Handle context menu for artboard itself
  const handleContextMenu = useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>) => {
      e.evt.preventDefault()
      e.cancelBubble = true // Stop propagation to stage handler
      onContextMenu?.(e, artboard.id)
    },
    [artboard.id, onContextMenu]
  )

  // Handle drag enter on artboard background
  const handleDragEnter = useCallback(() => {
    // Check if a layer is being dragged and it's not the artboard itself
    if (isDraggingLayer && draggingLayerId && draggingLayerId !== artboard.id) {
      const draggedLayer = getLayer(draggingLayerId)
      // Prevent artboards from being dropped into other artboards
      if (draggedLayer && draggedLayer.type !== 'artboard') {
        setIsDragHovering(true)
      }
    }
  }, [isDraggingLayer, draggingLayerId, artboard.id, getLayer])

  // Handle drag leave from artboard background
  const handleDragLeave = useCallback(() => {
    setIsDragHovering(false)
  }, [])

  // Handle drop on artboard background
  const handleDrop = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      console.log('ArtboardComponent handleDrop called', {
        draggingLayerId,
        artboardId: artboard.id,
        isDragHovering,
      })
      setIsDragHovering(false)

      if (!draggingLayerId || draggingLayerId === artboard.id) {
        console.log('Drop cancelled: no draggingLayerId or same as artboard')
        return
      }

      const draggedLayer = getLayer(draggingLayerId)
      if (!draggedLayer || draggedLayer.type === 'artboard') {
        console.log('Drop cancelled: layer not found or is artboard', draggedLayer)
        return
      }

      // Check if the layer is already a child of this artboard
      if (draggedLayer.parentId === artboard.id) {
        console.log('Drop cancelled: layer already in this artboard')
        return
      }

      // Move the layer into this artboard
      console.log('Moving layer to artboard', draggingLayerId, artboard.id)

      // Get the pointer position relative to the artboard Group
      // The event target should be the Rect, whose parent is the artboard Group
      const artboardGroup = e.target.getParent() // This should be the artboard Group

      // Get pointer position relative to the artboard
      let relativePos = artboardGroup?.getRelativePointerPosition()

      if (!relativePos && groupRef.current) {
        // Fallback: use our ref if available
        relativePos = groupRef.current.getRelativePointerPosition()
      }

      if (!relativePos) {
        // Second fallback: calculate using stage position and transform
        const stage = e.target.getStage()
        const pointerPos = stage?.getPointerPosition()

        if (pointerPos && groupRef.current) {
          // Get the absolute position of the artboard group
          const absPos = groupRef.current.getAbsolutePosition()
          relativePos = {
            x: pointerPos.x - absPos.x,
            y: pointerPos.y - absPos.y,
          }
        }
      }

      if (relativePos) {
        const relativeX = relativePos.x
        const relativeY = relativePos.y

        // Get layer dimensions based on layer type
        let layerWidth = 0
        let layerHeight = 0

        if (draggedLayer.type === 'image' && draggedLayer.imageProps) {
          layerWidth = draggedLayer.imageProps.width || 0
          layerHeight = draggedLayer.imageProps.height || 0
        } else if (draggedLayer.type === 'shape' && draggedLayer.shapeProps) {
          layerWidth = draggedLayer.shapeProps.width || 0
          layerHeight = draggedLayer.shapeProps.height || 0
        } else if (draggedLayer.type === 'text' && draggedLayer.textProps) {
          layerWidth = draggedLayer.textProps.width || 100
          layerHeight = 50 // Default height for text
        } else if (draggedLayer.type === 'artboard' && draggedLayer.artboardProps) {
          layerWidth = draggedLayer.artboardProps.width || 0
          layerHeight = draggedLayer.artboardProps.height || 0
        }

        // Center the layer at the drop point
        const centeredX = relativeX - layerWidth / 2
        const centeredY = relativeY - layerHeight / 2

        // Move the layer and update its position to be relative to the artboard
        moveLayer(draggingLayerId, artboard.id)
        updateLayerDirect(draggingLayerId, {
          x: centeredX,
          y: centeredY,
        })
      } else {
        // Fallback if we can't get relative pointer position
        console.log(
          'Warning: Could not get relative pointer position, falling back to stage position'
        )
        const currentX = draggedLayer.x || 0
        const currentY = draggedLayer.y || 0
        const artboardX = artboard.x || 0
        const artboardY = artboard.y || 0

        const relativeX = currentX - artboardX
        const relativeY = currentY - artboardY

        moveLayer(draggingLayerId, artboard.id)
        updateLayerDirect(draggingLayerId, {
          x: relativeX,
          y: relativeY,
        })
      }
    },
    [
      draggingLayerId,
      artboard.id,
      artboard.x,
      artboard.y,
      getLayer,
      moveLayer,
      updateLayerDirect,
      isDragHovering,
    ]
  )

  // Handle context menu for child layers
  const handleLayerContextMenu = useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>, layerId: string) => {
      onContextMenu?.(e, layerId)
    },
    [onContextMenu]
  )

  // Check if we're in SELECT mode
  const isSelectTool = currentTool === CanvasTool.SELECT

  // Check artboard role for visual indication
  const artboardRole = getLayerRole(artboard.id)

  // Get role colors from CSS variables (defined in role-indicators.css)
  const roleColors = useMemo(() => {
    // These match the CSS variables in role-indicators.css
    return {
      img2img_init: '#4caf50', // --color-success-500
      inpaint_image: '#ff9800', // --color-warning-500
      controlnet: '#2196f3', // --color-info-500
    }
  }, [])

  // Get role-based border color
  const getRoleBorderColor = useCallback(() => {
    if (artboardRole === 'img2img_init') return roleColors.img2img_init
    if (artboardRole === 'inpaint_image') return roleColors.inpaint_image
    if (artboardRole === 'controlnet') return roleColors.controlnet
    return null
  }, [artboardRole, roleColors])

  const roleBorderColor = getRoleBorderColor()

  // Get role label text
  const getRoleLabel = useCallback(() => {
    if (artboardRole === 'img2img_init') return 'Img2Img'
    if (artboardRole === 'inpaint_image') return 'Inpaint'
    if (artboardRole === 'controlnet') return 'ControlNet'
    return null
  }, [artboardRole])

  // Skip rendering if artboard is not visible
  if (!isArtboardVisible) {
    return null
  }

  // Create viewport for children with artboard offset
  const childViewport = viewport
    ? {
        x: viewport.x - x,
        y: viewport.y - y,
        width: viewport.width,
        height: viewport.height,
        scale,
      }
    : undefined

  // Clipping configuration
  const clipConfig = clipped
    ? {
        clipX: 0,
        clipY: 0,
        clipWidth: width,
        clipHeight: height,
      }
    : {}

  return (
    <Group
      ref={groupRef}
      id={artboard.id}
      x={x}
      y={y}
      opacity={opacity}
      visible={visible}
      draggable={!locked && isSelectTool}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      {/* Selection visualization - rendered outside clipped area */}
      {selectedLayerIds.has(artboard.id) &&
        (() => {
          const borderStyles = getSelectionBorderStyles('artboard', isActive)
          const glowStyles = getSelectionGlowStyles('artboard', isActive, scale)

          return (
            <>
              {/* Shadow-based glow effect */}
              <Rect
                x={0}
                y={0}
                width={width}
                height={height}
                {...glowStyles}
                strokeScaleEnabled={false}
                listening={false}
                shadowForStrokeEnabled={false}
              />

              {/* Main selection border */}
              <Rect
                x={0}
                y={0}
                width={width}
                height={height}
                {...borderStyles}
                strokeScaleEnabled={false}
                listening={false}
              />
            </>
          )
        })()}

      {/* Role indicator border - shows when artboard has a role assigned */}
      {roleBorderColor && (
        <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          stroke={roleBorderColor}
          strokeWidth={3}
          strokeScaleEnabled={false}
          listening={false}
          dash={[10, 5]}
          cornerRadius={4}
          shadowBlur={15}
          shadowColor={roleBorderColor}
          shadowOpacity={0.6}
        />
      )}

      {/* Clipped content group */}
      <Group {...clipConfig}>
        {/* Background rectangle - acts as drop target */}
        <Rect
          width={width}
          height={height}
          fill={backgroundColor}
          listening={true}
          onContextMenu={handleContextMenu}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          opacity={isDragHovering ? 0.8 : 1}
        />

        {/* Drag hover indicator */}
        {isDragHovering &&
          (() => {
            const hoverStyles = getDragHoverStyles()
            return (
              <Rect
                width={width}
                height={height}
                {...hoverStyles}
                strokeScaleEnabled={false}
                listening={false}
                dash={[10, 5]}
              />
            )
          })()}

        {/* Render child layers */}
        {children.map((child) => (
          <LayerRenderer
            key={child.id}
            layer={child}
            currentTool={currentTool}
            parentScale={scale}
            viewport={childViewport}
            onContextMenu={handleLayerContextMenu}
            onSnapGuidesChange={onSnapGuidesChange}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onLayerSelect={onLayerSelect}
            isDraggingLayer={isDraggingLayer}
            draggingLayerId={draggingLayerId}
            artboardId={artboard.id}
          />
        ))}
      </Group>

      {/* Role label indicator - positioned outside/above the artboard */}
      {roleBorderColor && getRoleLabel() && (
        <>
          {/* Label background */}
          <Rect
            x={0}
            y={-48}
            width={getRoleLabel()!.length * 16 + 32}
            height={40}
            fill="rgba(42, 42, 42, 0.9)"
            stroke={roleBorderColor}
            strokeWidth={2}
            cornerRadius={6}
          />
          {/* Label text */}
          <Text
            x={16}
            y={-36}
            text={getRoleLabel()!}
            fontSize={24}
            fontFamily="Inter, system-ui, sans-serif"
            fill={roleBorderColor}
            listening={false}
          />
        </>
      )}

      {/* Artboard label */}
      {scale < 0.5 && ( // Only show label when zoomed out
        <Rect
          y={-25}
          width={Math.max(100, artboard.name.length * 8)}
          height={20}
          fill="rgba(0, 0, 0, 0.7)"
          cornerRadius={3}
        />
      )}

      {/* Loading overlay */}
      {loadingOperation && (
        <ArtboardLoadingOverlay
          x={0}
          y={0}
          width={width}
          height={height}
          operation={loadingOperation}
        />
      )}
    </Group>
  )
}

export default ArtboardComponent
