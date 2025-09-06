import { useEffect, useRef, useState } from 'preact/hooks'
import { useStore } from '../../store/store'
import { BRUSH_PRESETS } from '../../services/drawing/PerfectFreehandService'
import { Slider } from '../../components/common/Slider'
import './FloatingDrawingPanel.css'

// Extended color palette - 48 colors organized by category
const COLOR_PALETTE = [
  // Grayscale (8)
  '#000000', '#2B2B2B', '#4B4B4B', '#6B6B6B', 
  '#8B8B8B', '#ABABAB', '#CBCBCB', '#FFFFFF',
  
  // Primary & Secondary (6)
  '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#FF00FF', '#00FFFF',
  
  // Warm colors (6) 
  '#FF6B6B', '#FF8E53', '#FFB347', 
  '#FFD700', '#FFA500', '#FF69B4',
  
  // Cool colors (6)
  '#4ECDC4', '#45B7D1', '#5DADE2',
  '#8E44AD', '#9B59B6', '#BB8FCE',
  
  // Earth tones (6)
  '#8B4513', '#A0522D', '#CD853F',
  '#DEB887', '#F4E4C1', '#E6D7C3',
  
  // Skin tones (6)
  '#FFE5CC', '#FDBCB4', '#F5DEB3',
  '#D2B48C', '#BC9A7C', '#8D5524',
  
  // Nature colors (6)
  '#228B22', '#32CD32', '#90EE90',
  '#4682B4', '#87CEEB', '#E0FFFF',
  
  // Vivid accent (4)
  '#FF1493', '#FF4500', '#32FF00', '#00D9FF'
]

interface FloatingDrawingPanelProps {
  visible: boolean
  tool: 'brush' | 'eraser'
}

export function FloatingDrawingPanel({ visible, tool }: FloatingDrawingPanelProps) {
  const {
    brushSize,
    brushOpacity,
    brushColor,
    brushPreset,
    smoothing,
    drawingStrokes,
    drawingLayerVisible,
    setBrushSize,
    setBrushOpacity,
    setBrushColor,
    setBrushPreset,
    setSmoothing,
    clearDrawingStrokes,
    setDrawingLayerVisible,
    exportDrawing
  } = useStore()
  
  const [position, setPosition] = useState({ x: 20, y: 80 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isMinimized, setIsMinimized] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  
  // Load saved position from localStorage
  useEffect(() => {
    const savedPos = localStorage.getItem('drawingPanelPosition')
    if (savedPos) {
      try {
        setPosition(JSON.parse(savedPos))
      } catch (e) {
        // Invalid saved position, use default
      }
    }
  }, [])
  
  // Save position to localStorage when it changes
  useEffect(() => {
    if (position.x !== 20 || position.y !== 80) {
      localStorage.setItem('drawingPanelPosition', JSON.stringify(position))
    }
  }, [position])
  
  // Handle panel dragging
  const handlePointerDown = (e: PointerEvent) => {
    // Only drag from the grip or header
    const target = e.target as HTMLElement
    if (!target.closest('.panel-grip') && !target.closest('.panel-header')) return
    
    setIsDragging(true)
    // Calculate offset from click position to panel's current position
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })
    e.preventDefault()
  }
  
  useEffect(() => {
    if (!isDragging) return
    
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging) return
      
      const newX = e.clientX - dragOffset.x
      const newY = e.clientY - dragOffset.y
      
      // Keep panel within viewport
      const maxX = window.innerWidth - (panelRef.current?.offsetWidth || 280)
      const maxY = window.innerHeight - (panelRef.current?.offsetHeight || 400)
      
      setPosition({
        x: Math.max(0, Math.min(maxX, newX)),
        y: Math.max(0, Math.min(maxY, newY))
      })
    }
    
    const handlePointerUp = () => {
      setIsDragging(false)
    }
    
    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('pointerup', handlePointerUp)
    
    return () => {
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', handlePointerUp)
    }
  }, [isDragging, dragOffset])
  
  const handleExport = () => {
    const dataUrl = exportDrawing()
    if (dataUrl) {
      const link = document.createElement('a')
      link.download = 'drawing.png'
      link.href = dataUrl
      link.click()
    }
  }
  
  if (!visible) return null
  
  return (
    <div
      ref={panelRef}
      class={`floating-drawing-panel ${isMinimized ? 'minimized' : ''} ${isDragging ? 'dragging' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`
      }}
      onPointerDown={handlePointerDown}
    >
      <div class="panel-header">
        <div class="panel-grip" title="Drag to move">
          <span class="grip-icon">⋮⋮</span>
        </div>
        <span class="panel-title">
          {tool === 'eraser' ? '🧹 Eraser' : '🖌️ Brush'} Settings
        </span>
        <div class="panel-controls">
          <button
            class="panel-control-btn"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? '□' : '─'}
          </button>
        </div>
      </div>
      
      {!isMinimized && (
        <div class="panel-content">
          {/* Brush Presets */}
          <div class="preset-section">
            <div class="preset-buttons">
              {Object.entries(BRUSH_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  class={`preset-btn ${brushPreset === key ? 'active' : ''}`}
                  onClick={() => setBrushPreset(key)}
                  title={key}
                >
                  {key.charAt(0).toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          
          {/* Sliders */}
          <div class="sliders-section">
            <div class="slider-row">
              <label>Size</label>
              <Slider
                min={1}
                max={100}
                value={brushSize}
                onChange={setBrushSize}
                step={1}
              />
              <span class="value">{brushSize}px</span>
            </div>
            
            <div class="slider-row">
              <label>Opacity</label>
              <Slider
                min={1}
                max={100}
                value={brushOpacity}
                onChange={setBrushOpacity}
                step={1}
              />
              <span class="value">{brushOpacity}%</span>
            </div>
            
            <div class="slider-row">
              <label>Smooth</label>
              <Slider
                min={0}
                max={50}
                value={smoothing}
                onChange={setSmoothing}
                step={1}
              />
              <span class="value">{smoothing}</span>
            </div>
          </div>
          
          {/* Color Section - Only show for brush tool */}
          {tool === 'brush' && (
            <div class="color-section">
              <div class="color-header">
                <input
                  type="color"
                  value={brushColor}
                  onChange={(e) => setBrushColor(e.currentTarget.value)}
                  class="color-input"
                />
                <span class="color-hex">{brushColor}</span>
              </div>
              
              <div class="color-palette">
                {COLOR_PALETTE.map(color => (
                  <button
                    key={color}
                    class={`color-swatch ${brushColor === color ? 'active' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setBrushColor(color)}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
          <div class="action-buttons">
            <button 
              class="action-btn"
              onClick={clearDrawingStrokes}
              disabled={drawingStrokes.length === 0}
            >
              Clear
            </button>
            <button 
              class="action-btn"
              onClick={handleExport}
              disabled={drawingStrokes.length === 0}
            >
              Export
            </button>
            <button 
              class={`action-btn ${drawingLayerVisible ? 'active' : ''}`}
              onClick={() => setDrawingLayerVisible(!drawingLayerVisible)}
              title={drawingLayerVisible ? 'Hide layer' : 'Show layer'}
            >
              {drawingLayerVisible ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
          
          {/* Stats */}
          <div class="drawing-stats">
            <span>Strokes: {drawingStrokes.length}</span>
          </div>
        </div>
      )}
    </div>
  )
}
