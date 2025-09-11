import Konva from 'konva'
import React, { useRef, useEffect, useMemo } from 'react'

// Store and utilities
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { snappingManager } from '../../services/canvas/SnappingManager'
import { useStore } from '../../store/store'
import { preventDefaultTouch } from '../../utils/pointerEvents'
import type { SnapGuide } from '../../services/canvas/SnappingManager'

// Custom hooks (Phase 1)
import { CanvasContextMenu } from './CanvasContextMenu'
import { CanvasMinimap } from './CanvasMinimap'
import { FloatingSnapControls } from './FloatingSnapControls'
import { CanvasOverlays } from './components/CanvasOverlays'
import { CanvasStage, useStageSize } from './components/CanvasStage'
import { DrawingLayer } from './components/DrawingLayer'
import { FrameLayer } from './components/FrameLayer'
import { GridLayer } from './components/GridLayer'
import { ImageLayer } from './components/ImageLayer'
import { SnapGuideLayer } from './components/SnapGuideLayer'
import { useCanvasEvents } from './hooks/useCanvasEvents'
import { useCanvasTools, CanvasTool } from './hooks/useCanvasTools'
import { useDrawingSystem } from './hooks/useDrawingSystem'
import { useFileOperations } from './hooks/useFileOperations'
import { useGenerationFrames } from './hooks/useGenerationFrames'
import { useImageManagement } from './hooks/useImageManagement'
import { useViewport } from './hooks/useViewport'

// Components (Phase 2)

// Existing components

import './Canvas.css'

/**
 * Main Canvas component - orchestrates the infinite canvas functionality
 * Refactored to use modular hooks and components for better maintainability
 */
