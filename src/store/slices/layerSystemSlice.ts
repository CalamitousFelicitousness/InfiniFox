// import { create } from 'zustand'
// import { persist } from 'zustand/middleware'

import { layerPersistenceManager } from '../../services/layers/LayerPersistenceManager'
import { imageStorage } from '../../services/storage/UnifiedImageStorageService'
import { layerStorage } from '../../services/storage/UpdatedLayerStorageService'
import { useHistoryStore } from '../historyStore'
import type { SliceCreator } from '../types'

import type { FilterConfig } from './types'

// Layer node types
export type LayerType = 'artboard' | 'group' | 'image' | 'text' | 'shape' | 'drawing'
export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'

export interface LayerTransform {
  x: number
  y: number
  rotation?: number
  scaleX?: number
  scaleY?: number
}

export interface ArtboardProps {
  width: number
  height: number
  backgroundColor?: string
  clipped?: boolean
}

export interface ImageLayerProps {
  imageId: string // Reference to UnifiedImageStorageService
  width: number
  height: number
  naturalWidth?: number
  naturalHeight?: number
  // Legacy fields - to be removed after migration
  src?: string
  blobId?: string
}

export interface TextLayerProps {
  text: string
  fontSize?: number
  fontFamily?: string
  fontStyle?: string
  fill?: string
  stroke?: string
  strokeWidth?: number
  align?: 'left' | 'center' | 'right'
  verticalAlign?: 'top' | 'middle' | 'bottom'
  width?: number
}

export interface ShapeLayerProps {
  shapeType: 'rect' | 'circle' | 'ellipse' | 'line' | 'polygon'
  fill?: string
  stroke?: string
  strokeWidth?: number
  // Shape-specific props
  width?: number
  height?: number
  radius?: number
  radiusX?: number
  radiusY?: number
  points?: number[]
}

export interface DrawingLayerProps {
  strokes: Array<{
    points: number[]
    outline?: number[][]
    color: string
    strokeWidth: number
    opacity: number
  }>
}

export interface LayerNode extends LayerTransform {
  id: string
  type: LayerType
  name: string
  visible: boolean
  locked: boolean
  expanded?: boolean // For groups/artboards in UI
  opacity: number
  blendMode?: BlendMode

  // Hierarchical structure
  parentId?: string | null
  children?: string[] // Child layer IDs

  // Type-specific properties
  artboardProps?: ArtboardProps
  imageProps?: ImageLayerProps
  textProps?: TextLayerProps
  shapeProps?: ShapeLayerProps
  drawingProps?: DrawingLayerProps

  // Effects
  filters?: FilterConfig[]
  cached?: boolean

  // Metadata
  createdAt: number
  updatedAt: number
  zIndex?: number
}

// Filter configuration
export interface FilterConfig {
  type:
    | 'blur'
    | 'brightness'
    | 'contrast'
    | 'grayscale'
    | 'sepia'
    | 'invert'
    | 'hue'
    | 'saturation'
    | 'pixelate'
    | 'noise'
  enabled: boolean
  params: Record<string, number | boolean | string>
}

// Layer command for history
class LayerCommand {
  id: string
  type = 'LAYER_COMMAND'
  timestamp: number
  description: string

