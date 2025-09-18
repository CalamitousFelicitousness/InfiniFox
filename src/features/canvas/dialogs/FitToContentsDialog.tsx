import React, { useState } from 'react'
import '../../../themes/styles/components/menus.css'
import './FitToContentsDialog.css'

interface FitToContentsDialogProps {
  artboardId: string
  onConfirm: (padding: number) => void
  onCancel: () => void
}

export const FitToContentsDialog: React.FC<FitToContentsDialogProps> = ({
  artboardId: _artboardId,
  onConfirm,
  onCancel,
}) => {
  const [padding, setPadding] = useState(20)

  const handleConfirm = () => {
    onConfirm(padding)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm()
    } else if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <div className="dialog-overlay" onPointerDown={onCancel}>
      <div
        className="dialog fit-to-contents-dialog"
        onPointerDown={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <h3 className="dialog-title">Fit Artboard to Contents</h3>

        <div className="dialog-content">
          <div className="form-group">
            <label htmlFor="padding">Padding (px)</label>
            <input
              id="padding"
              type="number"
              min="0"
              max="200"
              value={padding}
              onChange={(e) => setPadding(parseInt(e.target.value) || 0)}
              className="form-input"
              autoFocus
            />
            <span className="form-hint">
              Distance between content edges and artboard boundaries
            </span>
          </div>
        </div>

        <div className="dialog-actions">
          <button className="button button-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="button button-primary" onClick={handleConfirm}>
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}
