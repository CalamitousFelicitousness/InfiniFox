/**
 * SelectionManager - Handles selection and transformer management
 * Phase 3: Main Canvas Orchestration
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Rect, Transformer } from 'react-konva';
import Konva from 'konva';
import { useStore } from '../../../../store/store';

interface SelectionManagerProps {
  stageRef: React.RefObject<Konva.Stage>;
  onSelectionChange?: (selectedIds: string[]) => void;
}

interface SelectionRect {
  visible: boolean;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export const SelectionManager: React.FC<SelectionManagerProps> = ({
  stageRef,
  onSelectionChange
}) => {
  const transformerRef = useRef<Konva.Transformer>(null);
  const [selectionRect, setSelectionRect] = useState<SelectionRect>({
    visible: false,
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 0
  });
  const [selectedNodes, setSelectedNodes] = useState<Konva.Node[]>([]);
  
  const {
    selection,
    subcanvasSelection,
    selectLayer,
    selectLayers,
    clearSelection,
    selectSubcanvas,
    selectSubcanvases,
    clearSubcanvasSelection
  } = useStore();

  // Combine layer and subcanvas selections
  const allSelectedIds = [
    ...selection.layerIds,
    ...subcanvasSelection.subcanvasIds
  ];

  // Update transformer when selection changes
  useEffect(() => {
    if (!transformerRef.current || !stageRef.current) return;
    
    const stage = stageRef.current;
    const nodes: Konva.Node[] = [];
    
    // Find selected nodes
    allSelectedIds.forEach(id => {
      const layerNode = stage.findOne(`#layer-${id}`);
      if (layerNode) nodes.push(layerNode);
      
      const subcanvasNode = stage.findOne(`#subcanvas-${id}`);
      if (subcanvasNode) nodes.push(subcanvasNode);
    });
    
    setSelectedNodes(nodes);
    transformerRef.current.nodes(nodes);
    
    onSelectionChange?.(allSelectedIds);
  }, [allSelectedIds, stageRef, onSelectionChange]);

  // Handle selection rectangle
  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // Only start selection rect on stage click
    if (e.target !== stageRef.current) return;
    
    const pos = stageRef.current!.getPointerPosition();
    if (!pos) return;
    
    setSelectionRect({
      visible: true,
      x1: pos.x,
      y1: pos.y,
      x2: pos.x,
      y2: pos.y
    });
  }, [stageRef]);

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!selectionRect.visible) return;
    
    const pos = stageRef.current!.getPointerPosition();
    if (!pos) return;
    
    setSelectionRect(prev => ({
      ...prev,
      x2: pos.x,
      y2: pos.y
    }));
  }, [selectionRect.visible, stageRef]);

  const handleMouseUp = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!selectionRect.visible) return;
    
    const stage = stageRef.current;
    if (!stage) return;
    
    // Hide selection rect
    setSelectionRect(prev => ({ ...prev, visible: false }));
    
    // Find nodes in selection
    const box = {
      x: Math.min(selectionRect.x1, selectionRect.x2),
      y: Math.min(selectionRect.y1, selectionRect.y2),
      width: Math.abs(selectionRect.x2 - selectionRect.x1),
      height: Math.abs(selectionRect.y2 - selectionRect.y1)
    };
    
    // Skip if selection rect is too small
    if (box.width < 5 || box.height < 5) return;
    
    const selectedLayerIds: string[] = [];
    const selectedSubcanvasIds: string[] = [];
    
    // Find all shapes in selection
    const shapes = stage.find('.layer, .subcanvas');
    shapes.forEach(shape => {
      const shapeBox = shape.getClientRect();
      if (Konva.Util.haveIntersection(box, shapeBox)) {
        const name = shape.name();
        if (name.startsWith('layer-')) {
          selectedLayerIds.push(name.replace('layer-', ''));
        } else if (name.startsWith('subcanvas-')) {
          selectedSubcanvasIds.push(name.replace('subcanvas-', ''));
        }
      }
    });
    
    // Update selections
    if (selectedLayerIds.length > 0) {
      selectLayers(selectedLayerIds);
    }
    if (selectedSubcanvasIds.length > 0) {
      selectSubcanvases(selectedSubcanvasIds);
    }
  }, [selectionRect, stageRef, selectLayers, selectSubcanvases]);

  // Handle click selection
  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // Clear selection on empty click
    if (e.target === stageRef.current) {
      clearSelection();
      clearSubcanvasSelection();
      return;
    }
    
    const name = e.target.name();
    const metaPressed = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
    
    if (name.startsWith('layer-')) {
      const layerId = name.replace('layer-', '');
      selectLayer(layerId, metaPressed);
      if (!metaPressed) clearSubcanvasSelection();
    } else if (name.startsWith('subcanvas-')) {
      const subcanvasId = name.replace('subcanvas-', '');
      selectSubcanvas(subcanvasId, metaPressed);
      if (!metaPressed) clearSelection();
    }
  }, [stageRef, clearSelection, clearSubcanvasSelection, selectLayer, selectSubcanvas]);

  // Handle transformer events
  const handleTransformStart = useCallback(() => {
    // Store initial transforms
  }, []);

  const handleTransform = useCallback(() => {
    // Update transforms in real-time if needed
  }, []);

  const handleTransformEnd = useCallback((e: Konva.KonvaEventObject<Event>) => {
    const nodes = transformerRef.current?.nodes() || [];
    
    nodes.forEach(node => {
      const name = node.name();
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      
      // Reset scale on node
      node.scaleX(1);
      node.scaleY(1);
      
      // Update store with new transform
      const transform = {
        x: node.x(),
        y: node.y(),
        scaleX,
        scaleY,
        rotation: node.rotation()
      };
      
      if (name.startsWith('layer-')) {
        const layerId = name.replace('layer-', '');
        useStore.getState().updateLayerTransform(layerId, transform);
      } else if (name.startsWith('subcanvas-')) {
        const subcanvasId = name.replace('subcanvas-', '');
        useStore.getState().updateSubcanvasTransform(subcanvasId, transform);
      }
    });
  }, []);

  // Attach event listeners to stage
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    
    stage.on('mousedown touchstart', handleMouseDown);
    stage.on('mousemove touchmove', handleMouseMove);
    stage.on('mouseup touchend', handleMouseUp);
    stage.on('click tap', handleStageClick);
    
    return () => {
      stage.off('mousedown touchstart', handleMouseDown);
      stage.off('mousemove touchmove', handleMouseMove);
      stage.off('mouseup touchend', handleMouseUp);
      stage.off('click tap', handleStageClick);
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp, handleStageClick, stageRef]);

  return (
    <>
      {/* Selection rectangle */}
      {selectionRect.visible && (
        <Rect
          x={Math.min(selectionRect.x1, selectionRect.x2)}
          y={Math.min(selectionRect.y1, selectionRect.y2)}
          width={Math.abs(selectionRect.x2 - selectionRect.x1)}
          height={Math.abs(selectionRect.y2 - selectionRect.y1)}
          fill="rgba(0, 100, 255, 0.1)"
          stroke="rgba(0, 100, 255, 0.5)"
          strokeWidth={1}
          listening={false}
        />
      )}
      
      {/* Transformer */}
      <Transformer
        ref={transformerRef}
        boundBoxFunc={(oldBox, newBox) => {
          // Limit minimum size
          if (newBox.width < 5 || newBox.height < 5) {
            return oldBox;
          }
          return newBox;
        }}
        onTransformStart={handleTransformStart}
        onTransform={handleTransform}
        onTransformEnd={handleTransformEnd}
        rotateEnabled={true}
        enabledAnchors={[
          'top-left',
          'top-center',
          'top-right',
          'middle-left',
          'middle-right',
          'bottom-left',
          'bottom-center',
          'bottom-right'
        ]}
        anchorFill="#0066ff"
        anchorStroke="#0066ff"
        borderStroke="#0066ff"
        borderDash={[3, 3]}
        keepRatio={false}
        shouldOverdrawWholeArea={false}
        ignoreStroke={true}
      />
    </>
  );
};

export default SelectionManager;
