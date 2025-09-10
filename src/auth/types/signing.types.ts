/**
 * Request Signing types for InfiniFox Authorization System
 */

export type SigningAlgorithm = 'rsa' | 'ecdsa' | 'ed25519' | 'hmac-sha256' | 'hmac-sha512'
export type CanonType = 'standard' | 'custom' | 'aws-v4' | 'google'

export interface SigningConfig {
  algorithm: SigningAlgorithm
  privateKey?: string
  publicKey?: string
  secret?: string
  includeHeaders: string[]
  canonicalization: CanonType
  signatureHeader?: string
  timestampHeader?: string
  nonceHeader?: string
  expiresIn?: number
}

export interface SignedRequest {
  headers: Headers
  signature: string
  timestamp: number
  nonce?: string
  canonicalString: string
}

export interface SignatureVerification {
  valid: boolean
  expired?: boolean
  algorithm: SigningAlgorithm
  subject?: string
  issuer?: string
  error?: string
}

export interface RequestSigningOptions {
  includeBody?: boolean
  includeQuery?: boolean
  digestAlgorithm?: 'sha256' | 'sha512'
  base64Encode?: boolean
  headerPrefix?: string
}
