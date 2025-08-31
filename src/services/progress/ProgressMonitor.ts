export interface ProgressMessage {
  current: number
  total: number
  status: string
  preview?: string
  eta?: number
}

export type ProgressHandler = (message: ProgressMessage) => void

export interface ProgressMonitor {
  name: string
  isSupported(): Promise<boolean>
  connect(): Promise<void>
  disconnect(): void
  onProgress(handler: ProgressHandler): () => void
  isConnected(): boolean
}

export abstract class BaseProgressMonitor implements ProgressMonitor {
  abstract name: string
  protected handlers: Set<ProgressHandler> = new Set()
  protected connected = false

  abstract isSupported(): Promise<boolean>
  abstract connect(): Promise<void>
  abstract disconnect(): void

  onProgress(handler: ProgressHandler): () => void {
    this.handlers.add(handler)
    return () => {
      this.handlers.delete(handler)
    }
  }

  isConnected(): boolean {
    return this.connected
  }

  protected notifyHandlers(message: ProgressMessage): void {
    this.handlers.forEach((handler) => {
      try {
        handler(message)
      } catch (error) {
        console.error('Error in progress handler:', error)
      }
    })
  }
}
