/**
 * InfiniFox Subcanvas Store Slice
 * Phase 2: Subcanvas/Artboard Implementation
 */

import type { StateCreator } from 'zustand';
import type Konva from 'konva';
import type { 
  SubcanvasData, 
  SubcanvasSelection, 
  ExportSettings 
} from '../../types/subcanvas';
import {
  createDefaultSubcanvasTransform,
  createDefaultExportSettings,
  calculateSubcanvasBounds,
  getAllChildIds,
  canMoveToSubcanvas
} from '../../types/subcanvas';
import type { Store } from '../types';

interface SubcanvasResource {
  type: 'cache' | 'export';
  id: string;
  data?: any;
}

export interface SubcanvasSlice {
  // State
  subcanvases: Map<string, SubcanvasData>;
  subcanvasOrder: string[]; // Root level subcanvases
  subcanvasSelection: SubcanvasSelection;
  activeSubcanvasId: string | null; // Currently focused/editing subcanvas
  
  // Resource management
  subcanvasNodeRegistry: WeakMap<object, Konva.Group>;
  subcanvasCacheRegistry: Map<string, HTMLCanvasElement>;
  
  // Actions - CRUD
  createSubcanvas: (
    width: number, 
    height: number, 
    name?: string,
    parentId?: string | null
  ) => string;
  
  deleteSubcanvas: (subcanvasId: string, deleteChildren?: boolean) => void;
  duplicateSubcanvas: (subcanvasId: string, includeChildren?: boolean) => string;
  updateSubcanvas: (subcanvasId: string, updates: Partial<SubcanvasData>) => void;
  
  // Actions - Hierarchy
  addLayerToSubcanvas: (layerId: string, subcanvasId: string) => void;
  removeLayerFromSubcanvas: (layerId: string, subcanvasId: string) => void;
  moveLayerBetweenSubcanvases: (layerId: string, fromId: string, toId: string | null) => void;
  
  addSubcanvasToParent: (subcanvasId: string, parentId: string) => void;
  removeSubcanvasFromParent: (subcanvasId: string) => void;
  moveSubcanvas: (subcanvasId: string, newParentId: string | null) => boolean;
  
  reorderLayersInSubcanvas: (subcanvasId: string, layerIds: string[]) => void;
  reorderSubcanvasChildren: (parentId: string, childIds: string[]) => void;
  
  // Actions - Visibility & State
  toggleSubcanvasVisibility: (subcanvasId: string) => void;
  collapseSubcanvas: (subcanvasId: string, collapsed: boolean) => void;
  setActiveSubcanvas: (subcanvasId: string | null) => void;
  lockSubcanvas: (subcanvasId: string, locked: boolean) => void;
  
  // Actions - Transform
  updateSubcanvasTransform: (subcanvasId: string, transform: Partial<SubcanvasData['transform']>) => void;
  resetSubcanvasTransform: (subcanvasId: string) => void;
  fitSubcanvasToContent: (subcanvasId: string) => void;
  
  // Actions - Canvas Properties
  setSubcanvasBackground: (subcanvasId: string, color: string | undefined) => void;
  setSubcanvasClipping: (subcanvasId: string, clip: boolean) => void;
  setSubcanvasBounds: (subcanvasId: string, bounds: SubcanvasData['bounds']) => void;
  updateSubcanvasExportSettings: (subcanvasId: string, settings: Partial<ExportSettings>) => void;
  
  // Actions - Selection
  selectSubcanvas: (subcanvasId: string, multi?: boolean) => void;
  selectSubcanvases: (subcanvasIds: string[]) => void;
  clearSubcanvasSelection: () => void;
  
  // Actions - Operations
  flattenSubcanvas: (subcanvasId: string) => string | null; // Returns new layer ID
  mergeSubcanvases: (subcanvasIds: string[]) => string | null;
  exportSubcanvas: (subcanvasId: string, settings?: ExportSettings) => Promise<Blob>;
  cacheSubcanvas: (subcanvasId: string) => void;
  clearSubcanvasCache: (subcanvasId: string) => void;
  
  // Queries
  getSubcanvasById: (subcanvasId: string) => SubcanvasData | undefined;
  getRootSubcanvases: () => SubcanvasData[];
  getSubcanvasChildren: (subcanvasId: string) => { layers: string[]; subcanvases: SubcanvasData[] };
  getSubcanvasAncestors: (subcanvasId: string) => string[];
  isSubcanvasAncestor: (ancestorId: string, descendantId: string) => boolean;
  getSubcanvasesInBounds: (bounds: { x: number; y: number; width: number; height: number }) => SubcanvasData[];
}

