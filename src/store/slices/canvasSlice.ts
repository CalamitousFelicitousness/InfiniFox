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

export interface CanvasSlice {
  // State
  images: ImageData[]
  activeImageRoles: ImageRole[]
  canvasSelectionMode: CanvasSelectionMode
  canvasViewport: CanvasViewport
  generationFrames: GenerationFrame[]
  
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
  updateCanvasViewport: (scale: number, position: { x: number; y: number }) => void
  // Generation frame actions
  addGenerationFrame: (x: number, y: number, width: number, height: number, isPlaceholder?: boolean) => string
  removeGenerationFrame: (id: string) => void
  updateGenerationFrame: (id: string, updates: Partial<GenerationFrame>) => void
  clearGenerationFrames: () => void
  getNextEmptyFrame: () => GenerationFrame | null
  updateFramePosition: (id: string, x: number, y: number) => void
  updateFrameSize: (id: string, width: number, height: number) => void
  lockFrame: (id: string, locked: boolean) => void
  labelFrame: (id: string, label: string) => void
  convertPlaceholderToActive: (id: string) => void
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
    position: { x: 0, y: 0 }
  },
  generationFrames: [],
  
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
      imageStorage.updateImagePosition(image.blobId, image.x, image.y).catch(error => {
        console.error('Failed to persist initial image position:', error)
      })
    }
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
  
  updateImagePositionDirect: (id: string, x: number, y: number) => {
    // Use shallow equality check to prevent unnecessary re-renders
    const currentImage = get().images.find((img) => img.id === id)
    if (currentImage && (currentImage.x !== x || currentImage.y !== y)) {
      set((state) => ({
        images: state.images.map((img) => (img.id === id ? { ...img, x, y } : img)),
      }))
      
      // Save position to IndexedDB if image has a blobId
      if (currentImage.blobId) {
        imageStorage.updateImagePosition(currentImage.blobId, x, y).catch(error => {
          console.error('Failed to persist image position:', error)
        })
      }
    }
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
        images 
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
  },
  
  /**
   * Update canvas viewport (zoom and pan position)
   */
  updateCanvasViewport: (scale: number, position: { x: number; y: number }) => {
    set({ 
      canvasViewport: { scale, position } 
    })
  },
  
  // Generation frame actions
  addGenerationFrame: (x: number, y: number, width: number, height: number, isPlaceholder = false) => {
    const id = `frame-${Date.now()}`
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
    set((state) => ({
      generationFrames: state.generationFrames.filter((f) => f.id !== id),
    }))
  },
  
  updateGenerationFrame: (id: string, updates: Partial<GenerationFrame>) => {
    set((state) => ({
      generationFrames: state.generationFrames.map((f) =>
        f.id === id ? { ...f, ...updates } : f
      ),
    }))
  },
  
  clearGenerationFrames: () => {
    set({ generationFrames: [] })
  },
  
  getNextEmptyFrame: () => {
    const frames = get().generationFrames
    return frames.find(f => f.isPlaceholder && !f.isGenerating && !f.error) || null
  },
  
  updateFramePosition: (id: string, x: number, y: number) => {
    set((state) => ({
      generationFrames: state.generationFrames.map((f) =>
        f.id === id ? { ...f, x, y } : f
      ),
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
      generationFrames: state.generationFrames.map((f) =>
        f.id === id ? { ...f, locked } : f
      ),
    }))
  },
  
  labelFrame: (id: string, label: string) => {
    set((state) => ({
      generationFrames: state.generationFrames.map((f) =>
        f.id === id ? { ...f, label } : f
      ),
    }))
  },
  
  convertPlaceholderToActive: (id: string) => {
    set((state) => ({
      generationFrames: state.generationFrames.map((f) =>
        f.id === id ? { ...f, isPlaceholder: false, isGenerating: true } : f
      ),
    }))
  },
})
