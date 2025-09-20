import { useState, useEffect, useCallback } from 'react'

import { progressService } from '../../../services/progress/ProgressService'
import { useStore } from '../../../store/store'

import { CanvasTool } from './useCanvasTools'

export interface GenerationFrame {
  id: string
  x: number
  y: number
  width: number
  height: number
  isPlaceholder: boolean
  isGenerating: boolean
  progress: number
  previewImage?: string
  error?: string
  label?: string
  locked?: boolean
}

interface UseGenerationFramesProps {
  currentTool: CanvasTool
}

/**
 * Hook for managing generation frames including creation, updates, and progress monitoring
 */
export function useGenerationFrames({ currentTool }: UseGenerationFramesProps) {
  const {
    generationFrames,
    addGenerationFrame,
    removeGenerationFrame,
    updateGenerationFrame,
    updateFramePosition,
    activeGenerationFrameIds,
    addActiveGenerationFrameId,
    removeActiveGenerationFrameId,
    currentlyGeneratingFrameId,
    setCurrentlyGeneratingFrame,
    addToGenerationQueue,
    removeFromGenerationQueue,
    getNextInQueue,
    width,
    height,
    generateTxt2Img,
    generateImg2Img,
    generateInpaint,
    isLoading,
    images,
    activeImageRoles,
    exportImageAsBase64,
  } = useStore()

  // Local state
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null)
  const [contextMenuFrameId, setContextMenuFrameId] = useState<string | null>(null)

  /**
   * Monitor progress for the currently generating frame
   */
  useEffect(() => {
    if (!currentlyGeneratingFrameId) return

    let timeoutId: NodeJS.Timeout | null = null

    const unsubscribe = progressService.onProgress((message) => {
      // Only update the currently generating frame
      console.log('Progress event for frame:', currentlyGeneratingFrameId, message)

      if (message.phase === 'sampling') {
        const progress = message.total > 0 ? (message.current / message.total) * 100 : 0
        updateGenerationFrame(currentlyGeneratingFrameId, {
          progress,
          previewImage: message.preview ? `data:image/png;base64,${message.preview}` : undefined,
          isGenerating: true,
        })
      } else if (message.phase === 'vae' || message.phase === 'postprocessing') {
        updateGenerationFrame(currentlyGeneratingFrameId, {
          progress: 95,
          previewImage: message.preview ? `data:image/png;base64,${message.preview}` : undefined,
          isGenerating: true,
        })
      } else if (message.phase === 'completed') {
        updateGenerationFrame(currentlyGeneratingFrameId, {
          isGenerating: false,
          progress: 100,
        })
        removeActiveGenerationFrameId(currentlyGeneratingFrameId)
        removeFromGenerationQueue(currentlyGeneratingFrameId)
        setCurrentlyGeneratingFrame(null)

        // Start next in queue if any
        const nextId = getNextInQueue()
        if (nextId) {
          console.log('Starting next in queue:', nextId)
          // Remove from queue first
          removeFromGenerationQueue(nextId)

          // Determine generation type based on active image roles
          const img2imgRole = activeImageRoles.find((r) => r.role === 'img2img_init')
          const inpaintRole = activeImageRoles.find((r) => r.role === 'inpaint_image')

          // Start the appropriate generation
          if (inpaintRole) {
            const inpaintImage = images.find((img) => img.id === inpaintRole.imageId)
            if (inpaintImage) {
              exportImageAsBase64(inpaintImage.id).then((baseImageBase64) => {
                generateInpaint(
                  {
                    baseImage: baseImageBase64,
                    maskImage: baseImageBase64,
                    denoisingStrength: 0.75,
                    maskBlur: 4,
                    inpaintingFill: 'original',
                    inpaintFullRes: false,
                    inpaintFullResPadding: 32,
                  },
                  nextId
                )
              })
            }
          } else if (img2imgRole) {
            const img2imgImage = images.find((img) => img.id === img2imgRole.imageId)
            if (img2imgImage) {
              exportImageAsBase64(img2imgImage.id).then((baseImageBase64) => {
                generateImg2Img(baseImageBase64, 0.5, nextId)
              })
            }
          } else {
            // Default to txt2img
            generateTxt2Img(nextId)
          }
        }
      } else if (message.phase === 'waiting') {
        // Initial waiting state, don't update
      } else if (message.error) {
        updateGenerationFrame(currentlyGeneratingFrameId, {
          isGenerating: false,
          error: message.error || 'Generation failed',
        })
        // Keep error frames visible longer
        timeoutId = setTimeout(() => {
          removeGenerationFrame(currentlyGeneratingFrameId)
          removeActiveGenerationFrameId(currentlyGeneratingFrameId)
          removeFromGenerationQueue(currentlyGeneratingFrameId)
          setCurrentlyGeneratingFrame(null)

          // Start next in queue even after error
          const nextId = getNextInQueue()
          if (nextId) {
            console.log('Starting next in queue after error:', nextId)
            removeFromGenerationQueue(nextId)

            // Determine generation type and start
            const img2imgRole = activeImageRoles.find((r) => r.role === 'img2img_init')
            const inpaintRole = activeImageRoles.find((r) => r.role === 'inpaint_image')

            if (inpaintRole) {
              const inpaintImage = images.find((img) => img.id === inpaintRole.imageId)
              if (inpaintImage) {
                exportImageAsBase64(inpaintImage.id).then((baseImageBase64) => {
                  generateInpaint(
                    {
                      baseImage: baseImageBase64,
                      maskImage: baseImageBase64,
                      denoisingStrength: 0.75,
                      maskBlur: 4,
                      inpaintingFill: 'original',
                      inpaintFullRes: false,
                      inpaintFullResPadding: 32,
                    },
                    nextId
                  )
                })
              }
            } else if (img2imgRole) {
              const img2imgImage = images.find((img) => img.id === img2imgRole.imageId)
              if (img2imgImage) {
                exportImageAsBase64(img2imgImage.id).then((baseImageBase64) => {
                  generateImg2Img(baseImageBase64, 0.5, nextId)
                })
              }
            } else {
              generateTxt2Img(nextId)
            }
          }
        }, 3000)
      }
    })

    return () => {
      unsubscribe()
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [
    currentlyGeneratingFrameId,
    updateGenerationFrame,
    removeGenerationFrame,
    removeActiveGenerationFrameId,
    removeFromGenerationQueue,
    setCurrentlyGeneratingFrame,
    getNextInQueue,
    activeImageRoles,
    images,
    exportImageAsBase64,
    generateTxt2Img,
    generateImg2Img,
    generateInpaint,
  ])

  /**
   * Cleanup orphaned frames
   */
  useEffect(() => {
    if (!isLoading && generationFrames.length > 0) {
      generationFrames.forEach((frame) => {
        // Only cleanup frames that aren't actively monitored or currently generating
        if (
          frame.isGenerating &&
          !activeGenerationFrameIds.has(frame.id) &&
          frame.id !== currentlyGeneratingFrameId
        ) {
          // Mark as orphaned frame error
          updateGenerationFrame(frame.id, {
            isGenerating: false,
            error: 'Generation interrupted',
          })
          setTimeout(() => removeGenerationFrame(frame.id), 2000)
        }
      })
    }
  }, [
    isLoading,
    generationFrames,
    activeGenerationFrameIds,
    currentlyGeneratingFrameId,
    updateGenerationFrame,
    removeGenerationFrame,
  ])

  /**
   * Clear stale frames on mount
   */
  useEffect(() => {
    setContextMenuFrameId(null)
  }, [])

  /**
   * Handle frame selection
   */
  const handleFrameSelect = useCallback(
    (frameId: string | null) => {
      if (currentTool === CanvasTool.SELECT) {
        setSelectedFrameId(frameId)
      }
    },
    [currentTool]
  )

  /**
   * Handle frame drag end
   */
  const handleFrameDragEnd = useCallback(
    (frameId: string, newX: number, newY: number) => {
      updateFramePosition(frameId, newX, newY)
    },
    [updateFramePosition]
  )

  /**
   * Check if frame is draggable
   */
  const isFrameDraggable = useCallback(
    (frame: GenerationFrame) => {
      return Boolean(frame.isPlaceholder && !frame.locked && currentTool === CanvasTool.SELECT)
    },
    [currentTool]
  )

  /**
   * Place an empty frame at position
   */
  const placeEmptyFrame = useCallback(
    (x: number, y: number, label?: string) => {
      const frameId = addGenerationFrame(x, y, width, height, true)
      if (label) {
        updateGenerationFrame(frameId, { label })
      }
      return frameId
    },
    [addGenerationFrame, updateGenerationFrame, width, height]
  )

  /**
   * Generate image at position
   */
  const generateAtPosition = useCallback(
    async (x: number, y: number) => {
      // Create a temporary generation frame (not a placeholder)
      const frameId = addGenerationFrame(x, y, width, height, false)

      // Don't manage active frames or queue here - let the generation actions handle everything
      // This prevents duplication and race conditions

      try {
        // Check for active image roles to determine generation mode
        const img2imgRole = activeImageRoles.find((r) => r.role === 'img2img_init')
        const inpaintRole = activeImageRoles.find((r) => r.role === 'inpaint_image')

        if (inpaintRole) {
          // Use inpainting mode if an inpaint image is set
          const inpaintImage = images.find((img) => img.id === inpaintRole.imageId)
          if (inpaintImage) {
            const baseImageBase64 = await exportImageAsBase64(inpaintImage.id)
            await generateInpaint(
              {
                baseImage: baseImageBase64,
                maskImage: baseImageBase64, // TODO: Implement proper mask drawing
                denoisingStrength: 0.75,
                maskBlur: 4,
                inpaintingFill: 'original',
                inpaintFullRes: false,
                inpaintFullResPadding: 32,
              },
              frameId
            )
          } else {
            throw new Error('Inpaint image not found')
          }
        } else if (img2imgRole) {
          // Use img2img mode if an img2img init image is set
          const img2imgImage = images.find((img) => img.id === img2imgRole.imageId)
          if (img2imgImage) {
            const baseImageBase64 = await exportImageAsBase64(img2imgImage.id)
            await generateImg2Img(baseImageBase64, 0.5, frameId)
          } else {
            throw new Error('Img2Img init image not found')
          }
        } else {
          // Default to txt2img if no image roles are set
          await generateTxt2Img(frameId)
        }
      } catch (error: unknown) {
        updateGenerationFrame(frameId, {
          isGenerating: false,
          error: error instanceof Error ? error.message : 'Generation failed',
        })
        console.error('Generation failed:', error)
      }
    },
    [
      addGenerationFrame,
      updateGenerationFrame,
      width,
      height,
      activeImageRoles,
      images,
      exportImageAsBase64,
      generateTxt2Img,
      generateImg2Img,
      generateInpaint,
    ]
  )

  /**
   * Remove a frame
   */
  const handleFrameRemove = useCallback(
    (frameId: string) => {
      removeGenerationFrame(frameId)
      if (frameId === selectedFrameId) {
        setSelectedFrameId(null)
      }
      if (frameId === contextMenuFrameId) {
        setContextMenuFrameId(null)
      }
    },
    [removeGenerationFrame, selectedFrameId, contextMenuFrameId]
  )

  /**
   * Lock/unlock a frame
   */
  const toggleFrameLock = useCallback(
    (frameId: string) => {
      const frame = generationFrames.find((f) => f.id === frameId)
      if (frame) {
        updateGenerationFrame(frameId, { locked: !frame.locked })
      }
    },
    [generationFrames, updateGenerationFrame]
  )

  /**
   * Get frame stroke color
   */
  const getFrameStrokeColor = useCallback((frame: GenerationFrame) => {
    if (frame.error) return '#dc3545' // error color
    if (frame.isPlaceholder) return '#6c757d' // muted color
    return '#007bff' // primary color
  }, [])

  /**
   * Get frame fill color
   */
  const getFrameFillColor = useCallback((frame: GenerationFrame) => {
    if (frame.isPlaceholder) return 'rgba(108, 117, 125, 0.1)' // muted with low opacity
    return 'rgba(0, 123, 255, 0.05)' // primary with very low opacity
  }, [])

  /**
   * Clear selection
   */
  const clearFrameSelection = useCallback(() => {
    setSelectedFrameId(null)
  }, [])

  /**
   * Set context menu frame
   */
  const setFrameContextMenu = useCallback((frameId: string | null) => {
    setContextMenuFrameId(frameId)
  }, [])

  return {
    // State
    generationFrames,
    selectedFrameId,
    contextMenuFrameId,
    activeGenerationFrameIds,
    currentlyGeneratingFrameId,

    // Methods
    handleFrameSelect,
    handleFrameDragEnd,
    handleFrameRemove,
    placeEmptyFrame,
    generateAtPosition,
    toggleFrameLock,
    clearFrameSelection,
    setFrameContextMenu,
    addActiveGenerationFrameId,

    // Utilities
    isFrameDraggable,
    getFrameStrokeColor,
    getFrameFillColor,
  }
}
