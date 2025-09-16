import { imageStorage } from '../../services/storage'
import {
  AddImageCommand,
  RemoveImageCommand,
  MoveImageCommand,
  useHistoryStore,
} from '../historyStore'
import {
  BatchMoveCommand,
  BatchTransformCommand,
  BatchDeleteCommand,
  BatchDuplicateCommand,
  BatchZIndexCommand,
} from '../commands/BatchCommands'
import type { ImageData, ImageRole, CanvasSelectionMode, SliceCreator } from '../types'

// Store reference will be set after store creation to avoid circular dependency
type StoreRef = {
  getState: () => {
    addImageDirect: (image: ImageData) => void
    removeImageDirect: (id: string) => void
    updateImagePositionDirect: (id: string, x: number, y: number) => void
    updateImageTransform: (
      id: string,
      transform: { x: number; y: number; scaleX: number; scaleY: number; rotation: number }
    ) => void
    updateStorageStats?: () => void
  }
}

let storeRef: StoreRef | null = null
export const setStoreRef = (store: StoreRef) => {
  storeRef = store
}

export interface GenerationFrame {
  id: string
  x: number
  y: number
  width: number
  height: number
  progress: number
  previewImage?: string
  isGenerating: boolean
  error?: string
  isPlaceholder?: boolean
  locked?: boolean
  label?: string
}

export interface CanvasViewport {
  scale: number
  position: { x: number; y: number }
}

export interface Transform {
  x?: number
  y?: number
  scaleX?: number
  scaleY?: number
  rotation?: number
}

export interface CanvasSlice {
  // State
  images: ImageData[]
  activeImageRoles: ImageRole[]
  canvasSelectionMode: CanvasSelectionMode
  canvasViewport: CanvasViewport
  generationFrames: GenerationFrame[]
  activeGenerationFrameId: string | null

  // Actions
  addImage: (image: ImageData) => void
  addImageDirect: (image: ImageData) => void
  removeImage: (id: string) => void
  removeImageDirect: (id: string) => void
  duplicateImage: (id: string) => void
  updateImagePosition: (id: string, x: number, y: number) => void
  updateImagePositionDirect: (id: string, x: number, y: number) => void
  updateImageDimensions: (id: string, width: number, height: number) => void
  updateImageTransform: (
    id: string,
    transform: { x: number; y: number; scaleX: number; scaleY: number; rotation: number }
  ) => void
  
  // Multi-selection batch operations
  batchUpdatePositions: (updates: Array<{id: string, x: number, y: number}>) => void
  batchUpdatePositionsWithHistory: (updates: Array<{id: string, x: number, y: number}>) => void
  batchUpdateTransforms: (updates: Array<{id: string, transform: Transform}>) => void
  batchRemoveImages: (ids: string[]) => void
  batchDuplicateImages: (ids: string[]) => void
  
  // Selection-aware operations with history
  moveSelectedImages: (deltaX: number, deltaY: number) => void
  moveSelectedImagesWithHistory: (deltaX: number, deltaY: number) => void
  transformSelectedImages: (transform: Transform) => void
  transformSelectedImagesWithHistory: (transform: Transform) => void
  deleteSelectedImages: () => void
  deleteSelectedImagesWithHistory: () => void
  duplicateSelectedImages: () => void
  duplicateSelectedImagesWithHistory: () => void
  
