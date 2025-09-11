/**
 * RequestSigner - Advanced request signing with multiple algorithms
 */

import {
  SigningConfig,
  SignedRequest,
  SignatureVerification,
  RequestSigningOptions,
  SigningAlgorithm,
} from '../types/signing.types'

export class RequestSigner {
  private config: SigningConfig
  private options: RequestSigningOptions

  constructor(config: SigningConfig, options?: RequestSigningOptions) {
    this.config = config
    this.options = {
      includeBody: true,
      includeQuery: true,
      digestAlgorithm: 'sha256',
      base64Encode: true,
      headerPrefix: 'X-Signature-',
      ...options,
    }
  }

  async signRequest(request: Request | RequestInit, url?: string): Promise<SignedRequest> {
    const timestamp = Date.now()
    const nonce = this.generateNonce()

    // Build canonical request
    const canonicalString = await this.buildCanonicalString(request, url, timestamp, nonce)

    // Generate signature
    const signature = await this.generateSignature(canonicalString)

    // Create signed headers
    const headers = new Headers(
      request instanceof Request ? request.headers : (request as RequestInit).headers
    )

    // Add signature headers
    const prefix = this.options.headerPrefix || ''
    headers.set(`${prefix}Algorithm`, this.config.algorithm)
    headers.set(`${prefix}Signature`, signature)
    headers.set(`${prefix}Timestamp`, timestamp.toString())

    if (nonce) {
      headers.set(`${prefix}Nonce`, nonce)
    }

    if (this.config.signatureHeader) {
      headers.set(this.config.signatureHeader, signature)
    }

    if (this.config.timestampHeader) {
      headers.set(this.config.timestampHeader, timestamp.toString())
    }

    if (this.config.nonceHeader && nonce) {
      headers.set(this.config.nonceHeader, nonce)
    }

    return {
      headers,
      signature,
      timestamp,
      nonce,
      canonicalString,
    }
  }

  async verifySignature(request: Request, publicKey?: string): Promise<SignatureVerification> {
    const prefix = this.options.headerPrefix || ''
    const headers = request.headers

    const signature =
      headers.get(`${prefix}Signature`) || headers.get(this.config.signatureHeader || '')
    const timestamp =
      headers.get(`${prefix}Timestamp`) || headers.get(this.config.timestampHeader || '')
    const nonce = headers.get(`${prefix}Nonce`) || headers.get(this.config.nonceHeader || '')
    const algorithm = headers.get(`${prefix}Algorithm`) as SigningAlgorithm

    if (!signature || !timestamp) {
      return {
        valid: false,
        algorithm: algorithm || this.config.algorithm,
        error: 'Missing signature or timestamp',
      }
    }

    // Check expiration
    if (this.config.expiresIn) {
      const age = Date.now() - parseInt(timestamp)
      if (age > this.config.expiresIn * 1000) {
        return {
          valid: false,
          expired: true,
          algorithm,
          error: 'Signature expired',
        }
      }
    }

    // Rebuild canonical string
    const canonicalString = await this.buildCanonicalString(
      request,
      request.url,
      parseInt(timestamp),
      nonce || undefined
    )

    // Verify signature
    const valid = await this.verifySignatureString(
      signature,
      canonicalString,
      publicKey || this.config.publicKey
    )

    return {
      valid,
      algorithm,
      expired: false,
    }
  }

  private async buildCanonicalString(
    request: Request | RequestInit,
    url?: string,
    timestamp?: number,
    nonce?: string
  ): Promise<string> {
    const parts: string[] = []

    // Get method and URL
    const method =
      request instanceof Request ? request.method : (request as RequestInit).method || 'GET'
    const requestUrl = request instanceof Request ? request.url : url || ''

    parts.push(method.toUpperCase())

    // Parse URL
    const urlObj = new URL(requestUrl)
    parts.push(urlObj.pathname)

    // Include query parameters if configured
    if (this.options.includeQuery && urlObj.search) {
      const sortedParams = this.getSortedQueryParams(urlObj.searchParams)
      parts.push(sortedParams)
    }

    // Include selected headers
    const headers =
      request instanceof Request ? request.headers : new Headers((request as RequestInit).headers)
    const headerString = this.getCanonicalHeaders(headers)
    if (headerString) {
      parts.push(headerString)
    }

    // Include body digest if configured
    if (this.options.includeBody && (request as RequestInit).body) {
      const bodyDigest = await this.getBodyDigest((request as RequestInit).body)
      parts.push(bodyDigest)
    }

    // Add timestamp and nonce
    if (timestamp) {
      parts.push(timestamp.toString())
    }

    if (nonce) {
      parts.push(nonce)
    }

    return parts.join('\\n')
  }

