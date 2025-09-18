import { Sliders, Eye, Palette, Blend } from 'lucide-react'
import React, { useState, useCallback } from 'react'

import type { LayerNode, BlendMode } from '../../../store/slices/layerSystemSlice'
import { useStore } from '../../../store/store'
import './LayerPropertiesPanel.css'

interface LayerPropertiesPanelProps {
  className?: string
}

const BLEND_MODES: { value: BlendMode; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'darken', label: 'Darken' },
  { value: 'lighten', label: 'Lighten' },
  { value: 'color-dodge', label: 'Color Dodge' },
  { value: 'color-burn', label: 'Color Burn' },
]

/**
 * Properties panel for editing selected layer attributes
 */
export const LayerPropertiesPanel: React.FC<LayerPropertiesPanelProps> = ({ className }) => {
  const { selectedLayerIds, getLayer, updateLayer, applyFilter, removeFilter } = useStore()

  const selectedId = Array.from(selectedLayerIds)[0]
  const layer = selectedId ? getLayer(selectedId) : undefined

  const [localOpacity, setLocalOpacity] = useState(layer?.opacity ?? 1)
  const [localBlendMode, setLocalBlendMode] = useState<BlendMode>(layer?.blendMode ?? 'normal')

  // Update local state when selection changes
  React.useEffect(() => {
    if (layer) {
      setLocalOpacity(layer.opacity)
      setLocalBlendMode(layer.blendMode || 'normal')
    }
  }, [layer])

  const handleOpacityChange = useCallback(
    (value: number) => {
      setLocalOpacity(value)
      if (selectedId) {
        updateLayer(selectedId, { opacity: value })
      }
    },
    [selectedId, updateLayer]
  )

  const handleBlendModeChange = useCallback(
    (mode: BlendMode) => {
      setLocalBlendMode(mode)
      if (selectedId) {
        updateLayer(selectedId, { blendMode: mode })
      }
    },
    [selectedId, updateLayer]
  )

  const handleToggleFilter = useCallback(
    (filterType: string) => {
      if (!selectedId || !layer) return

      const existingFilter = layer.filters?.find((f) => f.type === filterType)

      if (existingFilter) {
        removeFilter(selectedId, filterType)
      } else {
        applyFilter(selectedId, {
          type: filterType as LayerNode['filters'][0]['type'],
          enabled: true,
          params: getDefaultFilterParams(filterType),
        })
      }
    },
    [selectedId, layer, applyFilter, removeFilter]
  )

  if (!layer) {
    return (
      <div className={`layer-properties-panel ${className || ''}`}>
        <div className="layer-properties-empty">
          <Sliders size={32} />
          <p>No layer selected</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`layer-properties-panel ${className || ''}`}>
      <div className="layer-properties-header">
        <h3>Layer Properties</h3>
        <span className="layer-type">{layer.type}</span>
      </div>

      <div className="layer-properties-content">
        {/* Opacity */}
        <div className="property-group">
          <label>
            <Eye size={14} />
            Opacity
          </label>
          <div className="property-control">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={localOpacity}
              onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
            />
            <span className="property-value">{Math.round(localOpacity * 100)}%</span>
          </div>
        </div>

        {/* Blend Mode */}
        <div className="property-group">
          <label>
            <Blend size={14} />
            Blend Mode
          </label>
          <select
            value={localBlendMode}
            onChange={(e) => handleBlendModeChange(e.target.value as BlendMode)}
            className="property-select"
          >
            {BLEND_MODES.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filters */}
        <div className="property-group">
          <label>
            <Palette size={14} />
            Filters
          </label>
          <div className="filter-buttons">
            <button
              className={hasFilter(layer, 'blur') ? 'active' : ''}
              onClick={() => handleToggleFilter('blur')}
            >
              Blur
            </button>
            <button
              className={hasFilter(layer, 'grayscale') ? 'active' : ''}
              onClick={() => handleToggleFilter('grayscale')}
            >
              Grayscale
            </button>
            <button
              className={hasFilter(layer, 'sepia') ? 'active' : ''}
              onClick={() => handleToggleFilter('sepia')}
            >
              Sepia
            </button>
            <button
              className={hasFilter(layer, 'invert') ? 'active' : ''}
              onClick={() => handleToggleFilter('invert')}
            >
              Invert
            </button>
          </div>
        </div>

        {/* Transform properties for non-artboards */}
        {layer.type !== 'artboard' && (
          <div className="property-group">
            <label>Transform</label>
            <div className="transform-grid">
              <div className="transform-item">
                <span>X</span>
                <input
                  type="number"
                  value={Math.round(layer.x)}
                  onChange={(e) => updateLayer(selectedId!, { x: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="transform-item">
                <span>Y</span>
                <input
                  type="number"
                  value={Math.round(layer.y)}
                  onChange={(e) => updateLayer(selectedId!, { y: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="transform-item">
                <span>Rotation</span>
                <input
                  type="number"
                  value={Math.round(layer.rotation || 0)}
                  onChange={(e) =>
                    updateLayer(selectedId!, { rotation: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* Artboard properties */}
        {layer.type === 'artboard' && layer.artboardProps && (
          <div className="property-group">
            <label>Dimensions</label>
            <div className="transform-grid">
              <div className="transform-item">
                <span>Width</span>
                <input
                  type="number"
                  value={layer.artboardProps.width}
                  onChange={(e) =>
                    updateLayer(selectedId!, {
                      artboardProps: {
                        ...layer.artboardProps!,
                        width: parseInt(e.target.value) || 100,
                      },
                    })
                  }
                />
              </div>
              <div className="transform-item">
                <span>Height</span>
                <input
                  type="number"
                  value={layer.artboardProps.height}
                  onChange={(e) =>
                    updateLayer(selectedId!, {
                      artboardProps: {
                        ...layer.artboardProps!,
                        height: parseInt(e.target.value) || 100,
                      },
                    })
                  }
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function hasFilter(layer: LayerNode, filterType: string): boolean {
  return layer.filters?.some((f) => f.type === filterType && f.enabled) || false
}

function getDefaultFilterParams(filterType: string): Record<string, number> {
  switch (filterType) {
    case 'blur':
      return { radius: 5 }
    case 'brightness':
      return { brightness: 0 }
    case 'contrast':
      return { contrast: 0 }
    case 'hue':
      return { hue: 0 }
    case 'saturation':
      return { saturation: 0 }
    case 'pixelate':
      return { pixelSize: 5 }
    case 'noise':
      return { noise: 0.5 }
    default:
      return {}
  }
}

export default LayerPropertiesPanel
