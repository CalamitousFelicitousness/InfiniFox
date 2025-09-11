/**
 * ChainedStrategy - Execute multiple authentication strategies in sequence or parallel
 */

import type {
  AuthCredentials,
  AuthResult,
  RequestEnhancement,
  AuthErrorCode,
} from '../types/auth.types'
import type {
  ChainedStrategyConfig,
  ChainResult,
  ChainExecutionResult,
  StrategyChainOptions,
} from '../types/chain.types'

import { AuthStrategy } from './base/AuthStrategy'

export class ChainedStrategy extends AuthStrategy {
  private strategies: AuthStrategy[]
  private mode: 'sequential' | 'parallel' | 'fallback'
  private options: StrategyChainOptions

  constructor(config: ChainedStrategyConfig, options?: StrategyChainOptions) {
    super({})
    this.strategies = config.strategies
    this.mode = config.mode
    this.options = {
      stopOnFirstSuccess: config.mode === 'fallback',
      stopOnFirstFailure: false,
      requireAll: config.mode === 'sequential',
      maxConcurrent: 5,
      retryFailedStrategies: false,
      retryAttempts: 1,
      ...options,
    }
  }

  get type() {
    return 'custom' as const
  }

  get requiresCredentials() {
    return true
  }

  async authenticate(credentials: AuthCredentials): Promise<AuthResult> {
    const executionResult = await this.executeChain(credentials)

    if (executionResult.success) {
      // Find the first successful result
      const successResult = executionResult.results.find((r) => r.success)
      return (
        successResult?.result || {
          success: true,
          metadata: { chainResults: executionResult },
        }
      )
    }

    return {
      success: false,
      error: {
        code: AuthErrorCode.UNAUTHORIZED,
        message: `Chain authentication failed. Failed strategies: ${executionResult.failedStrategies.join(', ')}`,
        details: executionResult,
        timestamp: new Date(),
        retry: false,
      },
    }
  }

  async enhanceRequest(request: RequestInit): Promise<RequestInit> {
    const results: RequestEnhancement[] = []

    for (const strategy of this.strategies) {
      try {
        const enhancement = await strategy.enhanceRequest(request)
        results.push(enhancement as RequestEnhancement)
      } catch {
        if (this.options.stopOnFirstFailure) {
          // Re-throw error if configured to stop on first failure
          throw new Error('Strategy enhancement failed')
        }
      }
    }

    return this.combineEnhancements(results)
  }

  validateCredentials(_credentials: unknown): import('../types/auth.types').ValidationResult {
    return { valid: true }
  }

  async refresh(): Promise<AuthResult> {
    // Try refresh with each strategy that supports it
    for (const strategy of this.strategies) {
      try {
        const result = await strategy.refreshToken()
        if (result && result.success) {
          return result
        }
      } catch {
        continue
      }
    }

    return {
      success: false,
      error: {
        code: AuthErrorCode.REFRESH_FAILED,
        message: 'All refresh attempts failed',
        timestamp: new Date(),
        retry: false,
      },
    }
  }

  validate(): boolean {
    return (
      this.strategies.length > 0 && this.strategies.every((s) => s.validateCredentials({}).valid)
    )
  }

  private async executeChain(credentials: AuthCredentials): Promise<ChainExecutionResult> {
    switch (this.mode) {
      case 'sequential':
        return await this.executeSequential(credentials)

      case 'parallel':
        return await this.executeParallel(credentials)

      case 'fallback':
        return await this.executeFallback(credentials)

      default:
        throw new Error(`Unknown chain mode: ${this.mode}`)
    }
  }

