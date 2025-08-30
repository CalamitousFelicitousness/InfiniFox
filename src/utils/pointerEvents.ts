/**
 * Modern pointer events utilities for cross-device compatibility
 * Supports mouse, touch, pen, and other pointing devices
 */

export interface PointerInfo {
  x: number
  y: number
  pressure: number
  tiltX: number
  tiltY: number
  type: 'mouse' | 'pen' | 'touch' | 'unknown'
  isPrimary: boolean
  pointerId: number
  width: number
  height: number
  twist: number
}

/**
 * Extract normalized pointer information from any pointer event
 */
export function getPointerInfo(event: PointerEvent): PointerInfo {
  return {
    x: event.clientX,
    y: event.clientY,
    pressure: event.pressure || 0.5, // 0.5 is default for mouse
    tiltX: event.tiltX || 0,
    tiltY: event.tiltY || 0,
    type: (event.pointerType as PointerInfo['type']) || 'unknown',
    isPrimary: event.isPrimary,
    pointerId: event.pointerId,
    width: event.width || 1,
    height: event.height || 1,
    twist: event.twist || 0,
  }
}

/**
 * Check if device supports pressure (pen/stylus)
 */
export function supportsPressure(event: PointerEvent): boolean {
  return event.pointerType === 'pen' && event.pressure !== 0.5
}

/**
 * Get brush size based on pressure for natural drawing
 */
export function getPressureAdjustedSize(
  baseSize: number,
  pressure: number,
  minScale: number = 0.3,
  maxScale: number = 1.5
): number {
  const scale = minScale + (maxScale - minScale) * pressure
  return baseSize * scale
}

/**
 * Prevent default touch behaviors (scrolling, zooming)
 */
export function preventDefaultTouch(element: HTMLElement): void {
  // Prevent scrolling
  element.style.touchAction = 'none'
  
  // Prevent context menu on long press
  element.addEventListener('contextmenu', (e) => e.preventDefault())
  
  // Prevent selection
  element.style.userSelect = 'none'
  element.style.webkitUserSelect = 'none'
}

/**
 * Check if pointer events are supported
 */
export function supportsPointerEvents(): boolean {
  return 'PointerEvent' in window
}

/**
 * Fallback for older browsers - converts touch/mouse to pointer-like
 */
export function normalizeEvent(
  event: MouseEvent | TouchEvent | PointerEvent
): Partial<PointerEvent> {
  if ('pointerId' in event) return event
  
  if ('touches' in event && event.touches.length > 0) {
    const touch = event.touches[0]
    return {
      clientX: touch.clientX,
      clientY: touch.clientY,
      pointerId: touch.identifier,
      pointerType: 'touch',
      isPrimary: true,
      pressure: touch.force || 0.5,
    } as Partial<PointerEvent>
  }
  
  return {
    clientX: (event as MouseEvent).clientX,
    clientY: (event as MouseEvent).clientY,
    pointerId: 1,
    pointerType: 'mouse',
    isPrimary: true,
    pressure: 0.5,
  } as Partial<PointerEvent>
}

/**
 * Debounce pointer events for performance
 */
export function debouncePointer(
  callback: (info: PointerInfo) => void,
  delay: number = 16 // ~60fps
): (event: PointerEvent) => void {
  let timeoutId: number | null = null
  let lastEvent: PointerEvent | null = null
  
  return (event: PointerEvent) => {
    lastEvent = event
    
    if (timeoutId === null) {
      timeoutId = window.setTimeout(() => {
        if (lastEvent) {
          callback(getPointerInfo(lastEvent))
        }
        timeoutId = null
      }, delay)
    }
  }
}
