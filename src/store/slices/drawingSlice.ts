import type { StateCreator } from 'zustand'

import type { LayerNode } from './layerSystemSlice'

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
  endDrawingStroke: () => void
  clearDrawingStrokes: () => void
  removeDrawingStroke: (strokeId: string) => void

  // Layer management
  setDrawingLayerVisible: (visible: boolean) => void
  setDrawingLayerOpacity: (opacity: number) => void
  setUseLayerSystem: (use: boolean) => void
  setCurrentDrawingLayerId: (layerId: string | null) => void

  // Export/Import
  exportDrawing: () => string // Export as data URL
  importDrawing: (dataUrl: string) => void

  // Layer system integration
  convertStrokeToLayer: (stroke: DrawingStroke) => LayerNode | null
  finalizeDrawingLayer: () => void
}

export type DrawingSlice = DrawingState & DrawingActions

export const createDrawingSlice: StateCreator<DrawingSlice, [], [], DrawingSlice> = (set, get) => ({
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

  endDrawingStroke: () => {
    const state = get() as DrawingSlice & {
      activeArtboardId?: string
      addLayer?: (layer: LayerNode, parentId?: string) => string
    }
    const { currentStroke, drawingStrokes, useLayerSystem } = state
    if (!currentStroke) return

    // If layer system is enabled and we have access to layer functions
    if (useLayerSystem && state.activeArtboardId && state.addLayer) {
      // Convert stroke to layer and add to active artboard
      const strokeLayer = get().convertStrokeToLayer(currentStroke)
      if (strokeLayer) {
        state.addLayer(strokeLayer, state.activeArtboardId)
      }
      // Don't accumulate strokes in flat system when using layers
      set({
        currentStroke: null,
        isDrawingActive: false,
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
            points: stroke.points,
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
    const state = get() as DrawingSlice & {
      activeArtboardId?: string
      addLayer?: (layer: Partial<LayerNode>, parentId?: string) => string
    }
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
