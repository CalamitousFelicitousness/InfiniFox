/**
 * TenantManager - Multi-tenant authentication management
 */

import { CredentialStore } from '../storage/CredentialStore'
import type {
  TenantConfig,
  TenantContext,
  TenantRequest,
  TenantAuthResult,
  MultiTenantConfig,
} from '../types/tenant.types'

import { AuthManager } from './AuthManager'

export class TenantManager {
  private static instance: TenantManager
  private tenants: Map<string, TenantConfig> = new Map()
  private contexts: Map<string, TenantContext> = new Map()
  private authManagers: Map<string, AuthManager> = new Map()
  private config: MultiTenantConfig
  private credentialStores: Map<string, CredentialStore> = new Map()

  private constructor(config?: Partial<MultiTenantConfig>) {
    this.config = {
      isolationLevel: 'strict',
      maxTenants: 100,
      allowCrossOrigin: false,
      sharedStrategies: [],
      tenantHeader: 'X-Tenant-ID',
      defaultTenant: 'default',
      ...config,
    }
  }

  static getInstance(config?: Partial<MultiTenantConfig>): TenantManager {
    if (!TenantManager.instance) {
      TenantManager.instance = new TenantManager(config)
    }
    return TenantManager.instance
  }

  registerTenant(config: TenantConfig): void {
    if (this.tenants.size >= (this.config.maxTenants || 100)) {
      throw new Error(`Maximum tenant limit (${this.config.maxTenants}) reached`)
    }

    this.tenants.set(config.tenantId, config)

    // Initialize tenant context
    const context: TenantContext = {
      tenantId: config.tenantId,
      activeStrategy: null,
      credentials: new Map(),
      tokens: new Map(),
      expiryMap: new Map(),
    }
    this.contexts.set(config.tenantId, context)

    // Create isolated AuthManager for strict isolation
    if (config.isolation === 'strict') {
      const authManager = new AuthManager({
        defaultStrategy: config.defaultStrategy,
        storageType: 'memory',
      })
      this.authManagers.set(config.tenantId, authManager)

      // Create isolated credential store
      const store = new CredentialStore(`tenant_${config.tenantId}`)
      this.credentialStores.set(config.tenantId, store)
    }
  }

  unregisterTenant(tenantId: string): void {
    const tenant = this.tenants.get(tenantId)
    if (!tenant) return

    // Cleanup resources
    this.tenants.delete(tenantId)
    this.contexts.delete(tenantId)

    if (tenant.isolation === 'strict') {
      const authManager = this.authManagers.get(tenantId)
      authManager?.cleanup()
      this.authManagers.delete(tenantId)

      const store = this.credentialStores.get(tenantId)
      store?.clear()
      this.credentialStores.delete(tenantId)
    }
  }

  async authenticateTenant(
    tenantId: string,
    strategyName?: string,
    credentials?: Record<string, unknown>
  ): Promise<TenantAuthResult> {
    const tenant = this.tenants.get(tenantId)
    if (!tenant) {
      return {
        tenantId,
        strategyName: strategyName || '',
        success: false,
        error: 'Tenant not found',
      }
    }

    const strategy = strategyName || tenant.defaultStrategy
    const authManager = this.getAuthManager(tenantId)

    try {
      const result = await authManager.authenticate(strategy, credentials)

      if (result.success && result.token) {
        const context = this.contexts.get(tenantId)!
        context.activeStrategy = strategy
        context.tokens.set(strategy, result.token)
        if (result.expiresAt) {
          context.expiryMap.set(strategy, result.expiresAt)
        }
      }

      return {
        tenantId,
        strategyName: strategy,
        success: result.success,
        token: result.token,
        expiresAt: result.expiresAt,
        error: result.error?.message,
      }
    } catch (error) {
      return {
        tenantId,
        strategyName: strategy,
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      }
    }
  }

  async enhanceRequestForTenant(request: TenantRequest): Promise<Request> {
    const tenant = this.tenants.get(request.tenantId)
    if (!tenant) {
      throw new Error(`Tenant ${request.tenantId} not found`)
    }

    const authManager = this.getAuthManager(request.tenantId)
    // const context = this.contexts.get(request.tenantId)!
    // Strategy selection for future use
    // const strategy = request.strategyName || context.activeStrategy || tenant.defaultStrategy

    // Add tenant header
    const headers = new Headers(
      request.request instanceof Request
        ? request.request.headers
        : (request.request as RequestInit).headers
    )

    if (this.config.tenantHeader) {
      headers.set(this.config.tenantHeader, request.tenantId)
    }

    // Enhance with auth strategy
    const enhanced = await authManager.enhanceRequest({
      ...(request.request as RequestInit),
      headers,
    })

    return new Request(request.request instanceof Request ? request.request.url : '', enhanced)
  }

  getTenant(tenantId: string): TenantConfig | undefined {
    return this.tenants.get(tenantId)
  }

  getTenantContext(tenantId: string): TenantContext | undefined {
    return this.contexts.get(tenantId)
  }

  listTenants(): string[] {
    return Array.from(this.tenants.keys())
  }

  private getAuthManager(tenantId: string): AuthManager {
    const tenant = this.tenants.get(tenantId)
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`)
    }

    if (tenant.isolation === 'strict') {
      const manager = this.authManagers.get(tenantId)
      if (!manager) {
        throw new Error(`AuthManager not initialized for tenant ${tenantId}`)
      }
      return manager
    }

    // Shared AuthManager for non-strict isolation
    return AuthManager.getInstance()
  }

  async switchTenantStrategy(tenantId: string, strategyName: string): Promise<void> {
    const tenant = this.tenants.get(tenantId)
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`)
    }

    if (!tenant.strategies.has(strategyName)) {
      throw new Error(`Strategy ${strategyName} not registered for tenant ${tenantId}`)
    }

    const context = this.contexts.get(tenantId)!
    context.activeStrategy = strategyName
  }

  cleanup(): void {
    // Cleanup all tenants
    for (const tenantId of this.tenants.keys()) {
      this.unregisterTenant(tenantId)
    }
  }
}
