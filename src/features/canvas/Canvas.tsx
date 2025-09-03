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
  
  // Update drawing services when settings change
  useEffect(() => {
    if (perfectFreehandRef.current) {
      const preset = BRUSH_PRESETS[brushPreset as keyof typeof BRUSH_PRESETS] || BRUSH_PRESETS.soft
      perfectFreehandRef.current.setOptions({
        ...preset,
        size: brushSize, // Use the actual brush size from state
        smoothing: smoothing / 100
      })
    }
  }, [brushSize, brushPreset, smoothing])
  
  useEffect(() => {
    if (lazyBrushRef.current) {
      lazyBrushRef.current.configure({ radius: smoothing })
    }
  }, [smoothing])
  
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
      if (selectedId) {
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
        img.src = imgData.src
        img.onload = () => resolve({ 
          id: imgData.id,
          src: imgData.src,
          x: imgData.x,
          y: imgData.y,
          image: img 
        })
        img.onerror = () => {
          console.error(`Failed to load image ${imgData.id}`)
          // Still resolve but with a placeholder or skip
        }
      })
    })

    Promise.all(imagePromises).then(setKonvaImages)
  }, [images])

  useEffect(() => {
    // Update transformer when selection changes
    if (transformerRef.current && stageRef.current) {
      const stage = stageRef.current
      const transformer = transformerRef.current

      if (selectedId) {
        const selectedNode = stage.findOne(`#${selectedId}`)
        if (selectedNode) {
          transformer.nodes([selectedNode])
        }
      } else {
        transformer.nodes([])
      }
      transformer.getLayer()?.batchDraw()
    }
  }, [selectedId])

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
    // If we're in drawing mode, handle drawing
    if (isDrawingMode && !isDrawingActive) {
      const stage = stageRef.current
      if (!stage) return
      
      const pointer = stage.getPointerPosition()
      if (!pointer) return
      
      // Convert to canvas coordinates
      const canvasX = (pointer.x - position.x) / scale
      const canvasY = (pointer.y - position.y) / scale
      
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
        tool: drawingTool,
        points: [canvasX, canvasY],
        color: brushColor,
        opacity: brushOpacity / 100,
        strokeWidth: brushSize,
        globalCompositeOperation: drawingTool === 'eraser' ? 'destination-out' : 'source-over'
      })
      
      return
    }
    
    // If we're in selection mode and clicked on an image
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

    // Handle all pointer types (mouse, touch, pen)
    // Deselect if clicking/tapping on empty area
    const clickedOnEmpty = e.target === e.target.getStage()
    if (clickedOnEmpty && !isDrawingMode) {
      setSelectedId(null)
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
    
    setCursorPos({ x: canvasX, y: canvasY })
    
    // Handle drawing
    if (isDrawingMode && isDrawingActive) {
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
    if (isDrawingMode && isDrawingActive) {
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
  }
  
  const handleStagePointerEnter = () => {
    if (isDrawingMode) {
      setShowDrawingCursor(true)
    }
  }
  
  const handleStagePointerLeave = () => {
    setShowDrawingCursor(false)
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

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>, imageId: string) => {
    e.cancelBubble = true // Prevent bubbling to stage
    const node = e.target
    const newX = node.x()
    const newY = node.y()
    
    // Update both local state and store
    setKonvaImages(prev => prev.map(img => 
      img.id === imageId ? { ...img, x: newX, y: newY } : img
    ))
    
    // Update store for persistence
    useStore.getState().updateImagePosition(imageId, newX, newY)
  }

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
    // Show actual brush size as cursor
    return brushSize / 2
  }

  return (
    <div 
      class={`canvas-container ${isDraggingFile ? 'dragging-file' : ''} ${canvasSelectionMode.active ? 'selection-mode' : ''} ${isDrawingMode ? 'drawing-mode' : ''}`} 
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
      
      {isDrawingMode && (
        <div class="drawing-mode-indicator">
          <span class="drawing-mode-badge">✏️ Drawing Mode Active</span>
          <span class="drawing-tool-info">Tool: {drawingTool} | Size: {brushSize}px</span>
        </div>
      )}

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
        draggable={!isDrawingMode} // Disable stage dragging in drawing mode
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
              draggable={!isDrawingMode} // Disable image dragging in drawing mode
              onPointerDown={() => !isDrawingMode && setSelectedId(img.id)}
              onTap={() => !isDrawingMode && setSelectedId(img.id)}
              onContextMenu={(e) => handleContextMenu(e, img.id)}
              onDragMove={() => {/* Position handled internally by Konva during drag */}}
              onDragEnd={(e) => handleDragEnd(e, img.id)}
              stroke={getImageBorderColor(img.id)}
              strokeWidth={selectedId === img.id || activeImageRoles.some(r => r.imageId === img.id) ? 3 : 0}
              shadowBlur={selectedId === img.id ? 10 : 0}
              shadowColor={getImageBorderColor(img.id)}
              shadowOpacity={0.5}
              opacity={canvasSelectionMode.active ? 
                (activeImageRoles.some(r => r.imageId === img.id) ? 1 : 0.5) : 1
              }
            />
          ))}
          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) => {
              // Limit resize to prevent negative values
              if (newBox.width < 5 || newBox.height < 5) {
                return oldBox
              }
              return newBox
            }}
          />
        </Layer>
        
        {/* Drawing Layer */}
        <Layer 
          listening={isDrawingMode}
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
          {isDrawingMode && showDrawingCursor && !isDrawingActive && (
            <Circle
              x={cursorPos.x}
              y={cursorPos.y}
              radius={getCursorRadius()}
              stroke={drawingTool === 'eraser' ? '#ff0000' : brushColor}
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
