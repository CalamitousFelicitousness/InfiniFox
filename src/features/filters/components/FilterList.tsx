/**
 * FilterList.tsx - Display and manage active filters
 * 
 * Features:
 * - Display all active filters
 * - Toggle enable/disable
 * - Remove filters
 * - Drag-and-drop reordering
 * - Visual state indicators
 */

import { useState, useRef } from 'preact/hooks'
import type { FilterConfig } from '../../../services/filters/FilterChain'
import { FilterManager } from '../FilterManager'

interface FilterListProps {
  filters: FilterConfig[]
  selectedFilterId: string | null
  onSelectFilter: (filterId: string) => void
  onToggleFilter: (filterId: string) => void
  onRemoveFilter: (filterId: string) => void
  onReorderFilter: (filterId: string, newOrder: number) => void
  onAddFilter: (filterName: string) => void
}

export function FilterList({
  filters,
  selectedFilterId,
  onSelectFilter,
  onToggleFilter,
  onRemoveFilter,
  onReorderFilter,
  onAddFilter
}: FilterListProps) {
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [draggedFilter, setDraggedFilter] = useState<string | null>(null)
  const dragOverRef = useRef<number | null>(null)
  
  const availableFilters = FilterManager.getAvailableFilters()
  const usedFilterNames = new Set(filters.map(f => f.name))
  const unusedFilters = availableFilters.filter(name => !usedFilterNames.has(name))
  
  // Drag and drop handlers
  const handleDragStart = (e: DragEvent, filterId: string) => {
    setDraggedFilter(filterId)
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move'
    }
  }
  
  const handleDragOver = (e: DragEvent, order: number) => {
    e.preventDefault()
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move'
    }
    dragOverRef.current = order
  }
  
  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    if (draggedFilter && dragOverRef.current !== null) {
      onReorderFilter(draggedFilter, dragOverRef.current)
    }
    setDraggedFilter(null)
    dragOverRef.current = null
  }
  
  const handleDragEnd = () => {
    setDraggedFilter(null)
    dragOverRef.current = null
  }
  
  return (
    <div class="filter-section">
      <div class="filter-section-header">
        <span class="filter-section-title">Active Filters</span>
        <span class="filter-count">{filters.length}</span>
      </div>
      
      <div class="filter-list">
        {filters.map((filter) => (
          <div
            key={filter.id}
            class={`filter-item ${selectedFilterId === filter.id ? 'selected' : ''} ${!filter.enabled ? 'disabled' : ''}`}
            onClick={() => onSelectFilter(filter.id)}
            draggable
            onDragStart={(e) => handleDragStart(e as any, filter.id)}
            onDragOver={(e) => handleDragOver(e as any, filter.order)}
            onDrop={handleDrop as any}
            onDragEnd={handleDragEnd}
          >
            <span class="filter-drag-handle" title="Drag to reorder">⋮⋮</span>
            
            <div 
              class={`filter-toggle ${filter.enabled ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                onToggleFilter(filter.id)
              }}
              title={filter.enabled ? 'Disable filter' : 'Enable filter'}
            >
              <div class="filter-toggle-thumb" />
            </div>
            
            <span class="filter-name">{filter.name}</span>
            
            {filter.opacity < 1 && (
              <span class="filter-opacity" title="Filter opacity">
                {Math.round(filter.opacity * 100)}%
              </span>
            )}
            
            <button
              class="filter-remove"
              onClick={(e) => {
                e.stopPropagation()
                if (confirm(`Remove ${filter.name} filter?`)) {
                  onRemoveFilter(filter.id)
                }
              }}
              title="Remove filter"
              aria-label={`Remove ${filter.name} filter`}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      
      {/* Add Filter Button */}
      <div style={{ position: 'relative' }}>
        <button
          class="add-filter-btn"
          onClick={() => setShowAddMenu(!showAddMenu)}
        >
          <span>+</span>
          <span>Add Filter</span>
        </button>
        
        {/* Filter Selection Dropdown */}
        {showAddMenu && (
          <div class="filter-add-menu">
            <div class="filter-add-menu-header">
              <span>Available Filters</span>
              <button onClick={() => setShowAddMenu(false)}>✕</button>
            </div>
            
            {unusedFilters.length === 0 ? (
              <div class="filter-add-empty">
                All filters are already added
              </div>
            ) : (
              <div class="filter-add-list">
                {unusedFilters.map(name => (
                  <button
                    key={name}
                    class="filter-add-item"
                    onClick={() => {
                      onAddFilter(name)
                      setShowAddMenu(false)
                    }}
                  >
                    <span class="filter-add-icon">{getFilterIcon(name)}</span>
                    <span class="filter-add-name">{name}</span>
                    <span class="filter-add-desc">{getFilterDescription(name)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Helper function to get filter icons
function getFilterIcon(filterName: string): string {
  const icons: Record<string, string> = {
    Blur: '🌫️',
    Brighten: '☀️',
    Contrast: '◐',
    Grayscale: '⚫',
    HSL: '🎨',
    RGB: '🔴',
    Sepia: '📜',
    Enhance: '✨',
    Noise: '📺',
    Pixelate: '▦',
    Curves: '📈',
    Levels: '📊',
    Sharpening: '🔪',
    ChromaticAberration: '🌈',
    SelectiveColor: '🎯'
  }
  return icons[filterName] || '🎭'
}

// Helper function to get filter descriptions
function getFilterDescription(filterName: string): string {
  const descriptions: Record<string, string> = {
    Blur: 'Gaussian blur',
    Brighten: 'Adjust brightness',
    Contrast: 'Adjust contrast',
    Grayscale: 'Convert to B&W',
    HSL: 'Hue, Saturation, Lightness',
    RGB: 'Red, Green, Blue channels',
    Sepia: 'Vintage sepia tone',
    Enhance: 'Auto enhance',
    Noise: 'Add grain',
    Pixelate: 'Pixelation effect',
    Curves: 'Tone curves',
    Levels: 'Histogram levels',
    Sharpening: 'Sharpen details',
    ChromaticAberration: 'Lens distortion',
    SelectiveColor: 'Replace colors'
  }
  return descriptions[filterName] || ''
}