  private getCanonicalHeaders(headers: Headers): string {
    const includeHeaders = this.config.includeHeaders || []
    if (includeHeaders.length === 0) return ''

    const canonicalHeaders: string[] = []

    for (const headerName of includeHeaders) {
      const value = headers.get(headerName)
      if (value) {
        canonicalHeaders.push(`${headerName.toLowerCase()}:${value.trim()}`)
      }
    }

    return canonicalHeaders.sort().join('\\n')
  }

  private getSortedQueryParams(params: URLSearchParams): string {
    const sorted: string[] = []
    params.forEach((value, key) => {
      sorted.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    })
    return sorted.sort().join('&')
  }

  private async getBodyDigest(body: BodyInit | null | undefined): Promise<string> {
    let text = ''

    if (typeof body === 'string') {
      text = body
    } else if (body instanceof FormData) {
      // Convert FormData to string representation
      const parts: string[] = []
      body.forEach((value, key) => {
        parts.push(`${key}=${value}`)
      })
      text = parts.sort().join('&')
    } else if (body instanceof ArrayBuffer) {
      text = new TextDecoder().decode(body)
    } else if (body && typeof body === 'object') {
      text = JSON.stringify(body)
    }

    // Calculate digest
    const encoder = new TextEncoder()
    const data = encoder.encode(text)
    const hashBuffer = await crypto.subtle.digest(
      this.options.digestAlgorithm === 'sha512' ? 'SHA-512' : 'SHA-256',
      data
    )

    if (this.options.base64Encode) {
      return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)))
    }

    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }

  private async generateSignature(canonicalString: string): Promise<string> {
    switch (this.config.algorithm) {
      case 'hmac-sha256':
      case 'hmac-sha512':
        return await this.generateHMACSignature(canonicalString)

      case 'rsa':
      case 'ecdsa':
      case 'ed25519':
        return await this.generateAsymmetricSignature(canonicalString)

      default:
        throw new Error(`Unsupported signing algorithm: ${this.config.algorithm}`)
    }
  }

  private async generateHMACSignature(data: string): Promise<string> {
    const encoder = new TextEncoder()
    const algorithm = this.config.algorithm === 'hmac-sha512' ? 'SHA-512' : 'SHA-256'

    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.config.secret!),
      { name: 'HMAC', hash: algorithm },
      false,
      ['sign']
    )

    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data))

    if (this.options.base64Encode) {
      return btoa(String.fromCharCode(...new Uint8Array(signature)))
    }

    return Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }

  private async generateAsymmetricSignature(_data: string): Promise<string> {
    // Implementation would depend on the specific algorithm
    // This is a placeholder for RSA/ECDSA/Ed25519 signing
    throw new Error('Asymmetric signing not yet implemented')
  }

  private async verifySignatureString(
    signature: string,
    data: string,
    _publicKey?: string
  ): Promise<boolean> {
    switch (this.config.algorithm) {
      case 'hmac-sha256':
      case 'hmac-sha512': {
        const expectedSignature = await this.generateHMACSignature(data)
        return signature === expectedSignature
      }

      case 'rsa':
      case 'ecdsa':
      case 'ed25519':
        // Placeholder for asymmetric verification
        return false

      default:
        return false
    }
  }

  private generateNonce(): string {
    const array = new Uint8Array(16)
    crypto.getRandomValues(array)
    return Array.from(array)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }

  updateConfig(config: Partial<SigningConfig>): void {
    this.config = { ...this.config, ...config }
  }

  updateOptions(options: Partial<RequestSigningOptions>): void {
    this.options = { ...this.options, ...options }
  }
}
