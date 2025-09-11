/**
 * LayerManager - Main Canvas Orchestration
 * Phase 3: Unified hierarchy with event delegation and transformer integration
 */

import React, { useMemo, useCallback, useRef, useState } from 'react';
import { Stage, Layer } from 'react-konva';
import Konva from 'konva';
import { useStore } from '../../../../store/store';
import { LayerHierarchyBuilder, type HierarchyNode } from './LayerHierarchyBuilder';
import { LayerRenderer } from './LayerRenderer';
import SelectionManager from './SelectionManager';

interface LayerManagerProps {
  width: number;
  height: number;
  viewportBounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  onSelectionChange?: (selectedIds: string[]) => void;
  onHierarchyChange?: (hierarchy: HierarchyNode[]) => void;
}

const LayerManager: React.FC<LayerManagerProps> = ({
  width,
  height,
  viewportBounds,
  onSelectionChange,
  onHierarchyChange
}) => {
  const stageRef = useRef<Konva.Stage>(null);
  const dragLayerRef = useRef<Konva.Layer>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  
  const {
    imageLayers,
    layerOrder,
    selection,
    subcanvases,
    subcanvasOrder,
    subcanvasSelection,
    selectLayer,
    selectLayers,
    clearSelection,
    selectSubcanvas,
    selectSubcanvases,
    clearSubcanvasSelection,
    updateLayerTransform,
    updateSubcanvasTransform,
    performCleanup
  } = useStore();

  // Build unified hierarchy
  const hierarchy = useMemo(() => {
    const nodes = LayerHierarchyBuilder.buildHierarchy(
      imageLayers,
      subcanvases,
      layerOrder,
      subcanvasOrder
    );
    
    onHierarchyChange?.(nodes);
    return nodes;
  }, [imageLayers, subcanvases, layerOrder, subcanvasOrder, onHierarchyChange]);

  // Get visible nodes in viewport
  const visibleNodes = useMemo(() => {
    if (viewportBounds) {
      return LayerHierarchyBuilder.getNodesInBounds(hierarchy, viewportBounds);
    }
    return LayerHierarchyBuilder.getVisibleNodes(hierarchy);
  }, [hierarchy, viewportBounds]);

  // Combined selection
  const selectedIds = useMemo(() => [
    ...selection.layerIds,
    ...subcanvasSelection.subcanvasIds
  ], [selection.layerIds, subcanvasSelection.subcanvasIds]);

  // Handle selection
  const handleNodeSelect = useCallback((id: string, type: 'layer' | 'subcanvas', multi: boolean) => {
    if (type === 'layer') {
      selectLayer(id, multi);
      if (!multi) clearSubcanvasSelection();
    } else {
      selectSubcanvas(id, multi);
      if (!multi) clearSelection();
    }
  }, [selectLayer, selectSubcanvas, clearSelection, clearSubcanvasSelection]);

  // Handle transform
  const handleNodeTransform = useCallback((id: string, attrs: any) => {
    const node = LayerHierarchyBuilder.getNodeById(hierarchy, id);
    if (!node) return;
    
    if (node.type === 'layer') {
      updateLayerTransform(id, attrs);
    } else {
      updateSubcanvasTransform(id, attrs);
    }
  }, [hierarchy, updateLayerTransform, updateSubcanvasTransform]);

  // Handle drag end
  const handleNodeDragEnd = useCallback((id: string, attrs: any) => {
    handleNodeTransform(id, attrs);
    setIsDragging(false);
    setDraggedNodeId(null);
  }, [handleNodeTransform]);

  // Event delegation for drag operations
  const handleStageDragStart = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    if (node === stageRef.current) return;
    
    // Move to drag layer for better performance
    if (dragLayerRef.current) {
      const parent = node.getParent();
      if (parent && parent !== dragLayerRef.current) {
        node.moveTo(dragLayerRef.current);
        setIsDragging(true);
        setDraggedNodeId(node.id());
      }
    }
  }, []);

  const handleStageDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    if (node === stageRef.current) return;
    
    // Move back to main layer
    const mainLayer = stageRef.current?.findOne('.main-layer');
    if (mainLayer && node.getParent() === dragLayerRef.current) {
      node.moveTo(mainLayer);
    }
    
    // Update transform
    const name = node.name();
    if (name.startsWith('layer-') || name.startsWith('subcanvas-')) {
      const id = name.replace(/^(layer|subcanvas)-/, '');
      handleNodeDragEnd(id, {
        x: node.x(),
        y: node.y()
      });
    }
  }, [handleNodeDragEnd]);

  // Perform cleanup periodically
  React.useEffect(() => {
    const interval = setInterval(() => {
      performCleanup();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [performCleanup]);

  // Setup stage event delegation
  React.useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    
    // Delegate drag events
    stage.on('dragstart', handleStageDragStart);
    stage.on('dragend', handleStageDragEnd);
    
    return () => {
      stage.off('dragstart', handleStageDragStart);
      stage.off('dragend', handleStageDragEnd);
    };
  }, [handleStageDragStart, handleStageDragEnd]);

  return (
    <Stage ref={stageRef} width={width} height={height}>
      {/* Background layer */}
      <Layer name="background" listening={false}>
        {/* Grid, guides, etc. */}
      </Layer>
      
      {/* Main content layer */}
      <Layer name="main-layer" className="main-layer">
        {/* Render hierarchy */}
        {hierarchy.map(node => (
          <LayerRenderer
            key={node.id}
            node={node}
            selectedIds={selectedIds}
            onSelect={handleNodeSelect}
            onTransform={handleNodeTransform}
            onDragEnd={handleNodeDragEnd}
            isTransforming={isDragging && draggedNodeId === node.id}
          />
        ))}
        
        {/* Selection manager with transformer */}
        <SelectionManager
          stageRef={stageRef}
          onSelectionChange={onSelectionChange}
        />
      </Layer>
      
      {/* Drag layer for performance */}
      <Layer ref={dragLayerRef} name="drag-layer" />
      
      {/* Overlay layer for UI elements */}
      <Layer name="overlay" listening={false}>
        {/* Tooltips, indicators, etc. */}
      </Layer>
    </Stage>
  );
};

export default LayerManager;
