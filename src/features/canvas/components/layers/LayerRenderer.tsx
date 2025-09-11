/**
 * LayerRenderer - Recursive rendering of hierarchy nodes
 * Phase 3: Main Canvas Orchestration
 */

import React, { memo, useCallback } from 'react';
import { Group } from 'react-konva';
import type { HierarchyNode } from './LayerHierarchyBuilder';
import ImageLayerComponent from './ImageLayer';
import SubcanvasComponent from './Subcanvas';
import type { ImageLayerData } from '../../../../types/layers';
import type { SubcanvasData } from '../../../../types/subcanvas';

interface LayerRendererProps {
  node: HierarchyNode;
  selectedIds: string[];
  onSelect: (id: string, type: 'layer' | 'subcanvas', multi: boolean) => void;
  onTransform: (id: string, attrs: any) => void;
  onDragEnd: (id: string, attrs: any) => void;
  isTransforming?: boolean;
}

export const LayerRenderer: React.FC<LayerRendererProps> = memo(({
  node,
  selectedIds,
  onSelect,
  onTransform,
  onDragEnd,
  isTransforming = false
}) => {
  const isSelected = selectedIds.includes(node.id);
  
  const handleSelect = useCallback((e: any) => {
    const multi = e.evt?.shiftKey || e.evt?.ctrlKey || e.evt?.metaKey;
    onSelect(node.id, node.type, multi);
  }, [node.id, node.type, onSelect]);
  
  const handleTransform = useCallback((attrs: any) => {
    onTransform(node.id, attrs);
  }, [node.id, onTransform]);
  
  const handleDragEnd = useCallback((attrs: any) => {
    onDragEnd(node.id, attrs);
  }, [node.id, onDragEnd]);

  if (node.type === 'layer') {
    const layer = node.data as ImageLayerData;
    return (
      <ImageLayerComponent
        layer={layer}
        isSelected={isSelected}
        onSelect={() => onSelect(node.id, 'layer', false)}
        onTransform={handleTransform}
      />
    );
  }

  // Render subcanvas
  const subcanvas = node.data as SubcanvasData;
  
  return (
    <SubcanvasComponent
      subcanvas={subcanvas}
      isActive={false}
      isSelected={isSelected}
      onSelect={handleSelect}
      onTransform={handleTransform}
      depth={node.depth}
    >
      {/* Recursively render children */}
      {node.children.map(childNode => (
        <LayerRenderer
          key={childNode.id}
          node={childNode}
          selectedIds={selectedIds}
          onSelect={onSelect}
          onTransform={onTransform}
          onDragEnd={onDragEnd}
          isTransforming={isTransforming}
        />
      ))}
    </SubcanvasComponent>
  );
});

LayerRenderer.displayName = 'LayerRenderer';
