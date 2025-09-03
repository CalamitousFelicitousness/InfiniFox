import { useStore } from '../../store/store'
import { BRUSH_PRESETS } from '../../services/drawing/PerfectFreehandService'
import { Slider } from '../../components/common/Slider'
import { Tooltip } from '../../components/common/Tooltip'
import './DrawingTab.css'

const QUICK_COLORS = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', 
  '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
  '#FF8800', '#8800FF', '#888888', '#FFB6C1'
]

/**
 * Drawing controls for the main canvas
 * Controls the drawing layer on the infinite canvas
 */
export function DrawingTab() {
  const {
    // Drawing state
    isDrawingMode,
    drawingTool,
    brushSize,
    brushOpacity,
    brushColor,
    brushPreset,
    smoothing,
    drawingStrokes,
    drawingLayerVisible,
    // Drawing actions
    setDrawingMode,
    setDrawingTool,
    setBrushSize,
    setBrushOpacity,
    setBrushColor,
    setBrushPreset,
    setSmoothing,
    clearDrawingStrokes,
    setDrawingLayerVisible,
    exportDrawing
  } = useStore()
  
  // Toggle drawing mode on main canvas
  const toggleDrawingMode = () => {
    setDrawingMode(!isDrawingMode)
  }
  
  // Export drawing as image
  const handleExport = () => {
    // TODO: Implement export from main canvas drawing layer
    const dataUrl = exportDrawing()
    if (dataUrl) {
      const link = document.createElement('a')
      link.download = 'drawing.png'
      link.href = dataUrl
      link.click()
    }
  }
  
  // Send drawing to canvas as image
  const handleSendToCanvas = () => {
    // TODO: Convert drawing layer to image and add to canvas
    console.log('Send to canvas - to be implemented')
  }
  
  return (
    <div class="drawing-tab">
      {/* Main Drawing Toggle */}
      <div class="drawing-mode-section">
        <button 
          class={`drawing-mode-toggle ${isDrawingMode ? 'active' : ''}`}
          onClick={toggleDrawingMode}
        >
          {isDrawingMode ? '✏️ Exit Drawing Mode' : '✏️ Enter Drawing Mode'}
        </button>
        {isDrawingMode && (
          <span class="drawing-mode-hint">Draw directly on the canvas</span>
        )}
      </div>
      
      {/* Tool Bar */}
      <div class="drawing-toolbar-compact">
        {/* Tool Selection */}
        <div class="tool-row">
          <div class="tool-group">
            <Tooltip content="Brush (B)">
              <button
                class={`tool-btn-compact ${drawingTool === 'brush' ? 'active' : ''}`}
                onClick={() => setDrawingTool('brush')}
                disabled={!isDrawingMode}
              >
                🖌️
              </button>
            </Tooltip>
            <Tooltip content="Eraser (E)">
              <button
                class={`tool-btn-compact ${drawingTool === 'eraser' ? 'active' : ''}`}
                onClick={() => setDrawingTool('eraser')}
                disabled={!isDrawingMode}
              >
                🧹
              </button>
            </Tooltip>
          </div>
          
          <div class="tool-group">
            <button 
              class="action-btn-compact" 
              onClick={clearDrawingStrokes}
              disabled={!isDrawingMode || drawingStrokes.length === 0}
            >
              Clear
            </button>
            <button 
              class="action-btn-compact" 
              onClick={handleExport}
              disabled={drawingStrokes.length === 0}
            >
              Export
            </button>
            <button 
              class={`action-btn-compact ${drawingLayerVisible ? 'active' : ''}`}
              onClick={() => setDrawingLayerVisible(!drawingLayerVisible)}
              title={drawingLayerVisible ? 'Hide drawing layer' : 'Show drawing layer'}
            >
              {drawingLayerVisible ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        </div>
        
        {/* Quick Presets */}
        <div class="preset-row">
          {Object.keys(BRUSH_PRESETS).slice(0, 5).map(preset => (
            <button
              key={preset}
              class={`preset-btn-compact ${brushPreset === preset ? 'active' : ''}`}
              onClick={() => setBrushPreset(preset)}
              disabled={!isDrawingMode}
              title={preset}
            >
              {preset.charAt(0).toUpperCase()}
            </button>
          ))}
        </div>
        
        {/* Brush Size */}
        <div class="slider-row">
          <label>Size</label>
          <Slider
            min={1}
            max={100}
            value={brushSize}
            onChange={setBrushSize}
            step={1}
            disabled={!isDrawingMode}
          />
          <span class="value-label">{brushSize}px</span>
        </div>
        
        {/* Opacity */}
        <div class="slider-row">
          <label>Opacity</label>
          <Slider
            min={1}
            max={100}
            value={brushOpacity}
            onChange={setBrushOpacity}
            step={1}
            disabled={!isDrawingMode}
          />
          <span class="value-label">{brushOpacity}%</span>
        </div>
        
        {/* Smoothing */}
        <div class="slider-row">
          <label>Smooth</label>
          <Slider
            min={0}
            max={50}
            value={smoothing}
            onChange={setSmoothing}
            step={1}
            disabled={!isDrawingMode}
          />
          <span class="value-label">{smoothing}</span>
        </div>
        
        {/* Color Section */}
        <div class="color-section-compact">
          <div class="current-color-row">
            <input
              type="color"
              value={brushColor}
              onChange={(e) => setBrushColor(e.currentTarget.value)}
              class="color-input-compact"
              disabled={!isDrawingMode}
            />
            <span class="color-hex">{brushColor}</span>
          </div>
          
          <div class="color-grid">
            {QUICK_COLORS.map(color => (
              <button
                key={color}
                class={`color-swatch-compact ${brushColor === color ? 'active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => setBrushColor(color)}
                disabled={!isDrawingMode}
              />
            ))}
          </div>
        </div>
        
        {/* Drawing Stats */}
        <div class="drawing-stats">
          <span>Strokes: {drawingStrokes.length}</span>
          {isDrawingMode && (
            <span class="drawing-active">● Drawing Active</span>
          )}
        </div>
      </div>
    </div>
  )
}
