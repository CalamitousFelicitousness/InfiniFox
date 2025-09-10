import { sdnextApi } from '../../api/sdnextApi'
import { progressService } from '../../services/progress/ProgressService'
import { imageStorage } from '../../services/storage'
import { useQueueStore } from '../queueStore'
import type { InpaintParams, SliceCreator } from '../types'

export interface GenerationActionsSlice {
  // Actions
  generateTxt2Img: (frameId?: string) => Promise<void>
  generateInFrame: (frameId: string) => Promise<void>
  generateImg2Img: (baseImage: string, denoisingStrength: number, frameId?: string) => Promise<void>
  generateInpaint: (params: InpaintParams, frameId?: string) => Promise<void>
  loadImagesFromStorage: () => Promise<void>
  updateStorageStats: () => Promise<void>
}

export const createGenerationActionsSlice: SliceCreator<GenerationActionsSlice> = (set, get) => ({
  generateTxt2Img: async (frameId?: string) => {
    const {
      prompt,
      negativePrompt,
      sampler,
      seed,
      steps,
      cfgScale,
      width,
      height,
      generationFrames,
      addGenerationFrame,
      updateGenerationFrame,
      removeGenerationFrame,
      setActiveGenerationFrameId,
    } = get()

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

    // Create a frame if one wasn't provided
    let actualFrameId = frameId
    if (!actualFrameId) {
      const x = Math.random() * (window.innerWidth - 400)
      const y = Math.random() * (window.innerHeight - 200)
      actualFrameId = addGenerationFrame(x, y, width, height, false)
    }
    updateGenerationFrame(actualFrameId, { isGenerating: true })
    setActiveGenerationFrameId(actualFrameId)

    try {
      // Start progress monitoring before making the request
      progressService.startPolling()

      const response = await sdnextApi.txt2img(params)
      console.log('Generation response received:', response)

      // Create unique ID for the image
      const imageId = `img-${Date.now()}`

      // Convert base64 to blob and create object URL
      const storedImage = await imageStorage.createFromBase64(imageId, response.images[0], {
        type: 'generated',
        prompt,
        negativePrompt,
        seed,
        steps,
        cfgScale,
        width,
        height,
        sampler,
        usedIn: new Set(),
      })

      // Use the frame position
      const frame = generationFrames.find((f) => f.id === actualFrameId)
      const frameX = frame ? frame.x : Math.random() * (window.innerWidth - 400)
      const frameY = frame ? frame.y : Math.random() * (window.innerHeight - 200)

      // Add image to canvas with object URL instead of base64
      const newImage = {
        id: imageId,
        src: storedImage.objectUrl, // Use object URL instead of base64
        x: frameX,
        y: frameY,
        width,
        height,
        metadata: storedImage.metadata,
        blobId: imageId, // Reference to stored blob
        isTemporary: false,
      }

      get().addImage(newImage)

      // Remove the generation frame
      removeGenerationFrame(actualFrameId)
      setActiveGenerationFrameId(null)

      // Update storage stats
      await get().updateStorageStats()

      // Force complete the progress indicator since we have the image
      progressService.stopPolling(true)
    } catch (error) {
      console.error('Failed to generate image:', error)
      alert('Failed to generate image. Check console for details.')

      // Mark frame as error
      updateGenerationFrame(actualFrameId, {
        isGenerating: false,
        error: error.message || 'Generation failed',
      })
      // Remove frame after delay
      setTimeout(() => {
        removeGenerationFrame(actualFrameId)
        setActiveGenerationFrameId(null)
      }, 3000)

      // Don't force complete on error
      progressService.stopPolling(false)
    } finally {
      set({ isLoading: false })
      console.log('Generation finished, loading state cleared')
    }
  },

  generateInFrame: async (frameId: string) => {
    const {
      prompt,
      negativePrompt,
      sampler,
      seed,
      steps,
      cfgScale,
      generationFrames,
      convertPlaceholderToActive,
      removeGenerationFrame,
      updateGenerationFrame,
      setActiveGenerationFrameId,
    } = get()

    const frame = generationFrames.find((f) => f.id === frameId)
    if (!frame) {
      console.error('Frame not found:', frameId)
      return
    }

    if (!prompt) {
      alert('Please enter a prompt.')
      return
    }

    // Convert placeholder to active
    convertPlaceholderToActive?.(frameId)
    setActiveGenerationFrameId(frameId)

    set({ isLoading: true })

    const params = {
      prompt,
      negative_prompt: negativePrompt,
      sampler_name: sampler,
      seed,
      steps,
      cfg_scale: cfgScale,
      width: frame.width,
      height: frame.height,
    }

    // Check if batch mode is enabled
    const { batchSettings } = useQueueStore.getState()
    if (batchSettings.enabled) {
      useQueueStore.getState().addBatch(params, 'txt2img')
      set({ isLoading: false })
      return
    }

    try {
      progressService.startPolling()
      const response = await sdnextApi.txt2img(params)

      const imageId = `img-${Date.now()}`
      const storedImage = await imageStorage.createFromBase64(imageId, response.images[0], {
        type: 'generated',
        prompt,
        negativePrompt,
        seed,
        steps,
        cfgScale,
        width: frame.width,
        height: frame.height,
        sampler,
        usedIn: new Set(),
      })

      const newImage = {
        id: imageId,
        src: storedImage.objectUrl,
        x: frame.x,
        y: frame.y,
        width: frame.width,
        height: frame.height,
        metadata: storedImage.metadata,
        blobId: imageId,
        isTemporary: false,
      }

      get().addImage(newImage)

      // Remove frame after successful generation
      removeGenerationFrame?.(frameId)
      setActiveGenerationFrameId(null)

      await get().updateStorageStats()
      progressService.stopPolling(true)
    } catch (error) {
      console.error('Failed to generate image:', error)
      alert('Failed to generate image. Check console for details.')

      // Mark frame as error
      updateGenerationFrame?.(frameId, {
        isGenerating: false,
        error: error.message || 'Generation failed',
      })

      progressService.stopPolling(false)
    } finally {
      set({ isLoading: false })
    }
  },

  generateImg2Img: async (baseImage: string, denoisingStrength: number, frameId?: string) => {
    const {
      prompt,
      negativePrompt,
      sampler,
      seed,
      steps,
      cfgScale,
      width,
      height,
      generationFrames,
      removeGenerationFrame,
      updateGenerationFrame,
      setActiveGenerationFrameId,
    } = get()

    if (!prompt) {
      alert('Please enter a prompt.')
      return
    }

    if (!baseImage) {
      alert('Please upload an image.')
      return
    }

    set({ isLoading: true })

    // Determine dimensions based on frame or default
    const frame = frameId ? generationFrames.find((f) => f.id === frameId) : null
    const finalWidth = frame ? frame.width : width
    const finalHeight = frame ? frame.height : height

    const params = {
      init_images: [baseImage],
      prompt,
      negative_prompt: negativePrompt,
      sampler_name: sampler,
      seed,
      steps,
      cfg_scale: cfgScale,
      width: finalWidth,
      height: finalHeight,
      denoising_strength: denoisingStrength,
    }

    // Check if batch mode is enabled
    const { batchSettings } = useQueueStore.getState()
    if (batchSettings.enabled) {
      useQueueStore.getState().addBatch(params, 'img2img')
      set({ isLoading: false })
      return
    }

    if (frameId) {
      setActiveGenerationFrameId(frameId)
    }

    try {
      // Start progress monitoring
      progressService.startPolling()

      const response = await sdnextApi.img2img(params)

      // Create unique ID for the image
      const imageId = `img-${Date.now()}`

      // Convert base64 to blob and create object URL
      const storedImage = await imageStorage.createFromBase64(imageId, response.images[0], {
        type: 'generated',
        prompt,
        negativePrompt,
        seed,
        steps,
        cfgScale,
        width: finalWidth,
        height: finalHeight,
        sampler,
        denoisingStrength,
        usedIn: new Set(),
      })

      // Determine position based on frame or active generation frame
      let x: number, y: number
      if (frame) {
        x = frame.x
        y = frame.y
      } else {
        const activeFrame = generationFrames.find((f) => f.isGenerating)
        x = activeFrame ? activeFrame.x : Math.random() * (window.innerWidth - 200)
        y = activeFrame ? activeFrame.y : Math.random() * (window.innerHeight - 200)
      }

      // Add image to canvas with object URL
      const newImage = {
        id: imageId,
        src: storedImage.objectUrl,
        x,
        y,
        width: finalWidth,
        height: finalHeight,
        metadata: storedImage.metadata,
        blobId: imageId,
        isTemporary: false,
      }

      get().addImage(newImage)

      // Mark frame as complete before removing
      if (frameId) {
        updateGenerationFrame?.(frameId, {
          isGenerating: false,
          progress: 100,
        })
        // Remove frame after short delay to show completion
        setTimeout(() => {
          removeGenerationFrame?.(frameId)
          setActiveGenerationFrameId(null)
        }, 500)
      }

      // Update storage stats
      await get().updateStorageStats()

      // Force complete the progress indicator since we have the image
      progressService.stopPolling(true)
      set({ isLoading: false })
    } catch (error) {
      console.error('Failed to generate image:', error)
      alert('Failed to generate image. Check console for details.')

      // Mark frame as error if it exists
      if (frameId) {
        updateGenerationFrame?.(frameId, {
          isGenerating: false,
          error: error.message || 'Generation failed',
        })
      }

      // Don't force complete on error
      progressService.stopPolling(false)
      set({ isLoading: false })
    }
  },

  generateInpaint: async (params: InpaintParams, frameId?: string) => {
    const {
      prompt,
      negativePrompt,
      sampler,
      seed,
      steps,
      cfgScale,
      width,
      height,
      generationFrames,
      removeGenerationFrame,
      updateGenerationFrame,
      setActiveGenerationFrameId,
    } = get()

    if (!prompt) {
      alert('Please enter a prompt.')
      return
    }

    set({ isLoading: true })

    // Determine dimensions based on frame or default
    const frame = frameId ? generationFrames.find((f) => f.id === frameId) : null
    const finalWidth = frame ? frame.width : width
    const finalHeight = frame ? frame.height : height

    const apiParams = {
      init_images: [params.baseImage],
      mask: params.maskImage,
      prompt,
      negative_prompt: negativePrompt,
      sampler_name: sampler,
      seed,
      steps,
      cfg_scale: cfgScale,
      width: finalWidth,
      height: finalHeight,
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

    if (frameId) {
      setActiveGenerationFrameId(frameId)
    }

    try {
      // Start progress monitoring
      progressService.startPolling()

      const response = await sdnextApi.img2img(apiParams)

      // Create unique ID for the image
      const imageId = `img-${Date.now()}`

      // Convert base64 to blob and create object URL
      const storedImage = await imageStorage.createFromBase64(imageId, response.images[0], {
        type: 'generated',
        prompt,
        negativePrompt,
        seed,
        steps,
        cfgScale,
        width: finalWidth,
        height: finalHeight,
        sampler,
        denoisingStrength: params.denoisingStrength,
        usedIn: new Set(),
      })

      // Determine position based on frame or active generation frame
      let x: number, y: number
      if (frame) {
        x = frame.x
        y = frame.y
      } else {
        const activeFrame = generationFrames.find((f) => f.isGenerating)
        x = activeFrame ? activeFrame.x : Math.random() * (window.innerWidth - 200)
        y = activeFrame ? activeFrame.y : Math.random() * (window.innerHeight - 200)
      }

      // Add image to canvas with object URL
      const newImage = {
        id: imageId,
        src: storedImage.objectUrl,
        x,
        y,
        width: finalWidth,
        height: finalHeight,
        metadata: storedImage.metadata,
        blobId: imageId,
        isTemporary: false,
      }

      get().addImage(newImage)

      // Mark frame as complete before removing
      if (frameId) {
        updateGenerationFrame?.(frameId, {
          isGenerating: false,
          progress: 100,
        })
        // Remove frame after short delay to show completion
        setTimeout(() => {
          removeGenerationFrame?.(frameId)
          setActiveGenerationFrameId(null)
        }, 500)
      }

      // Update storage stats
      await get().updateStorageStats()

      // Force complete the progress indicator since we have the image
      progressService.stopPolling(true)
      set({ isLoading: false })
    } catch (error) {
      console.error('Failed to generate inpaint:', error)
      alert('Failed to generate inpaint. Check console for details.')

      // Mark frame as error if it exists
      if (frameId) {
        updateGenerationFrame?.(frameId, {
          isGenerating: false,
          error: error.message || 'Generation failed',
        })
      }

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

      const images = storedImages.map((stored) => ({
        id: stored.id,
        src: stored.objectUrl,
        // Use saved position if available, otherwise use random position
        x: stored.position?.x ?? Math.random() * (window.innerWidth - 400),
        y: stored.position?.y ?? Math.random() * (window.innerHeight - 200),
        width: stored.metadata.width,
        height: stored.metadata.height,
        metadata: stored.metadata,
        blobId: stored.id,
        isTemporary: false,
      }))

      set({ images })
      console.log(`Loaded ${images.length} images from storage with positions`)

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
  },
})
