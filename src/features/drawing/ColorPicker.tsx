import { useState, useRef, useEffect } from 'preact/hooks'
import './ColorPicker.css'

interface ColorPickerProps {
  color: string
  onChange: (color: string) => void
  onClose?: () => void
}

export function ColorPicker({ color, onChange, onClose }: ColorPickerProps) {
  const [hue, setHue] = useState(0)
  const [saturation, setSaturation] = useState(100)
  const [lightness, setLightness] = useState(50)
  const [alpha, setAlpha] = useState(1)
  const [hexInput, setHexInput] = useState(color)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  // Convert HSL to RGB
  const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
    h = h / 360
    s = s / 100
    l = l / 100

    let r, g, b

    if (s === 0) {
      r = g = b = l // achromatic
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1
        if (t > 1) t -= 1
        if (t < 1 / 6) return p + (q - p) * 6 * t
        if (t < 1 / 2) return q
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
        return p
      }

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s
      const p = 2 * l - q
      r = hue2rgb(p, q, h + 1 / 3)
      g = hue2rgb(p, q, h)
      b = hue2rgb(p, q, h - 1 / 3)
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
  }

  // Convert RGB to Hex
  const rgbToHex = (r: number, g: number, b: number): string => {
    return (
      '#' +
      [r, g, b]
        .map((x) => {
          const hex = x.toString(16)
          return hex.length === 1 ? '0' + hex : hex
        })
        .join('')
    )
  }

  // Parse hex color to HSL
  const hexToHsl = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(hex)
    if (!result) return [0, 0, 0]

    const r = parseInt(result[1], 16) / 255
    const g = parseInt(result[2], 16) / 255
    const b = parseInt(result[3], 16) / 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0,
      s = 0
    const l = (max + min) / 2

    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6
          break
        case g:
          h = ((b - r) / d + 2) / 6
          break
        case b:
          h = ((r - g) / d + 4) / 6
          break
      }
    }

    return [h * 360, s * 100, l * 100]
  }

  // Initialize from prop color
  useEffect(() => {
    const [h, s, l] = hexToHsl(color)
    setHue(h)
    setSaturation(s)
    setLightness(l)
    setHexInput(color)
  }, [color])

  // Update color when HSL values change
  useEffect(() => {
    const [r, g, b] = hslToRgb(hue, saturation, lightness)
    const hex = rgbToHex(r, g, b)
    setHexInput(hex)
    onChange(hex)
  }, [hue, saturation, lightness, alpha, onChange])

  // Draw color spectrum
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // Draw saturation/lightness gradient
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const s = (x / width) * 100
        const l = 100 - (y / height) * 100
        const [r, g, b] = hslToRgb(hue, s, l)
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
        ctx.fillRect(x, y, 1, 1)
      }
    }
  }, [hue])

  const handleCanvasClick = (e: MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const s = (x / canvas.width) * 100
    const l = 100 - (y / canvas.height) * 100

    setSaturation(s)
    setLightness(l)
  }

  const handleHexInputChange = (e: Event) => {
    const input = e.target as HTMLInputElement
    const value = input.value
    setHexInput(value)

    if (/^#[0-9A-F]{6}$/i.test(value)) {
      const [h, s, l] = hexToHsl(value)
      setHue(h)
      setSaturation(s)
      setLightness(l)
      onChange(value)
    }
  }

  return (
    <div class="color-picker" ref={pickerRef}>
      <div class="color-picker-header">
        <span>Color Picker</span>
        {onClose && (
          <button class="close-btn" onClick={onClose}>
            ×
          </button>
        )}
      </div>

      <div class="color-picker-body">
        {/* Color canvas */}
        <canvas
          ref={canvasRef}
          width={256}
          height={256}
          class="color-canvas"
          onClick={handleCanvasClick}
        />

        {/* Current position indicator */}
        <div
          class="color-indicator"
          style={{
            left: `${(saturation / 100) * 256}px`,
            top: `${((100 - lightness) / 100) * 256}px`,
            backgroundColor: hexInput,
          }}
        />

        {/* Hue slider */}
        <div class="slider-container">
          <label>Hue</label>
          <input
            type="range"
            min="0"
            max="360"
            value={hue}
            onChange={(e) => setHue(parseInt(e.currentTarget.value))}
            class="hue-slider"
          />
        </div>

        {/* Alpha slider */}
        <div class="slider-container">
          <label>Opacity</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={alpha}
            onChange={(e) => setAlpha(parseFloat(e.currentTarget.value))}
            class="alpha-slider"
          />
          <span>{Math.round(alpha * 100)}%</span>
        </div>

        {/* Hex input */}
        <div class="hex-input-container">
          <label>Hex</label>
          <input
            type="text"
            value={hexInput}
            onChange={handleHexInputChange}
            maxLength={7}
            class="hex-input"
          />
        </div>

        {/* Preview */}
        <div class="color-preview-container">
          <div class="color-preview-label">Preview</div>
          <div class="color-preview" style={{ backgroundColor: hexInput, opacity: alpha }} />
        </div>
      </div>
    </div>
  )
}
