/**
 * InfiniFox ImageLayer Component
 * Phase 1/2: React-Konva image layer rendering
 */

import React, { useRef, useEffect, useCallback, memo } from 'react';
import { Image, Group } from 'react-konva';
import type Konva from 'konva';
import type { ImageLayerData } from '../../../types/layers';
import { useStore } from '../../../store/store';

interface ImageLayerProps {
  layer: ImageLayerData;
  isSelected?: boolean;
  onSelect?: (id: string, event: Konva.KonvaEventObject<MouseEvent>) => void;
  onTransform?: (id: string, attrs: any) => void;
}

export const ImageLayer: React.FC<ImageLayerProps> = memo(({
  layer,
  isSelected = false,
  onSelect,
  onTransform
}) => {
  const imageRef = useRef<Konva.Image>(null);
  const groupRef = useRef<Konva.Group>(null);
  const [image, setImage] = React.useState<HTMLImageElement | null>(null);
  const { registerNode, clearCache } = useStore();
  
  // Load image
  useEffect(() => {
    const img = new window.Image();
    img.src = layer.imageSrc;
    img.onload = () => setImage(img);
    
    return () => {
      if (layer.imageSrc.startsWith('blob:')) {
        // Cleanup handled by store
      }
    };
  }, [layer.imageSrc]);
  
  // Register node
  useEffect(() => {
    if (groupRef.current) {
      registerNode(layer.id, groupRef.current);
    }
  }, [layer.id, registerNode]);
  
  // Apply filters and adjustments
  useEffect(() => {
    if (!imageRef.current || !image) return;
    
    const filters: Konva.Filter[] = [];
    
    // Apply enabled filters
    layer.filters.forEach(filter => {
      if (!filter.enabled) return;
      
      switch (filter.type) {
        case 'blur':
          filters.push(Konva.Filters.Blur);
          imageRef.current!.blurRadius(filter.value);
          break;
        case 'brightness':
          filters.push(Konva.Filters.Brighten);
          imageRef.current!.brightness(filter.value);
          break;
        case 'contrast':
          filters.push(Konva.Filters.Contrast);
          imageRef.current!.contrast(filter.value);
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
      }
    });
    
    // Apply adjustments
    if (layer.adjustments.hue !== 0) {
      filters.push(Konva.Filters.HSL);
      imageRef.current!.hue(layer.adjustments.hue);
    }
    
    if (layer.adjustments.saturation !== 0) {
      filters.push(Konva.Filters.HSL);
      imageRef.current!.saturation(layer.adjustments.saturation / 100);
    }
    
    // Apply filters
    imageRef.current.filters(filters);
    
    // Cache if filters applied
    if (filters.length > 0 && !layer.cached) {
      imageRef.current.cache({
        x: 0,
        y: 0,
        width: layer.width,
        height: layer.height,
        pixelRatio: 1,
        imageSmoothingEnabled: true
      });
    } else if (filters.length === 0 && layer.cached) {
      imageRef.current.clearCache();
    }
    
    return () => {
      if (imageRef.current) {
        imageRef.current.clearCache();
      }
    };
  }, [layer.filters, layer.adjustments, layer.cached, layer.width, layer.height, image]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (imageRef.current) {
        imageRef.current.clearCache();
        imageRef.current.destroy();
      }
    };
  }, []);
  
  const handleClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    onSelect?.(layer.id, e);
  }, [layer.id, onSelect]);
  
  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    onTransform?.(layer.id, {
      x: node.x(),
      y: node.y()
    });
  }, [layer.id, onTransform]);
  
  const handleTransformEnd = useCallback((e: Konva.KonvaEventObject<Event>) => {
    const node = e.target;
    onTransform?.(layer.id, {
      x: node.x(),
      y: node.y(),
      scaleX: node.scaleX(),
      scaleY: node.scaleY(),
      rotation: node.rotation()
    });
  }, [layer.id, onTransform]);
  
  if (!image) return null;
  
  return (
    <Group
      ref={groupRef}
      x={layer.transform.x}
      y={layer.transform.y}
      scaleX={layer.transform.scaleX}
      scaleY={layer.transform.scaleY}
      rotation={layer.transform.rotation}
      visible={layer.visible}
      opacity={layer.opacity}
      draggable={!layer.locked}
      onClick={handleClick}
      onTap={handleClick}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
      globalCompositeOperation={layer.blendMode}
    >
      <Image
        ref={imageRef}
        image={image}
        width={layer.width}
        height={layer.height}
        stroke={isSelected ? '#0099FF' : undefined}
        strokeWidth={isSelected ? 2 : 0}
      />
    </Group>
  );
});

ImageLayer.displayName = 'ImageLayer';
