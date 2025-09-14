import React from 'react'
import { useStore } from '../../../store/store'
import './SelectionCounter.css'

export const SelectionCounter: React.FC = () => {
  const selectedIds = useStore((state) => state.selectedIds)
  const selectedCount = selectedIds.size

  if (selectedCount === 0) {
    return null
  }

  return (
    <div className="selection-counter">
      <span className="selection-count">{selectedCount}</span>
      <span className="selection-label">
        {selectedCount === 1 ? 'item selected' : 'items selected'}
      </span>
    </div>
  )
}
