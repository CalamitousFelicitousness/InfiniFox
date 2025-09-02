import {
  AddImageCommand,
  RemoveImageCommand,
  MoveImageCommand,
  useHistoryStore,
} from '../historyStore'
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
  setImageRole: (imageId: string, role: 'img2img' | 'inpaint' | 'controlnet' | null) => void
  getImageRole: (imageId: string) => string | null
  clearImageRoles: () => void
  setImageAsInput: (src: string) => void
  startCanvasSelection: (
    mode: 'img2img' | 'inpaint' | 'controlnet',
    callback: (imageId: string, imageSrc: string) => void
  ) => void
  cancelCanvasSelection: () => void
  clearCanvas: () => void
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
  
  setImageRole: (imageId: string, role: 'img2img' | 'inpaint' | 'controlnet' | null) => {
    set((state) => {
      const newRoles = state.activeImageRoles.filter((r) => r.role !== role)
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
      get().setImageRole(image.id, 'img2img')
    }
  },
  
  startCanvasSelection: (
    mode: 'img2img' | 'inpaint' | 'controlnet',
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
  
  clearCanvas: () => {
    set({ images: [] })
  },
})
