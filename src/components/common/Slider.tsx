import './Slider.css'

interface SliderProps {
  label: string
  value: number
  onInput: (value: number) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
}

export function Slider({
  label,
  value,
  onInput,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
}: SliderProps) {
  return (
    <div class="slider-group">
      <label>
        {label}: {value}
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onInput={(e) => onInput(parseFloat(e.currentTarget.value))}
        disabled={disabled}
      />
    </div>
  )
}