export function Canvas() {
  // Refs for stage and container
  const stageRef = useRef<Konva.Stage>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Snapping state
  const [snapGuides, setSnapGuides] = React.useState<SnapGuide[]>([])
  const [gridEnabled, setGridEnabled] = React.useState(false)

  // Store state
  const {
    removeImage,
    duplicateImage,
    setImageAsInput,
    canvasSelectionMode,
    cancelCanvasSelection,
  } = useStore()

  // Initialize all hooks
  const tools = useCanvasTools()
  const viewport = useViewport(stageRef)
  const stageSize = useStageSize(400) // 400px sidebar width

  const drawing = useDrawingSystem({
    currentTool: tools.currentTool,
    scale: viewport.scale,
    position: viewport.position,
  })

  const images_ = useImageManagement({
    currentTool: tools.currentTool,
    scale: viewport.scale,
    onSnapGuidesChange: setSnapGuides,
  })

  const frames = useGenerationFrames({
    currentTool: tools.currentTool,
  })

  const fileOps = useFileOperations({
    containerRef,
    scale: viewport.scale,
    position: viewport.position,
    onImageUpload: images_.handleImageFile,
  })

  const events = useCanvasEvents({
    currentTool: tools.currentTool,
    stageRef,
    scale: viewport.scale,
    position: viewport.position,
    isPanning: viewport.isPanning,
    onDrawingPointerDown: drawing.handlePointerDown,
    onDrawingPointerMove: drawing.handlePointerMove,
    onDrawingPointerUp: drawing.handlePointerUp,
    onImageSelect: images_.handleImageSelect,
    onFrameSelect: frames.setSelectedFrameId,
    onViewportDragStart: viewport.handleStageDragStart,
    onViewportDragMove: viewport.handleStageDragMove,
    onViewportDragEnd: viewport.handleStageDragEnd,
  })

  // Prevent default touch behaviors on canvas
  useEffect(() => {
    const container = containerRef.current
    if (container) {
      preventDefaultTouch(container)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear snap guides
      setSnapGuides([])
      // Reset snapping manager
      snappingManager.setCurrentObject(null)
      snappingManager.setObjects([])
    }
  }, [])

  // Setup keyboard shortcuts
  useKeyboardShortcuts({
    onDelete: () => {
      if (images_.selectedId && tools.currentTool === CanvasTool.SELECT) {
        removeImage(images_.selectedId)
        images_.setSelectedId(null)
      }
    },
  })

  // Handle context menu actions
  const handleContextMenuAction = (action: string) => {
    const { contextMenu } = events
    // Capture values before menu closes
    const imageId = contextMenu.imageId
    const contextX = contextMenu.x
    const contextY = contextMenu.y

    switch (action) {
      case 'delete':
        if (imageId) {
          // Clear selection first to remove transformer
          if (images_.selectedId === imageId) {
            images_.setSelectedId(null)
          }
          // Then remove the image
          removeImage(imageId)
        }
        break

      case 'duplicate':
        if (imageId) {
          duplicateImage(imageId)
        }
        break

      case 'sendToImg2Img':
        if (imageId) {
          const image = images_.konvaImages.find((img) => img.id === imageId)
          if (image) {
            setImageAsInput(image.src)
          }
        }
        break

      case 'download':
        if (imageId) {
          const image = images_.konvaImages.find((img) => img.id === imageId)
          if (image) {
            const link = document.createElement('a')
            link.href = image.src
            link.download = `generated-${imageId}.png`
            link.click()
          }
        }
        break

      case 'uploadImage':
        fileOps.fileInputRef.current?.click()
        break

      case 'placeEmptyFrame':
        {
          const canvasPos = events.screenToCanvas({ x: contextX, y: contextY })
          frames.placeEmptyFrame(canvasPos.x, canvasPos.y)
        }
        break

      case 'generateHere':
        {
          const canvasPos = events.screenToCanvas({ x: contextX, y: contextY })
          frames.generateAtPosition(canvasPos.x, canvasPos.y)
        }
        break
    }

    // Menu closing is handled by the button handlers
  }

  // Handle viewport change from minimap
  const handleViewportChange = (x: number, y: number, newScale: number) => {
    viewport.setViewport(x, y, newScale)
  }

  // Extract the specific values needed for memoization
  const { konvaImages, getImageBorderColor } = images_

  // Memoize minimap images data
  const minimapImages = useMemo(
    () =>
      konvaImages.map((img) => ({
        id: img.id,
        x: img.x,
        y: img.y,
        src: img.src,
        width: img.image?.naturalWidth,
        height: img.image?.naturalHeight,
        borderColor: getImageBorderColor(img.id),
      })),
    [konvaImages, getImageBorderColor]
  )

  // Get container classes
  const containerClasses = [
    'canvas-container',
    fileOps.isDraggingFile && 'dragging-file',
    canvasSelectionMode.active && 'selection-mode',
    (tools.currentTool === CanvasTool.BRUSH || tools.currentTool === CanvasTool.ERASER) &&
      'drawing-mode',
    tools.currentTool === CanvasTool.PAN && 'pan-mode',
    viewport.isPanning && 'panning',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={containerClasses} ref={containerRef}>
      {/* FloatingSnapControls */}
      <FloatingSnapControls
        onSnapConfigChange={(config) => {
          setGridEnabled(config.gridEnabled)
        }}
      />
      
      {/* Canvas Overlays */}
      <CanvasOverlays
        keyboardMode={tools.getKeyboardMode()}
        currentTool={tools.currentTool}
        onToolChange={tools.setCurrentTool}
        scale={viewport.scale}
        onZoomIn={viewport.zoomIn}
        onZoomOut={viewport.zoomOut}
        onResetViewport={viewport.resetViewport}
        isDrawingTool={tools.isDrawingTool}
        drawingTool={tools.currentTool === CanvasTool.ERASER ? 'eraser' : 'brush'}
        selectedId={images_.selectedId}
        elements={images_.sizeIndicatorElements}
        position={viewport.position}
        canvasSelectionMode={canvasSelectionMode}
        onCancelSelection={cancelCanvasSelection}
        isDraggingFile={fileOps.isDraggingFile}
      />

      {/* Hidden file input */}
      <input
        ref={fileOps.fileInputRef}
        type="file"
        accept={fileOps.getAcceptedFileTypes()}
        style={{ display: 'none' }}
        onChange={fileOps.handleFileSelect}
      />

      {/* Main Canvas Stage */}
      <CanvasStage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        currentTool={tools.currentTool}
        {...events.getStageEventHandlers()}
        onWheel={viewport.handleWheel}
      >
        {/* Grid Layer */}
        <GridLayer
          viewportX={-viewport.position.x / viewport.scale}
          viewportY={-viewport.position.y / viewport.scale}
          viewportWidth={stageSize.width / viewport.scale}
          viewportHeight={stageSize.height / viewport.scale}
          scale={viewport.scale}
          enabled={gridEnabled}
          opacity={0.15}
        />
        
        {/* Frame Layer */}
        <FrameLayer
          frames={frames.generationFrames || []}
          selectedFrameId={frames.selectedFrameId}
          contextMenuFrameId={frames.contextMenuFrameId}
          currentTool={tools.currentTool}
          onFrameSelect={frames.handleFrameSelect}
          onFrameDragEnd={frames.handleFrameDragEnd}
          onFrameContextMenu={(e, frameId) => {
            const pointer = stageRef.current?.getPointerPosition()
            if (pointer) {
              events.setContextMenu({
                visible: true,
                x: pointer.x,
                y: pointer.y,
                imageId: null,
                frameId,
              })
            }
          }}
          isFrameDraggable={frames.isFrameDraggable}
          getFrameStrokeColor={frames.getFrameStrokeColor}
          getFrameFillColor={frames.getFrameFillColor}
        />

        {/* Image Layer */}
        <ImageLayer
          images={images_.konvaImages}
          selectedId={images_.selectedId}
          activeImageRoles={images_.activeImageRoles}
          canvasSelectionMode={canvasSelectionMode}
          currentTool={tools.currentTool}
          onImageSelect={images_.handleImageSelect}
          onImageDragStart={images_.handleImageDragStart}
          onImageDragMove={images_.handleImageDragMove}
          onImageDragEnd={images_.handleImageDragEnd}
          onImageTransformEnd={images_.handleImageTransformEnd}
          onContextMenu={(e, imageId) => {
            const pointer = stageRef.current?.getPointerPosition()
            if (pointer) {
              events.setContextMenu({
                visible: true,
                x: pointer.x,
                y: pointer.y,
                imageId,
                frameId: null,
              })
            }
          }}
          isImageDraggable={images_.isImageDraggable}
          getImageBorderColor={images_.getImageBorderColor}
          getImageOpacity={images_.getImageOpacity}
          getTransformerConfig={images_.getTransformerConfig}
        />
        
        {/* Snap Guide Layer */}
        <SnapGuideLayer
          guides={snapGuides}
          scale={viewport.scale}
        />

        {/* Drawing Layer */}
        <DrawingLayer
          currentTool={tools.currentTool}
          drawingStrokes={drawing.drawingStrokes}
          currentStroke={drawing.currentStroke}
          showCursor={drawing.showDrawingCursor}
          cursorPos={drawing.cursorPos}
          isDrawingActive={drawing.isDrawingActive}
          brushSize={drawing.brushSize}
          brushColor={drawing.brushColor}
          layerVisible={drawing.drawingLayerVisible}
          layerOpacity={drawing.drawingLayerOpacity}
          tokens={images_.tokens}
        />
      </CanvasStage>

      {/* Minimap */}
      <CanvasMinimap
        stageRef={stageRef}
        scale={viewport.scale}
        position={viewport.position}
        images={minimapImages}
        onViewportChange={handleViewportChange}
      />

      {/* Context Menu */}
      <CanvasContextMenu
        visible={events.contextMenu.visible}
        x={events.contextMenu.x}
        y={events.contextMenu.y}
        imageId={events.contextMenu.imageId}
        frameId={events.contextMenu.frameId}
        onClose={events.hideContextMenu}
        onDelete={() => handleContextMenuAction('delete')}
        onDuplicate={() => handleContextMenuAction('duplicate')}
        onSendToImg2Img={() => handleContextMenuAction('sendToImg2Img')}
        onInpaint={() => {
          // Role is set in CanvasContextMenu component
          // TODO: Navigate to inpaint tab
          events.hideContextMenu()
        }}
        onDownload={() => handleContextMenuAction('download')}
        onUploadImage={() => handleContextMenuAction('uploadImage')}
        onGenerateHere={() => handleContextMenuAction('generateHere')}
        onPlaceEmptyFrame={() => handleContextMenuAction('placeEmptyFrame')}
      />
    </div>
  )
}

// Re-export CanvasTool enum for external use
export { CanvasTool }
