/**
 * Token caching layer for performance optimization
 */

import type { TokenInfo } from '../types/auth.types'

interface CachedToken {
  token: TokenInfo
  cachedAt: Date
  accessCount: number
}

export class TokenCache {
  private cache: Map<string, CachedToken> = new Map()
  private maxSize: number
  private ttl: number // seconds

  constructor(maxSize: number = 100, ttl: number = 3600) {
    this.maxSize = maxSize
    this.ttl = ttl
  }

  set(key: string, token: TokenInfo): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const oldest = this.getOldestEntry()
      if (oldest) {
        this.cache.delete(oldest)
      }
    }

    this.cache.set(key, {
      token,
      cachedAt: new Date(),
      accessCount: 0,
    })
  }

  get(key: string): TokenInfo | null {
    const cached = this.cache.get(key)

    if (!cached) return null

    // Check if expired based on TTL
    const age = (Date.now() - cached.cachedAt.getTime()) / 1000
    if (age > this.ttl) {
      this.cache.delete(key)
      return null
    }

    // Check token's own expiration
    if (cached.token.expiresAt && cached.token.expiresAt <= new Date()) {
      this.cache.delete(key)
      return null
    }

    cached.accessCount++
    return cached.token
  }

  has(key: string): boolean {
    const token = this.get(key)
    return token !== null
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }

  private getOldestEntry(): string | null {
    let oldest: string | null = null
    let oldestTime = Date.now()

    for (const [key, value] of this.cache) {
      if (value.cachedAt.getTime() < oldestTime) {
        oldest = key
        oldestTime = value.cachedAt.getTime()
      }
    }

    return oldest
  }

  getStats(): {
    size: number
    hitRate: number
    avgAccessCount: number
  } {
    let totalAccess = 0
    for (const [, value] of this.cache) {
      totalAccess += value.accessCount
    }

    return {
      size: this.cache.size,
      hitRate: this.cache.size > 0 ? totalAccess / this.cache.size : 0,
      avgAccessCount: this.cache.size > 0 ? totalAccess / this.cache.size : 0,
    }
  }
}
