/**
 * No authentication strategy (for public endpoints)
 */

import type {
  AuthType,
  AuthCredentials,
  AuthResult,
  ValidationResult,
} from '../../types/auth.types'
import { AuthStrategy } from '../base/AuthStrategy'
import type { StrategyConfig } from '../base/AuthStrategy'

export class NoAuthStrategy extends AuthStrategy {
  constructor(config: StrategyConfig = {}) {
    super(config)
  }

  get type(): AuthType {
    return 'none'
  }

  get requiresCredentials(): boolean {
    return false
  }

  async authenticate(_credentials?: AuthCredentials): Promise<AuthResult> {
    this.logger.info('No authentication required')

    return {
      success: true,
      metadata: {
        public: true,
      },
    }
  }

  async enhanceRequest(request: RequestInit): Promise<RequestInit> {
    // No enhancement needed for public endpoints
    return request
  }

  validateCredentials(_credentials: unknown): ValidationResult {
    // No credentials needed
    return { valid: true }
  }
}
