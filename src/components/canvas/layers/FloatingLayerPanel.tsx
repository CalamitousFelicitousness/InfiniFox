import { Layers, ChevronUp, ChevronDown, X, Maximize2, Minimize2, GripVertical } from 'lucide-react'
import React, { useEffect, useRef, useState, useCallback } from 'react'

import LayerPanel from './LayerPanel'
import './FloatingLayerPanel.css'

interface FloatingLayerPanelProps {
  onLayerSelect?: (layerId: string) => void
  onLayerDoubleClick?: (layerId: string) => void
  onClose?: () => void
  defaultPosition?: { x: number; y: number }
  defaultSize?: { width: number; height: number }
}

type PanelState = 'expanded' | 'collapsed' | 'minimized'

const STORAGE_KEY_POSITION = 'floatingLayerPanel_position'
const STORAGE_KEY_SIZE = 'floatingLayerPanel_size'
const STORAGE_KEY_STATE = 'floatingLayerPanel_state'

export const FloatingLayerPanel: React.FC<FloatingLayerPanelProps> = ({
  onLayerSelect,
  onLayerDoubleClick,
  onClose,
  defaultPosition = { x: 20, y: 100 },
  defaultSize = { width: 320, height: 480 },
}) => {
  const panelRef = useRef<HTMLDivElement>(null)
  const [panelState, setPanelState] = useState<PanelState>('expanded')
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [position, setPosition] = useState(defaultPosition)
  const [size, setSize] = useState(defaultSize)

  // Load saved state from localStorage
  useEffect(() => {
    const savedPosition = localStorage.getItem(STORAGE_KEY_POSITION)
    const savedSize = localStorage.getItem(STORAGE_KEY_SIZE)
    const savedState = localStorage.getItem(STORAGE_KEY_STATE)

    if (savedPosition) {
      try {
        const parsed = JSON.parse(savedPosition)
        const maxX = window.innerWidth - (size.width || 320)
        const maxY = window.innerHeight - 100
        setPosition({
          x: Math.min(Math.max(0, parsed.x), maxX),
          y: Math.min(Math.max(0, parsed.y), maxY),
        })
      } catch {
        // Invalid saved position
      }
    }

    if (savedSize) {
      try {
        const parsed = JSON.parse(savedSize)
        setSize({
          width: Math.min(Math.max(250, parsed.width), 500),
          height: Math.min(Math.max(200, parsed.height), window.innerHeight * 0.8),
        })
      } catch {
        // Invalid saved size
      }
    }

    if (savedState) {
      setPanelState(savedState as PanelState)
    }
  }, [])

  // Save position after drag completes - matching CanvasToolbar
  useEffect(() => {
    if (!isDragging) {
      try {
        localStorage.setItem(STORAGE_KEY_POSITION, JSON.stringify(position))
      } catch (err) {
        console.error('Failed to save panel position:', err)
      }
    }
  }, [isDragging, position])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SIZE, JSON.stringify(size))
  }, [size])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_STATE, panelState)
  }, [panelState])

  // Handle window resize to keep panel in bounds
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => ({
        x: Math.min(prev.x, window.innerWidth - size.width),
        y: Math.min(prev.y, window.innerHeight - 100),
      }))
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [size])

  // Handle dragging - matching CanvasToolbar implementation
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.panel-drag-handle')) return

      setIsDragging(true)
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      })
      e.preventDefault()
    },
    [position]
  )

  // Handle dragging with document-level events - matching CanvasToolbar
  useEffect(() => {
    if (!isDragging) return

    const handlePointerMove = (e: PointerEvent) => {
      const newX = e.clientX - dragOffset.x
      const newY = e.clientY - dragOffset.y

      const maxX = window.innerWidth - (panelRef.current?.offsetWidth || 320)
      const maxY = window.innerHeight - (panelRef.current?.offsetHeight || 60)

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
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

  // Handle resizing
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    setIsResizing(true)
    e.preventDefault()
  }, [])

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !panelRef.current) return

      const rect = panelRef.current.getBoundingClientRect()
      const newWidth = e.clientX - rect.left
      const newHeight = e.clientY - rect.top

      setSize({
        width: Math.min(Math.max(250, newWidth), 500),
        height: Math.min(Math.max(200, newHeight), window.innerHeight * 0.8),
      })
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  // Toggle panel state
  const togglePanelState = useCallback(() => {
    setPanelState((prev) => {
      if (prev === 'expanded') return 'collapsed'
      if (prev === 'collapsed') return 'minimized'
      return 'expanded'
    })
  }, [])

  const maximize = useCallback(() => {
    setPanelState('expanded')
  }, [])

  const minimize = useCallback(() => {
    setPanelState('minimized')
  }, [])

  // Calculate dynamic height based on state
  const getHeight = () => {
    if (panelState === 'minimized') return 'auto'
    if (panelState === 'collapsed') return '120px'
    return `${size.height}px`
  }

  const panelClasses = [
    'floating-layer-panel',
    `state-${panelState}`,
    isDragging && 'dragging',
    isResizing && 'resizing',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      ref={panelRef}
      className={panelClasses}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: panelState === 'minimized' ? 'auto' : `${size.width}px`,
        height: getHeight(),
      }}
    >
      {/* Header with drag handle */}
      <div className="floating-layer-panel-header">
        <div className="panel-drag-handle" onPointerDown={handlePointerDown}>
          <GripVertical size={16} />
        </div>

        <div className="panel-title">
          <Layers size={16} />
          <span>Layers</span>
        </div>

        <div className="panel-controls">
          {/* Minimize/Maximize button */}
          {panelState !== 'minimized' ? (
            <button className="panel-control-btn" onClick={minimize} title="Minimize">
              <Minimize2 size={14} />
            </button>
          ) : (
            <button className="panel-control-btn" onClick={maximize} title="Maximize">
              <Maximize2 size={14} />
            </button>
          )}

          {/* Collapse/Expand button */}
          {panelState !== 'minimized' && (
            <button
              className="panel-control-btn"
              onClick={togglePanelState}
              title={panelState === 'expanded' ? 'Collapse' : 'Expand'}
            >
              {panelState === 'expanded' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}

          {/* Close button */}
          {onClose && (
            <button className="panel-control-btn close" onClick={onClose} title="Close">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Panel content */}
      {panelState !== 'minimized' && (
        <div className="floating-layer-panel-content">
          <LayerPanel onLayerSelect={onLayerSelect} onLayerDoubleClick={onLayerDoubleClick} />
        </div>
      )}

      {/* Resize handle */}
      {panelState === 'expanded' && (
        <div className="floating-layer-panel-resize" onMouseDown={handleResizeStart} />
      )}
    </div>
  )
}

export default FloatingLayerPanel
