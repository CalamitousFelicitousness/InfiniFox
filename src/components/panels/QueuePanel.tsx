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
  HelpCircle,
} from 'lucide-react'
import { useRef, useState } from 'react'

import type { QueueItem } from '../../store/queueStore'
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
        return <Clock className="icon-base" />
      case 'processing':
        return <Loader2 className="icon-base animate-spin" />
      case 'completed':
        return <CheckCircle className="icon-base" />
      case 'failed':
        return <XCircle className="icon-base" />
      case 'cancelled':
        return <Ban className="icon-base" />
      default:
        return <HelpCircle className="icon-base" />
    }
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString()
  }

  const getItemDescription = (item: QueueItem) => {
    const prompt = item.params.prompt
    const truncated = prompt.length > 50 ? prompt.substring(0, 50) + '...' : prompt
    return `${item.type}: ${truncated}`
  }

  return (
    <div className={`panel queue-panel ${isExpanded ? '' : 'collapsed'}`} ref={panelRef}>
      <div className="panel-header">
        <h3 className="panel-title">Queue ({stats.total})</h3>
        <div className="panel-actions">
          {isProcessing ? (
            <button
              onPointerDown={(e) => {
                e.preventDefault()
                stopProcessing()
              }}
              className="btn btn-sm btn-secondary"
            >
              <Pause className="icon-sm" />
              <span>Pause</span>
            </button>
          ) : (
            <button
              onPointerDown={(e) => {
                e.preventDefault()
                startProcessing()
              }}
              disabled={stats.pending === 0}
              className="btn btn-sm btn-success"
            >
              <Play className="icon-sm" />
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
            className="btn btn-sm btn-ghost"
          >
            <Trash2 className="icon-sm" />
          </button>
          <button
            className="settings-toggle"
            onPointerDown={(e) => {
              e.preventDefault()
              setIsExpanded(!isExpanded)
            }}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            <ChevronRight className="icon-base" />
          </button>
        </div>
      </div>

      <div className={`panel-content ${!isExpanded ? 'collapsed' : ''}`}>
        <div className="queue-stats">
              <span className="queue-stat pending">
                <Clock className="icon-sm" />
                <span>{stats.pending}</span>
              </span>
              <span className="queue-stat processing">
                <Loader2 className="icon-sm" />
                <span>{stats.processing}</span>
              </span>
              <span className="queue-stat completed">
                <CheckCircle className="icon-sm" />
                <span>{stats.completed}</span>
              </span>
              <span className="queue-stat failed">
                <XCircle className="icon-sm" />
                <span>{stats.failed}</span>
              </span>
            </div>

            <div className="queue-list" ref={listRef}>
              {queue.length === 0 ? (
                <div className="queue-empty">Queue is empty</div>
              ) : (
                queue.map((item, index) => (
                  <div
                    key={item.id}
                    className={`queue-item ${item.status} ${
                      currentItem?.id === item.id ? 'active' : ''
                    }`}
                  >
                    <div className="queue-item-header">
                      <span className={`queue-item-status status-${item.status}`}>
                        {getStatusIcon(item.status)}
                      </span>
                      <span className="queue-item-prompt">{getItemDescription(item)}</span>
                    </div>

                    <div className="queue-item-params">
                      <span className="queue-item-time">{formatTime(item.createdAt)}</span>
                      {item.retryCount > 0 && (
                        <span className="queue-item-retry">
                          Retry {item.retryCount}/{item.maxRetries}
                        </span>
                      )}
                    </div>

                    {item.progress !== undefined && item.status === 'processing' && (
                      <div className="queue-progress">
                        <div className="queue-progress-bar" style={`width: ${item.progress}%`} />
                      </div>
                    )}

                    <div className="queue-item-actions">
                      {item.status === 'pending' && (
                        <>
                          <button
                            className="btn btn-xs btn-ghost"
                            onPointerDown={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              moveInQueue(item.id, 'up')
                            }}
                            disabled={index === 0}
                            title="Move up"
                          >
                            <ChevronUp className="icon-sm" />
                          </button>
                          <button
                            className="btn btn-xs btn-ghost"
                            onPointerDown={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              moveInQueue(item.id, 'down')
                            }}
                            disabled={index === queue.length - 1}
                            title="Move down"
                          >
                            <ChevronDown className="icon-sm" />
                          </button>
                        </>
                      )}

                      {item.status === 'failed' && (
                        <button
                          className="btn btn-xs btn-ghost"
                          onPointerDown={(e) => {
                            e.preventDefault()
                            retryItem(item.id)
                          }}
                          title="Retry"
                        >
                          <RefreshCw className="icon-sm" />
                        </button>
                      )}

                      {(item.status === 'pending' || item.status === 'processing') && (
                        <button
                          className="btn btn-xs btn-ghost"
                          onPointerDown={(e) => {
                            e.preventDefault()
                            cancelItem(item.id)
                          }}
                          title="Cancel"
                        >
                          <X className="icon-sm" />
                        </button>
                      )}

                      <button
                        className="btn btn-xs btn-ghost"
                        onPointerDown={(e) => {
                          e.preventDefault()
                          removeFromQueue(item.id)
                        }}
                        title="Remove"
                      >
                        <Trash2 className="icon-sm" />
                      </button>
                    </div>

                    {item.result && (
                      <div className="queue-item-result">
                        <img src={`data:image/png;base64,${item.result}`} alt="Result" />
                      </div>
                    )}

                    {item.error && <div className="queue-item-error">Error: {item.error}</div>}
                  </div>
                ))
              )}
            </div>
      </div>
    </div>
  )
}
