import Konva from 'konva'
import { useEffect, useState, useRef } from 'preact/hooks'
import { Stage, Layer, Image as KonvaImage, Transformer } from 'react-konva'

import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { useStore } from '../../store/store'
import { preventDefaultTouch } from '../../utils/pointerEvents'

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
    setImageRole
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
  const stageRef = useRef<Konva.Stage>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [dropPosition, setDropPosition] = useState<{ x: number; y: number } | null>(null)

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
      
      // Calculate drop position relative to canvas
      const stage = stageRef.current
      if (stage) {
        const containerRect = container.getBoundingClientRect()
        const x = (e.clientX - containerRect.left - position.x) / scale
        const y = (e.clientY - containerRect.top - position.y) / scale
        setDropPosition({ x, y })
      }
    }

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      // Only set to false if we're leaving the container entirely
      if (e.target === container) {
        setIsDraggingFile(false)
        setDropPosition(null)
      }
    }

    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDraggingFile(false)
      
      const files = Array.from(e.dataTransfer?.files || [])
      const imageFile = files.find(f => f.type.startsWith('image/'))
      
      if (imageFile && dropPosition) {
        handleImageFile(imageFile, dropPosition.x, dropPosition.y)
      }
      setDropPosition(null)
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

  // Get border color based on image role
  const getImageBorderColor = (imageId: string) => {
    const role = activeImageRoles.find(r => r.imageId === imageId)
    if (role) {
      switch (role.role) {
        case 'img2img': return '#4ade80' // green
        case 'inpaint': return '#a78bfa' // purple
        case 'controlnet': return '#fbbf24' // yellow
        default: return '#646cff' // default blue
      }
    }
    return selectedId === imageId ? '#646cff' : 'transparent'
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
    if (clickedOnEmpty) {
      setSelectedId(null)
    }
    // Hide context menu
    setContextMenu({ ...contextMenu, visible: false })
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

  return (
    <div 
      class={`canvas-container ${isDraggingFile ? 'dragging-file' : ''} ${canvasSelectionMode.active ? 'selection-mode' : ''}`} 
      ref={containerRef}
    >
      {isDraggingFile && (
        <div class="drop-overlay">
          <div class="drop-message">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <p>Drop image here</p>
            {dropPosition && (
              <span class="drop-coords">Position: {Math.round(dropPosition.x)}, {Math.round(dropPosition.y)}</span>
            )}
          </div>
        </div>
      )}
      
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
        draggable
        onWheel={handleWheel}
        onPointerDown={handleStagePointerDown}
        onTouchStart={handleStagePointerDown}
        onContextMenu={handleStageContextMenu}
        onDragMove={handleStageDragMove}
        onDragEnd={handleStageDragEnd}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
      >
        <Layer>
          {konvaImages.map((img) => (
            <KonvaImage
              key={img.id}
              id={img.id}
              image={img.image}
              x={img.x}
              y={img.y}
              draggable
              onPointerDown={() => setSelectedId(img.id)}
              onTap={() => setSelectedId(img.id)}
              onContextMenu={(e) => handleContextMenu(e, img.id)}
              onDragMove={() => {/* Position handled internally by Konva during drag */}}
              onDragEnd={(e) => handleDragEnd(e, img.id)}
              stroke={getImageBorderColor(img.id)}
              strokeWidth={selectedId === img.id || activeImageRoles.some(r => r.imageId === img.id) ? 3 : 0}
              shadowBlur={selectedId === img.id ? 10 : 0}
              shadowColor={getImageBorderColor(img.id)}
              shadowOpacity={0.5}
              opacity={canvasSelectionMode.active ? 0.7 : 1}
              onMouseEnter={(e) => canvasSelectionMode.active && (e.target.opacity(1))}
              onMouseLeave={(e) => canvasSelectionMode.active && (e.target.opacity(0.7))}
            />
          ))}
          <Transformer ref={transformerRef} />
        </Layer>
      </Stage>

      <CanvasContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        imageId={contextMenu.imageId}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        onSendToImg2Img={handleSendToImg2Img}
        onDownload={handleDownload}
        onUploadImage={handleUploadImage}
        onClose={() => setContextMenu({ ...contextMenu, visible: false })}
      />
    </div>
  )
}
