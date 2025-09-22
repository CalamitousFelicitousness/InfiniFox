import Konva from 'konva'
import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react'
// Store and utilities
import { Layer as KonvaLayer } from 'react-konva'

import { ArtboardComponent } from '../../components/canvas/layers/ArtboardComponent'
import { FloatingLayerPanel } from '../../components/canvas/layers/FloatingLayerPanel'
import { LayerTransformer } from '../../components/canvas/layers/LayerTransformer'
import { LayerRenderer } from '../../components/canvas/layers/renderers/LayerRenderer'
import { StatusBar } from '../../components/layout/StatusBar'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { snappingManager } from '../../services/canvas/SnappingManager'
import type { SnapGuide } from '../../services/canvas/SnappingManager'
import { layerPersistenceManager } from '../../services/layers/LayerPersistenceManager'
import { useStore } from '../../store/store'
import { preventDefaultTouch } from '../../utils/pointerEvents'

// Layer system components

// Custom hooks (Phase 1)
import { CanvasContextMenu } from './CanvasContextMenu'
import { CanvasMinimap } from './CanvasMinimap'
import { CanvasToolbar } from './CanvasToolbar'
import { CanvasOverlays } from './components/CanvasOverlays'
import { CanvasStage, useStageSize } from './components/CanvasStage'
import { DrawingLayer } from './components/DrawingLayer'
import { FrameLayer } from './components/FrameLayer'
import { GridLayer } from './components/GridLayer'
import { ImageLayer } from './components/ImageLayer'
import { SelectionBox } from './components/SelectionBox'
import { SnapGuideLayer } from './components/SnapGuideLayer'
import {
  ResizeArtboardDialog,
  ArtboardBackgroundPicker,
  RenameDialog,
  AutoArrangeDialog,
  FitToContentsDialog,
} from './dialogs'
import { useCanvasEvents } from './hooks/useCanvasEvents'
import { useCanvasTools, CanvasTool } from './hooks/useCanvasTools'
import { useDrawingSystem } from './hooks/useDrawingSystem'
import { useFileOperations } from './hooks/useFileOperations'
import { useFileOperationsLayerSystem } from './hooks/useFileOperationsLayerSystem'
import { useGenerationFrames } from './hooks/useGenerationFrames'
import { useImageManagement } from './hooks/useImageManagement'
import { useLayerSnapTargets } from './hooks/useLayerSnapTargets'
import { useViewport } from './hooks/useViewport'

// Components (Phase 2)

// Existing components

import './Canvas.css'

// Feature flag for layer system
const USE_LAYER_SYSTEM = true

/**
 * Main Canvas component - orchestrates the infinite canvas functionality
 * Refactored to use modular hooks and components for better maintainability
 * Now supports Photoshop-like layer system
 */
