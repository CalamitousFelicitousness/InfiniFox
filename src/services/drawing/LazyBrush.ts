/**
 * LazyBrush - Smoothing and stabilization for brush strokes
 * Implements a "lazy" follower that trails behind the cursor for smoother lines
 */

export interface Point {
  x: number
  y: number
}

export interface LazyPoint extends Point {
  // Additional tracking for advanced features
  timestamp?: number
  velocity?: Point
  acceleration?: Point
}

export interface LazyBrushConfig {
  enabled: boolean // Enable/disable lazy brush
  radius: number // Minimum distance before brush follows (pixels)
  friction: number // 0 = no lag, 1 = infinite lag
  catchUp: boolean // Catch up to cursor when stroke ends
  angleThreshold?: number // Snap to straight lines at certain angles (radians)
  smoothing?: number // Additional smoothing factor
  finishStrokeDelay?: number // Delay before finishing stroke (ms)
}

export class LazyBrush {
  private config: LazyBrushConfig
  private pointer: LazyPoint // Current cursor/pointer position
  private brush: LazyPoint // Lagged brush position
  private isActive: boolean = false
  private hasMoved: boolean = false
  private angle: number = 0
  private distance: number = 0
  private velocityTracking: Point[] = []
  private maxVelocityHistory: number = 5

  // For prediction and advanced smoothing
  private lastUpdateTime: number = 0
  private catchUpAnimation: number | null = null

  constructor(config: Partial<LazyBrushConfig> = {}) {
    this.config = {
      enabled: true,
      radius: 30,
      friction: 0.5,
      catchUp: true,
      angleThreshold: undefined,
      smoothing: 0.5,
      finishStrokeDelay: 100,
      ...config,
    }

    // Initialize points at origin
    this.pointer = { x: 0, y: 0, timestamp: Date.now() }
    this.brush = { x: 0, y: 0, timestamp: Date.now() }
  }

  /**
   * Update the pointer position and calculate new brush position
   */
  update(point: Point, friction?: number): boolean {
    if (!this.config.enabled) {
      // When disabled, brush follows pointer exactly
      this.pointer = { ...point, timestamp: Date.now() }
      this.brush = { ...point, timestamp: Date.now() }
      this.hasMoved = true
      return true
    }

    const now = Date.now()
    const deltaTime = Math.min(now - this.lastUpdateTime, 100) / 1000 // Cap at 100ms
    this.lastUpdateTime = now

    // Update pointer position
    const oldPointer = { ...this.pointer }
    this.pointer = { ...point, timestamp: now }

    // Track velocity for advanced smoothing
    if (deltaTime > 0) {
      const velocity = {
        x: (this.pointer.x - oldPointer.x) / deltaTime,
        y: (this.pointer.y - oldPointer.y) / deltaTime,
      }
      this.pointer.velocity = velocity
      this.updateVelocityTracking(velocity)
    }

    // Calculate distance and angle
    const dx = this.pointer.x - this.brush.x
    const dy = this.pointer.y - this.brush.y
    this.distance = Math.sqrt(dx * dx + dy * dy)
    this.angle = Math.atan2(dy, dx)

    // Check if brush should move
    this.hasMoved = false

    if (this.distance > this.config.radius) {
      // Calculate how much to move the brush
      const moveDistance = this.distance - this.config.radius
      const effectiveFriction = friction !== undefined ? friction : this.config.friction

      // Apply friction (0 = no lag, 1 = infinite lag)
      const adjustedMoveDistance = moveDistance * (1 - effectiveFriction)

      // Check for angle snapping (useful for straight lines)
      let moveAngle = this.angle
      if (this.config.angleThreshold !== undefined) {
        moveAngle = this.snapAngle(moveAngle, this.config.angleThreshold)
      }

      // Move the brush
      const moveX = Math.cos(moveAngle) * adjustedMoveDistance
      const moveY = Math.sin(moveAngle) * adjustedMoveDistance

      // Apply additional smoothing if configured
      if (this.config.smoothing && this.config.smoothing > 0) {
        const smoothingFactor = this.config.smoothing
        this.brush.x +=
          moveX * (1 - smoothingFactor) + this.getSmoothedVelocity().x * smoothingFactor * deltaTime
        this.brush.y +=
          moveY * (1 - smoothingFactor) + this.getSmoothedVelocity().y * smoothingFactor * deltaTime
      } else {
        this.brush.x += moveX
        this.brush.y += moveY
      }

      this.brush.timestamp = now
      this.hasMoved = true
    }

    this.isActive = true
    return this.hasMoved
  }

