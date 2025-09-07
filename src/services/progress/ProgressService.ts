import { useStore } from '../../store/store'

import type { ProgressMonitor, ProgressHandler } from './ProgressMonitor'
import { RestPollingMonitor } from './RestPollingMonitor'
import { WebSocketMonitor } from './WebSocketMonitor'

export type ProgressMethod = 'auto' | 'websocket' | 'rest' | 'none'

// Re-export types for external use
export type { ProgressMessage, ProgressHandler } from './ProgressMonitor'

export class ProgressService {
  private monitors: Map<string, ProgressMonitor> = new Map()
  private activeMonitor: ProgressMonitor | null = null
  private handlers: Set<ProgressHandler> = new Set()
  private method: ProgressMethod = 'auto'

  constructor() {
    this.setupMonitors()
  }

  private setupMonitors(): void {
    // Setup available monitors
    const wsMonitor = new WebSocketMonitor(() => {
      const apiSettings = useStore.getState().apiSettings
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      return `${protocol}//${apiSettings.wsUrl}/ws`
    })

    const restMonitor = new RestPollingMonitor(() => {
      const apiSettings = useStore.getState().apiSettings
      return apiSettings.apiUrl
    })

    this.monitors.set('websocket', wsMonitor)
    this.monitors.set('rest', restMonitor)
  }

  private getApiType(): string {
    // Get from localStorage directly to avoid timing issues
    const stored = localStorage.getItem('sdnextnewui-store')
    const data = stored ? JSON.parse(stored) : {}
    return data.state?.apiSettings?.apiType || 'sdnext'
  }

  private supportsWebSocket(apiType: string): boolean {
    // Known API types that don't support WebSocket
    const noWebSocketSupport = ['sdnext']
    return !noWebSocketSupport.includes(apiType)
  }

  async setMethod(method: ProgressMethod): Promise<boolean> {
    // Default to 'auto' if method is undefined
    if (!method) {
      method = 'auto'
    }

    this.method = method
    console.log(`Setting progress method to: ${method}`)

    // Disconnect current monitor
    if (this.activeMonitor) {
      this.activeMonitor.disconnect()
      this.activeMonitor = null
    }

    if (method === 'none') {
      return true
    }

    // Get current API type
    const apiType = this.getApiType()
    console.log(`API type: ${apiType}`)

    // Auto-detect best available method
    if (method === 'auto') {
      // Try WebSocket first, but only if the API type supports it
      if (this.supportsWebSocket(apiType)) {
        const wsMonitor = this.monitors.get('websocket')
        if (wsMonitor) {
          console.log('Testing WebSocket monitor...')
          const wsSupported = await wsMonitor.isSupported()
          if (wsSupported) {
            this.activeMonitor = wsMonitor
            console.log('WebSocket monitor selected')
          }
        }
      } else {
        console.log(`Skipping WebSocket for API type: ${apiType} (not supported)`)
      }

      if (!this.activeMonitor) {
        const restMonitor = this.monitors.get('rest')
        if (restMonitor) {
          console.log('Testing REST polling monitor...')
          const restSupported = await restMonitor.isSupported()
          if (restSupported) {
            this.activeMonitor = restMonitor
            console.log('REST polling monitor selected')
          }
        }
      }
    } else {
      // Use specific method
      if (method === 'websocket' && !this.supportsWebSocket(apiType)) {
        console.warn(`WebSocket not supported for API type: ${apiType}`)
        // Fall back to REST
        const restMonitor = this.monitors.get('rest')
        if (restMonitor && (await restMonitor.isSupported())) {
          this.activeMonitor = restMonitor
          console.log('Falling back to REST polling')
        }
      } else {
        const monitor = this.monitors.get(method)
        if (monitor && (await monitor.isSupported())) {
          this.activeMonitor = monitor
        }
      }
    }

    // Connect and setup handlers
    if (this.activeMonitor) {
      await this.activeMonitor.connect()

      // Forward messages from monitor to our handlers
      this.activeMonitor.onProgress((message) => {
        this.handlers.forEach((handler) => handler(message))
      })

      console.log(`Progress monitoring using: ${this.activeMonitor.name}`)
      return true
    }

    console.warn('No progress monitoring method available')
    return false
  }

  async connect(): Promise<void> {
    if (!this.activeMonitor && this.method === 'auto') {
      await this.setMethod('auto')
    } else if (!this.activeMonitor && !this.method) {
      // If no method is set, default to auto
      await this.setMethod('auto')
    } else if (this.activeMonitor && !this.activeMonitor.isConnected()) {
      await this.activeMonitor.connect()
    } else if (!this.activeMonitor) {
      // Fallback to auto if nothing else works
      await this.setMethod('auto')
    }
  }

  disconnect(): void {
    if (this.activeMonitor) {
      this.activeMonitor.disconnect()
    }
  }

  onProgress(handler: ProgressHandler): () => void {
    this.handlers.add(handler)

    // If we have an active monitor, also register with it
    let unsubscribe: (() => void) | null = null
    if (this.activeMonitor) {
      unsubscribe = this.activeMonitor.onProgress(handler)
    }

    return () => {
      this.handlers.delete(handler)
      unsubscribe?.()
    }
  }

  getActiveMethod(): string {
    if (!this.activeMonitor) return 'none'
    return this.activeMonitor.name
  }

  isConnected(): boolean {
    return this.activeMonitor?.isConnected() || false
  }

  // Start polling for REST-based progress (called when generation starts)
  startPolling(jobId?: string): void {
    if (this.activeMonitor && 'startPolling' in this.activeMonitor) {
      ;(this.activeMonitor as RestPollingMonitor).startPolling(jobId)
    }
  }

  // Stop polling for REST-based progress
  stopPolling(forceComplete: boolean = false): void {
    if (this.activeMonitor && 'stopPolling' in this.activeMonitor) {
      ;(this.activeMonitor as RestPollingMonitor).stopPolling(forceComplete)
    }
  }
}

// Export singleton
export const progressService = new ProgressService()

// Auto-connect on import
if (typeof window !== 'undefined') {
  progressService.connect().catch(console.error)
}
