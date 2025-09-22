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
  getArtboardAtPoint?: (x: number, y: number) => string | null
}

/**
 * Hook for managing the drawing system including brush services,
 * stroke management, and drawing event handlers
 */
export function useDrawingSystem({
  currentTool,
  scale,
  position,
  getArtboardAtPoint,
}: DrawingSystemProps) {
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
  const [currentArtboardId, setCurrentArtboardId] = useState<string | null>(null)

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
    const perfectFreehand = new PerfectFreehandService({
      ...preset,
      size: brushSize,
    })
    const pressureManager = new PressureManager()
    // Reduced radius and friction for more responsive drawing
    const lazyBrush = new LazyBrush({
      radius: Math.max(5, smoothing * 0.5), // Reduced from full smoothing value
      friction: 0.3, // Reduced friction for less lag
      enabled: smoothing > 0
    })

    perfectFreehandRef.current = perfectFreehand
    pressureManagerRef.current = pressureManager
    lazyBrushRef.current = lazyBrush

    pressureManager.initialize()

    return () => {
      // Clean up all services
      pressureManager.cleanup()

      // Clear refs to allow garbage collection
      perfectFreehandRef.current = null
      pressureManagerRef.current = null
      lazyBrushRef.current = null
      strokePointsRef.current = []
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
      lazyBrushRef.current.configure({
        radius: Math.max(5, smoothing * 0.5),
        friction: 0.3,
        enabled: smoothing > 0
      })
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

      // Detect which artboard we're drawing on (if any)
      const artboardId = getArtboardAtPoint ? getArtboardAtPoint(canvasX, canvasY) : null
      setCurrentArtboardId(artboardId)

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
    [
      currentTool,
      brushColor,
      brushOpacity,
      brushSize,
      startDrawingStroke,
      setDrawingActive,
      getArtboardAtPoint,
    ]
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

        // Update current stroke points immediately
        if (currentStroke) {
          const newPoints = [...currentStroke.points, smoothed.x, smoothed.y]

          // For smooth rendering, always provide the outline
          const outline = perfectFreehandRef.current
            ? perfectFreehandRef.current.generateStrokeOutline(strokePointsRef.current)
            : undefined

          updateCurrentStroke(newPoints, outline)
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

    // Generate final high-quality outline
    if (perfectFreehandRef.current) {
      const finalOutline = perfectFreehandRef.current.endStroke()
      if (finalOutline && currentStroke) {
        // Update with final outline before ending
        updateCurrentStroke(currentStroke.points, finalOutline)
      }
    }

    // Clear stroke points reference
    strokePointsRef.current = []
    endDrawingStroke(currentArtboardId)
    setDrawingActive(false)
    setCurrentArtboardId(null) // Clear artboard ID after stroke ends

    return true // Indicates drawing was ended
  }, [
    currentTool,
    isDrawingActive,
    currentStroke,
    updateCurrentStroke,
    endDrawingStroke,
    setDrawingActive,
    currentArtboardId,
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
    [screenToCanvas, handleDrawingPointerDown, currentTool]
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
    currentArtboardId,

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
