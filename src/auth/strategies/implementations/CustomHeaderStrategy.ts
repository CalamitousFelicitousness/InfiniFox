/**
 * Custom header authentication strategy for flexible auth schemes
 */

import type {
  AuthType,
  AuthCredentials,
  AuthResult,
  ValidationResult,
  TokenInfo,
} from '../../types/auth.types'
import type { CustomHeaderConfig } from '../../types/strategy.types'
import { AuthStrategy } from '../base/AuthStrategy'
import type { StrategyConfig } from '../base/AuthStrategy'

export class CustomHeaderStrategy extends AuthStrategy {
  private headerConfig: CustomHeaderConfig
  private resolvedHeaders: Record<string, string> = {}

  constructor(config: CustomHeaderConfig & StrategyConfig) {
    super(config)
    this.headerConfig = config
  }

  get type(): AuthType {
    return 'custom'
  }

  get requiresCredentials(): boolean {
    return false
  }

  async authenticate(_credentials?: AuthCredentials): Promise<AuthResult> {
    try {
      // Resolve all header values
      for (const [key, value] of Object.entries(this.headerConfig.headers)) {
        if (typeof value === 'function') {
          const resolved = await value()
          this.resolvedHeaders[key] = resolved
        } else {
          this.resolvedHeaders[key] = value
        }
      }

      const tokenInfo: TokenInfo = {
        token: 'custom-headers',
        type: 'custom',
        issuedAt: new Date(),
      }

      this.setTokenInfo(tokenInfo)

      return {
        success: true,
        metadata: {
          headerCount: Object.keys(this.resolvedHeaders).length,
          headers: Object.keys(this.resolvedHeaders),
        },
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CUSTOM_HEADER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to resolve headers',
          timestamp: new Date(),
          retry: false,
        },
      }
    }
  }

  async enhanceRequest(request: RequestInit): Promise<RequestInit> {
    const enhancedRequest = { ...request }
    const headers = new Headers(enhancedRequest.headers || {})

    // Resolve headers dynamically for each request
    for (const [key, value] of Object.entries(this.headerConfig.headers)) {
      try {
        const headerValue = typeof value === 'function' ? await value() : value
        headers.set(key, headerValue)
      } catch (error) {
        this.logger.error(`Failed to resolve header ${key}`, error)
      }
    }

    enhancedRequest.headers = headers
    return enhancedRequest
  }

  validateCredentials(_credentials: unknown): ValidationResult {
    // Validate header configuration
    if (!this.headerConfig.headers || Object.keys(this.headerConfig.headers).length === 0) {
      return {
        valid: false,
        errors: ['No custom headers configured'],
      }
    }

    return { valid: true }
  }

  async onDeactivate(): Promise<void> {
    await super.onDeactivate()
    this.resolvedHeaders = {}
  }

  updateHeaders(headers: Record<string, string | (() => string | Promise<string>)>): void {
    this.headerConfig.headers = { ...this.headerConfig.headers, ...headers }
  }

  removeHeader(key: string): void {
    delete this.headerConfig.headers[key]
    delete this.resolvedHeaders[key]
  }
}
