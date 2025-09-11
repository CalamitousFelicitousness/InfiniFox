/**
 * LayerManager - Orchestrates layer rendering and management
 */

import React, { useMemo, useCallback } from 'react';
import { Layer } from 'react-konva';
import { useStore } from '../../../../store/store';
import ImageLayerComponent from './ImageLayer';
import type { ImageLayerData } from '../../../../types/layers';

interface LayerManagerProps {
  viewportBounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  onLayerSelect?: (layerId: string) => void;
  onLayerTransform?: (layerId: string, attrs: any) => void;
}

const LayerManager: React.FC<LayerManagerProps> = ({
  viewportBounds,
  onLayerSelect,
  onLayerTransform
}) => {
  const {
    imageLayers,
    layerOrder,
    selection,
    getLayersInBounds,
    selectLayer,
    performCleanup
  } = useStore();

  // Get visible layers in viewport
  const visibleLayers = useMemo(() => {
    if (viewportBounds) {
      return getLayersInBounds(viewportBounds);
    }
    
    // Get all visible layers if no viewport bounds
    return layerOrder
      .map(id => imageLayers.get(id))
      .filter((layer): layer is ImageLayerData => 
        layer !== undefined && layer.visible
      );
  }, [imageLayers, layerOrder, viewportBounds, getLayersInBounds]);

  // Handle layer selection
  const handleLayerSelect = useCallback((layerId: string) => {
    selectLayer(layerId);
    onLayerSelect?.(layerId);
  }, [selectLayer, onLayerSelect]);

  // Handle layer transform
  const handleLayerTransform = useCallback((layerId: string, attrs: any) => {
    onLayerTransform?.(layerId, attrs);
  }, [onLayerTransform]);

  // Perform cleanup periodically
  React.useEffect(() => {
    const interval = setInterval(() => {
      performCleanup();
    }, 5000); // Cleanup every 5 seconds
    
    return () => clearInterval(interval);
  }, [performCleanup]);

  return (
    <>
      {/* Background layer for reference */}
      <Layer name="background" listening={false}>
        {/* Grid, reference images, etc. can go here */}
      </Layer>
      
      {/* Main layer for image layers */}
      <Layer name="main">
        {visibleLayers.map(layer => (
          <ImageLayerComponent
            key={layer.id}
            layer={layer}
            isSelected={selection.layerIds.includes(layer.id)}
            onSelect={handleLayerSelect}
            onTransform={handleLayerTransform}
          />
        ))}
      </Layer>
      
      {/* Overlay layer for UI elements */}
      <Layer name="overlay" listening={false}>
        {/* Selection rectangles, snap guides, etc. can go here */}
      </Layer>
    </>
  );
};

export default LayerManager;
