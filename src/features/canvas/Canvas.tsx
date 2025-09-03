import Konva from 'konva'
import { useEffect, useState, useRef } from 'preact/hooks'
import { Stage, Layer, Image as KonvaImage, Transformer, Line, Circle } from 'react-konva'

import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { useStore } from '../../store/store'
import { preventDefaultTouch } from '../../utils/pointerEvents'
import { PerfectFreehandService, BRUSH_PRESETS } from '../../services/drawing/PerfectFreehandService'
import { PressureManager } from '../../services/drawing/PressureManager'
import { LazyBrush } from '../../services/drawing/LazyBrush'

import { CanvasContextMenu } from './CanvasContextMenu'
import './Canvas.css'

// Tool types enum for better mode management
export enum CanvasTool {
  SELECT = 'select',
  BRUSH = 'brush',
  ERASER = 'eraser',
  PAN = 'pan',
}

interface KonvaImageData {
  id: string
  src: string
  x: number
  y: number
  image: HTMLImageElement
}

interface CanvasState {
  showUploadMenu: boolean
  uploadPosition: { x: number; y: number }
}

export function Canvas() {
  const { 
    images, 
    removeImage, 
    duplicateImage, 
    setImageAsInput, 
    activeImageRoles, 
    uploadImageToCanvas,
    canvasSelectionMode,
    cancelCanvasSelection,
    setImageRole,
    // Drawing state from store
    isDrawingMode,
    isDrawingActive,
    drawingTool,
    brushSize,
    brushOpacity,
    brushColor,
    brushPreset,
    smoothing,
    drawingStrokes,
    currentStroke,
    drawingLayerVisible,
    drawingLayerOpacity,
    // Drawing actions from store
    setDrawingActive,
    startDrawingStroke,
    updateCurrentStroke,
    endDrawingStroke
  } = useStore()
  
  // Add tool state - default to SELECT tool
  const [currentTool, setCurrentTool] = useState<CanvasTool>(
    isDrawingMode ? 
      (drawingTool === 'eraser' ? CanvasTool.ERASER : CanvasTool.BRUSH) : 
      CanvasTool.SELECT
  )
  
  const [konvaImages, setKonvaImages] = useState<KonvaImageData[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [canvasState, setCanvasState] = useState<CanvasState>({
    showUploadMenu: false,
    uploadPosition: { x: 0, y: 0 }
  })
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean
    x: number
    y: number
    imageId: string | null
  }>({
    visible: false,
    x: 0,
    y: 0,
    imageId: null,
  })
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 })
  const [showDrawingCursor, setShowDrawingCursor] = useState(false)
  const [currentPressure, setCurrentPressure] = useState(0.5)
  const strokePointsRef = useRef<{ x: number, y: number, pressure: number }[]>([])
  const [isPanning, setIsPanning] = useState(false)
  
  const stageRef = useRef<Konva.Stage>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  
  // Drawing services
  const perfectFreehandRef = useRef<PerfectFreehandService | null>(null)
  const pressureManagerRef = useRef<PressureManager | null>(null)
  const lazyBrushRef = useRef<LazyBrush | null>(null)
  
  // Initialize drawing services
  useEffect(() => {
    const preset = BRUSH_PRESETS[brushPreset as keyof typeof BRUSH_PRESETS] || BRUSH_PRESETS.soft
    perfectFreehandRef.current = new PerfectFreehandService({
      ...preset,
      size: brushSize
    })
    pressureManagerRef.current = new PressureManager()
    lazyBrushRef.current = new LazyBrush({ radius: smoothing, enabled: true })
    
    pressureManagerRef.current.initialize()
    
    return () => {
      pressureManagerRef.current?.cleanup()
    }
  }, [])
  
  // Update tool when drawing mode changes from external source
  useEffect(() => {
    if (isDrawingMode && currentTool === CanvasTool.SELECT) {
      setCurrentTool(drawingTool === 'eraser' ? CanvasTool.ERASER : CanvasTool.BRUSH)
    } else if (!isDrawingMode && (currentTool === CanvasTool.BRUSH || currentTool === CanvasTool.ERASER)) {
      setCurrentTool(CanvasTool.SELECT)
    }
  }, [isDrawingMode, drawingTool])
  
  // Update drawing services when settings change
  useEffect(() => {
    if (perfectFreehandRef.current) {
      const preset = BRUSH_PRESETS[brushPreset as keyof typeof BRUSH_PRESETS] || BRUSH_PRESETS.soft
      perfectFreehandRef.current.setOptions({
        ...preset,
        size: brushSize,
        smoothing: smoothing / 100
      })
    }
  }, [brushSize, brushPreset, smoothing])
  
  useEffect(() => {
    if (lazyBrushRef.current) {
      lazyBrushRef.current.configure({ radius: smoothing })
    }
  }, [smoothing])
  
  // Update cursor visibility based on tool
  useEffect(() => {
    const isDrawingTool = currentTool === CanvasTool.BRUSH || currentTool === CanvasTool.ERASER
    setShowDrawingCursor(isDrawingTool)
  }, [currentTool])
  
  // Prevent default touch behaviors on canvas
  useEffect(() => {
    const container = containerRef.current
    if (container) {
      preventDefaultTouch(container)
    }
  }, [])

  // Setup drag and drop handlers
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDraggingFile(true)
    }

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      // Only set to false if we're leaving the container entirely
      if (e.target === container) {
        setIsDraggingFile(false)
      }
    }

    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDraggingFile(false)
      
      const files = Array.from(e.dataTransfer?.files || [])
      const imageFile = files.find(f => f.type.startsWith('image/'))
      
      if (imageFile && stageRef.current) {
        const stage = stageRef.current
        const pointer = stage.getPointerPosition()
        if (pointer) {
          const x = (pointer.x - position.x) / scale
          const y = (pointer.y - position.y) / scale
          handleImageFile(imageFile, x, y)
        }
      }
    }

    container.addEventListener('dragover', handleDragOver)
    container.addEventListener('dragleave', handleDragLeave)
    container.addEventListener('drop', handleDrop)
    
    return () => {
      container.removeEventListener('dragover', handleDragOver)
      container.removeEventListener('dragleave', handleDragLeave)
      container.removeEventListener('drop', handleDrop)
    }
  }, [position, scale])

  const getImageBorderColor = (imageId: string) => {
    const role = activeImageRoles.find(r => r.imageId === imageId)
    if (!role) return selectedId === imageId ? '#646cff' : 'transparent'
    
    switch (role.role) {
      case 'img2img_init':
        return '#00ff00'
      case 'inpaint_image':
        return '#ff00ff'
      default:
        return selectedId === imageId ? '#646cff' : 'transparent'
    }
  }

  // Setup keyboard shortcuts
  useKeyboardShortcuts({
    onDelete: () => {
      if (selectedId && currentTool === CanvasTool.SELECT) {
        removeImage(selectedId)
        setSelectedId(null)
      }
    },
  })

  // Load images as Konva-compatible format
  useEffect(() => {
    const imagePromises = images.map((imgData) => {
      return new Promise<KonvaImageData>((resolve) => {
        const img = new window.Image()
        img.crossOrigin = 'anonymous'  // Ensure CORS is handled
        img.src = imgData.src
        img.onload = () => {
          // Ensure image is fully loaded before adding to Konva
          if (img.complete && img.naturalHeight !== 0) {
            resolve({ 
              id: imgData.id,
              src: imgData.src,
              x: imgData.x,
              y: imgData.y,
              image: img 
            })
          } else {
            console.error(`Image ${imgData.id} not fully loaded`)
          }
        }
        img.onerror = () => {
          console.error(`Failed to load image ${imgData.id}`)
        }
      })
    })

    Promise.all(imagePromises).then(setKonvaImages)
  }, [images])

  // Update transformer when selection changes
  useEffect(() => {
    if (!transformerRef.current || !stageRef.current) return
    
    const transformer = transformerRef.current
    const stage = stageRef.current

    if (selectedId && currentTool === CanvasTool.SELECT) {
      // Find the selected node
      const selectedNode = stage.findOne(`#${selectedId}`)
      
      if (selectedNode) {
        // Attach transformer to the selected node
        transformer.nodes([selectedNode])
        transformer.getLayer()?.batchDraw()
      }
    } else {
      // Clear transformer
      transformer.nodes([])
      transformer.getLayer()?.batchDraw()
    }
  }, [selectedId, currentTool])

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const stage = stageRef.current
    if (!stage) return

    const oldScale = scale
    const pointer = stage.getPointerPosition()
    if (!pointer) return

    const mousePointTo = {
      x: (pointer.x - position.x) / oldScale,
      y: (pointer.y - position.y) / oldScale,
    }

    const direction = e.evt.deltaY > 0 ? -1 : 1
    const newScale = direction > 0 ? oldScale * 1.1 : oldScale / 1.1
    const clampedScale = Math.max(0.1, Math.min(5, newScale))

    setScale(clampedScale)
    setPosition({
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    })
  }

  const handleContextMenu = (
    e: Konva.KonvaEventObject<PointerEvent | MouseEvent>,
    imageId: string
  ) => {
    e.evt.preventDefault()
    
    // Only show context menu in SELECT mode
    if (currentTool !== CanvasTool.SELECT) return
    
    const stage = stageRef.current
    if (!stage) return

    const containerRect = stage.container().getBoundingClientRect()
    setContextMenu({
      visible: true,
      x: containerRect.left + stage.getPointerPosition()!.x,
      y: containerRect.top + stage.getPointerPosition()!.y,
      imageId,
    })
  }

  const handleStageContextMenu = (e: Konva.KonvaEventObject<PointerEvent | MouseEvent>) => {
    e.evt.preventDefault()
    
    // Only show context menu in SELECT mode
    if (currentTool !== CanvasTool.SELECT) return
    
    const stage = stageRef.current
    if (!stage) return

    // Check if we clicked on empty space or an image
    const clickedOnEmpty = e.target === e.target.getStage()
    
    if (clickedOnEmpty) {
      // Show upload context menu for empty space
      const pointer = stage.getPointerPosition()
      if (pointer) {
        const containerRect = stage.container().getBoundingClientRect()
        setContextMenu({
          visible: true,
          x: containerRect.left + pointer.x,
          y: containerRect.top + pointer.y,
          imageId: null, // null indicates empty space
        })
        // Store the canvas position for image placement
        const canvasX = (pointer.x - position.x) / scale
        const canvasY = (pointer.y - position.y) / scale
        setCanvasState({
          ...canvasState,
          uploadPosition: { x: canvasX, y: canvasY }
        })
      }
    }
  }

  const handleStagePointerDown = (
    e: Konva.KonvaEventObject<PointerEvent | MouseEvent | TouchEvent>
  ) => {
    const stage = stageRef.current
    if (!stage) return
    
    const pointer = stage.getPointerPosition()
    if (!pointer) return
    
    // Convert to canvas coordinates
    const canvasX = (pointer.x - position.x) / scale
    const canvasY = (pointer.y - position.y) / scale
    
    // Handle different tools
    switch (currentTool) {
      case CanvasTool.BRUSH:
      case CanvasTool.ERASER:
        // Initialize drawing
        if (lazyBrushRef.current) {
          lazyBrushRef.current.initializePositions({ x: canvasX, y: canvasY })
        }
        
        // Get pressure from pointer event if available
        const evt = e.evt as any
        const pressure = (evt && 'pressure' in evt) ? evt.pressure : 0.5
        setCurrentPressure(pressure)
        
        // Initialize stroke points
        strokePointsRef.current = [{ x: canvasX, y: canvasY, pressure }]
        
        if (perfectFreehandRef.current) {
          perfectFreehandRef.current.startStroke({ x: canvasX, y: canvasY, pressure })
        }
        
        startDrawingStroke({
          tool: currentTool === CanvasTool.ERASER ? 'eraser' : 'brush',
          points: [canvasX, canvasY],
          color: brushColor,
          opacity: brushOpacity / 100,
          strokeWidth: brushSize,
          globalCompositeOperation: currentTool === CanvasTool.ERASER ? 'destination-out' : 'source-over'
        })
        setDrawingActive(true)
        break
        
      case CanvasTool.SELECT:
        // Don't handle anything here if we clicked on an image
        // Let the image's own handlers take care of selection
        if (e.target.className === 'Image') {
          return
        }
        
        // If we're in canvas selection mode and clicked on an image
        if (canvasSelectionMode.active && e.target !== e.target.getStage()) {
          const clickedImage = konvaImages.find(img => img.id === e.target.id())
          if (clickedImage && canvasSelectionMode.callback) {
            // Call the callback with image data
            canvasSelectionMode.callback(clickedImage.id, clickedImage.src)
            // Set the image role
            if (canvasSelectionMode.mode) {
              setImageRole(clickedImage.id, canvasSelectionMode.mode)
            }
            // Exit selection mode
            cancelCanvasSelection()
            return
          }
        }
        
        // Only deselect if clicking on empty stage
        const clickedOnEmpty = e.target === e.target.getStage()
        if (clickedOnEmpty) {
          setSelectedId(null)
        }
        break
        
      case CanvasTool.PAN:
        setIsPanning(true)
        break
    }
    
    // Hide context menu
    setContextMenu({ ...contextMenu, visible: false })
  }
  
  const handleStagePointerMove = (e: Konva.KonvaEventObject<PointerEvent>) => {
    const stage = stageRef.current
    if (!stage) return
    
    const pointer = stage.getPointerPosition()
    if (!pointer) return
    
    // Convert to canvas coordinates
    const canvasX = (pointer.x - position.x) / scale
    const canvasY = (pointer.y - position.y) / scale
    
    // Only update cursor position when in drawing mode to reduce re-renders
    if (currentTool === CanvasTool.BRUSH || currentTool === CanvasTool.ERASER) {
      setCursorPos({ x: canvasX, y: canvasY })
    }
    
    // Handle drawing tools
    if ((currentTool === CanvasTool.BRUSH || currentTool === CanvasTool.ERASER) && isDrawingActive) {
      // Get pressure from pointer event if available
      const evt = e.evt as any
      const pressure = (evt && 'pressure' in evt) ? evt.pressure : 0.5
      setCurrentPressure(pressure)
      
      if (lazyBrushRef.current) {
        lazyBrushRef.current.update({ x: canvasX, y: canvasY })
        const smoothed = lazyBrushRef.current.getBrushCoordinates()
        
        // Add to stroke points with pressure
        strokePointsRef.current.push({ x: smoothed.x, y: smoothed.y, pressure })
        
        if (perfectFreehandRef.current) {
          perfectFreehandRef.current.addPoint({ x: smoothed.x, y: smoothed.y, pressure })
        }
        
        // Update current stroke points and generate outline
        if (currentStroke) {
          const newPoints = [...currentStroke.points, smoothed.x, smoothed.y]
          
          // Generate stroke outline using PerfectFreehand with actual pressure values
          const outline = perfectFreehandRef.current?.generateStrokeOutline(strokePointsRef.current) || null
          
          updateCurrentStroke(newPoints, outline || undefined)
        }
      }
    }
  }
  
  const handleStagePointerUp = () => {
    // Handle drawing tools
    if ((currentTool === CanvasTool.BRUSH || currentTool === CanvasTool.ERASER) && isDrawingActive) {
      if (perfectFreehandRef.current) {
        const finalOutline = perfectFreehandRef.current.endStroke()
        if (finalOutline && currentStroke) {
          // Update with final outline before ending
          updateCurrentStroke(currentStroke.points, finalOutline)
        }
      }
      // Clear stroke points reference
      strokePointsRef.current = []
      endDrawingStroke()
    }
    
    // Handle pan tool
    if (currentTool === CanvasTool.PAN) {
      setIsPanning(false)
    }
  }
  
  const handleStagePointerEnter = () => {
    if (currentTool === CanvasTool.BRUSH || currentTool === CanvasTool.ERASER) {
      setShowDrawingCursor(true)
    }
  }
  
  const handleStagePointerLeave = () => {
    setShowDrawingCursor(false)
    
    // End any active drawing
    if (isDrawingActive) {
      if (perfectFreehandRef.current) {
        const finalOutline = perfectFreehandRef.current.endStroke()
        if (finalOutline && currentStroke) {
          updateCurrentStroke(currentStroke.points, finalOutline)
        }
      }
      strokePointsRef.current = []
      endDrawingStroke()
    }
    
    // Stop panning
    if (isPanning) {
      setIsPanning(false)
    }
  }

  const handleStageDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    // Only update position if we're dragging the stage itself (not an image)
    if (e.target !== e.target.getStage()) {
      return
    }
    
    // Update position state after dragging the stage
    setPosition({
      x: e.target.x(),
      y: e.target.y(),
    })
  }

  const handleStageDragMove = () => {
    // Position is handled internally by Konva during drag
  }


  // Removed as we're setting selectedId directly in event handlers

  const handleDelete = () => {
    if (contextMenu.imageId) {
      removeImage(contextMenu.imageId)
      setContextMenu({ ...contextMenu, visible: false })
      setSelectedId(null)
    }
  }

  const handleDuplicate = () => {
    if (contextMenu.imageId) {
      duplicateImage(contextMenu.imageId)
      setContextMenu({ ...contextMenu, visible: false })
    }
  }

  const handleSendToImg2Img = () => {
    if (contextMenu.imageId) {
      const image = konvaImages.find((img) => img.id === contextMenu.imageId)
      if (image) {
        setImageAsInput(image.src)
        setContextMenu({ ...contextMenu, visible: false })
      }
    }
  }

  const handleDownload = () => {
    if (contextMenu.imageId) {
      const image = konvaImages.find((img) => img.id === contextMenu.imageId)
      if (image) {
        const link = document.createElement('a')
        link.href = image.src
        link.download = `generated-${contextMenu.imageId}.png`
        link.click()
        setContextMenu({ ...contextMenu, visible: false })
      }
    }
  }

  const handleUploadImage = () => {
    fileInputRef.current?.click()
    setContextMenu({ ...contextMenu, visible: false })
  }

  const handleImageFile = async (file: File, x: number, y: number) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Use the new uploadImageToCanvas function from the store
    await uploadImageToCanvas(file, x, y)
  }

  const handleFileSelect = async (e: Event) => {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    
    await handleImageFile(file, canvasState.uploadPosition.x, canvasState.uploadPosition.y)
    
    // Reset file input
    if (input) {
      input.value = ''
    }
  }
  
  // Get cursor radius for drawing
  const getCursorRadius = () => {
    return brushSize / 2
  }
  
  // Helper function to determine stage draggability
  const isStageDraggable = () => {
    // Stage is only draggable in PAN mode
    return currentTool === CanvasTool.PAN
  }

  return (
    <div 
      class={`canvas-container ${isDraggingFile ? 'dragging-file' : ''} ${canvasSelectionMode.active ? 'selection-mode' : ''} ${currentTool === CanvasTool.BRUSH || currentTool === CanvasTool.ERASER ? 'drawing-mode' : ''}`} 
      ref={containerRef}
    >
      {canvasSelectionMode.active && (
        <div class="selection-mode-overlay">
          <div class="selection-mode-header">
            <h3>Select an image for {canvasSelectionMode.mode}</h3>
            <button 
              class="cancel-selection-btn"
              onClick={cancelCanvasSelection}
            >
              Cancel
            </button>
          </div>
          <div class="selection-mode-hint">
            Click on any image to select it
          </div>
        </div>
      )}
      
      {/* Tool Selection Bar */}
      <div class="canvas-toolbar">
        <button 
          class={`tool-btn ${currentTool === CanvasTool.SELECT ? 'active' : ''}`}
          onClick={() => setCurrentTool(CanvasTool.SELECT)}
          title="Selection Tool (V)"
        >
          🔲 Select
        </button>
        <button 
          class={`tool-btn ${currentTool === CanvasTool.BRUSH ? 'active' : ''}`}
          onClick={() => setCurrentTool(CanvasTool.BRUSH)}
          title="Brush Tool (B)"
        >
          ✏️ Brush
        </button>
        <button 
          class={`tool-btn ${currentTool === CanvasTool.ERASER ? 'active' : ''}`}
          onClick={() => setCurrentTool(CanvasTool.ERASER)}
          title="Eraser Tool (E)"
        >
          🧹 Eraser
        </button>
        <button 
          class={`tool-btn ${currentTool === CanvasTool.PAN ? 'active' : ''}`}
          onClick={() => setCurrentTool(CanvasTool.PAN)}
          title="Pan Tool (H)"
        >
          ✋ Pan
        </button>
        
        <div class="tool-separator"></div>
        
        {/* Current tool info */}
        <span class="tool-info">
          Current: <strong>{currentTool}</strong>
          {(currentTool === CanvasTool.BRUSH || currentTool === CanvasTool.ERASER) && (
            <span> | Size: {brushSize}px</span>
          )}
        </span>
      </div>

      <div class="canvas-controls">
        <button onClick={() => setScale(scale * 1.2)}>Zoom In</button>
        <button onClick={() => setScale(scale / 1.2)}>Zoom Out</button>
        <button
          onClick={() => {
            setScale(1)
            setPosition({ x: 0, y: 0 })
          }}
        >
          Reset
        </button>
        <span class="zoom-level">{Math.round(scale * 100)}%</span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      <Stage
        ref={stageRef}
        width={window.innerWidth - 400}
        height={window.innerHeight}
        draggable={isStageDraggable()}
        onWheel={handleWheel}
        onPointerDown={handleStagePointerDown}
        onPointerMove={handleStagePointerMove}
        onPointerUp={handleStagePointerUp}
        onPointerEnter={handleStagePointerEnter}
        onPointerLeave={handleStagePointerLeave}
        onTouchStart={handleStagePointerDown}
        onContextMenu={handleStageContextMenu}
        onDragMove={handleStageDragMove}
        onDragEnd={handleStageDragEnd}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
      >
        {/* Images Layer */}
        <Layer>
          {konvaImages.map((img) => (
            <KonvaImage
              key={img.id}
              id={img.id}
              image={img.image}
              x={img.x}
              y={img.y}
              draggable={currentTool === CanvasTool.SELECT && !canvasSelectionMode.active && img.image && img.image.complete}
              // dragBoundFunc removed to prevent conflicts
              dragDistance={1}  // Small threshold to prevent accidental drags
              onPointerDown={(e) => {
                // Select on pointer down to enable click-and-drag
                if (currentTool === CanvasTool.SELECT) {
                  setSelectedId(img.id)
                }
              }}
              onDragStart={(e) => {
                // Ensure selection when drag starts
                if (currentTool === CanvasTool.SELECT && selectedId !== img.id) {
                  setSelectedId(img.id)
                }
                // Force cache to prevent buffer issues
                e.target.cache()
                e.target.getLayer()?.batchDraw()
              }}
              onDragMove={(e) => {
                // Ensure the image buffer remains intact during drag
                const node = e.target
                if (!node.isClientRectOnScreen()) {
                  // If the image is being dragged off-screen, limit the movement
                  const stage = node.getStage()
                  if (stage) {
                    const box = node.getClientRect()
                    const stageBox = {
                      x: 0,
                      y: 0,
                      width: stage.width(),
                      height: stage.height()
                    }
                    // Keep at least part of the image visible
                    if (box.x > stageBox.width) node.x(node.x() - (box.x - stageBox.width + 50))
                    if (box.y > stageBox.height) node.y(node.y() - (box.y - stageBox.height + 50))
                    if (box.x + box.width < 0) node.x(node.x() - (box.x + box.width - 50))
                    if (box.y + box.height < 0) node.y(node.y() - (box.y + box.height - 50))
                  }
                }
              }}
              onDragEnd={(e) => {
                const node = e.target
                const newX = node.x()
                const newY = node.y()
                
                // Clear cache after drag
                node.clearCache()
                
                // Update position in store
                useStore.getState().updateImagePosition(img.id, newX, newY)
                
                // Update local state
                setKonvaImages(prev => prev.map(i => 
                  i.id === img.id ? { ...i, x: newX, y: newY } : i
                ))
                
                // Force redraw
                node.getLayer()?.batchDraw()
              }}
              stroke={getImageBorderColor(img.id)}
              strokeWidth={selectedId === img.id || activeImageRoles.some(r => r.imageId === img.id) ? 3 : 0}
              strokeHitEnabled={false}  // Prevent stroke from interfering with events
              shadowBlur={selectedId === img.id ? 10 : 0}
              shadowColor={getImageBorderColor(img.id)}
              shadowOpacity={0.5}
              shadowHitEnabled={false}  // Prevent shadow from interfering with events
              opacity={canvasSelectionMode.active ? 
                (activeImageRoles.some(r => r.imageId === img.id) ? 1 : 0.5) : 1
              }
              listening={true}  // Always listen for events
              onContextMenu={(e) => handleContextMenu(e, img.id)}
            />
          ))}
          {/* Always render transformer but control its visibility through nodes */}
          <Transformer
            ref={transformerRef}
            ignoreStroke={true}
            rotateEnabled={true}
            resizeEnabled={true}
            anchorSize={8}
            borderStroke={'#646cff'}
            borderStrokeWidth={2}
            anchorFill={'white'}
            anchorStroke={'#646cff'}
            anchorStrokeWidth={2}
            anchorCornerRadius={2}
            shouldOverdrawWholeArea={false}  // Don't overdraw to avoid blocking events
            boundBoxFunc={(oldBox, newBox) => {
              // Limit resize to prevent negative values
              if (newBox.width < 5 || newBox.height < 5) {
                return oldBox
              }
              return newBox
            }}
            keepRatio={false}
            enabledAnchors={[
              'top-left',
              'top-center',
              'top-right',
              'middle-right',
              'middle-left',
              'bottom-left',
              'bottom-center',
              'bottom-right'
            ]}
            rotationSnaps={[0, 90, 180, 270]}
            onTransformEnd={() => {
              // Update the image position after transformation
              if (selectedId && transformerRef.current) {
                const node = transformerRef.current.nodes()[0]
                if (node) {
                  useStore.getState().updateImagePosition(selectedId, node.x(), node.y())
                }
              }
            }}
          />
        </Layer>
        
        {/* Drawing Layer - only listens when drawing tools are active */}
        <Layer 
          listening={currentTool === CanvasTool.BRUSH || currentTool === CanvasTool.ERASER}
          visible={drawingLayerVisible}
          opacity={drawingLayerOpacity}
        >
          {/* Render completed strokes */}
          {drawingStrokes.map((stroke) => {
            // If we have an outline from PerfectFreehand, render as filled polygon
            if (stroke.outline && stroke.outline.length > 0) {
              const flatPoints = stroke.outline.flat()
              return (
                <Line
                  key={stroke.id}
                  points={flatPoints}
                  fill={stroke.color}
                  closed={true}
                  globalCompositeOperation={stroke.globalCompositeOperation}
                  opacity={stroke.opacity}
                  listening={false}
                />
              )
            }
            // Fallback to regular line if no outline
            return (
              <Line
                key={stroke.id}
                points={stroke.points}
                stroke={stroke.color}
                strokeWidth={stroke.strokeWidth}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
                globalCompositeOperation={stroke.globalCompositeOperation}
                opacity={stroke.opacity}
                listening={false}
              />
            )
          })}
          
          {/* Render current stroke being drawn */}
          {currentStroke && (
            currentStroke.outline && currentStroke.outline.length > 0 ? (
              <Line
                points={currentStroke.outline.flat()}
                fill={currentStroke.color}
                closed={true}
                globalCompositeOperation={currentStroke.globalCompositeOperation}
                opacity={currentStroke.opacity}
                listening={false}
              />
            ) : (
              <Line
                points={currentStroke.points}
                stroke={currentStroke.color}
                strokeWidth={currentStroke.strokeWidth}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
                globalCompositeOperation={currentStroke.globalCompositeOperation}
                opacity={currentStroke.opacity}
                listening={false}
              />
            )
          )}
          
          {/* Drawing Cursor */}
          {showDrawingCursor && !isDrawingActive && (
            <Circle
              x={cursorPos.x}
              y={cursorPos.y}
              radius={getCursorRadius()}
              stroke={currentTool === CanvasTool.ERASER ? '#ff0000' : brushColor}
              strokeWidth={1}
              fill="transparent"
              opacity={0.5}
              listening={false}
            />
          )}
        </Layer>
      </Stage>

      <CanvasContextMenu
        contextMenu={contextMenu}
        onClose={() => setContextMenu({ ...contextMenu, visible: false })}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        onSendToImg2Img={handleSendToImg2Img}
        onInpaint={() => {
          if (contextMenu.imageId) {
            const image = konvaImages.find((img) => img.id === contextMenu.imageId)
            if (image) {
              setImageRole(contextMenu.imageId, 'inpaint_image')
              // Navigate to inpaint tab would go here
              setContextMenu({ ...contextMenu, visible: false })
            }
          }
        }}
        onDownload={handleDownload}
        onUpload={handleUploadImage}
      />
    </div>
  )
}
