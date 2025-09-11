/**
 * Subcanvas Component - Renders subcanvas with children
 * Phase 3: Main Canvas Orchestration
 */

import React, { useRef, useCallback, memo } from 'react';
import { Group, Rect, Text } from 'react-konva';
import Konva from 'konva';
import type { SubcanvasData } from '../../../../types/subcanvas';

interface SubcanvasProps {
  subcanvas: SubcanvasData;
  isActive: boolean;
  isSelected: boolean;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onTransform: (attrs: any) => void;
  depth?: number;
  children?: React.ReactNode;
}

export const SubcanvasComponent: React.FC<SubcanvasProps> = memo(({
  subcanvas,
  isActive,
  isSelected,
  onSelect,
  onTransform,
  depth = 0,
  children
}) => {
  const groupRef = useRef<Konva.Group>(null);
  const transform = subcanvas.transform;

  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    if (subcanvas.locked) return;
    
    const node = e.target;
    onTransform({
      x: node.x(),
      y: node.y()
    });
  }, [subcanvas.locked, onTransform]);

  const handleTransformEnd = useCallback((e: Konva.KonvaEventObject<Event>) => {
    if (subcanvas.locked) return;
    
    const node = e.target;
    onTransform({
      x: node.x(),
      y: node.y(),
      scaleX: node.scaleX(),
      scaleY: node.scaleY(),
      rotation: node.rotation()
    });
    
    // Reset scale on node
    node.scaleX(1);
    node.scaleY(1);
  }, [subcanvas.locked, onTransform]);

  const handleClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (subcanvas.locked) return;
    e.cancelBubble = true;
    onSelect(e);
  }, [subcanvas.locked, onSelect]);

  // Apply clipping if enabled
  const clipFunc = subcanvas.clipContent
    ? (ctx: Konva.Context) => {
        ctx.rect(0, 0, subcanvas.width, subcanvas.height);
      }
    : undefined;

  return (
    <Group
      ref={groupRef}
      x={transform.x}
      y={transform.y}
      scaleX={transform.scaleX}
      scaleY={transform.scaleY}
      rotation={transform.rotation}
      opacity={subcanvas.opacity}
      visible={subcanvas.visible}
      draggable={!subcanvas.locked}
      onClick={handleClick}
      onTap={handleClick}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
      name={`subcanvas-${subcanvas.id}`}
      listening={!subcanvas.locked}
      clipFunc={clipFunc}
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

      {/* Render children */}
      {children}

      {/* Bounds indicator */}
      {subcanvas.showBounds && (
        <Rect
          x={0}
          y={0}
          width={subcanvas.width}
          height={subcanvas.height}
          stroke={isActive ? '#ff6600' : (isSelected ? '#0066ff' : '#999999')}
          strokeWidth={isActive ? 2 : 1}
          dash={isActive ? [] : [5, 5]}
          listening={false}
        />
      )}

      {/* Label (only for collapsed or debug) */}
      {subcanvas.collapsed && (
        <>
          <Rect
            x={0}
            y={0}
            width={subcanvas.width}
            height={subcanvas.height}
            fill="#f0f0f0"
            opacity={0.8}
          />
          <Text
            x={10}
            y={10}
            text={subcanvas.name}
            fontSize={14}
            fill="#333"
          />
        </>
      )}
    </Group>
  );
});

SubcanvasComponent.displayName = 'Subcanvas';

export default SubcanvasComponent;
