/**
 * General utility helpers
 */

/**
 * Debounce function calls to limit execution frequency
 * @param func Function to debounce
 * @param wait Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return function debounced(...args: Parameters<T>) {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      func(...args)
      timeoutId = null
    }, wait)
  }
}

/**
 * Throttle function calls to limit execution rate
 * @param func Function to throttle
 * @param limit Time limit in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false
  let lastArgs: Parameters<T> | null = null

  return function throttled(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true

      setTimeout(() => {
        inThrottle = false
        if (lastArgs !== null) {
          throttled(...lastArgs)
          lastArgs = null
        }
      }, limit)
    } else {
      lastArgs = args
    }
  }
}
