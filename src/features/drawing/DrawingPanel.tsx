import Konva from 'konva'
import { useEffect, useRef, useState } from 'preact/hooks'
import { Stage, Layer, Line, Circle, Image as KonvaImage, Rect } from 'react-konva'

import { Dropdown } from '../../components/common/Dropdown'
import { Slider } from '../../components/common/Slider'
import { Tooltip } from '../../components/common/Tooltip'
import { LazyBrush } from '../../services/drawing/LazyBrush'
import {
  PerfectFreehandService,
  BRUSH_PRESETS,
  type DrawingStrokeOptions,
} from '../../services/drawing/PerfectFreehandService'
import { PressureManager } from '../../services/drawing/PressureManager'
import './DrawingPanel.css'

interface DrawingLine {
  tool: 'brush' | 'eraser' | 'smudge'
  points: number[]
  color: string
  opacity: number
  strokeWidth: number
  globalCompositeOperation: GlobalCompositeOperation
}

interface ColorPaletteItem {
  id: string
  color: string
  name: string
}

interface DrawingLayer {
  id: string
  name: string
  visible: boolean
  opacity: number
  lines: DrawingLine[]
}

const DEFAULT_PALETTE: ColorPaletteItem[] = [
  { id: '1', color: '#000000', name: 'Black' },
  { id: '2', color: '#FFFFFF', name: 'White' },
  { id: '3', color: '#FF0000', name: 'Red' },
  { id: '4', color: '#00FF00', name: 'Green' },
  { id: '5', color: '#0000FF', name: 'Blue' },
  { id: '6', color: '#FFFF00', name: 'Yellow' },
  { id: '7', color: '#FF00FF', name: 'Magenta' },
  { id: '8', color: '#00FFFF', name: 'Cyan' },
  { id: '9', color: '#FF8800', name: 'Orange' },
  { id: '10', color: '#8800FF', name: 'Purple' },
  { id: '11', color: '#888888', name: 'Gray' },
  { id: '12', color: '#FFB6C1', name: 'Light Pink' },
]

