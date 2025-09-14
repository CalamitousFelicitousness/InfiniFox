import Konva from 'konva'
import { useState, useCallback, useRef } from 'react'
import { useStore } from '../../../store/store'
import { CanvasTool } from './useCanvasTools'

type Position = {
  x: number
  y: number
}

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  imageId: string | null
  frameId: string | null
}

interface UseCanvasEventsProps {
  currentTool: CanvasTool
  stageRef: React.RefObject<Konva.Stage>
  scale: number
  position: Position
  isPanning: boolean

  // Handler functions from other hooks
  onDrawingPointerDown?: (e: Konva.KonvaEventObject<PointerEvent>) => boolean
  onDrawingPointerMove?: (e: Konva.KonvaEventObject<PointerEvent>) => boolean
  onDrawingPointerUp?: (e?: Konva.KonvaEventObject<PointerEvent>) => boolean
  onImageSelect?: (imageId: string | null) => void
  onFrameSelect?: (frameId: string | null) => void
  onViewportDragStart?: (e: Konva.KonvaEventObject<DragEvent>) => void
  onViewportDragMove?: (e: Konva.KonvaEventObject<DragEvent>) => void
  onViewportDragEnd?: (e: Konva.KonvaEventObject<DragEvent>) => void
}

/**
 * Hook for coordinating events between different canvas systems
 * Acts as the central event dispatcher
 */
