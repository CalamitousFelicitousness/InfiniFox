/**
 * Central authentication orchestrator for InfiniFox
 */

import { CredentialStore } from '../storage/CredentialStore'
import { TokenCache } from '../storage/TokenCache'
import { AuthStrategy } from '../strategies/base/AuthStrategy'
import type {
  AuthManagerConfig,
  AuthResult,
  AuthErrorDetails,
  AuthState,
  TokenInfo,
  AuthCredentials,
} from '../types/auth.types'
import { StrategyNotFoundError, ConfigurationError } from '../types/errors.types'
import { AuthLogger } from '../utils/AuthLogger'

interface StrategyActivationConfig {
  autoAuthenticate?: boolean
  [key: string]: unknown
}

import { AuthInterceptor } from './AuthInterceptor'
import { AuthRegistry } from './AuthRegistry'

interface StorageOptions {
  encryptionKey?: string
  storageType?: 'localStorage' | 'sessionStorage' | 'memory' | 'indexedDB'
  namespace?: string
  ttl?: number
}

export class AuthManager {
  private static instance: AuthManager | null = null

  private registry: AuthRegistry
  private interceptor: AuthInterceptor
  private store: CredentialStore
  private tokenCache: TokenCache
  private config: AuthManagerConfig
  private logger: AuthLogger

  private activeStrategy: AuthStrategy | null = null
  private activeStrategyName: string | null = null
  private state: AuthState
  private refreshTimer?: NodeJS.Timeout