export function DrawingPanel() {
  // Canvas state
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [tool, setTool] = useState<'brush' | 'eraser' | 'smudge'>('brush')
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentLayer, setCurrentLayer] = useState(0)
  const [layers, setLayers] = useState<DrawingLayer[]>([
    { id: '1', name: 'Layer 1', visible: true, opacity: 1, lines: [] },
  ])

  // Brush settings
  const [brushSize, setBrushSize] = useState(16)
  const [brushHardness, setBrushHardness] = useState(50)
  const [brushOpacity, setBrushOpacity] = useState(100)
  const [brushFlow, setBrushFlow] = useState(100)
  const [brushPreset, setBrushPreset] = useState<keyof typeof BRUSH_PRESETS>('soft')
  const [smoothingRadius, setSmoothingRadius] = useState(20)

  // Color settings
  const [currentColor, setCurrentColor] = useState('#000000')
  const [colorPalette, setColorPalette] = useState(DEFAULT_PALETTE)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [recentColors, setRecentColors] = useState<string[]>([])

  // Canvas state
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 })
  const [showCursor, setShowCursor] = useState(false)
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null)

  // Refs
  const stageRef = useRef<Konva.Stage>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const colorInputRef = useRef<HTMLInputElement>(null)

  // Services
  const perfectFreehandRef = useRef(new PerfectFreehandService(BRUSH_PRESETS[brushPreset]))
  const pressureManagerRef = useRef(new PressureManager())
  const lazyBrushRef = useRef(new LazyBrush(smoothingRadius))

  // Initialize services
  useEffect(() => {
    pressureManagerRef.current.initialize()
    return () => {
      pressureManagerRef.current.cleanup()
    }
  }, [])

  // Update Perfect Freehand options when settings change
  useEffect(() => {
    const options: DrawingStrokeOptions = {
      ...BRUSH_PRESETS[brushPreset],
      size: brushSize,
      thinning: (100 - brushHardness) / 100,
      smoothing: smoothingRadius / 100,
    }
    perfectFreehandRef.current.setOptions(options)
  }, [brushSize, brushHardness, brushPreset, smoothingRadius])

  // Update lazy brush radius
  useEffect(() => {
    lazyBrushRef.current.setRadius(smoothingRadius)
  }, [smoothingRadius])

  // Handle drawing start
  const handlePointerDown = (e: Konva.KonvaEventObject<PointerEvent>) => {
    setIsDrawing(true)
    const stage = stageRef.current
    if (!stage) return

    const pos = stage.getPointerPosition()
    if (!pos) return

    // Get pressure from event
    const pressure = pressureManagerRef.current.getCurrentPressure()

    // Initialize lazy brush
    lazyBrushRef.current.update(pos.x, pos.y, true)

    // Start perfect freehand stroke
    perfectFreehandRef.current.startStroke({ x: pos.x, y: pos.y, pressure })

    // Create new line for current layer
    const newLine: DrawingLine = {
      tool,
      points: [pos.x, pos.y],
      color: currentColor,
      opacity: brushOpacity / 100,
      strokeWidth: brushSize,
      globalCompositeOperation: tool === 'eraser' ? 'destination-out' : 'source-over',
    }

    setLayers((prev) => {
      const newLayers = [...prev]
      newLayers[currentLayer].lines.push(newLine)
      return newLayers
    })
  }

  // Handle drawing move
  const handlePointerMove = (e: Konva.KonvaEventObject<PointerEvent>) => {
    const stage = stageRef.current
    if (!stage) return

    const pos = stage.getPointerPosition()
    if (!pos) return

    setCursorPos(pos)

    if (!isDrawing) return

    // Update lazy brush
    const smoothed = lazyBrushRef.current.update(pos.x, pos.y, false)

    // Get pressure
    const pressure = pressureManagerRef.current.getCurrentPressure()

    // Add point to perfect freehand
    perfectFreehandRef.current.addPoint({ x: smoothed.x, y: smoothed.y, pressure })

    // Update current line
    setLayers((prev) => {
      const newLayers = [...prev]
      const currentLines = newLayers[currentLayer].lines
      const lastLine = currentLines[currentLines.length - 1]

      if (lastLine) {
        lastLine.points = [...lastLine.points, smoothed.x, smoothed.y]
      }

      return newLayers
    })
  }

  // Handle drawing end
  const handlePointerUp = () => {
    setIsDrawing(false)

    // End perfect freehand stroke
    const outline = perfectFreehandRef.current.endStroke()

    // If using perfect freehand, we could convert the outline to a more optimized shape here
    // For now, we'll keep the simple line approach

    // Add current color to recent colors if not already there
    if (!recentColors.includes(currentColor)) {
      setRecentColors((prev) => [currentColor, ...prev.slice(0, 7)])
    }
  }

  // Handle pointer enter/leave for cursor visibility
  const handlePointerEnter = () => setShowCursor(true)
  const handlePointerLeave = () => {
    setShowCursor(false)
    if (isDrawing) {
      handlePointerUp()
    }
  }

  // Clear canvas
  const clearCanvas = () => {
    setLayers((prev) => {
      const newLayers = [...prev]
      newLayers[currentLayer].lines = []
      return newLayers
    })
  }

  // Add new layer
  const addLayer = () => {
    const newLayer: DrawingLayer = {
      id: `layer-${Date.now()}`,
      name: `Layer ${layers.length + 1}`,
      visible: true,
      opacity: 1,
      lines: [],
    }
    setLayers([...layers, newLayer])
    setCurrentLayer(layers.length)
  }

  // Delete layer
  const deleteLayer = (index: number) => {
    if (layers.length > 1) {
      setLayers((prev) => prev.filter((_, i) => i !== index))
      if (currentLayer >= layers.length - 1) {
        setCurrentLayer(Math.max(0, currentLayer - 1))
      }
    }
  }

  // Toggle layer visibility
  const toggleLayerVisibility = (index: number) => {
    setLayers((prev) => {
      const newLayers = [...prev]
      newLayers[index].visible = !newLayers[index].visible
      return newLayers
    })
  }

  // Update layer opacity
  const updateLayerOpacity = (index: number, opacity: number) => {
    setLayers((prev) => {
      const newLayers = [...prev]
      newLayers[index].opacity = opacity / 100
      return newLayers
    })
  }

  // Export canvas
  const exportCanvas = () => {
    if (!stageRef.current) return
    const dataURL = stageRef.current.toDataURL()
    const link = document.createElement('a')
    link.download = 'drawing.png'
    link.href = dataURL
    link.click()
  }

  // Load background image
  const loadBackgroundImage = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new window.Image()
      img.onload = () => {
        setBackgroundImage(img)
        setDimensions({
          width: img.width,
          height: Math.min(img.height, 800),
        })
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  // Handle file input change
  const handleFileChange = (e: Event) => {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (file && file.type.startsWith('image/')) {
      loadBackgroundImage(file)
    }
  }

  // Smudge tool implementation (simplified)
  const applySmudge = (x: number, y: number) => {
    // This is a simplified smudge effect
    // In a real implementation, you'd sample pixels and blend them
    const smudgeEffect = {
      tool: 'smudge' as const,
      points: [x - 10, y - 10, x + 10, y + 10],
      color: currentColor,
      opacity: 0.5,
      strokeWidth: brushSize,
      globalCompositeOperation: 'multiply' as GlobalCompositeOperation,
    }

    setLayers((prev) => {
      const newLayers = [...prev]
      newLayers[currentLayer].lines.push(smudgeEffect)
      return newLayers
    })
  }

  // Get cursor radius based on current settings
  const getCursorRadius = () => {
    const pressure = pressureManagerRef.current.getCurrentPressure()
    return (brushSize * (0.5 + pressure * 0.5)) / 2
  }

  // Handle color picker change
  const handleColorChange = (e: Event) => {
    const input = e.target as HTMLInputElement
    setCurrentColor(input.value)
  }

  return (
    <div class="drawing-panel">
      <div class="drawing-toolbar">
        {/* Tool Selection */}
        <div class="tool-section">
          <h3>Tools</h3>
          <div class="tool-buttons">
            <Tooltip content="Brush Tool (B)">
              <button
                class={`tool-btn ${tool === 'brush' ? 'active' : ''}`}
                onClick={() => setTool('brush')}
              >
                🖌️
              </button>
            </Tooltip>
            <Tooltip content="Eraser Tool (E)">
              <button
                class={`tool-btn ${tool === 'eraser' ? 'active' : ''}`}
                onClick={() => setTool('eraser')}
              >
                🧹
              </button>
            </Tooltip>
            <Tooltip content="Smudge Tool (S)">
              <button
                class={`tool-btn ${tool === 'smudge' ? 'active' : ''}`}
                onClick={() => setTool('smudge')}
              >
                👆
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Brush Presets */}
        <div class="tool-section">
          <h3>Presets</h3>
          <div class="preset-buttons">
            {Object.keys(BRUSH_PRESETS).map((preset) => (
              <button
                key={preset}
                class={`preset-btn ${brushPreset === preset ? 'active' : ''}`}
                onClick={() => setBrushPreset(preset as keyof typeof BRUSH_PRESETS)}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Brush Settings */}
        <div class="tool-section">
          <h3>Brush Settings</h3>

          <div class="setting-row">
            <label>Size: {brushSize}px</label>
            <Slider min={1} max={200} value={brushSize} onChange={setBrushSize} step={1} />
          </div>

          <div class="setting-row">
            <label>Hardness: {brushHardness}%</label>
            <Slider min={0} max={100} value={brushHardness} onChange={setBrushHardness} step={1} />
          </div>

          <div class="setting-row">
            <label>Opacity: {brushOpacity}%</label>
            <Slider min={1} max={100} value={brushOpacity} onChange={setBrushOpacity} step={1} />
          </div>

          <div class="setting-row">
            <label>Flow: {brushFlow}%</label>
            <Slider min={1} max={100} value={brushFlow} onChange={setBrushFlow} step={1} />
          </div>

          <div class="setting-row">
            <label>Smoothing: {smoothingRadius}px</label>
            <Slider
              min={0}
              max={100}
              value={smoothingRadius}
              onChange={setSmoothingRadius}
              step={1}
            />
          </div>
        </div>

        {/* Color Picker */}
        <div class="tool-section">
          <h3>Color</h3>

          <div class="color-picker-section">
            <div class="current-color-display">
              <input
                ref={colorInputRef}
                type="color"
                value={currentColor}
                onChange={handleColorChange}
                class="color-input"
              />
              <span class="color-hex">{currentColor}</span>
            </div>

            <div class="color-palette">
              {colorPalette.map((item) => (
                <Tooltip key={item.id} content={item.name}>
                  <button
                    class={`color-swatch ${currentColor === item.color ? 'active' : ''}`}
                    style={{ backgroundColor: item.color }}
                    onClick={() => setCurrentColor(item.color)}
                  />
                </Tooltip>
              ))}
            </div>

            {recentColors.length > 0 && (
              <>
                <h4>Recent Colors</h4>
                <div class="recent-colors">
                  {recentColors.map((color, index) => (
                    <button
                      key={index}
                      class="color-swatch"
                      style={{ backgroundColor: color }}
                      onClick={() => setCurrentColor(color)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Layers */}
        <div class="tool-section">
          <h3>Layers</h3>
          <div class="layers-list">
            {layers.map((layer, index) => (
              <div
                key={layer.id}
                class={`layer-item ${currentLayer === index ? 'active' : ''}`}
                onClick={() => setCurrentLayer(index)}
              >
                <button
                  class="layer-visibility"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleLayerVisibility(index)
                  }}
                >
                  {layer.visible ? '👁️' : '🔒'}
                </button>
                <span class="layer-name">{layer.name}</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={layer.opacity * 100}
                  onChange={(e) => updateLayerOpacity(index, parseInt(e.currentTarget.value))}
                  class="layer-opacity"
                  onClick={(e) => e.stopPropagation()}
                />
                {layers.length > 1 && (
                  <button
                    class="layer-delete"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteLayer(index)
                    }}
                  >
                    ❌
                  </button>
                )}
              </div>
            ))}
          </div>
          <button class="add-layer-btn" onClick={addLayer}>
            + Add Layer
          </button>
        </div>

        {/* Actions */}
        <div class="tool-section">
          <h3>Actions</h3>
          <div class="action-buttons">
            <button onClick={clearCanvas}>Clear Layer</button>
            <button onClick={exportCanvas}>Export</button>
            <button onClick={() => fileInputRef.current?.click()}>Load Background</button>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div class="drawing-canvas-container" ref={containerRef}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        <Stage
          ref={stageRef}
          width={dimensions.width}
          height={dimensions.height}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}  // Handle pointer cancel events
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          style={{
            border: '2px solid var(--border-color)',
            borderRadius: '8px',
            backgroundColor: 'white',
          }}
        >
          {/* Background Layer */}
          <Layer>
            {backgroundImage && (
              <KonvaImage
                image={backgroundImage}
                width={dimensions.width}
                height={dimensions.height}
                opacity={0.5}
              />
            )}

            {/* Checkerboard pattern for transparency */}
            <Rect
              width={dimensions.width}
              height={dimensions.height}
              fillPatternImage={(() => {
                const canvas = document.createElement('canvas')
                canvas.width = 20
                canvas.height = 20
                const ctx = canvas.getContext('2d')
                if (ctx) {
                  ctx.fillStyle = '#f0f0f0'
                  ctx.fillRect(0, 0, 10, 10)
                  ctx.fillRect(10, 10, 10, 10)
                  ctx.fillStyle = '#ffffff'
                  ctx.fillRect(10, 0, 10, 10)
                  ctx.fillRect(0, 10, 10, 10)
                }
                return canvas
              })()}
              fillPatternRepeat="repeat"
              opacity={0.5}
              listening={false}
            />
          </Layer>

          {/* Drawing Layers */}
          {layers.map((layer, index) => (
            <Layer key={layer.id} visible={layer.visible} opacity={layer.opacity}>
              {layer.lines.map((line, i) => (
                <Line
                  key={i}
                  points={line.points}
                  stroke={line.color}
                  strokeWidth={line.strokeWidth}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  globalCompositeOperation={line.globalCompositeOperation}
                  opacity={line.opacity}
                />
              ))}
            </Layer>
          ))}

          {/* Cursor Layer */}
          <Layer listening={false}>
            {showCursor && !isDrawing && (
              <Circle
                x={cursorPos.x}
                y={cursorPos.y}
                radius={getCursorRadius()}
                stroke={tool === 'eraser' ? '#ff0000' : currentColor}
                strokeWidth={2}
                fill="transparent"
                opacity={0.5}
                listening={false}
              />
            )}
          </Layer>
        </Stage>

        {/* Pressure Indicator */}
        <div class="pressure-indicator">
          Pressure: {Math.round(pressureManagerRef.current?.getCurrentPressure() * 100)}%
        </div>
      </div>
    </div>
  )
}
