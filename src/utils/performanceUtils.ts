/**
 * Performance utilities for optimizing canvas operations
 */

/**
 * Throttle function execution to limit calls per frame
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false
  let lastArgs: Parameters<T> | null = null

  return function (this: unknown, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => {
        if (lastArgs) {
          func.apply(this, lastArgs)
          lastArgs = null
        }
        inThrottle = false
      }, limit)
    } else {
      lastArgs = args
    }
  }
}

/**
 * RequestAnimationFrame-based throttle for smooth 60fps updates
 */
export function rafThrottle<T extends (...args: unknown[]) => unknown>(
  func: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null
  let lastArgs: Parameters<T> | null = null

  return function (this: unknown, ...args: Parameters<T>) {
    lastArgs = args
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        if (lastArgs) {
          func.apply(this, lastArgs)
        }
        rafId = null
      })
    }
  }
}

/**
 * Debounce function execution
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function (this: unknown, ...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => {
      func.apply(this, args)
    }, wait)
  }
}

/**
 * Object pool for reusing objects and reducing GC pressure
 */
export class ObjectPool<T> {
  private pool: T[] = []
  private createFn: () => T
  private resetFn: (obj: T) => void
  private maxSize: number

  constructor(createFn: () => T, resetFn: (obj: T) => void = () => {}, maxSize: number = 100) {
    this.createFn = createFn
    this.resetFn = resetFn
    this.maxSize = maxSize
  }

  get(): T {
    return this.pool.pop() || this.createFn()
  }

  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.resetFn(obj)
      this.pool.push(obj)
    }
  }

  clear(): void {
    this.pool = []
  }

  getPoolSize(): number {
    return this.pool.length
  }
}

/**
 * Point simplification using Douglas-Peucker algorithm
 * Reduces the number of points in a line while maintaining shape
 */
export function simplifyPoints(points: number[], tolerance: number = 2): number[] {
  if (points.length <= 4) return points // Need at least 2 points (x,y pairs)

  const pointsArray: Array<[number, number]> = []
  for (let i = 0; i < points.length; i += 2) {
    pointsArray.push([points[i], points[i + 1]])
  }

  const simplified = douglasPeucker(pointsArray, tolerance)

  // Flatten back to single array
  const result: number[] = []
  for (const point of simplified) {
    result.push(point[0], point[1])
  }

  return result
}

function douglasPeucker(
  points: Array<[number, number]>,
  tolerance: number
): Array<[number, number]> {
  if (points.length <= 2) return points

  let maxDist = 0
  let maxIndex = 0

  // Find the point with maximum distance from line
  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], points[0], points[points.length - 1])
    if (dist > maxDist) {
      maxDist = dist
      maxIndex = i
    }
  }

  // If max distance is greater than tolerance, recursively simplify
  if (maxDist > tolerance) {
    const left = douglasPeucker(points.slice(0, maxIndex + 1), tolerance)
    const right = douglasPeucker(points.slice(maxIndex), tolerance)
    return [...left.slice(0, -1), ...right]
  } else {
    return [points[0], points[points.length - 1]]
  }
}

function perpendicularDistance(
  point: [number, number],
  lineStart: [number, number],
  lineEnd: [number, number]
): number {
  const dx = lineEnd[0] - lineStart[0]
  const dy = lineEnd[1] - lineStart[1]

  if (dx === 0 && dy === 0) {
    // Line start and end are the same
    const diffX = point[0] - lineStart[0]
    const diffY = point[1] - lineStart[1]
    return Math.sqrt(diffX * diffX + diffY * diffY)
  }

  const t = ((point[0] - lineStart[0]) * dx + (point[1] - lineStart[1]) * dy) / (dx * dx + dy * dy)

  const closestPoint: [number, number] =
    t < 0 ? lineStart : t > 1 ? lineEnd : [lineStart[0] + t * dx, lineStart[1] + t * dy]

  const diffX = point[0] - closestPoint[0]
  const diffY = point[1] - closestPoint[1]

  return Math.sqrt(diffX * diffX + diffY * diffY)
}

/**
 * Performance monitor for tracking FPS and frame times
 */
export class PerformanceMonitor {
  private frameCount = 0
  private lastTime = performance.now()
  private fps = 60
  private frameTime = 16.67
  private enabled = false

  start(): void {
    this.enabled = true
    this.frameCount = 0
    this.lastTime = performance.now()
    this.tick()
  }

  stop(): void {
    this.enabled = false
  }

  private tick = (): void => {
    if (!this.enabled) return

    this.frameCount++
    const currentTime = performance.now()
    const delta = currentTime - this.lastTime

    if (delta >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / delta)
      this.frameTime = delta / this.frameCount
      this.frameCount = 0
      this.lastTime = currentTime

      // Log performance metrics in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`FPS: ${this.fps}, Frame Time: ${this.frameTime.toFixed(2)}ms`)
      }
    }

    requestAnimationFrame(this.tick)
  }

  getFPS(): number {
    return this.fps
  }

  getFrameTime(): number {
    return this.frameTime
  }
}

/**
 * Get coalesced pointer events for smoother drawing
 */
export function getCoalescedEvents(event: PointerEvent): PointerEvent[] {
  // Check if getCoalescedEvents is supported
  if ('getCoalescedEvents' in event && typeof event.getCoalescedEvents === 'function') {
    return event.getCoalescedEvents()
  }
  return [event]
}

/**
 * Calculate bounding box for points to enable region-based updates
 */
export function calculateBoundingBox(points: number[]): {
  x: number
  y: number
  width: number
  height: number
} {
  if (points.length < 2) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }

  let minX = points[0]
  let minY = points[1]
  let maxX = points[0]
  let maxY = points[1]

  for (let i = 0; i < points.length; i += 2) {
    const x = points[i]
    const y = points[i + 1]

    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}