  constructor(
    public action: 'add' | 'delete' | 'update' | 'move',
    public layerId: string,
    public oldState: LayerNode | { parentId?: string | null; index?: number } | null,
    public newState:
      | LayerNode
      | Partial<LayerNode>
      | { parentId?: string | null; index?: number }
      | null,
    private store: LayerSystemSlice
  ) {
    this.id = `layer-cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    this.timestamp = Date.now()
    this.description = this.getDescription()
  }

  private getDescription(): string {
    switch (this.action) {
      case 'add':
        return `Add ${(this.newState as LayerNode)?.type || 'layer'}`
      case 'delete':
        return `Delete ${(this.oldState as LayerNode)?.name || 'layer'}`
      case 'update':
        return `Update ${(this.oldState as LayerNode)?.name || 'layer'}`
      case 'move':
        return `Move layer`
      default:
        return 'Layer operation'
    }
  }

  async execute() {
    switch (this.action) {
      case 'add':
        this.store.addLayerDirect(this.newState as LayerNode)
        break
      case 'delete':
        // Use the version that preserves image data for undo
        this.store.deleteLayerDirectWithPreservedImage(this.layerId)
        break
      case 'update':
        this.store.updateLayerDirect(this.layerId, this.newState as Partial<LayerNode>)
        break
      case 'move': {
        const moveState = this.newState as { parentId?: string | null; index?: number }
        this.store.moveLayerDirect(this.layerId, moveState.parentId, moveState.index)
        break
      }
    }
  }

  async undo() {
    switch (this.action) {
      case 'add':
        this.store.deleteLayerDirect(this.layerId)
        break
      case 'delete': {
        // For image layers, ensure the blob URL is recreated
        const restoredLayer = this.oldState as LayerNode
        if (restoredLayer.type === 'image' && restoredLayer.imageProps?.imageId) {
          // The imageId should still be valid in storage
          // The LayerRenderer will create a new blob URL when it loads
        }
        this.store.addLayerDirect(restoredLayer)
        break
      }
      case 'update':
        this.store.updateLayerDirect(this.layerId, this.oldState)
        break
      case 'move':
        this.store.moveLayerDirect(this.layerId, this.oldState.parentId, this.oldState.index)
        break
    }
  }
}

// Selection context type
export type SelectionContext = 'canvas' | 'menu'

// Store interface
export interface LayerSystemSlice {
  // State
  layers: Map<string, LayerNode>
  layerOrder: string[] // Root layer IDs in order
  activeArtboardId?: string | null
  selectedLayerIds: Set<string>
  lastSelectedLayerId?: string | null // Track last selected for range selection
  lastPersistedAt?: number
  operationLoadingStates: Map<string, boolean> // Track loading states for operations

  // Getters
  getLayer: (layerId: string) => LayerNode | undefined
  getLayerChildren: (layerId: string) => LayerNode[]
  getLayerParent: (layerId: string) => LayerNode | undefined
  getLayerPath: (layerId: string) => LayerNode[]
  getRootLayers: () => LayerNode[]
  getArtboards: () => LayerNode[]
  getSelectedLayers: () => LayerNode[]

  // Layer CRUD operations
  addArtboard: (props: Partial<ArtboardProps>, position?: { x: number; y: number }) => string
  addLayer: (layer: Partial<LayerNode>, parentId?: string) => string
  addLayerDirect: (layer: LayerNode) => void
  updateLayer: (layerId: string, updates: Partial<LayerNode>) => void
  updateLayerDirect: (layerId: string, updates: Partial<LayerNode>) => void
  deleteLayer: (layerId: string) => void
  deleteLayerDirect: (layerId: string) => void
  deleteLayerDirectWithPreservedImage: (layerId: string) => void
  duplicateLayer: (layerId: string) => string

  // Layer hierarchy operations
  moveLayer: (layerId: string, newParentId?: string | null, index?: number) => void
  moveLayerDirect: (layerId: string, newParentId?: string | null, index?: number) => void
  groupLayers: (layerIds: string[]) => string
  ungroupLayers: (groupId: string) => void

  // Selection operations
  selectLayer: (
    layerId: string,
    addToSelection?: boolean,
    rangeSelect?: boolean,
    context?: SelectionContext
  ) => void
  selectLayers: (layerIds: string[]) => void
  selectLayerRange: (fromId: string, toId: string, addToSelection?: boolean) => void
  selectLayerRangeSpatial: (fromId: string, toId: string, addToSelection?: boolean) => void
  getLayersInBounds: (bounds: { x: number; y: number; width: number; height: number }) => string[]
  deselectLayer: (layerId: string) => void
  deselectAllLayers: () => void

  // Visibility operations
  toggleLayerVisibility: (layerId: string) => void
  setLayerVisibility: (layerId: string, visible: boolean) => void
  toggleLayerLock: (layerId: string) => void
  setLayerLock: (layerId: string, locked: boolean) => void

  // Filter operations
  applyFilter: (layerId: string, filter: FilterConfig) => void
  updateFilter: (
    layerId: string,
    filterType: string,
    params: Record<string, number | boolean | string>
  ) => void
  removeFilter: (layerId: string, filterType: string) => void
  clearFilters: (layerId: string) => void

  // Artboard operations
  setActiveArtboard: (artboardId: string | null) => void
  resizeArtboard: (artboardId: string, width: number, height: number) => void
  duplicateArtboard: (artboardId: string) => Promise<string | undefined>
  renameArtboard: (artboardId: string, name: string) => void
  clearArtboard: (artboardId: string) => Promise<void>
  setArtboardBackground: (artboardId: string, color: string) => void

  // Phase 2: Advanced Artboard operations
  moveArtboardToFront: (artboardId: string) => void
  moveArtboardToBack: (artboardId: string) => void
  selectArtboardChildren: (artboardId: string) => void
  autoArrangeChildren: (
    artboardId: string,
    options: {
      direction: 'horizontal' | 'vertical' | 'grid'
      spacing: number
      columns?: number
    }
  ) => Promise<void>
  fitArtboardToContents: (artboardId: string, padding?: number) => Promise<void>

  // Import/Export operations
  exportLayerStructure: () => string
  importLayerStructure: (jsonString: string) => void

  // Migration from old system
  migrateFromFlatImages: (
    images: Array<{
      id?: string
      src: string
      x?: number
      y?: number
      width?: number
      height?: number
      scaleX?: number
      scaleY?: number
      rotation?: number
      blobId?: string
      metadata?: { prompt?: string }
    }>
  ) => void

  // Utility operations
  clearAllLayers: () => Promise<void>
  getGroups: () => LayerNode[]
  getLayerBounds: (
    layerId: string
  ) => { x: number; y: number; width: number; height: number } | null

  // Persistence operations
  persistLayerStructure: () => Promise<void>
  restoreLayerStructure: () => Promise<boolean>
}

// Create the store slice
export const createLayerSystemSlice: SliceCreator<LayerSystemSlice> = (set, get) => ({
  // Initial state
  layers: new Map(),
  layerOrder: [],
  activeArtboardId: null,
  selectedLayerIds: new Set(),
  lastSelectedLayerId: null,
  lastPersistedAt: 0,
  operationLoadingStates: new Map(),

  // Getters
  getLayer: (layerId: string) => {
    const state = get() as LayerSystemSlice
    return state.layers.get(layerId)
  },

  getLayerChildren: (layerId: string) => {
    const state = get() as LayerSystemSlice
    const layer = state.layers.get(layerId)
    if (!layer?.children) return []
    return layer.children
      .map((childId: string) => state.layers.get(childId))
      .filter(Boolean) as LayerNode[]
  },

  getLayerParent: (layerId: string) => {
    const state = get() as LayerSystemSlice
    const layer = state.layers.get(layerId)
    if (!layer?.parentId) return undefined
    return state.layers.get(layer.parentId)
  },

  getLayerPath: (layerId: string) => {
    const state = get() as LayerSystemSlice
    const path: LayerNode[] = []
    let current = state.layers.get(layerId)

    while (current) {
      path.unshift(current)
      current = current.parentId ? state.layers.get(current.parentId) : undefined
    }

    return path
  },

  getRootLayers: () => {
    const state = get() as LayerSystemSlice
    return state.layerOrder
      .map((id: string) => state.layers.get(id))
      .filter((layer): layer is LayerNode => layer !== undefined && !layer.parentId) // Only return layers without a parent
  },

  getArtboards: () => {
    const state = get() as LayerSystemSlice
    // Get artboards from root layers (layerOrder)
    const rootArtboards = state.layerOrder
      .map((id: string) => state.layers.get(id))
      .filter((layer): layer is LayerNode => layer !== undefined && layer.type === 'artboard')

    return rootArtboards.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
  },

  getSelectedLayers: () => {
    const state = get() as LayerSystemSlice
    return Array.from(state.selectedLayerIds)
      .map((id: string) => state.layers.get(id))
      .filter(Boolean) as LayerNode[]
  },

  // Add artboard
  addArtboard: (props: Partial<ArtboardProps> = {}, position?: { x: number; y: number }) => {
    const id = `artboard-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const artboardCount = get().getArtboards().length

    const artboard: LayerNode = {
      id,
      type: 'artboard',
      name: `Artboard ${artboardCount + 1}`,
      visible: true,
      locked: false,
      expanded: true,
      opacity: 1,
      x: position?.x ?? 100 + artboardCount * 50,
      y: position?.y ?? 100 + artboardCount * 50,
      artboardProps: {
        width: props.width ?? 800,
        height: props.height ?? 600,
        backgroundColor: props.backgroundColor ?? '#ffffff',
        clipped: props.clipped ?? true,
      },
      children: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      zIndex: artboardCount,
    }

    // Create command for history
    const command = new LayerCommand('add', id, null, artboard, get())
    useHistoryStore.getState().executeCommand(command)

    return id
  },

