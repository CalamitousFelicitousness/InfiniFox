import { useEffect, useRef, useState } from 'preact/hooks'

import { getPointerInfo, PointerInfo } from '../utils/pointerEvents'

interface DragState {
  isDragging: boolean
  startX: number
  startY: number
  currentX: number
  currentY: number
  deltaX: number
  deltaY: number
  pointerType: string
}

interface UsePointerDragOptions {
  onDragStart?: (state: DragState) => void
  onDrag?: (state: DragState) => void
  onDragEnd?: (state: DragState) => void
  disabled?: boolean
}

export function usePointerDrag(
  elementRef: RefObject<HTMLElement>,
  options: UsePointerDragOptions = {}
) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    deltaX: 0,
    deltaY: 0,
    pointerType: 'mouse',
  })

  const dragStateRef = useRef(dragState)
  dragStateRef.current = dragState

  useEffect(() => {
    const element = elementRef.current
    if (!element || options.disabled) return

    const handlePointerDown = (e: PointerEvent) => {
      const info = getPointerInfo(e)
      const newState: DragState = {
        isDragging: true,
        startX: info.x,
        startY: info.y,
        currentX: info.x,
        currentY: info.y,
        deltaX: 0,
        deltaY: 0,
        pointerType: info.type,
      }

      setDragState(newState)
      element.setPointerCapture(e.pointerId)
      options.onDragStart?.(newState)
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (!dragStateRef.current.isDragging) return

      const info = getPointerInfo(e)
      const newState: DragState = {
        ...dragStateRef.current,
        currentX: info.x,
        currentY: info.y,
        deltaX: info.x - dragStateRef.current.startX,
        deltaY: info.y - dragStateRef.current.startY,
      }

      setDragState(newState)
      options.onDrag?.(newState)
    }

    const handlePointerUp = (e: PointerEvent) => {
      if (!dragStateRef.current.isDragging) return

      element.releasePointerCapture(e.pointerId)
      const finalState = { ...dragStateRef.current, isDragging: false }
      setDragState(finalState)
      options.onDragEnd?.(finalState)
    }

    element.addEventListener('pointerdown', handlePointerDown)
    element.addEventListener('pointermove', handlePointerMove)
    element.addEventListener('pointerup', handlePointerUp)
    element.addEventListener('pointercancel', handlePointerUp)

    return () => {
      element.removeEventListener('pointerdown', handlePointerDown)
      element.removeEventListener('pointermove', handlePointerMove)
      element.removeEventListener('pointerup', handlePointerUp)
      element.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [elementRef, options.disabled])

  return dragState
}
