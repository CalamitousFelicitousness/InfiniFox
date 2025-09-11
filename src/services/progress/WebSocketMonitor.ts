import { BaseProgressMonitor, type ProgressMessage } from './ProgressMonitor'

export class WebSocketMonitor extends BaseProgressMonitor {
  name = 'WebSocket'
  private ws: WebSocket | null = null
  private url: string = ''
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private reconnectTimeoutId: NodeJS.Timeout | null = null

  constructor() {
    super()
  }

  private getWsUrl(): string {
    // Get from localStorage directly to avoid circular dependency
    const stored = localStorage.getItem('sdnextnewui-store')
    const data = stored ? JSON.parse(stored) : {}
    const wsUrl = data.state?.apiSettings?.wsUrl || '127.0.0.1:7860'
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${wsUrl}/ws`
  }

  async isSupported(): Promise<boolean> {
    try {
      this.url = this.getWsUrl()
      console.log('Testing WebSocket support at:', this.url)

      // Try to connect briefly to test support
      return new Promise((resolve) => {
        let testWs: WebSocket | null = null
        const timeout = setTimeout(() => {
          if (testWs) testWs.close()
          console.log('WebSocket connection timed out')
          resolve(false)
        }, 2000) // Reduced timeout to 2 seconds

        try {
          testWs = new WebSocket(this.url)
        } catch {
          // Immediate connection error - likely not supported
          clearTimeout(timeout)
          console.log('WebSocket not available at this endpoint')
          resolve(false)
          return
        }

        testWs.onopen = () => {
          clearTimeout(timeout)
          testWs.close()
          console.log('WebSocket connection successful')
          resolve(true)
        }

        testWs.onerror = () => {
          clearTimeout(timeout)
          // Don't log error - it's expected for APIs without WebSocket
          resolve(false)
        }
      })
    } catch {
      return false
    }
  }

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return
    }

    this.url = this.getWsUrl()

    try {
      this.ws = new WebSocket(this.url)

      this.ws.onopen = () => {
        console.log('WebSocket connected')
        this.connected = true
        this.reconnectAttempts = 0
      }

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as ProgressMessage
          this.notifyHandlers(message)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        this.connected = false
      }

      this.ws.onclose = () => {
        console.log('WebSocket disconnected')
        this.connected = false
        this.reconnect()
      }
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      this.connected = false
      this.reconnect()
    }
  }

  disconnect(): void {
    this.connected = false

    // Cancel any pending reconnection
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId)
      this.reconnectTimeoutId = null
    }

    // Remove all event handlers before closing to prevent memory leaks
    if (this.ws) {
      this.ws.onopen = null
      this.ws.onmessage = null
      this.ws.onerror = null
      this.ws.onclose = null
      this.ws.close()
      this.ws = null
    }

    // Clear handler set
    this.handlers.clear()
  }

  private reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max WebSocket reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

    console.log(`WebSocket reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)

    // Clear any existing reconnect timeout
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId)
    }

    this.reconnectTimeoutId = setTimeout(() => {
      this.reconnectTimeoutId = null
      this.connect().catch(console.error)
    }, delay)
  }

  send(data: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    } else {
      console.warn('WebSocket is not connected')
    }
  }
}
