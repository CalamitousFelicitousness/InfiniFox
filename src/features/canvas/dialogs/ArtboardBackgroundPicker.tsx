import { Palette, X } from 'lucide-react'
import { useState } from 'react'

import { Icon } from '../../../components/common/Icon'
import './ArtboardBackgroundPicker.css'

export interface BackgroundPickerProps {
  artboardId: string
  currentColor: string
  onColorChange: (color: string) => void
  onClose: () => void
}

const PRESET_COLORS = [
  '#FFFFFF',
  '#000000',
  '#F3F4F6',
  '#E5E7EB',
  '#D1D5DB',
  '#9CA3AF',
  '#6B7280',
  '#4B5563',
  '#374151',
  '#1F2937',
  '#FEF3C7',
  '#FDE68A',
  '#FCD34D',
  '#FBBF24',
  '#F59E0B',
  '#DBEAFE',
  '#BFDBFE',
  '#93C5FD',
  '#60A5FA',
  '#3B82F6',
  '#DCFCE7',
  '#BBF7D0',
  '#86EFAC',
  '#4ADE80',
  '#22C55E',
  '#FED7E2',
  '#FBCFE8',
  '#F9A8D4',
  '#F472B6',
  '#EC4899',
]

export function ArtboardBackgroundPicker({
  currentColor,
  onColorChange,
  onClose,
}: BackgroundPickerProps) {
  const [color, setColor] = useState(currentColor)
  const [customColor, setCustomColor] = useState(currentColor)

  const handleColorSelect = (selectedColor: string) => {
    setColor(selectedColor)
    setCustomColor(selectedColor)
    onColorChange(selectedColor)
  }

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setCustomColor(value)
    if (/^#[0-9A-F]{6}$/i.test(value)) {
      setColor(value)
      onColorChange(value)
    }
  }

  const handleSubmit = () => {
    onClose()
  }

  return (
    <div className="background-picker-overlay" onPointerDown={onClose}>
      <div className="background-picker glass-surface" onPointerDown={(e) => e.stopPropagation()}>
        <div className="background-picker-header">
          <div className="background-picker-title">
            <Icon icon={Palette} size="base" />
            <span>Artboard Background</span>
          </div>
          <button className="background-picker-close" onClick={onClose} title="Close">
            <Icon icon={X} size="sm" />
          </button>
        </div>

        <div className="background-picker-content">
          <div className="background-picker-preview">
            <div className="background-picker-preview-label">Current Color</div>
            <div className="background-picker-preview-color" style={{ backgroundColor: color }} />
          </div>

          <div className="background-picker-presets">
            <div className="background-picker-presets-label">Preset Colors</div>
            <div className="background-picker-color-grid">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  className={`background-picker-color-swatch ${
                    color === presetColor ? 'selected' : ''
                  }`}
                  style={{ backgroundColor: presetColor }}
                  onClick={() => handleColorSelect(presetColor)}
                  title={presetColor}
                />
              ))}
            </div>
          </div>

          <div className="background-picker-custom">
            <label htmlFor="custom-color">Custom Color</label>
            <div className="background-picker-custom-inputs">
              <input
                id="custom-color"
                type="text"
                value={customColor}
                onChange={handleCustomColorChange}
                placeholder="#FFFFFF"
                maxLength={7}
              />
              <input
                type="color"
                value={color}
                onChange={(e) => handleColorSelect(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="background-picker-footer">
          <button className="background-picker-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="background-picker-apply" onClick={handleSubmit}>
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}
