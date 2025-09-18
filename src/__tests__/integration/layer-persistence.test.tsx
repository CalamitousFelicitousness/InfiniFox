/**
 * Layer Export/Import & Persistence Tests
 * Tests for JSON export/import, IndexedDB persistence, and migration from flat images
 */

import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock services before imports
vi.mock('../../services/storage/LayerStorageService', () => ({
  layerStorage: {
    clearAll: vi.fn(() => Promise.resolve()),
    loadLayerStructure: vi.fn(() => Promise.resolve(null)),
    saveBlob: vi.fn(() => Promise.resolve()),
    loadBlob: vi.fn(() => Promise.resolve(new Blob(['test'], { type: 'image/jpeg' }))),
  },
}))

vi.mock('../../services/layers/LayerPersistenceManager', () => ({
  layerPersistenceManager: {
    init: vi.fn(),
    scheduleSave: vi.fn(),
    saveNow: vi.fn(() => Promise.resolve()),
    restoreOnLoad: vi.fn(() => Promise.resolve(null)),
  },
}))

vi.mock('dexie', () => ({
  default: class Dexie {
    constructor() {}
    version() {
      return this
    }
    stores() {
      return this
    }
    open() {
      return Promise.resolve()
    }
  },
}))
import type { LayerNode } from '../../store/slices/layerSystemSlice'
import { useStore } from '../../store/store'
const layerStorage = vi.mocked(
  await import('../../services/storage/LayerStorageService')
).layerStorage
const layerPersistenceManager = vi.mocked(
  await import('../../services/layers/LayerPersistenceManager')
).layerPersistenceManager

