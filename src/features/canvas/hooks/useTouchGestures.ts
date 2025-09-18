import Konva from 'konva'
import { useEffect, useRef, useCallback } from 'react'

import { useStore } from '../../../store/store'

interface TouchPoint {
  x: number
  y: number
  id: number
}

interface GestureState {
  isPinching: boolean
  isLongPress: boolean
  lastDistance: number
  lastCenter: { x: number; y: number } | null
  longPressTimer: NodeJS.Timeout | null
  activeTouches: Map<number, TouchPoint>
}

export const useTouchGestures = (stageRef: React.RefObject<Konva.Stage>) => {
  const gestureState = useRef<GestureState>({
    isPinching: false,
    isLongPress: false,
    lastDistance: 0,
    lastCenter: null,
    longPressTimer: null,
    activeTouches: new Map(),
  })

  const {
    selectedIds,
    selectItem,
    toggleSelection,
    startSelectionBox,
    updateSelectionBox,
    endSelectionBox,
    transformSelectedImages,
    moveSelectedImages,
  } = useStore()

  // Calculate distance between two touch points
  const getDistance = useCallback((p1: TouchPoint, p2: TouchPoint): number => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
  }, [])

  // Calculate center point between two touches
  const getCenter = useCallback((p1: TouchPoint, p2: TouchPoint): { x: number; y: number } => {
    return {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
    }
  }, [])

  // Handle long press for selection mode
  const handleLongPress = useCallback(
    (_point: TouchPoint) => {
      const stage = stageRef.current
      if (!stage) return

      const pos = stage.getPointerPosition()
      if (!pos) return

      // Find shape at position
      const shape = stage.getIntersection(pos)
      if (shape) {
        const id = shape.id()
        if (id) {
          // Enter multi-selection mode
          toggleSelection(id)
          gestureState.current.isLongPress = true

          // Haptic feedback (if available)
          if ('vibrate' in navigator) {
            navigator.vibrate(50)
          }
        }
      }
    },
    [stageRef, toggleSelection]
  )

  // Handle touch start
  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      const stage = stageRef.current
      if (!stage) return

      e.preventDefault()
      const touches = e.touches

      // Update active touches
      gestureState.current.activeTouches.clear()
      for (let i = 0; i < touches.length; i++) {
        const touch = touches[i]
        gestureState.current.activeTouches.set(touch.identifier, {
          x: touch.clientX,
          y: touch.clientY,
          id: touch.identifier,
        })
      }

      // Single touch - start long press timer
      if (touches.length === 1) {
        const touch = touches[0]
        const point = { x: touch.clientX, y: touch.clientY, id: touch.identifier }

        // Clear any existing timer
        if (gestureState.current.longPressTimer) {
          clearTimeout(gestureState.current.longPressTimer)
        }

        // Start long press detection (500ms)
        gestureState.current.longPressTimer = setTimeout(() => {
          handleLongPress(point)
        }, 500)

        // Start selection box if on empty canvas
        const pos = stage.getPointerPosition()
        if (pos) {
          const shape = stage.getIntersection(pos)
          if (!shape) {
            startSelectionBox(pos.x, pos.y)
          }
        }
      }
      // Multi-touch - cancel long press and prepare for pinch
      else if (touches.length === 2) {
        if (gestureState.current.longPressTimer) {
          clearTimeout(gestureState.current.longPressTimer)
          gestureState.current.longPressTimer = null
        }

        const touch1 = { x: touches[0].clientX, y: touches[0].clientY, id: touches[0].identifier }
        const touch2 = { x: touches[1].clientX, y: touches[1].clientY, id: touches[1].identifier }

        gestureState.current.lastDistance = getDistance(touch1, touch2)
        gestureState.current.lastCenter = getCenter(touch1, touch2)
        gestureState.current.isPinching = true
      }
    },
    [stageRef, startSelectionBox, handleLongPress, getDistance, getCenter]
  )

  // Handle touch move
  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      const stage = stageRef.current
      if (!stage) return

      e.preventDefault()
      const touches = e.touches

      // Cancel long press on movement
      if (gestureState.current.longPressTimer) {
        clearTimeout(gestureState.current.longPressTimer)
        gestureState.current.longPressTimer = null
      }

      // Single touch movement
      if (touches.length === 1 && !gestureState.current.isPinching) {
        const pos = stage.getPointerPosition()

        if (pos) {
          // Update selection box if active
          updateSelectionBox(pos.x, pos.y)
        }
      }
      // Pinch gesture for scaling/rotating
      else if (touches.length === 2 && gestureState.current.isPinching) {
        const touch1 = { x: touches[0].clientX, y: touches[0].clientY, id: touches[0].identifier }
        const touch2 = { x: touches[1].clientX, y: touches[1].clientY, id: touches[1].identifier }

        const newDistance = getDistance(touch1, touch2)
        const newCenter = getCenter(touch1, touch2)

        if (gestureState.current.lastDistance && gestureState.current.lastCenter) {
          // Calculate scale
          const scale = newDistance / gestureState.current.lastDistance

          // Calculate translation
          const deltaX = newCenter.x - gestureState.current.lastCenter.x
          const deltaY = newCenter.y - gestureState.current.lastCenter.y

          // Apply transformation to selected items
          if (selectedIds.size > 0) {
            // Move selected items
            if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
              moveSelectedImages(deltaX, deltaY)
            }

            // Scale selected items
            if (Math.abs(scale - 1) > 0.01) {
              transformSelectedImages({
                scaleX: scale,
                scaleY: scale,
              })
            }
          }
        }

        gestureState.current.lastDistance = newDistance
        gestureState.current.lastCenter = newCenter
      }
    },
    [
      stageRef,
      selectedIds,
      updateSelectionBox,
      moveSelectedImages,
      transformSelectedImages,
      getDistance,
      getCenter,
    ]
  )

  // Handle touch end
  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      e.preventDefault()

      // Clear long press timer
      if (gestureState.current.longPressTimer) {
        clearTimeout(gestureState.current.longPressTimer)
        gestureState.current.longPressTimer = null
      }

      // End selection box
      endSelectionBox()

      // Reset pinch state
      if (e.touches.length < 2) {
        gestureState.current.isPinching = false
        gestureState.current.lastDistance = 0
        gestureState.current.lastCenter = null
      }

      // Update active touches
      gestureState.current.activeTouches.clear()
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i]
        gestureState.current.activeTouches.set(touch.identifier, {
          x: touch.clientX,
          y: touch.clientY,
          id: touch.identifier,
        })
      }

      // Reset long press state
      if (e.touches.length === 0) {
        gestureState.current.isLongPress = false
      }
    },
    [endSelectionBox]
  )

  // Handle tap (for selection)
  const handleTap = useCallback(
    (e: Konva.KonvaEventObject<TouchEvent>) => {
      if (gestureState.current.isLongPress) {
        // Already handled by long press
        return
      }

      const stage = stageRef.current
      if (!stage) return

      const target = e.target
      const id = target.id()

      if (id && id !== 'stage') {
        // Check for multi-select modifier (two-finger tap)
        const touches = e.evt.touches
        if (touches && touches.length === 2) {
          toggleSelection(id)
        } else {
          selectItem(id)
        }
      }
    },
    [stageRef, selectItem, toggleSelection]
  )

  // Setup event listeners
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    const container = stage.container()

    // Enable Konva touch events
    Konva.hitOnDragEnabled = true
    Konva.captureTouchEventsEnabled = true

    // Add native touch event listeners
    container.addEventListener('touchstart', handleTouchStart, { passive: false })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd, { passive: false })

    // Add Konva tap event
    stage.on('tap', handleTap)

    // Store timer ref for cleanup
    const gestures = gestureState.current

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
      stage.off('tap', handleTap)

      // Clear any pending timers
      if (gestures.longPressTimer) {
        clearTimeout(gestures.longPressTimer)
      }
    }
  }, [stageRef, handleTouchStart, handleTouchMove, handleTouchEnd, handleTap])

  return {
    isPinching: gestureState.current.isPinching,
    isLongPress: gestureState.current.isLongPress,
    activeTouches: gestureState.current.activeTouches.size,
  }
}
