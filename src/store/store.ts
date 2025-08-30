import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

import { sdnextApi } from '../api/sdnextApi'
import type { Sampler, SdModel } from '../types/sdnext'

interface ImageData {
  id: string
  src: string
  x: number
  y: number
  width?: number
  height?: number
}

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
  images: ImageData[]

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
  generateImg2Img: (baseImage: string, denoisingStrength: number) => Promise<void>
  removeImage: (id: string) => void
  duplicateImage: (id: string) => void
  updateImagePosition: (id: string, x: number, y: number) => void
  setImageAsInput: (src: string) => void
  clearCanvas: () => void
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // State
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

      // Actions
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

      generateImg2Img: async (baseImage: string, denoisingStrength: number) => {
        const { prompt, negativePrompt, sampler, seed, steps, cfgScale, width, height } = get()

        if (!prompt) {
          alert('Please enter a prompt.')
          return
        }

        if (!baseImage) {
          alert('Please upload an image.')
          return
        }

        set({ isLoading: true })
        try {
          const response = await sdnextApi.img2img({
            init_images: [baseImage],
            prompt,
            negative_prompt: negativePrompt,
            sampler_name: sampler,
            seed,
            steps,
            cfg_scale: cfgScale,
            width,
            height,
            denoising_strength: denoisingStrength,
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
          alert('Failed to generate image. Check console for details.')
        } finally {
          set({ isLoading: false })
        }
      },

      removeImage: (id: string) => {
        set((state) => ({
          images: state.images.filter((img) => img.id !== id),
        }))
      },

      duplicateImage: (id: string) => {
        const { images } = get()
        const originalImage = images.find((img) => img.id === id)
        if (originalImage) {
          const newImage = {
            ...originalImage,
            id: `img-${Date.now()}`,
            x: originalImage.x + 50,
            y: originalImage.y + 50,
          }
          set((state) => ({
            images: [...state.images, newImage],
          }))
        }
      },

      updateImagePosition: (id: string, x: number, y: number) => {
        set((state) => ({
          images: state.images.map((img) => (img.id === id ? { ...img, x, y } : img)),
        }))
      },

      setImageAsInput: (src: string) => {
        // This will be used to send image to img2img panel
        // You might want to add a mechanism to switch tabs or notify the img2img panel
        console.log('Setting image as input for img2img:', src)
      },

      clearCanvas: () => {
        set({ images: [] })
      },
      // ^ keep the trailing comma; we're still inside the object
    }),
    {
      name: 'sdnextnewui-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
