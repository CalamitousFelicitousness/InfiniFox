/**
 * Core authentication types for InfiniFox Authorization System
 */

export type AuthType = 'apiKey' | 'bearer' | 'basic' | 'oauth2' | 'jwt' | 'hmac' | 'custom' | 'none'

export interface AuthCredentials {
  [key: string]: unknown
}

export interface AuthResult {
  success: boolean
  token?: string
  expiresAt?: Date
  refreshToken?: string
  metadata?: Record<string, unknown>
  error?: AuthErrorDetails
}

export interface AuthErrorDetails {
  code: AuthErrorCode
  message: string
  details?: unknown
  timestamp: Date
  retry?: boolean
}

export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  REFRESH_FAILED = 'REFRESH_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  STRATEGY_NOT_FOUND = 'STRATEGY_NOT_FOUND',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  UNKNOWN = 'UNKNOWN',
}

export interface TokenInfo {
  token: string
  type: string
  expiresAt?: Date
  issuedAt?: Date
  refreshToken?: string
  scope?: string[]
}

export interface AuthManagerConfig {
  defaultStrategy?: string
  autoRefresh?: boolean
  refreshThreshold?: number
  maxRetries?: number
  retryDelay?: number
  onAuthError?: (error: AuthErrorDetails) => void
  onTokenRefresh?: (token: string) => void
  storageType?: 'localStorage' | 'sessionStorage' | 'memory' | 'indexedDB'
  encryptionKey?: string
}

export interface StrategyConfig {
  type: AuthType
  enabled: boolean
  priority?: number
  metadata?: Record<string, unknown>
}

export interface ValidationResult {
  valid: boolean
  errors?: string[]
}

export interface AuthState {
  isAuthenticated: boolean
  isAuthenticating: boolean
  authStrategy: string | null
  authError: AuthErrorDetails | null
  tokenInfo: TokenInfo | null
  lastAuthTime: Date | null
}

export interface RequestEnhancement {
  headers?: Record<string, string>
  queryParams?: Record<string, string>
  body?: BodyInit | null
}

export type AuthStatus =
  | 'unauthenticated'
  | 'authenticating'
  | 'authenticated'
  | 'error'
  | 'refreshing'
