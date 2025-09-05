/**
 * DrawingPanel Integration Example
 * 
 * This file demonstrates how to integrate the DrawingPanel into the InfiniFox application.
 * The DrawingPanel can be integrated in several ways:
 * 
 * 1. As a tab in the ControlPanel
 * 2. As a modal/overlay
 * 3. As a separate route/page
 * 4. As a dockable panel
 */

import { useState } from 'preact/hooks'
import { DrawingPanel } from './DrawingPanel'
import {
  X as CloseIcon,
  ChevronUp,
  ChevronDown,
  Lock,
  Unlock,
  BrushIcon,
  PaletteIcon
} from '../../components/icons'
import './DrawingIntegration.css'

// Option 1: As a Tab in ControlPanel
export function DrawingTab() {
  return (
    <div class="drawing-tab-container">
      <DrawingPanel />
    </div>
  )
}

// Option 2: As a Modal
export function DrawingModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null
  
  return (
    <div class="drawing-modal-overlay" onClick={onClose}>
      <div class="drawing-modal" onClick={(e) => e.stopPropagation()}>
        <button class="drawing-modal-close" onClick={onClose} title="Close">
          <CloseIcon size={20} />
        </button>
        <DrawingPanel />
      </div>
    </div>
  )
}

// Option 3: As a Dockable Panel (can be toggled on/off)
export function DockableDrawingPanel() {
  const [isDocked, setIsDocked] = useState(true)
  const [isMinimized, setIsMinimized] = useState(false)
  
  return (
    <div class={`dockable-drawing-panel ${isDocked ? 'docked' : 'floating'} ${isMinimized ? 'minimized' : ''}`}>
      <div class="panel-header">
        <span>
          <BrushIcon size={14} style="display: inline-block; margin-right: 6px; vertical-align: middle;" />
          Drawing Tools
        </span>
        <div class="panel-controls">
          <button 
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button 
            onClick={() => setIsDocked(!isDocked)}
            title={isDocked ? 'Undock panel' : 'Dock panel'}
          >
            {isDocked ? <Lock size={14} /> : <Unlock size={14} />}
          </button>
        </div>
      </div>
      {!isMinimized && <DrawingPanel />}
    </div>
  )
}

// Integration with Canvas - Drawing directly on canvas
export function CanvasDrawingMode() {
  const [isDrawingMode, setIsDrawingMode] = useState(false)
  
  return (
    <div class="canvas-drawing-integration">
      <button 
        class="drawing-mode-toggle"
        onClick={() => setIsDrawingMode(!isDrawingMode)}
        title={isDrawingMode ? 'Exit drawing mode' : 'Enter drawing mode'}
      >
        <PaletteIcon size={16} style="display: inline-block; margin-right: 8px; vertical-align: middle;" />
        <span>{isDrawingMode ? 'Exit Drawing Mode' : 'Enter Drawing Mode'}</span>
      </button>
      
      {isDrawingMode && (
        <div class="drawing-overlay">
          <DrawingPanel />
        </div>
      )}
    </div>
  )
}

/*
 * INTEGRATION EXAMPLES:
 * 
 * Example 1: Adding to ControlPanel tabs
 * ----------------------------------------
 * In ControlPanel.tsx, add:
 * 
 * import { DrawingTab } from '../features/drawing/DrawingIntegration'
 * 
 * // In the tabs array:
 * const tabs = [
 *   { id: 'txt2img', label: 'Text to Image', content: <Txt2ImgPanel /> },
 *   { id: 'img2img', label: 'Image to Image', content: <Img2ImgPanel /> },
 *   { id: 'inpaint', label: 'Inpainting', content: <InpaintPanel /> },
 *   { id: 'drawing', label: 'Drawing', content: <DrawingTab /> }, // New tab
 * ]
 * 
 * 
 * Example 2: Adding as a modal in the app
 * ----------------------------------------
 * In App.tsx, add:
 * 
 * import { DrawingModal } from './features/drawing/DrawingIntegration'
 * 
 * export function App() {
 *   const [showDrawing, setShowDrawing] = useState(false)
 *   
 *   return (
 *     <div class="app-layout">
 *       <button onClick={() => setShowDrawing(true)}>Open Drawing Panel</button>
 *       <DrawingModal isOpen={showDrawing} onClose={() => setShowDrawing(false)} />
 *       // ... rest of app components
 *     </div>
 *   )
 * }
 */