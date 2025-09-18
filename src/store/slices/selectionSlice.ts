import type {
  SliceCreator,
  SelectionBox,
  SelectionBounds,
  SelectionGroup,
  SelectionModifier,
  SelectionMode,
} from '../types'

import type { LayerSystemSlice } from './layerSystemSlice'

// Type for combined store state
type StoreState = SelectionSlice &
  LayerSystemSlice & {
    images: Array<{
      id: string
      x: number
      y: number
      width?: number
      height?: number
      scaleX?: number
      scaleY?: number
      selected?: boolean
    }>
  }

export interface SelectionSlice {
  // State
  selectedIds: Set<string>
  selectionBox: SelectionBox | null
  lastSelectedId: string | null
  selectionMode: SelectionMode
  selectionGroup: SelectionGroup | null
  useLayerSystem: boolean // Flag to determine selection behavior

  // Core Selection Actions
  selectItem: (id: string, modifier?: SelectionModifier) => void
  selectItems: (ids: string[]) => void
  deselectItem: (id: string) => void
  deselectAll: () => void
  toggleSelection: (id: string) => void
  selectRange: (fromId: string, toId: string) => void
  selectAll: () => void

  // Selection Box Actions
  startSelectionBox: (x: number, y: number) => void
  updateSelectionBox: (x: number, y: number) => void
  endSelectionBox: () => void

  // Group Operations
  createSelectionGroup: () => string
  dissolveSelectionGroup: () => void

  // Utility Actions
  isSelected: (id: string) => boolean
  getSelectedCount: () => number
  getSelectionBounds: () => SelectionBounds | null
  getSelectedIds: () => string[]
  setUseLayerSystem: (useLayerSystem: boolean) => void
}

