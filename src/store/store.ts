import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { enableMapSet } from 'immer'

// Enable Immer MapSet plugin for Map/Set support
enableMapSet()

// Import all slices and setStoreRef from index
import {
  createGenerationSlice,
  createModelSlice,
  createApiSlice,
  createCanvasSlice,
  createGenerationActionsSlice,
  createDrawingSlice,
  createAuthSlice,
  createSelectionSlice,
  createAlignmentSlice,
  createGroupingSlice,
  setStoreRef,
  type GenerationSlice,
  type ModelSlice,
  type ApiSlice,
  type CanvasSlice,
  type GenerationActionsSlice,
  type DrawingSlice,
  type AuthSlice,
  type SelectionSlice,
  type AlignmentSlice,
  type GroupingSlice,
} from './slices'

// Re-export types for convenience
export type { ImageData, ImageRole, CanvasSelectionMode, ApiSettings, InpaintParams } from './types'

// Combined app state type
export type AppState = GenerationSlice &
  ModelSlice &
  ApiSlice &
  CanvasSlice &
  GenerationActionsSlice &
  DrawingSlice &
  AuthSlice &
  SelectionSlice &
  AlignmentSlice &
  GroupingSlice

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
      ...createAuthSlice(...a),
      ...createSelectionSlice(...a),
      ...createAlignmentSlice(...a),
      ...createGroupingSlice(...a),
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
        canvasViewport: state.canvasViewport, // Persist canvas zoom/pan
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
