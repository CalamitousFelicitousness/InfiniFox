import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

import { RegionUpdateManager, QuadTree, type BoundingBox } from '../RegionUpdateManager'

// Mock Konva Layer
class MockLayer {
  private currentClip: BoundingBox | undefined
  private batchDrawCalled = false

  getClip() {
    return this.currentClip
  }

  clip(region?: BoundingBox) {
    this.currentClip = region
  }

  batchDraw() {
    this.batchDrawCalled = true
  }

  wasBatchDrawCalled() {
    return this.batchDrawCalled
  }

  resetBatchDrawFlag() {
    this.batchDrawCalled = false
  }
}

describe('QuadTree', () => {
  let quadTree: QuadTree

  beforeEach(() => {
    quadTree = new QuadTree({ x: 0, y: 0, width: 100, height: 100 })
  })

  it('should insert and query items within bounds', () => {
    const item1 = { id: 1 }
    const item2 = { id: 2 }
    const item3 = { id: 3 }

    quadTree.insert(item1, { x: 10, y: 10, width: 20, height: 20 })
    quadTree.insert(item2, { x: 60, y: 60, width: 20, height: 20 })
    quadTree.insert(item3, { x: 10, y: 60, width: 20, height: 20 })

    // Query a region that includes item1
    const results1 = quadTree.query({ x: 0, y: 0, width: 40, height: 40 })
    expect(results1).toContain(item1)
    expect(results1).not.toContain(item2)

    // Query a region that includes all items
    const resultsAll = quadTree.query({ x: 0, y: 0, width: 100, height: 100 })
    expect(resultsAll).toContain(item1)
    expect(resultsAll).toContain(item2)
    expect(resultsAll).toContain(item3)
  })

  it('should handle items spanning multiple quadrants', () => {
    const largeItem = { id: 'large' }
    quadTree.insert(largeItem, { x: 30, y: 30, width: 40, height: 40 })

    // Query different regions that overlap with the large item
    const topLeft = quadTree.query({ x: 0, y: 0, width: 50, height: 50 })
    const bottomRight = quadTree.query({ x: 50, y: 50, width: 50, height: 50 })

    expect(topLeft).toContain(largeItem)
    expect(bottomRight).toContain(largeItem)
  })

  it('should clear all items', () => {
    const item = { id: 1 }
    quadTree.insert(item, { x: 10, y: 10, width: 10, height: 10 })

    const beforeClear = quadTree.query({ x: 0, y: 0, width: 100, height: 100 })
    expect(beforeClear).toHaveLength(1)

    quadTree.clear()

    const afterClear = quadTree.query({ x: 0, y: 0, width: 100, height: 100 })
    expect(afterClear).toHaveLength(0)
  })
})

