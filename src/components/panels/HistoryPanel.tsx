import { useRef, useEffect, useState } from 'preact/hooks'
import { Undo, Redo, Trash2, Clock, ChevronRight } from 'lucide-preact'

import { useHistoryStore } from '../../store/historyStore'

export function HistoryPanel() {
  const [isExpanded, setIsExpanded] = useState(false)
  const { canUndo, canRedo, undo, redo, clearHistory, getHistoryList } = useHistoryStore()
  const history = getHistoryList()
  const listRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to current action only when navigating history, not when adding new items
  useEffect(() => {
    const currentIndex = history.findIndex(item => item.isCurrent)
    if (currentIndex >= 0 && listRef.current) {
      // Only scroll if we're not at the last item (new addition)
      // or if the user has scrolled away from the bottom
      const isAtBottom = listRef.current.scrollHeight - listRef.current.scrollTop <= listRef.current.clientHeight + 10
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
            listRef.current.scrollTop = scrollTop - (listRef.current.clientHeight / 2) + (targetItem.clientHeight / 2)
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
    <div class={`panel history-panel ${isExpanded ? '' : 'collapsed'}`}>
      <div class="panel-header">
        <h3 class="panel-title">History</h3>
        <div class="panel-actions">
          <button
            onPointerDown={(e) => { e.preventDefault(); undo() }}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            class="btn btn-xs btn-ghost"
          >
            <Undo class="icon-sm" />
          </button>
          <button
            onPointerDown={(e) => { e.preventDefault(); redo() }}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
            class="btn btn-xs btn-ghost"
          >
            <Redo class="icon-sm" />
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
            class="btn btn-xs btn-ghost"
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

      <div class="panel-content">
        {isExpanded && (<>
          <div class="history-list" ref={listRef}>
            {history.length === 0 ? (
              <div class="history-empty">No actions yet</div>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  class={`history-item ${item.isCurrent ? 'current' : ''}`}
                >
                  <span class="history-item-icon">
                    <Clock class="icon-sm" />
                  </span>
                  <span class="history-item-label">{item.description}</span>
                  <span class="history-item-time">{formatTime(item.timestamp)}</span>
                </div>
              ))
            )}
          </div>

          <div class="history-footer">
            <span>{history.length} action{history.length !== 1 ? 's' : ''}</span>
            <span>Max: 50</span>
          </div>
        </>)}
      </div>
    </div>
  )
}
