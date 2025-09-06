import { useEffect, useRef, useState } from 'preact/hooks'
import { CanvasTool } from './Canvas'
import { 
  SelectIcon, 
  BrushIcon, 
  EraserIcon, 
  PanIcon, 
  GripIcon 
} from '../../components/icons'
import './DraggableCanvasToolbar.css'

interface DraggableCanvasToolbarProps {
  currentTool: CanvasTool
  onToolChange: (tool: CanvasTool) => void
}

export function DraggableCanvasToolbar({ currentTool, onToolChange }: DraggableCanvasToolbarProps) {
  const [position, setPosition] = useState({ x: 20, y: 20 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const panelRef = useRef<HTMLDivElement>(null)
  
  // Load saved position from localStorage
  useEffect(() => {
    const savedPos = localStorage.getItem('canvasToolbarPosition')
    if (savedPos) {
      try {
        const parsed = JSON.parse(savedPos)
        // Ensure toolbar is visible within current viewport
        const maxX = window.innerWidth - 300
        const maxY = window.innerHeight - 100
        setPosition({
          x: Math.min(Math.max(20, parsed.x), maxX),
          y: Math.min(Math.max(20, parsed.y), maxY)
        })
      } catch (e) {
        // Invalid saved position, use default
      }
    }
  }, [])
  
  // Save position to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('canvasToolbarPosition', JSON.stringify(position))
  }, [position])
  
  // Handle window resize to keep toolbar in bounds
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => ({
        x: Math.min(prev.x, window.innerWidth - 300),
        y: Math.min(prev.y, window.innerHeight - 100)
      }))
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  // Handle dragging
  const handlePointerDown = (e: PointerEvent) => {
    const target = e.target as HTMLElement
    // Only drag from the header/grip area
    if (!target.closest('.floating-panel-grip')) return
    
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
      const maxX = window.innerWidth - (panelRef.current?.offsetWidth || 300)
      const maxY = window.innerHeight - (panelRef.current?.offsetHeight || 60)
      
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
  
  const tools = [
    { id: CanvasTool.SELECT, icon: SelectIcon, label: 'Select', tooltip: 'Selection Tool (V)' },
    { id: CanvasTool.BRUSH, icon: BrushIcon, label: 'Brush', tooltip: 'Brush Tool (B)' },
    { id: CanvasTool.ERASER, icon: EraserIcon, label: 'Eraser', tooltip: 'Eraser Tool (E)' },
    { id: CanvasTool.PAN, icon: PanIcon, label: 'Pan', tooltip: 'Pan Tool (H)' },
  ]
  
  return (
    <div
      ref={panelRef}
      class={`draggable-canvas-toolbar floating-panel glass-surface ${isDragging ? 'dragging' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`
      }}
      onPointerDown={handlePointerDown}
    >
      <div class="floating-panel-grip" title="Drag to move">
        <GripIcon size={12} class="grip-icon" />
      </div>
      
      <div class="toolbar-tools">
        {tools.map(tool => {
          const IconComponent = tool.icon
          return (
            <button
              key={tool.id}
              class={`toolbar-tool-btn ${currentTool === tool.id ? 'active' : ''}`}
              onClick={() => onToolChange(tool.id)}
              title={tool.tooltip}
              aria-label={tool.tooltip}
              aria-pressed={currentTool === tool.id}
            >
              <span class="tool-icon">
                <IconComponent size={16} />
              </span>
              <span class="tool-label">{tool.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
