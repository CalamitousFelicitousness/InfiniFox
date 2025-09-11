/**
 * Strategy Chaining types for InfiniFox Authorization System
 */

import type { AuthStrategy } from '../strategies/base/AuthStrategy'

export interface ChainedStrategyConfig {
  strategies: AuthStrategy[]
  mode: 'sequential' | 'parallel' | 'fallback'
  continueOnError?: boolean
  combineEnhancements?: boolean
  timeout?: number
}

export interface ChainResult {
  strategyName: string
  success: boolean
  enhancement?: {
    headers?: Record<string, string>
    queryParams?: Record<string, string>
    body?: unknown
  }
  result?: {
    success: boolean
    token?: string
    expiresAt?: Date
    refreshToken?: string
    metadata?: Record<string, unknown>
    error?: unknown
  }
  duration: number
  order: number
}

export interface ChainExecutionResult {
  success: boolean
  results: ChainResult[]
  combinedEnhancement?: {
    headers?: Record<string, string>
    queryParams?: Record<string, string>
    body?: unknown
  }
  totalDuration: number
  failedStrategies: string[]
  successfulStrategies: string[]
}

export interface StrategyChainOptions {
  stopOnFirstSuccess?: boolean
  stopOnFirstFailure?: boolean
  requireAll?: boolean
  maxConcurrent?: number
  retryFailedStrategies?: boolean
  retryAttempts?: number
}
