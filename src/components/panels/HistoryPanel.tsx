import { useRef, useEffect } from 'preact/hooks'

import { useHistoryStore } from '../../store/historyStore'
import './HistoryPanel.css'

export function HistoryPanel() {
  const { canUndo, canRedo, undo, redo, clearHistory, getHistoryList } = useHistoryStore()
  const history = getHistoryList()
  const listRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to current action
  useEffect(() => {
    const currentIndex = history.findIndex(item => item.isCurrent)
    if (currentIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('.history-item')
      items[currentIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [history])

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString()
  }

  return (
    <div class="history-panel">
      <div class="history-header">
        <h3>History</h3>
        <div class="history-controls">
          <button
            onPointerDown={(e) => { e.preventDefault(); undo() }}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            class="history-btn"
          >
            ↶
          </button>
          <button
            onPointerDown={(e) => { e.preventDefault(); redo() }}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
            class="history-btn"
          >
            ↷
          </button>
          <button
            onPointerDown={(e) => {
              e.preventDefault()
              if (confirm('Clear all history?')) {
                clearHistory()
              }
            }}
            disabled={history.length === 0}
            title="Clear History"
            class="history-btn"
          >
            🗑️
          </button>
        </div>
      </div>

      <div class="history-list" ref={listRef}>
        {history.length === 0 ? (
          <div class="history-empty">No actions yet</div>
        ) : (
          history.map((item) => (
            <div
              key={item.id}
              class={`history-item ${item.isCurrent ? 'current' : ''}`}
            >
              <span class="history-description">{item.description}</span>
              <span class="history-time">{formatTime(item.timestamp)}</span>
            </div>
          ))
        )}
      </div>

      <div class="history-info">
        <span>{history.length} action{history.length !== 1 ? 's' : ''}</span>
        <span>Max: 50</span>
      </div>
    </div>
  )
}
