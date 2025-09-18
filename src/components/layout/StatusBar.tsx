import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  MousePointer,
  Brush,
  Eraser,
  Move,
  Image,
  Command,
} from 'lucide-react'
import React from 'react'

import { CanvasTool } from '../../features/canvas/hooks/useCanvasTools'
import { useStore } from '../../store/store'
import './StatusBar.css'

interface StatusBarProps {
  // Zoom controls
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void

  // Tool state
  currentTool: CanvasTool

  // Space panning state
  isSpacePanning: boolean
}

type KeyboardModifierState = {
  ctrl: boolean
  shift: boolean
  alt: boolean
}

export function StatusBar({
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  currentTool,
  isSpacePanning,
}: StatusBarProps) {
  // Get selection state from store
  const selectedIds = useStore((state) => state.selectedIds)
  const images = useStore((state) => state.images)
  const generationFrames = useStore((state) => state.generationFrames)
  const deselectAll = useStore((state) => state.deselectAll)
  const selectAll = useStore((state) => state.selectAll)
  const selectedCount = selectedIds.size
  const totalImages = images.length
  const totalFrames = generationFrames?.length || 0
  const totalItems = totalImages + totalFrames

  // Track previous selection count for animation
  const [prevSelectedCount, setPrevSelectedCount] = React.useState(selectedCount)
  const selectionChanged = selectedCount !== prevSelectedCount

  React.useEffect(() => {
    if (selectionChanged) {
      const timer = setTimeout(() => setPrevSelectedCount(selectedCount), 300)
      return () => clearTimeout(timer)
    }
  }, [selectedCount, selectionChanged])

  // Handle selection actions
  const handleSelectionClick = () => {
    if (selectedCount > 0) {
      deselectAll()
    } else if (totalImages > 0) {
      selectAll()
    }
  }

  // Format zoom percentage for display
  const zoomPercentage = Math.round(zoom * 100)

  // Get tool icon and label
  const getToolInfo = () => {
    switch (currentTool) {
      case CanvasTool.SELECT:
        return { icon: <MousePointer size={14} />, label: 'Select' }
      case CanvasTool.BRUSH:
        return { icon: <Brush size={14} />, label: 'Brush' }
      case CanvasTool.ERASER:
        return { icon: <Eraser size={14} />, label: 'Eraser' }
      case CanvasTool.PAN:
        return { icon: <Move size={14} />, label: 'Pan' }
      default:
        return { icon: null, label: 'Unknown' }
    }
  }

  const toolInfo = getToolInfo()

  // Track keyboard modifiers for shortcuts display
  const [keyboardState, setKeyboardState] = React.useState<KeyboardModifierState>({
    ctrl: false,
    shift: false,
    alt: false,
  })
  const keyboardStateRef = React.useRef<KeyboardModifierState>(keyboardState)

  React.useEffect(() => {
    const updateKeyboardState = (nextState: KeyboardModifierState) => {
      const currentState = keyboardStateRef.current

      if (
        nextState.ctrl === currentState.ctrl &&
        nextState.shift === currentState.shift &&
        nextState.alt === currentState.alt
      ) {
        return
      }

      keyboardStateRef.current = nextState
      setKeyboardState(nextState)
    }

    const computeKeyboardState = (event: KeyboardEvent): KeyboardModifierState => ({
      ctrl: event.ctrlKey || event.metaKey,
      shift: event.shiftKey,
      alt: event.altKey,
    })

    const handleKeyDown = (e: KeyboardEvent) => {
      updateKeyboardState(computeKeyboardState(e))
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      updateKeyboardState(computeKeyboardState(e))
    }

    const handleBlur = () => {
      updateKeyboardState({ ctrl: false, shift: false, alt: false })
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
    }
  }, [])

  const modifierDescriptors = [
    {
      id: 'ctrl',
      isActive: keyboardState.ctrl,
      title: 'Multi-select mode',
      className: 'status-bar__key',
      content: (
        <>
          <Command size={12} />
          <span>Ctrl</span>
        </>
      ),
    },
    {
      id: 'shift',
      isActive: keyboardState.shift,
      title: 'Range select mode',
      className: 'status-bar__key',
      content: <span>Shift</span>,
    },
    {
      id: 'alt',
      isActive: keyboardState.alt,
      title: 'Alt key held',
      className: 'status-bar__key',
      content: <span>Alt</span>,
    },
    {
      id: 'space',
      isActive: isSpacePanning,
      title: 'Pan mode active',
      className: 'status-bar__key status-bar__key--active',
      content: <span>Space</span>,
    },
  ]

  const activeModifiers = modifierDescriptors.filter((descriptor) => descriptor.isActive)

  return (
    <div className="status-bar">
      {/* Wrapper to ensure proper layout */}
      <div className="status-bar__layout">
        {/* Left section - Tool information */}
        <div className="status-bar__section status-bar__section--left">
          <div className="status-bar__item">
            <span className="status-bar__label">Tool:</span>
            <div className="status-bar__value status-bar__tool">
              {toolInfo.icon}
              <span>{toolInfo.label}</span>
            </div>
          </div>

          {/* Show active keyboard modifiers */}
          <div
            className="status-bar__divider"
            style={{ display: activeModifiers.length > 0 ? 'block' : 'none' }}
          />
          <div
            className="status-bar__item status-bar__keyboard-state"
            style={{ display: activeModifiers.length > 0 ? 'flex' : 'none' }}
          >
            {activeModifiers.map((descriptor) => (
              <span key={descriptor.id} className={descriptor.className} title={descriptor.title}>
                {descriptor.content}
              </span>
            ))}
          </div>
        </div>

        {/* Right section - Zoom controls (placed before center for layout) */}
        <div className="status-bar__section status-bar__section--right">
          <div className="status-bar__zoom-controls">
            <button
              className="status-bar__button"
              onClick={onZoomOut}
              title="Zoom Out (Ctrl + -)"
              aria-label="Zoom Out"
            >
              <ZoomOut size={14} />
            </button>

            <button
              className="status-bar__zoom-level"
              onClick={onZoomReset}
              title="Reset Zoom (Ctrl + 0)"
              aria-label="Reset Zoom"
            >
              {zoomPercentage}%
            </button>

            <button
              className="status-bar__button"
              onClick={onZoomIn}
              title="Zoom In (Ctrl + +)"
              aria-label="Zoom In"
            >
              <ZoomIn size={14} />
            </button>

            <button
              className="status-bar__button"
              onClick={onZoomReset}
              title="Fit to Screen"
              aria-label="Fit to Screen"
            >
              <Maximize2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Center section - Selection info and canvas stats (absolutely positioned) */}
      <div className="status-bar__section status-bar__section--center">
        {totalItems > 0 && (
          <div className="status-bar__item status-bar__selection">
            <Image size={14} className="status-bar__icon" />
            <span className="status-bar__label">Canvas:</span>
            <span className="status-bar__value">
              {totalImages > 0 && `${totalImages} ${totalImages === 1 ? 'image' : 'images'}`}
              {totalImages > 0 && totalFrames > 0 && ', '}
              {totalFrames > 0 && `${totalFrames} ${totalFrames === 1 ? 'frame' : 'frames'}`}
            </span>

            {selectedCount > 0 ? (
              <>
                <div className="status-bar__divider" />
                <button
                  className="status-bar__selection-button"
                  onClick={handleSelectionClick}
                  title={`Deselect all (Esc)`}
                  aria-label="Deselect all"
                >
                  <span className="status-bar__label">Selected:</span>
                  <span
                    className={`status-bar__value status-bar__value--highlight ${selectionChanged ? 'status-bar__value--updating' : ''}`}
                  >
                    {selectedCount} {selectedCount === 1 ? 'item' : 'items'}
                  </span>
                  {selectedCount === totalImages && totalImages > 1 && (
                    <span className="status-bar__badge">All</span>
                  )}
                </button>
              </>
            ) : totalImages > 0 ? (
              <>
                <div className="status-bar__divider" />
                <button
                  className="status-bar__selection-button status-bar__selection-button--subtle"
                  onClick={handleSelectionClick}
                  title="Select all (Ctrl+A)"
                  aria-label="Select all"
                >
                  <span className="status-bar__label">Click to select all</span>
                </button>
              </>
            ) : null}
          </div>
        )}

        {totalItems === 0 && (
          <div className="status-bar__item status-bar__empty-state">
            <span className="status-bar__label">Empty canvas</span>
          </div>
        )}
      </div>
    </div>
  )
}
