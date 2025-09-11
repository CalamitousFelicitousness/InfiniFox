import Konva from 'konva'
import { useState, useEffect, useCallback, useRef } from 'react'

import { snappingManager } from '../../../services/canvas/SnappingManager'
import { useStore } from '../../../store/store'
import type { SnapGuide } from '../../../services/canvas/SnappingManager'

import { CanvasTool } from './useCanvasTools'

export interface KonvaImageData {
  id: string
  src: string
  x: number
  y: number
  scaleX?: number
  scaleY?: number
  rotation?: number
  image: HTMLImageElement
}

interface UseImageManagementProps {
  currentTool: CanvasTool
  scale: number
  onSnapGuidesChange?: (guides: SnapGuide[]) => void
}

/**
 * Hook for managing image loading, selection, transformation, and roles
 */
export function useImageManagement({ currentTool, scale: _scale, onSnapGuidesChange }: UseImageManagementProps) {
  const {
    images,
    removeImage,
    duplicateImage,
    setImageAsInput,
    activeImageRoles,
    uploadImageToCanvas,
    canvasSelectionMode,
    cancelCanvasSelection,
    setImageRole,
    updateImagePosition,
    updateImageTransform,
    exportImageAsBase64,
  } = useStore()

  // Local state
  const [konvaImages, setKonvaImages] = useState<KonvaImageData[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draggingImageId, setDraggingImageId] = useState<string | null>(null)
  const transformerRef = useRef<Konva.Transformer | null>(null)
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map())
  const activeLoadsRef = useRef<Set<HTMLImageElement>>(new Set())
  const mountedRef = useRef(true)
  
  // RAF throttling for snap guide updates
  const rafRef = useRef<number | null>(null)
  const pendingSnapGuidesRef = useRef<SnapGuide[] | null>(null)

  // Track mounted state and cleanup
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      // Clear snap guides on unmount
      onSnapGuidesChange?.([])
      // Clear dragging state
      setDraggingImageId(null)
      snappingManager.setCurrentObject(null)
      // Cancel any pending RAF
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [onSnapGuidesChange])

  /**
   * Load images as Konva-compatible format with batching
   */
  useEffect(() => {
    const abortController = new AbortController()
    const pendingImages = new Set<HTMLImageElement>()
    const BATCH_SIZE = 3 // Load 3 images at a time
    const BATCH_DELAY = 16 // ~1 frame delay between batches

    const loadImages = async () => {
      const newKonvaImages: KonvaImageData[] = []
      const imagesToLoad: typeof images = []

      // Separate cached from uncached images
      images.forEach((imgData) => {
        const cachedImg = imageCache.current.get(imgData.id)

        if (cachedImg && cachedImg.src === imgData.src) {
          // Use cached image immediately
          newKonvaImages.push({
            id: imgData.id,
            src: imgData.src,
            x: imgData.x,
            y: imgData.y,
            scaleX: imgData.scaleX,
            scaleY: imgData.scaleY,
            rotation: imgData.rotation,
            image: cachedImg,
          })
        } else {
          imagesToLoad.push(imgData)
        }
      })

      // Set cached images immediately
      if (newKonvaImages.length > 0) {
        setKonvaImages(prev => {
          const existingIds = new Set(prev.map(img => img.id))
          const filtered = prev.filter(img => images.some(i => i.id === img.id))
          const toAdd = newKonvaImages.filter(img => !existingIds.has(img.id))
          return [...filtered, ...toAdd]
        })
      }

      // Load uncached images in batches
      for (let i = 0; i < imagesToLoad.length; i += BATCH_SIZE) {
        if (abortController.signal.aborted) break

        const batch = imagesToLoad.slice(i, i + BATCH_SIZE)
        const batchPromises = batch.map((imgData) => 
          new Promise<KonvaImageData | null>((resolve) => {
            if (abortController.signal.aborted) {
              resolve(null)
              return
            }

            const img = new window.Image()
            img.crossOrigin = 'anonymous'

            // Track this image load
            pendingImages.add(img)
            activeLoadsRef.current.add(img)

            const cleanup = () => {
              pendingImages.delete(img)
              activeLoadsRef.current.delete(img)
              img.onload = null
              img.onerror = null
            }

            img.onload = () => {
              if (!mountedRef.current || abortController.signal.aborted) {
                cleanup()
                resolve(null)
                return
              }

              if (img.complete && img.naturalHeight !== 0) {
                // Cache the image
                imageCache.current.set(imgData.id, img)
                resolve({
                  id: imgData.id,
                  src: imgData.src,
                  x: imgData.x,
                  y: imgData.y,
                  scaleX: imgData.scaleX,
                  scaleY: imgData.scaleY,
                  rotation: imgData.rotation,
                  image: img,
                })
              } else {
                console.error(`Image ${imgData.id} not fully loaded`)
                resolve(null)
              }
              cleanup()
            }

            img.onerror = () => {
              console.error(`Failed to load image ${imgData.id}`)
              cleanup()
              resolve(null)
            }

            img.src = imgData.src
          })
        )

        const batchResults = await Promise.all(batchPromises)
        const validImages = batchResults.filter((img): img is KonvaImageData => img !== null)
        
        if (validImages.length > 0 && mountedRef.current && !abortController.signal.aborted) {
          setKonvaImages(prev => {
            const existingIds = new Set(prev.map(img => img.id))
            const toAdd = validImages.filter(img => !existingIds.has(img.id))
            return [...prev, ...toAdd]
          })
        }

        // Delay before next batch to prevent blocking
        if (i + BATCH_SIZE < imagesToLoad.length) {
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY))
        }
      }

      // Clean up removed images from cache
      const currentIds = new Set(images.map((img) => img.id))
      for (const [id, img] of imageCache.current.entries()) {
        if (!currentIds.has(id)) {
          img.onload = null
          img.onerror = null
          img.src = '' // Clear src to stop any pending loads
          imageCache.current.delete(id)
        }
      }
    }

    loadImages()

    // Cleanup function
    return () => {
      abortController.abort()

      // Clean up all pending image loads
      pendingImages.forEach((img) => {
        img.onload = null
        img.onerror = null
        img.src = ''
      })
      pendingImages.clear()
    }
  }, [images])

  // Clean up all resources on unmount
  useEffect(() => {
    // Capture refs at effect time to avoid stale closure issues
    const activeLoads = activeLoadsRef.current
    const cache = imageCache.current

    return () => {
      // Clear all active loads
      activeLoads.forEach((img) => {
        img.onload = null
        img.onerror = null
        img.src = ''
      })
      activeLoads.clear()

      // Clear image cache
      cache.forEach((img) => {
        img.onload = null
        img.onerror = null
        img.src = ''
      })
      cache.clear()
    }
  }, [])

  /**
   * Get image border color based on role and selection
   */
  const getImageBorderColor = useCallback(
    (imageId: string) => {
      const role = activeImageRoles.find((r) => r.imageId === imageId)
      if (!role) return selectedId === imageId ? '#007bff' : 'transparent'

      switch (role.role) {
        case 'img2img_init':
          return '#28a745' // success color
        case 'inpaint_image':
          return '#ffc107' // warning color
        default:
          return selectedId === imageId ? '#007bff' : 'transparent'
      }
    },
    [activeImageRoles, selectedId]
  )

  /**
   * Handle image selection
   */
  const handleImageSelect = useCallback(
    (imageId: string | null) => {
      // If we're in canvas selection mode, handle differently
      if (canvasSelectionMode.active && imageId) {
        const clickedImage = konvaImages.find((img) => img.id === imageId)
        if (clickedImage && canvasSelectionMode.callback) {
          // Call the callback with image data
          canvasSelectionMode.callback(clickedImage.id, clickedImage.src)
          // Set the image role
          if (canvasSelectionMode.mode) {
            setImageRole(clickedImage.id, canvasSelectionMode.mode)
          }
          // Exit selection mode
          cancelCanvasSelection()
          return
        }
      }

      // Normal selection
      setSelectedId(imageId)
    },
    [canvasSelectionMode, konvaImages, setImageRole, cancelCanvasSelection]
  )

  /**
   * Handle image deletion
   */
  const handleImageDelete = useCallback(
    (imageId?: string) => {
      const targetId = imageId || selectedId
      if (targetId) {
        removeImage(targetId)
        if (targetId === selectedId) {
          setSelectedId(null)
        }
      }
    },
    [selectedId, removeImage]
  )

  /**
   * Handle image duplication
   */
  const handleImageDuplicate = useCallback(
    (imageId?: string) => {
      const targetId = imageId || selectedId
      if (targetId) {
        duplicateImage(targetId)
      }
    },
    [selectedId, duplicateImage]
  )

  /**
   * Handle sending image to img2img
   */
  const handleSendToImg2Img = useCallback(
    (imageId?: string) => {
      const targetId = imageId || selectedId
      if (targetId) {
        const image = konvaImages.find((img) => img.id === targetId)
        if (image) {
          setImageAsInput(image.src)
        }
      }
    },
    [selectedId, konvaImages, setImageAsInput]
  )

  /**
   * Handle image download
   */
  const handleImageDownload = useCallback(
    (imageId?: string) => {
      const targetId = imageId || selectedId
      if (targetId) {
        const image = konvaImages.find((img) => img.id === targetId)
        if (image) {
          const link = document.createElement('a')
          link.href = image.src
          link.download = `generated-${targetId}.png`
          link.click()
        }
      }
    },
    [selectedId, konvaImages]
  )

  /**
   * Handle image drag start
   */
  const handleImageDragStart = useCallback(
    (imageId: string) => {
      setDraggingImageId(imageId)
      
      // Set current object for snapping manager
      snappingManager.setCurrentObject(imageId)
      
      // Update snap targets (all other images)
      const snapTargets = konvaImages
        .filter(img => img.id !== imageId)
        .map(img => ({
          id: img.id,
          x: img.x,
          y: img.y,
          width: img.image.naturalWidth * (img.scaleX || 1),
          height: img.image.naturalHeight * (img.scaleY || 1),
          rotation: img.rotation || 0
        }))
      
      snappingManager.setObjects(snapTargets)
    },
    [konvaImages]
  )

  /**
   * Schedule snap guide update with minimal throttling
   */
  const scheduleSnapGuideUpdate = useCallback((guides: SnapGuide[]) => {
    pendingSnapGuidesRef.current = guides
    
    // Update immediately for responsiveness
    if (onSnapGuidesChange) {
      onSnapGuidesChange(guides)
    }
    
    // Cancel previous RAF to prevent buildup
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [onSnapGuidesChange])

  /**
   * Handle image drag move with snapping
   */
  const handleImageDragMove = useCallback(
    (imageId: string, x: number, y: number) => {
      const image = konvaImages.find(img => img.id === imageId)
      if (!image) return { x, y }
      
      // Calculate dimensions
      const width = image.image.naturalWidth * (image.scaleX || 1)
      const height = image.image.naturalHeight * (image.scaleY || 1)
      
      // Get snapped position
      const snapResult = snappingManager.snap(x, y, width, height)
      
      // Use throttled update instead of direct call
      scheduleSnapGuideUpdate(snapResult.guides)
      
      return { x: snapResult.x, y: snapResult.y }
    },
    [konvaImages, scheduleSnapGuideUpdate]
  )

  /**
   * Handle image position update after drag
   */
  const handleImageDragEnd = useCallback(
    (imageId: string, newX: number, newY: number) => {
      setDraggingImageId(null)
      snappingManager.setCurrentObject(null)
      
      // Cancel any pending RAF and clear guides
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      pendingSnapGuidesRef.current = null
      onSnapGuidesChange?.([])
      
      updateImagePosition(imageId, newX, newY)

      // Update local state
      setKonvaImages((prev) => prev.map((i) => (i.id === imageId ? { ...i, x: newX, y: newY } : i)))
    },
    [updateImagePosition, onSnapGuidesChange]
  )

  /**
   * Handle image transformation (resize, rotate) end
   */
  const handleImageTransformEnd = useCallback(
    (imageId: string, node: Konva.Node) => {
      const transform = {
        x: node.x(),
        y: node.y(),
        scaleX: node.scaleX(),
        scaleY: node.scaleY(),
        rotation: node.rotation(),
      }

      // Update transform in store
      updateImageTransform(imageId, transform)

      // Update local state
      setKonvaImages((prev) => prev.map((i) => (i.id === imageId ? { ...i, ...transform } : i)))
    },
    [updateImageTransform]
  )

  /**
   * Check if image is draggable based on current state
   */
  const isImageDraggable = useCallback(
    (imageId: string) => {
      return (
        currentTool === CanvasTool.SELECT &&
        !canvasSelectionMode.active &&
        konvaImages.find((img) => img.id === imageId)?.image?.complete === true
      )
    },
    [currentTool, canvasSelectionMode.active, konvaImages]
  )

  /**
   * Get image opacity based on selection mode
   */
  const getImageOpacity = useCallback(
    (imageId: string) => {
      if (canvasSelectionMode.active) {
        return activeImageRoles.some((r) => r.imageId === imageId) ? 1 : 0.5
      }
      return 1
    },
    [canvasSelectionMode.active, activeImageRoles]
  )

  /**
   * Clear selection when clicking empty space
   */
  const clearSelection = useCallback(() => {
    setSelectedId(null)
  }, [])

  /**
   * Upload image file to canvas
   */
  const handleImageFile = useCallback(
    async (file: File, x: number, y: number) => {
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }

      await uploadImageToCanvas(file, x, y)
    },
    [uploadImageToCanvas]
  )

  /**
   * Set transformer ref
   */
  const setTransformerRef = useCallback((ref: Konva.Transformer | null) => {
    transformerRef.current = ref
  }, [])

  /**
   * Get transformer configuration
   */
  const getTransformerConfig = useCallback(() => {
    return {
      ignoreStroke: true,
      rotateEnabled: true,
      resizeEnabled: true,
      anchorSize: 8,
      borderStroke: '#007bff',
      borderStrokeWidth: 2,
      anchorFill: '#ffffff',
      anchorStroke: '#007bff',
      anchorStrokeWidth: 2,
      anchorCornerRadius: 2,
      shouldOverdrawWholeArea: false,
      boundBoxFunc: (
        oldBox: { width: number; height: number },
        newBox: { width: number; height: number }
      ) => {
        // Limit resize to prevent negative values
        if (newBox.width < 5 || newBox.height < 5) {
          return oldBox
        }
        return newBox
      },
      keepRatio: false,
      enabledAnchors: [
        'top-left',
        'top-center',
        'top-right',
        'middle-right',
        'middle-left',
        'bottom-left',
        'bottom-center',
        'bottom-right',
      ],
      rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315],
    }
  }, [])

  return {
    // State
    konvaImages,
    selectedId,
    setSelectedId,
    canvasSelectionMode,
    activeImageRoles,
    transformerRef: transformerRef.current,
    draggingImageId,

    // Methods
    handleImageSelect,
    handleImageDelete,
    handleImageDuplicate,
    handleSendToImg2Img,
    handleImageDownload,
    handleImageDragStart,
    handleImageDragMove,
    handleImageDragEnd,
    handleImageTransformEnd,
    handleImageFile,
    clearSelection,
    setTransformerRef,

    // Utilities
    getImageBorderColor,
    isImageDraggable,
    getImageOpacity,
    getTransformerConfig,
    exportImageAsBase64,
  }
}