// Helper functions
const generateSubcanvasId = (): string => 
  `subcanvas_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const generateSubcanvasName = (index: number): string => 
  `Artboard ${index + 1}`;

const removeFromParent = (
  subcanvasId: string, 
  subcanvases: Map<string, SubcanvasData>
): Map<string, SubcanvasData> => {
  const updatedSubcanvases = new Map(subcanvases);
  
  updatedSubcanvases.forEach(s => {
    if (s.childSubcanvasIds.includes(subcanvasId)) {
      updatedSubcanvases.set(s.id, {
        ...s,
        childSubcanvasIds: s.childSubcanvasIds.filter(id => id !== subcanvasId)
      });
    }
  });
  
  return updatedSubcanvases;
};

export const createSubcanvasSlice: StateCreator<
  Store,
  [],
  [],
  SubcanvasSlice
> = (set, get) => ({
  // Initial state
  subcanvases: new Map(),
  subcanvasOrder: [],
  subcanvasSelection: {
    subcanvasIds: [],
    primary: null
  },
  activeSubcanvasId: null,
  subcanvasNodeRegistry: new WeakMap(),
  subcanvasCacheRegistry: new Map(),
  
  // CRUD Operations
  createSubcanvas: (width, height, name, parentId = null) => {
    const id = generateSubcanvasId();
    const state = get();
    const index = parentId ? 
      state.subcanvases.get(parentId)?.childSubcanvasIds.length || 0 :
      state.subcanvasOrder.length;
    
    const newSubcanvas: SubcanvasData = {
      id,
      type: 'subcanvas',
      name: name || generateSubcanvasName(index),
      visible: true,
      locked: false,
      collapsed: false,
      opacity: 1,
      blendMode: 'source-over',
      
      width,
      height,
      backgroundColor: undefined,
      
      transform: createDefaultSubcanvasTransform(),
      
      parentId,
      childLayerIds: [],
      childSubcanvasIds: [],
      
      clipContent: false,
      showBounds: true,
      exportSettings: createDefaultExportSettings(),
      
      cached: false,
      
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    set(state => {
      const newSubcanvases = new Map(state.subcanvases).set(id, newSubcanvas);
      
      if (parentId) {
        const parent = newSubcanvases.get(parentId);
        if (parent) {
          newSubcanvases.set(parentId, {
            ...parent,
            childSubcanvasIds: [...parent.childSubcanvasIds, id]
          });
        }
      } else {
        return {
          subcanvases: newSubcanvases,
          subcanvasOrder: [...state.subcanvasOrder, id]
        };
      }
      
      return { subcanvases: newSubcanvases };
    });
    
    return id;
  },
  
  deleteSubcanvas: (subcanvasId, deleteChildren = false) => {
    const state = get();
    const subcanvas = state.subcanvases.get(subcanvasId);
    if (!subcanvas) return;
    
    set(state => {
      let newSubcanvases = new Map(state.subcanvases);
      
      if (deleteChildren) {
        // Recursively delete all children
        const { layerIds, subcanvasIds } = getAllChildIds(subcanvas, state.subcanvases);
        
        // Delete child subcanvases
        subcanvasIds.forEach(id => newSubcanvases.delete(id));
        
        // Note: Layer deletion should be handled by the layer slice
        // We'll need to coordinate this in the integration phase
      } else {
        // Move children to parent
        const parentId = subcanvas.parentId;
        
        if (parentId) {
          const parent = newSubcanvases.get(parentId);
          if (parent) {
            newSubcanvases.set(parentId, {
              ...parent,
              childLayerIds: [...parent.childLayerIds, ...subcanvas.childLayerIds],
              childSubcanvasIds: parent.childSubcanvasIds
                .filter(id => id !== subcanvasId)
                .concat(subcanvas.childSubcanvasIds)
            });
          }
        }
        
        // Update children's parentId
        subcanvas.childSubcanvasIds.forEach(childId => {
          const child = newSubcanvases.get(childId);
          if (child) {
            newSubcanvases.set(childId, {
              ...child,
              parentId: subcanvas.parentId
            });
          }
        });
      }
      
      // Remove from parent
      newSubcanvases = removeFromParent(subcanvasId, newSubcanvases);
      
      // Delete the subcanvas
      newSubcanvases.delete(subcanvasId);
      
      // Update order if root level
      const newOrder = state.subcanvasOrder.filter(id => id !== subcanvasId);
      
      // Clear cache
      state.subcanvasCacheRegistry.delete(subcanvasId);
      
      return {
        subcanvases: newSubcanvases,
        subcanvasOrder: newOrder,
        activeSubcanvasId: state.activeSubcanvasId === subcanvasId ? null : state.activeSubcanvasId
      };
    });
  },
  
  duplicateSubcanvas: (subcanvasId, includeChildren = true) => {
    const state = get();
    const original = state.subcanvases.get(subcanvasId);
    if (!original) return '';
    
    const newId = generateSubcanvasId();
    
    const duplicate: SubcanvasData = {
      ...original,
      id: newId,
      name: `${original.name} Copy`,
      childLayerIds: includeChildren ? [...original.childLayerIds] : [],
      childSubcanvasIds: [], // Will be populated if including children
      transform: { ...original.transform },
      bounds: original.bounds ? { ...original.bounds } : undefined,
      exportSettings: original.exportSettings ? { ...original.exportSettings } : undefined,
      cached: false,
      cacheId: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    set(state => {
      const newSubcanvases = new Map(state.subcanvases).set(newId, duplicate);
      
      if (includeChildren) {
        // Recursively duplicate child subcanvases
        const childMapping = new Map<string, string>();
        
        original.childSubcanvasIds.forEach(childId => {
          const newChildId = get().duplicateSubcanvas(childId, true);
          childMapping.set(childId, newChildId);
        });
        
        // Update the duplicate with new child IDs
        duplicate.childSubcanvasIds = Array.from(childMapping.values());
        newSubcanvases.set(newId, duplicate);
      }
      
      // Add to parent or root
      if (original.parentId) {
        const parent = newSubcanvases.get(original.parentId);
        if (parent) {
          const index = parent.childSubcanvasIds.indexOf(subcanvasId);
          const newChildren = [...parent.childSubcanvasIds];
          newChildren.splice(index + 1, 0, newId);
          
          newSubcanvases.set(original.parentId, {
            ...parent,
            childSubcanvasIds: newChildren
          });
        }
      } else {
        const index = state.subcanvasOrder.indexOf(subcanvasId);
        const newOrder = [...state.subcanvasOrder];
        newOrder.splice(index + 1, 0, newId);
        
        return {
          subcanvases: newSubcanvases,
          subcanvasOrder: newOrder
        };
      }
      
      return { subcanvases: newSubcanvases };
    });
    
    return newId;
  },
  
  updateSubcanvas: (subcanvasId, updates) => {
    set(state => {
      const subcanvas = state.subcanvases.get(subcanvasId);
      if (!subcanvas) return state;
      
      const updated = {
        ...subcanvas,
        ...updates,
        updatedAt: Date.now()
      };
      
      // Clear cache if visual properties changed
      if (
        updates.opacity !== undefined ||
        updates.blendMode !== undefined ||
        updates.backgroundColor !== undefined ||
        updates.transform !== undefined
      ) {
        updated.cached = false;
        state.subcanvasCacheRegistry.delete(subcanvasId);
      }
      
      return {
        subcanvases: new Map(state.subcanvases).set(subcanvasId, updated)
      };
    });
  },
  
  // Hierarchy Management
  addLayerToSubcanvas: (layerId, subcanvasId) => {
    set(state => {
      const subcanvas = state.subcanvases.get(subcanvasId);
      if (!subcanvas || subcanvas.childLayerIds.includes(layerId)) return state;
      
      return {
        subcanvases: new Map(state.subcanvases).set(subcanvasId, {
          ...subcanvas,
          childLayerIds: [...subcanvas.childLayerIds, layerId],
          updatedAt: Date.now()
        })
      };
    });
  },
  
  removeLayerFromSubcanvas: (layerId, subcanvasId) => {
    set(state => {
      const subcanvas = state.subcanvases.get(subcanvasId);
      if (!subcanvas) return state;
      
      return {
        subcanvases: new Map(state.subcanvases).set(subcanvasId, {
          ...subcanvas,
          childLayerIds: subcanvas.childLayerIds.filter(id => id !== layerId),
          updatedAt: Date.now()
        })
      };
    });
  },
  
  moveLayerBetweenSubcanvases: (layerId, fromId, toId) => {
    const state = get();
    
    // Remove from source
    if (fromId) {
      get().removeLayerFromSubcanvas(layerId, fromId);
    }
    
    // Add to destination
    if (toId) {
      get().addLayerToSubcanvas(layerId, toId);
    }
    
    // Update layer's parentId (should be coordinated with layer slice)
  },
  
  addSubcanvasToParent: (subcanvasId, parentId) => {
    const state = get();
    if (!canMoveToSubcanvas(subcanvasId, parentId, state.subcanvases)) return;
    
    set(state => {
      const parent = state.subcanvases.get(parentId);
      const child = state.subcanvases.get(subcanvasId);
      if (!parent || !child) return state;
      
      const newSubcanvases = new Map(state.subcanvases);
      
      // Add to new parent
      newSubcanvases.set(parentId, {
        ...parent,
        childSubcanvasIds: [...parent.childSubcanvasIds, subcanvasId]
      });
      
      // Update child's parentId
      newSubcanvases.set(subcanvasId, {
        ...child,
        parentId
      });
      
      return { subcanvases: newSubcanvases };
    });
  },
  
  removeSubcanvasFromParent: (subcanvasId) => {
    set(state => {
      const subcanvas = state.subcanvases.get(subcanvasId);
      if (!subcanvas || !subcanvas.parentId) return state;
      
      const newSubcanvases = removeFromParent(subcanvasId, state.subcanvases);
      
      // Update the subcanvas
      newSubcanvases.set(subcanvasId, {
        ...subcanvas,
        parentId: null
      });
      
      // Add to root level
      return {
        subcanvases: newSubcanvases,
        subcanvasOrder: [...state.subcanvasOrder, subcanvasId]
      };
    });
  },
  
  moveSubcanvas: (subcanvasId, newParentId) => {
    const state = get();
    const subcanvas = state.subcanvases.get(subcanvasId);
    if (!subcanvas) return false;
    
    // Validate move
    if (newParentId && !canMoveToSubcanvas(subcanvasId, newParentId, state.subcanvases)) {
      return false;
    }
    
    // Remove from current parent
    if (subcanvas.parentId) {
      get().removeSubcanvasFromParent(subcanvasId);
    }
    
    // Add to new parent
    if (newParentId) {
      get().addSubcanvasToParent(subcanvasId, newParentId);
    }
    
    return true;
  },
  
  reorderLayersInSubcanvas: (subcanvasId, layerIds) => {
    get().updateSubcanvas(subcanvasId, { childLayerIds: layerIds });
  },
  
  reorderSubcanvasChildren: (parentId, childIds) => {
    get().updateSubcanvas(parentId, { childSubcanvasIds: childIds });
  },
  
  // Visibility & State
  toggleSubcanvasVisibility: (subcanvasId) => {
    const subcanvas = get().subcanvases.get(subcanvasId);
    if (subcanvas) {
      get().updateSubcanvas(subcanvasId, { visible: !subcanvas.visible });
    }
  },
  
  collapseSubcanvas: (subcanvasId, collapsed) => {
    get().updateSubcanvas(subcanvasId, { collapsed });
  },
  
  setActiveSubcanvas: (subcanvasId) => {
    set({ activeSubcanvasId: subcanvasId });
  },
  
  lockSubcanvas: (subcanvasId, locked) => {
    get().updateSubcanvas(subcanvasId, { locked });
  },
  
  // Transform
  updateSubcanvasTransform: (subcanvasId, transform) => {
    const subcanvas = get().subcanvases.get(subcanvasId);
    if (!subcanvas) return;
    
    get().updateSubcanvas(subcanvasId, {
      transform: {
        ...subcanvas.transform,
        ...transform
      }
    });
  },
  
  resetSubcanvasTransform: (subcanvasId) => {
    get().updateSubcanvas(subcanvasId, {
      transform: createDefaultSubcanvasTransform()
    });
  },
  
  fitSubcanvasToContent: (subcanvasId) => {
    // TODO: Calculate bounds of all children and resize
    console.warn('fitSubcanvasToContent not yet implemented');
  },
  
  // Canvas Properties
  setSubcanvasBackground: (subcanvasId, color) => {
    get().updateSubcanvas(subcanvasId, { backgroundColor: color });
  },
  
  setSubcanvasClipping: (subcanvasId, clip) => {
    get().updateSubcanvas(subcanvasId, { clipContent: clip });
  },
  
  setSubcanvasBounds: (subcanvasId, bounds) => {
    get().updateSubcanvas(subcanvasId, { bounds });
  },
  
  updateSubcanvasExportSettings: (subcanvasId, settings) => {
    const subcanvas = get().subcanvases.get(subcanvasId);
    if (!subcanvas) return;
    
    get().updateSubcanvas(subcanvasId, {
      exportSettings: {
        ...subcanvas.exportSettings,
        ...settings
      } as ExportSettings
    });
  },
  
  // Selection
  selectSubcanvas: (subcanvasId, multi = false) => {
    set(state => {
      if (!state.subcanvases.has(subcanvasId)) return state;
      
      if (multi) {
        const ids = state.subcanvasSelection.subcanvasIds.includes(subcanvasId)
          ? state.subcanvasSelection.subcanvasIds.filter(id => id !== subcanvasId)
          : [...state.subcanvasSelection.subcanvasIds, subcanvasId];
        
        return {
          subcanvasSelection: {
            subcanvasIds: ids,
            primary: ids.length > 0 ? subcanvasId : null
          }
        };
      }
      
      return {
        subcanvasSelection: {
          subcanvasIds: [subcanvasId],
          primary: subcanvasId
        }
      };
    });
  },
  
  selectSubcanvases: (subcanvasIds) => {
    set({
      subcanvasSelection: {
        subcanvasIds,
        primary: subcanvasIds.length > 0 ? subcanvasIds[subcanvasIds.length - 1] : null
      }
    });
  },
  
  clearSubcanvasSelection: () => {
    set({
      subcanvasSelection: {
        subcanvasIds: [],
        primary: null
      }
    });
  },
  
  // Operations
  flattenSubcanvas: (subcanvasId) => {
    // TODO: Implement flattening to a single image layer
    console.warn('flattenSubcanvas not yet implemented');
    return null;
  },
  
  mergeSubcanvases: (subcanvasIds) => {
    // TODO: Implement merging multiple subcanvases
    console.warn('mergeSubcanvases not yet implemented');
    return null;
  },
  
  exportSubcanvas: async (subcanvasId, settings) => {
    // TODO: Implement export functionality
    console.warn('exportSubcanvas not yet implemented');
    return new Blob();
  },
  
  cacheSubcanvas: (subcanvasId) => {
    // TODO: Implement caching
    const subcanvas = get().subcanvases.get(subcanvasId);
    if (subcanvas) {
      get().updateSubcanvas(subcanvasId, { cached: true });
    }
  },
  
  clearSubcanvasCache: (subcanvasId) => {
    const state = get();
    state.subcanvasCacheRegistry.delete(subcanvasId);
    get().updateSubcanvas(subcanvasId, { cached: false });
  },
  
  // Queries
  getSubcanvasById: (subcanvasId) => {
    return get().subcanvases.get(subcanvasId);
  },
  
  getRootSubcanvases: () => {
    const state = get();
    return state.subcanvasOrder
      .map(id => state.subcanvases.get(id))
      .filter(Boolean) as SubcanvasData[];
  },
  
  getSubcanvasChildren: (subcanvasId) => {
    const state = get();
    const subcanvas = state.subcanvases.get(subcanvasId);
    if (!subcanvas) return { layers: [], subcanvases: [] };
    
    const subcanvases = subcanvas.childSubcanvasIds
      .map(id => state.subcanvases.get(id))
      .filter(Boolean) as SubcanvasData[];
    
    return {
      layers: subcanvas.childLayerIds,
      subcanvases
    };
  },
  
  getSubcanvasAncestors: (subcanvasId) => {
    const ancestors: string[] = [];
    const state = get();
    let current = state.subcanvases.get(subcanvasId);
    
    while (current?.parentId) {
      ancestors.push(current.parentId);
      current = state.subcanvases.get(current.parentId);
    }
    
    return ancestors;
  },
  
  isSubcanvasAncestor: (ancestorId, descendantId) => {
    const ancestors = get().getSubcanvasAncestors(descendantId);
    return ancestors.includes(ancestorId);
  },
  
  getSubcanvasesInBounds: (bounds) => {
    const state = get();
    const result: SubcanvasData[] = [];
    
    state.subcanvases.forEach(subcanvas => {
      if (!subcanvas.visible) return;
      
      const sBounds = calculateSubcanvasBounds(subcanvas);
      
      // Check intersection
      if (
        sBounds.x < bounds.x + bounds.width &&
        sBounds.x + sBounds.width > bounds.x &&
        sBounds.y < bounds.y + bounds.height &&
        sBounds.y + sBounds.height > bounds.y
      ) {
        result.push(subcanvas);
      }
    });
    
    return result;
  }
});
