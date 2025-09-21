import type { StateCreator } from 'zustand'

import type { LayerNode, LayerSystemSlice } from './layerSystemSlice'

export interface DrawingStroke {
  id: string
  tool: 'brush' | 'eraser'
  points: number[] // Raw points for line rendering
  outline?: number[][] // Perfect freehand outline points
  color: string
  opacity: number
  strokeWidth: number
  globalCompositeOperation: GlobalCompositeOperation
  timestamp: number
}

export interface DrawingState {
  // Drawing mode
  isDrawingMode: boolean
  isDrawingActive: boolean // Currently drawing a stroke

  // Drawing settings
  drawingTool: 'brush' | 'eraser'
  brushSize: number
  brushOpacity: number
  brushColor: string
  brushPreset: string
  smoothing: number

  // Strokes data
  drawingStrokes: DrawingStroke[]
  currentStroke: DrawingStroke | null

  // Drawing layer visibility
  drawingLayerVisible: boolean
  drawingLayerOpacity: number

  // Layer system integration
  useLayerSystem: boolean
  currentDrawingLayerId?: string | null
}

export interface DrawingActions {
  // Mode management
  setDrawingMode: (enabled: boolean) => void
  setDrawingActive: (active: boolean) => void

  // Tool settings
  setDrawingTool: (tool: 'brush' | 'eraser') => void
  setBrushSize: (size: number) => void
  setBrushOpacity: (opacity: number) => void
  setBrushColor: (color: string) => void
  setBrushPreset: (preset: string) => void
  setSmoothing: (smoothing: number) => void

  // Stroke management
  startDrawingStroke: (stroke: Omit<DrawingStroke, 'id' | 'timestamp'>) => void
  updateCurrentStroke: (points: number[], outline?: number[][]) => void
  endDrawingStroke: (targetArtboardId?: string | null) => void
  clearDrawingStrokes: () => void
  removeDrawingStroke: (strokeId: string) => void

  // Layer management
  setDrawingLayerVisible: (visible: boolean) => void
  setDrawingLayerOpacity: (opacity: number) => void
  setUseLayerSystem: (use: boolean) => void
  setCurrentDrawingLayerId: (layerId: string | null) => void
  createNewDrawingLayer: (targetArtboardId?: string | null) => void

  // Export/Import
  exportDrawing: () => string // Export as data URL
  importDrawing: (dataUrl: string) => void

  // Layer system integration
  convertStrokeToLayer: (stroke: DrawingStroke) => LayerNode | null
  addStrokeToLayer: (stroke: DrawingStroke, layerId: string) => void
  finalizeDrawingLayer: () => void
}

export type DrawingSlice = DrawingState & DrawingActions

// The slice needs access to LayerSystemSlice for layer operations
type StoreWithLayerSystem = DrawingSlice & LayerSystemSlice

