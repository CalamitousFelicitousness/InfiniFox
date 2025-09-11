/**
 * Multi-tenant support types for InfiniFox Authorization System
 */

export interface TenantConfig {
  tenantId: string
  name: string
  strategies: Map<string, TenantStrategyConfig>
  defaultStrategy: string
  isolation: 'strict' | 'shared'
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface TenantStrategyConfig {
  type: string
  enabled: boolean
  priority?: number
  metadata?: Record<string, unknown>
}

export interface TenantContext {
  tenantId: string
  activeStrategy: string | null
  credentials: Map<string, Record<string, unknown>>
  tokens: Map<string, string>
  expiryMap: Map<string, Date>
}

export interface TenantRequest {
  tenantId: string
  strategyName?: string
  request: Request | RequestInit
}

export interface TenantAuthResult {
  tenantId: string
  strategyName: string
  success: boolean
  token?: string
  expiresAt?: Date
  error?: string
}

export type TenantIsolationLevel = 'strict' | 'shared' | 'hybrid'

export interface MultiTenantConfig {
  isolationLevel: TenantIsolationLevel
  maxTenants?: number
  allowCrossOrigin?: boolean
  sharedStrategies?: string[]
  tenantHeader?: string
  defaultTenant?: string
}
