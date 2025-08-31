import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

import { sdnextApi } from '../api/sdnextApi'
import { progressService, type ProgressMethod } from '../services/progress/ProgressService'
import type { Sampler, SdModel } from '../types/sdnext'

import {
  AddImageCommand,
  RemoveImageCommand,
  MoveImageCommand,
  useHistoryStore,
} from './historyStore'
import { useQueueStore } from './queueStore'

interface ImageData {
  id: string
  src: string
  x: number
  y: number
  width?: number
  height?: number
}

interface ApiSettings {
  apiUrl: string
  wsUrl: string
  progressMethod: ProgressMethod
  apiType: 'sdnext' | 'a1111' | 'comfyui' | 'custom'
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
  apiSettings: ApiSettings

  setPrompt: (prompt: string) => void
  setNegativePrompt: (negativePrompt: string) => void
  setSdModel: (model: string) => Promise<void>
  setSampler: (sampler: string) => void
  setSeed: (seed: number) => void
  setSteps: (steps: number) => void
  setCfgScale: (cfgScale: number) => void
  setWidth: (width: number) => void
  setHeight: (height: number) => void
  setApiSettings: (settings: Partial<ApiSettings>) => void
  setIsLoading: (loading: boolean) => void
  testConnection: () => Promise<{ connected: boolean; progressMethod: string }>
  detectApiType: () => Promise<string>

  fetchSdModels: () => Promise<void>
  fetchSamplers: () => Promise<void>
  generateTxt2Img: () => Promise<void>
  generateImg2Img: (baseImage: string, denoisingStrength: number) => Promise<void>
  generateInpaint: (params: {
    baseImage: string
    maskImage: string
    denoisingStrength: number
    maskBlur: number
    inpaintingFill: string
    inpaintFullRes: boolean
    inpaintFullResPadding: number
  }) => Promise<void>
  removeImage: (id: string) => void
  duplicateImage: (id: string) => void
  updateImagePosition: (id: string, x: number, y: number) => void
  setImageAsInput: (src: string) => void
  clearCanvas: () => void
  addImage: (image: ImageData) => void
  addImageDirect: (image: ImageData) => void
  removeImageDirect: (id: string) => void
  updateImagePositionDirect: (id: string, x: number, y: number) => void
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
      apiSettings: {
        apiUrl: import.meta.env.VITE_SDNEXT_API_URL || 'http://127.0.0.1:7860/sdapi/v1',
        wsUrl: import.meta.env.VITE_SDNEXT_WS_URL || '127.0.0.1:7860',
        progressMethod: 'auto' as ProgressMethod,
        apiType: 'sdnext' as const,
      },

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
      setIsLoading: (isLoading) => set({ isLoading }),
      setApiSettings: async (settings) => {
        set((state) => ({
          apiSettings: { ...state.apiSettings, ...settings },
        }))

        // Update progress service if method changed
        if (settings.progressMethod !== undefined && settings.progressMethod !== null) {
          await progressService.setMethod(settings.progressMethod)
        }
      },

      testConnection: async () => {
        const { apiSettings } = get()
        try {
          // Test basic API connection
          const response = await fetch(`${apiSettings.apiUrl}/samplers`)
          if (!response.ok) {
            return { connected: false, progressMethod: 'none' }
          }

          // Test progress monitoring
          const method = apiSettings.progressMethod || 'auto'
          await progressService.setMethod(method)
          const progressMethod = progressService.getActiveMethod()

          return { connected: true, progressMethod }
        } catch (error) {
          console.error('Connection test failed:', error)
          return { connected: false, progressMethod: 'none' }
        }
      },

      detectApiType: async () => {
        const { apiSettings } = get()
        try {
          // SD.Next detection - check for specific endpoints
          try {
            // SD.Next has /sdapi/v1/platform endpoint
            const platformResponse = await fetch(`${apiSettings.apiUrl}/platform`)
            if (platformResponse.ok) {
              const data = await platformResponse.json()
              if (data.app === 'sd.next') {
                return 'sdnext'
              }
            }
          } catch {
            /* empty */
          }

          // Alternative SD.Next detection
          try {
            const response = await fetch(`${apiSettings.apiUrl}/../motd`)
            if (response.ok) {
              return 'sdnext'
            }
          } catch {
            /* empty */
          }

          // Check for ComfyUI
          try {
            const response = await fetch(
              `${apiSettings.apiUrl.replace('/sdapi/v1', '')}/system_stats`
            )
            if (response.ok) {
              return 'comfyui'
            }
          } catch {
            /* empty */
          }

          // Default to A1111 if standard endpoints work
          const response = await fetch(`${apiSettings.apiUrl}/sd-models`)
          if (response.ok) {
            return 'a1111'
          }

          return 'custom'
        } catch {
          return 'custom'
        }
      },

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

        const params = {
          prompt,
          negative_prompt: negativePrompt,
          sampler_name: sampler,
          seed,
          steps,
          cfg_scale: cfgScale,
          width,
          height,
        }

        // Check if batch mode is enabled
        const { batchSettings } = useQueueStore.getState()
        if (batchSettings.enabled) {
          useQueueStore.getState().addBatch(params, 'txt2img')
          set({ isLoading: false })
          return
        }