  /**
   * Initialize both pointer and brush at the same position
   * Used when starting a new stroke
   */
  initializePositions(point: Point): void {
    const now = Date.now()
    this.pointer = { ...point, timestamp: now }
    this.brush = { ...point, timestamp: now }
    this.isActive = true
    this.hasMoved = false
    this.velocityTracking = []
    this.lastUpdateTime = now

    // Cancel any ongoing catch-up animation
    if (this.catchUpAnimation) {
      cancelAnimationFrame(this.catchUpAnimation)
      this.catchUpAnimation = null
    }
  }

  /**
   * Finish the stroke - optionally animate brush to catch up to pointer
   */
  finishStroke(callback?: () => void): void {
    if (!this.config.catchUp || !this.config.enabled) {
      this.isActive = false
      callback?.()
      return
    }

    // Animate brush to pointer position
    const animate = () => {
      const dx = this.pointer.x - this.brush.x
      const dy = this.pointer.y - this.brush.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance > 1) {
        // Move brush towards pointer
        const step = Math.min(distance * 0.2, 10) // Move 20% of distance or max 10px
        const angle = Math.atan2(dy, dx)
        this.brush.x += Math.cos(angle) * step
        this.brush.y += Math.sin(angle) * step

        // Continue animation
        this.catchUpAnimation = requestAnimationFrame(animate)
        callback?.() // Call callback on each frame for continuous updates
      } else {
        // Snap to final position
        this.brush.x = this.pointer.x
        this.brush.y = this.pointer.y
        this.isActive = false
        this.catchUpAnimation = null
        callback?.()
      }
    }