export const createDrawingSlice: StateCreator<StoreWithLayerSystem, [], [], DrawingSlice> = (
  set,
  get
) => ({
  // Initial state
  isDrawingMode: false,
  isDrawingActive: false,

  drawingTool: 'brush',
  brushSize: 10,
  brushOpacity: 100,
  brushColor: '#000000',
  brushPreset: 'soft',
  smoothing: 20,

  drawingStrokes: [],
  currentStroke: null,

  drawingLayerVisible: true,
  drawingLayerOpacity: 1,

  useLayerSystem: true,
  currentDrawingLayerId: null,

  // Actions
  setDrawingMode: (enabled) => set({ isDrawingMode: enabled }),
  setDrawingActive: (active) => set({ isDrawingActive: active }),

  setDrawingTool: (tool) => set({ drawingTool: tool }),
  setBrushSize: (size) => set({ brushSize: size }),
  setBrushOpacity: (opacity) => set({ brushOpacity: opacity }),
  setBrushColor: (color) => set({ brushColor: color }),
  setBrushPreset: (preset) => set({ brushPreset: preset }),
  setSmoothing: (smoothing) => set({ smoothing: smoothing }),

  startDrawingStroke: (strokeData) => {
    const stroke: DrawingStroke = {
      ...strokeData,
      id: `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    }
    set({
      currentStroke: stroke,
      isDrawingActive: true,
    })
  },

  updateCurrentStroke: (points, outline) => {
    const { currentStroke } = get()
    if (!currentStroke) return

    set({
      currentStroke: {
        ...currentStroke,
        points,
        outline,
      },
    })
  },

  endDrawingStroke: (targetArtboardId?: string | null) => {
    const state = get()
    const { currentStroke, drawingStrokes, useLayerSystem } = state
    let currentDrawingLayerId = state.currentDrawingLayerId // Get fresh value
    if (!currentStroke) return

    // If layer system is enabled and we have access to layer functions
    if (useLayerSystem && state.addLayer) {
      // Check if we have a current drawing layer AND it still exists
      if (currentDrawingLayerId && state.getLayer) {
        const existingLayer = state.getLayer(currentDrawingLayerId)

        // If the layer was deleted, clear the ID
        if (!existingLayer) {
          currentDrawingLayerId = null
          set({ currentDrawingLayerId: null })
        }
      }

      // Now check if we have a valid current drawing layer
      if (currentDrawingLayerId && state.getLayer && state.updateLayer) {
        const existingLayer = state.getLayer(currentDrawingLayerId)

        // If drawing on an artboard, we need to adjust the stroke coordinates
        let adjustedStroke = currentStroke
        if (targetArtboardId) {
          const artboard = state.getLayer(targetArtboardId)
          if (artboard) {
            const artboardX = artboard.x || 0
            const artboardY = artboard.y || 0

            // Adjust stroke points to be relative to artboard
            const adjustedPoints = []
            for (let i = 0; i < currentStroke.points.length; i += 2) {
              adjustedPoints.push(currentStroke.points[i] - artboardX)
              adjustedPoints.push(currentStroke.points[i + 1] - artboardY)
            }

            // Adjust outline if it exists
            let adjustedOutline = currentStroke.outline
            if (currentStroke.outline && currentStroke.outline.length > 0) {
              adjustedOutline = currentStroke.outline.map((point) => [
                point[0] - artboardX,
                point[1] - artboardY,
              ])
            }

            adjustedStroke = {
              ...currentStroke,
              points: adjustedPoints,
              outline: adjustedOutline,
            }
          }
        }

        // Add stroke to existing layer
        get().addStrokeToLayer(adjustedStroke, currentDrawingLayerId)
      } else {
        // Create new layer for first stroke
        const strokeLayer = get().convertStrokeToLayer(currentStroke)
        if (strokeLayer) {
          // If drawing on an artboard, adjust coordinates to be relative to the artboard
          if (targetArtboardId) {
            const artboard = state.getLayer(targetArtboardId)
            if (artboard) {
              const artboardX = artboard.x || 0
              const artboardY = artboard.y || 0

              // Adjust stroke position to be relative to artboard
              strokeLayer.x = (strokeLayer.x || 0) - artboardX
              strokeLayer.y = (strokeLayer.y || 0) - artboardY
            }
          }

          // Add to target artboard or root and set as current
          // Cast strokeLayer to Partial since addLayer expects Partial<LayerNode>
          const newLayerId = state.addLayer(
            strokeLayer as Partial<LayerNode>,
            targetArtboardId || undefined
          )
          set({ currentDrawingLayerId: newLayerId })
        }
      }

      // Don't accumulate strokes in flat system when using layers
      // IMPORTANT: Don't clear currentDrawingLayerId here!
      set({
        currentStroke: null,
        isDrawingActive: false,
        // Keep currentDrawingLayerId as is
      })
    } else {
      // Legacy flat system - accumulate strokes
      set({
        drawingStrokes: [...drawingStrokes, currentStroke],
        currentStroke: null,
        isDrawingActive: false,
      })
    }
  },

  clearDrawingStrokes: () => set({ drawingStrokes: [], currentStroke: null }),

  removeDrawingStroke: (strokeId) => {
    set((state) => ({
      drawingStrokes: state.drawingStrokes.filter((s) => s.id !== strokeId),
    }))
  },

  setDrawingLayerVisible: (visible) => set({ drawingLayerVisible: visible }),
  setDrawingLayerOpacity: (opacity) => set({ drawingLayerOpacity: opacity }),
  setUseLayerSystem: (use) => set({ useLayerSystem: use }),
  setCurrentDrawingLayerId: (layerId) => set({ currentDrawingLayerId: layerId }),

  exportDrawing: () => {
    // This will be implemented to export the drawing layer as a data URL
    // For now, return empty string
    console.warn('Export drawing not yet implemented')
    return ''
  },

  importDrawing: (_dataUrl) => {
    // This will be implemented to import a drawing from a data URL
    console.warn('Import drawing not yet implemented')
  },

  addStrokeToLayer: (stroke: DrawingStroke, layerId: string) => {
    const state = get()

    if (!state.getLayer || !state.updateLayer) return

    const layer = state.getLayer(layerId)
    if (!layer || layer.type !== 'drawing' || !layer.drawingProps) return

    // Get current layer position
    const layerX = layer.x || 0
    const layerY = layer.y || 0

    // Simply adjust the new stroke to be relative to current layer position
    // No need to recalculate bounds or move the layer
    const adjustedPoints = []
    for (let i = 0; i < stroke.points.length; i += 2) {
      adjustedPoints.push(stroke.points[i] - layerX)
      adjustedPoints.push(stroke.points[i + 1] - layerY)
    }

    let adjustedOutline = undefined
    if (stroke.outline && stroke.outline.length > 0) {
      adjustedOutline = stroke.outline.map((point) => [point[0] - layerX, point[1] - layerY])
    }

    // Add new stroke to layer
    const newStroke = {
      points: adjustedPoints,
      outline: adjustedOutline,
      color: stroke.color,
      strokeWidth: stroke.strokeWidth,
      opacity: stroke.opacity,
    }

    // Update layer with combined strokes - keep layer position unchanged
    state.updateLayer(layerId, {
      drawingProps: {
        strokes: [...layer.drawingProps.strokes, newStroke],
      },
    })
  },

  createNewDrawingLayer: (targetArtboardId?: string | null) => {
    // Clear current drawing layer ID so next stroke creates a new layer
    set({ currentDrawingLayerId: null })
  },

  convertStrokeToLayer: (stroke: DrawingStroke): LayerNode | null => {
    const strokeId = `drawing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Calculate bounding box of stroke
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity

    if (stroke.outline && stroke.outline.length > 0) {
      // Use outline points for bounds
      stroke.outline.forEach((point) => {
        if (point.length >= 2) {
          minX = Math.min(minX, point[0])
          minY = Math.min(minY, point[1])
          maxX = Math.max(maxX, point[0])
          maxY = Math.max(maxY, point[1])
        }
      })
    } else {
      // Use regular points for bounds
      for (let i = 0; i < stroke.points.length; i += 2) {
        const x = stroke.points[i]
        const y = stroke.points[i + 1]
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }

    // Add padding for stroke width
    const padding = stroke.strokeWidth / 2
    minX -= padding
    minY -= padding
    maxX += padding
    maxY += padding

    // Adjust stroke points to be relative to the layer position
    const adjustedPoints = []
    for (let i = 0; i < stroke.points.length; i += 2) {
      adjustedPoints.push(stroke.points[i] - minX)
      adjustedPoints.push(stroke.points[i + 1] - minY)
    }

    // Adjust outline if it exists
    let adjustedOutline = undefined
    if (stroke.outline && stroke.outline.length > 0) {
      adjustedOutline = stroke.outline.map((point) => [point[0] - minX, point[1] - minY])
    }

    // Create drawing layer node
    const layer: LayerNode = {
      id: strokeId,
      type: 'drawing',
      name: `${stroke.tool === 'eraser' ? 'Eraser' : 'Brush'} Stroke`,
      visible: true,
      locked: false,
      opacity: stroke.opacity,
      x: minX,
      y: minY,
      drawingProps: {
        strokes: [
          {
            points: adjustedPoints,
            outline: adjustedOutline,
            color: stroke.color,
            strokeWidth: stroke.strokeWidth,
            opacity: stroke.opacity,
          },
        ],
      },
      createdAt: stroke.timestamp,
      updatedAt: stroke.timestamp,
    }

    return layer
  },

  finalizeDrawingLayer: () => {
    const state = get()
    const { drawingStrokes, useLayerSystem } = state

    if (!useLayerSystem || drawingStrokes.length === 0) return

    // Combine all current strokes into a single drawing layer
    const allStrokes = drawingStrokes.map((stroke) => ({
      points: stroke.points,
      color: stroke.color,
      strokeWidth: stroke.strokeWidth,
      opacity: stroke.opacity,
    }))

    if (state.activeArtboardId && state.addLayer) {
      const drawingLayer: Partial<LayerNode> = {
        type: 'drawing',
        name: 'Drawing Layer',
        drawingProps: {
          strokes: allStrokes,
        },
      }

      state.addLayer(drawingLayer, state.activeArtboardId)
      set({ drawingStrokes: [] })
    }
  },
})
