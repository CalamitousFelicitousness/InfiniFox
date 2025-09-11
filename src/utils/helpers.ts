/**
 * General utility helpers
 */

/**
 * Debounce function calls to limit execution frequency
 * @param func Function to debounce
 * @param wait Wait time in milliseconds
 * @returns Debounced function with cancel method
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  const debounced = function (...args: Parameters<T>) {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      func(...args)
      timeoutId = null
    }, wait)
  }

  debounced.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  return debounced
}

/**
 * Throttle function calls to limit execution rate
 * @param func Function to throttle
 * @param limit Time limit in milliseconds
 * @returns Throttled function with cancel method
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  let inThrottle = false
  let lastArgs: Parameters<T> | null = null
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  const throttled = function (...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true

      timeoutId = setTimeout(() => {
        inThrottle = false
        timeoutId = null
        if (lastArgs !== null) {
          throttled(...lastArgs)
          lastArgs = null
        }
      }, limit)
    } else {
      lastArgs = args
    }
  }

  throttled.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    inThrottle = false
    lastArgs = null
  }

  return throttled
}