    // Start catch-up animation after delay
    if (this.config.finishStrokeDelay && this.config.finishStrokeDelay > 0) {
      setTimeout(animate, this.config.finishStrokeDelay)
    } else {
      animate()
    }
  }

  /**
   * Get the current brush coordinates
   */
  getBrushCoordinates(): Point {
    return { x: this.brush.x, y: this.brush.y }
  }

  /**
   * Get the current pointer coordinates
   */
  getPointerCoordinates(): Point {
    return { x: this.pointer.x, y: this.pointer.y }
  }

  /**
   * Get both brush and pointer as LazyPoints
   */
  getBrush(): LazyPoint {
    return { ...this.brush }
  }

  getPointer(): LazyPoint {
    return { ...this.pointer }
  }

  /**
   * Check if the brush position has moved
   */
  brushHasMoved(): boolean {
    return this.hasMoved
  }

  /**
   * Get the current distance between pointer and brush
   */
  getDistance(): number {
    return this.distance
  }

  /**
   * Get the current angle from brush to pointer
   */
  getAngle(): number {
    return this.angle
  }

  /**
   * Check if lazy brush is currently active
   */
  isEnabled(): boolean {
    return this.config.enabled
  }

  /**
   * Enable or disable lazy brush
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled

    if (!enabled && this.isActive) {
      // Snap brush to pointer when disabling
      this.brush = { ...this.pointer }
    }
  }

  /**
   * Update configuration
   */
  configure(config: Partial<LazyBrushConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get current configuration
   */
  getConfig(): LazyBrushConfig {
    return { ...this.config }
  }

  /**
   * Reset the lazy brush state
   */
  reset(): void {
    const now = Date.now()
    this.pointer = { x: 0, y: 0, timestamp: now }
    this.brush = { x: 0, y: 0, timestamp: now }
    this.isActive = false
    this.hasMoved = false
    this.angle = 0
    this.distance = 0
    this.velocityTracking = []

    if (this.catchUpAnimation) {
      cancelAnimationFrame(this.catchUpAnimation)
      this.catchUpAnimation = null
    }
  }

  /**
   * Get the visual "string" line between brush and pointer
   * Useful for rendering the lazy radius visualization
   */
  getStringLine(): { start: Point; end: Point; tension: number } | null {
    if (!this.config.enabled || this.distance <= this.config.radius) {
      return null
    }

    return {
      start: this.getBrushCoordinates(),
      end: this.getPointerCoordinates(),
      tension: Math.min(1, (this.distance - this.config.radius) / this.config.radius),
    }
  }

  /**
   * Snap angle to nearest cardinal or diagonal direction
   */
  private snapAngle(angle: number, threshold: number): number {
    const snapAngles = [
      0, // Right
      Math.PI / 4, // Down-right
      Math.PI / 2, // Down
      (3 * Math.PI) / 4, // Down-left
      Math.PI, // Left
      (-3 * Math.PI) / 4, // Up-left
      -Math.PI / 2, // Up
      -Math.PI / 4, // Up-right
    ]

    for (const snapAngle of snapAngles) {
      if (Math.abs(angle - snapAngle) < threshold) {
        return snapAngle
      }
    }

    return angle
  }

  /**
   * Track velocity for smoothing
   */
  private updateVelocityTracking(velocity: Point): void {
    this.velocityTracking.push(velocity)
    if (this.velocityTracking.length > this.maxVelocityHistory) {
      this.velocityTracking.shift()
    }
  }

  /**
   * Get averaged velocity for smoothing
   */
  private getSmoothedVelocity(): Point {
    if (this.velocityTracking.length === 0) {
      return { x: 0, y: 0 }
    }

    const sum = this.velocityTracking.reduce(
      (acc, vel) => ({ x: acc.x + vel.x, y: acc.y + vel.y }),
      { x: 0, y: 0 }
    )

    return {
      x: sum.x / this.velocityTracking.length,
      y: sum.y / this.velocityTracking.length,
    }
  }

  /**
   * Calculate the optimal lazy radius based on drawing speed
   * Higher speed = larger radius for smoother lines
   */
  getAdaptiveRadius(): number {
    if (!this.pointer.velocity) {
      return this.config.radius
    }

    const speed = Math.sqrt(this.pointer.velocity.x ** 2 + this.pointer.velocity.y ** 2)

    // Scale radius based on speed (adjust these values as needed)
    const minRadius = this.config.radius * 0.5
    const maxRadius = this.config.radius * 2
    const speedFactor = Math.min(1, speed / 1000) // Normalize speed

    return minRadius + (maxRadius - minRadius) * speedFactor
  }

  /**
   * Predict where the pointer is heading for smoother curves
   */
  getPredictedPointerPosition(lookahead: number = 100): Point {
    if (!this.pointer.velocity) {
      return this.getPointerCoordinates()
    }

    // Simple linear prediction
    return {
      x: this.pointer.x + this.pointer.velocity.x * (lookahead / 1000),
      y: this.pointer.y + this.pointer.velocity.y * (lookahead / 1000),
    }
  }
}

// Export singleton instance with default settings
export const lazyBrush = new LazyBrush({
  enabled: true,
  radius: 30,
  friction: 0.5,
  catchUp: true,
  smoothing: 0.5,
})

// Export preset configurations
export const LAZY_PRESETS = {
  off: {
    enabled: false,
  },
  light: {
    enabled: true,
    radius: 15,
    friction: 0.3,
    smoothing: 0.3,
  },
  medium: {
    enabled: true,
    radius: 30,
    friction: 0.5,
    smoothing: 0.5,
  },
  strong: {
    enabled: true,
    radius: 50,
    friction: 0.7,
    smoothing: 0.7,
  },
  precise: {
    enabled: true,
    radius: 10,
    friction: 0.2,
    smoothing: 0.2,
    angleThreshold: Math.PI / 8, // Snap to 45-degree angles
  },
  calligraphy: {
    enabled: true,
    radius: 40,
    friction: 0.6,
    smoothing: 0.8,
    catchUp: false, // Don't catch up for more natural strokes
  },
}
