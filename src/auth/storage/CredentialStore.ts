/**
 * Secure credential storage with encryption
 */

import { AuthLogger } from '../utils/AuthLogger'

import { EncryptionService } from './EncryptionService'

export type StorageType = 'localStorage' | 'sessionStorage' | 'memory' | 'indexedDB'

export interface StorageOptions {
  encryptionKey?: string
  storageType?: StorageType
  namespace?: string
  ttl?: number // Time to live in seconds
}

interface StoredItem {
  value: unknown
  expiresAt?: number
  encrypted: boolean
}

export class CredentialStore {
  private encryption: EncryptionService
  private storage: Storage | Map<string, StoredItem>
  private storageType: StorageType
  private namespace: string
  private cryptoKey: CryptoKey | null = null
  private salt: Uint8Array
  private logger: AuthLogger

  constructor(options: StorageOptions = {}) {
    this.encryption = new EncryptionService()
    this.storageType = options.storageType || 'localStorage'
    this.namespace = options.namespace || 'localStorage'
    this.logger = new AuthLogger('CredentialStore')
    this.salt = this.encryption.generateSalt()

    // Initialize storage backend
    switch (this.storageType) {
      case 'localStorage':
        this.storage = localStorage
        break
      case 'sessionStorage':
        this.storage = sessionStorage
        break
      case 'memory':
        this.storage = new Map()
        break
      case 'indexedDB':
        // TODO: Implement IndexedDB adapter
        this.storage = new Map()
        break
      default:
        this.storage = localStorage
    }

    // Initialize encryption key if provided
    if (options.encryptionKey) {
      this.initializeEncryption(options.encryptionKey)
    }
  }

  private async initializeEncryption(password: string): Promise<void> {
    try {
      this.cryptoKey = await this.encryption.generateKey(password, this.salt)
      this.logger.info('Encryption initialized')
    } catch (error) {
      this.logger.error('Failed to initialize encryption', error)
    }
  }

  private getFullKey(key: string): string {
    return `${this.namespace}_${key}`
  }

  async store(
    key: string,
    value: unknown,
    options?: { ttl?: number; encrypt?: boolean }
  ): Promise<void> {
    const fullKey = this.getFullKey(key)
    let storedValue: unknown = value
    let encrypted = false

    // Encrypt if requested and encryption is available
    if (options?.encrypt && this.cryptoKey) {
      try {
        const dataString = JSON.stringify(value)
        const { encrypted: encryptedData, iv } = await this.encryption.encrypt(
          dataString,
          this.cryptoKey
        )
        storedValue = {
          data: this.encryption.arrayBufferToBase64(encryptedData),
          iv: this.encryption.arrayBufferToBase64(iv),
        }
        encrypted = true
      } catch (error) {
        this.logger.error('Encryption failed, storing unencrypted', error)
      }
    }

    const item: StoredItem = {
      value: storedValue,
      encrypted,
      expiresAt: options?.ttl ? Date.now() + options.ttl * 1000 : undefined,
    }

    if (this.storage instanceof Map) {
      this.storage.set(fullKey, item)
    } else {
      this.storage.setItem(fullKey, JSON.stringify(item))
    }
  }

  async retrieve(key: string): Promise<unknown> {
    const fullKey = this.getFullKey(key)
    let item: StoredItem | null = null

    if (this.storage instanceof Map) {
      item = this.storage.get(fullKey) || null
    } else {
      const stored = this.storage.getItem(fullKey)
      if (stored) {
        try {
          item = JSON.parse(stored)
        } catch {
          this.logger.error('Failed to parse stored item')
        }
      }
    }

    if (!item) return null

    // Check expiration
    if (item.expiresAt && Date.now() > item.expiresAt) {
      await this.remove(key)
      return null
    }

    // Decrypt if needed
    if (item.encrypted && this.cryptoKey) {
      try {
        const encryptedBuffer = this.encryption.base64ToArrayBuffer(item.value.data)
        const iv = this.encryption.base64ToArrayBuffer(item.value.iv)
        const decrypted = await this.encryption.decrypt(encryptedBuffer, this.cryptoKey, iv)
        return JSON.parse(decrypted)
      } catch (error) {
        this.logger.error('Decryption failed', error)
        return null
      }
    }

    return item.value
  }

  async remove(key: string): Promise<void> {
    const fullKey = this.getFullKey(key)

    if (this.storage instanceof Map) {
      this.storage.delete(fullKey)
    } else {
      this.storage.removeItem(fullKey)
    }
  }

  async clear(): Promise<void> {
    if (this.storage instanceof Map) {
      this.storage.clear()
    } else {
      // Clear only items with our namespace
      const keysToRemove: string[] = []
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i)
        if (key?.startsWith(this.namespace)) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach((key) => this.storage.removeItem(key))
    }
  }

  async has(key: string): Promise<boolean> {
    const value = await this.retrieve(key)
    return value !== null
  }

  async storeMultiple(items: Map<string, unknown>): Promise<void> {
    for (const [key, value] of items) {
      await this.store(key, value)
    }
  }

  async retrieveMultiple(keys: string[]): Promise<Map<string, unknown>> {
    const results = new Map<string, unknown>()
    for (const key of keys) {
      const value = await this.retrieve(key)
      if (value !== null) {
        results.set(key, value)
      }
    }
    return results
  }
}

export default CredentialStore
