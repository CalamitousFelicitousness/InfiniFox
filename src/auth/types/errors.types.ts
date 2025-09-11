/**
 * Error type definitions for the auth system
 */

export class AuthError extends Error {
  public readonly code: string
  public readonly details?: unknown
  public readonly timestamp: Date
  public readonly retry: boolean

  constructor(code: string, message: string, details?: unknown, retry: boolean = false) {
    super(message)
    this.name = 'AuthError'
    this.code = code
    this.details = details
    this.timestamp = new Date()
    this.retry = retry
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
      retry: this.retry,
    }
  }
}

export class NetworkAuthError extends AuthError {
  constructor(message: string, details?: unknown) {
    super('NETWORK_ERROR', message, details, true)
    this.name = 'NetworkAuthError'
  }
}

export class CredentialError extends AuthError {
  constructor(message: string, details?: unknown) {
    super('INVALID_CREDENTIALS', message, details, false)
    this.name = 'CredentialError'
  }
}

export class TokenExpiredError extends AuthError {
  constructor(message: string = 'Token has expired', details?: unknown) {
    super('TOKEN_EXPIRED', message, details, true)
    this.name = 'TokenExpiredError'
  }
}

export class RefreshFailedError extends AuthError {
  constructor(message: string = 'Failed to refresh token', details?: unknown) {
    super('REFRESH_FAILED', message, details, false)
    this.name = 'RefreshFailedError'
  }
}

export class StrategyNotFoundError extends AuthError {
  constructor(strategyName: string) {
    super('STRATEGY_NOT_FOUND', `Authentication strategy '${strategyName}' not found`)
    this.name = 'StrategyNotFoundError'
  }
}

export class ConfigurationError extends AuthError {
  constructor(message: string, details?: unknown) {
    super('CONFIGURATION_ERROR', message, details, false)
    this.name = 'ConfigurationError'
  }
}

export class RateLimitError extends AuthError {
  constructor(retryAfter?: number) {
    super('RATE_LIMIT', 'Rate limit exceeded', { retryAfter }, true)
    this.name = 'RateLimitError'
  }
}

export class UnauthorizedError extends AuthError {
  constructor(message: string = 'Unauthorized access', details?: unknown) {
    super('UNAUTHORIZED', message, details, false)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends AuthError {
  constructor(message: string = 'Access forbidden', details?: unknown) {
    super('FORBIDDEN', message, details, false)
    this.name = 'ForbiddenError'
  }
}
