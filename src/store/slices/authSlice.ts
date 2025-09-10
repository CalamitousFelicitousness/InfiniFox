import type { StateCreator } from 'zustand'

import { AuthManager } from '../../auth/core/AuthManager'
import { AuthStrategy } from '../../auth/strategies/base/AuthStrategy'
import {
  ApiKeyStrategy,
  BearerTokenStrategy,
  BasicAuthStrategy,
  NoAuthStrategy,
  OAuth2Strategy,
  JWTStrategy,
  HMACStrategy,
  CustomHeaderStrategy,
} from '../../auth/strategies/implementations'
import type { AuthStatus, AuthErrorDetails, AuthCredentials } from '../../auth/types'

export interface StrategyConfig {
  type:
    | 'api-key'
    | 'bearer-token'
    | 'basic-auth'
    | 'no-auth'
    | 'oauth2'
    | 'jwt'
    | 'hmac'
    | 'custom-header'
  config?: Record<string, unknown>
  credentials?: AuthCredentials
}

export interface AuthSlice {
  // State
  strategies: Map<string, StrategyConfig>
  activeStrategy: string | null
  authStatus: AuthStatus
  authError: AuthErrorDetails | null
  isAuthenticated: boolean
  tokenExpiry: number | null

  // Actions
  registerStrategy: (name: string, config: StrategyConfig) => void
  unregisterStrategy: (name: string) => void
  activateStrategy: (name: string) => Promise<void>
  authenticate: (credentials?: AuthCredentials) => Promise<void>
  refreshToken: () => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
  updateTokenExpiry: (expiry: number | null) => void

  // Utility actions
  getAuthManager: () => AuthManager
  isStrategyRegistered: (name: string) => boolean
  getActiveStrategyConfig: () => StrategyConfig | null
}

const authManager = AuthManager.getInstance()

function createStrategyInstance(config: StrategyConfig): AuthStrategy {
  switch (config.type) {
    case 'api-key':
      return new ApiKeyStrategy(config.config || {})
    case 'bearer-token':
      return new BearerTokenStrategy(config.config || {})
    case 'basic-auth':
      return new BasicAuthStrategy(config.config || {})
    case 'no-auth':
      return new NoAuthStrategy()
    case 'oauth2':
      return new OAuth2Strategy(config.config || {})
    case 'jwt':
      return new JWTStrategy(config.config || {})
    case 'hmac':
      return new HMACStrategy(config.config || {})
    case 'custom-header':
      return new CustomHeaderStrategy(config.config || {})
    default:
      throw new Error(`Unknown strategy type: ${config.type}`)
  }
}

export const createAuthSlice: StateCreator<AuthSlice> = (set, get) => ({
  // Initial state
  strategies: new Map(),
  activeStrategy: null,
  authStatus: 'unauthenticated',
  authError: null,
  isAuthenticated: false,
  tokenExpiry: null,

  // Register a new authentication strategy
  registerStrategy: (name: string, config: StrategyConfig) => {
    const strategy = createStrategyInstance(config)
    authManager.registerStrategy(name, strategy)

    set((state) => {
      const newStrategies = new Map(state.strategies)
      newStrategies.set(name, config)
      return { strategies: newStrategies }
    })
  },

  // Unregister a strategy
  unregisterStrategy: (name: string) => {
    authManager.unregisterStrategy(name)

    set((state) => {
      const newStrategies = new Map(state.strategies)
      newStrategies.delete(name)
      return {
        strategies: newStrategies,
        activeStrategy: state.activeStrategy === name ? null : state.activeStrategy,
      }
    })
  },

  // Activate a registered strategy
  activateStrategy: async (name: string) => {
    try {
      set({ authStatus: 'authenticating', authError: null })

      await authManager.setActiveStrategy(name)

      set({
        activeStrategy: name,
        authStatus: 'unauthenticated',
        authError: null,
      })
    } catch (error) {
      set({
        authStatus: 'error',
        authError: {
          code: 'STRATEGY_ACTIVATION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to activate strategy',
          timestamp: Date.now(),
        },
      })
      throw error
    }
  },

  // Authenticate with current strategy
  authenticate: async (credentials?: AuthCredentials) => {
    try {
      set({ authStatus: 'authenticating', authError: null })

      const result = await authManager.authenticate(credentials)

      // Extract token expiry if available
      let tokenExpiry: number | null = null
      if (result.metadata?.expiresAt) {
        tokenExpiry = result.metadata.expiresAt
      } else if (result.metadata?.expiresIn) {
        tokenExpiry = Date.now() + result.metadata.expiresIn * 1000
      }

      set({
        authStatus: 'authenticated',
        isAuthenticated: true,
        authError: null,
        tokenExpiry,
      })

      return result
    } catch (error) {
      set({
        authStatus: 'error',
        isAuthenticated: false,
        authError: {
          code: 'AUTHENTICATION_FAILED',
          message: error instanceof Error ? error.message : 'Authentication failed',
          timestamp: Date.now(),
          details: error,
        },
      })
      throw error
    }
  },

  // Refresh authentication token
  refreshToken: async () => {
    try {
      set({ authStatus: 'refreshing', authError: null })

      const activeStrategy = authManager.getActiveStrategy()
      if (!activeStrategy) {
        throw new Error('No active strategy')
      }

      // Check if strategy supports refresh
      if ('refreshToken' in activeStrategy && typeof activeStrategy.refreshToken === 'function') {
        const result = await activeStrategy.refreshToken()

        // Update token expiry
        let tokenExpiry: number | null = null
        if (result.metadata?.expiresAt) {
          tokenExpiry = result.metadata.expiresAt
        } else if (result.metadata?.expiresIn) {
          tokenExpiry = Date.now() + result.metadata.expiresIn * 1000
        }

        set({
          authStatus: 'authenticated',
          isAuthenticated: true,
          authError: null,
          tokenExpiry,
        })

        return result
      } else {
        throw new Error('Active strategy does not support token refresh')
      }
    } catch (error) {
      set({
        authStatus: 'error',
        authError: {
          code: 'TOKEN_REFRESH_FAILED',
          message: error instanceof Error ? error.message : 'Token refresh failed',
          timestamp: Date.now(),
          details: error,
        },
      })
      throw error
    }
  },

  // Logout and clear authentication
  logout: async () => {
    try {
      await authManager.logout()

      set({
        authStatus: 'unauthenticated',
        isAuthenticated: false,
        authError: null,
        tokenExpiry: null,
      })
    } catch (error) {
      set({
        authError: {
          code: 'LOGOUT_FAILED',
          message: error instanceof Error ? error.message : 'Logout failed',
          timestamp: Date.now(),
        },
      })
      throw error
    }
  },

  // Clear authentication error
  clearError: () => {
    set({ authError: null })
  },

  // Update token expiry
  updateTokenExpiry: (expiry: number | null) => {
    set({ tokenExpiry: expiry })
  },

  // Get AuthManager instance
  getAuthManager: () => authManager,

  // Check if strategy is registered
  isStrategyRegistered: (name: string) => {
    return get().strategies.has(name)
  },

  // Get active strategy configuration
  getActiveStrategyConfig: () => {
    const state = get()
    if (!state.activeStrategy) return null
    return state.strategies.get(state.activeStrategy) || null
  },
})
