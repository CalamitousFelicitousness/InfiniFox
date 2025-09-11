/**
 * InfiniFox Layer System - Store Slice
 * Phase 1: Single Image Layer Enhancement with Memory Management
 */

import type { StateCreator } from 'zustand';
import type Konva from 'konva';
import type {
  ImageLayerData,
  LayerSelection,
  LayerResource,
  LayerBounds,
  ImageFilter,
  ImageAdjustments,
  Transform
} from '../../types/layers';
import {
  createDefaultImageAdjustments,
  createDefaultTransform,
  isImageLayer,
  calculateLayerBounds
} from '../../types/layers';
import type { Store } from '../types';

// Define CleanupEntry locally to avoid import issues
interface CleanupEntry {
  layerId: string;
  resources: LayerResource[];
  scheduledAt: number;
}

// Layer slice state interface
export interface LayerSlice {
  // State
  imageLayers: Map<string, ImageLayerData>;
  layerOrder: string[]; // Ordered layer IDs for z-index
  selection: LayerSelection;
  
  // Resource management
  blobUrlRegistry: Map<string, Set<string>>; // layerId -> blob URLs
  nodeRegistry: WeakMap<object, Konva.Node>; // WeakMap for node references
  cleanupQueue: Set<CleanupEntry>;
  cacheManager: Map<string, { canvas: HTMLCanvasElement; dirty: boolean }>;
  
  // Actions - Layer Management
  addImageLayer: (imageId: string, imageSrc: string, dimensions: {
    width: number;
    height: number;
    naturalWidth: number;
    naturalHeight: number;
  }, parentId?: string | null) => string;
  
  removeLayer: (layerId: string) => void;
  duplicateLayer: (layerId: string) => string | null;
  
  // Actions - Layer Properties
  updateLayer: (layerId: string, updates: Partial<ImageLayerData>) => void;
  setLayerVisibility: (layerId: string, visible: boolean) => void;
  setLayerOpacity: (layerId: string, opacity: number) => void;
  setLayerBlendMode: (layerId: string, blendMode: GlobalCompositeOperation) => void;
  lockLayer: (layerId: string, locked: boolean) => void;
  renameLayer: (layerId: string, name: string) => void;
  
  // Actions - Transform
  updateLayerTransform: (layerId: string, transform: Partial<Transform>) => void;
  resetLayerTransform: (layerId: string) => void;
  
  // Actions - Filters & Adjustments
  updateLayerFilters: (layerId: string, filters: ImageFilter[]) => void;
  updateLayerAdjustments: (layerId: string, adjustments: Partial<ImageAdjustments>) => void;
  resetLayerEffects: (layerId: string) => void;
  
  // Actions - Layer Order
  moveLayer: (layerId: string, newIndex: number) => void;
  moveLayerUp: (layerId: string) => void;
  moveLayerDown: (layerId: string) => void;
  bringToFront: (layerId: string) => void;
  sendToBack: (layerId: string) => void;
  
  // Actions - Selection
  selectLayer: (layerId: string, multi?: boolean) => void;
  selectLayers: (layerIds: string[]) => void;
  clearSelection: () => void;
  selectAll: () => void;
  
  // Actions - Resource Management
  registerBlobUrl: (layerId: string, url: string) => void;
  unregisterBlobUrl: (layerId: string, url: string) => void;
  registerNode: (layerId: string, node: Konva.Node) => void;
  scheduleCleanup: (layerId: string) => void;
  performCleanup: () => void;
  clearCache: (layerId: string) => void;
  
  // Actions - Batch Operations
  batchUpdateLayers: (updates: Map<string, Partial<ImageLayerData>>) => void;
  mergeLayers: (layerIds: string[]) => string | null;
  
  // Queries
  getLayerById: (layerId: string) => ImageLayerData | undefined;
  getSelectedLayers: () => ImageLayerData[];
  getVisibleLayers: () => ImageLayerData[];
  getLayersInBounds: (bounds: LayerBounds) => ImageLayerData[];
  getLayerBounds: (layerId: string) => LayerBounds | null;
}

// Helper functions
const generateLayerName = (index: number, type: string = 'Image'): string => 
  `${type} Layer ${index + 1}`;