  // Add layer
  addLayer: (layer: Partial<LayerNode>, parentId?: string) => {
    const id = layer.id || `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const timestamp = Date.now()

    const newLayer: LayerNode = {
      id,
      type: layer.type || 'image',
      name: layer.name || `Layer ${get().layers.size + 1}`,
      visible: layer.visible ?? true,
      locked: layer.locked ?? false,
      opacity: layer.opacity ?? 1,
      x: layer.x ?? 0,
      y: layer.y ?? 0,
      rotation: layer.rotation,
      scaleX: layer.scaleX,
      scaleY: layer.scaleY,
      parentId: parentId || null,
      children: layer.children || [],
      createdAt: layer.createdAt ?? timestamp,
      updatedAt: timestamp,
      ...layer,
    } as LayerNode

    // Track reference in ImageStorageService for image layers
    if (newLayer.type === 'image' && newLayer.imageProps?.imageId) {
      imageStorage.addLayerReference(newLayer.imageProps.imageId, id).catch(console.error)
    }

    // Create a copy for history to avoid reference issues
    const newLayerCopy = JSON.parse(JSON.stringify(newLayer))

    // Create command for history
    const command = new LayerCommand('add', id, null, newLayerCopy, get())
    useHistoryStore.getState().executeCommand(command)

    return id
  },

  // Direct operations (without history)
  addLayerDirect: (layer: LayerNode) => {
    // Track reference in ImageStorageService for image layers
    if (layer.type === 'image' && layer.imageProps?.imageId) {
      imageStorage.addLayerReference(layer.imageProps.imageId, layer.id).catch(console.error)
    }

    set((state) => {
      const newLayers = new Map(state.layers)
      newLayers.set(layer.id, layer)

      let newLayerOrder = state.layerOrder

      // Update parent's children if applicable
      if (layer.parentId) {
        const parent = newLayers.get(layer.parentId)
        if (parent) {
          parent.children = [...(parent.children || []), layer.id]
          parent.updatedAt = Date.now()
        }
      } else {
        // Add to root if no parent
        newLayerOrder = [...state.layerOrder, layer.id]
      }

      // Schedule auto-save
      layerPersistenceManager.scheduleSave({
        layers: newLayers,
        layerOrder: newLayerOrder,
        activeArtboardId: state.activeArtboardId,
      })

      return {
        layers: newLayers,
        layerOrder: newLayerOrder,
      }
    })
  },

  updateLayer: (layerId: string, updates: Partial<LayerNode>) => {
    const oldLayer = get().getLayer(layerId)
    if (!oldLayer) return

    // Create a deep copy of the old layer state for history
    const oldLayerCopy = JSON.parse(JSON.stringify(oldLayer))

    const command = new LayerCommand('update', layerId, oldLayerCopy, updates, get())
    useHistoryStore.getState().executeCommand(command)
  },

  updateLayerDirect: (layerId: string, updates: Partial<LayerNode>) => {
    set((state) => {
      const newLayers = new Map(state.layers)
      const layer = newLayers.get(layerId)

      if (layer) {
        // Handle drawingProps specially to merge strokes array
        if (updates.drawingProps && layer.drawingProps) {
          updates = {
            ...updates,
            drawingProps: {
              ...layer.drawingProps,
              ...updates.drawingProps,
            },
          }
        }
        Object.assign(layer, updates, { updatedAt: Date.now() })
      }

      // Schedule auto-save
      layerPersistenceManager.scheduleSave({
        layers: newLayers,
        layerOrder: state.layerOrder,
        activeArtboardId: state.activeArtboardId,
      })

      return { layers: newLayers }
    })
  },

  deleteLayer: (layerId: string) => {
    const layer = get().getLayer(layerId)
    if (!layer) return

    // Create a deep copy of the layer for undo
    const layerCopy = JSON.parse(JSON.stringify(layer))

    // The LayerCommand will use deleteLayerDirectWithPreservedImage
    // which preserves the image data in storage for undo
    const command = new LayerCommand('delete', layerId, layerCopy, null, get())
    useHistoryStore.getState().executeCommand(command)
  },

  deleteLayerDirect: (layerId: string) => {
    set((state) => {
      const newLayers = new Map(state.layers)
      const layer = newLayers.get(layerId)

      if (!layer) return state

      // Store parent ID for later cleanup check
      const parentId = layer.parentId

      // Recursively delete children
      if (layer.children) {
        layer.children.forEach((childId) => {
          get().deleteLayerDirect(childId)
        })
      }

      // Remove from parent's children
      if (parentId) {
        const parent = newLayers.get(parentId)
        if (parent?.children) {
          parent.children = parent.children.filter((id) => id !== layerId)
          parent.updatedAt = Date.now()

          // Auto-delete empty groups
          if (parent.type === 'group' && parent.children.length === 0) {
            // Recursively delete the empty group
            setTimeout(() => {
              get().deleteLayerDirect(parentId)
            }, 0)
          }
        }
      }

      // Remove from selection
      const newSelectedIds = new Set(state.selectedLayerIds)
      newSelectedIds.delete(layerId)

      // Remove from layers
      newLayers.delete(layerId)

      // Remove from root order if applicable
      const newLayerOrder = state.layerOrder.filter((id) => id !== layerId)

      // Clean up image references
      if (layer.type === 'image' && layer.imageProps?.imageId) {
        imageStorage.removeLayerReference(layer.imageProps.imageId, layerId).catch(console.error)
      }

      // Schedule auto-save
      layerPersistenceManager.scheduleSave({
        layers: newLayers,
        layerOrder: newLayerOrder,
        activeArtboardId: state.activeArtboardId,
      })

      return {
        layers: newLayers,
        layerOrder: newLayerOrder,
        selectedLayerIds: newSelectedIds,
      }
    })
  },

  // Delete layer without removing image from storage (for undo support)
  deleteLayerDirectWithPreservedImage: (layerId: string) => {
    set((state) => {
      const newLayers = new Map(state.layers)
      const layer = newLayers.get(layerId)

      if (!layer) return state

      // Store parent ID for later cleanup check
      const parentId = layer.parentId

      // Recursively delete children
      if (layer.children) {
        layer.children.forEach((childId) => {
          get().deleteLayerDirectWithPreservedImage(childId)
        })
      }

      // Remove from parent's children
      if (parentId) {
        const parent = newLayers.get(parentId)
        if (parent?.children) {
          parent.children = parent.children.filter((id) => id !== layerId)
          parent.updatedAt = Date.now()

          // Auto-delete empty groups
          if (parent.type === 'group' && parent.children.length === 0) {
            // Recursively delete the empty group
            setTimeout(() => {
              get().deleteLayerDirectWithPreservedImage(parentId)
            }, 0)
          }
        }
      }

      // Remove from selection
      const newSelectedIds = new Set(state.selectedLayerIds)
      newSelectedIds.delete(layerId)

      // Remove from layers
      newLayers.delete(layerId)

      // Remove from root order if applicable
      const newLayerOrder = state.layerOrder.filter((id) => id !== layerId)

      // NOTE: We intentionally DO NOT remove the image reference from storage
      // This allows the image to be restored if the delete is undone
      // The image will be cleaned up later by garbage collection if needed

      // Schedule auto-save
      layerPersistenceManager.scheduleSave({
        layers: newLayers,
        layerOrder: newLayerOrder,
        activeArtboardId: state.activeArtboardId,
      })

      return {
        layers: newLayers,
        layerOrder: newLayerOrder,
        selectedLayerIds: newSelectedIds,
      }
    })
  },

  duplicateLayer: (layerId: string) => {
    const layer = get().getLayer(layerId)
    if (!layer) return ''

    const duplicateLayerRecursive = (originalLayer: LayerNode, parentId?: string): string => {
      const newId = `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const timestamp = Date.now()

      const duplicate: LayerNode = {
        ...originalLayer,
        id: newId,
        name: `${originalLayer.name} copy`,
        x: originalLayer.x + 20,
        y: originalLayer.y + 20,
        parentId: parentId || originalLayer.parentId,
        children: [],
        createdAt: timestamp,
        updatedAt: timestamp,
      }

      // Handle image duplication with blob storage
      if (duplicate.type === 'image' && duplicate.imageProps?.imageId) {
        // Add reference for the duplicated layer
        imageStorage.addLayerReference(duplicate.imageProps.imageId, newId).catch(console.error)
      }

      get().addLayerDirect(duplicate)

      // Recursively duplicate children
      if (originalLayer.children) {
        originalLayer.children.forEach((childId) => {
          const child = get().getLayer(childId)
          if (child) {
            duplicateLayerRecursive(child, newId)
          }
        })
      }

      return newId
    }

