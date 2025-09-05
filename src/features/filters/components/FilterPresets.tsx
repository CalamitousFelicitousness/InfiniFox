/**
 * FilterPresets.tsx - Preset management UI
 * 
 * Features:
 * - Display available presets
 * - Load presets
 * - Save current configuration as preset
 * - Delete custom presets
 * - Import/export presets
 */

import { useState } from 'preact/hooks'
import type { FilterPreset } from '../../../services/filters/FilterChain'

interface FilterPresetsProps {
  presets: FilterPreset[]
  onSelectPreset: (preset: FilterPreset) => void
  onSavePreset: (name: string, description: string) => void
  onDeletePreset?: (presetId: string) => void
}

export function FilterPresets({ 
  presets, 
  onSelectPreset, 
  onSavePreset,
  onDeletePreset 
}: FilterPresetsProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [presetDescription, setPresetDescription] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  
  // Group presets by category
  const categories = Array.from(new Set(presets.map(p => p.category || 'Uncategorized')))
  const filteredPresets = selectedCategory 
    ? presets.filter(p => (p.category || 'Uncategorized') === selectedCategory)
    : presets
  
  const handleSavePreset = () => {
    if (presetName.trim()) {
      onSavePreset(presetName.trim(), presetDescription.trim())
      setShowSaveDialog(false)
      setPresetName('')
      setPresetDescription('')
    }
  }
  
  return (
    <div class="filter-section">
      <div class="filter-section-header">
        <span class="filter-section-title">Presets</span>
        <button 
          class="preset-save-btn"
          onClick={() => setShowSaveDialog(true)}
          title="Save current filters as preset"
        >
          💾
        </button>
      </div>
      
      {/* Category Tabs */}
      {categories.length > 1 && (
        <div class="preset-categories">
          <button
            class={`preset-category ${selectedCategory === null ? 'active' : ''}`}
            onClick={() => setSelectedCategory(null)}
          >
            All
          </button>
          {categories.map(category => (
            <button
              key={category}
              class={`preset-category ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      )}
      
      {/* Preset List */}
      <div class="preset-list">
        {filteredPresets.length === 0 ? (
          <div class="preset-empty">
            No presets available
          </div>
        ) : (
          filteredPresets.map(preset => (
            <div
              key={preset.id}
              class="preset-item"
              onClick={() => onSelectPreset(preset)}
            >
              <div class="preset-thumbnail">
                {/* Thumbnail placeholder */}
                <div class="preset-thumbnail-placeholder">
                  {getPresetEmoji(preset.name)}
                </div>
              </div>
              
              <div class="preset-info">
                <div class="preset-name">{preset.name}</div>
                {preset.description && (
                  <div class="preset-description">{preset.description}</div>
                )}
                <div class="preset-filters">
                  {preset.filters.length} filter{preset.filters.length !== 1 ? 's' : ''}
                </div>
              </div>
              
              {preset.id.startsWith('custom-') && onDeletePreset && (
                <button
                  class="preset-delete"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm(`Delete preset "${preset.name}"?`)) {
                      onDeletePreset(preset.id)
                    }
                  }}
                  title="Delete preset"
                >
                  🗑️
                </button>
              )}
            </div>
          ))
        )}
      </div>
      
      {/* Save Preset Dialog */}
      {showSaveDialog && (
        <div class="preset-save-dialog">
          <div class="preset-save-header">
            <span>Save Preset</span>
            <button onClick={() => setShowSaveDialog(false)}>✕</button>
          </div>
          
          <input
            type="text"
            placeholder="Preset name"
            value={presetName}
            onInput={(e) => setPresetName((e.target as HTMLInputElement).value)}
            class="preset-save-input"
          />
          
          <textarea
            placeholder="Description (optional)"
            value={presetDescription}
            onInput={(e) => setPresetDescription((e.target as HTMLTextAreaElement).value)}
            class="preset-save-textarea"
          />
          
          <div class="preset-save-actions">
            <button 
              class="preset-save-confirm"
              onClick={handleSavePreset}
              disabled={!presetName.trim()}
            >
              Save
            </button>
            <button 
              class="preset-save-cancel"
              onClick={() => setShowSaveDialog(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper function to get preset emoji
function getPresetEmoji(presetName: string): string {
  const emojis: Record<string, string> = {
    'Photo Enhancement': '📸',
    'Black & White': '⚫',
    'Vintage Film': '📽️',
    'Dramatic': '🎭',
    'Soft Focus': '🌫️',
    'High Contrast': '◐',
    'Warm Tones': '🌅',
    'Cool Tones': '❄️',
    'Cinematic': '🎬'
  }
  return emojis[presetName] || '🎨'
}
