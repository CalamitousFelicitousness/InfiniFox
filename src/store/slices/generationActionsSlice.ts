import { sdnextApi } from '../../api/sdnextApi'
import { LayerExportService } from '../../services/layers/LayerExportService'
import { progressService } from '../../services/progress/ProgressService'
import { imageStorage } from '../../services/storage/UnifiedImageStorageService'
import {
  validateGenerationParams,
  autoFixGenerationParams,
  formatValidationErrors,
} from '../../utils/validation/generationValidation'
import { useQueueStore } from '../queueStore'
import type { InpaintParams, SliceCreator } from '../types'

export interface GenerationActionsSlice {
  // Actions
  generateTxt2Img: (frameId?: string) => Promise<void>
  generateInFrame: (frameId: string) => Promise<void>
  generateImg2Img: (baseImage: string, denoisingStrength: number, frameId?: string) => Promise<void>
  generateInpaint: (params: InpaintParams, frameId?: string) => Promise<void>
  // Layer-aware generation methods
  generateFromLayer: (
    layerId: string,
    mode: 'txt2img' | 'img2img',
    denoisingStrength?: number
  ) => Promise<void>
  generateFromSelection: (
    layerIds: string[],
    mode: 'txt2img' | 'img2img',
    denoisingStrength?: number
  ) => Promise<void>
  inpaintFromLayer: (layerId: string, maskLayerId?: string) => Promise<void>
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
      addActiveGenerationFrameId,
      removeActiveGenerationFrameId,
      currentlyGeneratingFrameId,
      addToGenerationQueue,
      setCurrentlyGeneratingFrame,
      removeFromGenerationQueue,
    } = get()

    if (!prompt) {
      alert('Please enter a prompt.')
      return
    }

    // Validate generation parameters
    const validationErrors = validateGenerationParams({
      width,
      height,
      seed,
      steps,
      cfgScale,
    })

    let finalWidth = width
    let finalHeight = height
    let finalSeed = seed
    let finalSteps = steps
    let finalCfgScale = cfgScale

    if (validationErrors.length > 0) {
      // Auto-fix validation errors
      const fixed = autoFixGenerationParams(
        { width, height, seed, steps, cfgScale },
        validationErrors
      )
      finalWidth = fixed.width || width
      finalHeight = fixed.height || height
      finalSeed = fixed.seed !== undefined ? fixed.seed : seed
      finalSteps = fixed.steps || steps
      finalCfgScale = fixed.cfgScale || cfgScale

      // Notify user of auto-corrections
      console.warn(
        'Generation parameters auto-corrected:',
        formatValidationErrors(validationErrors)
      )
    }

    // Check if batch mode is enabled
    const { batchSettings } = useQueueStore.getState()

    // Determine if we should use native batch support
    const shouldUseNativeBatch =
      batchSettings.count > 1 &&
      !batchSettings.variations.prompt &&
      !batchSettings.variations.steps &&
      !batchSettings.variations.cfgScale

    const params = {
      prompt,
      negative_prompt: negativePrompt,
      sampler_name: sampler,
      seed: finalSeed,
      steps: finalSteps,
      cfg_scale: finalCfgScale,
      width: finalWidth,
      height: finalHeight,
      // Add native batch parameters when appropriate
      ...(shouldUseNativeBatch
        ? {
            n_iter: batchSettings.count,
            batch_size: 1, // Use n_iter for sequential generation, batch_size for parallel
          }
        : {}),
    }

    // Use queue system only for variations
    if (batchSettings.count > 1 && !shouldUseNativeBatch) {
      useQueueStore.getState().addBatch(params, 'txt2img')
      return
    }

    // Create a frame if one wasn't provided
    let actualFrameId = frameId
    if (!actualFrameId) {
      const x = Math.random() * (window.innerWidth - 400)
      const y = Math.random() * (window.innerHeight - 200)
      actualFrameId = addGenerationFrame(x, y, width, height, false)
    }

    // Add to tracking
    addActiveGenerationFrameId(actualFrameId)
    addToGenerationQueue(actualFrameId)

    // Check if we should start generating or queue it
    if (currentlyGeneratingFrameId) {
      // There's already something generating, queue this one
      updateGenerationFrame(actualFrameId, { isGenerating: false, progress: 0 })
      console.log('Frame queued:', actualFrameId, 'Current:', currentlyGeneratingFrameId)
      return // Don't start generation yet, it's queued
    }

    // No current generation, start this one
    console.log('Starting generation for frame:', actualFrameId)
    setCurrentlyGeneratingFrame(actualFrameId)
    updateGenerationFrame(actualFrameId, { isGenerating: true })
    set({ isLoading: true })

    try {
      // Start progress monitoring before making the request
      progressService.startPolling()

      const response = await sdnextApi.txt2img(params)
      console.log('Generation response received:', response)

      // Handle multiple images in response
      const images = response.images || []
      if (images.length === 0) {
        throw new Error('No images returned from API')
      }

      // Use the frame position for first image
      const frame = generationFrames.find((f) => f.id === actualFrameId)
      const baseX = frame ? frame.x : Math.random() * (window.innerWidth - 400)
      const baseY = frame ? frame.y : Math.random() * (window.innerHeight - 200)

      // Process all images returned (for batch generation)
      for (let i = 0; i < images.length; i++) {
        const imageId = `img-${Date.now()}-${i}`

        // Convert base64 to blob
        const base64 = images[i]
        const binaryString = atob(base64.startsWith('data:') ? base64.split(',')[1] : base64)
        const bytes = new Uint8Array(binaryString.length)
        for (let j = 0; j < binaryString.length; j++) {
          bytes[j] = binaryString.charCodeAt(j)
        }
        const blob = new Blob([bytes], { type: 'image/png' })

        // Store the blob
        const storedImage = await imageStorage.createFromBlob(imageId, blob, {
          type: 'generated',
          prompt,
          negativePrompt,
          seed: finalSeed + i, // Increment seed for batch images
          steps: finalSteps,
          cfgScale: finalCfgScale,
          width: finalWidth,
          height: finalHeight,
          sampler,
          usedIn: new Set(),
        })

        // Get object URL for display
        const objectUrl = await imageStorage.getOrCreateObjectUrl(imageId)

        // Offset position for multiple images (cascade them)
        const frameX = baseX + i * 30
        const frameY = baseY + i * 30

        // Check if layer system is enabled (look for addLayer function)
        const hasLayerSystem = typeof get().addLayer === 'function'

        if (hasLayerSystem) {
          // Add as layer for layer system
          get().addLayer(
            {
              type: 'image',
              name: prompt
                ? `Generated: ${prompt.slice(0, 30)}... (${i + 1}/${images.length})`
                : `Generated Image ${i + 1}`,
              x: frameX,
              y: frameY,
              imageProps: {
                imageId, // Reference to unified storage
                width: finalWidth,
                height: finalHeight,
                naturalWidth: finalWidth,
                naturalHeight: finalHeight,
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
            width: finalWidth,
            height: finalHeight,
            metadata: storedImage.metadata,
            blobId: imageId, // Reference to stored blob
            isTemporary: false,
          }

          get().addImage(newImage)
        }
      }

      // Remove the generation frame
      removeGenerationFrame(actualFrameId)
      removeActiveGenerationFrameId(actualFrameId)
      removeFromGenerationQueue(actualFrameId)

      // Clear current frame if it was this one
      if (currentlyGeneratingFrameId === actualFrameId) {
        setCurrentlyGeneratingFrame(null)
        // Queue continuation is now handled by the progress monitor in useGenerationFrames
      }

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
        removeActiveGenerationFrameId(actualFrameId)
        removeFromGenerationQueue(actualFrameId)
        if (currentlyGeneratingFrameId === actualFrameId) {
          setCurrentlyGeneratingFrame(null)
        }
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
      addActiveGenerationFrameId,
      removeActiveGenerationFrameId,
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

    // Validate generation parameters
    const validationErrors = validateGenerationParams({
      width: frame.width,
      height: frame.height,
      seed,
      steps,
      cfgScale,
    })

    let finalWidth = frame.width
    let finalHeight = frame.height
    let finalSeed = seed
    let finalSteps = steps
    let finalCfgScale = cfgScale

    if (validationErrors.length > 0) {
      // Auto-fix validation errors
      const fixed = autoFixGenerationParams(
        { width: frame.width, height: frame.height, seed, steps, cfgScale },
        validationErrors
      )
      finalWidth = fixed.width || frame.width
      finalHeight = fixed.height || frame.height
      finalSeed = fixed.seed !== undefined ? fixed.seed : seed
      finalSteps = fixed.steps || steps
      finalCfgScale = fixed.cfgScale || cfgScale

      // Notify user of auto-corrections
      console.warn(
        'Generation parameters auto-corrected:',
        formatValidationErrors(validationErrors)
      )
    }

    // Convert placeholder to active
    convertPlaceholderToActive?.(frameId)
    addActiveGenerationFrameId(frameId)

    set({ isLoading: true })

    // Check if batch mode is enabled
    const { batchSettings } = useQueueStore.getState()

    // Determine if we should use native batch support
    const shouldUseNativeBatch =
      batchSettings.count > 1 &&
      !batchSettings.variations.prompt &&
      !batchSettings.variations.steps &&
      !batchSettings.variations.cfgScale

    const params = {
      prompt,
      negative_prompt: negativePrompt,
      sampler_name: sampler,
      seed: finalSeed,
      steps: finalSteps,
      cfg_scale: finalCfgScale,
      width: finalWidth,
      height: finalHeight,
      // Add native batch parameters when appropriate
      ...(shouldUseNativeBatch
        ? {
            n_iter: batchSettings.count,
            batch_size: 1, // Use n_iter for sequential generation, batch_size for parallel
          }
        : {}),
    }

    // Use queue system only for variations
    if (batchSettings.count > 1 && !shouldUseNativeBatch) {
      useQueueStore.getState().addBatch(params, 'txt2img')
      set({ isLoading: false })
      return
    }

    try {
      progressService.startPolling()
      const response = await sdnextApi.txt2img(params)

      // Handle multiple images in response
      const images = response.images || []
      if (images.length === 0) {
        throw new Error('No images returned from API')
      }

      // Process all images returned (for batch generation)
      for (let i = 0; i < images.length; i++) {
        const imageId = `img-${Date.now()}-${i}`
        // Convert base64 to blob
        const base64 = images[i]
        const binaryString = atob(base64.startsWith('data:') ? base64.split(',')[1] : base64)
        const bytes = new Uint8Array(binaryString.length)
        for (let j = 0; j < binaryString.length; j++) {
          bytes[j] = binaryString.charCodeAt(j)
        }
        const blob = new Blob([bytes], { type: 'image/png' })

        const storedImage = await imageStorage.createFromBlob(imageId, blob, {
          type: 'generated',
          prompt,
          negativePrompt,
          seed: finalSeed + i, // Increment seed for batch images
          steps: finalSteps,
          cfgScale: finalCfgScale,
          width: frame.width,
          height: frame.height,
          sampler,
          usedIn: new Set(),
        })

        const objectUrl = await imageStorage.getOrCreateObjectUrl(imageId)

        // Check if layer system is enabled
        const hasLayerSystem = typeof get().addLayer === 'function'

        // Offset position for multiple images (cascade them)
        const offsetX = frame.x + i * 30
        const offsetY = frame.y + i * 30

        if (hasLayerSystem) {
          // Add as layer for layer system
          get().addLayer(
            {
              type: 'image',
              name: prompt
                ? `Generated: ${prompt.slice(0, 30)}... (${i + 1}/${images.length})`
                : `Generated Image ${i + 1}`,
              x: offsetX,
              y: offsetY,
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
            x: offsetX,
            y: offsetY,
            width: frame.width,
            height: frame.height,
            metadata: storedImage.metadata,
            blobId: imageId,
            isTemporary: false,
          }

          get().addImage(newImage)
        }
      }

      // Remove frame after successful generation
      removeGenerationFrame?.(frameId)
      removeActiveGenerationFrameId(frameId)

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
      denoisingStrength: storeDenoisingStrength,
      generationFrames,
      removeGenerationFrame,
      updateGenerationFrame,
      addActiveGenerationFrameId,
      removeActiveGenerationFrameId,
      currentlyGeneratingFrameId,
      addToGenerationQueue,
      setCurrentlyGeneratingFrame,
      removeFromGenerationQueue,
    } = get()

    // Use passed denoisingStrength or fallback to store value
    const finalDenoisingStrength = denoisingStrength ?? storeDenoisingStrength

    if (!prompt) {
      alert('Please enter a prompt.')
      return
    }

    if (!baseImage) {
      alert('Please upload an image.')
      return
    }

    // Determine dimensions based on frame or default
    const frame = frameId ? generationFrames.find((f) => f.id === frameId) : null
    const baseWidth = frame ? frame.width : width
    const baseHeight = frame ? frame.height : height

    // Validate generation parameters
    const validationErrors = validateGenerationParams({
      width: baseWidth,
      height: baseHeight,
      seed,
      steps,
      cfgScale,
      denoisingStrength: finalDenoisingStrength,
    })

    let finalWidth = baseWidth
    let finalHeight = baseHeight
    let finalSeed = seed
    let finalSteps = steps
    let finalCfgScale = cfgScale
    let validatedDenoisingStrength = finalDenoisingStrength

    if (validationErrors.length > 0) {
      // Auto-fix validation errors
      const fixed = autoFixGenerationParams(
        {
          width: baseWidth,
          height: baseHeight,
          seed,
          steps,
          cfgScale,
          denoisingStrength: finalDenoisingStrength,
        },
        validationErrors
      )
      finalWidth = fixed.width || baseWidth
      finalHeight = fixed.height || baseHeight
      finalSeed = fixed.seed !== undefined ? fixed.seed : seed
      finalSteps = fixed.steps || steps
      finalCfgScale = fixed.cfgScale || cfgScale
      validatedDenoisingStrength =
        fixed.denoisingStrength !== undefined ? fixed.denoisingStrength : finalDenoisingStrength

      // Notify user of auto-corrections
      console.warn(
        'Generation parameters auto-corrected:',
        formatValidationErrors(validationErrors)
      )
    }

    // Check if batch mode is enabled
    const { batchSettings } = useQueueStore.getState()

    // Determine if we should use native batch support
    const shouldUseNativeBatch =
      batchSettings.count > 1 &&
      !batchSettings.variations.prompt &&
      !batchSettings.variations.steps &&
      !batchSettings.variations.cfgScale

    const params = {
      init_images: [baseImage],
      prompt,
      negative_prompt: negativePrompt,
      sampler_name: sampler,
      seed: finalSeed,
      steps: finalSteps,
      cfg_scale: finalCfgScale,
      width: finalWidth,
      height: finalHeight,
      denoising_strength: validatedDenoisingStrength,
      // Add native batch parameters when appropriate
      ...(shouldUseNativeBatch
        ? {
            n_iter: batchSettings.count,
            batch_size: 1, // Use n_iter for sequential generation
          }
        : {}),
    }

    // Use queue system only for variations
    if (batchSettings.count > 1 && !shouldUseNativeBatch) {
      useQueueStore.getState().addBatch(params, 'img2img')
      return
    }

    if (frameId) {
      addActiveGenerationFrameId(frameId)
      addToGenerationQueue(frameId)

      if (currentlyGeneratingFrameId) {
        // There's already something generating, queue this one
        updateGenerationFrame?.(frameId, { isGenerating: false, progress: 0 })
        console.log('Img2Img frame queued:', frameId, 'Current:', currentlyGeneratingFrameId)
        return // Don't start generation yet, it's queued
      }

      // No current generation, start this one
      console.log('Starting img2img generation for frame:', frameId)
      setCurrentlyGeneratingFrame(frameId)
      updateGenerationFrame?.(frameId, { isGenerating: true })
    }

    set({ isLoading: true })

    try {
      // Start progress monitoring
      progressService.startPolling()

      const response = await sdnextApi.img2img(params)

      // Handle multiple images in response
      const images = response.images || []
      if (images.length === 0) {
        throw new Error('No images returned from API')
      }

      // Determine base position based on frame or active generation frame
      let baseX: number, baseY: number
      if (frame) {
        baseX = frame.x
        baseY = frame.y
      } else {
        const activeFrame = generationFrames.find((f) => f.isGenerating)
        baseX = activeFrame ? activeFrame.x : Math.random() * (window.innerWidth - 200)
        baseY = activeFrame ? activeFrame.y : Math.random() * (window.innerHeight - 200)
      }

      // Process all images returned (for batch generation)
      for (let i = 0; i < images.length; i++) {
        const imageId = `img-${Date.now()}-${i}`

        // Convert base64 to blob
        const base64 = images[i]
        const binaryString = atob(base64.startsWith('data:') ? base64.split(',')[1] : base64)
        const bytes = new Uint8Array(binaryString.length)
        for (let j = 0; j < binaryString.length; j++) {
          bytes[j] = binaryString.charCodeAt(j)
        }
        const blob = new Blob([bytes], { type: 'image/png' })

        const storedImage = await imageStorage.createFromBlob(imageId, blob, {
          type: 'generated',
          prompt,
          negativePrompt,
          seed: finalSeed + i, // Increment seed for batch images
          steps: finalSteps,
          cfgScale: finalCfgScale,
          width: finalWidth,
          height: finalHeight,
          sampler,
          denoisingStrength: validatedDenoisingStrength,
          usedIn: new Set(),
        })

        const objectUrl = await imageStorage.getOrCreateObjectUrl(imageId)

        // Offset position for multiple images
        const x = baseX + i * 30
        const y = baseY + i * 30

        // Check if layer system is enabled
        const hasLayerSystem = typeof get().addLayer === 'function'

        if (hasLayerSystem) {
          get().addLayer(
            {
              type: 'image',
              name: prompt
                ? `Img2Img: ${prompt.slice(0, 25)}... (${i + 1}/${images.length})`
                : `Img2Img Result ${i + 1}`,
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
      } // Close the for loop

      // Remove frame and update queue
      if (frameId) {
        removeGenerationFrame?.(frameId)
        removeActiveGenerationFrameId(frameId)
        removeFromGenerationQueue(frameId)

        // Clear current frame if it was this one
        if (currentlyGeneratingFrameId === frameId) {
          setCurrentlyGeneratingFrame(null)
          // Queue continuation is now handled by the progress monitor in useGenerationFrames
        }
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
      denoisingStrength: storeDenoisingStrength,
      maskBlur: storeMaskBlur,
      inpaintingFill: storeInpaintingFill,
      inpaintFullRes: storeInpaintFullRes,
      inpaintFullResPadding: storeInpaintFullResPadding,
      generationFrames,
      removeGenerationFrame,
      updateGenerationFrame,
      addActiveGenerationFrameId,
      removeActiveGenerationFrameId,
      currentlyGeneratingFrameId,
      addToGenerationQueue,
      setCurrentlyGeneratingFrame,
      removeFromGenerationQueue,
    } = get()

    // Use passed params or fallback to store values
    const finalParams = {
      ...params,
      denoisingStrength: params.denoisingStrength ?? storeDenoisingStrength,
      maskBlur: params.maskBlur ?? storeMaskBlur,
      inpaintingFill: params.inpaintingFill ?? storeInpaintingFill,
      inpaintFullRes: params.inpaintFullRes ?? storeInpaintFullRes,
      inpaintFullResPadding: params.inpaintFullResPadding ?? storeInpaintFullResPadding,
    }

    if (!prompt) {
      alert('Please enter a prompt.')
      return
    }

    // Determine dimensions based on frame or default
    const frame = frameId ? generationFrames.find((f) => f.id === frameId) : null
    const baseWidth = frame ? frame.width : width
    const baseHeight = frame ? frame.height : height

    // Validate generation parameters
    const validationErrors = validateGenerationParams({
      width: baseWidth,
      height: baseHeight,
      seed,
      steps,
      cfgScale,
      denoisingStrength: finalParams.denoisingStrength,
      maskBlur: finalParams.maskBlur,
      inpaintFullResPadding: finalParams.inpaintFullResPadding,
    })

    let finalWidth = baseWidth
    let finalHeight = baseHeight
    let finalSeed = seed
    let finalSteps = steps
    let finalCfgScale = cfgScale
    let finalDenoisingStrength = finalParams.denoisingStrength
    let finalMaskBlur = finalParams.maskBlur

    if (validationErrors.length > 0) {
      // Auto-fix validation errors
      const fixed = autoFixGenerationParams(
        {
          width: baseWidth,
          height: baseHeight,
          seed,
          steps,
          cfgScale,
          denoisingStrength: finalParams.denoisingStrength,
          maskBlur: finalParams.maskBlur,
          inpaintFullResPadding: finalParams.inpaintFullResPadding,
        },
        validationErrors
      )
      finalWidth = fixed.width || baseWidth
      finalHeight = fixed.height || baseHeight
      finalSeed = fixed.seed !== undefined ? fixed.seed : seed
      finalSteps = fixed.steps || steps
      finalCfgScale = fixed.cfgScale || cfgScale
      finalDenoisingStrength =
        fixed.denoisingStrength !== undefined
          ? fixed.denoisingStrength
          : finalParams.denoisingStrength
      finalMaskBlur = fixed.maskBlur !== undefined ? fixed.maskBlur : finalParams.maskBlur

      // Notify user of auto-corrections
      console.warn(
        'Generation parameters auto-corrected:',
        formatValidationErrors(validationErrors)
      )
    }

    const apiParams = {
      init_images: [finalParams.baseImage],
      mask: finalParams.maskImage,
      prompt,
      negative_prompt: negativePrompt,
      sampler_name: sampler,
      seed: finalSeed,
      steps: finalSteps,
      cfg_scale: finalCfgScale,
      width: finalWidth,
      height: finalHeight,
      denoising_strength: finalDenoisingStrength,
      mask_blur: finalMaskBlur,
      inpainting_fill:
        finalParams.inpaintingFill === 'fill'
          ? 0
          : finalParams.inpaintingFill === 'original'
            ? 1
            : finalParams.inpaintingFill === 'latent_noise'
              ? 2
              : 3,
      inpaint_full_res: finalParams.inpaintFullRes,
      inpaint_full_res_padding: finalParams.inpaintFullResPadding,
    }

    // Check if batch mode is enabled
    const { batchSettings } = useQueueStore.getState()
    if (batchSettings.count > 1) {
      useQueueStore.getState().addBatch(apiParams, 'inpaint')
      return
    }

    if (frameId) {
      addActiveGenerationFrameId(frameId)
      addToGenerationQueue(frameId)

      if (currentlyGeneratingFrameId) {
        // There's already something generating, queue this one
        updateGenerationFrame?.(frameId, { isGenerating: false, progress: 0 })
        console.log('Inpaint frame queued:', frameId, 'Current:', currentlyGeneratingFrameId)
        return // Don't start generation yet, it's queued
      }

      // No current generation, start this one
      console.log('Starting inpaint generation for frame:', frameId)
      setCurrentlyGeneratingFrame(frameId)
      updateGenerationFrame?.(frameId, { isGenerating: true })
    }

    set({ isLoading: true })

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
        denoisingStrength: finalParams.denoisingStrength,
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

      // Remove frame and update queue
      if (frameId) {
        removeGenerationFrame?.(frameId)
        removeActiveGenerationFrameId(frameId)
        removeFromGenerationQueue(frameId)

        // Clear current frame if it was this one
        if (currentlyGeneratingFrameId === frameId) {
          setCurrentlyGeneratingFrame(null)
          // Queue continuation is now handled by the progress monitor in useGenerationFrames
        }
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
   * Generate from a single layer using it as input
   */
  generateFromLayer: async (
    layerId: string,
    mode: 'txt2img' | 'img2img',
    denoisingStrength: number = 0.75
  ) => {
    const { getLayer, prompt } = get()

    const layer = getLayer(layerId)
    if (!layer) {
      alert('Layer not found')
      return
    }

    if (!prompt) {
      alert('Please enter a prompt.')
      return
    }

    try {
      // Export layer as base64
      const base64 = await LayerExportService.exportLayerAsBase64(layerId)
      if (!base64) {
        alert('Failed to export layer')
        return
      }

      if (mode === 'txt2img') {
        // For txt2img, we just generate at the layer position
        await get().generateTxt2Img()
      } else {
        // For img2img, use the layer as input
        await get().generateImg2Img(base64, denoisingStrength)
      }
    } catch (error) {
      console.error('Failed to generate from layer:', error)
      alert('Failed to generate from layer')
    }
  },

  /**
   * Generate from multiple selected layers as composite
   */
  generateFromSelection: async (
    layerIds: string[],
    mode: 'txt2img' | 'img2img',
    denoisingStrength: number = 0.75
  ) => {
    const { prompt, width, height } = get()

    if (!layerIds.length) {
      alert('No layers selected')
      return
    }

    if (!prompt) {
      alert('Please enter a prompt.')
      return
    }

    try {
      // Export layers as composite with generation dimensions
      const result = await LayerExportService.exportLayersAsComposite(
        layerIds,
        'png',
        0.92,
        width,
        height
      )

      if (!result) {
        alert('Failed to export layers')
        return
      }

      if (mode === 'txt2img') {
        // For txt2img, just generate at canvas center
        await get().generateTxt2Img()
      } else {
        // For img2img, use the composite as input
        await get().generateImg2Img(result.base64, denoisingStrength)
      }
    } catch (error) {
      console.error('Failed to generate from selection:', error)
      alert('Failed to generate from selection')
    }
  },

  /**
   * Inpaint using a layer as base and optionally another layer as mask
   */
  inpaintFromLayer: async (layerId: string, maskLayerId?: string) => {
    const { getLayer, prompt, width, height } = get()

    const layer = getLayer(layerId)
    if (!layer) {
      alert('Base layer not found')
      return
    }

    if (!prompt) {
      alert('Please enter a prompt.')
      return
    }

    try {
      // Export base layer
      const baseImage = await LayerExportService.exportLayerAsBase64(layerId)
      if (!baseImage) {
        alert('Failed to export base layer')
        return
      }

      // Export mask layer if provided
      let maskImage = ''
      if (maskLayerId) {
        const mask = await LayerExportService.exportLayerAsBase64(maskLayerId, 'png')
        if (mask) {
          maskImage = mask
        }
      }

      // If no mask provided, create a default mask (all white = inpaint everywhere)
      if (!maskImage) {
        // Create a simple white mask
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.fillStyle = 'white'
          ctx.fillRect(0, 0, width, height)
          const dataUrl = canvas.toDataURL('image/png')
          maskImage = dataUrl.split(',')[1]
        }
      }

      // Call inpaint with the exported images
      const params: InpaintParams = {
        baseImage,
        maskImage,
        denoisingStrength: 0.75,
        maskBlur: 4,
        inpaintingFill: 'original',
        inpaintFullRes: true,
        inpaintFullResPadding: 32,
      }

      await get().generateInpaint(params)
    } catch (error) {
      console.error('Failed to inpaint from layer:', error)
      alert('Failed to inpaint from layer')
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