  // Z-index management
  bringToFront: (ids: string[]) => void
  sendToBack: (ids: string[]) => void
  bringForward: (ids: string[]) => void
  sendBackward: (ids: string[]) => void
  setImageRole: (
    imageId: string,
    role: 'img2img_init' | 'inpaint_image' | 'controlnet' | null
  ) => void
  getImageRole: (imageId: string) => string | null
  clearImageRoles: () => void
  setImageAsInput: (src: string) => void
  startCanvasSelection: (
    mode: 'img2img_init' | 'inpaint_image' | 'controlnet',
    callback: (imageId: string, imageSrc: string) => void
  ) => void
  cancelCanvasSelection: () => void
  clearCanvas: () => void
  exportImageAsBase64: (id: string) => Promise<string>
  uploadImageToCanvas: (file: File, x?: number, y?: number) => Promise<void>
  updateCanvasViewport: (scale: number, position: { x: number; y: number }) => void
  // Generation frame actions
  addGenerationFrame: (
    x: number,
    y: number,
    width: number,
    height: number,
    isPlaceholder?: boolean
  ) => string
  removeGenerationFrame: (id: string) => void
  updateGenerationFrame: (id: string, updates: Partial<GenerationFrame>) => void
  clearGenerationFrames: () => void
  getNextEmptyFrame: () => GenerationFrame | null
  updateFramePosition: (id: string, x: number, y: number) => void
  updateFrameSize: (id: string, width: number, height: number) => void
  lockFrame: (id: string, locked: boolean) => void
  labelFrame: (id: string, label: string) => void
  convertPlaceholderToActive: (id: string) => void
  setActiveGenerationFrameId: (id: string | null) => void
}

