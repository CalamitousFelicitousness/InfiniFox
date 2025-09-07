import type { StateCreator } from 'zustand'

import type { DrawingStrokeOptions } from '../../services/drawing/PerfectFreehandService'

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

  // Export/Import
  exportDrawing: () => string // Export as data URL
  importDrawing: (dataUrl: string) => void
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
    const { currentStroke, drawingStrokes } = get()
    if (!currentStroke) return

    set({
      drawingStrokes: [...drawingStrokes, currentStroke],
      currentStroke: null,
      isDrawingActive: false,
    })
  },

  clearDrawingStrokes: () => set({ drawingStrokes: [], currentStroke: null }),

  removeDrawingStroke: (strokeId) => {
    set((state) => ({
      drawingStrokes: state.drawingStrokes.filter((s) => s.id !== strokeId),
    }))
  },

  setDrawingLayerVisible: (visible) => set({ drawingLayerVisible: visible }),
  setDrawingLayerOpacity: (opacity) => set({ drawingLayerOpacity: opacity }),

  exportDrawing: () => {
    // This will be implemented to export the drawing layer as a data URL
    // For now, return empty string
    console.warn('Export drawing not yet implemented')
    return ''
  },

  importDrawing: (dataUrl) => {
    // This will be implemented to import a drawing from a data URL
    console.warn('Import drawing not yet implemented')
  },
})
