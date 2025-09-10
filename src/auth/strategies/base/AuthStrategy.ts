/**
 * Abstract base class for all authentication strategies
 */

import type {
  AuthType,
  AuthCredentials,
  AuthResult,
  ValidationResult,
  TokenInfo,
} from '../../types/auth.types'
import { AuthLogger } from '../../utils/AuthLogger'

export interface StrategyConfig {
  logger?: AuthLogger
  autoRefresh?: boolean
  refreshThreshold?: number
  [key: string]: unknown
}

export abstract class AuthStrategy {
  protected config: StrategyConfig
  protected logger: AuthLogger
  protected tokenInfo: TokenInfo | null = null
  protected lastAuthTime: Date | null = null

  constructor(config: StrategyConfig = {}) {
    this.config = config
    this.logger = config.logger || new AuthLogger(this.type)
  }

  abstract get type(): AuthType
  abstract get requiresCredentials(): boolean

  /**
   * Core authentication method
   */
  abstract authenticate(credentials?: AuthCredentials): Promise<AuthResult>

  /**
   * Enhance HTTP request with authentication headers/params
   */
  abstract enhanceRequest(request: RequestInit): Promise<RequestInit>

  /**
   * Validate credentials before authentication
   */
  abstract validateCredentials(credentials: unknown): ValidationResult

  /**
   * Optional lifecycle hooks
   */
  async onActivate(): Promise<void> {
    this.logger.debug(`Activating ${this.type} strategy`)
  }

  async onDeactivate(): Promise<void> {
    this.logger.debug(`Deactivating ${this.type} strategy`)
    this.tokenInfo = null
    this.lastAuthTime = null
  }

  async refreshToken(): Promise<AuthResult | null> {
    return null
  }

  async revokeToken(): Promise<void> {
    this.tokenInfo = null
    this.lastAuthTime = null
  }

  /**
   * Token management utilities
   */
  protected isTokenExpired(token?: TokenInfo): boolean {
    const tokenToCheck = token || this.tokenInfo
    if (!tokenToCheck?.expiresAt) return false

    const now = new Date()
    return tokenToCheck.expiresAt <= now
  }

  protected shouldRefresh(token?: TokenInfo): boolean {
    const tokenToCheck = token || this.tokenInfo
    if (!tokenToCheck?.expiresAt) return false

    const threshold = this.config.refreshThreshold || 300 // 5 minutes default
    const now = new Date()
    const expiryTime = tokenToCheck.expiresAt.getTime()
    const timeUntilExpiry = (expiryTime - now.getTime()) / 1000

    return timeUntilExpiry <= threshold
  }

  /**
   * Get current token info
   */
  getTokenInfo(): TokenInfo | null {
    return this.tokenInfo
  }

  /**
   * Set token info
   */
  protected setTokenInfo(token: TokenInfo): void {
    this.tokenInfo = token
    this.lastAuthTime = new Date()
  }

  /**
   * Clear authentication state
   */
  clearAuth(): void {
    this.tokenInfo = null
    this.lastAuthTime = null
  }

  /**
   * Check if currently authenticated
   */
  isAuthenticated(): boolean {
    return !!this.tokenInfo && !this.isTokenExpired()
  }

  /**
   * Get time since last authentication
   */
  getTimeSinceAuth(): number | null {
    if (!this.lastAuthTime) return null
    return Date.now() - this.lastAuthTime.getTime()
  }
}
