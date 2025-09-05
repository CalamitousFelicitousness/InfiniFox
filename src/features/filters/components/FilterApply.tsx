/**
 * FilterApply.tsx - Apply/Cancel buttons for filter panel
 */

interface FilterApplyProps {
  onApply: () => void
  onCancel: () => void
  isApplying: boolean
  hasFilters: boolean
}

export function FilterApply({ onApply, onCancel, isApplying, hasFilters }: FilterApplyProps) {
  return (
    <div class="filter-actions">
      <button
        class="apply-btn"
        onClick={onApply}
        disabled={!hasFilters || isApplying}
        title="Apply filters to image"
      >
        {isApplying ? 'Applying...' : 'Apply Filters'}
      </button>
      
      <button
        class="cancel-btn"
        onClick={onCancel}
        title="Cancel and close"
      >
        Cancel
      </button>
    </div>
  )
}
