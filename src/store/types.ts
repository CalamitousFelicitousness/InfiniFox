import type { StateCreator } from 'zustand'
import type { Sampler, SdModel } from '../types/sdnext'
import type { ProgressMethod } from '../services/progress/ProgressService'

// Image related types
export interface ImageData {
  id: string
  src: string
  x: number
  y: number
  width?: number
  height?: number
  metadata?: {
    type: 'generated' | 'uploaded' | 'reference'
    usedIn?: Set<'img2img' | 'inpaint' | 'controlnet'>
  }
}

export interface ImageRole {
  imageId: string
  role: 'img2img' | 'inpaint' | 'controlnet'
}

export interface CanvasSelectionMode {
  active: boolean
  mode: 'img2img' | 'inpaint' | 'controlnet' | null
  callback?: (imageId: string, imageSrc: string) => void
}

// API related types
export interface ApiSettings {
  apiUrl: string
  wsUrl: string
  progressMethod: ProgressMethod
  apiType: 'sdnext' | 'a1111' | 'comfyui' | 'custom'
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
  
  // All actions from slices will be added here
  [key: string]: any
}

// Helper type for creating slices
export type SliceCreator<T> = StateCreator<
  AppState,
  [],
  [],
  T
>
