import { useRef, useState } from 'preact/hooks'
import { 
  Clock, 
  Play, 
  Pause, 
  Trash2, 
  X, 
  RefreshCw, 
  ChevronUp, 
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  Ban,
  Loader2,
  HelpCircle
} from 'lucide-preact'

import { useQueueStore } from '../../store/queueStore'

export function QueuePanel() {
  const [isExpanded, setIsExpanded] = useState(false)
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
        return <Clock class="icon-base" />
      case 'processing':
        return <Loader2 class="icon-base animate-spin" />
      case 'completed':
        return <CheckCircle class="icon-base" />
      case 'failed':
        return <XCircle class="icon-base" />
      case 'cancelled':
        return <Ban class="icon-base" />
      default:
        return <HelpCircle class="icon-base" />
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
    <div class={`panel queue-panel ${isExpanded ? '' : 'collapsed'}`} ref={panelRef}>
      <div class="panel-header">
        <h3 class="panel-title">Queue ({stats.total})</h3>
        <div class="panel-actions">
          {isProcessing ? (
            <button 
              onPointerDown={(e) => { e.preventDefault(); stopProcessing() }}
              class="btn btn-sm btn-secondary"
            >
              <Pause class="icon-sm" />
              <span>Pause</span>
            </button>
          ) : (
            <button
              onPointerDown={(e) => { e.preventDefault(); startProcessing() }}
              disabled={stats.pending === 0}
              class="btn btn-sm btn-success"
            >
              <Play class="icon-sm" />
              <span>Start</span>
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
            class="btn btn-sm btn-ghost"
          >
            <Trash2 class="icon-sm" />
          </button>
          <button
            class="settings-toggle"
            onPointerDown={(e) => {
              e.preventDefault()
              setIsExpanded(!isExpanded)
            }}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            <ChevronRight class="icon-base" />
          </button>
        </div>
      </div>

      <div class={`panel-content ${!isExpanded ? 'collapsed' : ''}`}>
        {isExpanded && (<>
          <div class="queue-stats">
            <span class="queue-stat pending">
              <Clock class="icon-sm" />
              <span>{stats.pending}</span>
            </span>
            <span class="queue-stat processing">
              <Loader2 class="icon-sm" />
              <span>{stats.processing}</span>
            </span>
            <span class="queue-stat completed">
              <CheckCircle class="icon-sm" />
              <span>{stats.completed}</span>
            </span>
            <span class="queue-stat failed">
              <XCircle class="icon-sm" />
              <span>{stats.failed}</span>
            </span>
          </div>

          <div class="queue-list" ref={listRef}>
            {queue.length === 0 ? (
              <div class="queue-empty">Queue is empty</div>
            ) : (
              queue.map((item, index) => (
            <div
              key={item.id}
              class={`queue-item ${item.status} ${
                currentItem?.id === item.id ? 'active' : ''
              }`}
            >
              <div class="queue-item-header">
                <span class={`queue-item-status status-${item.status}`}>
                  {getStatusIcon(item.status)}
                </span>
                <span class="queue-item-prompt">{getItemDescription(item)}</span>
              </div>

              <div class="queue-item-params">
                <span class="queue-item-time">{formatTime(item.createdAt)}</span>
                {item.retryCount > 0 && (
                  <span class="queue-item-retry">Retry {item.retryCount}/{item.maxRetries}</span>
                )}
              </div>

              {item.progress !== undefined && item.status === 'processing' && (
                <div class="queue-progress">
                  <div
                    class="queue-progress-bar"
                    style={`width: ${item.progress}%`}
                  />
                </div>
              )}

              <div class="queue-item-actions">
                {item.status === 'pending' && (
                  <>
                    <button
                      class="btn btn-xs btn-ghost"
                      onPointerDown={(e) => { 
                        e.preventDefault()
                        e.stopPropagation()
                        moveInQueue(item.id, 'up')
                      }}
                      disabled={index === 0}
                      title="Move up"
                    >
                      <ChevronUp class="icon-sm" />
                    </button>
                    <button
                      class="btn btn-xs btn-ghost"
                      onPointerDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        moveInQueue(item.id, 'down')
                      }}
                      disabled={index === queue.length - 1}
                      title="Move down"
                    >
                      <ChevronDown class="icon-sm" />
                    </button>
                  </>
                )}
                
                {item.status === 'failed' && (
                  <button 
                    class="btn btn-xs btn-ghost"
                    onPointerDown={(e) => { e.preventDefault(); retryItem(item.id) }} 
                    title="Retry"
                  >
                    <RefreshCw class="icon-sm" />
                  </button>
                )}
                
                {(item.status === 'pending' || item.status === 'processing') && (
                  <button 
                    class="btn btn-xs btn-ghost"
                    onPointerDown={(e) => { e.preventDefault(); cancelItem(item.id) }} 
                    title="Cancel"
                  >
                    <X class="icon-sm" />
                  </button>
                )}
                
                <button 
                  class="btn btn-xs btn-ghost"
                  onPointerDown={(e) => { e.preventDefault(); removeFromQueue(item.id) }} 
                  title="Remove"
                >
                  <Trash2 class="icon-sm" />
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
        </>)}
      </div>
    </div>
  )
}
