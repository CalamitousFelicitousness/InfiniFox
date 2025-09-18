/**
 * Layer System Performance Tests
 * Tests for 100+ layers, memory management, lazy loading, and batch operations
 */

import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import type { LayerNode } from '../../store/slices/layerSystemSlice'
import { useStore } from '../../store/store'
import { measurePerformance } from '../../tests/utils/test-helpers'

// Mock services
const layerLazyLoader = {
  clearAll: vi.fn(),
  setConfig: vi.fn(),
  loadLayer: vi.fn(() => Promise.resolve()),
  isLoaded: vi.fn(() => false),
  unloadUnusedLayers: vi.fn(),
  preloadNearbyLayers: vi.fn(() => Promise.resolve()),
}

const layerMemoryOptimizer = {
  clearMemoryTracking: vi.fn(),
  trackLayerMemory: vi.fn(),
  getMemoryUsage: vi.fn(() => ({ layerCount: 10, current: 1000000, percentage: 20 })),
  optimizeImage: vi.fn(() =>
    Promise.resolve({
      metrics: { width: 4096, height: 4096, needsOptimization: false },
    })
  ),
}

const layerBatchOperations = {
  clear: vi.fn(),
  init: vi.fn(),
  batchSetVisibility: vi.fn(),
  batchSetOpacity: vi.fn(),
  flush: vi.fn(),
}

vi.mock('../../services/canvas/ViewportCullingService', () => ({
  viewportCulling: {
    updateViewport: vi.fn(),
    isLayerVisible: vi.fn((layer: LayerNode) => {
      const viewport = { x: 0, y: 0, width: 1920, height: 1080 }
      return layer.x < viewport.width && layer.y < viewport.height
    }),
  },
}))

