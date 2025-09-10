import React from 'react'
import { Layer, Line, Circle } from 'react-konva'

import { useKonvaTokens } from '../../../hooks/useKonvaTokens'
import type { DrawingStroke } from '../../../store/types'
import { CanvasTool } from '../hooks/useCanvasTools'

interface DrawingLayerProps {
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
}

/**
 * Layer component responsible for rendering drawing strokes and the drawing cursor
 * Separated from the main Canvas component for better organization and performance
 */
export function DrawingLayer({
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
}: DrawingLayerProps) {
  const tokens = useKonvaTokens()

  // Only listen to events when drawing tools are active
  const isListening = currentTool === CanvasTool.BRUSH || currentTool === CanvasTool.ERASER

  /**
   * Get cursor radius based on brush size
   */
  const getCursorRadius = () => {
    return brushSize / 2
  }

  /**
   * Render a single stroke
   */
  const renderStroke = (stroke: DrawingStroke) => {
    // If we have an outline from PerfectFreehand, render as filled polygon
    if (stroke.outline && stroke.outline.length > 0) {
      const flatPoints = stroke.outline.flat()
      return (
        <Line
          key={stroke.id}
          points={flatPoints}
          fill={stroke.color}
          closed={true}
          globalCompositeOperation={stroke.globalCompositeOperation}
          opacity={stroke.opacity}
          listening={false}
        />
      )
    }

    // Fallback to regular line if no outline
    return (
      <Line
        key={stroke.id}
        points={stroke.points}
        stroke={stroke.color}
        strokeWidth={stroke.strokeWidth}
        tension={0.5}
        lineCap="round"
        lineJoin="round"
        globalCompositeOperation={stroke.globalCompositeOperation}
        opacity={stroke.opacity}
        listening={false}
      />
    )
  }

  return (
    <Layer listening={isListening} visible={drawingLayerVisible} opacity={drawingLayerOpacity}>
      {/* Render completed strokes */}
      {drawingStrokes.map(renderStroke)}

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
    </Layer>
  )
}
