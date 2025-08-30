import { useState, useRef } from 'preact/hooks'

import './NumberInput.css'

interface NumberInputProps {
  label: string
  value: number
  onInput: (value: number) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
}

export function NumberInput({ 
  label, 
  value, 
  onInput, 
  min = -Infinity,
  max = Infinity,
  step = 1,
  disabled = false 
}: NumberInputProps) {
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dragStartRef = useRef<{ x: number; value: number } | null>(null)

  const handlePointerDown = (e: PointerEvent) => {
    if (disabled || e.target === inputRef.current) return
    
    // Start drag to change value
    e.preventDefault()
    dragStartRef.current = { x: e.clientX, value }
    document.body.style.cursor = 'ew-resize'
    
    const handlePointerMove = (e: PointerEvent) => {
      if (!dragStartRef.current) return
      
      const deltaX = e.clientX - dragStartRef.current.x
      const deltaValue = Math.round(deltaX / 10) * step // 10px = 1 step
      const newValue = dragStartRef.current.value + deltaValue
      const clampedValue = Math.max(min, Math.min(max, newValue))
      
      onInput(clampedValue)
    }
    
    const handlePointerUp = () => {
      dragStartRef.current = null
      document.body.style.cursor = ''
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', handlePointerUp)
    }
    
    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('pointerup', handlePointerUp)
  }

  const handleWheel = (e: WheelEvent) => {
    if (disabled || !isFocused) return
    
    e.preventDefault()
    const delta = e.deltaY > 0 ? -step : step
    const newValue = value + delta
    const clampedValue = Math.max(min, Math.min(max, newValue))
    
    onInput(clampedValue)
  }

  return (
    <div 
      class="number-input-group"
      onPointerDown={handlePointerDown}
      onWheel={handleWheel}
    >
      <label style={{ cursor: disabled ? 'default' : 'ew-resize' }}>
        {label}
      </label>
      <input
        ref={inputRef}
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onInput={(e) => onInput(parseInt(e.currentTarget.value, 10))}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        disabled={disabled}
      />
      <div class="number-input-buttons">
        <button 
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation()
            onInput(Math.min(max, value + step))
          }}
          disabled={disabled || value >= max}
          aria-label="Increase"
        >
          ▲
        </button>
        <button 
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation()
            onInput(Math.max(min, value - step))
          }}
          disabled={disabled || value <= min}
          aria-label="Decrease"
        >
          ▼
        </button>
      </div>
    </div>
  )
}
