/**
 * FilterControls.tsx - Dynamic control generation for filter parameters
 * 
 * Generates appropriate UI controls based on filter type
 * Supports sliders, color pickers, curve editors, etc.
 */

import { useState, useEffect } from 'preact/hooks'
import type { FilterConfig } from '../../../services/filters/FilterChain'

interface FilterControlsProps {
  filter: FilterConfig
  onUpdate: (params: Partial<FilterConfig>) => void
}

interface ControlConfig {
  type: 'slider' | 'color' | 'select' | 'checkbox' | 'curve' | 'histogram'
  param: string
  label?: string
  min?: number
  max?: number
  step?: number
  default?: any
  options?: { value: any; label: string }[]
  channels?: string[]
  showHistogram?: boolean
}

// Filter control configurations
export const FILTER_CONTROL_CONFIGS: Record<string, ControlConfig[]> = {
  Blur: [
    { type: 'slider', param: 'blurRadius', label: 'Radius', min: 0, max: 40, step: 0.5, default: 10 }
  ],
  Brighten: [
    { type: 'slider', param: 'brightness', label: 'Brightness', min: -1, max: 1, step: 0.01, default: 0 }
  ],
  Contrast: [
    { type: 'slider', param: 'contrast', label: 'Contrast', min: -100, max: 100, step: 1, default: 0 }
  ],
  Emboss: [
    { type: 'slider', param: 'embossStrength', label: 'Strength', min: 0, max: 1, step: 0.01, default: 0.5 },
    { type: 'slider', param: 'embossWhiteLevel', label: 'White Level', min: 0, max: 1, step: 0.01, default: 0.5 },
    { 
      type: 'select', 
      param: 'embossDirection', 
      label: 'Direction',
      options: [
        { value: 'top-left', label: 'Top Left' },
        { value: 'top', label: 'Top' },
        { value: 'top-right', label: 'Top Right' },
        { value: 'right', label: 'Right' },
        { value: 'bottom-right', label: 'Bottom Right' },
        { value: 'bottom', label: 'Bottom' },
        { value: 'bottom-left', label: 'Bottom Left' },
        { value: 'left', label: 'Left' }
      ],
      default: 'top-left'
    },
    { type: 'checkbox', param: 'embossBlend', label: 'Blend', default: false }
  ],
  Enhance: [
    { type: 'slider', param: 'enhance', label: 'Amount', min: -1, max: 1, step: 0.01, default: 0.4 }
  ],
  HSL: [
    { type: 'slider', param: 'hue', label: 'Hue', min: -180, max: 180, step: 1, default: 0 },
    { type: 'slider', param: 'saturation', label: 'Saturation', min: -2, max: 2, step: 0.01, default: 0 },
    { type: 'slider', param: 'luminance', label: 'Luminance', min: -2, max: 2, step: 0.01, default: 0 }
  ],
  HSV: [
    { type: 'slider', param: 'hue', label: 'Hue', min: -180, max: 180, step: 1, default: 0 },
    { type: 'slider', param: 'saturation', label: 'Saturation', min: -2, max: 2, step: 0.01, default: 0 },
    { type: 'slider', param: 'value', label: 'Value', min: -255, max: 255, step: 1, default: 0 }
  ],
  Mask: [
    { type: 'slider', param: 'threshold', label: 'Threshold', min: 0, max: 255, step: 1, default: 128 }
  ],
  Noise: [
    { type: 'slider', param: 'noise', label: 'Amount', min: 0, max: 1, step: 0.01, default: 0.3 }
  ],
  Pixelate: [
    { type: 'slider', param: 'pixelSize', label: 'Pixel Size', min: 1, max: 50, step: 1, default: 5 }
  ],
  Posterize: [
    { type: 'slider', param: 'levels', label: 'Levels', min: 2, max: 30, step: 1, default: 5 }
  ],
  RGB: [
    { type: 'slider', param: 'red', label: 'Red', min: 0, max: 255, step: 1, default: 100 },
    { type: 'slider', param: 'green', label: 'Green', min: 0, max: 255, step: 1, default: 100 },
    { type: 'slider', param: 'blue', label: 'Blue', min: 0, max: 255, step: 1, default: 100 }
  ],
  RGBA: [
    { type: 'slider', param: 'red', label: 'Red', min: 0, max: 255, step: 1, default: 100 },
    { type: 'slider', param: 'green', label: 'Green', min: 0, max: 255, step: 1, default: 100 },
    { type: 'slider', param: 'blue', label: 'Blue', min: 0, max: 255, step: 1, default: 100 },
    { type: 'slider', param: 'alpha', label: 'Alpha', min: 0, max: 255, step: 1, default: 255 }
  ],
  Threshold: [
    { type: 'slider', param: 'threshold', label: 'Threshold', min: 0, max: 255, step: 1, default: 128 }
  ],
  // Custom filters
  Curves: [
    { type: 'curve', param: 'points', channels: ['rgb', 'r', 'g', 'b'] }
  ],
  Levels: [
    { type: 'slider', param: 'shadows', label: 'Shadows', min: 0, max: 255, step: 1, default: 0 },
    { type: 'slider', param: 'midtones', label: 'Midtones', min: 0.01, max: 9.99, step: 0.01, default: 1 },
    { type: 'slider', param: 'highlights', label: 'Highlights', min: 0, max: 255, step: 1, default: 255 }
  ],
  SelectiveColor: [
    { type: 'slider', param: 'targetHue', label: 'Target Hue', min: 0, max: 360, step: 1, default: 0 },
    { type: 'slider', param: 'hueRange', label: 'Hue Range', min: 1, max: 180, step: 1, default: 30 },
    { type: 'color', param: 'replacement', label: 'Replacement Color', default: { h: 0, s: 0, l: 0 } }
  ],
  ChromaticAberration: [
    { type: 'slider', param: 'redOffset', label: 'Red Offset', min: -20, max: 20, step: 0.5, default: 0 },
    { type: 'slider', param: 'greenOffset', label: 'Green Offset', min: -20, max: 20, step: 0.5, default: 0 },
    { type: 'slider', param: 'blueOffset', label: 'Blue Offset', min: -20, max: 20, step: 0.5, default: 0 }
  ],
  Sharpening: [
    { type: 'slider', param: 'amount', label: 'Amount', min: 0, max: 2, step: 0.01, default: 0.5 },
    { type: 'slider', param: 'radius', label: 'Radius', min: 0.5, max: 10, step: 0.5, default: 1 },
    { type: 'slider', param: 'threshold', label: 'Threshold', min: 0, max: 1, step: 0.01, default: 0 }
  ]
}

