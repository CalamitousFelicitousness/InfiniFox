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
import { CloseIcon, ChevronDown, ChevronUp } from '../../components/icons'
import { Pin, PinOff } from 'lucide-preact'
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
        <button class="modal-close" onClick={onClose} aria-label="Close">
          <CloseIcon size={18} class="lucide-icon" />
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
        <span>Drawing Tools</span>
        <div class="panel-controls">
          <button onClick={() => setIsMinimized(!isMinimized)} aria-label={isMinimized ? 'Expand' : 'Minimize'}>
            {isMinimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button onClick={() => setIsDocked(!isDocked)} aria-label={isDocked ? 'Undock' : 'Dock'}>
            {isDocked ? <Pin size={14} /> : <PinOff size={14} />}
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
      >
        {isDrawingMode ? 'Exit Drawing Mode' : 'Enter Drawing Mode'}
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