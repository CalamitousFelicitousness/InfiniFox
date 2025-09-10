import React from 'react'
import { CanvasModeIndicator } from '../CanvasModeIndicator'
import { DraggableCanvasToolbar } from '../DraggableCanvasToolbar'
import { DraggableZoomControls } from '../DraggableZoomControls'
import { FloatingDrawingPanel } from '../FloatingDrawingPanel'
import { SizeIndicator } from '../SizeIndicator'
import { CanvasTool } from '../hooks/useCanvasTools'

interface CanvasOverlaysProps {
  // Mode indicator
  keyboardMode: string | null
  
  // Toolbar
  currentTool: CanvasTool
  onToolChange: (tool: CanvasTool) => void
  
  // Zoom controls
  scale: number
  onZoomIn: () => void
  onZoomOut: () => void
  onResetViewport: () => void
  
  // Drawing panel
  isDrawingTool: boolean
  drawingTool?: 'brush' | 'eraser'
  
  // Size indicator
  selectedId: string | null
  elements?: Array<{
    id: string
    x: number
    y: number
    type: 'image' | 'frame'
    image?: HTMLImageElement
    width?: number
    height?: number
  }>
  position?: { x: number; y: number }
  
  // Selection mode
  canvasSelectionMode?: {
    active: boolean
    mode?: string
  }
  onCancelSelection?: () => void
  
  // File dragging
  isDraggingFile?: boolean
}

/**
 * Container component for all UI overlays that appear on top of the canvas
 * Centralizes overlay management and reduces clutter in the main Canvas component
 */
export function CanvasOverlays({
  keyboardMode,
  currentTool,
  onToolChange,
  scale,
  onZoomIn,
  onZoomOut,
  onResetViewport,
  isDrawingTool,
  drawingTool,
  selectedId,
  elements,
  position,
  canvasSelectionMode,
  onCancelSelection,
  isDraggingFile,
}: CanvasOverlaysProps) {
  return (
    <>
      {/* Selection mode overlay */}
      {canvasSelectionMode?.active && (
        <div className="selection-mode-overlay">
          <div className="selection-mode-header">
            <h3>Select an image for {canvasSelectionMode.mode}</h3>
            {onCancelSelection && (
              <button className="cancel-selection-btn" onClick={onCancelSelection}>
                Cancel
              </button>
            )}
          </div>
          <div className="selection-mode-hint">Click on any image to select it</div>
        </div>
      )}

      {/* Keyboard mode indicator */}
      <CanvasModeIndicator mode={keyboardMode} position="bottom-center" />

      {/* Tool toolbar */}
      <DraggableCanvasToolbar currentTool={currentTool} onToolChange={onToolChange} />

      {/* Zoom controls */}
      <DraggableZoomControls
        scale={scale}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onReset={onResetViewport}
      />

      {/* Floating drawing panel */}
      <FloatingDrawingPanel
        visible={isDrawingTool}
        tool={drawingTool || (currentTool === CanvasTool.ERASER ? 'eraser' : 'brush')}
      />

      {/* Size indicator for selected elements */}
      {selectedId && elements && position && (
        <SizeIndicator
          selectedId={selectedId}
          elements={elements}
          scale={scale}
          position={position}
        />
      )}

      {/* Drag and drop overlay */}
      {isDraggingFile && (
        <div className="drag-drop-overlay">
          <div className="drag-drop-message">
            <div className="drag-drop-icon">📁</div>
            <div className="drag-drop-text">Drop image here to upload</div>
          </div>
        </div>
      )}
    </>
  )
}

/**
 * Props specifically for the minimap component
 */
interface MinimapProps {
  stageRef: React.RefObject<any>
  scale: number
  position: { x: number; y: number }
  images: Array<{
    id: string
    x: number
    y: number
    src: string
    width?: number
    height?: number
    borderColor?: string
  }>
  onViewportChange: (x: number, y: number, scale: number) => void
}

/**
 * Wrapper for the CanvasMinimap component
 * This could be imported directly in the main Canvas component if preferred
 */
export function CanvasMinimapWrapper({
  stageRef,
  scale,
  position,
  images,
  onViewportChange,
}: MinimapProps) {
  const { CanvasMinimap } = require('../CanvasMinimap')
  
  return (
    <CanvasMinimap
      stageRef={stageRef}
      scale={scale}
      position={position}
      images={images}
      onViewportChange={onViewportChange}
    />
  )
}
