import type { SliceCreator } from '../types'

export interface GenerationSlice {
  // Generation parameters
  prompt: string
  negativePrompt: string
  seed: number
  steps: number
  cfgScale: number
  width: number
  height: number

  // Actions
  setPrompt: (prompt: string) => void
  setNegativePrompt: (negativePrompt: string) => void
  setSeed: (seed: number) => void
  setSteps: (steps: number) => void
  setCfgScale: (cfgScale: number) => void
  setWidth: (width: number) => void
  setHeight: (height: number) => void
}

export const createGenerationSlice: SliceCreator<GenerationSlice> = (set) => ({
  // Initial state
  prompt: '',
  negativePrompt: '',
  seed: -1,
  steps: 20,
  cfgScale: 7.5,
  width: 512,
  height: 512,

  // Actions
  setPrompt: (prompt) => set({ prompt }),
  setNegativePrompt: (negativePrompt) => set({ negativePrompt }),
  setSeed: (seed) => set({ seed }),
  setSteps: (steps) => set({ steps }),
  setCfgScale: (cfgScale) => set({ cfgScale }),
  setWidth: (width) => set({ width }),
  setHeight: (height) => set({ height }),
})
