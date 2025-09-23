/**
 * Region-based update manager for optimizing canvas redraws
 * Tracks dirty regions and performs efficient partial updates
 */

import type Konva from 'konva'

export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export interface UpdateMetrics {
  regionsUpdated: number
  totalArea: number
  mergeOperations: number
  updateTime: number
}

/**
 * Spatial indexing structure for efficient region queries
 */
export class QuadTree {
  private boundary: BoundingBox
  private capacity: number = 4
  private items: Set<any> = new Set()
  private divided: boolean = false
  private northeast?: QuadTree
  private northwest?: QuadTree
  private southeast?: QuadTree
  private southwest?: QuadTree

  constructor(boundary: BoundingBox, capacity: number = 4) {
    this.boundary = boundary
    this.capacity = capacity
  }

  /**
   * Insert an item with its bounding box
   */
  insert(item: any, bounds: BoundingBox): boolean {
    // Check if item is within this quadrant
    if (!this.intersects(bounds)) {
      return false
    }

    // If capacity not reached and not subdivided, add here
    if (this.items.size < this.capacity && !this.divided) {
      this.items.add({ item, bounds })
      return true
    }

    // Subdivide if needed
    if (!this.divided) {
      this.subdivide()
    }

    // Try to insert into children
    if (this.northeast?.insert(item, bounds)) return true
    if (this.northwest?.insert(item, bounds)) return true
    if (this.southeast?.insert(item, bounds)) return true
    if (this.southwest?.insert(item, bounds)) return true

    // If doesn't fit in children (spans multiple), store here
    this.items.add({ item, bounds })
    return true
  }

  /**
   * Query items within a region
   */
  query(range: BoundingBox, found: any[] = []): any[] {
    if (!this.intersects(range)) {
      return found
    }

    // Check items at this level
    for (const entry of this.items) {
      if (this.boundsIntersect(entry.bounds, range)) {
        found.push(entry.item)
      }
    }

    // Check children
    if (this.divided) {
      this.northeast?.query(range, found)
      this.northwest?.query(range, found)
      this.southeast?.query(range, found)
      this.southwest?.query(range, found)
    }

    return found
  }

  /**
   * Subdivide this quadrant into four children
   */
  private subdivide(): void {
    const x = this.boundary.x
    const y = this.boundary.y
    const w = this.boundary.width / 2
    const h = this.boundary.height / 2

    this.northeast = new QuadTree({ x: x + w, y: y, width: w, height: h }, this.capacity)
    this.northwest = new QuadTree({ x: x, y: y, width: w, height: h }, this.capacity)
    this.southeast = new QuadTree({ x: x + w, y: y + h, width: w, height: h }, this.capacity)
    this.southwest = new QuadTree({ x: x, y: y + h, width: w, height: h }, this.capacity)

    this.divided = true
  }

  /**
   * Check if a bounding box intersects with this quadrant
   */
  private intersects(bounds: BoundingBox): boolean {
    return this.boundsIntersect(this.boundary, bounds)
  }

  /**
   * Check if two bounding boxes intersect
   */
  private boundsIntersect(a: BoundingBox, b: BoundingBox): boolean {
    return !(
      a.x + a.width < b.x ||
      b.x + b.width < a.x ||
      a.y + a.height < b.y ||
      b.y + b.height < a.y
    )
  }

  /**
   * Clear all items
   */
  clear(): void {
    this.items.clear()
    this.divided = false
    this.northeast = undefined
    this.northwest = undefined
    this.southeast = undefined
    this.southwest = undefined
  }
}

/**
 * Manages dirty regions and optimizes canvas updates
 */
export class RegionUpdateManager {
  private dirtyRegions: Set<BoundingBox> = new Set()
  private updateTimer: number | null = null
  private layer?: Konva.Layer
  private metrics: UpdateMetrics | null = null
  private spatialIndex?: QuadTree
  private canvasBounds: BoundingBox

  constructor(canvasBounds: BoundingBox = { x: 0, y: 0, width: 4096, height: 4096 }) {
    this.canvasBounds = canvasBounds
    this.spatialIndex = new QuadTree(canvasBounds)
  }

  /**
   * Attach a Konva layer to this manager
   */
  attachLayer(layer: Konva.Layer): void {
    this.layer = layer
  }

  /**
   * Mark a region as dirty (needs redraw)
   */
  markDirty(region: BoundingBox): void {
    // Clamp region to canvas bounds
    const clamped = this.clampToCanvas(region)
    if (clamped.width <= 0 || clamped.height <= 0) {
      return // Region is completely outside canvas
    }

    // Add to dirty regions
    this.dirtyRegions.add(clamped)
    this.scheduleUpdate()
  }

  /**
   * Mark multiple regions as dirty
   */
  markMultipleDirty(regions: BoundingBox[]): void {
    for (const region of regions) {
      const clamped = this.clampToCanvas(region)
      if (clamped.width > 0 && clamped.height > 0) {
        this.dirtyRegions.add(clamped)
      }
    }
    this.scheduleUpdate()
  }