export function FilterControls({ filter, onUpdate }: FilterControlsProps) {
  const controls = FILTER_CONTROL_CONFIGS[filter.name] || []
  const [localParams, setLocalParams] = useState(filter.params)
  
  useEffect(() => {
    setLocalParams(filter.params)
  }, [filter.params])
  
  const handleParamChange = (param: string, value: any) => {
    const newParams = { ...localParams, [param]: value }
    setLocalParams(newParams)
    onUpdate({ params: newParams })
  }
  
  const handleOpacityChange = (opacity: number) => {
    onUpdate({ opacity })
  }
  
  const renderControl = (control: ControlConfig) => {
    const value = localParams[control.param] ?? control.default
    
    switch (control.type) {
      case 'slider':
        return (
          <div key={control.param} class="filter-slider">
            <div class="filter-slider-label">
              <span>{control.label || control.param}</span>
              <span class="filter-slider-value">{
                typeof value === 'number' ? value.toFixed(control.step! < 1 ? 2 : 0) : value
              }</span>
            </div>
            <input
              type="range"
              min={control.min}
              max={control.max}
              step={control.step}
              value={value}
              onInput={(e) => handleParamChange(control.param, parseFloat((e.target as HTMLInputElement).value))}
              style={{ '--progress': `${((value - control.min!) / (control.max! - control.min!)) * 100}%` } as any}
            />
          </div>
        )
        
      case 'select':
        return (
          <div key={control.param} class="filter-select">
            <label>{control.label || control.param}</label>
            <select
              value={value}
              onChange={(e) => handleParamChange(control.param, (e.target as HTMLSelectElement).value)}
            >
              {control.options?.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )
        
      case 'checkbox':
        return (
          <div key={control.param} class="filter-checkbox">
            <label>
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => handleParamChange(control.param, (e.target as HTMLInputElement).checked)}
              />
              <span>{control.label || control.param}</span>
            </label>
          </div>
        )
        
      case 'color':
        return (
          <div key={control.param} class="filter-color">
            <label>{control.label || control.param}</label>
            <div class="color-picker-placeholder">
              {/* Color picker would go here - simplified for now */}
              <input
                type="color"
                value={value?.hex || '#000000'}
                onChange={(e) => {
                  // Convert hex to HSL
                  const hex = (e.target as HTMLInputElement).value
                  handleParamChange(control.param, { hex })
                }}
              />
            </div>
          </div>
        )
        
      case 'curve':
        return (
          <div key={control.param} class="filter-curve">
            <div class="curve-editor-placeholder">
              {/* Curve editor would go here - placeholder for now */}
              <div style={{
                padding: '2rem',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
                textAlign: 'center',
                color: 'var(--secondary-text-color)'
              }}>
                Curve Editor (Coming Soon)
              </div>
            </div>
          </div>
        )
        
      case 'histogram':
        return (
          <div key={control.param} class="filter-histogram">
            <div class="histogram-placeholder">
              {/* Histogram would go here - placeholder for now */}
              <div style={{
                padding: '2rem',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
                textAlign: 'center',
                color: 'var(--secondary-text-color)'
              }}>
                Histogram (Coming Soon)
              </div>
            </div>
          </div>
        )
        
      default:
        return null
    }
  }
  
  return (
    <div class="filter-section">
      <div class="filter-section-header">
        <span class="filter-section-title">{filter.name} Settings</span>
      </div>
      
      {/* Filter Opacity Control */}
      <div class="filter-slider">
        <div class="filter-slider-label">
          <span>Filter Opacity</span>
          <span class="filter-slider-value">{Math.round(filter.opacity * 100)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={filter.opacity}
          onInput={(e) => handleOpacityChange(parseFloat((e.target as HTMLInputElement).value))}
          style={{ '--progress': `${filter.opacity * 100}%` } as any}
        />
      </div>
      
      {/* Filter-specific controls */}
      {controls.map(control => renderControl(control))}
      
      {controls.length === 0 && (
        <div class="filter-no-controls">
          This filter has no adjustable parameters
        </div>
      )}
    </div>
  )
}
