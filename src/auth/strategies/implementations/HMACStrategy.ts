/**
 * HMAC request signing strategy
 */

import type {
  AuthType,
  AuthCredentials,
  AuthResult,
  ValidationResult,
  TokenInfo,
} from '../../types/auth.types'
import type { HMACConfig } from '../../types/strategy.types'
import { AuthStrategy } from '../base/AuthStrategy'
import type { StrategyConfig } from '../base/AuthStrategy'

export class HMACStrategy extends AuthStrategy {
  private hmacConfig: HMACConfig
  private secretKey: string | null = null

  constructor(config: HMACConfig & StrategyConfig) {
    super(config)
    this.hmacConfig = {
      headerName: config.headerName || 'X-Signature',
      timestampHeader: config.timestampHeader || 'X-Timestamp',
      includeMethod: config.includeMethod !== false,
      includeUrl: config.includeUrl !== false,
      includeBody: config.includeBody !== false,
      ...config,
    }
  }

  get type(): AuthType {
    return 'hmac'
  }

  get requiresCredentials(): boolean {
    return false // Secret key is in config
  }

  async authenticate(_credentials?: AuthCredentials): Promise<AuthResult> {
    this.secretKey = this.hmacConfig.secretKey

    if (!this.secretKey) {
      return {
        success: false,
        error: {
          code: 'HMAC_CONFIG_ERROR',
          message: 'Secret key not configured',
          timestamp: new Date(),
          retry: false,
        },
      }
    }

    const tokenInfo: TokenInfo = {
      token: 'hmac-signed',
      type: 'hmac',
      issuedAt: new Date(),
    }

    this.setTokenInfo(tokenInfo)

    return {
      success: true,
      metadata: {
        algorithm: this.hmacConfig.algorithm,
        includeMethod: this.hmacConfig.includeMethod,
        includeUrl: this.hmacConfig.includeUrl,
        includeBody: this.hmacConfig.includeBody,
      },
    }
  }

  async enhanceRequest(request: RequestInit): Promise<RequestInit> {
    if (!this.secretKey) {
      return request
    }

    const enhancedRequest = { ...request }
    const headers = new Headers(enhancedRequest.headers || {})

    const timestamp = Date.now().toString()
    headers.set(this.hmacConfig.timestampHeader!, timestamp)

    const signature = await this.generateSignature(request, timestamp)
    headers.set(this.hmacConfig.headerName!, signature)

    enhancedRequest.headers = headers
    return enhancedRequest
  }

  private async generateSignature(request: RequestInit, timestamp: string): Promise<string> {
    const parts: string[] = [timestamp]

    if (this.hmacConfig.includeMethod) {
      parts.push(request.method || 'GET')
    }

    if (this.hmacConfig.includeUrl && (request as RequestInit & { url?: string }).url) {
      parts.push((request as RequestInit & { url?: string }).url!)
    }

    if (this.hmacConfig.includeBody && request.body) {
      const bodyString =
        typeof request.body === 'string' ? request.body : JSON.stringify(request.body)
      parts.push(bodyString)
    }

    const message = parts.join('\n')
    return this.computeHMAC(message)
  }

  private async computeHMAC(message: string): Promise<string> {
    const encoder = new TextEncoder()

    const keyData = encoder.encode(this.secretKey!)
    const messageData = encoder.encode(message)

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      {
        name: 'HMAC',
        hash: this.getHashAlgorithm(),
      },
      false,
      ['sign']
    )

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
    return this.arrayBufferToHex(signature)
  }

  private getHashAlgorithm(): string {
    switch (this.hmacConfig.algorithm) {
      case 'sha256':
        return 'SHA-256'
      case 'sha384':
        return 'SHA-384'
      case 'sha512':
        return 'SHA-512'
      default:
        return 'SHA-256'
    }
  }

  private arrayBufferToHex(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  }

  validateCredentials(_credentials: unknown): ValidationResult {
    // Credentials not required as secret key is in config
    return { valid: true }
  }

  async onDeactivate(): Promise<void> {
    await super.onDeactivate()
    this.secretKey = null
  }
}