  private constructor(config: AuthManagerConfig = {}) {
    this.config = {
      autoRefresh: true,
      refreshThreshold: 300, // 5 minutes
      maxRetries: 3,
      retryDelay: 1000,
      storageType: 'localStorage',
      ...config,
    }

    this.logger = new AuthLogger('AuthManager')
    this.registry = new AuthRegistry()
    this.interceptor = new AuthInterceptor({
      retryOnAuthError: this.config.autoRefresh,
      maxRetries: this.config.maxRetries,
      retryDelay: this.config.retryDelay,
      onAuthError: this.config.onAuthError,
      onTokenRefresh: this.config.onTokenRefresh,
    })

    const storageOptions: StorageOptions = {
      storageType: this.config.storageType,
      encryptionKey: this.config.encryptionKey,
      namespace: 'infinifox_auth',
    }

    this.store = new CredentialStore(storageOptions)
    this.tokenCache = new TokenCache()

    this.state = {
      isAuthenticated: false,
      isAuthenticating: false,
      authStrategy: null,
      authError: null,
      tokenInfo: null,
      lastAuthTime: null,
    }
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: AuthManagerConfig): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager(config)
    }
    return AuthManager.instance
  }

  /**
   * Strategy management
   */
  registerStrategy(name: string, strategy: AuthStrategy): void {
    this.registry.register(name, strategy)
    this.logger.info(`Registered strategy: ${name}`)
  }

  async setActiveStrategy(name: string, config?: StrategyActivationConfig): Promise<void> {
    if (!this.registry.has(name)) {
      throw new StrategyNotFoundError(name)
    }

    // Deactivate current strategy
    if (this.activeStrategy) {
      await this.activeStrategy.onDeactivate()
      this.stopAutoRefresh()
    }

    // Activate new strategy
    this.activeStrategy = this.registry.get(name)
    this.activeStrategyName = name
    this.interceptor.setStrategy(this.activeStrategy)

    await this.activeStrategy.onActivate()

    this.state.authStrategy = name
    this.logger.info(`Active strategy set to: ${name}`)

    // Load stored credentials if available
    const storedCredentials = await this.store.retrieve(`${name}_credentials`)
    if (storedCredentials && config?.autoAuthenticate !== false) {
      await this.authenticate(storedCredentials)
    }
  }

  getActiveStrategy(): AuthStrategy | null {
    return this.activeStrategy
  }

  /**
   * Authentication operations
   */
  async authenticate(credentials?: AuthCredentials): Promise<AuthResult> {
    if (!this.activeStrategy) {
      throw new ConfigurationError('No active authentication strategy')
    }

    this.state.isAuthenticating = true
    this.state.authError = null

    try {
      // Validate credentials
      if (this.activeStrategy.requiresCredentials && !credentials) {
        throw new ConfigurationError('Credentials required for this strategy')
      }

      if (credentials) {
        const validation = this.activeStrategy.validateCredentials(credentials)
        if (!validation.valid) {
          throw new ConfigurationError(`Invalid credentials: ${validation.errors?.join(', ')}`)
        }
      }

      // Attempt authentication
      const result = await this.activeStrategy.authenticate(credentials)

      if (result.success) {
        // Store credentials securely
        if (credentials && this.activeStrategyName) {
          await this.store.store(`${this.activeStrategyName}_credentials`, credentials, {
            encrypt: true,
          })
        }

        // Update state
        this.state.isAuthenticated = true
        this.state.lastAuthTime = new Date()

        if (result.token) {
          const tokenInfo: TokenInfo = {
            token: result.token,
            type: this.activeStrategy.type,
            expiresAt: result.expiresAt,
            refreshToken: result.refreshToken,
          }

          this.state.tokenInfo = tokenInfo
          this.tokenCache.set(this.activeStrategyName!, tokenInfo)

          // Setup auto-refresh if enabled
          if (this.config.autoRefresh && result.expiresAt) {
            this.setupAutoRefresh(result.expiresAt)
          }
        }

        this.logger.info('Authentication successful')
      } else {
        this.state.authError = result.error || null
        this.logger.error('Authentication failed', result.error)
      }

      return result
    } catch (error) {
      const authError: AuthErrorDetails = {
        code: 'UNKNOWN',
        message: error instanceof Error ? error.message : 'Authentication failed',
        details: error,
        timestamp: new Date(),
        retry: false,
      }

      this.state.authError = authError
      this.logger.error('Authentication error', error)

      return {
        success: false,
        error: authError,
      }
    } finally {
      this.state.isAuthenticating = false
    }
  }

  async refreshAuth(): Promise<void> {
    if (!this.activeStrategy) {
      throw new ConfigurationError('No active authentication strategy')
    }

    try {
      const result = await this.activeStrategy.refreshToken()

      if (result?.success && result.token) {
        const tokenInfo: TokenInfo = {
          token: result.token,
          type: this.activeStrategy.type,
          expiresAt: result.expiresAt,
          refreshToken: result.refreshToken,
        }

        this.state.tokenInfo = tokenInfo

        if (this.activeStrategyName) {
          this.tokenCache.set(this.activeStrategyName, tokenInfo)
        }

        if (this.config.onTokenRefresh) {
          this.config.onTokenRefresh(result.token)
        }

        // Re-setup auto-refresh
        if (this.config.autoRefresh && result.expiresAt) {
          this.setupAutoRefresh(result.expiresAt)
        }

        this.logger.info('Token refreshed successfully')
      }
    } catch (error) {
      this.logger.error('Token refresh failed', error)
      throw error
    }
  }

  async revokeAuth(): Promise<void> {
    if (!this.activeStrategy) {
      return
    }

    try {
      await this.activeStrategy.revokeToken()
    } catch (error) {
      this.logger.error('Token revocation failed', error)
    }

    // Clear stored credentials
    if (this.activeStrategyName) {
      await this.store.remove(`${this.activeStrategyName}_credentials`)
      this.tokenCache.delete(this.activeStrategyName)
    }

    // Reset state
    this.state.isAuthenticated = false
    this.state.tokenInfo = null
    this.state.lastAuthTime = null
    this.state.authError = null

    this.stopAutoRefresh()
    this.logger.info('Authentication revoked')
  }

  /**
   * Request enhancement
   */
  async enhanceRequest(request: RequestInit): Promise<RequestInit> {
    return this.interceptor.enhanceRequest(request)
  }

  async handleResponse(response: Response): Promise<Response> {
    return this.interceptor.handleResponse(response)
  }

  /**
   * Configuration
   */
  updateConfig(config: Partial<AuthManagerConfig>): void {
    this.config = { ...this.config, ...config }

    // Update interceptor config
    this.interceptor = new AuthInterceptor({
      retryOnAuthError: this.config.autoRefresh,
      maxRetries: this.config.maxRetries,
      retryDelay: this.config.retryDelay,
      onAuthError: this.config.onAuthError,
      onTokenRefresh: this.config.onTokenRefresh,
    })

    if (this.activeStrategy) {
      this.interceptor.setStrategy(this.activeStrategy)
    }
  }

  getConfig(): AuthManagerConfig {
    return { ...this.config }
  }

  /**
   * State management
   */
  getState(): AuthState {
    return { ...this.state }
  }

  isAuthenticated(): boolean {
    return (
      this.state.isAuthenticated &&
      (!this.state.tokenInfo?.expiresAt || this.state.tokenInfo.expiresAt > new Date())
    )
  }

  /**
   * Private helpers
   */
  private setupAutoRefresh(expiresAt: Date): void {
    this.stopAutoRefresh()

    const threshold = (this.config.refreshThreshold || 300) * 1000 // Convert to ms
    const expiryTime = expiresAt.getTime()
    const refreshTime = expiryTime - threshold
    const delay = refreshTime - Date.now()

    if (delay > 0) {
      this.refreshTimer = setTimeout(() => {
        this.refreshAuth().catch((error) => {
          this.logger.error('Auto-refresh failed', error)
        })
      }, delay)

      this.logger.debug(`Auto-refresh scheduled in ${delay / 1000} seconds`)
    }
  }

  private stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = undefined
    }
  }

  /**
   * Cleanup
   */
  async destroy(): Promise<void> {
    this.stopAutoRefresh()

    if (this.activeStrategy) {
      await this.activeStrategy.onDeactivate()
    }

    this.registry.clear()
    this.tokenCache.clear()

    AuthManager.instance = null
  }
}
