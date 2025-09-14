import type { StateCreator } from 'zustand';
import { produce } from 'immer';
import type { CanvasSlice } from './canvasSlice';
import type { SelectionSlice } from './selectionSlice';

export interface Group {
  id: string;
  name: string;
  itemIds: Set<string>;
  parentGroupId?: string;
  createdAt: number;
  locked: boolean;
}

export interface Transform {
  x?: number;
  y?: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
}

export interface GroupingSlice {
  groups: Map<string, Group>;
  
  // Group Management
  createGroup: (ids: string[], name?: string) => string;
  dissolveGroup: (groupId: string) => void;
  addToGroup: (groupId: string, itemIds: string[]) => void;
  removeFromGroup: (groupId: string, itemIds: string[]) => void;
  
  // Group Operations
  moveGroup: (groupId: string, deltaX: number, deltaY: number) => void;
  transformGroup: (groupId: string, transform: Transform) => void;
  duplicateGroup: (groupId: string) => string;
  
  // Nested Groups
  createNestedGroup: (parentGroupId: string, childIds: string[]) => string;
  flattenGroup: (groupId: string) => void;
  
  // Group Properties
  renameGroup: (groupId: string, name: string) => void;
  lockGroup: (groupId: string, locked: boolean) => void;
  
  // Utilities
  getGroupItems: (groupId: string) => string[];
  getItemGroup: (itemId: string) => string | null;
  isGrouped: (itemId: string) => boolean;
  getAllGroups: () => Group[];
  
  // Persistence
  saveGroupsToStorage: () => void;
  loadGroupsFromStorage: () => void;
}

type SliceTypes = CanvasSlice & SelectionSlice & GroupingSlice;

export const createGroupingSlice: StateCreator<
  SliceTypes,
  [],
  [],
  GroupingSlice
