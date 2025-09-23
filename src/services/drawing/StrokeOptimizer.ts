/**
 * Stroke optimization service for improving drawing performance
 * Implements Douglas-Peucker simplification and adaptive optimization
 */

export interface Point2D {
  x: number
  y: number
  pressure?: number
}

export interface OptimizationOptions {
  simplificationTolerance?: number
  maxPointsPerStroke?: number
  zoomLevel?: number
  enableAdaptive?: boolean
}

export interface PerformanceMetrics {
  originalPoints: number
  optimizedPoints: number
  simplificationTime: number
  reductionPercentage: number
}

export class StrokeOptimizer {
  private simplificationTolerance: number = 2
  private maxPointsPerStroke: number = 1000
  private zoomLevel: number = 1
  private metrics: PerformanceMetrics | null = null

  // Memory pooling for typed arrays
  private pointArrayPool: Float32Array[] = []
  private maxPoolSize: number = 10

  constructor(options: OptimizationOptions = {}) {
    this.simplificationTolerance = options.simplificationTolerance ?? 2
    this.maxPointsPerStroke = options.maxPointsPerStroke ?? 1000
    this.zoomLevel = options.zoomLevel ?? 1
  }

  /**
   * Update optimization settings
   */
  updateOptions(options: Partial<OptimizationOptions>): void {
    if (options.simplificationTolerance !== undefined) {
      this.simplificationTolerance = options.simplificationTolerance
    }
    if (options.maxPointsPerStroke !== undefined) {
      this.maxPointsPerStroke = options.maxPointsPerStroke
    }
    if (options.zoomLevel !== undefined) {
      this.zoomLevel = options.zoomLevel
    }
  }

  /**
   * Get a typed array from the pool or create a new one
   */
  private getPointArray(size: number): Float32Array {
    const pooled = this.pointArrayPool.find((arr) => arr.length >= size)
    if (pooled) {
      this.pointArrayPool = this.pointArrayPool.filter((arr) => arr !== pooled)
      return pooled.subarray(0, size)
    }
    return new Float32Array(size)
  }

  /**
   * Return a typed array to the pool
   */
  private releasePointArray(arr: Float32Array): void {
    if (this.pointArrayPool.length < this.maxPoolSize) {
      this.pointArrayPool.push(arr)
    }
  }

  /**
   * Convert flat points array to Point2D array
   */
  private flatToPoints(flat: number[]): Point2D[] {
    const points: Point2D[] = []
    for (let i = 0; i < flat.length; i += 2) {
      points.push({ x: flat[i], y: flat[i + 1] })
    }
    return points
  }

  /**
   * Convert Point2D array to flat points array
   */
  private pointsToFlat(points: Point2D[]): number[] {
    const flat: number[] = []
    for (const point of points) {
      flat.push(point.x, point.y)
    }
    return flat
  }

  /**
   * Calculate perpendicular distance from point to line
   */
  private perpendicularDistance(point: Point2D, lineStart: Point2D, lineEnd: Point2D): number {
    const dx = lineEnd.x - lineStart.x
    const dy = lineEnd.y - lineStart.y
    const denominator = Math.sqrt(dx * dx + dy * dy)

    if (denominator === 0) {
      // Line start and end are the same point
      const pdx = point.x - lineStart.x
      const pdy = point.y - lineStart.y
      return Math.sqrt(pdx * pdx + pdy * pdy)
    }

    const numerator = Math.abs(
      dy * point.x - dx * point.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x
    )

    return numerator / denominator
  }

  /**
   * Douglas-Peucker line simplification algorithm
   */
  douglasPeucker(points: Point2D[], tolerance: number): Point2D[] {
    if (points.length <= 2) {
      return points
    }

    // Find the point with the maximum distance from the line between start and end
    let maxDistance = 0
    let maxIndex = 0

    for (let i = 1; i < points.length - 1; i++) {
      const distance = this.perpendicularDistance(points[i], points[0], points[points.length - 1])
      if (distance > maxDistance) {
        maxDistance = distance
        maxIndex = i
      }
    }

    // If max distance is greater than tolerance, recursively simplify
    if (maxDistance > tolerance) {
      // Recursive simplification
      const left = this.douglasPeucker(points.slice(0, maxIndex + 1), tolerance)
      const right = this.douglasPeucker(points.slice(maxIndex), tolerance)

      // Combine results (remove duplicate point at the junction)
      return [...left.slice(0, -1), ...right]
    } else {
      // If all points are within tolerance, return just the endpoints
      return [points[0], points[points.length - 1]]
    }
  }

