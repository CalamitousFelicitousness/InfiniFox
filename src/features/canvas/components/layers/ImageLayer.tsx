/**
 * InfiniFox Layer System - ImageLayer Component
 * Phase 1: Single Image Layer with Effects and Memory Management
 */

import React, { useRef, useEffect, useCallback, memo } from 'react';
import { Image, Group, Rect } from 'react-konva';
import Konva from 'konva';
import { useStore } from '../../../../store/store';
import type { ImageLayerData } from '../../../../types/layers';

interface ImageLayerProps {
  layer: ImageLayerData;
  isSelected?: boolean;
  onSelect?: (layerId: string) => void;
  onTransform?: (layerId: string, attrs: any) => void;
}

const ImageLayerComponent: React.FC<ImageLayerProps> = memo(({
  layer,
  isSelected = false,
  onSelect,
  onTransform
}) => {
  const imageRef = useRef<Konva.Image>(null);
  const groupRef = useRef<Konva.Group>(null);
  const [image, setImage] = React.useState<HTMLImageElement | null>(null);
  
  const {
    registerNode,
    updateLayerTransform,
    clearCache
  } = useStore();

  // Load image
  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      setImage(img);
      
      // Apply filters after image loads
      if (imageRef.current) {
        applyFiltersAndAdjustments();
      }
    };
    
    img.onerror = (e) => {
      console.error(`Failed to load image for layer ${layer.id}:`, e);
    };
    
    img.src = layer.imageSrc;
    
    return () => {
      // Cleanup on unmount
      if (imageRef.current) {
        imageRef.current.clearCache();
        imageRef.current.destroy();
      }
    };
  }, [layer.imageSrc, layer.id]);

  // Register node with store for cleanup tracking
  useEffect(() => {
    if (groupRef.current) {
      registerNode(layer.id, groupRef.current);
    }
  }, [layer.id, registerNode]);

  // Apply filters and adjustments
  const applyFiltersAndAdjustments = useCallback(() => {
    const node = imageRef.current;
    if (!node || !image) return;

    const filters: Konva.Filter[] = [];
    
    // Apply enabled filters
    layer.filters.forEach(filter => {
      if (!filter.enabled) return;
      
      switch (filter.type) {
        case 'blur':
          filters.push(Konva.Filters.Blur);
          node.blurRadius(filter.value);
          break;
        case 'brightness':
          filters.push(Konva.Filters.Brighten);
          node.brightness(filter.value / 100);
          break;
        case 'contrast':
          filters.push(Konva.Filters.Contrast);
          node.contrast(filter.value / 100);
          break;
        case 'grayscale':
          if (filter.value > 0) {
            filters.push(Konva.Filters.Grayscale);
          }
          break;
        case 'sepia':
          if (filter.value > 0) {
            filters.push(Konva.Filters.Sepia);
          }
          break;
        case 'invert':
          if (filter.value > 0) {
            filters.push(Konva.Filters.Invert);
          }
          break;
        case 'hue':
          filters.push(Konva.Filters.HSL);
          node.hue(filter.value);
          break;
        case 'saturation':
          filters.push(Konva.Filters.HSL);
          node.saturation(filter.value / 100);
          break;
      }
    });

    // Apply adjustments
    const adj = layer.adjustments;
    
    if (adj.brightness !== 0) {
      filters.push(Konva.Filters.Brighten);
      node.brightness(adj.brightness / 100);
    }
    
    if (adj.contrast !== 0) {
      filters.push(Konva.Filters.Contrast);
      node.contrast(adj.contrast / 100);
    }
    
    if (adj.saturation !== 0) {
      filters.push(Konva.Filters.HSL);
      node.saturation(1 + adj.saturation / 100);
    }
    
    if (adj.hue !== 0) {
      filters.push(Konva.Filters.HSL);
      node.hue(adj.hue);
    }

    // Apply filters and cache if needed
    if (filters.length > 0) {
      node.filters(filters);
      
      // Cache for performance
      if (!layer.cached) {
        node.cache({
          x: 0,
          y: 0,
          width: layer.width,
          height: layer.height,
          pixelRatio: 1,
          imageSmoothingEnabled: true
        });
      }
    } else if (layer.cached) {
      // Clear cache if no filters
      node.clearCache();
    }
  }, [layer.filters, layer.adjustments, layer.cached, layer.width, layer.height, image]);

  // Update filters when they change
  useEffect(() => {
    if (imageRef.current && image) {
      applyFiltersAndAdjustments();
    }
  }, [layer.filters, layer.adjustments, applyFiltersAndAdjustments, image]);

  // Handle selection
  const handleClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (layer.locked) return;
    
    e.cancelBubble = true;
    onSelect?.(layer.id);
  }, [layer.id, layer.locked, onSelect]);

  // Handle drag end
  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    if (layer.locked) return;
    
    const node = e.target;
    updateLayerTransform(layer.id, {
      x: node.x(),
      y: node.y()
    });
    
    onTransform?.(layer.id, {
      x: node.x(),
      y: node.y()
    });
  }, [layer.id, layer.locked, updateLayerTransform, onTransform]);

  // Handle transform end
  const handleTransformEnd = useCallback((e: Konva.KonvaEventObject<Event>) => {
    if (layer.locked) return;
    
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    const rotation = node.rotation();
    
    // Reset scale on node
    node.scaleX(1);
    node.scaleY(1);
    
    // Update layer transform
    updateLayerTransform(layer.id, {
      x: node.x(),
      y: node.y(),
      scaleX: scaleX,
      scaleY: scaleY,
      rotation: rotation
    });
    
    onTransform?.(layer.id, {
      x: node.x(),
      y: node.y(),
      scaleX: scaleX,
      scaleY: scaleY,
      rotation: rotation
    });
    
    // Clear cache to force redraw with new transform
    if (imageRef.current) {
      imageRef.current.clearCache();
      applyFiltersAndAdjustments();
    }
  }, [layer.id, layer.locked, updateLayerTransform, onTransform, applyFiltersAndAdjustments]);

  if (!image) {
    return null;
  }

  const transform = layer.transform;

  return (
    <Group
      ref={groupRef}
      x={transform.x}
      y={transform.y}
      scaleX={transform.scaleX}
      scaleY={transform.scaleY}
      rotation={transform.rotation}
      opacity={layer.opacity}
      visible={layer.visible}
      draggable={!layer.locked}
      onClick={handleClick}
      onTap={handleClick}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
      name={`layer-${layer.id}`}
      listening={!layer.locked}
    >
      <Image
        ref={imageRef}
        image={image}
        width={layer.width}
        height={layer.height}
        globalCompositeOperation={layer.blendMode}
      />
      
      {/* Selection indicator */}
      {isSelected && !layer.locked && (
        <Rect
          x={0}
          y={0}
          width={layer.width}
          height={layer.height}
          stroke="#0066ff"
          strokeWidth={2 / transform.scaleX}
          dash={[10, 5]}
          listening={false}
        />
      )}
    </Group>
  );
});

ImageLayerComponent.displayName = 'ImageLayer';

export default ImageLayerComponent;
