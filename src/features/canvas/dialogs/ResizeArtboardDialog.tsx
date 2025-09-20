import { Maximize2, X, Lock, Unlock } from 'lucide-react'
import { useState } from 'react'

import { Icon } from '../../../components/common/Icon'
import './ResizeArtboardDialog.css'

export interface ResizeDialogProps {
  artboardId: string
  currentWidth: number
  currentHeight: number
  onResize: (width: number, height: number) => void
  onClose: () => void
}

const PRESET_SIZES = [
  { name: 'HD', width: 1920, height: 1080 },
  { name: 'Square', width: 1080, height: 1080 },
  { name: '4K', width: 3840, height: 2160 },
  { name: 'Mobile', width: 375, height: 812 },
  { name: 'Tablet', width: 768, height: 1024 },
]

export function ResizeArtboardDialog({
  currentWidth,
  currentHeight,
  onResize,
  onClose,
}: ResizeDialogProps) {
  const [width, setWidth] = useState(currentWidth)
  const [height, setHeight] = useState(currentHeight)
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(false)
  const aspectRatio = currentWidth / currentHeight

  const handleWidthChange = (value: number) => {
    setWidth(value)
    if (maintainAspectRatio) {
      setHeight(Math.round(value / aspectRatio))
    }
  }

  const handleHeightChange = (value: number) => {
    setHeight(value)
    if (maintainAspectRatio) {
      setWidth(Math.round(value * aspectRatio))
    }
  }

  const handlePresetClick = (preset: { width: number; height: number }) => {
    setWidth(preset.width)
    setHeight(preset.height)
    setMaintainAspectRatio(false)
  }

  const handleSubmit = () => {
    if (width > 0 && height > 0) {
      onResize(width, height)
      onClose()
    }
  }

  return (
    <div className="resize-dialog-overlay" onPointerDown={onClose}>
      <div className="resize-dialog glass-surface" onPointerDown={(e) => e.stopPropagation()}>
        <div className="resize-dialog-header">
          <div className="resize-dialog-title">
            <Icon icon={Maximize2} size="base" />
            <span>Resize Artboard</span>
          </div>
          <button className="resize-dialog-close" onClick={onClose} title="Close">
            <Icon icon={X} size="sm" />
          </button>
        </div>

        <div className="resize-dialog-content">
          <div className="resize-dialog-inputs">
            <div className="resize-dialog-input-group">
              <label htmlFor="width">Width (px)</label>
              <input
                id="width"
                type="number"
                min="1"
                max="10000"
                value={width}
                onChange={(e) => handleWidthChange(parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="resize-dialog-input-group">
              <label htmlFor="height">Height (px)</label>
              <input
                id="height"
                type="number"
                min="1"
                max="10000"
                value={height}
                onChange={(e) => handleHeightChange(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="resize-dialog-checkbox">
            <input
              id="aspect-ratio"
              type="checkbox"
              checked={maintainAspectRatio}
              onChange={(e) => setMaintainAspectRatio(e.target.checked)}
            />
            <label htmlFor="aspect-ratio">
              <Icon icon={maintainAspectRatio ? Lock : Unlock} size="sm" />
              <span>Maintain Aspect Ratio</span>
            </label>
          </div>

          <div className="resize-dialog-presets">
            <h4>Preset Sizes</h4>
            <div className="resize-dialog-preset-grid">
              {PRESET_SIZES.map((preset) => (
                <button
                  key={preset.name}
                  className="resize-dialog-preset"
                  onClick={() => handlePresetClick(preset)}
                >
                  <span className="resize-dialog-preset-name">{preset.name}</span>
                  <span className="resize-dialog-preset-size">
                    {preset.width} × {preset.height}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="resize-dialog-footer">
          <button className="resize-dialog-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="resize-dialog-apply" onClick={handleSubmit}>
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}
