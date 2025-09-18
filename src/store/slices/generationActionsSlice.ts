import { sdnextApi } from '../../api/sdnextApi'
import { progressService } from '../../services/progress/ProgressService'
import { imageStorage } from '../../services/storage/UnifiedImageStorageService'
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

      // Convert base64 to blob
      const base64 = response.images[0]
      const binaryString = atob(base64.startsWith('data:') ? base64.split(',')[1] : base64)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: 'image/png' })

      // Store the blob
      const storedImage = await imageStorage.createFromBlob(imageId, blob, {
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

      // Get object URL for display
      const objectUrl = await imageStorage.getOrCreateObjectUrl(imageId)

      // Use the frame position
      const frame = generationFrames.find((f) => f.id === actualFrameId)
      const frameX = frame ? frame.x : Math.random() * (window.innerWidth - 400)
      const frameY = frame ? frame.y : Math.random() * (window.innerHeight - 200)

      // Check if layer system is enabled (look for addLayer function)
      const hasLayerSystem = typeof get().addLayer === 'function'

      if (hasLayerSystem) {
        // Add as layer for layer system
        get().addLayer(
          {
            type: 'image',
            name: prompt ? `Generated: ${prompt.slice(0, 30)}...` : 'Generated Image',
            x: frameX,
            y: frameY,
            imageProps: {
              imageId, // Reference to unified storage
              width,
              height,
              naturalWidth: width,
              naturalHeight: height,
            },
          },
          undefined // No parent - add as root layer
        )
      } else {
        // Add to flat images array for old system
        const newImage = {
          id: imageId,
          src: objectUrl, // Use object URL instead of base64
          x: frameX,
          y: frameY,
          width,
          height,
          metadata: storedImage.metadata,
          blobId: imageId, // Reference to stored blob
          isTemporary: false,
        }

        get().addImage(newImage)
      }

      // Remove the generation frame
      removeGenerationFrame(actualFrameId)
      setActiveGenerationFrameId(null)

      // Update storage stats
      await get().updateStorageStats()

      // Force complete the progress indicator since we have the image
      progressService.stopPolling(true)
    } catch (error) {
      console.error('Failed to generate image:', error)

      // Extract detailed error message
      const errorMessage = error instanceof Error ? error.message : 'Generation failed'
      const userMessage = errorMessage.replace('API request failed: ', '')

      alert(`Failed to generate image: ${userMessage}`)

      // Mark frame as error
      updateGenerationFrame(actualFrameId, {
        isGenerating: false,
        error: userMessage,
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
      // Convert base64 to blob
      const base64 = response.images[0]
      const binaryString = atob(base64.startsWith('data:') ? base64.split(',')[1] : base64)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: 'image/png' })

      const storedImage = await imageStorage.createFromBlob(imageId, blob, {
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

      const objectUrl = await imageStorage.getOrCreateObjectUrl(imageId)

      // Check if layer system is enabled
      const hasLayerSystem = typeof get().addLayer === 'function'

      if (hasLayerSystem) {
        // Add as layer for layer system
        get().addLayer(
          {
            type: 'image',
            name: prompt ? `Generated: ${prompt.slice(0, 30)}...` : 'Generated Image',
            x: frame.x,
            y: frame.y,
            imageProps: {
              imageId,
              width: frame.width,
              height: frame.height,
              naturalWidth: frame.width,
              naturalHeight: frame.height,
            },
          },
          undefined
        )
      } else {
        // Add to flat images array for old system
        const newImage = {
          id: imageId,
          src: objectUrl,
          x: frame.x,
          y: frame.y,
          width: frame.width,
          height: frame.height,
          metadata: storedImage.metadata,
          blobId: imageId,
          isTemporary: false,
        }

        get().addImage(newImage)
      }

      // Remove frame after successful generation
      removeGenerationFrame?.(frameId)
      setActiveGenerationFrameId(null)

      await get().updateStorageStats()
      progressService.stopPolling(true)
    } catch (error) {
      console.error('Failed to generate image:', error)

      // Extract detailed error message
      const errorMessage = error instanceof Error ? error.message : 'Generation failed'
      const userMessage = errorMessage.replace('API request failed: ', '')

      alert(`Failed to generate image: ${userMessage}`)

      // Mark frame as error
      updateGenerationFrame?.(frameId, {
        isGenerating: false,
        error: userMessage,
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

      // Convert base64 to blob
      const base64 = response.images[0]
      const binaryString = atob(base64.startsWith('data:') ? base64.split(',')[1] : base64)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: 'image/png' })

      const storedImage = await imageStorage.createFromBlob(imageId, blob, {
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

      const objectUrl = await imageStorage.getOrCreateObjectUrl(imageId)

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

      // Check if layer system is enabled
      const hasLayerSystem = typeof get().addLayer === 'function'

      if (hasLayerSystem) {
        get().addLayer(
          {
            type: 'image',
            name: prompt ? `Img2Img: ${prompt.slice(0, 25)}...` : 'Img2Img Result',
            x,
            y,
            imageProps: {
              imageId,
              width: finalWidth,
              height: finalHeight,
              naturalWidth: finalWidth,
              naturalHeight: finalHeight,
            },
          },
          undefined
        )
      } else {
        const newImage = {
          id: imageId,
          src: objectUrl,
          x,
          y,
          width: finalWidth,
          height: finalHeight,
          metadata: storedImage.metadata,
          blobId: imageId,
          isTemporary: false,
        }
        get().addImage(newImage)
      }

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

      // Extract detailed error message
      const errorMessage = error instanceof Error ? error.message : 'Generation failed'
      const userMessage = errorMessage.replace('API request failed: ', '')

      alert(`Failed to generate image: ${userMessage}`)

      // Mark frame as error if it exists
      if (frameId) {
        updateGenerationFrame?.(frameId, {
          isGenerating: false,
          error: userMessage,
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

      // Convert base64 to blob
      const base64 = response.images[0]
      const binaryString = atob(base64.startsWith('data:') ? base64.split(',')[1] : base64)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: 'image/png' })

      const storedImage = await imageStorage.createFromBlob(imageId, blob, {
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

      const objectUrl = await imageStorage.getOrCreateObjectUrl(imageId)

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

      // Check if layer system is enabled
      const hasLayerSystem = typeof get().addLayer === 'function'

      if (hasLayerSystem) {
        get().addLayer(
          {
            type: 'image',
            name: prompt ? `Inpaint: ${prompt.slice(0, 25)}...` : 'Inpaint Result',
            x,
            y,
            imageProps: {
              imageId,
              width: finalWidth,
              height: finalHeight,
              naturalWidth: finalWidth,
              naturalHeight: finalHeight,
            },
          },
          undefined
        )
      } else {
        const newImage = {
          id: imageId,
          src: objectUrl,
          x,
          y,
          width: finalWidth,
          height: finalHeight,
          metadata: storedImage.metadata,
          blobId: imageId,
          isTemporary: false,
        }
        get().addImage(newImage)
      }

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

      // Extract detailed error message
      const errorMessage = error instanceof Error ? error.message : 'Generation failed'
      const userMessage = errorMessage.replace('API request failed: ', '')

      alert(`Failed to generate inpaint: ${userMessage}`)

      // Mark frame as error if it exists
      if (frameId) {
        updateGenerationFrame?.(frameId, {
          isGenerating: false,
          error: userMessage,
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

      const images = await Promise.all(
        storedImages.map(async (stored) => {
          // Get object URL for each stored image
          const objectUrl = await imageStorage.getOrCreateObjectUrl(stored.id)
          if (!objectUrl) {
            console.warn(`Failed to create object URL for image ${stored.id}`)
            return null
          }

          return {
            id: stored.id,
            src: objectUrl,
            // Use saved position if available, otherwise use random position
            x: stored.position?.x ?? Math.random() * (window.innerWidth - 400),
            y: stored.position?.y ?? Math.random() * (window.innerHeight - 200),
            width: stored.metadata.width,
            height: stored.metadata.height,
            metadata: stored.metadata,
            blobId: stored.id,
            isTemporary: false,
          }
        })
      )

      // Filter out any null entries from failed URL creation
      const validImages = images.filter(Boolean)

      set({ images: validImages })
      console.log(`Loaded ${validImages.length} images from storage with positions`)

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
