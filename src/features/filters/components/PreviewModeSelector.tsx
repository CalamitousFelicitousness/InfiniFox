/**
 * PreviewModeSelector.tsx - Select preview mode for filter comparison
 */

import type { PreviewMode } from '../FilterManager'

interface PreviewModeSelectorProps {
  mode: PreviewMode
  onChange: (mode: PreviewMode) => void
}

export function PreviewModeSelector({ mode, onChange }: PreviewModeSelectorProps) {
  const modes: { value: PreviewMode; label: string; icon: string; description: string }[] = [
    { value: null, label: 'None', icon: '◻', description: 'Direct application' },
    { value: 'split', label: 'Split', icon: '◧', description: 'Vertical split view' },
    { value: 'side-by-side', label: 'Side by Side', icon: '◫', description: 'Two copies' },
    { value: 'onion-skin', label: 'Onion Skin', icon: '◈', description: 'Transparent overlay' },
    { value: 'difference', label: 'Difference', icon: '◉', description: 'Show changes only' }
  ]
  
  return (
    <div class="filter-section">
      <div class="filter-section-header">
        <span class="filter-section-title">Preview Mode</span>
      </div>
      
      <div class="preview-mode-selector">
        {modes.map(({ value, label, icon, description }) => (
          <button
            key={label}
            class={`preview-mode-btn ${mode === value ? 'active' : ''}`}
            onClick={() => onChange(value)}
            title={description}
          >
            <span style={{ fontSize: '1.2em' }}>{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
