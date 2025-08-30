import { useRef } from 'preact/hooks'

import { useQueueStore } from '../../store/queueStore'
import './QueuePanel.css'

export function QueuePanel() {
  const {
    queue,
    currentItem,
    isProcessing,
    startProcessing,
    stopProcessing,
    removeFromQueue,
    clearQueue,
    moveInQueue,
    retryItem,
    cancelItem,
    getQueueStats,
  } = useQueueStore()

  const stats = getQueueStats()
  const panelRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return '⏳'
      case 'processing':
        return '🔄'
      case 'completed':
        return '✅'
      case 'failed':
        return '❌'
      case 'cancelled':
        return '🚫'
      default:
        return '❓'
    }
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString()
  }

  const getItemDescription = (item: any) => {
    const prompt = item.params.prompt
    const truncated = prompt.length > 50 ? prompt.substring(0, 50) + '...' : prompt
    return `${item.type}: ${truncated}`
  }

  return (
    <div class="queue-panel" ref={panelRef}>
      <div class="queue-header">
        <h3>Queue ({stats.total})</h3>
        <div class="queue-controls">
          {isProcessing ? (
            <button 
              onPointerDown={(e) => { e.preventDefault(); stopProcessing() }}
              class="queue-btn stop"
            >
              ⏸️ Pause
            </button>
          ) : (
            <button
              onPointerDown={(e) => { e.preventDefault(); startProcessing() }}
              disabled={stats.pending === 0}
              class="queue-btn start"
            >
              ▶️ Start
            </button>
          )}
          <button
            onPointerDown={(e) => {
              e.preventDefault()
              if (confirm('Clear all queue items?')) {
                clearQueue()
              }
            }}
            disabled={queue.length === 0}
            class="queue-btn clear"
          >
            Clear
          </button>
        </div>
      </div>

      <div class="queue-stats">
        <span class="stat pending">⏳ {stats.pending}</span>
        <span class="stat processing">🔄 {stats.processing}</span>
        <span class="stat completed">✅ {stats.completed}</span>
        <span class="stat failed">❌ {stats.failed}</span>
      </div>

      <div class="queue-list" ref={listRef}>
        {queue.length === 0 ? (
          <div class="queue-empty">Queue is empty</div>
        ) : (
          queue.map((item, index) => (
            <div
              key={item.id}
              class={`queue-item ${item.status} ${
                currentItem?.id === item.id ? 'current' : ''
              }`}
            >
              <div class="queue-item-header">
                <span class="queue-item-status">{getStatusIcon(item.status)}</span>
                <span class="queue-item-description">{getItemDescription(item)}</span>
              </div>

              <div class="queue-item-info">
                <span class="queue-item-time">{formatTime(item.createdAt)}</span>
                {item.retryCount > 0 && (
                  <span class="queue-item-retry">Retry {item.retryCount}/{item.maxRetries}</span>
                )}
              </div>

              {item.progress !== undefined && item.status === 'processing' && (
                <div class="queue-item-progress">
                  <div
                    class="queue-item-progress-bar"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              )}

              <div class="queue-item-actions">
                {item.status === 'pending' && (
                  <>
                    <button
                      onPointerDown={(e) => { 
                        e.preventDefault()
                        e.stopPropagation()
                        moveInQueue(item.id, 'up')
                      }}
                      disabled={index === 0}
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      onPointerDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        moveInQueue(item.id, 'down')
                      }}
                      disabled={index === queue.length - 1}
                      title="Move down"
                    >
                      ↓
                    </button>
                  </>
                )}
                
                {item.status === 'failed' && (
                  <button onPointerDown={(e) => { e.preventDefault(); retryItem(item.id) }} title="Retry">
                    🔄
                  </button>
                )}
                
                {(item.status === 'pending' || item.status === 'processing') && (
                  <button onPointerDown={(e) => { e.preventDefault(); cancelItem(item.id) }} title="Cancel">
                    ✖
                  </button>
                )}
                
                <button onPointerDown={(e) => { e.preventDefault(); removeFromQueue(item.id) }} title="Remove">
                  🗑️
                </button>
              </div>

              {item.result && (
                <div class="queue-item-result">
                  <img
                    src={`data:image/png;base64,${item.result}`}
                    alt="Result"
                  />
                </div>
              )}

              {item.error && (
                <div class="queue-item-error">
                  Error: {item.error}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
