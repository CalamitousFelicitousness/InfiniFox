import { Layout, X } from 'lucide-react'
import React, { useState } from 'react'

import { Icon } from '../../../components/common/Icon'
import '../../../themes/styles/components/menus.css'
import './AutoArrangeDialog.css'

interface AutoArrangeDialogProps {
  artboardId: string
  onConfirm: (options: {
    direction: 'horizontal' | 'vertical' | 'grid'
    spacing: number
    columns?: number
  }) => void
  onCancel: () => void
}

export const AutoArrangeDialog: React.FC<AutoArrangeDialogProps> = ({
  artboardId: _artboardId,
  onConfirm,
  onCancel,
}) => {
  const [direction, setDirection] = useState<'horizontal' | 'vertical' | 'grid'>('grid')
  const [spacing, setSpacing] = useState(20)
  const [columns, setColumns] = useState(3)

  const handleConfirm = () => {
    onConfirm({
      direction,
      spacing,
      columns: direction === 'grid' ? columns : undefined,
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm()
    } else if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <div className="auto-arrange-dialog-overlay" onPointerDown={onCancel}>
      <div
        className="auto-arrange-dialog glass-surface"
        onPointerDown={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="auto-arrange-dialog-header">
          <div className="auto-arrange-dialog-title">
            <Icon icon={Layout} size="base" />
            <span>Auto-arrange Children</span>
          </div>
          <button className="auto-arrange-dialog-close" onClick={onCancel} title="Close">
            <Icon icon={X} size="sm" />
          </button>
        </div>

        <div className="auto-arrange-dialog-content">
          <div className="form-group">
            <label>Direction</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  value="horizontal"
                  checked={direction === 'horizontal'}
                  onChange={(e) => setDirection(e.target.value as 'horizontal')}
                />
                <span>Horizontal</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  value="vertical"
                  checked={direction === 'vertical'}
                  onChange={(e) => setDirection(e.target.value as 'vertical')}
                />
                <span>Vertical</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  value="grid"
                  checked={direction === 'grid'}
                  onChange={(e) => setDirection(e.target.value as 'grid')}
                />
                <span>Grid</span>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="spacing">Spacing (px)</label>
            <input
              id="spacing"
              type="number"
              min="0"
              max="200"
              value={spacing}
              onChange={(e) => setSpacing(parseInt(e.target.value) || 0)}
              className="form-input"
            />
          </div>

          {direction === 'grid' && (
            <div className="form-group">
              <label htmlFor="columns">Columns</label>
              <input
                id="columns"
                type="number"
                min="1"
                max="20"
                value={columns}
                onChange={(e) => setColumns(parseInt(e.target.value) || 1)}
                className="form-input"
              />
            </div>
          )}
        </div>

        <div className="auto-arrange-dialog-footer">
          <button className="auto-arrange-dialog-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="auto-arrange-dialog-apply" onClick={handleConfirm}>
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}
