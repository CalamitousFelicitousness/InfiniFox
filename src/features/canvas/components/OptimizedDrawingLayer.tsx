import type Konva from 'konva'
import React, { useEffect, useRef, useMemo, useCallback } from 'react'
import { Group, Line, Circle } from 'react-konva'

import { useKonvaTokens } from '../../../hooks/useKonvaTokens'
import { RegionUpdateManager } from '../../../services/drawing/RegionUpdateManager'
import { useStore } from '../../../store/store'
import type { DrawingStroke } from '../../../store/types'
import { CanvasTool } from '../hooks/useCanvasTools'

interface OptimizedDrawingLayerProps {
  // Drawing state
  drawingStrokes: DrawingStroke[]
  currentStroke: DrawingStroke | null
  drawingLayerVisible: boolean
  drawingLayerOpacity: number

  // Tool state
  currentTool: CanvasTool
  isDrawingActive: boolean

  // Cursor state
  showDrawingCursor: boolean
  cursorPos: { x: number; y: number }
  brushSize: number
  brushColor: string

  // Canvas state for optimization
  scale: number
  viewport?: { x: number; y: number; width: number; height: number }
}

/**
 * Optimized drawing layer with LOD support and region-based updates
 */
export function OptimizedDrawingLayer({
  drawingStrokes,
  currentStroke,
  drawingLayerVisible,
  drawingLayerOpacity,
  currentTool,
  isDrawingActive,
  showDrawingCursor,
  cursorPos,
  brushSize,
  brushColor,
  scale,
  viewport,
}: OptimizedDrawingLayerProps) {
  const tokens = useKonvaTokens()
  const groupRef = useRef<Konva.Group>(null)
  const regionManagerRef = useRef<RegionUpdateManager | null>(null)

  // Get optimization functions from store
  const { getStrokeForZoom, regionUpdateEnabled, lodEnabled } = useStore()

  // Initialize region update manager
  useEffect(() => {
    if (regionUpdateEnabled) {
      regionManagerRef.current = new RegionUpdateManager(
        viewport || { x: 0, y: 0, width: 4096, height: 4096 }
      )
    }

    return () => {
      regionManagerRef.current?.cancelScheduledUpdate()
      regionManagerRef.current = null
    }
  }, [regionUpdateEnabled, viewport])

  // Attach layer to region manager when available
  useEffect(() => {
    if (regionManagerRef.current && groupRef.current) {
      const layer = groupRef.current.getLayer()
      if (layer) {
        regionManagerRef.current.attachLayer(layer)
      }
    }
  }, [])

  // Only listen to events when drawing tools are active
  const isListening = currentTool === CanvasTool.BRUSH || currentTool === CanvasTool.ERASER

  /**
   * Get cursor radius based on brush size
   */
  const getCursorRadius = useCallback(() => {
    return brushSize / 2
  }, [brushSize])

  /**
   * Mark region as dirty when stroke changes
   */
  const markStrokeDirty = useCallback((stroke: DrawingStroke) => {
    if (regionManagerRef.current && stroke.boundingBox) {
      regionManagerRef.current.markDirty(stroke.boundingBox)
    }
  }, [])

  /**
   * Get optimized points for rendering based on current zoom
   */
  const getOptimizedPoints = useCallback(
    (stroke: DrawingStroke): number[] => {
      if (!lodEnabled) {
        return stroke.optimizedPoints || stroke.points
      }

      // Use LOD system to get appropriate detail level
      return getStrokeForZoom(stroke, scale)
    },
    [lodEnabled, scale, getStrokeForZoom]
  )

  /**
   * Render a single stroke with optimization
   */
  const renderStroke = useCallback(
    (stroke: DrawingStroke) => {
      // Skip strokes outside viewport if viewport culling is enabled
      if (viewport && stroke.boundingBox) {
        const { x, y, width, height } = stroke.boundingBox
        const viewRight = viewport.x + viewport.width
        const viewBottom = viewport.y + viewport.height

        // Check if stroke is outside viewport
        if (x + width < viewport.x || x > viewRight || y + height < viewport.y || y > viewBottom) {
          return null // Cull stroke
        }
      }

      // Get optimized points for current zoom level
      const points = getOptimizedPoints(stroke)

      // If we have an outline from PerfectFreehand, render as filled polygon
      if (stroke.outline && stroke.outline.length > 0) {
        // For outlines, we might want to simplify them too at low zoom levels
        let outlinePoints = stroke.outline
        if (scale < 0.5 && outlinePoints.length > 100) {
          // Simple decimation for very low zoom
          outlinePoints = outlinePoints.filter((_, i) => i % Math.ceil(1 / scale) === 0)
        }

        const flatPoints = outlinePoints.flat()
        return (
          <Line
            key={stroke.id}
            points={flatPoints}
            fill={stroke.color}
            closed={true}
            globalCompositeOperation={stroke.globalCompositeOperation}
            opacity={stroke.opacity}
            listening={false}
            perfectDrawEnabled={false} // Disable perfect pixel rendering for performance
            shadowEnabled={false} // Disable shadows for performance
          />
        )
      }

      // Fallback to regular line if no outline
      return (
        <Line
          key={stroke.id}
          points={points}
          stroke={stroke.color}
          strokeWidth={stroke.strokeWidth}
          tension={0.5}
          lineCap="round"
          lineJoin="round"
          globalCompositeOperation={stroke.globalCompositeOperation}
          opacity={stroke.opacity}
          listening={false}
          perfectDrawEnabled={false} // Disable perfect pixel rendering for performance
          shadowEnabled={false} // Disable shadows for performance
        />
      )
    },
    [viewport, scale, getOptimizedPoints]
  )

  // Memoize visible strokes
  const visibleStrokes = useMemo(() => {
    if (!viewport) return drawingStrokes

    // Filter strokes that are within the viewport
    return drawingStrokes.filter((stroke) => {
      if (!stroke.boundingBox) return true // Include if no bounds

      const { x, y, width, height } = stroke.boundingBox
      const viewRight = viewport.x + viewport.width
      const viewBottom = viewport.y + viewport.height

      return !(x + width < viewport.x || x > viewRight || y + height < viewport.y || y > viewBottom)
    })
  }, [drawingStrokes, viewport])

  // Update dirty region when current stroke changes
  useEffect(() => {
    if (currentStroke && currentStroke.boundingBox) {
      markStrokeDirty(currentStroke)
    }
  }, [currentStroke, markStrokeDirty])

  return (
    <Group
      ref={groupRef}
      listening={isListening}
      visible={drawingLayerVisible}
      opacity={drawingLayerOpacity}
    >
      {/* Render visible completed strokes */}
      {visibleStrokes.map(renderStroke)}

      {/* Render current stroke being drawn */}
      {currentStroke && renderStroke(currentStroke)}

      {/* Drawing Cursor - only show when not actively drawing */}
      {showDrawingCursor && !isDrawingActive && (
        <Circle
          x={cursorPos.x}
          y={cursorPos.y}
          radius={getCursorRadius()}
          stroke={currentTool === CanvasTool.ERASER ? tokens.colors.error : brushColor}
          strokeWidth={tokens.borders.widthThin}
          fill="transparent"
          opacity={tokens.opacity.hover}
          listening={false}
        />
      )}
    </Group>
  )
}
