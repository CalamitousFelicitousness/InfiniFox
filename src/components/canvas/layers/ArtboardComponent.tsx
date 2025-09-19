import Konva from 'konva'
import React, { useCallback, useMemo, useRef } from 'react'
import { Group, Rect } from 'react-konva'

import { createSnapGuideScheduler } from '../../../features/canvas/utils/snapGuideScheduler'
import { snappingManager } from '../../../services/canvas/SnappingManager'
import type { SnapGuide } from '../../../services/canvas/SnappingManager'
import { viewportCulling } from '../../../services/canvas/ViewportCullingService'
import type { LayerNode } from '../../../store/slices/layerSystemSlice'
import { useStore } from '../../../store/store'

import { ArtboardLoadingOverlay } from './ArtboardLoadingOverlay'
import { LayerRenderer } from './renderers/LayerRenderer'

interface ArtboardComponentProps {
  artboard: LayerNode
  isActive: boolean
  scale: number
  viewport?: { x: number; y: number; width: number; height: number }
  onSelect?: (artboardId: string) => void
  onContextMenu?: (e: Konva.KonvaEventObject<PointerEvent>, artboardId: string) => void
  onSnapGuidesChange?: (guides: SnapGuide[]) => void
  onDragStart?: (layerId: string) => void
  onDragEnd?: () => void
  onLayerSelect?: (layerId: string) => void
}

/**
 * Artboard component that renders a clipped group with background
 * This implements the Subcanvas tier in the Photoshop-like system
 */
export const ArtboardComponent: React.FC<ArtboardComponentProps> = ({
  artboard,
  isActive,
  scale,
  viewport,
  onSelect,
  onContextMenu,
  onSnapGuidesChange,
  onDragStart,
  onDragEnd,
  onLayerSelect,
}) => {
  const groupRef = useRef<Konva.Group>(null)
  const snapSchedulerRef = useRef(createSnapGuideScheduler(onSnapGuidesChange))

  const { getLayerChildren, updateLayerDirect, selectedLayerIds, operationLoadingStates } =
    useStore()

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

  // Update snap scheduler callback when it changes
  React.useEffect(() => {
    if (snapSchedulerRef.current && onSnapGuidesChange) {
      snapSchedulerRef.current.setOnGuideChange(onSnapGuidesChange)
    }
  }, [onSnapGuidesChange])

  // Handle drag start
  const handleDragStart = useCallback(() => {
    // Set current object for snapping manager
    snappingManager.setCurrentObject(artboard.id)
    onDragStart?.(artboard.id)
  }, [artboard.id, onDragStart])

  // Handle drag move with snapping
  const handleDragMove = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target as Konva.Group
      const { width = 800, height = 600 } = artboard.artboardProps || {}

      // Get snapped position
      const snapResult = snappingManager.snap(node.x(), node.y(), width, height)

      // Apply snapped position
      node.x(snapResult.x)
      node.y(snapResult.y)

      // Update snap guides
      if (snapResult.guides.length > 0) {
        snapSchedulerRef.current.scheduleUpdate(snapResult.guides)
      } else {
        snapSchedulerRef.current.clear()
      }
    },
    [artboard.artboardProps]
  )

  // Handle drag end
  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target as Konva.Group

      // Clear snapping state
      snappingManager.setCurrentObject(null)
      snapSchedulerRef.current.clear()
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
  const handleClick = useCallback(() => {
    onSelect?.(artboard.id)
  }, [artboard.id, onSelect])

  // Handle context menu for artboard itself
  const handleContextMenu = useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>) => {
      e.evt.preventDefault()
      e.cancelBubble = true // Stop propagation to stage handler
      onContextMenu?.(e, artboard.id)
    },
    [artboard.id, onContextMenu]
  )

  // Handle context menu for child layers
  const handleLayerContextMenu = useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>, layerId: string) => {
      onContextMenu?.(e, layerId)
    },
    [onContextMenu]
  )

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
      draggable={!locked}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      {...clipConfig}
    >
      {/* Background rectangle */}
      <Rect
        width={width}
        height={height}
        fill={backgroundColor}
        listening={true}
        onContextMenu={handleContextMenu}
      />

      {/* Active artboard indicator - selection handled by MultiTransformer */}
      {isActive && (
        <>
          {/* Active artboard border */}
          <Rect
            width={width}
            height={height}
            stroke="rgba(100, 108, 255, 0.8)"
            strokeWidth={2}
            strokeScaleEnabled={false}
            listening={false}
            fill="transparent"
            cornerRadius={4}
          />
          {/* Glow effect for active artboard */}
          {scale >= 0.5 && (
            <Rect
              width={width}
              height={height}
              stroke="transparent"
              strokeWidth={0}
              strokeScaleEnabled={false}
              listening={false}
              fill="transparent"
              cornerRadius={4}
              shadowColor="rgba(100, 108, 255, 0.5)"
              shadowBlur={scale >= 0.75 ? 20 : 10}
              shadowOpacity={0.5}
              shadowOffsetX={0}
              shadowOffsetY={0}
            />
          )}
        </>
      )}
      {/* Selected artboard glow - subtle indicator */}
      {!isActive && selectedLayerIds.has(artboard.id) && scale >= 0.5 && (
        <Rect
          width={width}
          height={height}
          stroke="transparent"
          strokeWidth={0}
          strokeScaleEnabled={false}
          listening={false}
          fill="transparent"
          cornerRadius={4}
          shadowColor="rgba(100, 108, 255, 0.4)"
          shadowBlur={10}
          shadowOpacity={0.3}
          shadowOffsetX={0}
          shadowOffsetY={0}
        />
      )}

      {/* Render child layers */}
      {children.map((child) => (
        <LayerRenderer
          key={child.id}
          layer={child}
          parentScale={scale}
          viewport={childViewport}
          onContextMenu={handleLayerContextMenu}
          onSnapGuidesChange={onSnapGuidesChange}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onLayerSelect={onLayerSelect}
        />
      ))}

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