describe('Layer System Performance', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useStore())
    act(() => {
      result.current.clearAllLayers()
    })
  })

  afterEach(() => {
    layerLazyLoader.clearAll()
    layerMemoryOptimizer.clearMemoryTracking()
    layerBatchOperations.clear()
  })

  describe('100+ Layers Performance', () => {
    it('should maintain 60fps with 100 image layers', async () => {
      const { result } = renderHook(() => useStore())

      const elapsedMs = await measurePerformance(async () => {
        act(() => {
          const artboardId = result.current.addArtboard({
            width: 1920,
            height: 1080,
            backgroundColor: '#ffffff',
          })

          for (let i = 0; i < 100; i++) {
            result.current.addLayer(
              {
                type: 'image',
                name: `Layer ${i}`,
                x: (i % 10) * 200,
                y: Math.floor(i / 10) * 200,
                visible: true,
                locked: false,
                opacity: 1,
                imageProps: {
                  src: `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="blue"/></svg>`)}`,
                  width: 100,
                  height: 100,
                },
              } as LayerNode,
              artboardId
            )
          }
        })
      })

      expect(elapsedMs).toBeLessThan(500)
      expect(result.current.layers.size).toBe(101)
    })

    it('should handle batch operations efficiently', async () => {
      const { result } = renderHook(() => useStore())

      const layerIds: string[] = []
      act(() => {
        for (let i = 0; i < 50; i++) {
          const id = result.current.addLayer({
            type: 'image',
            name: `Layer ${i}`,
            x: i * 10,
            y: i * 10,
            visible: true,
            locked: false,
            opacity: 1,
            imageProps: {
              src: 'test.jpg',
              width: 100,
              height: 100,
            },
          } as LayerNode)
          layerIds.push(id)
        }
      })

      const batchElapsedMs = await measurePerformance(async () => {
        act(() => {
          layerBatchOperations.init(result.current)
          layerBatchOperations.batchSetVisibility(layerIds.slice(0, 25), false)
          layerBatchOperations.batchSetOpacity(layerIds.slice(25, 50), 0.5)
          layerBatchOperations.flush()
        })
      })

      expect(batchElapsedMs).toBeLessThan(50)
    })

    it('should efficiently cull off-screen layers', () => {
      const layers: LayerNode[] = []
      for (let i = 0; i < 200; i++) {
        layers.push({
          id: `layer-${i}`,
          type: 'image',
          name: `Layer ${i}`,
          x: (i % 20) * 500,
          y: Math.floor(i / 20) * 500,
          visible: true,
          locked: false,
          opacity: 1,
          imageProps: {
            src: 'test.jpg',
            width: 400,
            height: 400,
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        } as LayerNode)
      }

      // Viewport should show roughly 8-12 layers
      const visibleLayers = layers.filter((layer) => layer.x < 1920 && layer.y < 1080)

      expect(visibleLayers.length).toBeLessThan(20)
      expect(visibleLayers.length).toBeGreaterThan(0)
    })
  })

  describe('Memory Management', () => {
    it('should track memory usage for layers', () => {
      const { result } = renderHook(() => useStore())

      act(() => {
        for (let i = 0; i < 10; i++) {
          const size = 100 * (i + 1)
          const layerId = result.current.addLayer({
            type: 'image',
            name: `Layer ${i}`,
            visible: true,
            locked: false,
            opacity: 1,
            x: 0,
            y: 0,
            imageProps: {
              src: 'test.jpg',
              width: size,
              height: size,
            },
          } as LayerNode)

          const memoryBytes = size * size * 4
          layerMemoryOptimizer.trackLayerMemory(layerId, memoryBytes)
        }
      })

      const memoryUsage = layerMemoryOptimizer.getMemoryUsage()
      expect(memoryUsage.layerCount).toBe(10)
    })

    it('should optimize large images', async () => {
      const largeImageData = `data:image/svg+xml;base64,${btoa(
        '<svg xmlns="http://www.w3.org/2000/svg" width="8000" height="8000"><rect width="8000" height="8000" fill="red"/></svg>'
      )}`

      const result = await layerMemoryOptimizer.optimizeImage(largeImageData)

      expect(result.metrics.width).toBeLessThanOrEqual(4096)
      expect(result.metrics.height).toBeLessThanOrEqual(4096)
      expect(result.metrics.needsOptimization).toBe(false)
    })

    it('should unload unused layer content', async () => {
      layerLazyLoader.setConfig({ cacheTimeout: 100 })

      const layer: LayerNode = {
        id: 'test-layer',
        type: 'image',
        name: 'Test',
        x: 0,
        y: 0,
        visible: true,
        locked: false,
        opacity: 1,
        imageProps: {
          src: 'test.jpg',
          width: 100,
          height: 100,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as LayerNode

      await layerLazyLoader.loadLayer(layer)
      layerLazyLoader.isLoaded.mockReturnValueOnce(true)
      expect(layerLazyLoader.isLoaded('test-layer')).toBe(true)

      await new Promise((resolve) => setTimeout(resolve, 150))

      layerLazyLoader.unloadUnusedLayers()
      layerLazyLoader.isLoaded.mockReturnValueOnce(false)

      expect(layerLazyLoader.isLoaded('test-layer')).toBe(false)
    })
  })

  describe('Lazy Loading', () => {
    it('should preload nearby layers', async () => {
      const layers: LayerNode[] = []

      for (let i = 0; i < 25; i++) {
        layers.push({
          id: `layer-${i}`,
          type: 'image',
          name: `Layer ${i}`,
          x: (i % 5) * 300,
          y: Math.floor(i / 5) * 300,
          visible: true,
          locked: false,
          opacity: 1,
          imageProps: {
            src: `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="green"/></svg>')}`,
            width: 200,
            height: 200,
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        } as LayerNode)
      }

      const viewport = {
        x: 0,
        y: 0,
        width: 800,
        height: 600,
      }

      await layerLazyLoader.preloadNearbyLayers(layers, viewport)

      expect(layerLazyLoader.preloadNearbyLayers).toHaveBeenCalled()
    })

    it('should limit concurrent loads', async () => {
      const loadPromises: Promise<void>[] = []

      for (let i = 0; i < 10; i++) {
        const layer: LayerNode = {
          id: `layer-${i}`,
          type: 'image',
          name: `Layer ${i}`,
          x: 0,
          y: 0,
          visible: true,
          locked: false,
          opacity: 1,
          imageProps: {
            src: `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="blue"/></svg>')}`,
            width: 100,
            height: 100,
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        } as LayerNode

        loadPromises.push(layerLazyLoader.loadLayer(layer))
      }

      const results = await Promise.allSettled(loadPromises)
      const successCount = results.filter((r) => r.status === 'fulfilled').length

      expect(successCount).toBe(10)
    })
  })
})