        try {
          // Start progress monitoring before making the request
          progressService.startPolling()

          const response = await sdnextApi.txt2img(params)
          console.log('Generation response received:', response)

          const newImage = {
            src: `data:image/png;base64,${response.images[0]}`,
            x: Math.random() * (window.innerWidth - 200),
            y: Math.random() * (window.innerHeight - 200),
            id: `img-${Date.now()}`,
          }
          get().addImage(newImage)
        } catch (error) {
          console.error('Failed to generate image:', error)
          alert('Failed to generate image. Check console for details.')
        } finally {
          progressService.stopPolling()
          set({ isLoading: false })
          console.log('Generation finished, loading state cleared')
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
        const params = {
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
        }

        // Check if batch mode is enabled
        const { batchSettings } = useQueueStore.getState()
        if (batchSettings.enabled) {
          useQueueStore.getState().addBatch(params, 'img2img')
          set({ isLoading: false })
          return
        }

        try {
          // Start progress monitoring
          progressService.startPolling()

          const response = await sdnextApi.img2img(params)
          const newImage = {
            src: `data:image/png;base64,${response.images[0]}`,
            x: Math.random() * (window.innerWidth - 200),
            y: Math.random() * (window.innerHeight - 200),
            id: `img-${Date.now()}`,
          }
          get().addImage(newImage)
          set({ isLoading: false })
        } catch (error) {
          console.error('Failed to generate image:', error)
          alert('Failed to generate image. Check console for details.')
          set({ isLoading: false })
        } finally {
          progressService.stopPolling()
          progressService.stopPolling()
        }
      },

      generateInpaint: async (params) => {
        const { prompt, negativePrompt, sampler, seed, steps, cfgScale, width, height } = get()

        if (!prompt) {
          alert('Please enter a prompt.')
          return
        }

        set({ isLoading: true })

        const apiParams = {
          init_images: [params.baseImage],
          mask: params.maskImage,
          prompt,
          negative_prompt: negativePrompt,
          sampler_name: sampler,
          seed,
          steps,
          cfg_scale: cfgScale,
          width,
          height,
          denoising_strength: params.denoisingStrength,
          mask_blur: params.maskBlur,
          inpainting_fill:
            params.inpaintingFill === 'fill'
              ? 0
              : params.inpaintingFill === 'original'
                ? 1
                : params.inpaintingFill === 'latent_noise'
                  ? 2
                  : 3,
          inpaint_full_res: params.inpaintFullRes,
          inpaint_full_res_padding: params.inpaintFullResPadding,
        }

        // Check if batch mode is enabled
        const { batchSettings } = useQueueStore.getState()
        if (batchSettings.enabled) {
          useQueueStore.getState().addBatch(apiParams, 'inpaint')
          set({ isLoading: false })
          return
        }

        try {
          // Start progress monitoring
          progressService.startPolling()

          const response = await sdnextApi.img2img(apiParams)
          const newImage = {
            src: `data:image/png;base64,${response.images[0]}`,
            x: Math.random() * (window.innerWidth - 200),
            y: Math.random() * (window.innerHeight - 200),
            id: `img-${Date.now()}`,
          }
          get().addImage(newImage)
          set({ isLoading: false })
        } catch (error) {
          console.error('Failed to generate inpaint:', error)
          alert('Failed to generate inpaint. Check console for details.')
          set({ isLoading: false })
        } finally {
          progressService.stopPolling()
        }
      },

      addImage: (image: ImageData) => {
        const command = new AddImageCommand(image, useStore)
        useHistoryStore.getState().executeCommand(command)
      },

      addImageDirect: (image: ImageData) => {
        set((state) => ({ images: [...state.images, image] }))
      },

      removeImage: (id: string) => {
        const image = get().images.find((img) => img.id === id)
        if (image) {
          const command = new RemoveImageCommand(image, useStore)
          useHistoryStore.getState().executeCommand(command)
        }
      },

      removeImageDirect: (id: string) => {
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
          get().addImage(newImage)
        }
      },

      updateImagePosition: (id: string, x: number, y: number) => {
        const image = get().images.find((img) => img.id === id)
        if (image) {
          const oldPos = { x: image.x, y: image.y }
          const command = new MoveImageCommand(id, oldPos, { x, y }, useStore)
          useHistoryStore.getState().executeCommand(command)
        }
      },

      updateImagePositionDirect: (id: string, x: number, y: number) => {
        // Use shallow equality check to prevent unnecessary re-renders
        const currentImage = get().images.find((img) => img.id === id)
        if (currentImage && (currentImage.x !== x || currentImage.y !== y)) {
          set((state) => ({
            images: state.images.map((img) => (img.id === id ? { ...img, x, y } : img)),
          }))
        }
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
      partialize: (state) => ({
        // Only persist these specific fields
        prompt: state.prompt,
        negativePrompt: state.negativePrompt,
        sampler: state.sampler,
        seed: state.seed,
        steps: state.steps,
        cfgScale: state.cfgScale,
        width: state.width,
        height: state.height,
        apiSettings: state.apiSettings,
        // Explicitly exclude isLoading
        // isLoading: state.isLoading, // DO NOT PERSIST
        // images: state.images, // DO NOT PERSIST - too large for localStorage
      }),
    }
  )
)