export const createCanvasSlice: SliceCreator<CanvasSlice> = (set, get) => ({
  // Initial state
  images: [],
  activeImageRoles: [],
  canvasSelectionMode: {
    active: false,
    mode: null,
    callback: undefined,
  },
  canvasViewport: {
    scale: 1,
    position: { x: 0, y: 0 },
  },
  generationFrames: [],
  activeGenerationFrameId: null,

  // Actions
  addImage: (image: ImageData) => {
    if (!storeRef) {
      console.error('Store reference not set in canvasSlice')
      return
    }
    const command = new AddImageCommand(image, storeRef)
    useHistoryStore.getState().executeCommand(command)
  },

  addImageDirect: (image: ImageData) => {
    set((state) => ({ images: [...state.images, image] }))

    // Save initial position to IndexedDB if image has a blobId
    if (image.blobId) {
      imageStorage.updateImagePosition(image.blobId, image.x, image.y).catch((error) => {
        console.error('Failed to persist initial image position:', error)
      })
    }
  },

  removeImage: (id: string) => {
    const image = get().images.find((img) => img.id === id)
    if (image && storeRef) {
      // Revoke blob URL immediately if it's a blob URL
      if (image.src.startsWith('blob:')) {
        URL.revokeObjectURL(image.src)
        console.log(`Revoked blob URL for image ${id}`)
      }

      const command = new RemoveImageCommand(image, storeRef)
      useHistoryStore.getState().executeCommand(command)

      // Clean up storage when removing image
      if (image.blobId) {
        imageStorage.deleteImage(image.blobId).catch(console.error)

        // Update storage stats
        storeRef.getState().updateStorageStats?.()
      }
    }
  },

  removeImageDirect: (id: string) => {
    const image = get().images.find((img) => img.id === id)

    // Revoke blob URL immediately if it's a blob URL
    if (image?.src.startsWith('blob:')) {
      URL.revokeObjectURL(image.src)
      console.log(`Revoked blob URL for image ${id}`)
    }

    // Clean up storage
    if (image?.blobId) {
      imageStorage.deleteImage(image.blobId).catch(console.error)
    }

    set((state) => ({
      images: state.images.filter((img) => img.id !== id),
    }))
  },

  duplicateImage: async (id: string) => {
    const { images } = get()
    const originalImage = images.find((img) => img.id === id)
    if (originalImage) {
      const newId = `img-${Date.now()}`

      // If the image has a blob ID, duplicate it in storage
      if (originalImage.blobId) {
        try {
          const storedImage = await imageStorage.loadFromIndexedDB(originalImage.blobId)
          if (storedImage) {
            // Create a new stored image with the same blob
            const duplicatedImage = await imageStorage.createFromBase64(
              newId,
              await imageStorage.exportAsBase64(originalImage.blobId),
              { ...storedImage.metadata }
            )

            const newImage: ImageData = {
              ...originalImage,
              id: newId,
              src: duplicatedImage.objectUrl,
              x: originalImage.x + 50,
              y: originalImage.y + 50,
              width: originalImage.width,
              height: originalImage.height,
              blobId: newId,
            }

            get().addImage(newImage)
            // Position will be saved by addImageDirect
            storeRef?.getState().updateStorageStats?.()
          }
        } catch (error) {
          console.error('Failed to duplicate image:', error)
        }
      } else {
        // Fallback for images without blob storage
        const newImage = {
          ...originalImage,
          id: newId,
          x: originalImage.x + 50,
          y: originalImage.y + 50,
        }
        get().addImage(newImage)
      }
    }
  },

  updateImagePosition: (id: string, x: number, y: number) => {
    const image = get().images.find((img) => img.id === id)
    if (image && storeRef) {
      const oldPos = { x: image.x, y: image.y }
      const command = new MoveImageCommand(id, oldPos, { x, y }, storeRef)
      useHistoryStore.getState().executeCommand(command)
    }
  },

  updateImageTransform: (
    id: string,
    transform: { x: number; y: number; scaleX: number; scaleY: number; rotation: number }
  ) => {
    set((state) => ({
      images: state.images.map((img) => (img.id === id ? { ...img, ...transform } : img)),
    }))

    // Save transform to IndexedDB if image has a blobId
    const image = get().images.find((img) => img.id === id)
    if (image?.blobId) {
      imageStorage.updateImagePosition(image.blobId, transform.x, transform.y).catch((error) => {
        console.error('Failed to persist image transform:', error)
      })
    }
  },

  updateImagePositionDirect: (id: string, x: number, y: number) => {
    // Use shallow equality check to prevent unnecessary re-renders
    const currentImage = get().images.find((img) => img.id === id)
    if (currentImage && (currentImage.x !== x || currentImage.y !== y)) {
      set((state) => ({
        images: state.images.map((img) => (img.id === id ? { ...img, x, y } : img)),
      }))

      // Save position to IndexedDB if image has a blobId
      if (currentImage.blobId) {
        imageStorage.updateImagePosition(currentImage.blobId, x, y).catch((error) => {
          console.error('Failed to persist image position:', error)
        })
      }
    }
  },

  updateImageDimensions: (id: string, width: number, height: number) => {
    set((state) => ({
      images: state.images.map((img) => 
        img.id === id ? { ...img, width, height } : img
      ),
    }))
  },

  setImageRole: (imageId: string, role: 'img2img_init' | 'inpaint_image' | 'controlnet' | null) => {
    set((state) => {
      let newRoles = [...state.activeImageRoles]

      if (role) {
        // Check if another image already has this role
        const existingRole = newRoles.find((r) => r.role === role)
        if (existingRole && existingRole.imageId !== imageId) {
          console.log(`Transferring ${role} role from image ${existingRole.imageId} to ${imageId}`)
        }

        // Remove any existing image with this same role (only one image per role)
        newRoles = newRoles.filter((r) => r.role !== role)
        // Remove any existing role for this specific image
        newRoles = newRoles.filter((r) => r.imageId !== imageId)
        // Add the new role
        newRoles.push({ imageId, role })
      } else {
        // Remove role from this image (clearing role)
        newRoles = newRoles.filter((r) => r.imageId !== imageId)
      }

      // Update image metadata
      const images = state.images.map((img) => {
        // Clear metadata for any image that previously had this role
        if (role && img.id !== imageId && img.metadata?.usedIn?.has(role)) {
          img.metadata.usedIn.delete(role)
        }
        // Update metadata for the target image
        if (img.id === imageId && img.metadata) {
          if (role) {
            img.metadata.usedIn = img.metadata.usedIn || new Set()
            img.metadata.usedIn.add(role)
          } else {
            img.metadata.usedIn?.clear()
          }
        }
        return img
      })

      return { activeImageRoles: newRoles, images }
    })
  },

  getImageRole: (imageId: string) => {
    const role = get().activeImageRoles.find((r) => r.imageId === imageId)
    return role ? role.role : null
  },

  clearImageRoles: () => {
    set((state) => {
      // Clear all metadata usedIn sets
      const images = state.images.map((img) => {
        if (img.metadata?.usedIn) {
          img.metadata.usedIn.clear()
        }
        return img
      })

      return {
        activeImageRoles: [],
        images,
      }
    })
  },

  setImageAsInput: (src: string) => {
    // This will be used to send image to img2img panel
    console.log('Setting image as input for img2img:', src)
    // Find image by src and set its role
    const image = get().images.find((img) => img.src === src)
    if (image) {
      get().setImageRole(image.id, 'img2img_init')
    }
  },

  startCanvasSelection: (
    mode: 'img2img_init' | 'inpaint_image' | 'controlnet',
    callback: (imageId: string, imageSrc: string) => void
  ) => {
    set({
      canvasSelectionMode: {
        active: true,
        mode,
        callback,
      },
    })
  },

  cancelCanvasSelection: () => {
    set({
      canvasSelectionMode: {
        active: false,
        mode: null,
        callback: undefined,
      },
    })
  },

  clearCanvas: async () => {
    // Clean up all images from storage
    const { images } = get()
    for (const image of images) {
      // Revoke blob URL immediately if it's a blob URL
      if (image.src.startsWith('blob:')) {
        URL.revokeObjectURL(image.src)
        console.log(`Revoked blob URL for image ${image.id}`)
      }

      if (image.blobId) {
        await imageStorage.deleteImage(image.blobId).catch(console.error)
      }
    }

    set({ images: [] })
    storeRef?.getState().updateStorageStats?.()
  },

  /**
   * Export image as Base64 for API requests
   */
  exportImageAsBase64: async (id: string): Promise<string> => {
    const image = get().images.find((img) => img.id === id)
    if (!image) {
      throw new Error(`Image ${id} not found`)
    }

    if (image.blobId) {
      return await imageStorage.exportAsBase64(image.blobId)
    }

    // Fallback for images without blob storage (shouldn't happen in new system)
    if (image.src.startsWith('data:')) {
      return image.src.split(',')[1]
    }

    throw new Error(`Cannot export image ${id} as base64`)
  },

  /**
   * Upload an image file to the canvas
   */
  uploadImageToCanvas: async (file: File, x?: number, y?: number) => {
    try {
      const imageId = `img-${Date.now()}-uploaded`

      // Get image dimensions
      const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
        const img = new Image()
        const tempUrl = URL.createObjectURL(file)
        img.onload = () => {
          URL.revokeObjectURL(tempUrl) // Clean up temp URL
          resolve({ width: img.naturalWidth, height: img.naturalHeight })
        }
        img.src = tempUrl
      })

      // Store the image
      const storedImage = await imageStorage.createFromFile(imageId, file, {
        type: 'uploaded',
        width: dimensions.width,
        height: dimensions.height,
        usedIn: new Set(),
      })

      // Add to canvas with dimensions
      const newImage: ImageData = {
        id: imageId,
        src: storedImage.objectUrl,
        x: x ?? Math.random() * (window.innerWidth - 400),
        y: y ?? Math.random() * (window.innerHeight - 200),
        width: dimensions.width,
        height: dimensions.height,
        metadata: storedImage.metadata,
        blobId: imageId,
        isTemporary: false,
      }

      get().addImage(newImage)
      storeRef?.getState().updateStorageStats?.()
    } catch (error) {
      console.error('Failed to upload image:', error)
      alert('Failed to upload image')
    }
  },

  /**
   * Update canvas viewport (zoom and pan position)
   */
  updateCanvasViewport: (scale: number, position: { x: number; y: number }) => {
    set({
      canvasViewport: { scale, position },
    })
  },

  // Multi-selection batch operations
  batchUpdatePositions: (updates: Array<{id: string, x: number, y: number}>) => {
    console.log('canvasSlice.batchUpdatePositions called with:', updates)
    set((state) => ({
      images: state.images.map((img) => {
        const update = updates.find(u => u.id === img.id)
        if (update) {
          // Save position to IndexedDB if image has a blobId
          if (img.blobId) {
            imageStorage.updateImagePosition(img.blobId, update.x, update.y).catch((error) => {
              console.error('Failed to persist batch position update:', error)
            })
          }
          console.log(`Updating image ${img.id} from (${img.x}, ${img.y}) to (${update.x}, ${update.y})`)
          return { ...img, x: update.x, y: update.y }
        }
        return img
      }),
    }))
  },

  batchUpdatePositionsWithHistory: (updates: Array<{id: string, x: number, y: number}>) => {
    if (updates.length === 0 || !storeRef) return
    
    const state = get()
    const moveData = updates.map(update => {
      const img = state.images.find(i => i.id === update.id)
      if (img) {
        return {
          id: update.id,
          oldPosition: { x: img.x, y: img.y },
          newPosition: { x: update.x, y: update.y }
        }
      }
      return null
    }).filter(Boolean) as Array<{
      id: string
      oldPosition: {x: number, y: number}
      newPosition: {x: number, y: number}
    }>
    
    if (moveData.length > 0) {
      const command = new BatchMoveCommand(moveData, storeRef)
      useHistoryStore.getState().executeCommand(command)
    }
  },

  batchUpdateTransforms: (updates: Array<{id: string, transform: Transform}>) => {
    set((state) => ({
      images: state.images.map((img) => {
        const update = updates.find(u => u.id === img.id)
        if (update) {
          // Save transform to IndexedDB if image has a blobId
          if (img.blobId && update.transform.x !== undefined && update.transform.y !== undefined) {
            imageStorage.updateImagePosition(img.blobId, update.transform.x, update.transform.y).catch((error) => {
              console.error('Failed to persist batch transform:', error)
            })
          }
          return { ...img, ...update.transform }
        }
        return img
      }),
    }))
  },

  batchRemoveImages: async (ids: string[]) => {
    const { images } = get()
    const imagesToRemove = images.filter((img) => ids.includes(img.id))
    
    // Clean up blob URLs and storage
    for (const image of imagesToRemove) {
      if (image.src.startsWith('blob:')) {
        URL.revokeObjectURL(image.src)
        console.log(`Revoked blob URL for image ${image.id}`)
      }
      if (image.blobId) {
        await imageStorage.deleteImage(image.blobId).catch(console.error)
      }
    }
    
    set((state) => ({
      images: state.images.filter((img) => !ids.includes(img.id)),
    }))
    
    storeRef?.getState().updateStorageStats?.()
  },

  batchDuplicateImages: async (ids: string[]) => {
    const { images } = get()
    const newImages: ImageData[] = []
    
    for (const id of ids) {
      const originalImage = images.find((img) => img.id === id)
      if (originalImage) {
        const newId = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        
        if (originalImage.blobId) {
          try {
            const storedImage = await imageStorage.loadFromIndexedDB(originalImage.blobId)
            if (storedImage) {
              const duplicatedImage = await imageStorage.createFromBase64(
                newId,
                await imageStorage.exportAsBase64(originalImage.blobId),
                { ...storedImage.metadata }
              )
              
              newImages.push({
                ...originalImage,
                id: newId,
                src: duplicatedImage.objectUrl,
                x: originalImage.x + 50,
                y: originalImage.y + 50,
                blobId: newId,
                selected: false,
              })
            }
          } catch (error) {
            console.error('Failed to duplicate image:', error)
          }
        } else {
          newImages.push({
            ...originalImage,
            id: newId,
            x: originalImage.x + 50,
            y: originalImage.y + 50,
            selected: false,
          })
        }
      }
    }
    
    set((state) => ({
      images: [...state.images, ...newImages],
    }))
    
    storeRef?.getState().updateStorageStats?.()
  },

  // Selection-aware operations with direct updates (for real-time dragging)
  moveSelectedImages: (deltaX: number, deltaY: number) => {
    const state = get() as any
    const selectedIds = state.selectedIds || new Set<string>()
    const updates = Array.from(selectedIds).map((id) => {
      const img = state.images.find((i: ImageData) => i.id === id)
      if (img) {
        return { id, x: img.x + deltaX, y: img.y + deltaY }
      }
      return null
    }).filter(Boolean) as Array<{id: string, x: number, y: number}>
    
    if (updates.length > 0) {
      get().batchUpdatePositions(updates)
    }
  },

  // Selection-aware operations with history support
  moveSelectedImagesWithHistory: (deltaX: number, deltaY: number) => {
    const state = get() as any
    const selectedIds = state.selectedIds || new Set<string>()
    const updates = Array.from(selectedIds).map((id) => {
      const img = state.images.find((i: ImageData) => i.id === id)
      if (img) {
        return { 
          id, 
          oldPosition: { x: img.x, y: img.y },
          newPosition: { x: img.x + deltaX, y: img.y + deltaY }
        }
      }
      return null
    }).filter(Boolean) as Array<{id: string, oldPosition: {x: number, y: number}, newPosition: {x: number, y: number}}>
    
    if (updates.length > 0 && storeRef) {
      const command = new BatchMoveCommand(updates, storeRef)
      useHistoryStore.getState().executeCommand(command)
    }
  },

  transformSelectedImages: (transform: Transform) => {
    const state = get() as any
    const selectedIds = state.selectedIds || new Set<string>()
    const updates = Array.from(selectedIds).map((id) => ({
      id,
      transform,
    }))
    
    if (updates.length > 0) {
      get().batchUpdateTransforms(updates)
    }
  },

  transformSelectedImagesWithHistory: (transform: Transform) => {
    const state = get() as any
    const selectedIds = state.selectedIds || new Set<string>()
    const updates = Array.from(selectedIds).map((id) => {
      const img = state.images.find((i: ImageData) => i.id === id)
      if (img) {
        return {
          id,
          oldTransform: {
            x: img.x,
            y: img.y,
            scaleX: img.scaleX || 1,
            scaleY: img.scaleY || 1,
            rotation: img.rotation || 0,
          },
          newTransform: transform
        }
      }
      return null
    }).filter(Boolean) as Array<{id: string, oldTransform: Transform, newTransform: Transform}>
    
    if (updates.length > 0 && storeRef) {
      const command = new BatchTransformCommand(updates, storeRef)
      useHistoryStore.getState().executeCommand(command)
    }
  },

  deleteSelectedImages: () => {
    const state = get() as any
    const selectedIds = state.selectedIds || new Set<string>()
    if (selectedIds.size > 0) {
      get().batchRemoveImages(Array.from(selectedIds))
      // Clear selection after deletion
      if (state.deselectAll) {
        state.deselectAll()
      }
    }
  },

  deleteSelectedImagesWithHistory: () => {
    const state = get() as any
    const selectedIds = state.selectedIds || new Set<string>()
    if (selectedIds.size > 0 && storeRef) {
      const command = new BatchDeleteCommand(Array.from(selectedIds), storeRef)
      useHistoryStore.getState().executeCommand(command)
      // Clear selection after deletion
      if (state.deselectAll) {
        state.deselectAll()
      }
    }
  },

  duplicateSelectedImages: () => {
    const state = get() as any
    const selectedIds = state.selectedIds || new Set<string>()
    if (selectedIds.size > 0) {
      get().batchDuplicateImages(Array.from(selectedIds))
    }
  },

  duplicateSelectedImagesWithHistory: () => {
    const state = get() as any
    const selectedIds = state.selectedIds || new Set<string>()
    if (selectedIds.size > 0 && storeRef) {
      const command = new BatchDuplicateCommand(Array.from(selectedIds), storeRef)
      useHistoryStore.getState().executeCommand(command)
    }
  },

  // Z-index management
  bringToFront: (ids: string[]) => {
    set((state) => {
      const maxZIndex = Math.max(...state.images.map((img) => img.zIndex || 0), 0)
      return {
        images: state.images.map((img) => {
          if (ids.includes(img.id)) {
            return { ...img, zIndex: maxZIndex + 1 }
          }
          return img
        }),
      }
    })
  },

  sendToBack: (ids: string[]) => {
    set((state) => {
      const minZIndex = Math.min(...state.images.map((img) => img.zIndex || 0), 0)
      return {
        images: state.images.map((img) => {
          if (ids.includes(img.id)) {
            return { ...img, zIndex: minZIndex - 1 }
          }
          return img
        }),
      }
    })
  },

  bringForward: (ids: string[]) => {
    set((state) => ({
      images: state.images.map((img) => {
        if (ids.includes(img.id)) {
          return { ...img, zIndex: (img.zIndex || 0) + 1 }
        }
        return img
      }),
    }))
  },

  sendBackward: (ids: string[]) => {
    set((state) => ({
      images: state.images.map((img) => {
        if (ids.includes(img.id)) {
          return { ...img, zIndex: (img.zIndex || 0) - 1 }
        }
        return img
      }),
    }))
  },

  // Generation frame actions
  addGenerationFrame: (
    x: number,
    y: number,
    width: number,
    height: number,
    isPlaceholder = false
  ) => {
    const id = `frame-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    set((state) => ({
      generationFrames: [
        ...state.generationFrames,
        {
          id,
          x,
          y,
          width,
          height,
          progress: 0,
          isGenerating: false,
          isPlaceholder,
        },
      ],
    }))
    return id
  },

  removeGenerationFrame: (id: string) => {
    // Clean up preview image if it's a blob URL
    const frame = get().generationFrames.find((f) => f.id === id)
    if (frame?.previewImage?.startsWith('blob:')) {
      URL.revokeObjectURL(frame.previewImage)
      console.log(`Revoked blob URL for frame preview ${id}`)
    }

    set((state) => ({
      generationFrames: state.generationFrames.filter((f) => f.id !== id),
    }))
  },

  updateGenerationFrame: (id: string, updates: Partial<GenerationFrame>) => {
    // If updating preview image, revoke old blob URL
    if (updates.previewImage) {
      const frame = get().generationFrames.find((f) => f.id === id)
      if (frame?.previewImage?.startsWith('blob:')) {
        URL.revokeObjectURL(frame.previewImage)
        console.log(`Revoked old blob URL for frame preview ${id}`)
      }
    }

    set((state) => ({
      generationFrames: state.generationFrames.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    }))
  },

  clearGenerationFrames: () => {
    // Clean up all preview images
    const frames = get().generationFrames
    frames.forEach((frame) => {
      if (frame.previewImage?.startsWith('blob:')) {
        URL.revokeObjectURL(frame.previewImage)
        console.log(`Revoked blob URL for frame preview ${frame.id}`)
      }
    })

    set({ generationFrames: [] })
  },

  getNextEmptyFrame: () => {
    const frames = get().generationFrames
    return frames.find((f) => f.isPlaceholder && !f.isGenerating && !f.error) || null
  },

  updateFramePosition: (id: string, x: number, y: number) => {
    set((state) => ({
      generationFrames: state.generationFrames.map((f) => (f.id === id ? { ...f, x, y } : f)),
    }))
  },

  updateFrameSize: (id: string, width: number, height: number) => {
    set((state) => ({
      generationFrames: state.generationFrames.map((f) =>
        f.id === id ? { ...f, width, height } : f
      ),
    }))
  },

  lockFrame: (id: string, locked: boolean) => {
    set((state) => ({
      generationFrames: state.generationFrames.map((f) => (f.id === id ? { ...f, locked } : f)),
    }))
  },

  labelFrame: (id: string, label: string) => {
    set((state) => ({
      generationFrames: state.generationFrames.map((f) => (f.id === id ? { ...f, label } : f)),
    }))
  },

  convertPlaceholderToActive: (id: string) => {
    set((state) => ({
      generationFrames: state.generationFrames.map((f) =>
        f.id === id ? { ...f, isPlaceholder: false, isGenerating: true } : f
      ),
    }))
  },

  setActiveGenerationFrameId: (id: string | null) => {
    set({ activeGenerationFrameId: id })
  },
})