  /**
   * Uniform sampling to limit maximum points
   */
  uniformSample(points: Point2D[], maxPoints: number): Point2D[] {
    if (points.length <= maxPoints) {
      return points
    }

    const result: Point2D[] = []
    const step = (points.length - 1) / (maxPoints - 1)

    for (let i = 0; i < maxPoints; i++) {
      const index = Math.round(i * step)
      result.push(points[index])
    }

    return result
  }

  /**
   * Main optimization function for strokes
   */
  optimizeStroke(points: number[]): number[] {
    const startTime = performance.now()
    const originalCount = points.length / 2

    // Convert to Point2D for processing
    const pointObjects = this.flatToPoints(points)

    // Apply Douglas-Peucker simplification
    let simplified = this.douglasPeucker(pointObjects, this.simplificationTolerance)

    // Adaptive simplification based on zoom level
    if (this.zoomLevel < 0.5) {
      // More aggressive simplification when zoomed out
      simplified = this.douglasPeucker(simplified, this.simplificationTolerance * 2)
    } else if (this.zoomLevel < 0.25) {
      // Even more aggressive for very low zoom
      simplified = this.douglasPeucker(simplified, this.simplificationTolerance * 4)
    }

    // Limit maximum points if needed
    if (simplified.length > this.maxPointsPerStroke) {
      simplified = this.uniformSample(simplified, this.maxPointsPerStroke)
    }

    // Convert back to flat array
    const result = this.pointsToFlat(simplified)

    // Update metrics
    const endTime = performance.now()
    this.metrics = {
      originalPoints: originalCount,
      optimizedPoints: result.length / 2,
      simplificationTime: endTime - startTime,
      reductionPercentage: ((originalCount - result.length / 2) / originalCount) * 100,
    }

    return result
  }

  /**
   * Incremental stroke building for real-time drawing
   */
  buildStrokeIncremental(
    points: number[],
    onBatch: (batch: number[]) => void,
    batchSize: number = 50
  ): void {
    let processed = 0

    const processNextBatch = () => {
      const batchEnd = Math.min(processed + batchSize * 2, points.length)
      const batch = points.slice(processed, batchEnd)

      // Ensure we have complete points (pairs of x,y)
      const completeBatch = batch.length % 2 === 0 ? batch : batch.slice(0, -1)

      if (completeBatch.length > 0) {
        onBatch(completeBatch)
        processed = batchEnd
      }

      if (processed < points.length) {
        requestAnimationFrame(processNextBatch)
      }
    }

    requestAnimationFrame(processNextBatch)
  }

  /**
   * Get the last performance metrics
   */
  getMetrics(): PerformanceMetrics | null {
    return this.metrics
  }

  /**
   * Clear the memory pool
   */
  clearPool(): void {
    this.pointArrayPool = []
  }
}

/**
 * Level of Detail (LOD) management for strokes
 */
export interface StrokeLOD {
  zoom0_25: number[] // Ultra simplified (zoom < 0.25)
  zoom0_5: number[] // Heavily simplified (zoom < 0.5)
  zoom1: number[] // Standard (zoom < 1.5)
  zoom2: number[] // Full detail (zoom >= 1.5)
  original: number[] // Original unmodified stroke
}

export class StrokeLODManager {
  private optimizer: StrokeOptimizer

  constructor() {
    this.optimizer = new StrokeOptimizer()
  }

  /**
   * Generate all LOD levels for a stroke
   */
  generateLOD(points: number[]): StrokeLOD {
    // Generate different simplification levels
    this.optimizer.updateOptions({ simplificationTolerance: 8 })
    const zoom0_25 = this.optimizer.optimizeStroke(points)

    this.optimizer.updateOptions({ simplificationTolerance: 4 })
    const zoom0_5 = this.optimizer.optimizeStroke(points)

    this.optimizer.updateOptions({ simplificationTolerance: 2 })
    const zoom1 = this.optimizer.optimizeStroke(points)

    this.optimizer.updateOptions({ simplificationTolerance: 0.5 })
    const zoom2 = this.optimizer.optimizeStroke(points)

    return {
      zoom0_25,
      zoom0_5,
      zoom1,
      zoom2,
      original: points,
    }
  }

  /**
   * Get appropriate LOD level for current zoom
   */
  getLODForZoom(lod: StrokeLOD, zoom: number): number[] {
    if (zoom < 0.25) return lod.zoom0_25
    if (zoom < 0.5) return lod.zoom0_5
    if (zoom < 1.5) return lod.zoom1
    if (zoom < 2) return lod.zoom2
    return lod.original
  }
}
