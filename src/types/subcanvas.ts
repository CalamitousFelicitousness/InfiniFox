/**
 * InfiniFox Subcanvas/Artboard Types
 * Phase 2: Subcanvas Implementation
 */

import type { Transform } from './layers';

export interface SubcanvasData {
  id: string;
  type: 'subcanvas';
  name: string;
  visible: boolean;
  locked: boolean;
  collapsed: boolean;
  opacity: number;
  blendMode: GlobalCompositeOperation;
  
  // Dimensions
  width: number;
  height: number;
  backgroundColor?: string;
  
  // Transform (relative to parent)
  transform: Transform;
  
  // Hierarchy
  parentId: string | null; // Another subcanvas or null for main canvas
  childLayerIds: string[]; // Ordered child layer IDs
  childSubcanvasIds: string[]; // Ordered child subcanvas IDs
  
  // Bounds & Clipping
  clipContent: boolean;
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  
  // Canvas properties
  showBounds: boolean;
  exportSettings?: ExportSettings;
  
  // Caching
  cached: boolean;
  cacheId?: string;
  
  // Metadata
  createdAt: number;
  updatedAt: number;
}

export interface ExportSettings {
  format: 'png' | 'jpeg' | 'webp' | 'svg';
  quality: number; // 0-1 for jpeg/webp
  scale: number; // Export scale multiplier
  prefix: string; // File name prefix
  includeBackground: boolean;
}

export interface SubcanvasSelection {
  subcanvasIds: string[];
  primary: string | null;
}

// Type guards
export function isSubcanvas(item: any): item is SubcanvasData {
  return item && item.type === 'subcanvas';
}

// Factory functions
export function createDefaultSubcanvasTransform(): Transform {
  return {
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    skewX: 0,
    skewY: 0,
    offsetX: 0,
    offsetY: 0,
  };
}

export function createDefaultExportSettings(): ExportSettings {
  return {
    format: 'png',
    quality: 0.95,
    scale: 1,
    prefix: 'artboard',
    includeBackground: true,
  };
}

// Bounds calculations
export function calculateSubcanvasBounds(subcanvas: SubcanvasData): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const { transform, width, height } = subcanvas;
  
  // Apply transform to get actual bounds
  const scaleX = transform.scaleX || 1;
  const scaleY = transform.scaleY || 1;
  
  return {
    x: transform.x,
    y: transform.y,
    width: width * scaleX,
    height: height * scaleY,
  };
}

// Hierarchy helpers
export function getAllChildIds(
  subcanvas: SubcanvasData,
  allSubcanvases: Map<string, SubcanvasData>
): { layerIds: string[]; subcanvasIds: string[] } {
  const layerIds: string[] = [...subcanvas.childLayerIds];
  const subcanvasIds: string[] = [...subcanvas.childSubcanvasIds];
  
  // Recursively collect from child subcanvases
  subcanvas.childSubcanvasIds.forEach(childId => {
    const child = allSubcanvases.get(childId);
    if (child) {
      const childResults = getAllChildIds(child, allSubcanvases);
      layerIds.push(...childResults.layerIds);
      subcanvasIds.push(...childResults.subcanvasIds);
    }
  });
  
  return { layerIds, subcanvasIds };
}

export function canMoveToSubcanvas(
  itemId: string,
  targetSubcanvasId: string,
  allSubcanvases: Map<string, SubcanvasData>
): boolean {
  // Prevent circular references
  if (itemId === targetSubcanvasId) return false;
  
  // Check if target is a descendant of item
  const checkDescendants = (subcanvasId: string): boolean => {
    const subcanvas = allSubcanvases.get(subcanvasId);
    if (!subcanvas) return false;
    
    if (subcanvas.childSubcanvasIds.includes(itemId)) return true;
    
    return subcanvas.childSubcanvasIds.some(childId => checkDescendants(childId));
  };
  
  return !checkDescendants(targetSubcanvasId);
}
