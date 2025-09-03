/**
 * FilterPreview.tsx - Visual Preview System for Filter Pipeline
 * 
 * Provides multiple preview modes for comparing original and filtered images:
 * - Split screen (vertical divider)
 * - Side-by-side comparison
 * - Onion skin (transparent overlay)
 * - Difference mode (shows changes)
 * 
 * Part of Phase 2.2 of the Professional Image Editing Integration Plan
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import Konva from 'konva';
import { Stage, Layer, Image as KonvaImage, Rect, Line, Text, Group } from 'react-konva';
import { FilterChain } from './FilterChain';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { 
  SplitIcon, 
  LayersIcon, 
  EyeIcon, 
  EyeOffIcon,
  RefreshCwIcon,
  DownloadIcon,
  MaximizeIcon
} from 'lucide-react';

/**
 * Preview modes
 */
export type PreviewMode = 'split' | 'side-by-side' | 'onion-skin' | 'difference' | 'toggle' | null;

/**
 * Props for FilterPreview component
 */
interface FilterPreviewProps {
  image: HTMLImageElement;
  filterChain: FilterChain;
  width?: number;
  height?: number;
  mode?: PreviewMode;
  onModeChange?: (mode: PreviewMode) => void;
  className?: string;
  showControls?: boolean;
  autoUpdate?: boolean;
}

/**
 * FilterPreview Component
 */