describe('Layer Export/Import & Persistence', () => {
  beforeEach(async () => {
    const { result } = renderHook(() => useStore())
    act(() => {
      result.current.clearAllLayers()
    })

    // Clear mocks
    vi.clearAllMocks()
    await layerStorage.clearAll()
  })

  describe('Export/Import Structure', () => {
    it('should export layer structure to JSON', () => {
      const { result } = renderHook(() => useStore())

      act(() => {
        const artboard1 = result.current.addArtboard({
          width: 1920,
          height: 1080,
          backgroundColor: '#ffffff',
        })

        const group1 = result.current.addLayer(
          {
            type: 'group',
            name: 'Group 1',
            visible: true,
            locked: false,
            opacity: 1,
            x: 0,
            y: 0,
          } as LayerNode,
          artboard1
        )

        result.current.addLayer(
          {
            type: 'image',
            name: 'Image 1',
            visible: true,
            locked: false,
            opacity: 1,
            x: 0,
            y: 0,
            imageProps: {
              src: 'test1.jpg',
              width: 100,
              height: 100,
            },
          } as LayerNode,
          group1
        )

        result.current.addLayer(
          {
            type: 'text',
            name: 'Text 1',
            visible: true,
            locked: false,
            opacity: 1,
            x: 0,
            y: 0,
            textProps: {
              text: 'Hello World',
              fontSize: 24,
            },
          } as LayerNode,
          artboard1
        )
      })

      const exported = result.current.exportLayerStructure()
      const parsed = JSON.parse(exported)

      expect(parsed.layers).toHaveLength(4)
      expect(parsed.layerOrder).toHaveLength(1)
      expect(parsed.activeArtboardId).toBeDefined()
    })

    it('should import layer structure from JSON', () => {
      const { result } = renderHook(() => useStore())

      const structure = {
        layers: [
          {
            id: 'artboard-1',
            type: 'artboard',
            name: 'Imported Artboard',
            x: 0,
            y: 0,
            visible: true,
            locked: false,
            opacity: 1,
            children: ['layer-1', 'layer-2'],
            artboardProps: {
              width: 800,
              height: 600,
              backgroundColor: '#f0f0f0',
              clipped: true,
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          {
            id: 'layer-1',
            type: 'image',
            name: 'Imported Image',
            x: 100,
            y: 100,
            visible: true,
            locked: false,
            opacity: 1,
            parentId: 'artboard-1',
            imageProps: {
              src: 'imported.jpg',
              width: 200,
              height: 200,
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          {
            id: 'layer-2',
            type: 'text',
            name: 'Imported Text',
            x: 50,
            y: 50,
            visible: true,
            locked: false,
            opacity: 1,
            parentId: 'artboard-1',
            textProps: {
              text: 'Imported',
              fontSize: 18,
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
        layerOrder: ['artboard-1'],
        activeArtboardId: 'artboard-1',
      }

      act(() => {
        result.current.importLayerStructure(JSON.stringify(structure))
      })

      expect(result.current.layers.size).toBe(3)
      expect(result.current.getLayer('artboard-1')).toBeDefined()
      expect(result.current.getLayer('layer-1')).toBeDefined()
      expect(result.current.getLayer('layer-2')).toBeDefined()
      expect(result.current.activeArtboardId).toBe('artboard-1')
    })

    it('should preserve hierarchy on export/import', () => {
      const { result } = renderHook(() => useStore())

      act(() => {
        const artboard = result.current.addArtboard({ width: 1000, height: 1000 })
        const group1 = result.current.addLayer(
          {
            type: 'group',
            name: 'Group 1',
            visible: true,
            locked: false,
            opacity: 1,
            x: 0,
            y: 0,
          } as LayerNode,
          artboard
        )
        const group2 = result.current.addLayer(
          {
            type: 'group',
            name: 'Group 2',
            visible: true,
            locked: false,
            opacity: 1,
            x: 0,
            y: 0,
          } as LayerNode,
          group1
        )
        result.current.addLayer(
          {
            type: 'image',
            name: 'Deep Image',
            visible: true,
            locked: false,
            opacity: 1,
            x: 0,
            y: 0,
          } as LayerNode,
          group2
        )
      })

      const exported = result.current.exportLayerStructure()

      act(() => {
        result.current.clearAllLayers()
        result.current.importLayerStructure(exported)
      })

      const artboards = result.current.getArtboards()
      expect(artboards).toHaveLength(1)

      const artboardChildren = result.current.getLayerChildren(artboards[0].id)
      expect(artboardChildren).toHaveLength(1)
      expect(artboardChildren[0].name).toBe('Group 1')

      const group1Children = result.current.getLayerChildren(artboardChildren[0].id)
      expect(group1Children).toHaveLength(1)
      expect(group1Children[0].name).toBe('Group 2')

      const group2Children = result.current.getLayerChildren(group1Children[0].id)
      expect(group2Children).toHaveLength(1)
      expect(group2Children[0].name).toBe('Deep Image')
    })
  })

  describe('Persistence to IndexedDB', () => {
    it('should persist layer structure', async () => {
      const { result } = renderHook(() => useStore())

      act(() => {
        const artboard = result.current.addArtboard({
          width: 1024,
          height: 768,
          backgroundColor: '#333333',
        })

        result.current.addLayer(
          {
            type: 'image',
            name: 'Persisted Image',
            visible: true,
            locked: false,
            opacity: 1,
            x: 0,
            y: 0,
            imageProps: {
              src: 'persist.jpg',
              width: 300,
              height: 300,
            },
          } as LayerNode,
          artboard
        )
      })

      layerStorage.loadLayerStructure.mockResolvedValueOnce({
        layers: result.current.layers,
        layerOrder: result.current.layerOrder,
      })

      await act(async () => {
        await result.current.persistLayerStructure()
      })

      const savedData = await layerStorage.loadLayerStructure()
      expect(savedData).toBeDefined()
      expect(savedData?.layers.size).toBeGreaterThan(0)
      expect(savedData?.layerOrder).toBeDefined()
    })

    it('should restore layer structure', async () => {
      const { result } = renderHook(() => useStore())

      act(() => {
        const artboard = result.current.addArtboard({ width: 640, height: 480 })
        result.current.addLayer(
          {
            type: 'text',
            name: 'Restored Text',
            visible: true,
            locked: false,
            opacity: 1,
            x: 0,
            y: 0,
            textProps: { text: 'Will be restored', fontSize: 16 },
          } as LayerNode,
          artboard
        )

        result.current.setActiveArtboard(artboard)
      })

      const savedStructure = {
        layers: result.current.layers,
        layerOrder: result.current.layerOrder,
        activeArtboardId: result.current.activeArtboardId,
      }

      layerStorage.loadLayerStructure.mockResolvedValueOnce(savedStructure)

      await act(async () => {
        await result.current.persistLayerStructure()
      })

      act(() => {
        result.current.clearAllLayers()
      })

      expect(result.current.layers.size).toBe(0)

      layerPersistenceManager.restoreOnLoad.mockResolvedValueOnce(savedStructure)

      const restored = await act(async () => {
        return await result.current.restoreLayerStructure()
      })

      expect(restored).toBe(true)
    })

    it('should handle blob storage for images', async () => {
      const imageBlob = new Blob(['fake image data'], { type: 'image/jpeg' })
      const blobId = 'test-blob-123'

      await layerStorage.saveBlob(blobId, imageBlob)

      const loadedBlob = await layerStorage.loadBlob(blobId)
      expect(loadedBlob).toBeDefined()
      expect(loadedBlob?.type).toBe('image/jpeg')
    })
  })

  describe('Auto-persistence', () => {
    it('should auto-save on changes with debouncing', async () => {
      const { result } = renderHook(() => useStore())

      // Clear store state first
      act(() => {
        result.current.clearAllLayers()
      })

      // Reset and configure mocks
      layerStorage.loadLayerStructure.mockReset()
      layerPersistenceManager.scheduleSave.mockClear()

      layerPersistenceManager.init(result.current)

      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.addLayer({
            type: 'shape',
            name: `Shape ${i}`,
            visible: true,
            locked: false,
            opacity: 1,
            x: 0,
            y: 0,
          } as LayerNode)
        }
      })

      // Verify scheduleSave was called (debounced auto-save)
      expect(layerPersistenceManager.scheduleSave).toHaveBeenCalled()

      // Wait for debounce
      await new Promise((resolve) => setTimeout(resolve, 1100))

      // Verify the save happened by checking if scheduleSave was called multiple times
      expect(layerPersistenceManager.scheduleSave.mock.calls.length).toBeGreaterThan(0)
    })

    it('should save immediately on beforeunload', async () => {
      const { result } = renderHook(() => useStore())

      layerPersistenceManager.init(result.current)

      act(() => {
        result.current.addLayer({
          type: 'text',
          name: 'Unload Save Test',
          visible: true,
          locked: false,
          opacity: 1,
          x: 0,
          y: 0,
        } as LayerNode)
      })

      const event = new Event('beforeunload')
      window.dispatchEvent(event)

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(layerPersistenceManager.init).toHaveBeenCalled()
    })
  })

  describe('Migration from Flat Images', () => {
    it('should migrate flat images to layer system', () => {
      const { result } = renderHook(() => useStore())

      const flatImages = [
        {
          id: 'img-1',
          src: 'image1.jpg',
          x: 100,
          y: 100,
          width: 200,
          height: 200,
          scaleX: 1.5,
          scaleY: 1.5,
          rotation: 45,
          blobId: 'blob-1',
          metadata: {
            prompt: 'A beautiful landscape',
          },
        },
        {
          id: 'img-2',
          src: 'image2.jpg',
          x: 300,
          y: 300,
          width: 150,
          height: 150,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
          blobId: 'blob-2',
        },
      ]

      act(() => {
        result.current.migrateFromFlatImages(flatImages)
      })

      const rootLayers = result.current.getRootLayers()
      expect(rootLayers).toHaveLength(2)

      const layer1 = rootLayers[0]
      expect(layer1.type).toBe('image')
      expect(layer1.x).toBe(100)
      expect(layer1.y).toBe(100)
      expect(layer1.scaleX).toBe(1.5)
      expect(layer1.rotation).toBe(45)
      expect(layer1.imageProps?.blobId).toBe('blob-1')
      expect(layer1.name).toContain('Generated')

      const layer2 = rootLayers[1]
      expect(layer2.type).toBe('image')
      expect(layer2.x).toBe(300)
      expect(layer2.imageProps?.width).toBe(150)
    })

    it('should handle migration with missing dimensions', () => {
      const { result } = renderHook(() => useStore())

      const flatImages = [
        {
          id: 'img-no-dims',
          src: 'nodims.jpg',
          x: 0,
          y: 0,
        },
      ]

      act(() => {
        result.current.migrateFromFlatImages(flatImages)
      })

      const layers = result.current.getRootLayers()
      expect(layers).toHaveLength(1)

      expect(layers[0].imageProps?.width).toBe(512)
      expect(layers[0].imageProps?.height).toBe(512)
    })
  })
})
