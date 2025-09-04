import {
  AddImageCommand,
  RemoveImageCommand,
  MoveImageCommand,
  useHistoryStore,
} from '../historyStore'
import { imageStorage } from '../../services/storage'
import type { ImageData, ImageRole, CanvasSelectionMode, SliceCreator } from '../types'

// Store reference will be set after store creation to avoid circular dependency
let storeRef: any = null
export const setStoreRef = (store: any) => {
  storeRef = store
}

export interface CanvasSlice {
  // State
  images: ImageData[]
  activeImageRoles: ImageRole[]
  canvasSelectionMode: CanvasSelectionMode
  
  // Actions
  addImage: (image: ImageData) => void
  addImageDirect: (image: ImageData) => void
  removeImage: (id: string) => void
  removeImageDirect: (id: string) => void
  duplicateImage: (id: string) => void
  updateImagePosition: (id: string, x: number, y: number) => void
  updateImagePositionDirect: (id: string, x: number, y: number) => void
  setImageRole: (imageId: string, role: 'img2img_init' | 'inpaint_image' | 'controlnet' | null) => void
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
  },
  
  removeImage: (id: string) => {
    const image = get().images.find((img) => img.id === id)
    if (image && storeRef) {
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
              blobId: newId
            }
            
            get().addImage(newImage)
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
  
  updateImagePositionDirect: (id: string, x: number, y: number) => {
    // Use shallow equality check to prevent unnecessary re-renders
    const currentImage = get().images.find((img) => img.id === id)
    if (currentImage && (currentImage.x !== x || currentImage.y !== y)) {
      set((state) => ({
        images: state.images.map((img) => (img.id === id ? { ...img, x, y } : img)),
      }))
    }
  },
  
  setImageRole: (imageId: string, role: 'img2img_init' | 'inpaint_image' | 'controlnet' | null) => {
    set((state) => {
      // Remove any existing role for this specific image
      const newRoles = state.activeImageRoles.filter((r) => r.imageId !== imageId)
      
      // Add the new role if one was specified (not null)
      if (role && imageId) {
        newRoles.push({ imageId, role })
      }

      // Update image metadata
      const images = state.images.map((img) => {
        if (img.id === imageId && img.metadata) {
          if (role) {
            img.metadata.usedIn?.add(role)
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
    set({ activeImageRoles: [] })
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
        img.onload = () => resolve({ width: img.width, height: img.height })
        img.src = URL.createObjectURL(file)
      })
      
      // Store the image
      const storedImage = await imageStorage.createFromFile(
        imageId,
        file,
        {
          type: 'uploaded',
          width: dimensions.width,
          height: dimensions.height,
          usedIn: new Set()
        }
      )
      
      // Add to canvas
      const newImage: ImageData = {
        id: imageId,
        src: storedImage.objectUrl,
        x: x ?? Math.random() * (window.innerWidth - 400),
        y: y ?? Math.random() * (window.innerHeight - 200),
        width: dimensions.width,
        height: dimensions.height,
        metadata: storedImage.metadata,
        blobId: imageId,
        isTemporary: false
      }
      
      get().addImage(newImage)
      storeRef?.getState().updateStorageStats?.()
    } catch (error) {
      console.error('Failed to upload image:', error)
      alert('Failed to upload image')
    }
  }
})
