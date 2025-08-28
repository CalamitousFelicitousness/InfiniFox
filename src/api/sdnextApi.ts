import type {
  ApiError,
  Txt2ImgPayload,
  Img2ImgPayload,
  GenerationApiResponse,
  Sampler,
  SdModel,
} from '../types/sdnext'

// It's a good practice to have the API URL configurable.
// For now, we'll use a default value that can be overridden by an environment variable.
const API_BASE_URL = import.meta.env.VITE_SDNEXT_API_URL || 'http://127.0.0.1:7860/sdapi/v1'

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
  const url = `${API_BASE_URL}/${endpoint}`
  const defaultHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  }

  try {
    const response = await fetch(url, config)

    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        error: 'Failed to parse error response',
        detail: `Status: ${response.status} ${response.statusText}`,
      }))
      throw new ApiClientError(
        `API request failed: ${response.status} ${response.statusText}`,
        response,
        errorData
      )
    }

    // Handle cases where the response might be empty
    const text = await response.text()
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

  public async setOptions(payload: Record<string, any>): Promise<void> {
    return fetchApi<void>('options', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }
}

export const sdnextApi = new SdnextApiClient()