    return duplicateLayerRecursive(layer)
  },

  // Move layer in hierarchy
  moveLayer: (layerId: string, newParentId?: string | null, index?: number) => {
    const layer = get().getLayer(layerId)
    if (!layer) return

    const oldState = {
      parentId: layer.parentId,
      index: layer.parentId
        ? get().getLayer(layer.parentId)?.children?.indexOf(layerId)
        : get().layerOrder.indexOf(layerId),
    }

    const command = new LayerCommand(
      'move',
      layerId,
      oldState,
      { parentId: newParentId, index },
      get()
    )
    useHistoryStore.getState().executeCommand(command)
  },

  moveLayerDirect: (layerId: string, newParentId?: string | null, index?: number) => {
    set((state) => {
      const newLayers = new Map(state.layers)
      const layer = newLayers.get(layerId)

      if (!layer) return state

      // Remove from old parent
      if (layer.parentId) {
        const oldParent = newLayers.get(layer.parentId)
        if (oldParent?.children) {
          oldParent.children = oldParent.children.filter((id) => id !== layerId)
          oldParent.updatedAt = Date.now()
        }
      } else {
        // Remove from root
        state.layerOrder = state.layerOrder.filter((id) => id !== layerId)
      }

      // Add to new parent
      layer.parentId = newParentId || null

      if (newParentId) {
        const newParent = newLayers.get(newParentId)
        if (newParent) {
          if (!newParent.children) newParent.children = []
          if (index !== undefined) {
            newParent.children.splice(index, 0, layerId)
          } else {
            newParent.children.push(layerId)
          }
          newParent.updatedAt = Date.now()
        }
      } else {
        // Add to root
        if (index !== undefined) {
          state.layerOrder.splice(index, 0, layerId)
        } else {
          state.layerOrder.push(layerId)
        }
      }

      layer.updatedAt = Date.now()

      // Schedule auto-save
      layerPersistenceManager.scheduleSave({
        layers: newLayers,
        layerOrder: state.layerOrder,
        activeArtboardId: state.activeArtboardId,
      })

      return { layers: newLayers }
    })
  },

  // Group layers
  groupLayers: (layerIds: string[]) => {
    if (layerIds.length === 0) return ''

    const layers = layerIds.map((id) => get().getLayer(id)).filter(Boolean) as LayerNode[]
    if (layers.length === 0) return ''

    // Find common parent
    const firstParentId = layers[0].parentId
    const commonParent = layers.every((l) => l.parentId === firstParentId) ? firstParentId : null

    // Create group
    const groupId = get().addLayer(
      {
        type: 'group',
        name: 'Group',
        expanded: true,
      },
      commonParent || undefined
    )

    // Move layers into group
    layers.forEach((layer) => {
      get().moveLayer(layer.id, groupId)
    })

    return groupId
  },

  // Ungroup layers
  ungroupLayers: (groupId: string) => {
    const group = get().getLayer(groupId)
    if (!group || group.type !== 'group') return

    const children = group.children || []
    const parentId = group.parentId

    // Move children to group's parent
    children.forEach((childId) => {
      get().moveLayer(childId, parentId)
    })

    // Delete the group
    get().deleteLayer(groupId)
  },

  // Selection operations
  selectLayer: (
    layerId: string,
    addToSelection = false,
    rangeSelect = false,
    context: SelectionContext = 'menu'
  ) => {
    const state = get() as LayerSystemSlice

    // Handle range selection based on context
    if (rangeSelect && state.lastSelectedLayerId) {
      if (context === 'canvas') {
        // Use spatial selection for canvas
        state.selectLayerRangeSpatial(state.lastSelectedLayerId, layerId, addToSelection)
      } else {
        // Use hierarchical selection for menu
        state.selectLayerRange(state.lastSelectedLayerId, layerId, addToSelection)
      }
      return
    }

    // If range select was requested but no anchor exists, or regular selection
    set((state) => {
      const newSelectedIds = addToSelection ? new Set(state.selectedLayerIds) : new Set<string>()
      newSelectedIds.add(layerId)

      return {
        selectedLayerIds: newSelectedIds,
        lastSelectedLayerId: layerId, // Track last selected for range selection
      }
    })
  },

  selectLayers: (layerIds: string[]) => {
    set({
      selectedLayerIds: new Set(layerIds),
      lastSelectedLayerId: layerIds.length > 0 ? layerIds[layerIds.length - 1] : null,
    })
  },

  selectLayerRange: (fromId: string, toId: string, addToSelection = false) => {
    const state = get() as LayerSystemSlice

    // Helper function to recursively get all layers in visual order
    const getAllLayersInOrder = (): string[] => {
      const result: string[] = []

      const addLayerAndChildren = (layerId: string) => {
        result.push(layerId)
        const layer = state.layers.get(layerId)
        if (layer?.childIds) {
          layer.childIds.forEach((childId) => addLayerAndChildren(childId))
        }
      }

      // Start with root layers in order
      state.layerOrder.forEach((rootId) => addLayerAndChildren(rootId))
      return result
    }

    // Get all layers in visual order
    const allLayers = getAllLayersInOrder()

    const fromIndex = allLayers.indexOf(fromId)
    const toIndex = allLayers.indexOf(toId)

    if (fromIndex === -1 || toIndex === -1) {
      // One of the layers wasn't found, just select the target
      state.selectLayer(toId, addToSelection, false)
      return
    }

    // Get the range of layers to select
    const startIndex = Math.min(fromIndex, toIndex)
    const endIndex = Math.max(fromIndex, toIndex)
    const layersToSelect = allLayers.slice(startIndex, endIndex + 1)

    // Update selection
    set((state) => {
      const newSelectedIds = addToSelection
        ? new Set([...state.selectedLayerIds, ...layersToSelect])
        : new Set(layersToSelect)

      // Log the actual state update
      const result = {
        selectedLayerIds: newSelectedIds,
        lastSelectedLayerId: toId,
      }

      return result
    })
  },

  selectLayerRangeSpatial: (fromId: string, toId: string, addToSelection = false) => {
    const state = get() as LayerSystemSlice

    // Get bounds of the two anchor layers
    const fromBounds = state.getLayerBounds(fromId)
    const toBounds = state.getLayerBounds(toId)

    if (!fromBounds || !toBounds) {
      // Fallback to regular selection if bounds not available
      state.selectLayer(toId, addToSelection, false)
      return
    }

    // Calculate the encompassing bounding box
    const boundingBox = {
      x: Math.min(fromBounds.x, toBounds.x),
      y: Math.min(fromBounds.y, toBounds.y),
      width: 0, // Will be calculated
      height: 0, // Will be calculated
    }

    const maxX = Math.max(fromBounds.x + fromBounds.width, toBounds.x + toBounds.width)
    const maxY = Math.max(fromBounds.y + fromBounds.height, toBounds.y + toBounds.height)
    boundingBox.width = maxX - boundingBox.x
    boundingBox.height = maxY - boundingBox.y

    // Find all layers within this bounding box
    const layersInBounds = state.getLayersInBounds(boundingBox)

    // Update selection
    set((state) => {
      const newSelectedIds = addToSelection
        ? new Set([...state.selectedLayerIds, ...layersInBounds])
        : new Set(layersInBounds)

      return {
        selectedLayerIds: newSelectedIds,
        lastSelectedLayerId: toId,
      }
    })
  },

  getLayersInBounds: (bounds: { x: number; y: number; width: number; height: number }) => {
    const state = get() as LayerSystemSlice
    const layersInBounds: string[] = []

    // Helper function to check if two rectangles intersect
    const rectsIntersect = (
      r1: { x: number; y: number; width: number; height: number },
      r2: { x: number; y: number; width: number; height: number }
    ): boolean => {
      return !(
        r1.x > r2.x + r2.width ||
        r1.x + r1.width < r2.x ||
        r1.y > r2.y + r2.height ||
        r1.y + r1.height < r2.y
      )
    }

    // Check all layers
    state.layers.forEach((layer, layerId) => {
      const layerBounds = state.getLayerBounds(layerId)
      if (layerBounds && rectsIntersect(bounds, layerBounds)) {
        layersInBounds.push(layerId)
      }
    })

    return layersInBounds
  },

  deselectLayer: (layerId: string) => {
    set((state) => {
      const newSelectedIds = new Set(state.selectedLayerIds)
      newSelectedIds.delete(layerId)
      return {
        selectedLayerIds: newSelectedIds,
        // Clear last selected if it was the deselected layer
        lastSelectedLayerId:
          state.lastSelectedLayerId === layerId ? null : state.lastSelectedLayerId,
      }
    })
  },

  deselectAllLayers: () => {
    set({
      selectedLayerIds: new Set(),
      lastSelectedLayerId: null,
    })
  },

  // Visibility operations
  toggleLayerVisibility: (layerId: string) => {
    const layer = get().getLayer(layerId)
    if (layer) {
      get().updateLayer(layerId, { visible: !layer.visible })
    }
  },

  setLayerVisibility: (layerId: string, visible: boolean) => {
    get().updateLayer(layerId, { visible })
  },

  toggleLayerLock: (layerId: string) => {
    const layer = get().getLayer(layerId)
    if (layer) {
      get().updateLayer(layerId, { locked: !layer.locked })
    }
  },

  setLayerLock: (layerId: string, locked: boolean) => {
    get().updateLayer(layerId, { locked })
  },

  // Filter operations
  applyFilter: (layerId: string, filter: FilterConfig) => {
    const layer = get().getLayer(layerId)
    if (!layer) return

    const filters = layer.filters || []
    const existingIndex = filters.findIndex((f) => f.type === filter.type)

    if (existingIndex >= 0) {
      filters[existingIndex] = filter
    } else {
      filters.push(filter)
    }

    get().updateLayer(layerId, { filters, cached: true })
  },

  updateFilter: (
    layerId: string,
    filterType: string,
    params: Record<string, number | boolean | string>
  ) => {
    const layer = get().getLayer(layerId)
    if (!layer?.filters) return

    const filter = layer.filters.find((f) => f.type === filterType)
    if (filter) {
      filter.params = { ...filter.params, ...params }
      get().updateLayer(layerId, { filters: [...layer.filters] })
    }
  },

  removeFilter: (layerId: string, filterType: string) => {
    const layer = get().getLayer(layerId)
    if (!layer?.filters) return

    const filters = layer.filters.filter((f) => f.type !== filterType)
    get().updateLayer(layerId, { filters, cached: filters.length > 0 })
  },

  clearFilters: (layerId: string) => {
    get().updateLayer(layerId, { filters: [], cached: false })
  },

  // Artboard operations
  setActiveArtboard: (artboardId: string | null) => {
    set({ activeArtboardId: artboardId })
  },

  resizeArtboard: (artboardId: string, width: number, height: number) => {
    const artboard = get().getLayer(artboardId)
    if (artboard?.type === 'artboard') {
      get().updateLayer(artboardId, {
        artboardProps: {
          ...artboard.artboardProps,
          width,
          height,
        },
      })
    }
  },

  duplicateArtboard: async (artboardId: string) => {
    const artboard = get().getLayer(artboardId)
    if (!artboard || artboard.type !== 'artboard') return undefined

    // Set loading state
    set((state) => {
      const newLoadingStates = new Map(state.operationLoadingStates)
      newLoadingStates.set(`duplicate-${artboardId}`, true)
      return { operationLoadingStates: newLoadingStates }
    })

    // Allow UI to update
    await new Promise((resolve) => setTimeout(resolve, 0))

    const newArtboardId = `artboard-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const offset = 50

    // Deep clone artboard with new position
    const duplicatedArtboard: LayerNode = {
      ...artboard,
      id: newArtboardId,
      name: `${artboard.name} copy`,
      x: artboard.x + offset,
      y: artboard.y + offset,
      children: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    // Recursively duplicate children
    const duplicateChildren = (originalIds: string[], newParentId: string) => {
      originalIds.forEach((childId) => {
        const child = get().getLayer(childId)
        if (!child) return

        const newChildId = `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const duplicatedChild: LayerNode = {
          ...child,
          id: newChildId,
          parentId: newParentId,
          children: child.children ? [] : undefined,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }

        // Handle image layers with blob storage
        if (child.type === 'image' && child.imageProps?.imageId) {
          imageStorage.addLayerReference(child.imageProps.imageId, newChildId).catch(console.error)
        }

        get().addLayerDirect(duplicatedChild)

        if (child.children) {
          duplicateChildren(child.children, newChildId)
        }
      })
    }

    get().addLayerDirect(duplicatedArtboard)
    if (artboard.children) {
      duplicateChildren(artboard.children, newArtboardId)
    }

    // Clear loading state
    set((state) => {
      const newLoadingStates = new Map(state.operationLoadingStates)
      newLoadingStates.delete(`duplicate-${artboardId}`)
      return { operationLoadingStates: newLoadingStates }
    })

    return newArtboardId
  },

  renameArtboard: (artboardId: string, name: string) => {
    const artboard = get().getLayer(artboardId)
    if (artboard?.type === 'artboard') {
      get().updateLayer(artboardId, { name })
    }
  },

  clearArtboard: async (artboardId: string) => {
    const artboard = get().getLayer(artboardId)
    if (!artboard || artboard.type !== 'artboard') return

    // Set loading state
    set((state) => {
      const newLoadingStates = new Map(state.operationLoadingStates)
      newLoadingStates.set(`clear-${artboardId}`, true)
      return { operationLoadingStates: newLoadingStates }
    })

    // Allow UI to update
    await new Promise((resolve) => setTimeout(resolve, 0))

    const deleteChildrenRecursive = (ids: string[]) => {
      ids.forEach((id) => {
        const child = get().getLayer(id)
        if (child?.children) {
          deleteChildrenRecursive(child.children)
        }
        get().deleteLayerDirect(id)
      })
    }

    if (artboard.children) {
      deleteChildrenRecursive(artboard.children)
    }

    get().updateLayer(artboardId, { children: [] })

    // Clear loading state
    set((state) => {
      const newLoadingStates = new Map(state.operationLoadingStates)
      newLoadingStates.delete(`clear-${artboardId}`)
      return { operationLoadingStates: newLoadingStates }
    })
  },

  setArtboardBackground: (artboardId: string, color: string) => {
    const artboard = get().getLayer(artboardId)
    if (artboard?.type === 'artboard') {
      get().updateLayer(artboardId, {
        artboardProps: {
          ...artboard.artboardProps,
          backgroundColor: color,
        },
      })
    }
  },

  // Phase 2: Advanced Artboard operations
  moveArtboardToFront: (artboardId: string) => {
    const artboards = get().getArtboards()
    const maxZIndex = Math.max(...artboards.map((a) => a.zIndex || 0), 0)
    get().updateLayer(artboardId, { zIndex: maxZIndex + 1 })
  },

  moveArtboardToBack: (artboardId: string) => {
    const artboards = get().getArtboards()
    const minZIndex = Math.min(...artboards.map((a) => a.zIndex || 0), 0)
    get().updateLayer(artboardId, { zIndex: minZIndex - 1 })
  },

  selectArtboardChildren: (artboardId: string) => {
    const artboard = get().getLayer(artboardId)
    if (!artboard?.children) return

    const collectAllChildIds = (ids: string[]): string[] => {
      const result: string[] = []
      ids.forEach((id) => {
        result.push(id)
        const child = get().getLayer(id)
        if (child?.children) {
          result.push(...collectAllChildIds(child.children))
        }
      })
      return result
    }

    const allChildIds = collectAllChildIds(artboard.children)
    get().selectLayers(allChildIds)
  },

  autoArrangeChildren: async (
    artboardId: string,
    options: {
      direction: 'horizontal' | 'vertical' | 'grid'
      spacing: number
      columns?: number
    }
  ) => {
    const artboard = get().getLayer(artboardId)
    if (!artboard?.children || artboard.children.length === 0) return

    // Set loading state
    set((state) => {
      const newLoadingStates = new Map(state.operationLoadingStates)
      newLoadingStates.set(`arrange-${artboardId}`, true)
      return { operationLoadingStates: newLoadingStates }
    })

    // Allow UI to update
    await new Promise((resolve) => setTimeout(resolve, 0))

    const children = artboard.children
      .map((id) => get().getLayer(id))
      .filter(Boolean) as LayerNode[]

    let x = options.spacing
    let y = options.spacing
    let maxHeight = 0
    let currentColumn = 0

    children.forEach((child, _index) => {
      const bounds = get().getLayerBounds(child.id)
      if (!bounds) return

      if (options.direction === 'horizontal') {
        get().updateLayer(child.id, { x, y })
        x += bounds.width + options.spacing
      } else if (options.direction === 'vertical') {
        get().updateLayer(child.id, { x, y })
        y += bounds.height + options.spacing
      } else if (options.direction === 'grid' && options.columns) {
        get().updateLayer(child.id, { x, y })
        maxHeight = Math.max(maxHeight, bounds.height)

        currentColumn++
        if (currentColumn >= options.columns) {
          currentColumn = 0
          x = options.spacing
          y += maxHeight + options.spacing
          maxHeight = 0
        } else {
          x += bounds.width + options.spacing
        }
      }
    })

    // Clear loading state
    set((state) => {
      const newLoadingStates = new Map(state.operationLoadingStates)
      newLoadingStates.delete(`arrange-${artboardId}`)
      return { operationLoadingStates: newLoadingStates }
    })
  },

  fitArtboardToContents: async (artboardId: string, padding: number = 20) => {
    const artboard = get().getLayer(artboardId)
    if (!artboard?.children || artboard.children.length === 0) return

    // Set loading state
    set((state) => {
      const newLoadingStates = new Map(state.operationLoadingStates)
      newLoadingStates.set(`fit-${artboardId}`, true)
      return { operationLoadingStates: newLoadingStates }
    })

    // Allow UI to update
    await new Promise((resolve) => setTimeout(resolve, 0))

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    const processChildren = (ids: string[]) => {
      ids.forEach((id) => {
        const bounds = get().getLayerBounds(id)
        if (bounds) {
          minX = Math.min(minX, bounds.x)
          minY = Math.min(minY, bounds.y)
          maxX = Math.max(maxX, bounds.x + bounds.width)
          maxY = Math.max(maxY, bounds.y + bounds.height)
        }

        const child = get().getLayer(id)
        if (child?.children) {
          processChildren(child.children)
        }
      })
    }

    processChildren(artboard.children)

    if (isFinite(minX) && isFinite(minY) && isFinite(maxX) && isFinite(maxY)) {
      // Adjust children positions relative to artboard
      const offsetX = padding - minX
      const offsetY = padding - minY

      const moveChildren = (ids: string[]) => {
        ids.forEach((id) => {
          const child = get().getLayer(id)
          if (child) {
            get().updateLayer(id, {
              x: child.x + offsetX,
              y: child.y + offsetY,
            })

            if (child.children) {
              moveChildren(child.children)
            }
          }
        })
      }

      moveChildren(artboard.children)

      // Resize artboard to fit contents
      const newWidth = maxX - minX + padding * 2
      const newHeight = maxY - minY + padding * 2

      get().resizeArtboard(artboardId, newWidth, newHeight)
    }

    // Clear loading state
    set((state) => {
      const newLoadingStates = new Map(state.operationLoadingStates)
      newLoadingStates.delete(`fit-${artboardId}`)
      return { operationLoadingStates: newLoadingStates }
    })
  },

  // Export layer structure
  exportLayerStructure: () => {
    const state = get() as LayerSystemSlice
    const layers = Array.from(state.layers.values())

    return JSON.stringify(
      {
        layers,
        layerOrder: state.layerOrder,
        activeArtboardId: state.activeArtboardId,
      },
      null,
      2
    )
  },

  // Import layer structure
  importLayerStructure: (jsonString: string) => {
    try {
      const data = JSON.parse(jsonString)

      set({
        layers: new Map(data.layers.map((l: LayerNode) => [l.id, l])),
        layerOrder: data.layerOrder || [],
        activeArtboardId: data.activeArtboardId || null,
        selectedLayerIds: new Set(),
      })
    } catch (error) {
      console.error('Failed to import layer structure:', error)
    }
  },

  // Migrate from flat images
  migrateFromFlatImages: async (
    images: Array<{
      id?: string
      src: string
      x?: number
      y?: number
      width?: number
      height?: number
      scaleX?: number
      scaleY?: number
      rotation?: number
      blobId?: string
      metadata?: { prompt?: string }
    }>
  ) => {
    // Add images as root layers (not inside artboards)
    // This preserves their original canvas positions
    for (const image of images) {
      // Ensure we have valid dimensions
      const width = image.width || 512
      const height = image.height || 512

      // Create image in unified storage if we have a blob
      let imageId: string | undefined
      if (image.src && image.src.startsWith('blob:')) {
        try {
          // Fetch blob from URL
          const response = await fetch(image.src)
          const blob = await response.blob()

          // Create unique ID
          imageId = image.id || `migrated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

          // Store in unified storage
          await imageStorage.createFromBlob(imageId, blob, {
            type: 'migrated',
            prompt: image.metadata?.prompt,
            width,
            height,
            usedIn: new Set(['layer-system']),
          })
        } catch (error) {
          console.error('Failed to migrate image to unified storage:', error)
          // Fallback to legacy approach if migration fails
        }
      }

      get().addLayer(
        {
          type: 'image',
          name: image.metadata?.prompt
            ? `Generated: ${image.metadata.prompt.slice(0, 20)}...`
            : 'Image',
          x: image.x || 0,
          y: image.y || 0,
          scaleX: image.scaleX || 1,
          scaleY: image.scaleY || 1,
          rotation: image.rotation || 0,
          imageProps: imageId
            ? {
                imageId,
                width,
                height,
                naturalWidth: width,
                naturalHeight: height,
              }
            : {
                // Legacy fallback
                src: image.src,
                blobId: image.blobId,
                width,
                height,
                naturalWidth: width,
                naturalHeight: height,
              },
        },
        undefined // No parent - add as root layer
      )
    }
  },

  // Clear all layers
  clearAllLayers: async () => {
    // Clear persisted layer data
    await layerStorage.clearAll().catch(console.error)

    // Clear in-memory state
    set({
      layers: new Map(),
      layerOrder: [],
      activeArtboardId: null,
      selectedLayerIds: new Set(),
    })
  },

  // Get all group layers
  getGroups: () => {
    const groups: LayerNode[] = []
    const state = get() as LayerSystemSlice

    state.layers.forEach((layer) => {
      if (layer.type === 'group') {
        groups.push(layer)
      }
    })

    return groups
  },

  // Persistence operations
  persistLayerStructure: async () => {
    const state = get() as LayerSystemSlice
    await layerPersistenceManager.saveNow({
      layers: state.layers,
      layerOrder: state.layerOrder,
      activeArtboardId: state.activeArtboardId,
    })
    set({ lastPersistedAt: Date.now() })
  },

  restoreLayerStructure: async () => {
    const data = await layerPersistenceManager.restoreOnLoad()
    if (data) {
      set({
        layers: data.layers,
        layerOrder: data.layerOrder,
        activeArtboardId: data.activeArtboardId,
        selectedLayerIds: new Set(),
        lastPersistedAt: Date.now(),
      })

      // Clean up any empty groups that might have been persisted
      setTimeout(() => {
        const state = get() as LayerSystemSlice
        const emptyGroups: string[] = []

        state.layers.forEach((layer) => {
          if (layer.type === 'group') {
            const children = get().getLayerChildren(layer.id)
            if (children.length === 0) {
              emptyGroups.push(layer.id)
            }
          }
        })

        // Delete all empty groups
        emptyGroups.forEach((groupId) => {
          get().deleteLayerDirect(groupId)
        })

        if (emptyGroups.length > 0) {
        }
      }, 100)

      return true
    }
    return false
  },

  // Get layer bounds
  getLayerBounds: (layerId: string) => {
    const layer = get().getLayer(layerId)
    if (!layer) return null

    switch (layer.type) {
      case 'artboard':
        return {
          x: layer.x,
          y: layer.y,
          width: layer.artboardProps?.width || 0,
          height: layer.artboardProps?.height || 0,
        }
      case 'image':
        return {
          x: layer.x,
          y: layer.y,
          width: (layer.imageProps?.width || 0) * (layer.scaleX || 1),
          height: (layer.imageProps?.height || 0) * (layer.scaleY || 1),
        }
      default:
        // TODO: Implement for other types
        return null
    }
  },
})
