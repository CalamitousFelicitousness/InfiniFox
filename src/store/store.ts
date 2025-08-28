import { create } from 'zustand'

import { sdnextApi } from '../api/sdnextApi'
import type { Sampler, SdModel } from '../types/sdnext'

interface AppState {
  prompt: string
  negativePrompt: string
  sampler: string
  samplers: Sampler[]
  sdModel: string
  sdModels: SdModel[]
  seed: number
  steps: number
  cfgScale: number
  width: number
  height: number
  isLoading: boolean
  images: any[]

  setPrompt: (prompt: string) => void
  setNegativePrompt: (negativePrompt: string) => void
  setSdModel: (model: string) => Promise<void>
  setSampler: (sampler: string) => void
  setSeed: (seed: number) => void
  setSteps: (steps: number) => void
  setCfgScale: (cfgScale: number) => void
  setWidth: (width: number) => void
  setHeight: (height: number) => void

  fetchSdModels: () => Promise<void>
  fetchSamplers: () => Promise<void>
  generateTxt2Img: () => Promise<void>
}

export const useStore = create<AppState>((set, get) => ({
  prompt: '',
  negativePrompt: '',
  sampler: 'DPM++ 2M Karras',
  samplers: [],
  sdModel: '',
  sdModels: [],
  seed: -1,
  steps: 20,
  cfgScale: 7.5,
  width: 512,
  height: 512,
  isLoading: false,
  images: [],

  setPrompt: (prompt) => set({ prompt }),
  setNegativePrompt: (negativePrompt) => set({ negativePrompt }),
  setSdModel: async (model) => {
    try {
      await sdnextApi.setOptions({ sd_model_checkpoint: model })
      set({ sdModel: model })
    } catch (error) {
      console.error('Failed to set model:', error)
      alert('Failed to set model. See console for details.')
    }
  },
  setSampler: (sampler) => set({ sampler }),
  setSeed: (seed) => set({ seed }),
  setSteps: (steps) => set({ steps }),
  setCfgScale: (cfgScale) => set({ cfgScale }),
  setWidth: (width) => set({ width }),
  setHeight: (height) => set({ height }),

  fetchSdModels: async () => {
    try {
      const models = await sdnextApi.getSdModels()
      set({ sdModels: models })
      if (models.length > 0 && !get().sdModel) {
        set({ sdModel: models[0].title })
      }
    } catch (error) {
      console.error('Failed to fetch models:', error)
    }
  },

  fetchSamplers: async () => {
    try {
      const samplers = await sdnextApi.getSamplers()
      set({ samplers })
    } catch (error) {
      console.error('Failed to fetch samplers:', error)
    }
  },

  generateTxt2Img: async () => {
    const { prompt, negativePrompt, sampler, seed, steps, cfgScale, width, height } = get()

    if (!prompt) {
      alert('Please enter a prompt.')
      return
    }
    set({ isLoading: true })
    try {
      const response = await sdnextApi.txt2img({
        prompt,
        negative_prompt: negativePrompt,
        sampler_name: sampler,
        seed,
        steps,
        cfg_scale: cfgScale,
        width,
        height,
      })

      const newImage = {
        src: `data:image/png;base64,${response.images[0]}`,
        x: Math.random() * (window.innerWidth - 200),
        y: Math.random() * (window.innerHeight - 200),
        id: `img-${Date.now()}`,
      }
      set((state) => ({ images: [...state.images, newImage] }))
    } catch (error) {
      console.error('Failed to generate image:', error)
    } finally {
      set({ isLoading: false })
    }
  },
}))
