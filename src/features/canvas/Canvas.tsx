import Konva from 'konva'
import React, { useEffect, useState, useRef } from 'preact/compat'
import {
  Stage,
  Layer,
  Image as KonvaImage,
  Transformer,
  Line,
  Circle,
  Rect,
  Text,
} from 'react-konva'

import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { useKonvaTokens } from '../../hooks/useKonvaTokens'
import { LazyBrush } from '../../services/drawing/LazyBrush'
import {
  PerfectFreehandService,
  BRUSH_PRESETS,
} from '../../services/drawing/PerfectFreehandService'
import { PressureManager } from '../../services/drawing/PressureManager'
import { progressService } from '../../services/progress/ProgressService'
import { useStore } from '../../store/store'
import { debounce } from '../../utils/helpers'
import { preventDefaultTouch } from '../../utils/pointerEvents'

import { CanvasContextMenu } from './CanvasContextMenu'
import { CanvasMinimap } from './CanvasMinimap'
import { DraggableCanvasToolbar } from './DraggableCanvasToolbar'
import { DraggableZoomControls } from './DraggableZoomControls'
import { FloatingDrawingPanel } from './FloatingDrawingPanel'
import { SizeIndicator } from './SizeIndicator'

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
  const tokens = useKonvaTokens()
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
    canvasViewport,
    updateCanvasViewport,
    // Generation frames
    generationFrames,
    addGenerationFrame,
    removeGenerationFrame,
    updateGenerationFrame,
    updateFramePosition,
    updateFrameSize,
    lockFrame,
    convertPlaceholderToActive,
    getNextEmptyFrame,
    // Generation parameters
    width,
    height,
    generateTxt2Img,
    isLoading,
    progress,
    previewImage,
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
    setDrawingMode,
    setDrawingTool,
    setDrawingActive,
    startDrawingStroke,
    updateCurrentStroke,
    endDrawingStroke,
  } = useStore()

  // Add tool state - default to SELECT tool
  const [currentTool, setCurrentToolInternal] = useState<CanvasTool>(CanvasTool.SELECT)

  // Handle tool changes with automatic drawing mode management
  const setCurrentTool = (tool: CanvasTool) => {
    setCurrentToolInternal(tool)
    // Automatically enable/disable drawing mode based on tool
    const isDrawingTool = tool === CanvasTool.BRUSH || tool === CanvasTool.ERASER
    setDrawingMode(isDrawingTool)
    if (isDrawingTool) {
      setDrawingTool(tool === CanvasTool.ERASER ? 'eraser' : 'brush')
    }
  }

  const [konvaImages, setKonvaImages] = useState<KonvaImageData[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [scale, setScale] = useState(canvasViewport.scale)
  const [position, setPosition] = useState(canvasViewport.position)
  const [canvasState, setCanvasState] = useState<CanvasState>({
    showUploadMenu: false,
    uploadPosition: { x: 0, y: 0 },
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
  const strokePointsRef = useRef<{ x: number; y: number; pressure: number }[]>([])
  const [isPanning, setIsPanning] = useState(false)
  const [activeGenerationFrameId, setActiveGenerationFrameId] = useState<string | null>(null)
  const [contextMenuFrameId, setContextMenuFrameId] = useState<string | null>(null)
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null)

  const stageRef = useRef<Konva.Stage>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDraggingFile, setIsDraggingFile] = useState(false)

  // Drawing services
  const perfectFreehandRef = useRef<PerfectFreehandService | null>(null)
  const pressureManagerRef = useRef<PressureManager | null>(null)
  const lazyBrushRef = useRef<LazyBrush | null>(null)

  // Create debounced viewport update to prevent excessive localStorage writes
  const debouncedUpdateViewport = useRef(
    debounce((scale: number, position: { x: number; y: number }) => {
      updateCanvasViewport(scale, position)
    }, 250) // Debounce for 250ms
  ).current

  // Monitor progress for active generation frame
  useEffect(() => {
    if (!activeGenerationFrameId) return

    const unsubscribe = progressService.onProgress((message) => {
      // Handle different message formats from progress service
      if (message.phase === 'sampling' || message.type === 'progress') {
        const progress =
          message.total > 0 ? (message.current / message.total) * 100 : message.progress || 0
        updateGenerationFrame(activeGenerationFrameId, {
          progress,
          previewImage: message.preview ? `data:image/png;base64,${message.preview}` : undefined,
        })
      } else if (message.phase === 'vae' || message.phase === 'postprocessing') {
        updateGenerationFrame(activeGenerationFrameId, {
          progress: 95,
          previewImage: message.preview ? `data:image/png;base64,${message.preview}` : undefined,
        })
      } else if (message.phase === 'completed' || message.type === 'complete') {
        updateGenerationFrame(activeGenerationFrameId, {
          isGenerating: false,
          progress: 100,
        })
        // Cleanup frame after completion
        setTimeout(() => {
          removeGenerationFrame(activeGenerationFrameId)
          setActiveGenerationFrameId(null)
        }, 500)
      } else if (message.type === 'error') {
        updateGenerationFrame(activeGenerationFrameId, {
          isGenerating: false,
          error: message.error || 'Generation failed',
        })
        // Keep error frames visible longer
        setTimeout(() => {
          removeGenerationFrame(activeGenerationFrameId)
          setActiveGenerationFrameId(null)
        }, 3000)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [activeGenerationFrameId, updateGenerationFrame, removeGenerationFrame])

  // Cleanup orphaned frames when generation completes
  useEffect(() => {
    if (!isLoading && generationFrames.length > 0) {
      generationFrames.forEach((frame) => {
        if (frame.isGenerating) {
          // Mark as complete if generation stopped
          updateGenerationFrame(frame.id, {
            isGenerating: false,
            progress: 100,
          })
          setTimeout(() => removeGenerationFrame(frame.id), 500)
        }
      })
    }
  }, [isLoading])

  // Initialize drawing services
  useEffect(() => {
    const preset = BRUSH_PRESETS[brushPreset as keyof typeof BRUSH_PRESETS] || BRUSH_PRESETS.soft
    perfectFreehandRef.current = new PerfectFreehandService({
      ...preset,
      size: brushSize,
    })
    pressureManagerRef.current = new PressureManager()
    lazyBrushRef.current = new LazyBrush({ radius: smoothing, enabled: true })

    pressureManagerRef.current.initialize()

    return () => {
      pressureManagerRef.current?.cleanup()
    }
  }, [])

  // No longer needed - tool selection directly manages drawing mode

  // Update drawing services when settings change
  useEffect(() => {
    if (perfectFreehandRef.current) {
      const preset = BRUSH_PRESETS[brushPreset as keyof typeof BRUSH_PRESETS] || BRUSH_PRESETS.soft
      perfectFreehandRef.current.setOptions({
        ...preset,
        size: brushSize,
        smoothing: smoothing / 100,
      })
    }
  }, [brushSize, brushPreset, smoothing])

  useEffect(() => {
    if (lazyBrushRef.current) {
      lazyBrushRef.current.configure({ radius: smoothing })
    }
  }, [smoothing])

  // Set initial stage position and scale
  useEffect(() => {
    if (stageRef.current) {
      stageRef.current.position(position)
      stageRef.current.scale({ x: scale, y: scale })
    }
  }, [])

  // Update cursor visibility based on tool and manage stage draggability
  useEffect(() => {
    const isDrawingTool = currentTool === CanvasTool.BRUSH || currentTool === CanvasTool.ERASER
    setShowDrawingCursor(isDrawingTool)

    // Update stage draggability based on current tool
    if (stageRef.current) {
      stageRef.current.draggable(currentTool === CanvasTool.PAN)
    }
  }, [currentTool])

  // Prevent default touch behaviors on canvas
  useEffect(() => {
    const container = containerRef.current
    if (container) {
      preventDefaultTouch(container)
    }
  }, [])

  // Handle image file upload - define before use in drag-drop handlers
  const handleImageFile = async (file: File, x: number, y: number) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Use the new uploadImageToCanvas function from the store
    await uploadImageToCanvas(file, x, y)
  }

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
      const imageFile = files.find((f) => f.type.startsWith('image/'))

      if (imageFile && stageRef.current) {
        const stage = stageRef.current
        const pointer = stage.getPointerPosition()
        if (pointer) {
          const stagePos = stage.position()
          const x = (pointer.x - stagePos.x) / scale
          const y = (pointer.y - stagePos.y) / scale
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
  }, [scale])

  const getImageBorderColor = (imageId: string) => {
    const role = activeImageRoles.find((r) => r.imageId === imageId)
    if (!role) return selectedId === imageId ? tokens.colors.interactivePrimary : 'transparent'

    switch (role.role) {
      case 'img2img_init':
        return tokens.colors.success
      case 'inpaint_image':
        return tokens.colors.warning
      default:
        return selectedId === imageId ? tokens.colors.interactivePrimary : 'transparent'
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
        img.crossOrigin = 'anonymous' // Ensure CORS is handled
        img.src = imgData.src
        img.onload = () => {
          // Ensure image is fully loaded before adding to Konva
          if (img.complete && img.naturalHeight !== 0) {
            resolve({
              id: imgData.id,
              src: imgData.src,
              x: imgData.x,
              y: imgData.y,
              image: img,
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

    // Get current position from the stage itself
    const stagePos = stage.position()

    const mousePointTo = {
      x: (pointer.x - stagePos.x) / oldScale,
      y: (pointer.y - stagePos.y) / oldScale,
    }

    const direction = e.evt.deltaY > 0 ? -1 : 1
    const newScale = direction > 0 ? oldScale * 1.1 : oldScale / 1.1
    const clampedScale = Math.max(0.05, Math.min(10, newScale)) // Allow more zoom out (0.05x) and zoom in (10x)

    setScale(clampedScale)

    // Directly update stage position and scale
    const newPos = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    }

    stage.scale({ x: clampedScale, y: clampedScale })
    stage.position(newPos)
    stage.batchDraw()

    // Update position state for reference
    setPosition(newPos)

    // Save viewport to persistent storage (debounced for wheel events)
    debouncedUpdateViewport(clampedScale, newPos)
  }

  const handleContextMenu = (
    e: Konva.KonvaEventObject<PointerEvent | MouseEvent>,
    imageId: string
  ) => {
    e.evt.preventDefault()

    // Context menu works in all modes except drawing modes and active panning
    if (currentTool === CanvasTool.BRUSH || currentTool === CanvasTool.ERASER || isPanning) return

    const stage = stageRef.current
    if (!stage) return

    // Use stage pointer position for absolute positioning within canvas container
    const pointer = stage.getPointerPosition()
    if (!pointer) return

    setContextMenu({
      visible: true,
      x: pointer.x,
      y: pointer.y,
      imageId,
    })
  }

  const handleStageContextMenu = (e: Konva.KonvaEventObject<PointerEvent | MouseEvent>) => {
    e.evt.preventDefault()

    // Context menu works in all modes except drawing modes and active panning
    if (currentTool === CanvasTool.BRUSH || currentTool === CanvasTool.ERASER || isPanning) return

    const stage = stageRef.current
    if (!stage) return

    // Check if we clicked on empty space or an image
    const clickedOnEmpty = e.target === e.target.getStage()

    if (clickedOnEmpty) {
      // Show upload context menu for empty space
      const pointer = stage.getPointerPosition()
      if (pointer) {
        // Use stage pointer position for absolute positioning within canvas container
        setContextMenu({
          visible: true,
          x: pointer.x,
          y: pointer.y,
          imageId: null, // null indicates empty space
        })
        // Store the canvas position for image placement
        const stagePos = stage.position()
        const canvasX = (pointer.x - stagePos.x) / scale
        const canvasY = (pointer.y - stagePos.y) / scale
        setCanvasState({
          ...canvasState,
          uploadPosition: { x: canvasX, y: canvasY },
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
    const stagePos = stage.position()
    const canvasX = (pointer.x - stagePos.x) / scale
    const canvasY = (pointer.y - stagePos.y) / scale

    // Check if we clicked on a frame
    const target = e.target
    if (target.getClassName() === 'Rect') {
      const targetId = target.id()
      if (targetId && targetId.startsWith('frame-')) {
        return // Let the frame handle its own events
      }
    }

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
        const pressure = evt && 'pressure' in evt ? evt.pressure : 0.5
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
          globalCompositeOperation:
            currentTool === CanvasTool.ERASER ? 'destination-out' : 'source-over',
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
          const clickedImage = konvaImages.find((img) => img.id === e.target.id())
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
          setSelectedFrameId(null)
        }
        break

      case CanvasTool.PAN:
        // isPanning will be set by handleStageDragStart when actual dragging begins
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
    const stagePos = stage.position()
    const canvasX = (pointer.x - stagePos.x) / scale
    const canvasY = (pointer.y - stagePos.y) / scale

    // Only update cursor position when in drawing mode to reduce re-renders
    if (currentTool === CanvasTool.BRUSH || currentTool === CanvasTool.ERASER) {
      setCursorPos({ x: canvasX, y: canvasY })
    }

    // Handle drawing tools
    if (
      (currentTool === CanvasTool.BRUSH || currentTool === CanvasTool.ERASER) &&
      isDrawingActive
    ) {
      // Get pressure from pointer event if available
      const evt = e.evt as any
      const pressure = evt && 'pressure' in evt ? evt.pressure : 0.5
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
          const outline =
            perfectFreehandRef.current?.generateStrokeOutline(strokePointsRef.current) || null

          updateCurrentStroke(newPoints, outline || undefined)
        }
      }
    }
  }

  const handleStagePointerUp = (
    e?: Konva.KonvaEventObject<PointerEvent | MouseEvent | TouchEvent>
  ) => {
    // Handle drawing tools
    if (
      (currentTool === CanvasTool.BRUSH || currentTool === CanvasTool.ERASER) &&
      isDrawingActive
    ) {
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

    // Stop panning if we were panning
    if (isPanning) {
      setIsPanning(false)
    }
  }

  const handleStageDragStart = (e: Konva.KonvaEventObject<DragEvent>) => {
    // Only handle stage dragging
    if (e.target === e.target.getStage()) {
      setIsPanning(true)
    }
  }

  const handleStageDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    // Only update position if we're dragging the stage itself (not an image)
    if (e.target === e.target.getStage()) {
      const newPos = {
        x: e.target.x(),
        y: e.target.y(),
      }
      setPosition(newPos)
      setIsPanning(false)

      // Save viewport to persistent storage
      updateCanvasViewport(scale, newPos)
    }
  }

  const handleStageDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    // Position is handled internally by Konva for smoother dragging
    // Update position state for minimap during drag
    if (e.target === e.target.getStage()) {
      const stage = e.target
      setPosition({
        x: stage.x(),
        y: stage.y(),
      })
    }
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

  const handlePlaceEmptyFrame = () => {
    const stagePos = stageRef.current?.position()
    if (!stagePos) return

    const canvasX = (contextMenu.x - stagePos.x) / scale
    const canvasY = (contextMenu.y - stagePos.y) / scale

    addGenerationFrame(canvasX, canvasY, width, height, true)
    setContextMenu({ ...contextMenu, visible: false })
  }

  const handleGenerateHere = async () => {
    const stagePos = stageRef.current?.position()
    if (!stagePos) return

    const canvasX = (contextMenu.x - stagePos.x) / scale
    const canvasY = (contextMenu.y - stagePos.y) / scale

    // Create a temporary generation frame (not a placeholder)
    const frameId = addGenerationFrame(canvasX, canvasY, width, height, false)
    setActiveGenerationFrameId(frameId)
    updateGenerationFrame(frameId, { isGenerating: true })

    try {
      // Check for active image roles to determine generation mode
      const img2imgRole = activeImageRoles.find((r) => r.role === 'img2img_init')
      const inpaintRole = activeImageRoles.find((r) => r.role === 'inpaint_image')

      if (inpaintRole) {
        // Use inpainting mode if an inpaint image is set
        const inpaintImage = images.find((img) => img.id === inpaintRole.imageId)
        if (inpaintImage) {
          // Get base64 representation of the image
          const baseImageBase64 = await useStore.getState().exportImageAsBase64(inpaintImage.id)

          // For now, use the same image as mask (you might want to add mask drawing functionality)
          // This is a basic implementation - you should implement proper mask drawing
          await useStore.getState().generateInpaint({
            baseImage: baseImageBase64,
            maskImage: baseImageBase64, // TODO: Implement proper mask drawing
            denoisingStrength: 0.75,
            maskBlur: 4,
            inpaintingFill: 'original',
            inpaintFullRes: false,
            inpaintFullResPadding: 32,
          })
        } else {
          throw new Error('Inpaint image not found')
        }
      } else if (img2imgRole) {
        // Use img2img mode if an img2img init image is set
        const img2imgImage = images.find((img) => img.id === img2imgRole.imageId)
        if (img2imgImage) {
          // Get base64 representation of the image
          const baseImageBase64 = await useStore.getState().exportImageAsBase64(img2imgImage.id)

          // Use default denoising strength (you might want to make this configurable)
          await useStore.getState().generateImg2Img(baseImageBase64, 0.5)
        } else {
          throw new Error('Img2Img init image not found')
        }
      } else {
        // Default to txt2img if no image roles are set
        await generateTxt2Img()
      }

      // Generated image will be placed at frame position by generation system
    } catch (error) {
      updateGenerationFrame(frameId, {
        isGenerating: false,
        error: error.message,
      })
      console.error('Generation failed:', error)
    }
  }

  const handleUploadImage = () => {
    fileInputRef.current?.click()
    setContextMenu({ ...contextMenu, visible: false })
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

  // Handle viewport change from minimap
  const handleViewportChange = (x: number, y: number, newScale: number) => {
    if (stageRef.current) {
      setPosition({ x, y })
      setScale(newScale)
      stageRef.current.position({ x, y })
      stageRef.current.scale({ x: newScale, y: newScale })
      stageRef.current.batchDraw()

      // Save viewport to persistent storage
      updateCanvasViewport(newScale, { x, y })
    }
  }

  // Get cursor radius for drawing
  const getCursorRadius = () => {
    return brushSize / 2
  }

  return (
    <div
      class={`canvas-container ${isDraggingFile ? 'dragging-file' : ''} ${canvasSelectionMode.active ? 'selection-mode' : ''} ${currentTool === CanvasTool.BRUSH || currentTool === CanvasTool.ERASER ? 'drawing-mode' : ''} ${currentTool === CanvasTool.PAN ? 'pan-mode' : ''} ${isPanning ? 'panning' : ''}`}
      ref={containerRef}
    >
      {canvasSelectionMode.active && (
        <div class="selection-mode-overlay">
          <div class="selection-mode-header">
            <h3>Select an image for {canvasSelectionMode.mode}</h3>
            <button class="cancel-selection-btn" onClick={cancelCanvasSelection}>
              Cancel
            </button>
          </div>
          <div class="selection-mode-hint">Click on any image to select it</div>
        </div>
      )}

      {/* Draggable Canvas Toolbar */}
      <DraggableCanvasToolbar currentTool={currentTool} onToolChange={setCurrentTool} />

      {/* Draggable Zoom Controls */}
      <DraggableZoomControls
        scale={scale}
        onZoomIn={() => {
          const newScale = scale * 1.2
          const clampedScale = Math.max(0.05, Math.min(10, newScale))
          setScale(clampedScale)
          if (stageRef.current) {
            stageRef.current.scale({ x: clampedScale, y: clampedScale })
            stageRef.current.batchDraw()
          }
          // Save viewport to persistent storage
          updateCanvasViewport(clampedScale, position)
        }}
        onZoomOut={() => {
          const newScale = scale / 1.2
          const clampedScale = Math.max(0.05, Math.min(10, newScale))
          setScale(clampedScale)
          if (stageRef.current) {
            stageRef.current.scale({ x: clampedScale, y: clampedScale })
            stageRef.current.batchDraw()
          }
          // Save viewport to persistent storage
          updateCanvasViewport(clampedScale, position)
        }}
        onReset={() => {
          setScale(1)
          setPosition({ x: 0, y: 0 })
          // Directly set stage position
          if (stageRef.current) {
            stageRef.current.position({ x: 0, y: 0 })
            stageRef.current.scale({ x: 1, y: 1 })
            stageRef.current.batchDraw()
          }
          // Save viewport to persistent storage
          updateCanvasViewport(1, { x: 0, y: 0 })
        }}
      />

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
        draggable={false} // We control this programmatically
        onWheel={handleWheel}
        onMouseDown={handleStagePointerDown}
        onPointerDown={handleStagePointerDown}
        onPointerMove={handleStagePointerMove}
        onPointerUp={handleStagePointerUp}
        onPointerCancel={handleStagePointerUp} // Handle pointer cancel events
        onPointerEnter={handleStagePointerEnter}
        onPointerLeave={handleStagePointerLeave}
        onContextMenu={handleStageContextMenu}
        onDragStart={handleStageDragStart}
        onDragMove={handleStageDragMove}
        onDragEnd={handleStageDragEnd}
      >
        {/* Generation Frames Layer */}
        <Layer listening={true}>
          {generationFrames.map((frame) => (
            <React.Fragment key={frame.id}>
              <Rect
                id={`frame-${frame.id}`}
                x={frame.x}
                y={frame.y}
                width={frame.width}
                height={frame.height}
                stroke={
                  frame.error
                    ? tokens.colors.error
                    : frame.isPlaceholder
                      ? tokens.colors.textTertiary
                      : tokens.colors.interactivePrimary
                }
                strokeWidth={
                  frame.isPlaceholder ? tokens.borders.widthThin : tokens.borders.widthMedium
                }
                fill={
                  frame.isPlaceholder ? tokens.colors.surfaceSelected : tokens.colors.surfaceActive
                }
                dash={frame.isPlaceholder ? [5, 5] : [10, 5]}
                draggable={Boolean(
                  frame.isPlaceholder && !frame.locked && currentTool === CanvasTool.SELECT
                )}
                onPointerDown={(e) => {
                  if (currentTool === CanvasTool.SELECT && frame.isPlaceholder) {
                    setSelectedFrameId(frame.id)
                    setSelectedId(null)
                  }
                }}
                onDragStart={(e) => {
                  e.cancelBubble = true
                  setSelectedFrameId(frame.id)
                  setSelectedId(null)
                  const container = containerRef.current
                  if (container) {
                    container.style.cursor = 'move'
                  }
                }}
                onDragEnd={(e) => {
                  e.cancelBubble = true
                  const node = e.target
                  updateFramePosition(frame.id, node.x(), node.y())
                  const container = containerRef.current
                  if (container) {
                    container.style.cursor = ''
                  }
                }}
                onMouseEnter={(e) => {
                  if (frame.isPlaceholder && !frame.locked && currentTool === CanvasTool.SELECT) {
                    const container = containerRef.current
                    if (container) {
                      container.style.cursor = 'move'
                    }
                  }
                }}
                onMouseLeave={(e) => {
                  const container = containerRef.current
                  if (container) {
                    container.style.cursor = ''
                  }
                }}
                onContextMenu={(e) => {
                  e.evt.preventDefault()
                  e.cancelBubble = true
                  const stage = stageRef.current
                  if (!stage) return
                  const pointer = stage.getPointerPosition()
                  if (!pointer) return
                  setContextMenuFrameId(frame.id)
                  setContextMenu({
                    visible: true,
                    x: pointer.x,
                    y: pointer.y,
                    imageId: null,
                  })
                }}
                listening={true}
              />

              {/* Size indicator for placeholder frames - always visible */}
              {frame.isPlaceholder && (
                <>
                  {/* Background matching external SizeIndicator using design tokens */}
                  <Rect
                    x={frame.x + frame.width / 2 - 45}
                    y={frame.y + frame.height / 2 - 10}
                    width={90}
                    height={20}
                    fill={tokens.colors.surfacePrimary}
                    stroke={tokens.colors.borderPrimary}
                    strokeWidth={tokens.borders.widthThin}
                    cornerRadius={tokens.borders.radiusBase}
                    listening={false}
                  />
                  <Text
                    x={frame.x + frame.width / 2 - 30}
                    y={frame.y + frame.height / 2 - 6}
                    text={`${frame.width} × ${frame.height}`}
                    fontSize={tokens.typography.fontSizeXs}
                    fontFamily={tokens.typography.fontFamilyMono}
                    fontStyle={tokens.typography.fontWeightSemibold.toString()}
                    fill={tokens.colors.textPrimary}
                    listening={false}
                  />
                  <Text
                    x={frame.x + frame.width / 2 + 30}
                    y={frame.y + frame.height / 2 - 5}
                    text="px"
                    fontSize={10}
                    fontFamily={tokens.typography.fontFamilyBase}
                    fill={tokens.colors.textTertiary}
                    listening={false}
                  />
                </>
              )}

              {/* Label for placeholder frames */}
              {frame.isPlaceholder && frame.label && (
                <Text
                  x={frame.x}
                  y={frame.y - 20}
                  text={frame.label}
                  fontSize={tokens.typography.fontSizeXs}
                  fontFamily={tokens.typography.fontFamilyBase}
                  fill={tokens.colors.textTertiary}
                  listening={false}
                />
              )}

              {/* Lock indicator */}
              {frame.locked && (
                <Circle
                  x={frame.x + frame.width - 10}
                  y={frame.y + 10}
                  radius={5}
                  fill={tokens.colors.error}
                  listening={false}
                />
              )}

              {frame.isGenerating && !frame.isPlaceholder && (
                <>
                  <Rect
                    x={frame.x}
                    y={frame.y - 25}
                    width={frame.width}
                    height={20}
                    fill={tokens.colors.backgroundPrimary}
                    cornerRadius={tokens.borders.radiusSm}
                    listening={false}
                  />

                  <Rect
                    x={frame.x + 2}
                    y={frame.y - 23}
                    width={(frame.width - 4) * (frame.progress / 100)}
                    height={16}
                    fill={tokens.colors.interactivePrimary}
                    cornerRadius={tokens.borders.radiusSm}
                    listening={false}
                  />

                  <Text
                    x={frame.x}
                    y={frame.y - 20}
                    width={frame.width}
                    height={20}
                    text={`${Math.round(frame.progress)}%`}
                    fontSize={tokens.typography.fontSizeXs}
                    fontFamily={tokens.typography.fontFamilyMono}
                    fill={tokens.colors.textPrimary}
                    align="center"
                    listening={false}
                  />
                </>
              )}

              {frame.previewImage && (
                <KonvaImage
                  x={frame.x}
                  y={frame.y}
                  width={frame.width}
                  height={frame.height}
                  image={(() => {
                    const img = new window.Image()
                    img.src = frame.previewImage
                    return img
                  })()}
                  opacity={0.8}
                  listening={false}
                />
              )}

              {frame.error && (
                <Text
                  x={frame.x}
                  y={frame.y + frame.height / 2 - 10}
                  width={frame.width}
                  text={frame.error}
                  fontSize={tokens.typography.fontSizeSm}
                  fontFamily={tokens.typography.fontFamilyBase}
                  fill={tokens.colors.error}
                  align="center"
                  listening={false}
                />
              )}
            </React.Fragment>
          ))}
        </Layer>

        {/* Images Layer */}
        <Layer>
          {konvaImages.map((img) => (
            <KonvaImage
              key={img.id}
              id={img.id}
              image={img.image}
              x={img.x}
              y={img.y}
              draggable={
                currentTool === CanvasTool.SELECT &&
                !canvasSelectionMode.active &&
                img.image &&
                img.image.complete
              }
              // dragBoundFunc removed to prevent conflicts
              dragDistance={1} // Small threshold to prevent accidental drags
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
                      height: stage.height(),
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
                setKonvaImages((prev) =>
                  prev.map((i) => (i.id === img.id ? { ...i, x: newX, y: newY } : i))
                )

                // Force redraw
                node.getLayer()?.batchDraw()
              }}
              stroke={getImageBorderColor(img.id)}
              strokeWidth={
                selectedId === img.id || activeImageRoles.some((r) => r.imageId === img.id) ? 3 : 0
              }
              strokeHitEnabled={false} // Prevent stroke from interfering with events
              shadowBlur={selectedId === img.id ? 10 : 0}
              shadowColor={getImageBorderColor(img.id)}
              shadowOpacity={0.5}
              shadowHitEnabled={false} // Prevent shadow from interfering with events
              opacity={
                canvasSelectionMode.active
                  ? activeImageRoles.some((r) => r.imageId === img.id)
                    ? 1
                    : 0.5
                  : 1
              }
              listening={true} // Always listen for events
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
            borderStroke={tokens.colors.interactivePrimary}
            borderStrokeWidth={tokens.borders.widthMedium}
            anchorFill={tokens.colors.textPrimary}
            anchorStroke={tokens.colors.interactivePrimary}
            anchorStrokeWidth={tokens.borders.widthMedium}
            anchorCornerRadius={tokens.borders.radiusXs}
            shouldOverdrawWholeArea={false} // Don't overdraw to avoid blocking events
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
              'bottom-right',
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
          {currentStroke &&
            (currentStroke.outline && currentStroke.outline.length > 0 ? (
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
            ))}

          {/* Drawing Cursor */}
          {showDrawingCursor && !isDrawingActive && (
            <Circle
              x={cursorPos.x}
              y={cursorPos.y}
              radius={getCursorRadius()}
              stroke={currentTool === CanvasTool.ERASER ? tokens.colors.error : brushColor}
              strokeWidth={tokens.borders.widthThin}
              fill="transparent"
              opacity={tokens.opacity.hover}
              listening={false}
            />
          )}
        </Layer>
      </Stage>

      {/* Size Indicator for images only (not frames) */}
      <SizeIndicator
        selectedId={selectedId}
        elements={[
          ...konvaImages.map((img) => ({
            id: img.id,
            x: img.x,
            y: img.y,
            type: 'image' as const,
            image: img.image,
          })),
        ]}
        scale={scale}
        position={position}
      />

      {/* Minimap */}
      <CanvasMinimap
        stageRef={stageRef}
        scale={scale}
        position={position}
        images={konvaImages.map((img) => ({
          id: img.id,
          x: img.x,
          y: img.y,
          src: img.src,
          width: img.image?.naturalWidth,
          height: img.image?.naturalHeight,
          borderColor: getImageBorderColor(img.id), // Pass the color based on role/selection
        }))}
        onViewportChange={handleViewportChange}
      />

      {/* Floating Drawing Panel - shown when drawing tools are active */}
      <FloatingDrawingPanel
        visible={currentTool === CanvasTool.BRUSH || currentTool === CanvasTool.ERASER}
        tool={currentTool === CanvasTool.ERASER ? 'eraser' : 'brush'}
      />

      <CanvasContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        imageId={contextMenu.imageId}
        frameId={contextMenuFrameId}
        onClose={() => {
          setContextMenu({ ...contextMenu, visible: false })
          setContextMenuFrameId(null)
        }}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        onSendToImg2Img={handleSendToImg2Img}
        onInpaint={() => {
          // Role is set in CanvasContextMenu component
          // TODO: Navigate to inpaint tab
          setContextMenu({ ...contextMenu, visible: false })
        }}
        onDownload={handleDownload}
        onUploadImage={handleUploadImage}
        onGenerateHere={handleGenerateHere}
        onPlaceEmptyFrame={handlePlaceEmptyFrame}
      />
    </div>
  )
}