const cleanupLayerResources = (
  layerId: string,
  blobUrlRegistry: Map<string, Set<string>>
): void => {
  // Revoke all blob URLs for this layer
  const urls = blobUrlRegistry.get(layerId);
  if (urls) {
    urls.forEach(url => {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        console.warn(`Failed to revoke blob URL: ${url}`, e);
      }
    });
    blobUrlRegistry.delete(layerId);
  }
};

// Create the layer slice
export const createLayerSlice: StateCreator<
  Store,
  [],
  [],
  LayerSlice
> = (set, get) => ({
  // Initial state
  imageLayers: new Map(),
  layerOrder: [],
  selection: {
    layerIds: [],
    primary: null
  },
  blobUrlRegistry: new Map(),
  nodeRegistry: new WeakMap(),
  cleanupQueue: new Set(),
  cacheManager: new Map(),
  
  // Layer Management
  addImageLayer: (imageId, imageSrc, dimensions, parentId = null) => {
    const layerId = `layer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const state = get();
    
    const newLayer: ImageLayerData = {
      id: layerId,
      type: 'image',
      name: generateLayerName(state.layerOrder.length),
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'source-over',
      
      transform: createDefaultTransform(),
      
      parentId,
      zIndex: state.layerOrder.length,
      
      imageId,
      imageSrc,
      width: dimensions.width,
      height: dimensions.height,
      naturalWidth: dimensions.naturalWidth,
      naturalHeight: dimensions.naturalHeight,
      
      filters: [],
      adjustments: createDefaultImageAdjustments(),
      
      cached: false,
      
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    // Register blob URL if it's one
    if (imageSrc.startsWith('blob:')) {
      get().registerBlobUrl(layerId, imageSrc);
    }
    
    set(state => ({
      imageLayers: new Map(state.imageLayers).set(layerId, newLayer),
      layerOrder: [...state.layerOrder, layerId]
    }));
    
    return layerId;
  },
  
  removeLayer: (layerId) => {
    const state = get();
    const layer = state.imageLayers.get(layerId);
    if (!layer) return;
    
    // Schedule cleanup
    get().scheduleCleanup(layerId);
    
    // Remove from state
    const newLayers = new Map(state.imageLayers);
    newLayers.delete(layerId);
    
    const newOrder = state.layerOrder.filter(id => id !== layerId);
    const newSelection = {
      layerIds: state.selection.layerIds.filter(id => id !== layerId),
      primary: state.selection.primary === layerId ? null : state.selection.primary
    };
    
    set({
      imageLayers: newLayers,
      layerOrder: newOrder,
      selection: newSelection
    });
    
    // Perform cleanup immediately
    get().performCleanup();
  },
  
  duplicateLayer: (layerId) => {
    const state = get();
    const layer = state.imageLayers.get(layerId);
    if (!layer) return null;
    
    const newLayerId = `layer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const layerIndex = state.layerOrder.indexOf(layerId);
    
    const duplicatedLayer: ImageLayerData = {
      ...layer,
      id: newLayerId,
      name: `${layer.name} Copy`,
      transform: { ...layer.transform },
      filters: [...layer.filters],
      adjustments: { ...layer.adjustments },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      cached: false,
      cacheId: undefined
    };
    
    // Register blob URL for duplicate
    if (layer.imageSrc.startsWith('blob:')) {
      get().registerBlobUrl(newLayerId, layer.imageSrc);
    }
    
    const newLayers = new Map(state.imageLayers).set(newLayerId, duplicatedLayer);
    const newOrder = [...state.layerOrder];
    newOrder.splice(layerIndex + 1, 0, newLayerId);
    
    set({
      imageLayers: newLayers,
      layerOrder: newOrder
    });
    
    return newLayerId;
  },
  
  // Layer Properties
  updateLayer: (layerId, updates) => {
    set(state => {
      const layer = state.imageLayers.get(layerId);
      if (!layer) return state;
      
      const updatedLayer = {
        ...layer,
        ...updates,
        updatedAt: Date.now()
      };
      
      return {
        imageLayers: new Map(state.imageLayers).set(layerId, updatedLayer)
      };
    });
  },
  
  setLayerVisibility: (layerId, visible) => {
    get().updateLayer(layerId, { visible });
  },
  
  setLayerOpacity: (layerId, opacity) => {
    get().updateLayer(layerId, { opacity: Math.max(0, Math.min(1, opacity)) });
  },
  
  setLayerBlendMode: (layerId, blendMode) => {
    get().updateLayer(layerId, { blendMode });
  },
  
  lockLayer: (layerId, locked) => {
    get().updateLayer(layerId, { locked });
  },
  
  renameLayer: (layerId, name) => {
    get().updateLayer(layerId, { name });
  },
  
  // Transform
  updateLayerTransform: (layerId, transform) => {
    const layer = get().imageLayers.get(layerId);
    if (!layer) return;
    
    get().updateLayer(layerId, {
      transform: {
        ...layer.transform,
        ...transform
      }
    });
  },
  
  resetLayerTransform: (layerId) => {
    get().updateLayer(layerId, {
      transform: createDefaultTransform()
    });
  },
  
  // Filters & Adjustments
  updateLayerFilters: (layerId, filters) => {
    get().updateLayer(layerId, { filters, cached: false });
    get().clearCache(layerId);
  },
  
  updateLayerAdjustments: (layerId, adjustments) => {
    const layer = get().imageLayers.get(layerId);
    if (!layer) return;
    
    get().updateLayer(layerId, {
      adjustments: {
        ...layer.adjustments,
        ...adjustments
      },
      cached: false
    });
    get().clearCache(layerId);
  },
  
  resetLayerEffects: (layerId) => {
    get().updateLayer(layerId, {
      filters: [],
      adjustments: createDefaultImageAdjustments(),
      cached: false
    });
    get().clearCache(layerId);
  },
  
  // Layer Order
  moveLayer: (layerId, newIndex) => {
    set(state => {
      const currentIndex = state.layerOrder.indexOf(layerId);
      if (currentIndex === -1) return state;
      
      const newOrder = [...state.layerOrder];
      newOrder.splice(currentIndex, 1);
      newOrder.splice(newIndex, 0, layerId);
      
      // Update z-indices
      const updatedLayers = new Map(state.imageLayers);
      newOrder.forEach((id, index) => {
        const layer = updatedLayers.get(id);
        if (layer) {
          updatedLayers.set(id, { ...layer, zIndex: index });
        }
      });
      
      return {
        layerOrder: newOrder,
        imageLayers: updatedLayers
      };
    });
  },
  
  moveLayerUp: (layerId) => {
    const index = get().layerOrder.indexOf(layerId);
    if (index > 0) {
      get().moveLayer(layerId, index - 1);
    }
  },
  
  moveLayerDown: (layerId) => {
    const state = get();
    const index = state.layerOrder.indexOf(layerId);
    if (index < state.layerOrder.length - 1) {
      get().moveLayer(layerId, index + 1);
    }
  },
  
  bringToFront: (layerId) => {
    const state = get();
    get().moveLayer(layerId, state.layerOrder.length - 1);
  },
  
  sendToBack: (layerId) => {
    get().moveLayer(layerId, 0);
  },
  
  // Selection
  selectLayer: (layerId, multi = false) => {
    set(state => {
      if (!state.imageLayers.has(layerId)) return state;
      
      if (multi) {
        const layerIds = state.selection.layerIds.includes(layerId)
          ? state.selection.layerIds.filter(id => id !== layerId)
          : [...state.selection.layerIds, layerId];
        
        return {
          selection: {
            layerIds,
            primary: layerIds.length > 0 ? layerId : null
          }
        };
      }
      
      return {
        selection: {
          layerIds: [layerId],
          primary: layerId
        }
      };
    });
  },
  
  selectLayers: (layerIds) => {
    set({
      selection: {
        layerIds,
        primary: layerIds.length > 0 ? layerIds[layerIds.length - 1] : null
      }
    });
  },
  
  clearSelection: () => {
    set({
      selection: {
        layerIds: [],
        primary: null
      }
    });
  },
  
  selectAll: () => {
    const state = get();
    set({
      selection: {
        layerIds: state.layerOrder,
        primary: state.layerOrder[state.layerOrder.length - 1] || null
      }
    });
  },
  
  // Resource Management
  registerBlobUrl: (layerId, url) => {
    set(state => {
      const registry = new Map(state.blobUrlRegistry);
      const urls = registry.get(layerId) || new Set();
      urls.add(url);
      registry.set(layerId, urls);
      
      return { blobUrlRegistry: registry };
    });
  },
  
  unregisterBlobUrl: (layerId, url) => {
    set(state => {
      const registry = new Map(state.blobUrlRegistry);
      const urls = registry.get(layerId);
      if (urls) {
        urls.delete(url);
        if (urls.size === 0) {
          registry.delete(layerId);
        }
      }
      
      return { blobUrlRegistry: registry };
    });
  },
  
  registerNode: (layerId, node) => {
    const state = get();
    state.nodeRegistry.set({ layerId }, node);
  },
  
  scheduleCleanup: (layerId) => {
    const state = get();
    const resources: LayerResource[] = [];
    
    // Collect blob URLs
    const urls = state.blobUrlRegistry.get(layerId);
    if (urls) {
      urls.forEach(url => {
        resources.push({ type: 'blob', id: url, url });
      });
    }
    
    // Add to cleanup queue
    set(state => ({
      cleanupQueue: new Set([...state.cleanupQueue, {
        layerId,
        resources,
        scheduledAt: Date.now()
      }])
    }));
  },
  
  performCleanup: () => {
    const state = get();
    const now = Date.now();
    const CLEANUP_DELAY = 100; // 100ms delay before cleanup
    
    state.cleanupQueue.forEach(entry => {
      if (now - entry.scheduledAt > CLEANUP_DELAY) {
        // Cleanup resources
        entry.resources.forEach(resource => {
          if (resource.type === 'blob' && resource.url) {
            try {
              URL.revokeObjectURL(resource.url);
            } catch (e) {
              console.warn('Failed to revoke blob URL:', e);
            }
          }
        });
        
        // Clear cache
        state.cacheManager.delete(entry.layerId);
        
        // Remove from queue
        state.cleanupQueue.delete(entry);
      }
    });
    
    set({ cleanupQueue: new Set(state.cleanupQueue) });
  },
  
  clearCache: (layerId) => {
    const state = get();
    const cache = state.cacheManager.get(layerId);
    if (cache) {
      cache.dirty = true;
    }
  },
  
  // Batch Operations
  batchUpdateLayers: (updates) => {
    set(state => {
      const newLayers = new Map(state.imageLayers);
      const now = Date.now();
      
      updates.forEach((update, layerId) => {
        const existing = newLayers.get(layerId);
        if (existing) {
          newLayers.set(layerId, {
            ...existing,
            ...update,
            updatedAt: now
          });
        }
      });
      
      return { imageLayers: newLayers };
    });
  },
  
  mergeLayers: (layerIds) => {
    // TODO: Implement layer merging
    console.warn('Layer merging not yet implemented');
    return null;
  },
  
  // Queries
  getLayerById: (layerId) => {
    return get().imageLayers.get(layerId);
  },
  
  getSelectedLayers: () => {
    const state = get();
    return state.selection.layerIds
      .map(id => state.imageLayers.get(id))
      .filter(Boolean) as ImageLayerData[];
  },
  
  getVisibleLayers: () => {
    const state = get();
    return state.layerOrder
      .map(id => state.imageLayers.get(id))
      .filter(layer => layer && layer.visible) as ImageLayerData[];
  },
  
  getLayersInBounds: (bounds) => {
    const state = get();
    const layers: ImageLayerData[] = [];
    
    state.layerOrder.forEach(id => {
      const layer = state.imageLayers.get(id);
      if (layer && layer.visible) {
        const layerBounds = calculateLayerBounds(layer);
        
        // Check intersection
        if (
          layerBounds.x < bounds.x + bounds.width &&
          layerBounds.x + layerBounds.width > bounds.x &&
          layerBounds.y < bounds.y + bounds.height &&
          layerBounds.y + layerBounds.height > bounds.y
        ) {
          layers.push(layer);
        }
      }
    });
    
    return layers;
  },
  
  getLayerBounds: (layerId) => {
    const layer = get().imageLayers.get(layerId);
    return layer ? calculateLayerBounds(layer) : null;
  }
});
