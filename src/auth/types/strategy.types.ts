/**
 * Strategy-specific type definitions
 */

import type { AuthType, AuthCredentials, AuthResult, ValidationResult } from './auth.types'

export interface IAuthStrategy {
  readonly type: AuthType
  readonly requiresCredentials: boolean

  authenticate(credentials?: AuthCredentials): Promise<AuthResult>
  enhanceRequest(request: RequestInit): Promise<RequestInit>
  validateCredentials(credentials: unknown): ValidationResult

  // Optional lifecycle hooks
  onActivate?(): Promise<void>
  onDeactivate?(): Promise<void>
  refreshToken?(): Promise<AuthResult | null>
  revokeToken?(): Promise<void>

  isTokenExpired?(): boolean
  shouldRefresh?(): boolean
}

// API Key Strategy Types
export interface ApiKeyConfig {
  headerName?: string // Default: 'X-API-Key'
  queryParam?: string // Alternative: pass as query parameter
  prefix?: string // Optional prefix (e.g., 'Bearer')
}

export interface ApiKeyCredentials extends AuthCredentials {
  apiKey: string
}

// Bearer Token Strategy Types
export interface BearerTokenConfig {
  headerName?: string // Default: 'Authorization'
  prefix?: string // Default: 'Bearer'
}

export interface BearerTokenCredentials extends AuthCredentials {
  token: string
}

// Basic Auth Strategy Types
export interface BasicAuthConfig {
  headerName?: string // Default: 'Authorization'
  encoding?: string // Default: 'base64'
}

export interface BasicAuthCredentials extends AuthCredentials {
  username: string
  password: string
}

// OAuth2 Strategy Types
export interface OAuth2Config {
  clientId: string
  clientSecret?: string
  authorizationUrl: string
  tokenUrl: string
  redirectUri: string
  scope?: string[]
  grantType: 'authorization_code' | 'client_credentials' | 'refresh_token' | 'password'
  pkce?: boolean
  state?: string
}

export interface OAuth2Credentials extends AuthCredentials {
  code?: string
  state?: string
  username?: string
  password?: string
  refreshToken?: string
}

export interface OAuth2Token {
  access_token: string
  token_type: string
  expires_in?: number
  refresh_token?: string
  scope?: string
  id_token?: string
}

// JWT Strategy Types
export interface JWTConfig {
  tokenEndpoint?: string
  refreshEndpoint?: string
  headerName?: string
  prefix?: string
  autoRefresh?: boolean
  refreshThreshold?: number
  publicKey?: string
  algorithm?:
    | 'HS256'
    | 'HS384'
    | 'HS512'
    | 'RS256'
    | 'RS384'
    | 'RS512'
    | 'ES256'
    | 'ES384'
    | 'ES512'
}

export interface JWTCredentials extends AuthCredentials {
  username?: string
  password?: string
  token?: string
  refreshToken?: string
}

export interface JWTPayload {
  sub?: string
  iss?: string
  aud?: string | string[]
  exp?: number
  nbf?: number
  iat?: number
  jti?: string
  [key: string]: unknown
}

// HMAC Strategy Types
export interface HMACConfig {
  algorithm: 'sha256' | 'sha384' | 'sha512'
  secretKey: string
  headerName?: string
  timestampHeader?: string
  includeMethod?: boolean
  includeUrl?: boolean
  includeBody?: boolean
}

// Custom Header Strategy Types
export interface CustomHeaderConfig {
  headers: Record<string, string | (() => string | Promise<string>)>
}

// No Auth Strategy Types
export type NoAuthConfig = Record<string, never>
