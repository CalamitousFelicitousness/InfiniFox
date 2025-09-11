import { Undo, Redo, Trash2, Clock, ChevronRight } from 'lucide-react'
import { useRef, useEffect, useState } from 'react'

import { useHistoryStore } from '../../store/historyStore'

export function HistoryPanel() {
  const [isExpanded, setIsExpanded] = useState(false)
  const { canUndo, canRedo, undo, redo, clearHistory, getHistoryList } = useHistoryStore()
  const history = getHistoryList()
  const listRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to current action only when navigating history, not when adding new items
  useEffect(() => {
    const currentIndex = history.findIndex((item) => item.isCurrent)
    if (currentIndex >= 0 && listRef.current) {
      // Only scroll if we're not at the last item (new addition)
      // or if the user has scrolled away from the bottom
      const isAtBottom =
        listRef.current.scrollHeight - listRef.current.scrollTop <=
        listRef.current.clientHeight + 10
      const isLastItem = currentIndex === history.length - 1

      // Only auto-scroll when navigating through history (undo/redo)
      // not when adding new items
      if (!isLastItem || !isAtBottom) {
        const items = listRef.current.querySelectorAll('.history-item')
        const targetItem = items[currentIndex]
        if (targetItem) {
          // Only scroll the history list, not the entire control panel
          const listRect = listRef.current.getBoundingClientRect()
          const itemRect = targetItem.getBoundingClientRect()

          // Check if item is already visible
          const isVisible = itemRect.top >= listRect.top && itemRect.bottom <= listRect.bottom

          if (!isVisible) {
            // Calculate the scroll position relative to the list container
            const scrollTop = targetItem.offsetTop - listRef.current.offsetTop
            listRef.current.scrollTop =
              scrollTop - listRef.current.clientHeight / 2 + targetItem.clientHeight / 2
          }
        }
      }
    }
  }, [history])

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString()
  }

  return (
    <div className={`panel history-panel ${isExpanded ? '' : 'collapsed'}`}>
      <div className="panel-header">
        <h3 className="panel-title">History</h3>
        <div className="panel-actions">
          <button
            onPointerDown={(e) => {
              e.preventDefault()
              undo()
            }}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="btn btn-xs btn-ghost"
          >
            <Undo className="icon-sm" />
          </button>
          <button
            onPointerDown={(e) => {
              e.preventDefault()
              redo()
            }}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
            className="btn btn-xs btn-ghost"
          >
            <Redo className="icon-sm" />
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
            className="btn btn-xs btn-ghost"
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
        <div className="history-list" ref={listRef}>
          {history.length === 0 ? (
            <div className="history-empty">No actions yet</div>
          ) : (
            history.map((item) => (
              <div key={item.id} className={`history-item ${item.isCurrent ? 'current' : ''}`}>
                <span className="history-item-icon">
                  <Clock className="icon-sm" />
                </span>
                <span className="history-item-label">{item.description}</span>
                <span className="history-item-time">{formatTime(item.timestamp)}</span>
              </div>
            ))
          )}
        </div>

        <div className="history-footer">
          <span>
            {history.length} action{history.length !== 1 ? 's' : ''}
          </span>
          <span>Max: 50</span>
        </div>
      </div>
    </div>
  )
}
