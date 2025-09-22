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

  // Img2Img parameters
  denoisingStrength: number

  // Inpaint parameters
  maskBlur: number
  inpaintingFill: 'fill' | 'original' | 'latent_noise' | 'latent_nothing'
  inpaintFullRes: boolean
  inpaintFullResPadding: number

  // Actions
  setPrompt: (prompt: string) => void
  setNegativePrompt: (negativePrompt: string) => void
  setSeed: (seed: number) => void
  setSteps: (steps: number) => void
  setCfgScale: (cfgScale: number) => void
  setWidth: (width: number) => void
  setHeight: (height: number) => void
  setDenoisingStrength: (strength: number) => void
  setMaskBlur: (blur: number) => void
  setInpaintingFill: (fill: 'fill' | 'original' | 'latent_noise' | 'latent_nothing') => void
  setInpaintFullRes: (fullRes: boolean) => void
  setInpaintFullResPadding: (padding: number) => void
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

  // Img2Img parameters
  denoisingStrength: 0.75,

  // Inpaint parameters
  maskBlur: 4,
  inpaintingFill: 'original',
  inpaintFullRes: true,
  inpaintFullResPadding: 32,

  // Actions
  setPrompt: (prompt) => set({ prompt }),
  setNegativePrompt: (negativePrompt) => set({ negativePrompt }),
  setSeed: (seed) => set({ seed }),
  setSteps: (steps) => set({ steps }),
  setCfgScale: (cfgScale) => set({ cfgScale }),
  setWidth: (width) => set({ width }),
  setHeight: (height) => set({ height }),
  setDenoisingStrength: (denoisingStrength) => set({ denoisingStrength }),
  setMaskBlur: (maskBlur) => set({ maskBlur }),
  setInpaintingFill: (inpaintingFill) => set({ inpaintingFill }),
  setInpaintFullRes: (inpaintFullRes) => set({ inpaintFullRes }),
  setInpaintFullResPadding: (inpaintFullResPadding) => set({ inpaintFullResPadding }),
})
