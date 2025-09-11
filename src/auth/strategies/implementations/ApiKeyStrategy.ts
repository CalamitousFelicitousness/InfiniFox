/**
 * API Key authentication strategy
 */

import type {
  AuthType,
  AuthCredentials,
  AuthResult,
  ValidationResult,
  TokenInfo,
} from '../../types/auth.types'
import type { ApiKeyConfig, ApiKeyCredentials } from '../../types/strategy.types'
import { AuthStrategy } from '../base/AuthStrategy'
import type { StrategyConfig } from '../base/AuthStrategy'
import { AuthValidation } from '../base/AuthValidation'

export class ApiKeyStrategy extends AuthStrategy {
  private apiKey: string | null = null
  private apiKeyConfig: ApiKeyConfig

  constructor(config: ApiKeyConfig & StrategyConfig = {}) {
    super(config)
    this.apiKeyConfig = {
      headerName: config.headerName || 'X-API-Key',
      queryParam: config.queryParam,
      prefix: config.prefix,
    }
  }

  get type(): AuthType {
    return 'apiKey'
  }

  get requiresCredentials(): boolean {
    return true
  }

  async authenticate(credentials?: AuthCredentials): Promise<AuthResult> {
    const apiKeyCredentials = credentials as ApiKeyCredentials

    if (!apiKeyCredentials?.apiKey) {
      return {
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'API key is required',
          timestamp: new Date(),
          retry: false,
        },
      }
    }

    this.apiKey = apiKeyCredentials.apiKey

    const tokenInfo: TokenInfo = {
      token: this.apiKey,
      type: 'apiKey',
      issuedAt: new Date(),
    }

    this.setTokenInfo(tokenInfo)

    this.logger.info('API key authentication successful')

    return {
      success: true,
      token: this.apiKey,
      metadata: {
        headerName: this.apiKeyConfig.headerName,
        hasPrefix: !!this.apiKeyConfig.prefix,
      },
    }
  }

  async enhanceRequest(request: RequestInit): Promise<RequestInit> {
    if (!this.apiKey) {
      return request
    }

    const enhancedRequest = { ...request }

    if (this.apiKeyConfig.queryParam) {
      // Add API key as query parameter
      const url = new URL(request.url || window.location.href)
      url.searchParams.set(this.apiKeyConfig.queryParam, this.apiKey)
      ;(enhancedRequest as RequestInit & { url?: string }).url = url.toString()
    } else {
      // Add API key as header
      const headers = new Headers(enhancedRequest.headers || {})
      const value = this.apiKeyConfig.prefix
        ? `${this.apiKeyConfig.prefix} ${this.apiKey}`
        : this.apiKey

      headers.set(this.apiKeyConfig.headerName!, value)
      enhancedRequest.headers = headers
    }

    return enhancedRequest
  }

  validateCredentials(credentials: unknown): ValidationResult {
    if (!credentials) {
      return {
        valid: false,
        errors: ['Credentials are required'],
      }
    }

    const apiKeyCredentials = credentials as ApiKeyCredentials

    if (!apiKeyCredentials.apiKey) {
      return {
        valid: false,
        errors: ['API key is required'],
      }
    }

    const validation = AuthValidation.validateString(apiKeyCredentials.apiKey, 'API key', 1, 1000)

    return validation
  }

  async onDeactivate(): Promise<void> {
    await super.onDeactivate()
    this.apiKey = null
  }

  getConfig(): ApiKeyConfig {
    return { ...this.apiKeyConfig }
  }

  updateConfig(config: Partial<ApiKeyConfig>): void {
    this.apiKeyConfig = { ...this.apiKeyConfig, ...config }
  }
}