export function useCanvasEvents({
  currentTool,
  stageRef,
  scale,
  position,
  isPanning,
  onDrawingPointerDown,
  onDrawingPointerMove,
  onDrawingPointerUp,
  onImageSelect,
  onFrameSelect,
  onViewportDragStart,
  onViewportDragMove,
  onViewportDragEnd,
}: UseCanvasEventsProps) {
  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    imageId: null,
    frameId: null,
  })

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

  // Get selection box actions from store
  const startSelectionBox = useStore((state) => state.startSelectionBox)
  const updateSelectionBox = useStore((state) => state.updateSelectionBox)
  const endSelectionBox = useStore((state) => state.endSelectionBox)
  const deselectAll = useStore((state) => state.deselectAll)
  
  // Track if we're dragging a selection box
  const [isSelectionBoxDragging, setIsSelectionBoxDragging] = useState(false)
  
  // Throttling for selection box updates
  const lastUpdateTime = useRef(0)
  const pendingUpdate = useRef<{x: number, y: number} | null>(null)
  const updateAnimationFrame = useRef<number | null>(null)

  /**
   * Main pointer down handler - routes to appropriate system
   */
  const handleStagePointerDown = useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>) => {
      const stage = stageRef.current
      if (!stage) return

      const pointer = stage.getPointerPosition()
      if (!pointer) return

      // Hide context menu on any click
      setContextMenu((prev) => ({ ...prev, visible: false }))

      // Check what was clicked
      const target = e.target
      const targetClassName = target.getClassName()
      const targetId = target.id()

      // Route based on current tool and target
      switch (currentTool) {
        case CanvasTool.BRUSH:
        case CanvasTool.ERASER: {
          // Drawing tools take priority
          if (onDrawingPointerDown) {
            const handled = onDrawingPointerDown(e)
            if (handled) return
          }
          break
        }

        case CanvasTool.SELECT: {
          // Handle selection based on what was clicked
          if (targetClassName === 'Image') {
            // Image clicked - should be handled by image's own handler
            // But just in case:
            if (onImageSelect) {
              onImageSelect(targetId)
            }
          } else if (targetId && targetId.startsWith('frame-')) {
            // Frame clicked
            const frameId = targetId.replace('frame-', '')
            if (onFrameSelect) {
              onFrameSelect(frameId)
            }
          } else if (target === stage || targetClassName === 'Layer') {
            // Clicked on empty stage/layer - start selection box
            const canvasPos = screenToCanvas(pointer)
            startSelectionBox(canvasPos.x, canvasPos.y)
            setIsSelectionBoxDragging(true)
            
            // Also deselect all if not holding ctrl
            if (!e.evt.ctrlKey && !e.evt.metaKey) {
              deselectAll()
            }
          } else {
            // Check if target is part of a transformer (handles are child shapes)
            let isTransformerElement = targetClassName === 'Transformer'
            let parent = target.getParent()
            while (parent && !isTransformerElement) {
              if (parent.getClassName() === 'Transformer') {
                isTransformerElement = true
                break
              }
              parent = parent.getParent()
            }

            // Only deselect if not clicking on transformer or its children
            if (!isTransformerElement) {
              if (!e.evt.ctrlKey && !e.evt.metaKey) {
                deselectAll()
              }
              if (onImageSelect) onImageSelect(null)
              if (onFrameSelect) onFrameSelect(null)
            }
          }
          break
        }

        case CanvasTool.PAN: {
          // Pan mode - handled by stage dragging
          break
        }
      }
    },
    [currentTool, stageRef, onDrawingPointerDown, onImageSelect, onFrameSelect, startSelectionBox, deselectAll, screenToCanvas]
  )

  /**
   * Throttled selection box update
   */
  const throttledUpdateSelectionBox = useCallback((x: number, y: number) => {
    const now = Date.now()
    const timeSinceLastUpdate = now - lastUpdateTime.current
    
    // Update immediately if enough time has passed (16ms for ~60fps)
    if (timeSinceLastUpdate >= 16) {
      updateSelectionBox(x, y)
      lastUpdateTime.current = now
      pendingUpdate.current = null
    } else {
      // Store pending update and schedule it
      pendingUpdate.current = { x, y }
      
      if (updateAnimationFrame.current === null) {
        updateAnimationFrame.current = requestAnimationFrame(() => {
          if (pendingUpdate.current) {
            updateSelectionBox(pendingUpdate.current.x, pendingUpdate.current.y)
            lastUpdateTime.current = Date.now()
            pendingUpdate.current = null
          }
          updateAnimationFrame.current = null
        })
      }
    }
  }, [updateSelectionBox])

  /**
   * Main pointer move handler
   */
  const handleStagePointerMove = useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>) => {
      // Handle selection box dragging
      if (isSelectionBoxDragging && currentTool === CanvasTool.SELECT) {
        const stage = stageRef.current
        if (!stage) return
        
        const pointer = stage.getPointerPosition()
        if (!pointer) return
        
        const canvasPos = screenToCanvas(pointer)
        throttledUpdateSelectionBox(canvasPos.x, canvasPos.y)
        return
      }
      
      // Route to drawing system if applicable
      if (
        (currentTool === CanvasTool.BRUSH || currentTool === CanvasTool.ERASER) &&
        onDrawingPointerMove
      ) {
        onDrawingPointerMove(e)
      }
    },
    [currentTool, onDrawingPointerMove, isSelectionBoxDragging, stageRef, screenToCanvas, throttledUpdateSelectionBox]
  )

  /**
   * Main pointer up handler
   */
  const handleStagePointerUp = useCallback(
    (e?: Konva.KonvaEventObject<PointerEvent>) => {
      // End selection box if dragging
      if (isSelectionBoxDragging) {
        // Cancel any pending throttled updates
        if (updateAnimationFrame.current !== null) {
          cancelAnimationFrame(updateAnimationFrame.current)
          updateAnimationFrame.current = null
        }
        pendingUpdate.current = null
        lastUpdateTime.current = 0
        
        endSelectionBox()
        setIsSelectionBoxDragging(false)
        return
      }
      
      // Route to drawing system if applicable
      if (
        (currentTool === CanvasTool.BRUSH || currentTool === CanvasTool.ERASER) &&
        onDrawingPointerUp
      ) {
        onDrawingPointerUp(e)
      }
    },
    [currentTool, onDrawingPointerUp, isSelectionBoxDragging, endSelectionBox]
  )

  /**
   * Handle context menu (right-click)
   */
  const handleContextMenu = useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>) => {
      e.evt.preventDefault()

      // Don't show context menu in certain modes
      if (currentTool === CanvasTool.BRUSH || currentTool === CanvasTool.ERASER || isPanning) {
        return
      }

      const stage = stageRef.current
      if (!stage) return

      const pointer = stage.getPointerPosition()
      if (!pointer) return

      // Determine what was right-clicked
      const target = e.target
      const targetClassName = target.getClassName()
      const targetId = target.id()

      let imageId: string | null = null
      let frameId: string | null = null

      if (targetClassName === 'Image') {
        imageId = targetId
      } else if (targetId && targetId.startsWith('frame-')) {
        frameId = targetId.replace('frame-', '')
      }

      // Show context menu
      setContextMenu({
        visible: true,
        x: pointer.x,
        y: pointer.y,
        imageId,
        frameId,
      })

      // Store position for potential actions
      const canvasPos = screenToCanvas(pointer)
      return canvasPos
    },
    [currentTool, isPanning, stageRef, screenToCanvas]
  )

  /**
   * Handle stage drag events
   */
  const handleStageDragStart = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      if (onViewportDragStart) {
        onViewportDragStart(e)
      }
    },
    [onViewportDragStart]
  )

  const handleStageDragMove = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      if (onViewportDragMove) {
        onViewportDragMove(e)
      }
    },
    [onViewportDragMove]
  )

  const handleStageDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      if (onViewportDragEnd) {
        onViewportDragEnd(e)
      }
    },
    [onViewportDragEnd]
  )

  /**
   * Handle pointer enter/leave for cursor management
   */
  const handleStagePointerEnter = useCallback((_e: Konva.KonvaEventObject<PointerEvent>) => {
    // Could be used for cursor visibility
  }, [])

  const handleStagePointerLeave = useCallback(
    (_e: Konva.KonvaEventObject<PointerEvent>) => {
      // End any active operations when pointer leaves
      if (onDrawingPointerUp) {
        onDrawingPointerUp()
      }
    },
    [onDrawingPointerUp]
  )

  /**
   * Hide context menu
   */
  const hideContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, visible: false }))
  }, [])

  /**
   * Update context menu position
   */
  const updateContextMenuPosition = useCallback((x: number, y: number) => {
    setContextMenu((prev) => ({ ...prev, x, y }))
  }, [])

  /**
   * Get stage event handlers object
   */
  const getStageEventHandlers = useCallback(() => {
    return {
      onPointerDown: handleStagePointerDown,
      onPointerMove: handleStagePointerMove,
      onPointerUp: handleStagePointerUp,
      onPointerCancel: handleStagePointerUp,
      onPointerEnter: handleStagePointerEnter,
      onPointerLeave: handleStagePointerLeave,
      onContextMenu: handleContextMenu,
      onDragStart: handleStageDragStart,
      onDragMove: handleStageDragMove,
      onDragEnd: handleStageDragEnd,
    }
  }, [
    handleStagePointerDown,
    handleStagePointerMove,
    handleStagePointerUp,
    handleStagePointerEnter,
    handleStagePointerLeave,
    handleContextMenu,
    handleStageDragStart,
    handleStageDragMove,
    handleStageDragEnd,
  ])

  return {
    // Context menu state
    contextMenu,
    setContextMenu,
    hideContextMenu,
    updateContextMenuPosition,

    // Event handlers
    handleStagePointerDown,
    handleStagePointerMove,
    handleStagePointerUp,
    handleStagePointerEnter,
    handleStagePointerLeave,
    handleContextMenu,
    handleStageDragStart,
    handleStageDragMove,
    handleStageDragEnd,

    // Utility
    getStageEventHandlers,
    screenToCanvas,
  }
}
