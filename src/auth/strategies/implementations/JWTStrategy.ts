/**
 * JWT authentication strategy with auto-refresh
 */

import type {
  AuthType,
  AuthCredentials,
  AuthResult,
  ValidationResult,
  TokenInfo,
} from '../../types/auth.types'
import type { JWTConfig, JWTCredentials, JWTPayload } from '../../types/strategy.types'
import { AuthStrategy } from '../base/AuthStrategy'
import type { StrategyConfig } from '../base/AuthStrategy'
import { AuthValidation } from '../base/AuthValidation'

export class JWTStrategy extends AuthStrategy {
  private jwtConfig: JWTConfig
  private jwt: string | null = null
  private refreshTokenValue: string | null = null
  private refreshTimer?: NodeJS.Timeout
  private decodedPayload: JWTPayload | null = null

  constructor(config: JWTConfig & StrategyConfig) {
    super(config)
    this.jwtConfig = {
      headerName: config.headerName || 'Authorization',
      prefix: config.prefix || 'Bearer',
      autoRefresh: config.autoRefresh !== false,
      refreshThreshold: config.refreshThreshold || 300,
      ...config,
    }
  }

  get type(): AuthType {
    return 'jwt'
  }

  get requiresCredentials(): boolean {
    return true
  }

  async authenticate(credentials?: AuthCredentials): Promise<AuthResult> {
    const jwtCredentials = credentials as JWTCredentials

    try {
      // Direct token provided
      if (jwtCredentials?.token) {
        return this.processToken(jwtCredentials.token, jwtCredentials.refreshToken)
      }

      // Username/password flow
      if (jwtCredentials?.username && jwtCredentials?.password && this.jwtConfig.tokenEndpoint) {
        const tokenData = await this.fetchToken(jwtCredentials.username, jwtCredentials.password)
        return this.processToken(tokenData.token, tokenData.refreshToken)
      }

      // Refresh token flow
      if (jwtCredentials?.refreshToken) {
        return this.performRefresh(jwtCredentials.refreshToken)
      }

      return {
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'JWT token or credentials required',
          timestamp: new Date(),
          retry: false,
        },
      }
    } catch {
      return {
        success: false,
        error: {
          code: 'JWT_ERROR',
          message: error instanceof Error ? error.message : 'JWT authentication failed',
          timestamp: new Date(),
          retry: false,
        },
      }
    }
  }

  private async fetchToken(
    username: string,
    password: string
  ): Promise<{ token: string; refreshToken?: string }> {
    if (!this.jwtConfig.tokenEndpoint) {
      throw new Error('Token endpoint not configured')
    }

    const response = await fetch(this.jwtConfig.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    if (!response.ok) {
      throw new Error(`Token fetch failed: ${response.status}`)
    }

    const data = await response.json()
    return {
      token: data.access_token || data.token,
      refreshToken: data.refresh_token,
    }
  }

  private processToken(token: string, refreshToken?: string): AuthResult {
    this.jwt = token
    this.refreshTokenValue = refreshToken || null

    // Decode and validate JWT
    try {
      this.decodedPayload = this.decodeJWT(token)

      if (this.jwtConfig.publicKey) {
        // TODO: Implement signature verification with public key
        this.logger.debug('JWT signature verification pending implementation')
      }

      const expiresAt = this.decodedPayload.exp
        ? new Date(this.decodedPayload.exp * 1000)
        : undefined

      const tokenInfo: TokenInfo = {
        token: this.jwt,
        type: 'jwt',
        issuedAt: this.decodedPayload.iat ? new Date(this.decodedPayload.iat * 1000) : new Date(),
        expiresAt,
        refreshToken: this.refreshTokenValue || undefined,
      }

      this.setTokenInfo(tokenInfo)

      // Setup auto-refresh
      if (this.jwtConfig.autoRefresh && expiresAt) {
        this.scheduleRefresh(expiresAt)
      }

      return {
        success: true,
        token: this.jwt,
        expiresAt,
        refreshToken: this.refreshTokenValue || undefined,
        metadata: {
          subject: this.decodedPayload.sub,
          issuer: this.decodedPayload.iss,
          audience: this.decodedPayload.aud,
        },
      }
    } catch {
      return {
        success: false,
        error: {
          code: 'JWT_INVALID',
          message: 'Invalid JWT format',
          timestamp: new Date(),
          retry: false,
        },
      }
    }
  }

  private decodeJWT(token: string): JWTPayload {
    const parts = token.split('.')
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format')
    }

    const payload = parts[1]
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decoded)
  }

  private scheduleRefresh(expiresAt: Date): void {
    this.cancelRefresh()

    const threshold = (this.jwtConfig.refreshThreshold || 300) * 1000
    const refreshTime = expiresAt.getTime() - threshold
    const delay = refreshTime - Date.now()

    if (delay > 0) {
      this.refreshTimer = setTimeout(() => {
        this.performRefresh().catch((error) => {
          this.logger.error('Auto-refresh failed', error)
        })
      }, delay)

      this.logger.debug(`JWT auto-refresh scheduled in ${delay / 1000} seconds`)
    }
  }

  private cancelRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = undefined
    }
  }

  private async performRefresh(refreshToken?: string): Promise<AuthResult> {
    const token = refreshToken || this.refreshTokenValue

    if (!token) {
      return {
        success: false,
        error: {
          code: 'NO_REFRESH_TOKEN',
          message: 'Refresh token not available',
          timestamp: new Date(),
          retry: false,
        },
      }
    }

    if (!this.jwtConfig.refreshEndpoint) {
      return {
        success: false,
        error: {
          code: 'NO_REFRESH_ENDPOINT',
          message: 'Refresh endpoint not configured',
          timestamp: new Date(),
          retry: false,
        },
      }
    }

    try {
      const response = await fetch(this.jwtConfig.refreshEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: token }),
      })

      if (!response.ok) {
        throw new Error(`Refresh failed: ${response.status}`)
      }

      const data = await response.json()
      return this.processToken(data.access_token || data.token, data.refresh_token || token)
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'REFRESH_FAILED',
          message: error instanceof Error ? error.message : 'Token refresh failed',
          timestamp: new Date(),
          retry: false,
        },
      }
    }
  }

  async enhanceRequest(request: RequestInit): Promise<RequestInit> {
    if (!this.jwt) {
      return request
    }

    const enhancedRequest = { ...request }
    const headers = new Headers(enhancedRequest.headers || {})

    const value = this.jwtConfig.prefix ? `${this.jwtConfig.prefix} ${this.jwt}` : this.jwt

    headers.set(this.jwtConfig.headerName!, value)
    enhancedRequest.headers = headers

    return enhancedRequest
  }

  async refresh(): Promise<AuthResult | null> {
    if (!this.refreshTokenValue) {
      return null
    }
    return this.performRefresh()
  }

  validateCredentials(credentials: unknown): ValidationResult {
    const jwtCredentials = credentials as JWTCredentials

    if (jwtCredentials?.token) {
      try {
        this.decodeJWT(jwtCredentials.token)
        return { valid: true }
      } catch {
        return { valid: false, errors: ['Invalid JWT format'] }
      }
    }

    if (jwtCredentials?.username && jwtCredentials?.password) {
      return AuthValidation.combineResults(
        AuthValidation.validateString(jwtCredentials.username, 'Username', 1, 255),
        AuthValidation.validateString(jwtCredentials.password, 'Password', 1, 1000)
      )
    }

    if (jwtCredentials?.refreshToken) {
      return AuthValidation.validateString(jwtCredentials.refreshToken, 'Refresh token', 1, 2048)
    }

    return { valid: false, errors: ['No valid credentials provided'] }
  }

  async onDeactivate(): Promise<void> {
    this.cancelRefresh()
    await super.onDeactivate()
    this.jwt = null
    this.refreshTokenValue = null
    this.decodedPayload = null
  }

  getDecodedPayload(): JWTPayload | null {
    return this.decodedPayload
  }
}
