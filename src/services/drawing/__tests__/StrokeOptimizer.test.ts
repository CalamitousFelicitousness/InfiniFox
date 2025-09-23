import { describe, it, expect, beforeEach } from 'vitest'

import { StrokeOptimizer, StrokeLODManager } from '../StrokeOptimizer'

describe('StrokeOptimizer', () => {
  let optimizer: StrokeOptimizer

  beforeEach(() => {
    optimizer = new StrokeOptimizer()
  })

  describe('Douglas-Peucker simplification', () => {
    it('should simplify a straight line to two points', () => {
      // Create a straight line with many points
      const points = []
      for (let i = 0; i <= 100; i++) {
        points.push(i, 0) // Straight horizontal line
      }

      const simplified = optimizer.optimizeStroke(points)

      // Should reduce to just start and end points
      expect(simplified).toHaveLength(4) // [0,0, 100,0]
      expect(simplified[0]).toBe(0)
      expect(simplified[1]).toBe(0)
      expect(simplified[2]).toBe(100)
      expect(simplified[3]).toBe(0)
    })

    it('should preserve important points in a complex shape', () => {
      // Create a triangle
      const points = [0, 0, 50, 100, 100, 0]

      const simplified = optimizer.optimizeStroke(points)

      // Triangle vertices should be preserved
      expect(simplified).toEqual(points)
    })

    it('should respect simplification tolerance', () => {
      // Create a slightly curved line
      const points = [0, 0, 25, 5, 50, 10, 75, 5, 100, 0]

      // With high tolerance, should simplify more aggressively
      optimizer.updateOptions({ simplificationTolerance: 20 })
      const highTolerance = optimizer.optimizeStroke(points)

      // With low tolerance, should preserve more detail
      optimizer.updateOptions({ simplificationTolerance: 1 })
      const lowTolerance = optimizer.optimizeStroke(points)

      expect(highTolerance.length).toBeLessThan(lowTolerance.length)
    })
  })

  describe('Adaptive simplification', () => {
    it('should apply more aggressive simplification at low zoom levels', () => {
      const points = []
      // Create a wavy line with more variation
      for (let i = 0; i <= 200; i++) {
        points.push(i, Math.sin(i / 5) * 20 + Math.cos(i / 3) * 10)
      }

      // Normal zoom
      optimizer.updateOptions({ zoomLevel: 1, simplificationTolerance: 2 })
      const normalZoom = optimizer.optimizeStroke(points)

      // Low zoom
      optimizer.updateOptions({ zoomLevel: 0.4, simplificationTolerance: 2 })
      const lowZoom = optimizer.optimizeStroke(points)

      // Very low zoom
      optimizer.updateOptions({ zoomLevel: 0.2, simplificationTolerance: 2 })
      const veryLowZoom = optimizer.optimizeStroke(points)

      // Should have progressively fewer points
      expect(lowZoom.length).toBeLessThanOrEqual(normalZoom.length)
      expect(veryLowZoom.length).toBeLessThanOrEqual(lowZoom.length)
      // At least some reduction should occur for very low zoom
      expect(veryLowZoom.length).toBeLessThan(points.length)
    })
  })

  describe('Point limiting', () => {
    it('should limit maximum points per stroke', () => {
      const points = []
      // Create a very complex stroke with many points
      for (let i = 0; i < 5000; i++) {
        points.push(i, Math.random() * 100)
      }

      optimizer.updateOptions({ maxPointsPerStroke: 100 })
      const limited = optimizer.optimizeStroke(points)

      // Should be limited to approximately maxPointsPerStroke * 2 values
      expect(limited.length).toBeLessThanOrEqual(200)
      expect(limited.length).toBeGreaterThan(0)
    })
  })

  describe('Performance metrics', () => {
    it('should track optimization metrics', () => {
      const points = []
      for (let i = 0; i <= 100; i++) {
        points.push(i, Math.sin(i / 10) * 10)
      }

      optimizer.optimizeStroke(points)
      const metrics = optimizer.getMetrics()

      expect(metrics).toBeDefined()
      expect(metrics?.originalPoints).toBe(101)
      expect(metrics?.optimizedPoints).toBeLessThan(101)
      expect(metrics?.reductionPercentage).toBeGreaterThan(0)
      expect(metrics?.simplificationTime).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Incremental stroke building', () => {
    it('should process stroke in batches', (done) => {
      const points = []
      for (let i = 0; i < 100; i++) {
        points.push(i, i)
      }

      let batchCount = 0
      const processedPoints: number[] = []

      optimizer.buildStrokeIncremental(
        points,
        (batch) => {
          batchCount++
          processedPoints.push(...batch)
        },
        20 // Batch size of 10 points (20 values)
      )

      // Wait for all batches to complete
      setTimeout(() => {
        expect(batchCount).toBeGreaterThan(1)
        expect(processedPoints).toEqual(points)
        done()
      }, 100)
    })
  })
})

describe('StrokeLODManager', () => {
  let lodManager: StrokeLODManager

  beforeEach(() => {
    lodManager = new StrokeLODManager()
  })

  describe('LOD generation', () => {
    it('should generate multiple LOD levels', () => {
      const points = []
      // Create a complex path with many points that can be simplified
      for (let i = 0; i <= 200; i++) {
        points.push(i, Math.sin(i / 5) * 20 + Math.cos(i / 3) * 10 + Math.random() * 2)
      }

      const lod = lodManager.generateLOD(points)

      expect(lod.original).toEqual(points)
      // Each LOD level should have different amounts of simplification
      expect(lod.zoom0_25.length).toBeLessThanOrEqual(lod.zoom0_5.length)
      expect(lod.zoom0_5.length).toBeLessThanOrEqual(lod.zoom1.length)
      expect(lod.zoom1.length).toBeLessThanOrEqual(lod.zoom2.length)
      expect(lod.zoom2.length).toBeLessThan(lod.original.length)

      // Ensure significant simplification at lowest zoom
      expect(lod.zoom0_25.length).toBeLessThan(lod.original.length / 2)
    })
  })

  describe('LOD selection', () => {
    it('should return appropriate LOD for zoom level', () => {
      const points = []
      for (let i = 0; i <= 100; i++) {
        points.push(i, Math.sin(i / 5) * 20)
      }

      const lod = lodManager.generateLOD(points)

      // Test various zoom levels
      expect(lodManager.getLODForZoom(lod, 0.1)).toBe(lod.zoom0_25)
      expect(lodManager.getLODForZoom(lod, 0.3)).toBe(lod.zoom0_5)
      expect(lodManager.getLODForZoom(lod, 0.7)).toBe(lod.zoom1)
      expect(lodManager.getLODForZoom(lod, 1.7)).toBe(lod.zoom2)
      expect(lodManager.getLODForZoom(lod, 3)).toBe(lod.original)
    })
  })
})