  private async executeSequential(credentials: AuthCredentials): Promise<ChainExecutionResult> {
    const startTime = Date.now()
    const results: ChainResult[] = []
    const failedStrategies: string[] = []
    const successfulStrategies: string[] = []

    for (let i = 0; i < this.strategies.length; i++) {
      const strategy = this.strategies[i]
      const strategyStart = Date.now()

      try {
        const result = await strategy.authenticate(credentials)
        const chainResult: ChainResult = {
          strategyName: strategy.type,
          success: result.success,
          result,
          duration: Date.now() - strategyStart,
          order: i,
        }

        results.push(chainResult)

        if (result.success) {
          successfulStrategies.push(strategy.type)
          if (this.options.stopOnFirstSuccess) {
            break
          }
        } else {
          failedStrategies.push(strategy.type)
          if (this.options.stopOnFirstFailure) {
            break
          }
        }
      } catch {
        failedStrategies.push(strategy.type)
        results.push({
          strategyName: strategy.type,
          success: false,
          duration: Date.now() - strategyStart,
          order: i,
        })

        if (this.options.stopOnFirstFailure) {
          break
        }
      }
    }

    const success = this.options.requireAll
      ? failedStrategies.length === 0
      : successfulStrategies.length > 0

    return {
      success,
      results,
      totalDuration: Date.now() - startTime,
      failedStrategies,
      successfulStrategies,
    }
  }

  private async executeParallel(credentials: AuthCredentials): Promise<ChainExecutionResult> {
    const startTime = Date.now()
    const promises = this.strategies.map((strategy, index) =>
      this.executeStrategy(strategy, credentials, index)
    )

    const results = await Promise.all(promises)
    const failedStrategies = results.filter((r) => !r.success).map((r) => r.strategyName)
    const successfulStrategies = results.filter((r) => r.success).map((r) => r.strategyName)

    const success = this.options.requireAll
      ? failedStrategies.length === 0
      : successfulStrategies.length > 0

    return {
      success,
      results,
      totalDuration: Date.now() - startTime,
      failedStrategies,
      successfulStrategies,
    }
  }

  private async executeFallback(credentials: AuthCredentials): Promise<ChainExecutionResult> {
    const startTime = Date.now()
    const results: ChainResult[] = []
    const failedStrategies: string[] = []
    const successfulStrategies: string[] = []

    for (let i = 0; i < this.strategies.length; i++) {
      const strategy = this.strategies[i]
      const strategyStart = Date.now()

      try {
        const result = await strategy.authenticate(credentials)
        const chainResult: ChainResult = {
          strategyName: strategy.type,
          success: result.success,
          result,
          duration: Date.now() - strategyStart,
          order: i,
        }

        results.push(chainResult)

        if (result.success) {
          successfulStrategies.push(strategy.type)
          return {
            success: true,
            results,
            totalDuration: Date.now() - startTime,
            failedStrategies,
            successfulStrategies,
          }
        } else {
          failedStrategies.push(strategy.type)
        }
      } catch {
        failedStrategies.push(strategy.type)
        results.push({
          strategyName: strategy.type,
          success: false,
          duration: Date.now() - strategyStart,
          order: i,
        })
      }
    }

    return {
      success: false,
      results,
      totalDuration: Date.now() - startTime,
      failedStrategies,
      successfulStrategies,
    }
  }

  private async executeStrategy(
    strategy: AuthStrategy,
    credentials: AuthCredentials,
    order: number
  ): Promise<ChainResult> {
    const startTime = Date.now()

    try {
      const result = await strategy.authenticate(credentials)
      return {
        strategyName: strategy.type,
        success: result.success,
        result,
        duration: Date.now() - startTime,
        order,
      }
    } catch {
      return {
        strategyName: strategy.type,
        success: false,
        duration: Date.now() - startTime,
        order,
      }
    }
  }

  private combineEnhancements(enhancements: unknown[]): RequestInit {
    const combined: RequestInit = {
      headers: {},
    }

    const headers = new Headers()

    for (const enhancement of enhancements) {
      if (enhancement instanceof Request || enhancement instanceof Headers) {
        continue
      }

      if (enhancement.headers) {
        const enhHeaders =
          enhancement.headers instanceof Headers
            ? enhancement.headers
            : new Headers(enhancement.headers)
        enhHeaders.forEach((value, key) => {
          headers.set(key, value)
        })
      }

      if (enhancement.body && !combined.body) {
        combined.body = enhancement.body
      }

      if (enhancement.method && !combined.method) {
        combined.method = enhancement.method
      }
    }

    combined.headers = headers
    return combined
  }

  addStrategy(strategy: AuthStrategy): void {
    this.strategies.push(strategy)
  }

  removeStrategy(name: string): void {
    this.strategies = this.strategies.filter((s) => s.type !== name)
  }

  getStrategies(): AuthStrategy[] {
    return [...this.strategies]
  }
}
