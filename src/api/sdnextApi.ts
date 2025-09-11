import { AuthManager } from '../auth/core/AuthManager'
import type {
  ApiError,
  Txt2ImgPayload,
  Img2ImgPayload,
  GenerationApiResponse,
  Sampler,
  SdModel,
} from '../types/sdnext'

/**
 * Configuration options that can be sent to the SD API
 * This is a subset of common options - extend as needed
 */
interface SdOptions {
  sd_model_checkpoint?: string
  sd_vae?: string
  CLIP_stop_at_last_layers?: number
  sd_hypernetwork?: string
  sd_hypernetwork_strength?: number
  img2img_fix_steps?: boolean
  enable_hr?: boolean
  denoising_strength?: number
  firstphase_width?: number
  firstphase_height?: number
  hr_scale?: number
  hr_upscaler?: string
  hr_second_pass_steps?: number
  hr_resize_x?: number
  hr_resize_y?: number
  [key: string]: string | number | boolean | undefined
}

/**
 * A custom error class for API-related issues.
 * This helps in distinguishing API errors from other runtime errors.
 */
class ApiClientError extends Error {
  public response: Response
  public data: ApiError

  constructor(message: string, response: Response, data: ApiError) {
    super(message)
    this.name = 'ApiClientError'
    this.response = response
    this.data = data
  }
}

/**
 * A generic fetch wrapper for making API requests.
 * It handles common tasks like setting headers, stringifying the body,
 * and parsing the response. It also provides centralized error handling.
 * @param endpoint - The API endpoint to call.
 * @param options - The request options (method, body, etc.).
 * @returns A promise that resolves with the JSON response.
 * @throws {ApiClientError} if the request fails.
 */
async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // Get API URL and auth state from store
  const { useStore } = await import('../store/store')
  const apiSettings = useStore.getState().apiSettings
  const API_BASE_URL = apiSettings.apiUrl

  const url = `${API_BASE_URL}/${endpoint}`
  const defaultHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  const baseConfig: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  }

  // Enhance request with authentication
  const authManager = AuthManager.getInstance()
  const enhancedConfig = await authManager.enhanceRequest({
    ...baseConfig,
    url, // Include URL for HMAC signing
    method: baseConfig.method || 'GET',
  })

  try {
    const response = await fetch(url, enhancedConfig)

    // Process response through auth manager (handles token refresh, etc.)
    const processedResponse = await authManager.handleResponse(response)

    if (!processedResponse.ok) {
      const errorData: ApiError = await processedResponse.json().catch(() => ({
        error: 'Failed to parse error response',
        detail: `Status: ${processedResponse.status} ${processedResponse.statusText}`,
      }))
      throw new ApiClientError(
        `API request failed: ${processedResponse.status} ${processedResponse.statusText}`,
        processedResponse,
        errorData
      )
    }

    // Handle cases where the response might be empty
    const text = await processedResponse.text()
    return text ? JSON.parse(text) : ({} as T)
  } catch (error) {
    if (error instanceof ApiClientError) {
      // Re-throw custom API errors
      throw error
    }
    // Handle network errors or other unexpected issues
    console.error('Network or unexpected error:', error)
    throw new Error('A network error occurred. Please check your connection and the API server.')
  }
}

/**
 * A class-based API client for sdnext.
 * This approach allows for easy instantiation and extension.
 */
class SdnextApiClient {
  public async txt2img(payload: Txt2ImgPayload): Promise<GenerationApiResponse> {
    return fetchApi<GenerationApiResponse>('txt2img', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  public async img2img(payload: Img2ImgPayload): Promise<GenerationApiResponse> {
    return fetchApi<GenerationApiResponse>('img2img', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }
  public async getSamplers(): Promise<Sampler[]> {
    return fetchApi<Sampler[]>('samplers')
  }

  public async getSdModels(): Promise<SdModel[]> {
    return fetchApi<SdModel[]>('sd-models')
  }

  public async setOptions(payload: SdOptions): Promise<void> {
    return fetchApi<void>('options', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }
}

export const sdnextApi = new SdnextApiClient()
