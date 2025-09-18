import { describe, it, expect, beforeEach, vi } from 'vitest'

import type { LayerNode } from '../../../types'
import { useStore } from '../../store'

// Mock image storage service
vi.mock('../../../services/storage/UnifiedImageStorageService', () => ({
  imageStorage: {
    addLayerReference: vi.fn(),
    removeLayerReference: vi.fn(),
  },
}))

describe('ArtboardOperations', () => {
  beforeEach(() => {
    // Reset store state before each test
    useStore.setState({
      layers: {},
      layerOrder: [],
      selectedLayerIds: [],
    })
  })

  describe('duplicateArtboard', () => {
    it('should duplicate artboard with all children', () => {
      const store = useStore.getState()

      // Create original artboard with children
      const originalId = 'artboard-1'
      const childId = 'layer-1'
      const nestedChildId = 'layer-2'

      store.addLayerDirect({
        id: originalId,
        type: 'artboard',
        name: 'Original Artboard',
        x: 100,
        y: 100,
        artboardProps: { width: 800, height: 600, backgroundColor: '#ffffff' },
        children: [childId],
      } as LayerNode)

      store.addLayerDirect({
        id: childId,
        type: 'group',
        name: 'Group Layer',
        parentId: originalId,
        x: 50,
        y: 50,
        children: [nestedChildId],
      } as LayerNode)

      store.addLayerDirect({
        id: nestedChildId,
        type: 'image',
        name: 'Image Layer',
        parentId: childId,
        x: 10,
        y: 10,
        imageProps: { imageId: 'img-123', width: 200, height: 150 },
      } as LayerNode)

      // Duplicate artboard
      const duplicatedId = store.duplicateArtboard(originalId)

      expect(duplicatedId).toBeDefined()
      expect(duplicatedId).not.toBe(originalId)

      const duplicated = store.getLayer(duplicatedId!)
      expect(duplicated).toBeDefined()
      expect(duplicated?.name).toBe('Original Artboard copy')
      expect(duplicated?.x).toBe(150) // Original x + 50 offset
      expect(duplicated?.y).toBe(150) // Original y + 50 offset

      // Check children were duplicated
      const duplicatedChildren = store.getLayerChildren(duplicatedId!)
      expect(duplicatedChildren.length).toBe(1)

      const duplicatedChild = duplicatedChildren[0]
      expect(duplicatedChild.type).toBe('group')
      expect(duplicatedChild.parentId).toBe(duplicatedId)

      // Check nested children
      const nestedChildren = store.getLayerChildren(duplicatedChild.id)
      expect(nestedChildren.length).toBe(1)
      expect(nestedChildren[0].type).toBe('image')
    })

    it('should handle empty artboard duplication', () => {
      const store = useStore.getState()

      const originalId = 'artboard-empty'
      store.addLayerDirect({
        id: originalId,
        type: 'artboard',
        name: 'Empty Artboard',
        x: 0,
        y: 0,
        artboardProps: { width: 400, height: 300 },
        children: [],
      } as LayerNode)

      const duplicatedId = store.duplicateArtboard(originalId)

      expect(duplicatedId).toBeDefined()
      const duplicated = store.getLayer(duplicatedId!)
      expect(duplicated?.children).toEqual([])
    })
  })

  describe('resizeArtboard', () => {
    it('should resize artboard and update clipping', () => {
      const store = useStore.getState()

      const id = 'artboard-resize'
      store.addLayerDirect({
        id,
        type: 'artboard',
        name: 'Resizable Artboard',
        x: 0,
        y: 0,
        artboardProps: { width: 800, height: 600, clipped: true },
      } as LayerNode)

      store.resizeArtboard(id, 1920, 1080)

      const artboard = store.getLayer(id)
      expect(artboard?.artboardProps?.width).toBe(1920)
      expect(artboard?.artboardProps?.height).toBe(1080)
      expect(artboard?.artboardProps?.clipped).toBe(true)
    })

    it('should handle invalid artboard ID gracefully', () => {
      const store = useStore.getState()

      // Should not throw when resizing non-existent artboard
      expect(() => {
        store.resizeArtboard('non-existent', 100, 100)
      }).not.toThrow()
    })
  })

  describe('clearArtboard', () => {
    it('should clear all children from artboard', () => {
      const store = useStore.getState()

      const artboardId = 'artboard-clear'
      const child1 = 'child-1'
      const child2 = 'child-2'
      const nestedChild = 'nested-1'

      store.addLayerDirect({
        id: artboardId,
        type: 'artboard',
        name: 'Artboard to Clear',
        artboardProps: { width: 500, height: 500 },
        children: [child1, child2],
      } as LayerNode)

      store.addLayerDirect({
        id: child1,
        type: 'image',
        parentId: artboardId,
      } as LayerNode)

      store.addLayerDirect({
        id: child2,
        type: 'group',
        parentId: artboardId,
        children: [nestedChild],
      } as LayerNode)

      store.addLayerDirect({
        id: nestedChild,
        type: 'text',
        parentId: child2,
      } as LayerNode)

      // Clear artboard
      store.clearArtboard(artboardId)

      // Artboard should exist but have no children
      const artboard = store.getLayer(artboardId)
      expect(artboard).toBeDefined()
      expect(artboard?.children).toEqual([])

      // All child layers should be deleted
      expect(store.getLayer(child1)).toBeUndefined()
      expect(store.getLayer(child2)).toBeUndefined()
      expect(store.getLayer(nestedChild)).toBeUndefined()
    })

    it('should preserve artboard properties when clearing', () => {
      const store = useStore.getState()

      const artboardId = 'artboard-preserve'
      store.addLayerDirect({
        id: artboardId,
        type: 'artboard',
        name: 'Preserved Artboard',
        x: 100,
        y: 200,
        artboardProps: {
          width: 800,
          height: 600,
          backgroundColor: '#ff0000',
          clipped: true,
        },
        children: ['temp-child'],
      } as LayerNode)

      store.addLayerDirect({
        id: 'temp-child',
        type: 'image',
        parentId: artboardId,
      } as LayerNode)

      store.clearArtboard(artboardId)

      const artboard = store.getLayer(artboardId)
      expect(artboard?.name).toBe('Preserved Artboard')
      expect(artboard?.x).toBe(100)
      expect(artboard?.y).toBe(200)
      expect(artboard?.artboardProps?.backgroundColor).toBe('#ff0000')
      expect(artboard?.artboardProps?.clipped).toBe(true)
    })
  })

  describe('setArtboardBackground', () => {
    it('should update artboard background color', () => {
      const store = useStore.getState()

      const id = 'artboard-bg'
      store.addLayerDirect({
        id,
        type: 'artboard',
        artboardProps: { width: 400, height: 300, backgroundColor: '#ffffff' },
      } as LayerNode)

      store.setArtboardBackground(id, '#ff5500')

      const artboard = store.getLayer(id)
      expect(artboard?.artboardProps?.backgroundColor).toBe('#ff5500')
    })

    it('should handle transparent background', () => {
      const store = useStore.getState()

      const id = 'artboard-transparent'
      store.addLayerDirect({
        id,
        type: 'artboard',
        artboardProps: { width: 400, height: 300 },
      } as LayerNode)

      store.setArtboardBackground(id, 'transparent')

      const artboard = store.getLayer(id)
      expect(artboard?.artboardProps?.backgroundColor).toBe('transparent')
    })
  })

  describe('moveArtboardToFront/Back', () => {
    it('should move artboard to front', () => {
      const store = useStore.getState()

      const id1 = 'artboard-front-1'
      const id2 = 'artboard-front-2'
      const id3 = 'artboard-front-3'

      store.addLayerDirect({
        id: id1,
        type: 'artboard',
        zIndex: 1,
      } as LayerNode)

      store.addLayerDirect({
        id: id2,
        type: 'artboard',
        zIndex: 2,
      } as LayerNode)

      store.addLayerDirect({
        id: id3,
        type: 'artboard',
        zIndex: 3,
      } as LayerNode)

      store.moveArtboardToFront(id1)

      const artboard = store.getLayer(id1)
      expect(artboard?.zIndex).toBeGreaterThan(3)
    })

    it('should move artboard to back', () => {
      const store = useStore.getState()

      const id1 = 'artboard-back-1'
      const id2 = 'artboard-back-2'

      store.addLayerDirect({
        id: id1,
        type: 'artboard',
        zIndex: 5,
      } as LayerNode)

      store.addLayerDirect({
        id: id2,
        type: 'artboard',
        zIndex: 10,
      } as LayerNode)

      store.moveArtboardToBack(id2)

      const artboard = store.getLayer(id2)
      expect(artboard?.zIndex).toBeLessThan(5)
    })
  })

  describe('selectArtboardChildren', () => {
    it('should select all artboard children recursively', () => {
      const store = useStore.getState()

      const artboardId = 'artboard-select'
      const child1 = 'select-child-1'
      const child2 = 'select-child-2'
      const nested1 = 'select-nested-1'
      const nested2 = 'select-nested-2'

      store.addLayerDirect({
        id: artboardId,
        type: 'artboard',
        children: [child1, child2],
      } as LayerNode)

      store.addLayerDirect({
        id: child1,
        type: 'group',
        parentId: artboardId,
        children: [nested1, nested2],
      } as LayerNode)

      store.addLayerDirect({
        id: child2,
        type: 'image',
        parentId: artboardId,
      } as LayerNode)

      store.addLayerDirect({
        id: nested1,
        type: 'text',
        parentId: child1,
      } as LayerNode)

      store.addLayerDirect({
        id: nested2,
        type: 'shape',
        parentId: child1,
      } as LayerNode)

      store.selectArtboardChildren(artboardId)

      const selectedIds = store.selectedLayerIds
      expect(selectedIds).toContain(child1)
      expect(selectedIds).toContain(child2)
      expect(selectedIds).toContain(nested1)
      expect(selectedIds).toContain(nested2)
      expect(selectedIds.length).toBe(4)
    })

    it('should handle empty artboard selection', () => {
      const store = useStore.getState()

      const artboardId = 'artboard-empty-select'
      store.addLayerDirect({
        id: artboardId,
        type: 'artboard',
        children: [],
      } as LayerNode)

      store.selectArtboardChildren(artboardId)

      expect(store.selectedLayerIds).toEqual([])
    })
  })

  describe('autoArrangeChildren', () => {
    it('should arrange children horizontally', () => {
      const store = useStore.getState()

      const artboardId = 'artboard-arrange-h'
      const child1 = 'arrange-h-1'
      const child2 = 'arrange-h-2'

      store.addLayerDirect({
        id: artboardId,
        type: 'artboard',
        children: [child1, child2],
      } as LayerNode)

      store.addLayerDirect({
        id: child1,
        type: 'shape',
        parentId: artboardId,
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      } as LayerNode)

      store.addLayerDirect({
        id: child2,
        type: 'shape',
        parentId: artboardId,
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      } as LayerNode)

      // Mock getLayerBounds
      store.getLayerBounds = vi.fn((_id) => ({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      }))

      store.autoArrangeChildren(artboardId, {
        direction: 'horizontal',
        spacing: 20,
      })

      const first = store.getLayer(child1)
      const second = store.getLayer(child2)

      expect(first?.x).toBe(20)
      expect(first?.y).toBe(20)
      expect(second?.x).toBe(140) // 20 + 100 + 20
      expect(second?.y).toBe(20)
    })

    it('should arrange children in grid layout', () => {
      const store = useStore.getState()

      const artboardId = 'artboard-grid'
      const children = ['grid-1', 'grid-2', 'grid-3', 'grid-4']

      store.addLayerDirect({
        id: artboardId,
        type: 'artboard',
        children,
      } as LayerNode)

      children.forEach((id) => {
        store.addLayerDirect({
          id,
          type: 'shape',
          parentId: artboardId,
          x: 0,
          y: 0,
          width: 100,
          height: 100,
        } as LayerNode)
      })

      store.getLayerBounds = vi.fn(() => ({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      }))

      store.autoArrangeChildren(artboardId, {
        direction: 'grid',
        spacing: 10,
        columns: 2,
      })

      // First row
      expect(store.getLayer(children[0])?.x).toBe(10)
      expect(store.getLayer(children[0])?.y).toBe(10)
      expect(store.getLayer(children[1])?.x).toBe(120)
      expect(store.getLayer(children[1])?.y).toBe(10)

      // Second row
      expect(store.getLayer(children[2])?.x).toBe(10)
      expect(store.getLayer(children[2])?.y).toBe(120)
      expect(store.getLayer(children[3])?.x).toBe(120)
      expect(store.getLayer(children[3])?.y).toBe(120)
    })
  })

  describe('fitArtboardToContents', () => {
    it('should resize artboard to fit contents with padding', () => {
      const store = useStore.getState()

      const artboardId = 'artboard-fit'
      const child1 = 'fit-child-1'
      const child2 = 'fit-child-2'

      store.addLayerDirect({
        id: artboardId,
        type: 'artboard',
        artboardProps: { width: 1000, height: 1000 },
        children: [child1, child2],
      } as LayerNode)

      store.addLayerDirect({
        id: child1,
        type: 'shape',
        parentId: artboardId,
        x: 50,
        y: 50,
      } as LayerNode)

      store.addLayerDirect({
        id: child2,
        type: 'shape',
        parentId: artboardId,
        x: 200,
        y: 150,
      } as LayerNode)

      // Mock getLayerBounds
      const boundsMap: Record<string, { x: number; y: number; width: number; height: number }> = {
        [child1]: { x: 50, y: 50, width: 100, height: 100 },
        [child2]: { x: 200, y: 150, width: 100, height: 100 },
      }

      store.getLayerBounds = vi.fn((id) => boundsMap[id])

      store.fitArtboardToContents(artboardId, 20)

      // Children should be repositioned
      const c1 = store.getLayer(child1)
      const c2 = store.getLayer(child2)
      expect(c1?.x).toBe(20) // 50 + (20 - 50)
      expect(c1?.y).toBe(20) // 50 + (20 - 50)
      expect(c2?.x).toBe(170) // 200 + (20 - 50)
      expect(c2?.y).toBe(120) // 150 + (20 - 50)

      // Artboard should be resized
      const artboard = store.getLayer(artboardId)
      expect(artboard?.artboardProps?.width).toBe(290) // (300 - 50) + 40
      expect(artboard?.artboardProps?.height).toBe(240) // (250 - 50) + 40
    })

    it('should handle empty artboard fit gracefully', () => {
      const store = useStore.getState()

      const artboardId = 'artboard-fit-empty'
      store.addLayerDirect({
        id: artboardId,
        type: 'artboard',
        artboardProps: { width: 500, height: 500 },
        children: [],
      } as LayerNode)

      store.fitArtboardToContents(artboardId)

      const artboard = store.getLayer(artboardId)
      expect(artboard?.artboardProps?.width).toBe(500)
      expect(artboard?.artboardProps?.height).toBe(500)
    })
  })

  describe('renameArtboard', () => {
    it('should update artboard name', () => {
      const store = useStore.getState()

      const id = 'artboard-rename'
      store.addLayerDirect({
        id,
        type: 'artboard',
        name: 'Original Name',
      } as LayerNode)

      store.renameArtboard(id, 'New Name')

      const artboard = store.getLayer(id)
      expect(artboard?.name).toBe('New Name')
    })

    it('should trim whitespace from name', () => {
      const store = useStore.getState()

      const id = 'artboard-trim'
      store.addLayerDirect({
        id,
        type: 'artboard',
        name: 'Original',
      } as LayerNode)

      store.renameArtboard(id, '  Trimmed Name  ')

      const artboard = store.getLayer(id)
      expect(artboard?.name).toBe('Trimmed Name')
    })
  })
})
