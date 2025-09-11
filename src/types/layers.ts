/**
 * InfiniFox Layer System - Type Definitions
 * Phase 1: Single Image Layer Enhancement
 */

import type Konva from 'konva';

// Layer type discriminator
export type LayerType = 'image' | 'drawing' | 'text' | 'shape';

// Blend modes supported by canvas
export type BlendMode = GlobalCompositeOperation;

// Image filter types
export interface ImageFilter {
  type: 'blur' | 'brightness' | 'contrast' | 'grayscale' | 'sepia' | 'invert' | 'hue' | 'saturation';
  value: number;
  enabled: boolean;
}

// Image adjustments
export interface ImageAdjustments {
  brightness: number; // -100 to 100
  contrast: number;   // -100 to 100
  saturation: number; // -100 to 100
  hue: number;        // -180 to 180
  gamma: number;      // 0.1 to 3
  exposure: number;   // -3 to 3
}

// Mask data for layer masking
export interface MaskData {
  type: 'bitmap' | 'vector';
  data: string | VectorPath[];
  inverted: boolean;
  opacity: number;
  feather: number;
}

// Vector path for vector masks
export interface VectorPath {
  points: Array<{ x: number; y: number }>;
  closed: boolean;
  bezierCurves?: Array<{
    cp1: { x: number; y: number };
    cp2: { x: number; y: number };
  }>;
}

// Transform properties
export interface Transform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  skewX?: number;
  skewY?: number;
  originX?: number;
  originY?: number;
}

// Base layer interface
export interface BaseLayer {
  id: string;
  type: LayerType;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0 to 1
  blendMode: BlendMode;
  
  // Transform (relative to parent)
  transform: Transform;
  
  // Hierarchy
  parentId: string | null; // Subcanvas ID or null for main canvas
  zIndex: number;
  
  // Metadata
  createdAt: number;
  updatedAt: number;
}

// Image layer specific data
export interface ImageLayerData extends BaseLayer {
  type: 'image';
  
  // Image reference
  imageId: string; // Reference to ImageData in canvas store
  imageSrc: string; // Blob URL or data URL
  
  // Image properties
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
  
  // Effects
  filters: ImageFilter[];
  adjustments: ImageAdjustments;
  mask?: MaskData;
  
  // Caching
  cached: boolean;
  cacheId?: string;
}

// Layer bounds for viewport culling
export interface LayerBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Layer selection state
export interface LayerSelection {
  layerIds: string[];
  primary: string | null; // Primary selected layer
}

// Resource tracking for cleanup
export interface LayerResource {
  type: 'blob' | 'canvas' | 'node';
  id: string;
  url?: string;
  nodeRef?: WeakRef<Konva.Node>;
}

// NOTE: CleanupEntry moved to layerSlice.ts to avoid Vite HMR issues
// Complex types used only in store slices should be defined locally

// Default values factory
export const createDefaultImageAdjustments = (): ImageAdjustments => ({
  brightness: 0,
  contrast: 0,
  saturation: 0,
  hue: 0,
  gamma: 1,
  exposure: 0
});

export const createDefaultTransform = (): Transform => ({
  x: 0,
  y: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0
});

// Type guards
export const isImageLayer = (layer: BaseLayer): layer is ImageLayerData => 
  layer.type === 'image';

// Utility functions
export const calculateLayerBounds = (layer: BaseLayer): LayerBounds => {
  const t = layer.transform;
  
  if (isImageLayer(layer)) {
    const width = (layer as ImageLayerData).width * Math.abs(t.scaleX);
    const height = (layer as ImageLayerData).height * Math.abs(t.scaleY);
    
    return {
      x: t.x - (t.originX || 0) * width,
      y: t.y - (t.originY || 0) * height,
      width,
      height
    };
  }
  
  // Default bounds for non-image layers
  return { x: t.x, y: t.y, width: 0, height: 0 };
};

// All types are exported inline above