> = (set, get) => ({
  groups: new Map<string, Group>(),

  createGroup: (ids: string[], name?: string): string => {
    const groupId = `group-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newGroup: Group = {
      id: groupId,
      name: name || `Group ${get().groups.size + 1}`,
      itemIds: new Set(ids),
      createdAt: Date.now(),
      locked: false
    };

    set(produce((state: SliceTypes) => {
      state.groups.set(groupId, newGroup);
      
      // Record in history
      if (state.addToHistory) {
        state.addToHistory({
          type: 'CREATE_GROUP',
          execute: () => {
            const currentState = get();
            currentState.groups.set(groupId, newGroup);
          },
          undo: () => {
            const currentState = get();
            currentState.groups.delete(groupId);
          },
          timestamp: Date.now()
        });
      }
    }));

    // Update selection to the group
    get().selectItems([groupId]);
    get().saveGroupsToStorage();
    
    return groupId;
  },

  dissolveGroup: (groupId: string) => {
    const group = get().groups.get(groupId);
    if (!group) return;

    const itemIds = Array.from(group.itemIds);

    set(produce((state: SliceTypes) => {
      state.groups.delete(groupId);
      
      // If group was selected, select its items instead
      if (state.selectedIds.has(groupId)) {
        state.selectedIds.delete(groupId);
        itemIds.forEach(id => state.selectedIds.add(id));
      }

      // Record in history
      if (state.addToHistory) {
        state.addToHistory({
          type: 'DISSOLVE_GROUP',
          execute: () => {
            const currentState = get();
            currentState.groups.delete(groupId);
          },
          undo: () => {
            const currentState = get();
            currentState.groups.set(groupId, group);
          },
          timestamp: Date.now()
        });
      }
    }));

    get().saveGroupsToStorage();
  },

  addToGroup: (groupId: string, itemIds: string[]) => {
    const group = get().groups.get(groupId);
    if (!group) return;

    set(produce((state: SliceTypes) => {
      itemIds.forEach(id => {
        state.groups.get(groupId)?.itemIds.add(id);
      });
    }));

    get().saveGroupsToStorage();
  },

  removeFromGroup: (groupId: string, itemIds: string[]) => {
    const group = get().groups.get(groupId);
    if (!group) return;

    set(produce((state: SliceTypes) => {
      itemIds.forEach(id => {
        state.groups.get(groupId)?.itemIds.delete(id);
      });

      // If group becomes empty, dissolve it
      const updatedGroup = state.groups.get(groupId);
      if (updatedGroup && updatedGroup.itemIds.size === 0) {
        state.groups.delete(groupId);
      }
    }));

    get().saveGroupsToStorage();
  },

  moveGroup: (groupId: string, deltaX: number, deltaY: number) => {
    const group = get().groups.get(groupId);
    if (!group || group.locked) return;

    const itemIds = Array.from(group.itemIds);
    const updates = itemIds.map(id => {
      const item = get().images.find(img => img.id === id);
      if (!item) return null;
      
      return {
        id,
        x: item.x + deltaX,
        y: item.y + deltaY
      };
    }).filter(Boolean) as Array<{ id: string; x: number; y: number }>;

    if (updates.length > 0) {
      get().batchUpdatePositionsWithHistory(updates);
    }
  },

  transformGroup: (groupId: string, transform: Transform) => {
    const group = get().groups.get(groupId);
    if (!group || group.locked) return;

    const itemIds = Array.from(group.itemIds);
    
    // Calculate group center
    let centerX = 0;
    let centerY = 0;
    let count = 0;
    
    itemIds.forEach(id => {
      const item = get().images.find(img => img.id === id);
      if (item) {
        centerX += item.x;
        centerY += item.y;
        count++;
      }
    });
    
    if (count === 0) return;
    
    centerX /= count;
    centerY /= count;

    // Apply transformation relative to group center
    const updates = itemIds.map(id => {
      const item = get().images.find(img => img.id === id);
      if (!item) return null;

      // Calculate relative position
      const relX = item.x - centerX;
      const relY = item.y - centerY;

      // Apply rotation if provided
      let newX = item.x;
      let newY = item.y;
      
      if (transform.rotation !== undefined) {
        const rad = (transform.rotation * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        
        newX = centerX + relX * cos - relY * sin;
        newY = centerY + relX * sin + relY * cos;
      }

      // Apply scale if provided
      if (transform.scaleX !== undefined || transform.scaleY !== undefined) {
        const scaleX = transform.scaleX ?? 1;
        const scaleY = transform.scaleY ?? 1;
        
        newX = centerX + (newX - centerX) * scaleX;
        newY = centerY + (newY - centerY) * scaleY;
      }

      // Apply translation if provided
      if (transform.x !== undefined) newX += transform.x;
      if (transform.y !== undefined) newY += transform.y;

      return {
        id,
        x: newX,
        y: newY,
        scaleX: transform.scaleX,
        scaleY: transform.scaleY,
        rotation: item.rotation + (transform.rotation || 0)
      };
    }).filter(Boolean);

    if (updates.length > 0) {
      get().batchUpdateTransformsWithHistory(updates as any);
    }
  },

  duplicateGroup: (groupId: string): string => {
    const group = get().groups.get(groupId);
    if (!group) return '';

    // First duplicate all items in the group
    const itemIds = Array.from(group.itemIds);
    const newItemIds: string[] = [];
    const offset = 20;

    itemIds.forEach(id => {
      const item = get().images.find(img => img.id === id);
      if (item) {
        const newId = get().duplicateImage(id, offset, offset);
        if (newId) newItemIds.push(newId);
      }
    });

    // Create new group with duplicated items
    return get().createGroup(newItemIds, `${group.name} (Copy)`);
  },

  createNestedGroup: (parentGroupId: string, childIds: string[]): string => {
    const parentGroup = get().groups.get(parentGroupId);
    if (!parentGroup) return '';

    const childGroupId = get().createGroup(childIds);
    
    set(produce((state: SliceTypes) => {
      const childGroup = state.groups.get(childGroupId);
      if (childGroup) {
        childGroup.parentGroupId = parentGroupId;
      }
    }));

    get().saveGroupsToStorage();
    return childGroupId;
  },

  flattenGroup: (groupId: string) => {
    const group = get().groups.get(groupId);
    if (!group) return;

    // Find all nested groups
    const nestedGroups: string[] = [];
    const allItemIds: string[] = [];

    const collectNestedItems = (gId: string) => {
      const g = get().groups.get(gId);
      if (!g) return;

      Array.from(g.itemIds).forEach(itemId => {
        // Check if this item is actually another group
        if (get().groups.has(itemId)) {
          nestedGroups.push(itemId);
          collectNestedItems(itemId);
        } else {
          allItemIds.push(itemId);
        }
      });
    };

    collectNestedItems(groupId);

    // Dissolve nested groups
    nestedGroups.forEach(gId => {
      get().groups.delete(gId);
    });

    // Update main group with all items
    set(produce((state: SliceTypes) => {
      const mainGroup = state.groups.get(groupId);
      if (mainGroup) {
        mainGroup.itemIds = new Set(allItemIds);
        mainGroup.parentGroupId = undefined;
      }
    }));

    get().saveGroupsToStorage();
  },

  renameGroup: (groupId: string, name: string) => {
    set(produce((state: SliceTypes) => {
      const group = state.groups.get(groupId);
      if (group) {
        group.name = name;
      }
    }));

    get().saveGroupsToStorage();
  },

  lockGroup: (groupId: string, locked: boolean) => {
    set(produce((state: SliceTypes) => {
      const group = state.groups.get(groupId);
      if (group) {
        group.locked = locked;
      }
    }));

    get().saveGroupsToStorage();
  },

  getGroupItems: (groupId: string): string[] => {
    const group = get().groups.get(groupId);
    return group ? Array.from(group.itemIds) : [];
  },

  getItemGroup: (itemId: string): string | null => {
    for (const [groupId, group] of get().groups) {
      if (group.itemIds.has(itemId)) {
        return groupId;
      }
    }
    return null;
  },

  isGrouped: (itemId: string): boolean => {
    return get().getItemGroup(itemId) !== null;
  },

  getAllGroups: (): Group[] => {
    return Array.from(get().groups.values());
  },

  saveGroupsToStorage: () => {
    try {
      const groups = Array.from(get().groups.entries()).map(([id, group]) => ({
        id,
        name: group.name,
        itemIds: Array.from(group.itemIds),
        parentGroupId: group.parentGroupId,
        createdAt: group.createdAt,
        locked: group.locked
      }));
      
      localStorage.setItem('infinifox-groups', JSON.stringify(groups));
    } catch (error) {
      console.error('Failed to save groups to storage:', error);
    }
  },

  loadGroupsFromStorage: () => {
    try {
      const stored = localStorage.getItem('infinifox-groups');
      if (!stored) return;

      const groups = JSON.parse(stored);
      const groupsMap = new Map<string, Group>();

      groups.forEach((group: any) => {
        groupsMap.set(group.id, {
          id: group.id,
          name: group.name,
          itemIds: new Set(group.itemIds),
          parentGroupId: group.parentGroupId,
          createdAt: group.createdAt,
          locked: group.locked
        });
      });

      set({ groups: groupsMap });
    } catch (error) {
      console.error('Failed to load groups from storage:', error);
    }
  }
});
