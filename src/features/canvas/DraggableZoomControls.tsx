import { useEffect, useRef, useState } from 'react'

import { Plus, Minus, RotateIcon, GripIcon } from '../../components/icons'
import './DraggableZoomControls.css'

interface DraggableZoomControlsProps {
  scale: number
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
}

export function DraggableZoomControls({
  scale,
  onZoomIn,
  onZoomOut,
  onReset,
}: DraggableZoomControlsProps) {
  const [position, setPosition] = useState({ x: window.innerWidth - 220, y: 20 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const panelRef = useRef<HTMLDivElement>(null)

  // Load saved position from localStorage
  useEffect(() => {
    const savedPos = localStorage.getItem('zoomControlsPosition')
    if (savedPos) {
      try {
        const parsed = JSON.parse(savedPos)
        const maxX = window.innerWidth - 200
        const maxY = window.innerHeight - 100
        setPosition({
          x: Math.min(Math.max(20, parsed.x), maxX),
          y: Math.min(Math.max(20, parsed.y), maxY),
        })
      } catch {
        // Invalid saved position, use default
      }
    } else {
      // Default to top-right corner
      setPosition({
        x: window.innerWidth - 220,
        y: 20,
      })
    }
  }, [])

  // Save position to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('zoomControlsPosition', JSON.stringify(position))
  }, [position])

  // Handle window resize to keep controls in bounds
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => ({
        x: Math.min(prev.x, window.innerWidth - 220),
        y: Math.min(prev.y, window.innerHeight - 100),
      }))
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Handle dragging
  const handlePointerDown = (e: PointerEvent) => {
    const target = e.target as HTMLElement
    if (!target.closest('.toolbar-grip')) return

    setIsDragging(true)
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    })
    e.preventDefault()
  }

  useEffect(() => {
    if (!isDragging) return

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging) return

      const newX = e.clientX - dragOffset.x
      const newY = e.clientY - dragOffset.y

      const maxX = window.innerWidth - (panelRef.current?.offsetWidth || 200)
      const maxY = window.innerHeight - (panelRef.current?.offsetHeight || 60)

      setPosition({
        x: Math.max(0, Math.min(maxX, newX)),
        y: Math.max(0, Math.min(maxY, newY)),
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

  return (
    <div
      ref={panelRef}
      className={`zoom-controls toolbar toolbar-horizontal toolbar-floating toolbar-draggable glass-surface ${isDragging ? 'dragging' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onPointerDown={handlePointerDown}
    >
      <div className="toolbar-grip" title="Drag to move">
        <GripIcon className="lucide-icon" />
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <button
          className="toolbar-item"
          onClick={onZoomOut}
          data-tooltip="Zoom Out (Ctrl -)"
          aria-label="Zoom Out"
        >
          <Minus className="lucide-icon" />
        </button>

        <span className="zoom-value" title="Current zoom level">
          {Math.round(scale * 100)}%
        </span>

        <button
          className="toolbar-item"
          onClick={onZoomIn}
          data-tooltip="Zoom In (Ctrl +)"
          aria-label="Zoom In"
        >
          <Plus className="lucide-icon" />
        </button>
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <button
          className="toolbar-item"
          onClick={onReset}
          data-tooltip="Reset View"
          aria-label="Reset View"
        >
          <RotateIcon className="lucide-icon" />
        </button>
      </div>
    </div>
  )
}