export const FilterPreview: React.FC<FilterPreviewProps> = ({
  image,
  filterChain,
  width = 800,
  height = 600,
  mode: initialMode = 'split',
  onModeChange,
  className = '',
  showControls = true,
  autoUpdate = true
}) => {
  const stageRef = useRef<Konva.Stage>(null);
  const originalImageRef = useRef<Konva.Image>(null);
  const filteredImageRef = useRef<Konva.Image>(null);
  const dividerRef = useRef<Konva.Line>(null);
  
  const [mode, setMode] = useState<PreviewMode>(initialMode);
  const [splitPosition, setSplitPosition] = useState(width / 2);
  const [onionOpacity, setOnionOpacity] = useState(0.5);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [scale, setScale] = useState(1);
  
  // Calculate scaled dimensions
  const scaledWidth = Math.min(width, image.width * scale);
  const scaledHeight = Math.min(height, image.height * scale);
  
  /**
   * Apply filters to the image
   */
  const applyFilters = useCallback(async () => {
    if (!filteredImageRef.current || !filterChain.hasFilters()) {
      return;
    }
    
    setIsProcessing(true);
    
    try {
      await filterChain.applyToNode(filteredImageRef.current, {
        preview: true,
        progressCallback: (progress) => {
          // Could update a progress bar here
          console.log(`Processing: ${progress}%`);
        }
      });
      
      // Redraw the stage
      stageRef.current?.batchDraw();
    } catch (error) {
      console.error('Failed to apply filters:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [filterChain]);
  
  /**
   * Update preview when filter chain changes
   */
  useEffect(() => {
    if (autoUpdate) {
      applyFilters();
    }
  }, [filterChain, autoUpdate, applyFilters]);
  
  /**
   * Handle mode change
   */
  const handleModeChange = (newMode: PreviewMode) => {
    setMode(newMode);
    onModeChange?.(newMode);
    
    // Reset mode-specific states
    if (newMode === 'split') {
      setSplitPosition(width / 2);
    } else if (newMode === 'onion-skin') {
      setOnionOpacity(0.5);
    }
  };
  
  /**
   * Handle split divider drag
   */
  const handleDividerDrag = (e: Konva.KonvaEventObject<DragEvent>) => {
    const newX = Math.max(0, Math.min(width, e.target.x()));
    setSplitPosition(newX);
    e.target.x(newX);
    
    // Update clipping
    if (filteredImageRef.current) {
      filteredImageRef.current.clipFunc((ctx) => {
        ctx.rect(0, 0, newX, height);
      });
    }
  };
  
  /**
   * Export preview as image
   */
  const exportPreview = () => {
    if (!stageRef.current) return;
    
    const dataURL = stageRef.current.toDataURL({
      pixelRatio: 2
    });
    
    // Create download link
    const link = document.createElement('a');
    link.download = `preview-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
  };
  
  /**
   * Reset filters
   */
  const resetFilters = () => {
    filterChain.clear();
    applyFilters();
  };
  
  /**
   * Render split mode
   */
  const renderSplitMode = () => (
    <>
      <Layer>
        {/* Original image (full) */}
        <KonvaImage
          ref={originalImageRef}
          image={image}
          width={scaledWidth}
          height={scaledHeight}
        />
      </Layer>
      
      <Layer>
        {/* Filtered image (clipped) */}
        <KonvaImage
          ref={filteredImageRef}
          image={image}
          width={scaledWidth}
          height={scaledHeight}
          clipFunc={(ctx) => {
            ctx.rect(splitPosition, 0, scaledWidth - splitPosition, scaledHeight);
          }}
        />
        
        {/* Divider line */}
        <Line
          ref={dividerRef}
          points={[splitPosition, 0, splitPosition, scaledHeight]}
          stroke="#fff"
          strokeWidth={2}
          dash={[5, 5]}
          draggable
          dragBoundFunc={(pos) => ({
            x: Math.max(0, Math.min(scaledWidth, pos.x)),
            y: 0
          })}
          onDragMove={handleDividerDrag}
        />
        
        {/* Divider handle */}
        <Rect
          x={splitPosition - 20}
          y={scaledHeight / 2 - 20}
          width={40}
          height={40}
          fill="white"
          stroke="#333"
          strokeWidth={2}
          cornerRadius={20}
          draggable
          dragBoundFunc={(pos) => ({
            x: Math.max(-20, Math.min(scaledWidth - 20, pos.x)),
            y: scaledHeight / 2 - 20
          })}
          onDragMove={(e) => {
            const newX = e.target.x() + 20;
            setSplitPosition(newX);
            if (dividerRef.current) {
              dividerRef.current.points([newX, 0, newX, scaledHeight]);
            }
            handleDividerDrag(e);
          }}
        />
        
        {/* Labels */}
        <Text
          x={10}
          y={10}
          text="Original"
          fontSize={14}
          fill="white"
          stroke="black"
          strokeWidth={0.5}
        />
        <Text
          x={scaledWidth - 60}
          y={10}
          text="Filtered"
          fontSize={14}
          fill="white"
          stroke="black"
          strokeWidth={0.5}
        />
      </Layer>
    </>
  );
  
  /**
   * Render side-by-side mode
   */
  const renderSideBySideMode = () => {
    const halfWidth = scaledWidth / 2;
    
    return (
      <Layer>
        <Group>
          {/* Original image (left half) */}
          <KonvaImage
            ref={originalImageRef}
            image={image}
            width={halfWidth - 5}
            height={scaledHeight}
            scaleX={(halfWidth - 5) / image.width}
            scaleY={scaledHeight / image.height}
          />
          <Text
            x={10}
            y={10}
            text="Original"
            fontSize={14}
            fill="white"
            stroke="black"
            strokeWidth={0.5}
          />
        </Group>
        
        <Group x={halfWidth + 5}>
          {/* Filtered image (right half) */}
          <KonvaImage
            ref={filteredImageRef}
            image={image}
            width={halfWidth - 5}
            height={scaledHeight}
            scaleX={(halfWidth - 5) / image.width}
            scaleY={scaledHeight / image.height}
          />
          <Text
            x={10}
            y={10}
            text="Filtered"
            fontSize={14}
            fill="white"
            stroke="black"
            strokeWidth={0.5}
          />
        </Group>
        
        {/* Center divider */}
        <Line
          points={[halfWidth, 0, halfWidth, scaledHeight]}
          stroke="#333"
          strokeWidth={2}
        />
      </Layer>
    );
  };
  
  /**
   * Render onion skin mode
   */
  const renderOnionSkinMode = () => (
    <Layer>
      {/* Original image */}
      <KonvaImage
        ref={originalImageRef}
        image={image}
        width={scaledWidth}
        height={scaledHeight}
      />
      
      {/* Filtered image with opacity */}
      <KonvaImage
        ref={filteredImageRef}
        image={image}
        width={scaledWidth}
        height={scaledHeight}
        opacity={onionOpacity}
      />
    </Layer>
  );
  
  /**
   * Render difference mode
   */
  const renderDifferenceMode = () => (
    <Layer>
      {/* Original image */}
      <KonvaImage
        ref={originalImageRef}
        image={image}
        width={scaledWidth}
        height={scaledHeight}
      />
      
      {/* Filtered image with difference blend */}
      <KonvaImage
        ref={filteredImageRef}
        image={image}
        width={scaledWidth}
        height={scaledHeight}
        globalCompositeOperation="difference"
      />
    </Layer>
  );
  
  /**
   * Render toggle mode
   */
  const renderToggleMode = () => (
    <Layer>
      <KonvaImage
        ref={showOriginal ? originalImageRef : filteredImageRef}
        image={image}
        width={scaledWidth}
        height={scaledHeight}
      />
      
      <Text
        x={10}
        y={10}
        text={showOriginal ? "Original" : "Filtered"}
        fontSize={14}
        fill="white"
        stroke="black"
        strokeWidth={0.5}
      />
    </Layer>
  );
  
  /**
   * Render based on current mode
   */
  const renderPreview = () => {
    switch (mode) {
      case 'split':
        return renderSplitMode();
      case 'side-by-side':
        return renderSideBySideMode();
      case 'onion-skin':
        return renderOnionSkinMode();
      case 'difference':
        return renderDifferenceMode();
      case 'toggle':
        return renderToggleMode();
      default:
        return (
          <Layer>
            <KonvaImage
              ref={filteredImageRef}
              image={image}
              width={scaledWidth}
              height={scaledHeight}
            />
          </Layer>
        );
    }
  };
  
  return (
    <div className={`filter-preview ${className}`}>
      {showControls && (
        <div className="preview-controls flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-t-lg">
          {/* Mode selector */}
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={mode === 'split' ? 'default' : 'outline'}
              onClick={() => handleModeChange('split')}
              title="Split view"
            >
              <SplitIcon className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={mode === 'side-by-side' ? 'default' : 'outline'}
              onClick={() => handleModeChange('side-by-side')}
              title="Side by side"
            >
              <LayersIcon className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={mode === 'onion-skin' ? 'default' : 'outline'}
              onClick={() => handleModeChange('onion-skin')}
              title="Onion skin"
            >
              <EyeIcon className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={mode === 'difference' ? 'default' : 'outline'}
              onClick={() => handleModeChange('difference')}
              title="Difference"
            >
              <EyeOffIcon className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={mode === 'toggle' ? 'default' : 'outline'}
              onClick={() => handleModeChange('toggle')}
              title="Toggle"
            >
              <RefreshCwIcon className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Mode-specific controls */}
          {mode === 'onion-skin' && (
            <div className="flex items-center gap-2 ml-4">
              <span className="text-sm">Opacity:</span>
              <Slider
                value={[onionOpacity]}
                onValueChange={([value]) => setOnionOpacity(value)}
                max={1}
                min={0}
                step={0.01}
                className="w-32"
              />
            </div>
          )}
          
          {mode === 'toggle' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowOriginal(!showOriginal)}
              className="ml-4"
            >
              Show {showOriginal ? 'Filtered' : 'Original'}
            </Button>
          )}
          
          <div className="flex-1" />
          
          {/* Action buttons */}
          <Button
            size="sm"
            variant="outline"
            onClick={applyFilters}
            disabled={isProcessing}
          >
            <RefreshCwIcon className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={resetFilters}
            title="Reset filters"
          >
            Reset
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={exportPreview}
            title="Export preview"
          >
            <DownloadIcon className="w-4 h-4" />
          </Button>
          
          {/* Zoom control */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setScale(1)}
            >
              <MaximizeIcon className="w-4 h-4" />
            </Button>
            <Slider
              value={[scale]}
              onValueChange={([value]) => setScale(value)}
              max={2}
              min={0.1}
              step={0.1}
              className="w-24"
            />
            <span className="text-sm">{Math.round(scale * 100)}%</span>
          </div>
        </div>
      )}
      
      <div className="preview-stage border border-gray-300 dark:border-gray-700 rounded-b-lg overflow-hidden">
        <Stage
          ref={stageRef}
          width={scaledWidth}
          height={scaledHeight}
          className="bg-checkered"
        >
          {renderPreview()}
        </Stage>
      </div>
      
      {isProcessing && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="text-white">Processing filters...</div>
        </div>
      )}
    </div>
  );
};

export default FilterPreview;
