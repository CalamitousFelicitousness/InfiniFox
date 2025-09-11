/**
 * LayerHierarchyBuilder - Constructs unified hierarchy tree
 * Phase 3: Main Canvas Orchestration
 */

import type { ImageLayerData } from '../../../../types/layers';
import type { SubcanvasData } from '../../../../types/subcanvas';

export interface HierarchyNode {
  id: string;
  type: 'layer' | 'subcanvas';
  data: ImageLayerData | SubcanvasData;
  children: HierarchyNode[];
  depth: number;
  parentId: string | null;
}

export class LayerHierarchyBuilder {
  static buildHierarchy(
    layers: Map<string, ImageLayerData>,
    subcanvases: Map<string, SubcanvasData>,
    layerOrder: string[],
    subcanvasOrder: string[]
  ): HierarchyNode[] {
    const nodes: HierarchyNode[] = [];
    const processedLayers = new Set<string>();
    const processedSubcanvases = new Set<string>();

    // Process root subcanvases
    subcanvasOrder.forEach(subcanvasId => {
      const subcanvas = subcanvases.get(subcanvasId);
      if (subcanvas && !subcanvas.parentId) {
        const node = this.buildSubcanvasNode(
          subcanvas,
          layers,
          subcanvases,
          processedLayers,
          processedSubcanvases,
          0
        );
        nodes.push(node);
      }
    });

    // Process root layers (layers without parent)
    layerOrder.forEach(layerId => {
      if (!processedLayers.has(layerId)) {
        const layer = layers.get(layerId);
        if (layer && !layer.parentId) {
          nodes.push({
            id: layer.id,
            type: 'layer',
            data: layer,
            children: [],
            depth: 0,
            parentId: null
          });
          processedLayers.add(layerId);
        }
      }
    });

    return nodes;
  }

  private static buildSubcanvasNode(
    subcanvas: SubcanvasData,
    layers: Map<string, ImageLayerData>,
    subcanvases: Map<string, SubcanvasData>,
    processedLayers: Set<string>,
    processedSubcanvases: Set<string>,
    depth: number
  ): HierarchyNode {
    processedSubcanvases.add(subcanvas.id);
    const children: HierarchyNode[] = [];

    // Add child subcanvases
    subcanvas.childSubcanvasIds.forEach(childId => {
      const childSubcanvas = subcanvases.get(childId);
      if (childSubcanvas && !processedSubcanvases.has(childId)) {
        children.push(
          this.buildSubcanvasNode(
            childSubcanvas,
            layers,
            subcanvases,
            processedLayers,
            processedSubcanvases,
            depth + 1
          )
        );
      }
    });

    // Add child layers
    subcanvas.childLayerIds.forEach(layerId => {
      const layer = layers.get(layerId);
      if (layer && !processedLayers.has(layerId)) {
        children.push({
          id: layer.id,
          type: 'layer',
          data: layer,
          children: [],
          depth: depth + 1,
          parentId: subcanvas.id
        });
        processedLayers.add(layerId);
      }
    });

    return {
      id: subcanvas.id,
      type: 'subcanvas',
      data: subcanvas,
      children,
      depth,
      parentId: subcanvas.parentId
    };
  }

  static flattenHierarchy(nodes: HierarchyNode[]): HierarchyNode[] {
    const flat: HierarchyNode[] = [];
    
    const traverse = (node: HierarchyNode) => {
      flat.push(node);
      node.children.forEach(traverse);
    };
    
    nodes.forEach(traverse);
    return flat;
  }

  static getNodeById(nodes: HierarchyNode[], id: string): HierarchyNode | null {
    for (const node of nodes) {
      if (node.id === id) return node;
      const found = this.getNodeById(node.children, id);
      if (found) return found;
    }
    return null;
  }

  static getVisibleNodes(nodes: HierarchyNode[]): HierarchyNode[] {
    const visible: HierarchyNode[] = [];
    
    const traverse = (node: HierarchyNode) => {
      const isVisible = node.type === 'layer' 
        ? (node.data as ImageLayerData).visible
        : (node.data as SubcanvasData).visible;
      
      if (isVisible) {
        visible.push(node);
        node.children.forEach(traverse);
      }
    };
    
    nodes.forEach(traverse);
    return visible;
  }

  static getNodesInBounds(
    nodes: HierarchyNode[],
    bounds: { x: number; y: number; width: number; height: number }
  ): HierarchyNode[] {
    const inBounds: HierarchyNode[] = [];
    
    const checkNode = (node: HierarchyNode) => {
      const transform = node.data.transform;
      let nodeBounds: { x: number; y: number; width: number; height: number };
      
      if (node.type === 'layer') {
        const layer = node.data as ImageLayerData;
        nodeBounds = {
          x: transform.x,
          y: transform.y,
          width: layer.width * Math.abs(transform.scaleX),
          height: layer.height * Math.abs(transform.scaleY)
        };
      } else {
        const subcanvas = node.data as SubcanvasData;
        nodeBounds = {
          x: transform.x,
          y: transform.y,
          width: subcanvas.width * Math.abs(transform.scaleX),
          height: subcanvas.height * Math.abs(transform.scaleY)
        };
      }
      
      // Check intersection
      if (
        nodeBounds.x < bounds.x + bounds.width &&
        nodeBounds.x + nodeBounds.width > bounds.x &&
        nodeBounds.y < bounds.y + bounds.height &&
        nodeBounds.y + nodeBounds.height > bounds.y
      ) {
        inBounds.push(node);
      }
      
      // Check children
      node.children.forEach(checkNode);
    };
    
    nodes.forEach(checkNode);
    return inBounds;
  }
}
