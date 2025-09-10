import Konva from 'konva'
import { useRef, useCallback, useEffect, useState } from 'react'

import { LazyBrush } from '../../../services/drawing/LazyBrush'
import {
  PerfectFreehandService,
  BRUSH_PRESETS,
} from '../../../services/drawing/PerfectFreehandService'
import { PressureManager } from '../../../services/drawing/PressureManager'
import { useStore } from '../../../store/store'

import { CanvasTool } from './useCanvasTools'

type Position = {
  x: number
  y: number
}

interface DrawingSystemProps {
  currentTool: CanvasTool
  scale: number
  position: Position
}

/**
 * Hook for managing the drawing system including brush services,
 * stroke management, and drawing event handlers
 */
export function useDrawingSystem({ currentTool, scale, position }: DrawingSystemProps) {
  const {
    // Drawing state from store
    isDrawingActive,
    brushSize,
    brushOpacity,
    brushColor,
    brushPreset,
    smoothing,
    drawingStrokes,
    currentStroke,
    drawingLayerVisible,
    drawingLayerOpacity,
    // Drawing actions from store
    setDrawingActive,
    startDrawingStroke,
    updateCurrentStroke,
    endDrawingStroke,
  } = useStore()

  // Local state
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 })
  const [showDrawingCursor, setShowDrawingCursor] = useState(false)
  const [currentPressure, setCurrentPressure] = useState(0.5)

  // Refs for drawing services
  const perfectFreehandRef = useRef<PerfectFreehandService | null>(null)
  const pressureManagerRef = useRef<PressureManager | null>(null)
  const lazyBrushRef = useRef<LazyBrush | null>(null)
  const strokePointsRef = useRef<{ x: number; y: number; pressure: number }[]>([])

  /**
   * Initialize drawing services
   */
  useEffect(() => {
    const preset = BRUSH_PRESETS[brushPreset as keyof typeof BRUSH_PRESETS] || BRUSH_PRESETS.soft
    perfectFreehandRef.current = new PerfectFreehandService({
      ...preset,
      size: brushSize,
    })
    pressureManagerRef.current = new PressureManager()
    lazyBrushRef.current = new LazyBrush({ radius: smoothing, enabled: true })

    pressureManagerRef.current.initialize()

    return () => {
      pressureManagerRef.current?.cleanup()
    }
  }, [brushPreset, brushSize, smoothing])

  /**
   * Update drawing services when settings change
   */
  useEffect(() => {
    if (perfectFreehandRef.current) {
      const preset = BRUSH_PRESETS[brushPreset as keyof typeof BRUSH_PRESETS] || BRUSH_PRESETS.soft
      perfectFreehandRef.current.setOptions({
        ...preset,
        size: brushSize,
        smoothing: smoothing / 100,
      })
    }
  }, [brushSize, brushPreset, smoothing])

  useEffect(() => {
    if (lazyBrushRef.current) {
      lazyBrushRef.current.configure({ radius: smoothing })
    }
  }, [smoothing])

  /**
   * Update cursor visibility based on tool
   */
  useEffect(() => {
    const isDrawingTool = currentTool === CanvasTool.BRUSH || currentTool === CanvasTool.ERASER
    setShowDrawingCursor(isDrawingTool)
  }, [currentTool])

  /**
   * Convert screen coordinates to canvas coordinates
   */
  const screenToCanvas = useCallback(
    (screenPoint: Position): Position => {
      return {
        x: (screenPoint.x - position.x) / scale,
        y: (screenPoint.y - position.y) / scale,
      }
    },
    [scale, position]
  )

  /**
   * Handle pointer down for drawing
   */
  const handleDrawingPointerDown = useCallback(
    (canvasX: number, canvasY: number, pressure: number = 0.5) => {
      if (currentTool !== CanvasTool.BRUSH && currentTool !== CanvasTool.ERASER) {
        return false
      }

      // Initialize lazy brush
      if (lazyBrushRef.current) {
        lazyBrushRef.current.initializePositions({ x: canvasX, y: canvasY })
      }

      setCurrentPressure(pressure)

      // Initialize stroke points
      strokePointsRef.current = [{ x: canvasX, y: canvasY, pressure }]

      if (perfectFreehandRef.current) {
        perfectFreehandRef.current.startStroke({ x: canvasX, y: canvasY, pressure })
      }

      // Start new stroke
      startDrawingStroke({
        tool: currentTool === CanvasTool.ERASER ? 'eraser' : 'brush',
        points: [canvasX, canvasY],
        color: brushColor,
        opacity: brushOpacity / 100,
        strokeWidth: brushSize,
        globalCompositeOperation:
          currentTool === CanvasTool.ERASER ? 'destination-out' : 'source-over',
      })

      setDrawingActive(true)
      return true // Indicates drawing was started
    },
    [currentTool, brushColor, brushOpacity, brushSize, startDrawingStroke, setDrawingActive]
  )

  /**
   * Handle pointer move for drawing
   */
  const handleDrawingPointerMove = useCallback(
    (canvasX: number, canvasY: number, pressure: number = 0.5) => {
      // Always update cursor position for drawing tools
      if (currentTool === CanvasTool.BRUSH || currentTool === CanvasTool.ERASER) {
        setCursorPos({ x: canvasX, y: canvasY })
      }

      // Only process drawing if active
      if (!isDrawingActive) {
        return false
      }

      if (currentTool !== CanvasTool.BRUSH && currentTool !== CanvasTool.ERASER) {
        return false
      }

      setCurrentPressure(pressure)

      if (lazyBrushRef.current) {
        lazyBrushRef.current.update({ x: canvasX, y: canvasY })
        const smoothed = lazyBrushRef.current.getBrushCoordinates()

        // Add to stroke points with pressure
        strokePointsRef.current.push({ x: smoothed.x, y: smoothed.y, pressure })

        if (perfectFreehandRef.current) {
          perfectFreehandRef.current.addPoint({ x: smoothed.x, y: smoothed.y, pressure })
        }

        // Update current stroke points and generate outline
        if (currentStroke) {
          const newPoints = [...currentStroke.points, smoothed.x, smoothed.y]

          // Generate stroke outline using PerfectFreehand with actual pressure values
          const outline =
            perfectFreehandRef.current?.generateStrokeOutline(strokePointsRef.current) || null

          updateCurrentStroke(newPoints, outline || undefined)
        }
      }

      return true // Indicates drawing was processed
    },
    [currentTool, isDrawingActive, currentStroke, updateCurrentStroke]
  )

  /**
   * Handle pointer up for drawing
   */
  const handleDrawingPointerUp = useCallback(() => {
    if (!isDrawingActive) {
      return false
    }

    if (currentTool !== CanvasTool.BRUSH && currentTool !== CanvasTool.ERASER) {
      return false
    }

    if (perfectFreehandRef.current) {
      const finalOutline = perfectFreehandRef.current.endStroke()
      if (finalOutline && currentStroke) {
        // Update with final outline before ending
        updateCurrentStroke(currentStroke.points, finalOutline)
      }
    }

    // Clear stroke points reference
    strokePointsRef.current = []
    endDrawingStroke()
    setDrawingActive(false)

    return true // Indicates drawing was ended
  }, [
    currentTool,
    isDrawingActive,
    currentStroke,
    updateCurrentStroke,
    endDrawingStroke,
    setDrawingActive,
  ])

  /**
   * Handle pointer enter for cursor visibility
   */
  const handleDrawingPointerEnter = useCallback(() => {
    if (currentTool === CanvasTool.BRUSH || currentTool === CanvasTool.ERASER) {
      setShowDrawingCursor(true)
    }
  }, [currentTool])

  /**
   * Handle pointer leave for cleanup
   */
  const handleDrawingPointerLeave = useCallback(() => {
    setShowDrawingCursor(false)

    // End any active drawing
    if (isDrawingActive) {
      handleDrawingPointerUp()
    }
  }, [isDrawingActive, handleDrawingPointerUp])

  /**
   * Process Konva pointer events
   */
  const processPointerDown = useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>) => {
      const stage = e.target.getStage()
      if (!stage) return false

      const pointer = stage.getPointerPosition()
      if (!pointer) return false

      const canvasCoords = screenToCanvas(pointer)
      const evt = e.evt as PointerEvent
      const pressure = evt && 'pressure' in evt ? evt.pressure : 0.5

      return handleDrawingPointerDown(canvasCoords.x, canvasCoords.y, pressure)
    },
    [screenToCanvas, handleDrawingPointerDown]
  )

  const processPointerMove = useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>) => {
      const stage = e.target.getStage()
      if (!stage) return false

      const pointer = stage.getPointerPosition()
      if (!pointer) return false

      const canvasCoords = screenToCanvas(pointer)
      const evt = e.evt as PointerEvent
      const pressure = evt && 'pressure' in evt ? evt.pressure : 0.5

      return handleDrawingPointerMove(canvasCoords.x, canvasCoords.y, pressure)
    },
    [screenToCanvas, handleDrawingPointerMove]
  )

  const processPointerUp = useCallback(
    (_e?: Konva.KonvaEventObject<PointerEvent>) => {
      return handleDrawingPointerUp()
    },
    [handleDrawingPointerUp]
  )

  return {
    // State
    isDrawingActive,
    drawingStrokes,
    currentStroke,
    drawingLayerVisible,
    drawingLayerOpacity,
    showDrawingCursor,
    cursorPos,
    currentPressure,
    brushSize,
    brushColor,
    brushOpacity,

    // Event handlers
    processPointerDown,
    processPointerMove,
    processPointerUp,
    handleDrawingPointerEnter,
    handleDrawingPointerLeave,

    // Utilities
    screenToCanvas,
  }
}
