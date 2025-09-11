import React, { useState, useRef, useEffect } from 'react'

import { GridIcon, ChevronUpIcon, ChevronDownIcon, Magnet, Ruler, GripIcon } from '../../components/icons'
import { snappingManager } from '../../services/canvas/SnappingManager'

import './FloatingSnapControls.css'

const SNAP_CONFIG_KEY = 'infinifox-snap-config'
const SNAP_PANEL_POSITION_KEY = 'infinifox-snap-panel-position'

interface FloatingSnapControlsProps {
  className?: string
  onSnapConfigChange?: (config: {
    gridEnabled: boolean
    gridSize: number
    objectSnapEnabled: boolean
    snapThreshold: number
    showSnapGuides: boolean
  }) => void
}

export function FloatingSnapControls({ className = '', onSnapConfigChange }: FloatingSnapControlsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Load saved position or use defaults
  const loadSavedPosition = () => {
    try {
      const saved = localStorage.getItem(SNAP_PANEL_POSITION_KEY)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (err) {
      console.error('Failed to load panel position:', err)
    }
    return { x: 20, y: 200 }
  }
  
  const [position, setPosition] = useState(loadSavedPosition())
  const dragStart = useRef({ x: 0, y: 0 })
  
  // Load saved config or use defaults
  const loadSavedConfig = () => {
    try {
      const saved = localStorage.getItem(SNAP_CONFIG_KEY)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (err) {
      console.error('Failed to load snap config:', err)
    }
    return snappingManager.getConfig()
  }
  
  const [config, setConfig] = useState(loadSavedConfig())

  // Save config to localStorage and update snapping manager
  useEffect(() => {
    snappingManager.updateConfig(config)
    onSnapConfigChange?.(config)
    
    // Save to localStorage
    try {
      localStorage.setItem(SNAP_CONFIG_KEY, JSON.stringify(config))
    } catch (err) {
      console.error('Failed to save snap config:', err)
    }
  }, [config, onSnapConfigChange])

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement
    if (!target.closest('.toolbar-grip')) return
    
    setIsDragging(true)
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return

    const newX = e.clientX - dragStart.current.x
    const newY = e.clientY - dragStart.current.y

    const maxX = window.innerWidth - (containerRef.current?.offsetWidth || 0)
    const maxY = window.innerHeight - (containerRef.current?.offsetHeight || 0)

    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    })
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false)
      // Save position to localStorage
      try {
        localStorage.setItem(SNAP_PANEL_POSITION_KEY, JSON.stringify(position))
      } catch (err) {
        console.error('Failed to save panel position:', err)
      }
    }
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  const toggleGridSnap = () => {
    setConfig(prev => ({ ...prev, gridEnabled: !prev.gridEnabled }))
  }

  const toggleObjectSnap = () => {
    setConfig(prev => ({ ...prev, objectSnapEnabled: !prev.objectSnapEnabled }))
  }

  const toggleSnapGuides = () => {
    setConfig(prev => ({ ...prev, showSnapGuides: !prev.showSnapGuides }))
  }

  const updateGridSize = (size: number) => {
    setConfig(prev => ({ ...prev, gridSize: size }))
  }

  const updateSnapThreshold = (threshold: number) => {
    setConfig(prev => ({ ...prev, snapThreshold: threshold }))
  }

  const containerClasses = [
    'toolbar',
    'toolbar-horizontal',
    'toolbar-floating',
    'toolbar-draggable',
    'snap-controls',
    isDragging && 'dragging',
    isExpanded && 'expanded',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      ref={containerRef}
      className={containerClasses}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className="toolbar-grip" title="Drag to move">
        <GripIcon className="lucide-icon" />
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <button
          className="toolbar-item snap-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
          title="Snap Settings"
          data-tooltip="Snap Settings"
        >
          <GridIcon />
          {isExpanded ? <ChevronUpIcon className="snap-chevron" /> : <ChevronDownIcon className="snap-chevron" />}
        </button>
      </div>

      {isExpanded && (
        <div className="snap-panel">
          <div className="snap-features">
            <button
              className={`toolbar-item ${config.gridEnabled ? 'active' : ''}`}
              onClick={toggleGridSnap}
              title="Grid Snap"
            >
              <GridIcon />
              <span className="snap-item-label">Grid</span>
            </button>

            <button
              className={`toolbar-item ${config.objectSnapEnabled ? 'active' : ''}`}
              onClick={toggleObjectSnap}
              title="Object Snap"
            >
              <Magnet />
              <span className="snap-item-label">Objects</span>
            </button>

            <button
              className={`toolbar-item ${config.showSnapGuides ? 'active' : ''}`}
              onClick={toggleSnapGuides}
              title="Snap Guides"
            >
              <Ruler />
              <span className="snap-item-label">Guides</span>
            </button>
          </div>

          {(config.gridEnabled || config.objectSnapEnabled) && (
            <>
              <div className="snap-panel-separator" />
              <div className="snap-settings">
                {config.gridEnabled && (
                  <div className="snap-setting">
                    <label className="snap-label">Grid Size</label>
                    <select
                      value={config.gridSize}
                      onChange={(e) => updateGridSize(Number(e.target.value))}
                      className="snap-select"
                    >
                      <option value={25}>25px</option>
                      <option value={50}>50px</option>
                      <option value={100}>100px</option>
                      <option value={150}>150px</option>
                      <option value={200}>200px</option>
                    </select>
                  </div>
                )}

                {config.objectSnapEnabled && (
                  <div className="snap-setting">
                    <label className="snap-label">Snap Range</label>
                    <select
                      value={config.snapThreshold}
                      onChange={(e) => updateSnapThreshold(Number(e.target.value))}
                      className="snap-select"
                    >
                      <option value={15}>15px</option>
                      <option value={20}>20px</option>
                      <option value={30}>30px</option>
                      <option value={40}>40px</option>
                    </select>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="snap-panel-separator" />
          
          <div className="snap-presets">
            <span className="snap-presets-label">Presets</span>
            <div className="snap-preset-buttons">
              <button
                className="toolbar-item snap-preset"
                onClick={() => setConfig({
                  gridEnabled: true,
                  gridSize: 50,
                  objectSnapEnabled: false,
                  snapThreshold: 20,
                  showSnapGuides: true,
                })}
                title="Grid Only"
              >
                Grid
              </button>
              <button
                className="toolbar-item snap-preset"
                onClick={() => setConfig({
                  gridEnabled: false,
                  gridSize: 50,
                  objectSnapEnabled: true,
                  snapThreshold: 20,
                  showSnapGuides: true,
                })}
                title="Smart Snap"
              >
                Smart
              </button>
              <button
                className="toolbar-item snap-preset"
                onClick={() => setConfig({
                  gridEnabled: true,
                  gridSize: 25,
                  objectSnapEnabled: true,
                  snapThreshold: 30,
                  showSnapGuides: true,
                })}
                title="All Snapping"
              >
                All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
