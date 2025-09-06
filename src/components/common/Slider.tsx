import { useRef, useState, useEffect } from 'preact/hooks'

interface SliderProps {
  label?: string
  value: number
  onChange?: (value: number) => void
  onInput?: (value: number) => void // Support both for compatibility
  min?: number
  max?: number
  step?: number
  disabled?: boolean
}

export function Slider({
  label,
  value,
  onChange,
  onInput,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
}: SliderProps) {
  // Use onChange if provided, otherwise fallback to onInput
  const handleChange = onChange || onInput || (() => {});
  const trackRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)

  const updateValueFromPointer = (e: PointerEvent) => {
    if (!trackRef.current || disabled) return
    
    const rect = trackRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    const percentage = x / rect.width
    const newValue = min + (max - min) * percentage
    
    // Snap to step
    const steppedValue = Math.round(newValue / step) * step
    const clampedValue = Math.max(min, Math.min(max, steppedValue))
    
    handleChange(clampedValue)
  }

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (isDragging) {
        e.preventDefault()
        updateValueFromPointer(e)
      }
    }

    const handlePointerUp = () => {
      if (isDragging) {
        setIsDragging(false)
        setShowTooltip(false)
        document.body.style.userSelect = ''
      }
    }

    if (isDragging) {
      document.addEventListener('pointermove', handlePointerMove)
      document.addEventListener('pointerup', handlePointerUp)
      document.addEventListener('pointercancel', handlePointerUp)
    }

    return () => {
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', handlePointerUp)
      document.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [isDragging])

  const handlePointerDown = (e: PointerEvent) => {
    if (disabled) return
    e.preventDefault()
    setIsDragging(true)
    setShowTooltip(true)
    document.body.style.userSelect = 'none'
    updateValueFromPointer(e)
  }

  const percentage = ((value - min) / (max - min)) * 100

  return (
    <div class={`slider-group ${disabled ? 'slider-disabled' : ''}`}>
      {label && (
        <div class="slider-header">
          <span class="slider-label">{label}</span>
          <span class="slider-value">{value}</span>
        </div>
      )}
      <div 
        class="slider-track" 
        ref={trackRef}
        onPointerDown={handlePointerDown}
      >
        <div 
          class="slider-fill" 
          style={{ width: `${percentage}%` }}
        />
        <div 
          class="slider-thumb" 
          style={{ left: `${percentage}%` }}
        >
          {showTooltip && (
            <div class="slider-tooltip">{value}</div>
          )}
        </div>
      </div>
      {/* Keep native input as fallback/accessibility */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onInput={(e) => handleChange(parseFloat(e.currentTarget.value))}
        disabled={disabled}
        style={{ display: 'none' }}
        aria-label={label}
      />
    </div>
  )
}