export const createSelectionSlice: SliceCreator<SelectionSlice> = (set, get) => ({
  // Initial state
  selectedIds: new Set<string>(),
  selectionBox: null,
  lastSelectedId: null,
  selectionMode: 'single',
  selectionGroup: null,
  useLayerSystem: true, // Enable layer system by default

  // Core Selection Actions
  selectItem: (id: string, modifier: SelectionModifier = 'none') => {
    const state = get() as StoreState

    // Use layer system selection if enabled
    if (state.useLayerSystem && state.selectLayer) {
      state.selectLayer(id, modifier === 'ctrl' || modifier === 'ctrl-shift')
      return
    }
    set((state) => {
      const newSelectedIds = new Set(state.selectedIds)

      // Handle different modifiers
      switch (modifier) {
        case 'ctrl':
        case 'ctrl-shift':
          // Toggle selection
          if (newSelectedIds.has(id)) {
            newSelectedIds.delete(id)
          } else {
            newSelectedIds.add(id)
          }
          break

        case 'shift':
          // Range selection
          if (state.lastSelectedId) {
            const images = state.images
            const startIndex = images.findIndex((img) => img.id === state.lastSelectedId)
            const endIndex = images.findIndex((img) => img.id === id)

            if (startIndex !== -1 && endIndex !== -1) {
              const start = Math.min(startIndex, endIndex)
              const end = Math.max(startIndex, endIndex)

              for (let i = start; i <= end; i++) {
                newSelectedIds.add(images[i].id)
              }
            }
          } else {
            // No last selected, just select this one
            newSelectedIds.clear()
            newSelectedIds.add(id)
          }
          break

        case 'none':
        default:
          // Single selection - clear others
          newSelectedIds.clear()
          newSelectedIds.add(id)
          break
      }

      // Update selected state on images
      const images = state.images
      const updatedImages = images.map((img) => ({
        ...img,
        selected: newSelectedIds.has(img.id),
      }))

      return {
        selectedIds: newSelectedIds,
        lastSelectedId: id,
        selectionMode: newSelectedIds.size > 1 ? 'multi' : 'single',
        images: updatedImages,
      }
    })
  },

  selectItems: (ids: string[]) => {
    const state = get() as StoreState

    // Use layer system selection if enabled
    if (state.useLayerSystem && state.selectLayers) {
      state.selectLayers(ids)
      return
    }

    set((state) => {
      const newSelectedIds = new Set(ids)

      // Update selected state on images
      const images = state.images
      const updatedImages = images.map((img) => ({
        ...img,
        selected: newSelectedIds.has(img.id),
      }))

      return {
        selectedIds: newSelectedIds,
        lastSelectedId: ids[ids.length - 1] || null,
        selectionMode: newSelectedIds.size > 1 ? 'multi' : 'single',
        images: updatedImages,
      }
    })
  },

  deselectItem: (id: string) => {
    const state = get() as StoreState

    // Use layer system deselection if enabled
    if (state.useLayerSystem && state.deselectLayer) {
      state.deselectLayer(id)
      return
    }

    set((state) => {
      const newSelectedIds = new Set(state.selectedIds)
      newSelectedIds.delete(id)

      // Update selected state on images
      const images = state.images
      const updatedImages = images.map((img) => ({
        ...img,
        selected: newSelectedIds.has(img.id),
      }))

      return {
        selectedIds: newSelectedIds,
        selectionMode: newSelectedIds.size > 1 ? 'multi' : 'single',
        images: updatedImages,
      }
    })
  },

  deselectAll: () => {
    const state = get() as StoreState

    // Use layer system deselection if enabled
    if (state.useLayerSystem && state.deselectAllLayers) {
      state.deselectAllLayers()
      return
    }

    set((state) => {
      // Update selected state on images
      const images = state.images
      const updatedImages = images.map((img) => ({
        ...img,
        selected: false,
      }))

      return {
        selectedIds: new Set<string>(),
        lastSelectedId: null,
        selectionMode: 'single',
        selectionGroup: null,
        images: updatedImages,
      }
    })
  },

  toggleSelection: (id: string) => {
    const { selectedIds } = get()
    if (selectedIds.has(id)) {
      get().deselectItem(id)
    } else {
      get().selectItem(id, 'ctrl')
    }
  },

  selectRange: (fromId: string, toId: string) => {
    set((state) => {
      const images = (state as StoreState).images
      const startIndex = images.findIndex((img) => img.id === fromId)
      const endIndex = images.findIndex((img) => img.id === toId)

      if (startIndex !== -1 && endIndex !== -1) {
        const start = Math.min(startIndex, endIndex)
        const end = Math.max(startIndex, endIndex)
        const rangeIds: string[] = []

        for (let i = start; i <= end; i++) {
          rangeIds.push(images[i].id)
        }

        return get().selectItems(rangeIds)
      }
      return state
    })
  },

  selectAll: () => {
    const state = get() as StoreState
    const allIds = state.images.map((img) => img.id)
    get().selectItems(allIds)
  },

  // Selection Box Actions
  startSelectionBox: (x: number, y: number) => {
    set({
      selectionBox: {
        active: true,
        startX: x,
        startY: y,
        endX: x,
        endY: y,
      },
    })
  },

  updateSelectionBox: (x: number, y: number) => {
    set((state) => {
      if (!state.selectionBox) return state

      // Only update if values actually changed to prevent unnecessary re-renders
      if (state.selectionBox.endX === x && state.selectionBox.endY === y) {
        return state
      }

      return {
        selectionBox: {
          ...state.selectionBox,
          endX: x,
          endY: y,
        },
      }
    })
  },

  endSelectionBox: () => {
    const { selectionBox } = get()
    const state = get() as StoreState
    if (!selectionBox) return

    // Calculate box bounds
    const minX = Math.min(selectionBox.startX, selectionBox.endX)
    const maxX = Math.max(selectionBox.startX, selectionBox.endX)
    const minY = Math.min(selectionBox.startY, selectionBox.endY)
    const maxY = Math.max(selectionBox.startY, selectionBox.endY)

    const selectedIds: string[] = []

    // Handle layer system selection
    if (state.useLayerSystem && state.layers) {
      // Find layers within selection box
      state.layers.forEach((layer) => {
        // Skip if layer is not visible or locked
        if (!layer.visible || layer.locked) return

        // Get layer bounds based on type
        let bounds = state.getLayerBounds?.(layer.id)
        if (!bounds) {
          // Fallback for basic layers
          if (layer.type === 'image' && layer.imageProps) {
            bounds = {
              x: layer.x,
              y: layer.y,
              width: layer.imageProps.width * (layer.scaleX || 1),
              height: layer.imageProps.height * (layer.scaleY || 1),
            }
          } else if (layer.type === 'artboard' && layer.artboardProps) {
            bounds = {
              x: layer.x,
              y: layer.y,
              width: layer.artboardProps.width,
              height: layer.artboardProps.height,
            }
          }
        }

        if (bounds) {
          const layerLeft = bounds.x
          const layerRight = bounds.x + bounds.width
          const layerTop = bounds.y
          const layerBottom = bounds.y + bounds.height

          // Check if selection box intersects or contains the layer
          const isIntersecting = !(
            layerRight < minX ||
            layerLeft > maxX ||
            layerBottom < minY ||
            layerTop > maxY
          )

          if (isIntersecting) {
            selectedIds.push(layer.id)
          }
        }
      })
    } else {
      // Original image-based selection
      const images = state.images
      images.forEach((image) => {
        const imgWidth = image.width || 512
        const imgHeight = image.height || 512
        const imgScaleX = image.scaleX || 1
        const imgScaleY = image.scaleY || 1

        const imgLeft = image.x
        const imgRight = image.x + imgWidth * imgScaleX
        const imgTop = image.y
        const imgBottom = image.y + imgHeight * imgScaleY

        // Check if selection box completely contains the image
        const isContained =
          imgLeft >= minX && imgRight <= maxX && imgTop >= minY && imgBottom <= maxY

        if (isContained) {
          selectedIds.push(image.id)
        }
      })
    }

    // Select the items
    if (selectedIds.length > 0) {
      get().selectItems(selectedIds)
    }

    // Clear selection box
    set({ selectionBox: null })
  },

  // Group Operations
  createSelectionGroup: () => {
    const { selectedIds } = get()
    if (selectedIds.size === 0) return ''

    const bounds = get().getSelectionBounds()
    if (!bounds) return ''

    const groupId = `group-${Date.now()}`
    set({
      selectionGroup: {
        id: groupId,
        bounds,
      },
    })

    return groupId
  },

  dissolveSelectionGroup: () => {
    set({ selectionGroup: null })
  },

  // Utility Actions
  isSelected: (id: string) => {
    return get().selectedIds.has(id)
  },

  getSelectedCount: () => {
    return get().selectedIds.size
  },

  getSelectionBounds: () => {
    const state = get() as StoreState
    const selectedIds = state.useLayerSystem ? state.selectedLayerIds : state.selectedIds
    if (!selectedIds || selectedIds.size === 0) return null

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    if (state.useLayerSystem && state.layers) {
      // Get bounds for selected layers
      selectedIds.forEach((layerId: string) => {
        const layer = state.layers.get(layerId)
        if (!layer) return

        const bounds = state.getLayerBounds?.(layerId)
        if (bounds) {
          minX = Math.min(minX, bounds.x)
          minY = Math.min(minY, bounds.y)
          maxX = Math.max(maxX, bounds.x + bounds.width)
          maxY = Math.max(maxY, bounds.y + bounds.height)
        }
      })
    } else {
      // Original image-based bounds
      const images = state.images
      const selectedImages = images.filter((img) => selectedIds.has(img.id))

      selectedImages.forEach((image) => {
        const imgLeft = image.x
        const imgRight = image.x + (image.width || 100) * (image.scaleX || 1)
        const imgTop = image.y
        const imgBottom = image.y + (image.height || 100) * (image.scaleY || 1)

        minX = Math.min(minX, imgLeft)
        minY = Math.min(minY, imgTop)
        maxX = Math.max(maxX, imgRight)
        maxY = Math.max(maxY, imgBottom)
      })
    }

    if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
      return null
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    }
  },

  getSelectedIds: () => {
    const state = get() as StoreState
    if (state.useLayerSystem && state.selectedLayerIds) {
      return Array.from(state.selectedLayerIds)
    }
    return Array.from(state.selectedIds)
  },

  setUseLayerSystem: (useLayerSystem: boolean) => {
    set({ useLayerSystem })
  },
})
