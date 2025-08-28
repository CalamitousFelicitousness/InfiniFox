/**
 * Represents the structure of a generic API error response.
 */
export interface ApiError {
  error: string
  detail?: string
  body?: string
  errors?: string
}

/**
 * Defines the payload for Text-to-Image API requests.
 */
export interface Txt2ImgPayload {
  prompt: string
  negative_prompt?: string
  seed?: number
  steps?: number
  width?: number
  height?: number
  cfg_scale?: number
  sampler_name?: string
  batch_size?: number
  n_iter?: number
}

export interface Img2ImgPayload extends Txt2ImgPayload {
  init_images: string[] // Array of base64 encoded images
  denoising_strength?: number
}

export interface GenerationApiResponse {
  images: string[] // Array of base64 encoded image strings
  parameters: Record<string, any>
  info: string // A JSON string containing generation info
}

export interface Sampler {
  name: string
  aliases: string[]
  options: Record<string, any>
}

export interface SdModel {
  title: string
  model_name: string
  hash: string
  filename: string
}
