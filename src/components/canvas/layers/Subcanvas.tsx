/**
 * InfiniFox Subcanvas Component
 * Phase 2: React-Konva implementation of subcanvas/artboard
 */

import React, { useRef, useEffect, useCallback, memo } from 'react';
import { Group, Rect, Text } from 'react-konva';
import type Konva from 'konva';
import { useStore } from '../../../store/store';
import { ImageLayer } from './ImageLayer';
import type { SubcanvasData } from '../../../types/subcanvas';

interface SubcanvasProps {
  subcanvas: SubcanvasData;
  isActive?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string, event: Konva.KonvaEventObject<MouseEvent>) => void;
  onTransform?: (id: string, attrs: any) => void;
  depth?: number; // For nested rendering
}

export const Subcanvas: React.FC<SubcanvasProps> = memo(({
  subcanvas,
  isActive = false,
  isSelected = false,
  onSelect,
  onTransform,
  depth = 0
}) => {
  const groupRef = useRef<Konva.Group>(null);
  const {
    imageLayers,
    subcanvases,
    getSubcanvasChildren,
    registerNode,
    cacheSubcanvas,
    clearSubcanvasCache
  } = useStore();
  
  // Register node for resource management
  useEffect(() => {
    if (groupRef.current) {
      registerNode?.(subcanvas.id, groupRef.current);
    }
  }, [subcanvas.id, registerNode]);
  
  // Handle caching
  useEffect(() => {
    if (!groupRef.current) return;
    
    if (subcanvas.cached) {
      // Cache with proper bounds
      groupRef.current.cache({
        x: 0,
        y: 0,
        width: subcanvas.width,
        height: subcanvas.height,
        pixelRatio: 1,
        imageSmoothingEnabled: true
      });
    } else {
      groupRef.current.clearCache();
    }
    
    return () => {
      if (groupRef.current) {
        groupRef.current.clearCache();
      }
    };
  }, [subcanvas.cached, subcanvas.width, subcanvas.height]);
  
  // Handle selection
  const handleClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    onSelect?.(subcanvas.id, e);
  }, [subcanvas.id, onSelect]);
  
  // Handle drag end for transform updates
  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    onTransform?.(subcanvas.id, {
      x: node.x(),
      y: node.y()
    });
  }, [subcanvas.id, onTransform]);
  
  // Handle transform end
  const handleTransformEnd = useCallback((e: Konva.KonvaEventObject<Event>) => {
    const node = e.target;
    onTransform?.(subcanvas.id, {
      x: node.x(),
      y: node.y(),
      scaleX: node.scaleX(),
      scaleY: node.scaleY(),
      rotation: node.rotation()
    });
  }, [subcanvas.id, onTransform]);
  
  // Get children for rendering
  const { layers: childLayerIds, subcanvases: childSubcanvases } = getSubcanvasChildren(subcanvas.id);
  
  // Render children recursively
  const renderChildren = () => {
    const children: React.ReactNode[] = [];
    
    // Render child layers
    childLayerIds.forEach(layerId => {
      const layer = imageLayers.get(layerId);
      if (layer && layer.visible) {
        children.push(
          <ImageLayer
            key={layerId}
            layer={layer}
            isSelected={false} // Handle selection state properly
          />
        );
      }
    });
    
    // Render nested subcanvases (prevent infinite recursion with depth check)
    if (depth < 10) {
      childSubcanvases.forEach(childSubcanvas => {
        if (childSubcanvas.visible && !childSubcanvas.collapsed) {
          children.push(
            <Subcanvas
              key={childSubcanvas.id}
              subcanvas={childSubcanvas}
              isActive={false}
              isSelected={false}
              onSelect={onSelect}
              onTransform={onTransform}
              depth={depth + 1}
            />
          );
        }
      });
    }
    
    return children;
  };
  
  // Determine stroke color based on state
  const getStrokeColor = () => {
    if (isActive) return '#0066FF';
    if (isSelected) return '#0099FF';
    if (subcanvas.showBounds) return '#999999';
    return 'transparent';
  };
  
  // Create clipping function if needed
  const clipFunc = subcanvas.clipContent ? (ctx: CanvasRenderingContext2D) => {
    if (subcanvas.bounds) {
      ctx.rect(
        subcanvas.bounds.x,
        subcanvas.bounds.y,
        subcanvas.bounds.width,
        subcanvas.bounds.height
      );
    } else {
      ctx.rect(0, 0, subcanvas.width, subcanvas.height);
    }
  } : undefined;
  
  return (
    <Group
      ref={groupRef}
      x={subcanvas.transform.x}
      y={subcanvas.transform.y}
      scaleX={subcanvas.transform.scaleX}
      scaleY={subcanvas.transform.scaleY}
      rotation={subcanvas.transform.rotation}
      opacity={subcanvas.opacity}
      visible={subcanvas.visible && !subcanvas.collapsed}
      draggable={!subcanvas.locked}
      onClick={handleClick}
      onTap={handleClick}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
      clipFunc={clipFunc}
      globalCompositeOperation={subcanvas.blendMode}
    >
      {/* Background */}
      {subcanvas.backgroundColor && (
        <Rect
          x={0}
          y={0}
          width={subcanvas.width}
          height={subcanvas.height}
          fill={subcanvas.backgroundColor}
          listening={false}
        />
      )}
      
      {/* Children */}
      {renderChildren()}
      
      {/* Bounds indicator */}
      {(subcanvas.showBounds || isActive || isSelected) && (
        <Rect
          x={0}
          y={0}
          width={subcanvas.width}
          height={subcanvas.height}
          stroke={getStrokeColor()}
          strokeWidth={isActive ? 2 : 1}
          dash={subcanvas.showBounds && !isActive && !isSelected ? [5, 5] : undefined}
          fill="transparent"
          listening={false}
        />
      )}
      
      {/* Label (shown when collapsed or for debugging) */}
      {subcanvas.collapsed && (
        <Group>
          <Rect
            x={0}
            y={0}
            width={subcanvas.width}
            height={30}
            fill="rgba(0, 0, 0, 0.7)"
          />
          <Text
            x={10}
            y={8}
            text={subcanvas.name}
            fontSize={14}
            fill="white"
          />
        </Group>
      )}
    </Group>
  );
});

Subcanvas.displayName = 'Subcanvas';
