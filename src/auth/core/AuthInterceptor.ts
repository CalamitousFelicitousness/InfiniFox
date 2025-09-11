/**
 * Request/response interceptor for auth operations
 */

import { AuthStrategy } from '../strategies/base/AuthStrategy'
import { AuthError, TokenExpiredError, UnauthorizedError } from '../types/errors.types'
import { AuthLogger } from '../utils/AuthLogger'

export interface InterceptorConfig {
  retryOnAuthError?: boolean
  maxRetries?: number
  retryDelay?: number
  onAuthError?: (error: AuthError) => void
  onTokenRefresh?: (token: string) => void
}

export class AuthInterceptor {
  private strategy: AuthStrategy | null = null
  private config: InterceptorConfig
  private logger: AuthLogger
  private retryCount: Map<string, number> = new Map()

  constructor(config: InterceptorConfig = {}) {
    this.config = {
      retryOnAuthError: true,
      maxRetries: 3,
      retryDelay: 1000,
      ...config,
    }
    this.logger = new AuthLogger('AuthInterceptor')
  }

  setStrategy(strategy: AuthStrategy | null): void {
    this.strategy = strategy
    this.retryCount.clear()
  }

  async enhanceRequest(request: RequestInit): Promise<RequestInit> {
    if (!this.strategy) {
      return request
    }

    try {
      return await this.strategy.enhanceRequest(request)
    } catch (error) {
      this.logger.error('Failed to enhance request', error)
      throw error
    }
  }

  async handleResponse(response: Response, originalRequest?: RequestInit): Promise<Response> {
    const requestId = this.getRequestId(response.url)

    // Handle successful responses
    if (response.ok) {
      this.retryCount.delete(requestId)
      return response
    }

    // Handle auth-related error responses
    if (response.status === 401 || response.status === 403) {
      return this.handleAuthError(response, originalRequest, requestId)
    }

    // Handle rate limiting
    if (response.status === 429) {
      return this.handleRateLimit(response, originalRequest, requestId)
    }

    return response
  }

  private async handleAuthError(
    response: Response,
    originalRequest?: RequestInit,
    requestId?: string
  ): Promise<Response> {
    if (!this.strategy || !this.config.retryOnAuthError || !originalRequest || !requestId) {
      const error =
        response.status === 401
          ? new UnauthorizedError()
          : new UnauthorizedError('Access forbidden')

      if (this.config.onAuthError) {
        this.config.onAuthError(error)
      }

      return response
    }

    const retries = this.retryCount.get(requestId) || 0

    if (retries >= (this.config.maxRetries || 3)) {
      this.retryCount.delete(requestId)
      const error = new TokenExpiredError('Max retries exceeded')

      if (this.config.onAuthError) {
        this.config.onAuthError(error)
      }

      return response
    }

    // Attempt token refresh
    try {
      const refreshResult = await this.strategy.refreshToken()

      if (refreshResult?.success && refreshResult.token) {
        this.logger.info('Token refreshed successfully')

        if (this.config.onTokenRefresh) {
          this.config.onTokenRefresh(refreshResult.token)
        }

        // Retry request with new token
        this.retryCount.set(requestId, retries + 1)
        const enhancedRequest = await this.enhanceRequest(originalRequest)

        return fetch(response.url, enhancedRequest)
      }
    } catch (error) {
      this.logger.error('Token refresh failed', error)
    }

    this.retryCount.delete(requestId)
    return response
  }

  private async handleRateLimit(
    response: Response,
    originalRequest?: RequestInit,
    requestId?: string
  ): Promise<Response> {
    if (!originalRequest || !requestId) {
      return response
    }

    const retryAfter = response.headers.get('Retry-After')
    const delay = retryAfter ? parseInt(retryAfter) * 1000 : this.config.retryDelay || 1000

    const retries = this.retryCount.get(requestId) || 0

    if (retries >= (this.config.maxRetries || 3)) {
      this.retryCount.delete(requestId)
      return response
    }

    this.logger.info(`Rate limited, retrying after ${delay}ms`)

    await new Promise((resolve) => setTimeout(resolve, delay))

    this.retryCount.set(requestId, retries + 1)
    return fetch(response.url, originalRequest)
  }

  private getRequestId(url: string): string {
    return `${url}_${Date.now()}`
  }

  clearRetryCount(): void {
    this.retryCount.clear()
  }
}