export function Canvas() {
  // Refs for stage and container
  const stageRef = useRef<Konva.Stage>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Snapping state
  const [snapGuides, setSnapGuides] = React.useState<SnapGuide[]>([])
  const [gridEnabled, setGridEnabled] = React.useState(false)
  const [showLayerPanel, setShowLayerPanel] = useState(USE_LAYER_SYSTEM)
  const [activeDragId, setActiveDragId] = React.useState<string | null>(null)

  // Dialog state for artboard operations
  const [resizeDialogData, setResizeDialogData] = useState<{
    artboardId: string
    width: number
    height: number
  } | null>(null)
  const [backgroundPickerData, setBackgroundPickerData] = useState<{
    artboardId: string
    color: string
  } | null>(null)
  const [renameDialogData, setRenameDialogData] = useState<{
    layerId: string
    name: string
  } | null>(null)
  const [autoArrangeDialogData, setAutoArrangeDialogData] = useState<{
    artboardId: string
  } | null>(null)
  const [fitToContentsDialogData, setFitToContentsDialogData] = useState<{
    artboardId: string
  } | null>(null)

  // Store state - existing
  const {
    removeImage,
    duplicateImage,
    setImageAsInput,
    canvasSelectionMode,
    cancelCanvasSelection,
    selectionBox,
    deleteSelectedImages,
    duplicateSelectedImages,
    selectedIds,
    loadGroupsFromStorage,
  } = useStore()

  // Layer system state
  // Create a stable dependency that captures all layer changes
  const layersHash = useStore((state) => {
    // Create a hash that changes when any layer property changes
    const layers = Array.from(state.layers.values())
    return JSON.stringify({
      count: layers.length,
      // Track updatedAt for all layers to catch any modifications
      updates: layers.map(l => ({ id: l.id, updatedAt: l.updatedAt })),
      visibility: layers.map(l => ({ id: l.id, visible: l.visible })),
      order: state.layerOrder,
    })
  })
  const {
    layers,
    layerOrder,
    getArtboards,
    getRootLayers,
    activeArtboardId,
    setActiveArtboard,
    selectedLayerIds,
    selectLayer,
    addArtboard,
    migrateFromFlatImages,
    getLayer,
    duplicateArtboard,
    renameArtboard,
    resizeArtboard,
    clearArtboard,
    setArtboardBackground,
  } = useStore()

  // Load groups from storage on mount
  useEffect(() => {
    loadGroupsFromStorage()
  }, [loadGroupsFromStorage])

  // Initialize all hooks
  const tools = useCanvasTools()
  const viewport = useViewport(stageRef)
  const stageSize = useStageSize(containerRef) // Use actual container dimensions

  // Function to detect which artboard is at a given canvas position
  const getArtboardAtPoint = useCallback(
    (x: number, y: number) => {
      const artboards = getArtboards()

      // Check each artboard to see if the point is inside it
      for (const artboard of artboards) {
        if (artboard.artboardProps) {
          const { width, height } = artboard.artboardProps
          const artboardX = artboard.x || 0
          const artboardY = artboard.y || 0

          // Check if point is within artboard bounds
          if (
            x >= artboardX &&
            x <= artboardX + width &&
            y >= artboardY &&
            y <= artboardY + height
          ) {
            return artboard.id
          }
        }
      }

      return null // Not on any artboard
    },
    [getArtboards]
  )

  const drawing = useDrawingSystem({
    currentTool: tools.currentTool,
    scale: viewport.scale,
    position: viewport.position,
    getArtboardAtPoint,
  })

  const images_ = useImageManagement({
    currentTool: tools.currentTool,
    scale: viewport.scale,
    onSnapGuidesChange: setSnapGuides,
  })

  // Register layer snap targets
  useLayerSnapTargets(activeDragId)

  const frames = useGenerationFrames({
    currentTool: tools.currentTool,
  })

  // Use layer-aware file operations when layer system is enabled
  const fileOpsLayerSystem = useFileOperationsLayerSystem({
    containerRef,
    scale: viewport.scale,
    position: viewport.position,
  })

  const fileOpsLegacy = useFileOperations({
    containerRef,
    scale: viewport.scale,
    position: viewport.position,
    onImageUpload: images_.handleImageFile,
  })

  const fileOps = USE_LAYER_SYSTEM ? fileOpsLayerSystem : fileOpsLegacy

  const events = useCanvasEvents({
    currentTool: tools.currentTool,
    stageRef,
    scale: viewport.scale,
    position: viewport.position,
    isPanning: viewport.isPanning,
    onDrawingPointerDown: drawing.processPointerDown,
    onDrawingPointerMove: drawing.processPointerMove,
    onDrawingPointerUp: drawing.processPointerUp,
    onImageSelect: images_.handleImageSelect,
    onFrameSelect: frames.setSelectedFrameId,
    onViewportDragStart: viewport.handleStageDragStart,
    onViewportDragMove: viewport.handleStageDragMove,
    onViewportDragEnd: viewport.handleStageDragEnd,
  })

  // Auto-restore layer structure on app load and save on exit
  useEffect(() => {
    if (!USE_LAYER_SYSTEM) return

    // Handle save on window unload
    const handleBeforeUnload = () => {
      const store = useStore.getState()
      // Force save before closing
      layerPersistenceManager.saveNow({
        layers: store.layers,
        layerOrder: store.layerOrder,
        activeArtboardId: store.activeArtboardId,
      })
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    const initializeLayerSystem = async () => {
      const store = useStore.getState()

      // Check if layers already exist in memory (from Zustand persist)
      const existingLayers = store.layers.size > 0

      if (!existingLayers) {
        // Try to restore from IndexedDB
        const restored = await store.restoreLayerStructure()

        if (!restored) {
          // No saved layers, check for migration from old system
          setTimeout(() => {
            const rootLayers = getRootLayers()
            const storeImages = useStore.getState().images
            const existingImageLayers = rootLayers.filter((l) => l.type === 'image').length

            console.log('Layer migration check (delayed):', {
              storeImagesCount: storeImages.length,
              existingImageLayers,
              rootLayersCount: rootLayers.length,
              rootLayers,
            })

            // Only migrate if we have images but no image layers
            if (storeImages.length > 0 && existingImageLayers === 0) {
              console.log('Migrating', storeImages.length, 'images to layer system')
              migrateFromFlatImages(
                storeImages.map((img) => ({
                  x: img.x,
                  y: img.y,
                  src: img.src,
                  blobId: img.blobId,
                  width: img.width || 512,
                  height: img.height || 512,
                  metadata: img.metadata,
                }))
              )
            }
          }, 1000) // Wait 1 second for images to load
        } else {
          console.log('Layer structure restored from storage')
        }
      } else {
        console.log('Layer structure already in memory')
      }
    }

    initializeLayerSystem()

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      // Cancel any pending saves on unmount
      layerPersistenceManager.cancelPendingSaves()
    }
  }, [getRootLayers, migrateFromFlatImages])

  // Create default artboard if none exist and no root layers
  useEffect(() => {
    const storeImages = useStore.getState().images
    if (USE_LAYER_SYSTEM && getArtboards().length === 0 && storeImages.length === 0) {
      const id = addArtboard({
        width: 1920,
        height: 1080,
        backgroundColor: '#ffffff',
      })
      setActiveArtboard(id)
    }
  }, [getArtboards, addArtboard, setActiveArtboard])

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
      // Clear active drag
      setActiveDragId(null)
    }
  }, [])

  // Setup keyboard shortcuts
  useKeyboardShortcuts({
    onDelete: () => {
      if (tools.currentTool === CanvasTool.SELECT) {
        if (USE_LAYER_SYSTEM && selectedLayerIds.size > 0) {
          // Delete selected layers
          selectedLayerIds.forEach((id) => {
            const layer = useStore.getState().getLayer(id)
            if (layer) {
              useStore.getState().deleteLayer(id)
            }
          })
        } else if (selectedIds.size > 0) {
          deleteSelectedImages()
        } else if (images_.selectedId) {
          removeImage(images_.selectedId)
          images_.setSelectedId(null)
        }
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

      case 'newArtboard':
        {
          const canvasPos = events.screenToCanvas({ x: contextX, y: contextY })
          const artboardId = addArtboard(
            {
              width: 800,
              height: 600,
              name: `Artboard ${getArtboards().length + 1}`
            },
            { x: canvasPos.x, y: canvasPos.y }
          )
          setActiveArtboard(artboardId)
          selectLayer(artboardId, false, false, 'canvas')
        }
        break
    }

    // Menu closing is handled by the button handlers
  }

  // Handle viewport change from minimap
  const handleViewportChange = (x: number, y: number, newScale: number) => {
    viewport.setViewport(x, y, newScale)
  }

  // Handle layer selection
  const handleLayerSelect = (
    layerId: string,
    addToSelection: boolean = false,
    rangeSelect: boolean = false,
    context: 'canvas' | 'menu' = 'canvas'
  ) => {
    selectLayer(layerId, addToSelection, rangeSelect, context)
  }

  // Handle layer double click
  const handleLayerDoubleClick = (_layerId: string) => {
    // Could open properties panel or rename
  }

  // Handle layer/artboard context menu
  const handleLayerContextMenu = (e: Konva.KonvaEventObject<PointerEvent>, layerId: string) => {
    e.evt.preventDefault()
    const stage = stageRef.current
    if (!stage) return

    // Get screen position from event
    const container = stage.container()
    const rect = container.getBoundingClientRect()
    const x = e.evt.clientX - rect.left
    const y = e.evt.clientY - rect.top

    events.setContextMenu({
      visible: true,
      x,
      y,
      imageId: null,
      frameId: null,
      layerId, // Pass layer ID for layer-specific operations
    })
  }

  // Extract the specific values needed for memoization
  const { konvaImages, getImageBorderColor } = images_

  // Get artboards and root layers for rendering
  // Use layersHash to detect any layer changes
  const artboards = useMemo(() => {
    const result = USE_LAYER_SYSTEM ? getArtboards() : []
    return result
  }, [getArtboards, layersHash])

  const rootLayers = useMemo(() => {
    if (!USE_LAYER_SYSTEM) return []
    const allRootLayers = getRootLayers()
    const filtered = allRootLayers.filter((layer) => !layer.parentId)
    return filtered
  }, [getRootLayers, layersHash])

  // State for minimap image URLs
  const [layerImageUrls, setLayerImageUrls] = useState<Record<string, string>>({})

  // Load image URLs for layer system
  useEffect(() => {
    if (!USE_LAYER_SYSTEM) return

    const loadImageUrls = async () => {
      const { imageStorage } = await import('../../services/storage/UnifiedImageStorageService')
      const urls: Record<string, string> = {}

      const loadLayerImages = async (layers: ReturnType<typeof getRootLayers>) => {
        for (const layer of layers) {
          if (layer.type === 'image' && layer.imageProps?.imageId) {
            const url = await imageStorage.getOrCreateObjectUrl(layer.imageProps.imageId)
            if (url) {
              urls[layer.id] = url
            }
          } else if (layer.type === 'group' && layer.children) {
            const children = layer.children
              .map((childId) => useStore.getState().getLayer(childId))
              .filter(Boolean) as ReturnType<typeof getRootLayers>
            await loadLayerImages(children)
          }
        }
      }

      // Load from root layers
      await loadLayerImages(rootLayers)

      // Load from artboards
      for (const artboard of artboards) {
        if (artboard.children) {
          const children = artboard.children
            .map((childId) => useStore.getState().getLayer(childId))
            .filter(Boolean) as ReturnType<typeof getRootLayers>
          await loadLayerImages(children)
        }
      }

      setLayerImageUrls(urls)
    }

    loadImageUrls()
  }, [layers, layerOrder])

  // Memoize minimap images data
  const minimapImages = useMemo(() => {
    if (USE_LAYER_SYSTEM) {
      // Get image data from layer system
      const imageLayers: Array<{
        id: string
        x: number
        y: number
        src: string
        width?: number
        height?: number
        borderColor?: string
      }> = []

      // Collect all image layers from root and artboards
      const collectImageLayers = (
        layers: ReturnType<typeof getRootLayers>,
        parentOffset = { x: 0, y: 0 }
      ) => {
        layers.forEach((layer) => {
          if (layer.type === 'image' && layer.imageProps) {
            const src = layerImageUrls[layer.id] || ''
            if (src) {
              // Calculate absolute position by adding parent offset
              imageLayers.push({
                id: layer.id,
                x: layer.x + parentOffset.x,
                y: layer.y + parentOffset.y,
                src,
                width: layer.imageProps.width,
                height: layer.imageProps.height,
                borderColor: selectedLayerIds.has(layer.id) ? '#646cff' : 'transparent',
              })
            }
          } else if (layer.type === 'group' && layer.children) {
            // Recursively collect from groups, adding this group's position to offset
            const children = layer.children
              .map((childId) => useStore.getState().getLayer(childId))
              .filter(Boolean) as ReturnType<typeof getRootLayers>
            collectImageLayers(children, {
              x: parentOffset.x + layer.x,
              y: parentOffset.y + layer.y,
            })
          }
        })
      }

      // Collect from root layers (no offset needed)
      collectImageLayers(rootLayers)

      // Collect from artboards (with artboard position as offset)
      artboards.forEach((artboard) => {
        if (artboard.children) {
          const children = artboard.children
            .map((childId) => useStore.getState().getLayer(childId))
            .filter(Boolean) as ReturnType<typeof getRootLayers>
          collectImageLayers(children, {
            x: artboard.x,
            y: artboard.y,
          })
        }
      })

      return imageLayers
    } else {
      // Use legacy konva images
      return konvaImages.map((img) => ({
        id: img.id,
        x: img.x,
        y: img.y,
        src: img.src,
        width: img.image?.naturalWidth,
        height: img.image?.naturalHeight,
        borderColor: getImageBorderColor(img.id),
      }))
    }
  }, [konvaImages, getImageBorderColor, rootLayers, artboards, selectedLayerIds, layerImageUrls])

  // Get container classes
  const containerClasses = [
    'canvas-container',
    USE_LAYER_SYSTEM && 'with-layer-system',
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
    <div className="canvas-workspace">
      <div className={containerClasses} ref={containerRef}>
        {/* Canvas Toolbar */}
        <CanvasToolbar
          onSnapConfigChange={(config) => {
            setGridEnabled(config.gridEnabled)
          }}
        />

        {/* Canvas Overlays */}
        <CanvasOverlays
          currentTool={tools.currentTool}
          onToolChange={tools.setCurrentTool}
          isDrawingTool={tools.isDrawingTool}
          drawingTool={tools.currentTool === CanvasTool.ERASER ? 'eraser' : 'brush'}
          selectedId={images_.selectedId}
          scale={viewport.scale}
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
          {/* Layer system architecture aligned with Konva best practices */}
          {USE_LAYER_SYSTEM ? (
            <>
              {/* Background Layer - Static, non-interactive content */}
              <KonvaLayer name="background" listening={false}>
                <GridLayer
                  viewportX={-viewport.position.x / viewport.scale}
                  viewportY={-viewport.position.y / viewport.scale}
                  viewportWidth={stageSize.width / viewport.scale}
                  viewportHeight={stageSize.height / viewport.scale}
                  scale={viewport.scale}
                  enabled={gridEnabled}
                  opacity={0.15}
                />
              </KonvaLayer>

              {/* Content Layer - Main interactive content */}
              <KonvaLayer name="content">
                {/* Generation Frames */}
                <FrameLayer
                  frames={frames.generationFrames || []}
                  selectedFrameId={frames.selectedFrameId}
                  contextMenuFrameId={frames.contextMenuFrameId}
                  currentlyGeneratingFrameId={frames.currentlyGeneratingFrameId}
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

                {/* Render artboards first (so they appear below images) */}
                {artboards.map((artboard) => (
                  <ArtboardComponent
                    key={`${artboard.id}-${artboard.updatedAt || 0}`}
                    artboard={artboard}
                    isActive={activeArtboardId === artboard.id}
                    currentTool={tools.currentTool}
                    scale={viewport.scale}
                    viewport={{
                      x: -viewport.position.x / viewport.scale,
                      y: -viewport.position.y / viewport.scale,
                      width: stageSize.width,
                      height: stageSize.height,
                    }}
                    onSelect={(artboardId, addToSelection, rangeSelect, context) => {
                      setActiveArtboard(artboardId)
                      selectLayer(
                        artboardId,
                        addToSelection || false,
                        rangeSelect || false,
                        context || 'canvas'
                      )
                    }}
                    onContextMenu={handleLayerContextMenu}
                    onSnapGuidesChange={setSnapGuides}
                    onDragStart={(layerId: string) => setActiveDragId(layerId)}
                    onDragEnd={() => setActiveDragId(null)}
                    onLayerSelect={handleLayerSelect}
                    isDraggingLayer={!!activeDragId}
                    draggingLayerId={activeDragId}
                  />
                ))}

                {/* Render root layers (images not in artboards) - rendered after artboards so they appear on top */}
                {rootLayers
                  .filter((layer) => layer.type !== 'artboard')
                  .map((layer) => (
                    <LayerRenderer
                      key={`${layer.id}-${layer.updatedAt || 0}`}
                      layer={layer}
                      currentTool={tools.currentTool}
                      parentScale={viewport.scale}
                      viewport={{
                        x: -viewport.position.x / viewport.scale,
                        y: -viewport.position.y / viewport.scale,
                        width: stageSize.width / viewport.scale,
                        height: stageSize.height / viewport.scale,
                        scale: viewport.scale,
                      }}
                      onContextMenu={handleLayerContextMenu}
                      onSnapGuidesChange={setSnapGuides}
                      onDragStart={(layerId: string) => setActiveDragId(layerId)}
                      onDragEnd={() => setActiveDragId(null)}
                      onLayerSelect={handleLayerSelect}
                      isDraggingLayer={!!activeDragId}
                      draggingLayerId={activeDragId}
                    />
                  ))}
              </KonvaLayer>
            </>
          ) : (
            <>
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
                currentlyGeneratingFrameId={frames.currentlyGeneratingFrameId}
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

              {/* Image Layer - Old flat system */}
              <ImageLayer
                images={images_.konvaImages}
                activeImageRoles={images_.activeImageRoles}
                canvasSelectionMode={canvasSelectionMode}
                currentTool={tools.currentTool}
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
            </>
          )}

          {/* UI Layer - Unchanged */}
          <KonvaLayer name="ui">
            {/* Selection Box Layer */}
            {selectionBox && (
              <SelectionBox
                startX={selectionBox.startX}
                startY={selectionBox.startY}
                endX={selectionBox.endX}
                endY={selectionBox.endY}
                visible={selectionBox.active}
                scale={viewport.scale}
              />
            )}

            {/* Snap Guide Layer */}
            <SnapGuideLayer guides={snapGuides} scale={viewport.scale} />

            {/* Drawing Layer - only show current stroke when using layer system */}
            <DrawingLayer
              currentTool={tools.currentTool}
              drawingStrokes={USE_LAYER_SYSTEM ? [] : drawing.drawingStrokes}
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

            {/* Layer Transformer - for layer system */}
            {USE_LAYER_SYSTEM && selectedLayerIds.size > 0 && (
              <LayerTransformer selectedLayerIds={selectedLayerIds} scale={viewport.scale} />
            )}
          </KonvaLayer>
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
          layerId={events.contextMenu.layerId}
          selectedIds={selectedIds}
          onClose={events.hideContextMenu}
          onDelete={() => {
            if (selectedIds.size > 1) {
              deleteSelectedImages()
            } else {
              handleContextMenuAction('delete')
            }
          }}
          onDuplicate={() => {
            if (selectedIds.size > 1) {
              duplicateSelectedImages()
            } else {
              handleContextMenuAction('duplicate')
            }
          }}
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
          onNewArtboard={() => handleContextMenuAction('newArtboard')}
          onExportLayer={async (layerId: string) => {
            const { LayerExportService } = await import('../../services/layers/LayerExportService')
            const layer = useStore.getState().getLayer(layerId)

            if (!layer) return

            if (layer.type === 'artboard') {
              const blob = await LayerExportService.exportArtboard(layerId, 'png')
              if (blob) {
                LayerExportService.downloadBlob(blob, `artboard-${layer.name}.png`)
              }
            } else if (layer.type === 'image') {
              const selectedIds = new Set([layerId])
              const blob = await LayerExportService.exportSelectedLayers(selectedIds, 'png')
              if (blob) {
                LayerExportService.downloadBlob(blob, `layer-${layer.name}.png`)
              }
            }

            events.hideContextMenu()
          }}
          onDuplicateArtboard={(artboardId: string) => {
            duplicateArtboard(artboardId)
            events.hideContextMenu()
          }}
          onRenameArtboard={(artboardId: string) => {
            const artboard = getLayer(artboardId)
            if (artboard) {
              setRenameDialogData({
                layerId: artboardId,
                name: artboard.name,
              })
            }
            events.hideContextMenu()
          }}
          onResizeArtboard={(artboardId: string) => {
            const artboard = getLayer(artboardId)
            if (artboard?.type === 'artboard') {
              setResizeDialogData({
                artboardId,
                width: artboard.artboardProps?.width || 800,
                height: artboard.artboardProps?.height || 600,
              })
            }
            events.hideContextMenu()
          }}
          onClearArtboard={(artboardId: string) => {
            if (confirm('Clear all content from this artboard?')) {
              clearArtboard(artboardId)
            }
            events.hideContextMenu()
          }}
          onChangeArtboardBackground={(artboardId: string) => {
            const artboard = getLayer(artboardId)
            if (artboard?.type === 'artboard') {
              setBackgroundPickerData({
                artboardId,
                color: artboard.artboardProps?.backgroundColor || '#ffffff',
              })
            }
            events.hideContextMenu()
          }}
          onAutoArrangeChildren={(artboardId: string) => {
            setAutoArrangeDialogData({ artboardId })
            events.hideContextMenu()
          }}
          onFitToContents={(artboardId: string) => {
            setFitToContentsDialogData({ artboardId })
            events.hideContextMenu()
          }}
        />

        {/* Artboard Dialogs */}
        {resizeDialogData && (
          <ResizeArtboardDialog
            artboardId={resizeDialogData.artboardId}
            currentWidth={resizeDialogData.width}
            currentHeight={resizeDialogData.height}
            onResize={(width, height) => {
              resizeArtboard(resizeDialogData.artboardId, width, height)
              setResizeDialogData(null)
            }}
            onClose={() => setResizeDialogData(null)}
          />
        )}

        {backgroundPickerData && (
          <ArtboardBackgroundPicker
            artboardId={backgroundPickerData.artboardId}
            currentColor={backgroundPickerData.color}
            onColorChange={(color) => {
              setArtboardBackground(backgroundPickerData.artboardId, color)
            }}
            onClose={() => setBackgroundPickerData(null)}
          />
        )}

        {renameDialogData && (
          <RenameDialog
            currentName={renameDialogData.name}
            onRename={(name) => {
              renameArtboard(renameDialogData.layerId, name)
              setRenameDialogData(null)
            }}
            onClose={() => setRenameDialogData(null)}
          />
        )}

        {autoArrangeDialogData && (
          <AutoArrangeDialog
            artboardId={autoArrangeDialogData.artboardId}
            onConfirm={(options) => {
              const store = useStore.getState()
              store.autoArrangeChildren(autoArrangeDialogData.artboardId, options)
              setAutoArrangeDialogData(null)
            }}
            onCancel={() => setAutoArrangeDialogData(null)}
          />
        )}

        {fitToContentsDialogData && (
          <FitToContentsDialog
            artboardId={fitToContentsDialogData.artboardId}
            onConfirm={(padding) => {
              const store = useStore.getState()
              store.fitArtboardToContents(fitToContentsDialogData.artboardId, padding)
              setFitToContentsDialogData(null)
            }}
            onCancel={() => setFitToContentsDialogData(null)}
          />
        )}

        {/* Status Bar */}
        <StatusBar
          zoom={viewport.scale}
          onZoomIn={viewport.zoomIn}
          onZoomOut={viewport.zoomOut}
          onZoomReset={viewport.resetViewport}
          currentTool={tools.currentTool}
          isSpacePanning={tools.isSpacePressed}
        />

        {/* Floating Layer Panel */}
        {showLayerPanel && (
          <FloatingLayerPanel
            onLayerSelect={(layerId) => {
              const layer = getLayer(layerId)
              if (layer) {
                // Don't call selectLayer here - LayerPanel handles selection already
                // Just focus on the layer if it's an artboard
                if (layer.type === 'artboard') {
                  setActiveArtboard(layerId)
                }
              }
            }}
            onLayerDoubleClick={(layerId) => {
              const layer = getLayer(layerId)
              if (layer?.type === 'artboard') {
                // Double-click to zoom to artboard
                const stage = stageRef.current
                if (stage && layer.artboardProps) {
                  const padding = 50
                  const targetScale = Math.min(
                    (stageSize.width - padding * 2) / layer.artboardProps.width,
                    (stageSize.height - padding * 2) / layer.artboardProps.height
                  )

                  viewport.setScale(targetScale)
                  viewport.setPosition({
                    x:
                      stageSize.width / 2 -
                      layer.x * targetScale -
                      (layer.artboardProps.width * targetScale) / 2,
                    y:
                      stageSize.height / 2 -
                      layer.y * targetScale -
                      (layer.artboardProps.height * targetScale) / 2,
                  })
                }
              }
            }}
            onClose={() => setShowLayerPanel(false)}
          />
        )}
      </div>
    </div>
  )
}

// Re-export CanvasTool enum for external use
export { CanvasTool }
