import Konva from 'konva'
import { useState, useRef, useCallback, useEffect } from 'react'

import { useStore } from '../../../store/store'
import { debounce } from '../../../utils/helpers'

export type Position = {
  x: number
  y: number
}

export type ViewportState = {
  scale: number
  position: Position
}

/**
 * Hook for managing canvas viewport (zoom, pan, position)
 * Handles viewport transformations, persistence, and coordinate conversions
 */
export function useViewport(stageRef: React.RefObject<Konva.Stage>) {
  const { canvasViewport, updateCanvasViewport } = useStore()

  // Viewport state
  const [scale, setScale] = useState(canvasViewport.scale)
  const [position, setPosition] = useState(canvasViewport.position)
  const [isPanning, setIsPanning] = useState(false)

  // Create debounced viewport update to prevent excessive localStorage writes
  const debouncedUpdateViewport = useRef(
    debounce((scale: number, position: Position) => {
      updateCanvasViewport(scale, position)
    }, 250) // Debounce for 250ms
  ).current

  // Cancel debounced calls on unmount
  useEffect(() => {
    return () => {
      debouncedUpdateViewport.cancel()
    }
  }, [debouncedUpdateViewport])

  /**
   * Set initial stage position and scale
   */
  useEffect(() => {
    if (stageRef.current) {
      stageRef.current.position(position)
      stageRef.current.scale({ x: scale, y: scale })
    }
  }, [stageRef, position, scale]) // Set initial viewport

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
   * Convert canvas coordinates to screen coordinates
   */
  const canvasToScreen = useCallback(
    (canvasPoint: Position): Position => {
      return {
        x: canvasPoint.x * scale + position.x,
        y: canvasPoint.y * scale + position.y,
      }
    },
    [scale, position]
  )

  /**
   * Handle wheel event for zoom and scroll
   */
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault()

      const stage = stageRef.current
      if (!stage) return

      // Handle Shift+wheel for horizontal scrolling
      if (e.evt.shiftKey) {
        const stagePos = stage.position()
        const scrollSpeed = 50
        const deltaX = e.evt.deltaY > 0 ? -scrollSpeed : scrollSpeed

        const newPos = {
          x: stagePos.x + deltaX,
          y: stagePos.y,
        }

        stage.position(newPos)
        stage.batchDraw()
        setPosition(newPos)
        debouncedUpdateViewport(stage.scaleX(), newPos)
        return
      }

      // Handle Ctrl+wheel for vertical scrolling
      if (e.evt.ctrlKey) {
        const stagePos = stage.position()
        const scrollSpeed = 50
        const deltaY = e.evt.deltaY > 0 ? -scrollSpeed : scrollSpeed

        const newPos = {
          x: stagePos.x,
          y: stagePos.y + deltaY,
        }

        stage.position(newPos)
        stage.batchDraw()
        setPosition(newPos)
        debouncedUpdateViewport(stage.scaleX(), newPos)
        return
      }

      // Normal zoom - get current scale from stage
      const oldScale = stage.scaleX()
      const pointer = stage.getPointerPosition()
      if (!pointer) return

      // Get current position from stage
      const stagePos = stage.position()

      const mousePointTo = {
        x: (pointer.x - stagePos.x) / oldScale,
        y: (pointer.y - stagePos.y) / oldScale,
      }

      const direction = e.evt.deltaY > 0 ? -1 : 1
      const newScale = direction > 0 ? oldScale * 1.1 : oldScale / 1.1
      const clampedScale = Math.max(0.05, Math.min(10, newScale))

      // Calculate new position
      const newPos = {
        x: pointer.x - mousePointTo.x * clampedScale,
        y: pointer.y - mousePointTo.y * clampedScale,
      }

      // Update stage directly
      stage.scale({ x: clampedScale, y: clampedScale })
      stage.position(newPos)
      stage.batchDraw()

      // Update state
      setScale(clampedScale)
      setPosition(newPos)

      // Save viewport to persistent storage (debounced)
      debouncedUpdateViewport(clampedScale, newPos)
    },
    [debouncedUpdateViewport, stageRef]
  )

  /**
   * Zoom in by a fixed factor
   */
  const zoomIn = useCallback(() => {
    const newScale = scale * 1.2
    const clampedScale = Math.max(0.05, Math.min(10, newScale))
    setScale(clampedScale)

    if (stageRef.current) {
      stageRef.current.scale({ x: clampedScale, y: clampedScale })
      stageRef.current.batchDraw()
    }

    updateCanvasViewport(clampedScale, position)
  }, [scale, position, stageRef, updateCanvasViewport])

  /**
   * Zoom out by a fixed factor
   */
  const zoomOut = useCallback(() => {
    const newScale = scale / 1.2
    const clampedScale = Math.max(0.05, Math.min(10, newScale))
    setScale(clampedScale)

    if (stageRef.current) {
      stageRef.current.scale({ x: clampedScale, y: clampedScale })
      stageRef.current.batchDraw()
    }

    updateCanvasViewport(clampedScale, position)
  }, [scale, position, stageRef, updateCanvasViewport])

  /**
   * Reset viewport to default position and scale
   */
  const resetViewport = useCallback(() => {
    setScale(1)
    setPosition({ x: 0, y: 0 })

    if (stageRef.current) {
      stageRef.current.position({ x: 0, y: 0 })
      stageRef.current.scale({ x: 1, y: 1 })
      stageRef.current.batchDraw()
    }

    updateCanvasViewport(1, { x: 0, y: 0 })
  }, [stageRef, updateCanvasViewport])

  /**
   * Handle viewport change from external source (e.g., minimap)
   */
  const handleViewportChange = useCallback(
    (x: number, y: number, newScale: number) => {
      if (stageRef.current) {
        setPosition({ x, y })
        setScale(newScale)
        stageRef.current.position({ x, y })
        stageRef.current.scale({ x: newScale, y: newScale })
        stageRef.current.batchDraw()
        updateCanvasViewport(newScale, { x, y })
      }
    },
    [stageRef, updateCanvasViewport]
  )

  /**
   * Handle stage drag events for panning
   */
  const handleStageDragStart = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    // Only handle stage dragging
    if (e.target === e.target.getStage()) {
      setIsPanning(true)
    }
  }, [])

  const handleStageDragMove = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    // Update position state for minimap during drag
    if (e.target === e.target.getStage()) {
      const stage = e.target
      setPosition({
        x: stage.x(),
        y: stage.y(),
      })
    }
  }, [])

  const handleStageDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      // Only update position if we're dragging the stage itself
      if (e.target === e.target.getStage()) {
        const newPos = {
          x: e.target.x(),
          y: e.target.y(),
        }
        setPosition(newPos)
        setIsPanning(false)
        updateCanvasViewport(scale, newPos)
      }
    },
    [scale, updateCanvasViewport]
  )

  /**
   * Center viewport on a specific point
   */
  const centerOnPoint = useCallback(
    (canvasPoint: Position) => {
      if (!stageRef.current) return

      const stage = stageRef.current
      const stageWidth = stage.width()
      const stageHeight = stage.height()

      const newPos = {
        x: stageWidth / 2 - canvasPoint.x * scale,
        y: stageHeight / 2 - canvasPoint.y * scale,
      }

      setPosition(newPos)
      stage.position(newPos)
      stage.batchDraw()
      updateCanvasViewport(scale, newPos)
    },
    [scale, stageRef, updateCanvasViewport]
  )

  /**
   * Fit all content in viewport
   */
  const fitToContent = useCallback(
    (contentBounds: { minX: number; minY: number; maxX: number; maxY: number }) => {
      if (!stageRef.current) return

      const stage = stageRef.current
      const stageWidth = stage.width()
      const stageHeight = stage.height()

      const contentWidth = contentBounds.maxX - contentBounds.minX
      const contentHeight = contentBounds.maxY - contentBounds.minY

      // Calculate scale to fit content with padding
      const padding = 50
      const scaleX = (stageWidth - padding * 2) / contentWidth
      const scaleY = (stageHeight - padding * 2) / contentHeight
      const newScale = Math.min(scaleX, scaleY, 1) // Don't zoom in beyond 100%

      // Calculate position to center content
      const contentCenterX = (contentBounds.minX + contentBounds.maxX) / 2
      const contentCenterY = (contentBounds.minY + contentBounds.maxY) / 2

      const newPos = {
        x: stageWidth / 2 - contentCenterX * newScale,
        y: stageHeight / 2 - contentCenterY * newScale,
      }

      setScale(newScale)
      setPosition(newPos)
      stage.scale({ x: newScale, y: newScale })
      stage.position(newPos)
      stage.batchDraw()
      updateCanvasViewport(newScale, newPos)
    },
    [stageRef, updateCanvasViewport]
  )

  return {
    // State
    scale,
    position,
    isPanning,

    // Methods
    screenToCanvas,
    canvasToScreen,
    handleWheel,
    zoomIn,
    zoomOut,
    resetViewport,
    handleViewportChange,
    centerOnPoint,
    fitToContent,

    // Drag handlers
    handleStageDragStart,
    handleStageDragMove,
    handleStageDragEnd,

    // Utility function to set viewport directly
    setViewport: (x: number, y: number, newScale: number) => {
      handleViewportChange(x, y, newScale)
    },
  }
}
