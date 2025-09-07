import { useEffect, useRef } from 'preact/hooks'

/**
 * VALID TOUCH EVENT EXCEPTION:
 * This hook uses touch events instead of pointer events because pinch-to-zoom
 * requires tracking multiple simultaneous touch points for gesture recognition.
 * The Pointer Events API doesn't provide a direct way to handle multi-touch
 * gestures like pinch, so touch events are necessary here.
 *
 * This is an intentional exception to our pointer-events-only approach and
 * does not conflict with the pointer events used elsewhere in the application.
 */
interface PinchZoomOptions {
  minScale?: number
  maxScale?: number
  onZoom?: (scale: number, centerX: number, centerY: number) => void
  disabled?: boolean
}

export function usePinchZoom(elementRef: RefObject<HTMLElement>, options: PinchZoomOptions = {}) {
  const { minScale = 0.1, maxScale = 5, onZoom, disabled = false } = options

  const touchesRef = useRef<Map<number, Touch>>(new Map())
  const lastDistanceRef = useRef<number>(0)
  const currentScaleRef = useRef<number>(1)

  useEffect(() => {
    const element = elementRef.current
    if (!element || disabled) return

    const getDistance = (touches: TouchList): number => {
      if (touches.length < 2) return 0
      const dx = touches[0].clientX - touches[1].clientX
      const dy = touches[0].clientY - touches[1].clientY
      return Math.sqrt(dx * dx + dy * dy)
    }

    const getCenter = (touches: TouchList): { x: number; y: number } => {
      if (touches.length < 2) return { x: 0, y: 0 }
      return {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2,
      }
    }

    const handleTouchStart = (e: TouchEvent) => {
      // NOTE: Using touch events here for multi-touch gesture detection
      // Store all touches
      touchesRef.current.clear()
      Array.from(e.touches).forEach((touch) => {
        touchesRef.current.set(touch.identifier, touch)
      })

      if (e.touches.length === 2) {
        lastDistanceRef.current = getDistance(e.touches)
        e.preventDefault() // Prevent default zoom
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      // NOTE: Touch events needed to track multiple touch points simultaneously
      if (e.touches.length === 2) {
        e.preventDefault()

        const currentDistance = getDistance(e.touches)
        const center = getCenter(e.touches)

        if (lastDistanceRef.current > 0) {
          const scale = currentDistance / lastDistanceRef.current
          const newScale = Math.max(minScale, Math.min(maxScale, currentScaleRef.current * scale))

          if (newScale !== currentScaleRef.current) {
            currentScaleRef.current = newScale
            onZoom?.(newScale, center.x, center.y)
          }
        }

        lastDistanceRef.current = currentDistance
      }
    }

    const handleTouchEnd = (_e: TouchEvent) => {
      touchesRef.current.clear()
      lastDistanceRef.current = 0
    }

    // Touch event listeners are required here for multi-touch gesture support
    // Pointer events cannot track multiple simultaneous touch points needed for pinch-to-zoom
    element.addEventListener('touchstart', handleTouchStart, { passive: false })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd)

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [elementRef, minScale, maxScale, onZoom, disabled])

  return currentScaleRef.current
}
