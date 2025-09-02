import { sdnextApi } from '../../api/sdnextApi'
import { progressService } from '../../services/progress/ProgressService'
import { imageStorage } from '../../services/storage'
import { useQueueStore } from '../queueStore'
import type { InpaintParams, SliceCreator } from '../types'

export interface GenerationActionsSlice {
  // Actions
  generateTxt2Img: () => Promise<void>
  generateImg2Img: (baseImage: string, denoisingStrength: number) => Promise<void>
  generateInpaint: (params: InpaintParams) => Promise<void>
  loadImagesFromStorage: () => Promise<void>
  updateStorageStats: () => Promise<void>
}

export const createGenerationActionsSlice: SliceCreator<GenerationActionsSlice> = (set, get) => ({
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

      // Create unique ID for the image
      const imageId = `img-${Date.now()}`
      
      // Convert base64 to blob and create object URL
      const storedImage = await imageStorage.createFromBase64(
        imageId,
        response.images[0],
        {
          type: 'generated',
          prompt,
          negativePrompt,
          seed,
          steps,
          cfgScale,
          width,
          height,
          sampler,
          usedIn: new Set()
        }
      )

      // Add image to canvas with object URL instead of base64
      const newImage = {
        id: imageId,
        src: storedImage.objectUrl,  // Use object URL instead of base64
        x: Math.random() * (window.innerWidth - 200),
        y: Math.random() * (window.innerHeight - 200),
        width,
        height,
        metadata: storedImage.metadata,
        blobId: imageId,  // Reference to stored blob
        isTemporary: false
      }
      
      get().addImage(newImage)
      
      // Update storage stats
      await get().updateStorageStats()
      
      // Force complete the progress indicator since we have the image
      progressService.stopPolling(true)
    } catch (error) {
      console.error('Failed to generate image:', error)
      alert('Failed to generate image. Check console for details.')
      // Don't force complete on error
      progressService.stopPolling(false)
    } finally {
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
      
      // Create unique ID for the image
      const imageId = `img-${Date.now()}`
      
      // Convert base64 to blob and create object URL
      const storedImage = await imageStorage.createFromBase64(
        imageId,
        response.images[0],
        {
          type: 'generated',
          prompt,
          negativePrompt,
          seed,
          steps,
          cfgScale,
          width,
          height,
          sampler,
          denoisingStrength,
          usedIn: new Set()
        }
      )

      // Add image to canvas with object URL
      const newImage = {
        id: imageId,
        src: storedImage.objectUrl,
        x: Math.random() * (window.innerWidth - 200),
        y: Math.random() * (window.innerHeight - 200),
        width,
        height,
        metadata: storedImage.metadata,
        blobId: imageId,
        isTemporary: false
      }
      
      get().addImage(newImage)
      
      // Update storage stats
      await get().updateStorageStats()
      
      // Force complete the progress indicator since we have the image
      progressService.stopPolling(true)
      set({ isLoading: false })
    } catch (error) {
      console.error('Failed to generate image:', error)
      alert('Failed to generate image. Check console for details.')
      // Don't force complete on error
      progressService.stopPolling(false)
      set({ isLoading: false })
    }
  },

  generateInpaint: async (params: InpaintParams) => {
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
      
      // Create unique ID for the image
      const imageId = `img-${Date.now()}`
      
      // Convert base64 to blob and create object URL
      const storedImage = await imageStorage.createFromBase64(
        imageId,
        response.images[0],
        {
          type: 'generated',
          prompt,
          negativePrompt,
          seed,
          steps,
          cfgScale,
          width,
          height,
          sampler,
          denoisingStrength: params.denoisingStrength,
          usedIn: new Set()
        }
      )

      // Add image to canvas with object URL
      const newImage = {
        id: imageId,
        src: storedImage.objectUrl,
        x: Math.random() * (window.innerWidth - 200),
        y: Math.random() * (window.innerHeight - 200),
        width,
        height,
        metadata: storedImage.metadata,
        blobId: imageId,
        isTemporary: false
      }
      
      get().addImage(newImage)
      
      // Update storage stats
      await get().updateStorageStats()
      
      // Force complete the progress indicator since we have the image
      progressService.stopPolling(true)
      set({ isLoading: false })
    } catch (error) {
      console.error('Failed to generate inpaint:', error)
      alert('Failed to generate inpaint. Check console for details.')
      // Don't force complete on error
      progressService.stopPolling(false)
      set({ isLoading: false })
    }
  },
  
  /**
   * Load images from IndexedDB on app start
   */
  loadImagesFromStorage: async () => {
    try {
      console.log('Loading images from storage...')
      const storedImages = await imageStorage.loadAllFromIndexedDB()
      
      const images = storedImages.map(stored => ({
        id: stored.id,
        src: stored.objectUrl,
        x: Math.random() * (window.innerWidth - 400),
        y: Math.random() * (window.innerHeight - 200),
        width: stored.metadata.width,
        height: stored.metadata.height,
        metadata: stored.metadata,
        blobId: stored.id,
        isTemporary: false
      }))
      
      set({ images })
      console.log(`Loaded ${images.length} images from storage`)
      
      // Update storage stats
      await get().updateStorageStats()
    } catch (error) {
      console.error('Failed to load images from storage:', error)
    }
  },
  
  /**
   * Update storage statistics
   */
  updateStorageStats: async () => {
    try {
      const stats = await imageStorage.getStorageStats()
      set({ storageStats: stats })
    } catch (error) {
      console.error('Failed to update storage stats:', error)
    }
  }
})
