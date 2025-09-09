import { useEffect, useState } from 'react'

import './CanvasModeIndicator.css'

interface CanvasModeIndicatorProps {
  mode: 'space-pan' | 'shift-scroll' | null
  position?: 'bottom-center' | 'bottom-right' | 'bottom-left'
}

export function CanvasModeIndicator({
  mode,
  position = 'bottom-center',
}: CanvasModeIndicatorProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (mode) {
      setIsVisible(true)
    } else {
      setIsVisible(false)
    }
  }, [mode])

  if (!mode) return null

  const getModeText = () => {
    switch (mode) {
      case 'space-pan':
        return 'SPACE PAN'
      case 'shift-scroll':
        return 'SHIFT+SCROLL ↔'
      default:
        return ''
    }
  }

  return (
    <div
      className={`canvas-mode-indicator glass-surface ${position} ${isVisible ? 'visible' : ''}`}
      data-mode={mode}
      aria-label={`Canvas mode: ${getModeText()}`}
    >
      <span className="canvas-mode-indicator__text">{getModeText()}</span>
    </div>
  )
}
