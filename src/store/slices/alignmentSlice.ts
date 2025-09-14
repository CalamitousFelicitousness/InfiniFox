import type { StateCreator } from 'zustand';
import type { ImageData } from '../types';
import type { CanvasSlice } from './canvasSlice';
import type { SelectionSlice } from './selectionSlice';

export interface BoundsInfo {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ItemBounds extends BoundsInfo {
  id: string;
}

export interface AlignmentOperations {
  alignLeft: (ids?: string[]) => void;
  alignCenter: (ids?: string[]) => void;
  alignRight: (ids?: string[]) => void;
  alignTop: (ids?: string[]) => void;
  alignMiddle: (ids?: string[]) => void;
  alignBottom: (ids?: string[]) => void;
  distributeHorizontally: (ids?: string[]) => void;
  distributeVertically: (ids?: string[]) => void;
}

export interface AlignmentSlice extends AlignmentOperations {
  getSelectionBounds: (ids: string[]) => BoundsInfo | null;
  getItemBounds: (id: string) => ItemBounds | null;
}

type SliceTypes = CanvasSlice & SelectionSlice & AlignmentSlice;

export const createAlignmentSlice: StateCreator<
  SliceTypes,
  [],
  [],
  AlignmentSlice
> = (set, get) => ({
  getItemBounds: (id: string): ItemBounds | null => {
    const state = get();
    const item = state.images.find(img => img.id === id);
    
    if (!item) return null;
    
    return {
      id: item.id,
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height
    };
  },

  getSelectionBounds: (ids: string[]): BoundsInfo | null => {
    const state = get();
    const items = state.images.filter(img => ids.includes(img.id));
    
    if (items.length === 0) return null;
    
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    
    items.forEach(item => {
      // Calculate bounds considering rotation
      const corners = getRotatedCorners(item);
      corners.forEach(corner => {
        minX = Math.min(minX, corner.x);
        minY = Math.min(minY, corner.y);
        maxX = Math.max(maxX, corner.x);
        maxY = Math.max(maxY, corner.y);
      });
    });
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  },

  alignLeft: (ids?: string[]) => {
    const state = get();
    const targetIds = ids || Array.from(state.selectedIds);
    
    if (targetIds.length < 2) return;
    
    const bounds = state.getSelectionBounds(targetIds);
    if (!bounds) return;
    
    const updates: Array<{ id: string; x: number; y: number }> = [];
    
    targetIds.forEach(id => {
      const item = state.images.find(img => img.id === id);
      if (item) {
        updates.push({
          id,
          x: bounds.x + item.width / 2,
          y: item.y
        });
      }
    });
    
    state.batchUpdatePositionsWithHistory(updates);
  },

  alignCenter: (ids?: string[]) => {
    const state = get();
    const targetIds = ids || Array.from(state.selectedIds);
    
    if (targetIds.length < 2) return;
    
    const bounds = state.getSelectionBounds(targetIds);
    if (!bounds) return;
    
    const centerX = bounds.x + bounds.width / 2;
    const updates: Array<{ id: string; x: number; y: number }> = [];
    
    targetIds.forEach(id => {
      const item = state.images.find(img => img.id === id);
      if (item) {
        updates.push({
          id,
          x: centerX,
          y: item.y
        });
      }
    });
    
    state.batchUpdatePositionsWithHistory(updates);
  },

  alignRight: (ids?: string[]) => {
    const state = get();
    const targetIds = ids || Array.from(state.selectedIds);
    
    if (targetIds.length < 2) return;
    
    const bounds = state.getSelectionBounds(targetIds);
    if (!bounds) return;
    
    const rightEdge = bounds.x + bounds.width;
    const updates: Array<{ id: string; x: number; y: number }> = [];
    
    targetIds.forEach(id => {
      const item = state.images.find(img => img.id === id);
      if (item) {
        updates.push({
          id,
          x: rightEdge - item.width / 2,
          y: item.y
        });
      }
    });
    
    state.batchUpdatePositionsWithHistory(updates);
  },

  alignTop: (ids?: string[]) => {
    const state = get();
    const targetIds = ids || Array.from(state.selectedIds);
    
    if (targetIds.length < 2) return;
    
    const bounds = state.getSelectionBounds(targetIds);
    if (!bounds) return;
    
    const updates: Array<{ id: string; x: number; y: number }> = [];
    
    targetIds.forEach(id => {
      const item = state.images.find(img => img.id === id);
      if (item) {
        updates.push({
          id,
          x: item.x,
          y: bounds.y + item.height / 2
        });
      }
    });
    
    state.batchUpdatePositionsWithHistory(updates);
  },

  alignMiddle: (ids?: string[]) => {
    const state = get();
    const targetIds = ids || Array.from(state.selectedIds);
    
    if (targetIds.length < 2) return;
    
    const bounds = state.getSelectionBounds(targetIds);
    if (!bounds) return;
    
    const centerY = bounds.y + bounds.height / 2;
    const updates: Array<{ id: string; x: number; y: number }> = [];
    
    targetIds.forEach(id => {
      const item = state.images.find(img => img.id === id);
      if (item) {
        updates.push({
          id,
          x: item.x,
          y: centerY
        });
      }
    });
    
    state.batchUpdatePositionsWithHistory(updates);
  },

  alignBottom: (ids?: string[]) => {
    const state = get();
    const targetIds = ids || Array.from(state.selectedIds);
    
    if (targetIds.length < 2) return;
    
    const bounds = state.getSelectionBounds(targetIds);
    if (!bounds) return;
    
    const bottomEdge = bounds.y + bounds.height;
    const updates: Array<{ id: string; x: number; y: number }> = [];
    
    targetIds.forEach(id => {
      const item = state.images.find(img => img.id === id);
      if (item) {
        updates.push({
          id,
          x: item.x,
          y: bottomEdge - item.height / 2
        });
      }
    });
    
    state.batchUpdatePositionsWithHistory(updates);
  },

  distributeHorizontally: (ids?: string[]) => {
    const state = get();
    const targetIds = ids || Array.from(state.selectedIds);
    
    if (targetIds.length < 3) return;
    
    const bounds = state.getSelectionBounds(targetIds);
    if (!bounds) return;
    
    // Sort items by x position
    const items = targetIds
      .map(id => state.images.find(img => img.id === id))
      .filter((item): item is ImageData => item !== undefined)
      .sort((a, b) => a.x - b.x);
    
    const totalWidth = items.reduce((sum, item) => sum + item.width, 0);
    const availableSpace = bounds.width - totalWidth;
    const gap = availableSpace / (items.length - 1);
    
    const updates: Array<{ id: string; x: number; y: number }> = [];
    let currentX = bounds.x;
    
    items.forEach((item, index) => {
      updates.push({
        id: item.id,
        x: currentX + item.width / 2,
        y: item.y
      });
      currentX += item.width + gap;
    });
    
    state.batchUpdatePositionsWithHistory(updates);
  },

  distributeVertically: (ids?: string[]) => {
    const state = get();
    const targetIds = ids || Array.from(state.selectedIds);
    
    if (targetIds.length < 3) return;
    
    const bounds = state.getSelectionBounds(targetIds);
    if (!bounds) return;
    
    // Sort items by y position
    const items = targetIds
      .map(id => state.images.find(img => img.id === id))
      .filter((item): item is ImageData => item !== undefined)
      .sort((a, b) => a.y - b.y);
    
    const totalHeight = items.reduce((sum, item) => sum + item.height, 0);
    const availableSpace = bounds.height - totalHeight;
    const gap = availableSpace / (items.length - 1);
    
    const updates: Array<{ id: string; x: number; y: number }> = [];
    let currentY = bounds.y;
    
    items.forEach((item, index) => {
      updates.push({
        id: item.id,
        x: item.x,
        y: currentY + item.height / 2
      });
      currentY += item.height + gap;
    });
    
    state.batchUpdatePositionsWithHistory(updates);
  }
});

// Helper function to calculate rotated corners
function getRotatedCorners(item: ImageData): Array<{ x: number; y: number }> {
  const rotation = item.rotation || 0;
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  
  const halfWidth = item.width / 2;
  const halfHeight = item.height / 2;
  
  const corners = [
    { x: -halfWidth, y: -halfHeight },
    { x: halfWidth, y: -halfHeight },
    { x: halfWidth, y: halfHeight },
    { x: -halfWidth, y: halfHeight }
  ];
  
  return corners.map(corner => ({
    x: item.x + corner.x * cos - corner.y * sin,
    y: item.y + corner.x * sin + corner.y * cos
  }));
}
