/**
 * Bearer token authentication strategy
 */

import type {
  AuthType,
  AuthCredentials,
  AuthResult,
  ValidationResult,
  TokenInfo,
} from '../../types/auth.types'
import type { BearerTokenConfig, BearerTokenCredentials } from '../../types/strategy.types'
import { AuthStrategy } from '../base/AuthStrategy'
import type { StrategyConfig } from '../base/AuthStrategy'
import { AuthValidation } from '../base/AuthValidation'

export class BearerTokenStrategy extends AuthStrategy {
  private token: string | null = null
  private bearerConfig: BearerTokenConfig

  constructor(config: BearerTokenConfig & StrategyConfig = {}) {
    super(config)
    this.bearerConfig = {
      headerName: config.headerName || 'Authorization',
      prefix: config.prefix || 'Bearer',
    }
  }

  get type(): AuthType {
    return 'bearer'
  }

  get requiresCredentials(): boolean {
    return true
  }

  async authenticate(credentials?: AuthCredentials): Promise<AuthResult> {
    const bearerCredentials = credentials as BearerTokenCredentials

    if (!bearerCredentials?.token) {
      return {
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Bearer token is required',
          timestamp: new Date(),
          retry: false,
        },
      }
    }

    this.token = bearerCredentials.token

    // Try to decode JWT if it looks like one
    let expiresAt: Date | undefined
    let metadata: Record<string, unknown> = {}

    if (this.token.split('.').length === 3) {
      try {
        const payload = JSON.parse(atob(this.token.split('.')[1]))
        if (payload.exp) {
          expiresAt = new Date(payload.exp * 1000)
        }
        metadata = {
          jwtPayload: payload,
          isJWT: true,
        }
      } catch {
        metadata = { isJWT: false }
      }
    }

    const tokenInfo: TokenInfo = {
      token: this.token,
      type: 'bearer',
      issuedAt: new Date(),
      expiresAt,
    }

    this.setTokenInfo(tokenInfo)

    this.logger.info('Bearer token authentication successful')

    return {
      success: true,
      token: this.token,
      expiresAt,
      metadata,
    }
  }

  async enhanceRequest(request: RequestInit): Promise<RequestInit> {
    if (!this.token) {
      return request
    }

    const enhancedRequest = { ...request }
    const headers = new Headers(enhancedRequest.headers || {})

    const value = this.bearerConfig.prefix
      ? `${this.bearerConfig.prefix} ${this.token}`
      : this.token

    headers.set(this.bearerConfig.headerName!, value)
    enhancedRequest.headers = headers

    return enhancedRequest
  }

  validateCredentials(credentials: unknown): ValidationResult {
    if (!credentials) {
      return {
        valid: false,
        errors: ['Credentials are required'],
      }
    }

    const bearerCredentials = credentials as BearerTokenCredentials

    if (!bearerCredentials.token) {
      return {
        valid: false,
        errors: ['Bearer token is required'],
      }
    }

    const validation = AuthValidation.validateString(
      bearerCredentials.token,
      'Bearer token',
      1,
      10000
    )

    return validation
  }

  async onDeactivate(): Promise<void> {
    await super.onDeactivate()
    this.token = null
  }

  getConfig(): BearerTokenConfig {
    return { ...this.bearerConfig }
  }

  updateConfig(config: Partial<BearerTokenConfig>): void {
    this.bearerConfig = { ...this.bearerConfig, ...config }
  }
}
