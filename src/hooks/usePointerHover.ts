import { useEffect, useState } from 'preact/hooks'

interface UsePointerHoverOptions {
  disabled?: boolean
  delay?: number // Delay before considering it a hover (useful for touch)
}

export function usePointerHover(
  elementRef: RefObject<HTMLElement>,
  options: UsePointerHoverOptions = {}
) {
  const [isHovered, setIsHovered] = useState(false)
  const [pointerType, setPointerType] = useState<string>('mouse')

  useEffect(() => {
    const element = elementRef.current
    if (!element || options.disabled) return

    let hoverTimeout: number | null = null

    const handlePointerEnter = (e: PointerEvent) => {
      setPointerType(e.pointerType)
      
      // For touch, add a small delay to distinguish from scrolling
      if (e.pointerType === 'touch' && options.delay) {
        hoverTimeout = window.setTimeout(() => {
          setIsHovered(true)
        }, options.delay)
      } else {
        setIsHovered(true)
      }
    }

    const handlePointerLeave = () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout)
        hoverTimeout = null
      }
      setIsHovered(false)
    }

    const handlePointerCancel = () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout)
        hoverTimeout = null
      }
      setIsHovered(false)
    }

    element.addEventListener('pointerenter', handlePointerEnter)
    element.addEventListener('pointerleave', handlePointerLeave)
    element.addEventListener('pointercancel', handlePointerCancel)

    return () => {
      element.removeEventListener('pointerenter', handlePointerEnter)
      element.removeEventListener('pointerleave', handlePointerLeave)
      element.removeEventListener('pointercancel', handlePointerCancel)
    }
  }, [elementRef, options.disabled, options.delay])

  return { isHovered, pointerType }
}