describe('RegionUpdateManager', () => {
  let manager: RegionUpdateManager
  let mockLayer: MockLayer

  beforeEach(() => {
    manager = new RegionUpdateManager({ x: 0, y: 0, width: 1000, height: 1000 })
    mockLayer = new MockLayer() as any
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Dirty region tracking', () => {
    it('should mark regions as dirty', () => {
      manager.markDirty({ x: 10, y: 10, width: 100, height: 100 })
      manager.markDirty({ x: 200, y: 200, width: 100, height: 100 })

      // Should schedule an update
      expect(vi.getTimerCount()).toBe(1)
    })

    it('should clamp regions to canvas bounds', () => {
      // Mark a region that extends outside canvas bounds
      manager.markDirty({ x: -50, y: -50, width: 200, height: 200 })

      // Update should still be scheduled
      expect(vi.getTimerCount()).toBe(1)
    })

    it('should ignore regions completely outside canvas', () => {
      manager.markDirty({ x: 2000, y: 2000, width: 100, height: 100 })

      // No update should be scheduled
      expect(vi.getTimerCount()).toBe(0)
    })
  })

  describe('Region merging', () => {
    it('should merge overlapping regions', () => {
      manager.attachLayer(mockLayer as any)

      // Add two overlapping regions
      manager.markDirty({ x: 10, y: 10, width: 100, height: 100 })
      manager.markDirty({ x: 50, y: 50, width: 100, height: 100 })

      // Force update
      manager.forceUpdate()

      const metrics = manager.getMetrics()
      expect(metrics?.regionsUpdated).toBe(1) // Should be merged into one
      expect(metrics?.mergeOperations).toBe(1)
    })

    it('should merge adjacent regions within tolerance', () => {
      manager.attachLayer(mockLayer as any)

      // Add two adjacent regions (with small gap)
      manager.markDirty({ x: 10, y: 10, width: 100, height: 100 })
      manager.markDirty({ x: 112, y: 10, width: 100, height: 100 })

      // Force update
      manager.forceUpdate()

      const metrics = manager.getMetrics()
      expect(metrics?.regionsUpdated).toBe(1) // Should be merged due to tolerance
    })

    it('should not merge distant regions', () => {
      manager.attachLayer(mockLayer as any)

      // Add two distant regions
      manager.markDirty({ x: 10, y: 10, width: 100, height: 100 })
      manager.markDirty({ x: 500, y: 500, width: 100, height: 100 })

      // Force update
      manager.forceUpdate()

      const metrics = manager.getMetrics()
      expect(metrics?.regionsUpdated).toBe(2) // Should remain separate
      expect(metrics?.mergeOperations).toBe(0)
    })
  })

  describe('Update scheduling', () => {
    it('should batch multiple dirty region calls', () => {
      manager.markDirty({ x: 10, y: 10, width: 100, height: 100 })
      manager.markDirty({ x: 200, y: 200, width: 100, height: 100 })
      manager.markDirty({ x: 300, y: 300, width: 100, height: 100 })

      // Should only schedule one update
      expect(vi.getTimerCount()).toBe(1)
    })

    it('should cancel scheduled updates', () => {
      manager.markDirty({ x: 10, y: 10, width: 100, height: 100 })

      expect(vi.getTimerCount()).toBe(1)

      manager.cancelScheduledUpdate()

      expect(vi.getTimerCount()).toBe(0)
    })

    it('should clear dirty regions without updating', () => {
      manager.markDirty({ x: 10, y: 10, width: 100, height: 100 })
      manager.clearDirtyRegions()

      // Run the scheduled timer
      vi.runAllTimers()

      // No metrics should be generated
      expect(manager.getMetrics()).toBeNull()
    })
  })

  describe('Layer interaction', () => {
    it('should perform clipped draws on attached layer', () => {
      manager.attachLayer(mockLayer as any)
      manager.markDirty({ x: 10, y: 10, width: 100, height: 100 })

      // Force immediate update
      manager.forceUpdate()

      // Layer should have been drawn
      expect(mockLayer.wasBatchDrawCalled()).toBe(true)
    })
  })

  describe('Performance metrics', () => {
    it('should track update metrics', () => {
      manager.attachLayer(mockLayer as any)

      manager.markDirty({ x: 10, y: 10, width: 100, height: 100 })
      manager.markDirty({ x: 200, y: 200, width: 50, height: 50 })

      manager.forceUpdate()

      const metrics = manager.getMetrics()
      expect(metrics).toBeDefined()
      expect(metrics?.regionsUpdated).toBe(2)
      expect(metrics?.totalArea).toBe(100 * 100 + 50 * 50)
      expect(metrics?.updateTime).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Spatial indexing', () => {
    it('should register and query layers', () => {
      const layer1 = { id: 'layer1' }
      const layer2 = { id: 'layer2' }

      manager.registerLayer(layer1, { x: 10, y: 10, width: 100, height: 100 })
      manager.registerLayer(layer2, { x: 200, y: 200, width: 100, height: 100 })

      const affected1 = manager.getAffectedLayers({ x: 0, y: 0, width: 150, height: 150 })
      expect(affected1).toContain(layer1)
      expect(affected1).not.toContain(layer2)

      const affectedAll = manager.getAffectedLayers({ x: 0, y: 0, width: 500, height: 500 })
      expect(affectedAll).toContain(layer1)
      expect(affectedAll).toContain(layer2)
    })

    it('should rebuild spatial index', () => {
      const layer = { id: 'layer' }
      manager.registerLayer(layer, { x: 10, y: 10, width: 100, height: 100 })

      const beforeRebuild = manager.getAffectedLayers({ x: 0, y: 0, width: 200, height: 200 })
      expect(beforeRebuild).toContain(layer)

      manager.rebuildSpatialIndex()

      const afterRebuild = manager.getAffectedLayers({ x: 0, y: 0, width: 200, height: 200 })
      expect(afterRebuild).toHaveLength(0)
    })
  })
})
