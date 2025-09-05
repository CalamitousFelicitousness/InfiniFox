/**
 * FilterHistory.tsx - Undo/Redo controls for filter operations
 */

interface FilterHistoryProps {
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
}

export function FilterHistory({ onUndo, onRedo, canUndo, canRedo }: FilterHistoryProps) {
  return (
    <div class="filter-history">
      <button
        class="history-btn"
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
        aria-label="Undo last filter change"
      >
        <span>↶</span>
        <span>Undo</span>
      </button>
      
      <button
        class="history-btn"
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo (Ctrl+Y)"
        aria-label="Redo last undone change"
      >
        <span>↷</span>
        <span>Redo</span>
      </button>
    </div>
  )
}
