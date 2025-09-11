import type { StateCreator } from 'zustand'

import type { ProgressMethod } from '../services/progress/ProgressService'
import type { Sampler, SdModel } from '../types/sdnext'

// Updated Image type to use Object URLs
export interface ImageData {
  id: string
  src: string // This will now be an Object URL instead of base64
  x: number
  y: number
  width?: number
  height?: number
  scaleX?: number
  scaleY?: number
  rotation?: number
  metadata?: {
    type: 'generated' | 'uploaded' | 'reference'
    prompt?: string
    negativePrompt?: string
    seed?: number
    steps?: number
    cfgScale?: number
    sampler?: string
    denoisingStrength?: number
    usedIn?: Set<'img2img_init' | 'inpaint_image' | 'controlnet'>
  }
  // New fields for storage management
  blobId?: string // Reference to blob in storage service
  isTemporary?: boolean // Flag for images not yet persisted
}

export interface ImageRole {
  imageId: string
  role: 'img2img_init' | 'inpaint_image' | 'controlnet'
}

export interface CanvasSelectionMode {
  active: boolean
  mode: 'img2img_init' | 'inpaint_image' | 'controlnet' | null
  callback?: (imageId: string, imageSrc: string) => void
}

// API related types
export interface ApiSettings {
  apiUrl: string
  wsUrl: string
  progressMethod: ProgressMethod
  apiType: 'sdnext' | 'a1111' | 'comfyui' | 'custom'
}

// Drawing types
export interface DrawingStroke {
  id: string
  points: number[]
  color: string
  strokeWidth: number
  globalCompositeOperation: string // Konva composite operation type
  opacity: number
  outline?: number[][]
}

// Inpaint params type
export interface InpaintParams {
  baseImage: string
  maskImage: string
  denoisingStrength: number
  maskBlur: number
  inpaintingFill: string
  inpaintFullRes: boolean
  inpaintFullResPadding: number
}

// Slice interfaces will be defined in their respective files
// This is the combined app state type
export interface AppState {
  // Generation parameters
  prompt: string
  negativePrompt: string
  seed: number
  steps: number
  cfgScale: number
  width: number
  height: number

  // Model/Sampler
  sampler: string
  samplers: Sampler[]
  sdModel: string
  sdModels: SdModel[]

  // Canvas/Images
  images: ImageData[]
  activeImageRoles: ImageRole[]
  canvasSelectionMode: CanvasSelectionMode

  // API
  apiSettings: ApiSettings
  isLoading: boolean

  // Storage management
  storageStats?: {
    imageCount: number
    totalSize: number
    memoryUrls: number
  }

  // All actions from slices will be added here through intersection types
}

// Helper type for creating slices
export type SliceCreator<T> = StateCreator<AppState, [], [], T>

// Store type for slices that need full store reference
export type Store = AppState
