/**
 * Basic authentication strategy (username/password)
 */

import type {
  AuthType,
  AuthCredentials,
  AuthResult,
  ValidationResult,
  TokenInfo,
} from '../../types/auth.types'
import type { BasicAuthConfig, BasicAuthCredentials } from '../../types/strategy.types'
import { AuthStrategy } from '../base/AuthStrategy'
import type { StrategyConfig } from '../base/AuthStrategy'
import { AuthValidation } from '../base/AuthValidation'

export class BasicAuthStrategy extends AuthStrategy {
  private credentials: BasicAuthCredentials | null = null
  private basicConfig: BasicAuthConfig

  constructor(config: BasicAuthConfig & StrategyConfig = {}) {
    super(config)
    this.basicConfig = {
      headerName: config.headerName || 'Authorization',
      encoding: config.encoding || 'base64',
    }
  }

  get type(): AuthType {
    return 'basic'
  }

  get requiresCredentials(): boolean {
    return true
  }

  async authenticate(credentials?: AuthCredentials): Promise<AuthResult> {
    const basicCredentials = credentials as BasicAuthCredentials

    if (!basicCredentials?.username || !basicCredentials?.password) {
      return {
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Username and password are required',
          timestamp: new Date(),
          retry: false,
        },
      }
    }

    this.credentials = basicCredentials

    const token = this.encodeCredentials(basicCredentials.username, basicCredentials.password)

    const tokenInfo: TokenInfo = {
      token,
      type: 'basic',
      issuedAt: new Date(),
    }

    this.setTokenInfo(tokenInfo)

    this.logger.info('Basic authentication successful')

    return {
      success: true,
      token,
      metadata: {
        username: basicCredentials.username,
        encoding: this.basicConfig.encoding,
      },
    }
  }

  async enhanceRequest(request: RequestInit): Promise<RequestInit> {
    if (!this.credentials) {
      return request
    }

    const enhancedRequest = { ...request }
    const headers = new Headers(enhancedRequest.headers || {})

    const token = this.encodeCredentials(this.credentials.username, this.credentials.password)

    headers.set(this.basicConfig.headerName!, `Basic ${token}`)
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

    const basicCredentials = credentials as BasicAuthCredentials

    const results: ValidationResult[] = []

    if (!basicCredentials.username) {
      results.push({
        valid: false,
        errors: ['Username is required'],
      })
    } else {
      results.push(AuthValidation.validateString(basicCredentials.username, 'Username', 1, 255))
    }

    if (!basicCredentials.password) {
      results.push({
        valid: false,
        errors: ['Password is required'],
      })
    } else {
      results.push(AuthValidation.validateString(basicCredentials.password, 'Password', 1, 1000))
    }

    return AuthValidation.combineResults(...results)
  }

  private encodeCredentials(username: string, password: string): string {
    const credentials = `${username}:${password}`

    if (this.basicConfig.encoding === 'base64') {
      return btoa(credentials)
    }

    // Add other encoding methods if needed
    return credentials
  }

  async onDeactivate(): Promise<void> {
    await super.onDeactivate()
    this.credentials = null
  }

  getConfig(): BasicAuthConfig {
    return { ...this.basicConfig }
  }

  updateConfig(config: Partial<BasicAuthConfig>): void {
    this.basicConfig = { ...this.basicConfig, ...config }
  }
}
