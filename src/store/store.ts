import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// Import all slices and setStoreRef from index
import {
  createGenerationSlice,
  createModelSlice,
  createApiSlice,
  createCanvasSlice,
  createGenerationActionsSlice,
  createDrawingSlice,
  setStoreRef,
  type GenerationSlice,
  type ModelSlice,
  type ApiSlice,
  type CanvasSlice,
  type GenerationActionsSlice,
  type DrawingSlice,
} from './slices'

// Re-export types for convenience
export type { ImageData, ImageRole, CanvasSelectionMode, ApiSettings, InpaintParams } from './types'

// Combined app state type
export type AppState = 
  GenerationSlice &
  ModelSlice &
  ApiSlice &
  CanvasSlice &
  GenerationActionsSlice &
  DrawingSlice

// Create the store by combining all slices
export const useStore = create<AppState>()(
  persist(
    (...a) => ({
      ...createGenerationSlice(...a),
      ...createModelSlice(...a),
      ...createApiSlice(...a),
      ...createCanvasSlice(...a),
      ...createGenerationActionsSlice(...a),
      ...createDrawingSlice(...a),
    }),
    {
      name: 'sdnextnewui-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist these specific fields
        prompt: state.prompt,
        negativePrompt: state.negativePrompt,
        sampler: state.sampler,
        sdModel: state.sdModel, // Persist selected model
        seed: state.seed,
        steps: state.steps,
        cfgScale: state.cfgScale,
        width: state.width,
        height: state.height,
        apiSettings: state.apiSettings,
        // Explicitly exclude:
        // isLoading: state.isLoading, // DO NOT PERSIST
        // images: state.images, // DO NOT PERSIST - too large for localStorage
        // samplers, sdModels arrays - fetched on load
      }),
    }
  )
)

// Set the store reference in canvasSlice to handle circular dependency
setStoreRef(useStore)
