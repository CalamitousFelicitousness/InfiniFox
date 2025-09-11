/**
 * Registry for managing authentication strategies
 */

import { AuthStrategy } from '../strategies/base/AuthStrategy'
import type { AuthType } from '../types/auth.types'
import { StrategyNotFoundError } from '../types/errors.types'
import { AuthLogger } from '../utils/AuthLogger'

export class AuthRegistry {
  private strategies: Map<string, AuthStrategy> = new Map()
  private logger: AuthLogger

  constructor() {
    this.logger = new AuthLogger('AuthRegistry')
  }

  /**
   * Register a new authentication strategy
   */
  register(name: string, strategy: AuthStrategy): void {
    if (this.strategies.has(name)) {
      this.logger.warn(`Overwriting existing strategy: ${name}`)
    }

    this.strategies.set(name, strategy)
    this.logger.info(`Registered strategy: ${name}`)
  }

  /**
   * Unregister an authentication strategy
   */
  unregister(name: string): boolean {
    const result = this.strategies.delete(name)
    if (result) {
      this.logger.info(`Unregistered strategy: ${name}`)
    }
    return result
  }

  /**
   * Get a registered strategy
   */
  get(name: string): AuthStrategy {
    const strategy = this.strategies.get(name)
    if (!strategy) {
      throw new StrategyNotFoundError(name)
    }
    return strategy
  }

  /**
   * Check if a strategy is registered
   */
  has(name: string): boolean {
    return this.strategies.has(name)
  }

  /**
   * Get all registered strategy names
   */
  getStrategyNames(): string[] {
    return Array.from(this.strategies.keys())
  }

  /**
   * Get strategies by type
   */
  getByType(type: AuthType): AuthStrategy[] {
    const strategies: AuthStrategy[] = []
    for (const [, strategy] of this.strategies) {
      if (strategy.type === type) {
        strategies.push(strategy)
      }
    }
    return strategies
  }

  /**
   * Clear all registered strategies
   */
  clear(): void {
    this.strategies.clear()
    this.logger.info('Cleared all strategies')
  }

  /**
   * Get count of registered strategies
   */
  size(): number {
    return this.strategies.size
  }
}