  /**
   * Clamp a region to canvas bounds
   */
  private clampToCanvas(region: BoundingBox): BoundingBox {
    const x = Math.max(this.canvasBounds.x, region.x)
    const y = Math.max(this.canvasBounds.y, region.y)
    const right = Math.min(this.canvasBounds.x + this.canvasBounds.width, region.x + region.width)
    const bottom = Math.min(
      this.canvasBounds.y + this.canvasBounds.height,
      region.y + region.height
    )

    return {
      x,
      y,
      width: Math.max(0, right - x),
      height: Math.max(0, bottom - y),
    }
  }

  /**
   * Schedule an update using requestAnimationFrame
   */
  private scheduleUpdate(): void {
    if (this.updateTimer !== null) return

    this.updateTimer = requestAnimationFrame(() => {
      this.performRegionUpdate()
      this.updateTimer = null
    })
  }

  /**
   * Cancel any scheduled updates
   */
  cancelScheduledUpdate(): void {
    if (this.updateTimer !== null) {
      cancelAnimationFrame(this.updateTimer)
      this.updateTimer = null
    }
  }

  /**
   * Perform the actual region update
   */
  private performRegionUpdate(): void {
    if (this.dirtyRegions.size === 0) return

    const startTime = performance.now()

    // Merge overlapping regions for efficiency
    const merged = this.mergeRegions(Array.from(this.dirtyRegions))

    // Calculate total area
    let totalArea = 0
    for (const region of merged) {
      totalArea += region.width * region.height
    }

    // Perform updates
    if (this.layer) {
      for (const region of merged) {
        this.clipAndDraw(region)
      }
    }

    // Update metrics
    const endTime = performance.now()
    this.metrics = {
      regionsUpdated: merged.length,
      totalArea,
      mergeOperations: this.dirtyRegions.size - merged.length,
      updateTime: endTime - startTime,
    }

    // Clear dirty regions
    this.dirtyRegions.clear()
  }

  /**
   * Merge overlapping or adjacent regions
   */
  private mergeRegions(regions: BoundingBox[]): BoundingBox[] {
    if (regions.length <= 1) return regions

    const merged: BoundingBox[] = []
    const processed = new Set<number>()

    for (let i = 0; i < regions.length; i++) {
      if (processed.has(i)) continue

      let current = { ...regions[i] }
      let didMerge = true

      // Keep merging until no more merges possible
      while (didMerge) {
        didMerge = false

        for (let j = 0; j < regions.length; j++) {
          if (i === j || processed.has(j)) continue

          const other = regions[j]

          // Check if regions overlap or are adjacent (with small tolerance)
          const tolerance = 5 // pixels
          if (this.shouldMerge(current, other, tolerance)) {
            // Merge regions
            const minX = Math.min(current.x, other.x)
            const minY = Math.min(current.y, other.y)
            const maxX = Math.max(current.x + current.width, other.x + other.width)
            const maxY = Math.max(current.y + current.height, other.y + other.height)

            current = {
              x: minX,
              y: minY,
              width: maxX - minX,
              height: maxY - minY,
            }

            processed.add(j)
            didMerge = true
          }
        }
      }

      merged.push(current)
      processed.add(i)
    }

    return merged
  }

  /**
   * Check if two regions should be merged
   */
  private shouldMerge(a: BoundingBox, b: BoundingBox, tolerance: number = 0): boolean {
    // Expand regions by tolerance for adjacency check
    const expandedA = {
      x: a.x - tolerance,
      y: a.y - tolerance,
      width: a.width + tolerance * 2,
      height: a.height + tolerance * 2,
    }

    // Check if expanded region A intersects with B
    return !(
      expandedA.x + expandedA.width < b.x ||
      b.x + b.width < expandedA.x ||
      expandedA.y + expandedA.height < b.y ||
      b.y + b.height < expandedA.y
    )
  }

  /**
   * Clip and draw a specific region
   */
  private clipAndDraw(region: BoundingBox): void {
    if (!this.layer) return

    // Save current clip
    const oldClip = this.layer.getClip()

    try {
      // Set new clip region
      this.layer.clip({
        x: region.x,
        y: region.y,
        width: region.width,
        height: region.height,
      })

      // Perform batched draw for this region
      this.layer.batchDraw()
    } finally {
      // Restore original clip
      if (oldClip) {
        this.layer.clip(oldClip)
      } else {
        this.layer.clip(undefined as any)
      }
    }
  }

  /**
   * Force immediate update of all dirty regions
   */
  forceUpdate(): void {
    this.cancelScheduledUpdate()
    this.performRegionUpdate()
  }

  /**
   * Clear all dirty regions without updating
   */
  clearDirtyRegions(): void {
    this.dirtyRegions.clear()
    this.cancelScheduledUpdate()
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): UpdateMetrics | null {
    return this.metrics
  }

  /**
   * Get affected layers for a region using spatial index
   */
  getAffectedLayers(region: BoundingBox): any[] {
    if (!this.spatialIndex) return []
    return this.spatialIndex.query(region)
  }

  /**
   * Register a layer with its bounds in the spatial index
   */
  registerLayer(layer: any, bounds: BoundingBox): void {
    this.spatialIndex?.insert(layer, bounds)
  }

  /**
   * Clear and rebuild the spatial index
   */
  rebuildSpatialIndex(): void {
    this.spatialIndex?.clear()
  }

  /**
   * Update canvas bounds
   */
  updateCanvasBounds(bounds: BoundingBox): void {
    this.canvasBounds = bounds
    this.spatialIndex = new QuadTree(bounds)
  }
}
