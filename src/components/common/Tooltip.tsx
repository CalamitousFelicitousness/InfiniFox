import type { VNode } from 'react'
import { useState } from 'react'

import './Tooltip.css'

interface TooltipProps {
  content: string
  children: VNode | VNode[] | string | number | null
  position?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
}

export function Tooltip({ content, children, position = 'top', delay = 500 }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [timer, setTimer] = useState<number | null>(null)

  const handleMouseEnter = () => {
    const newTimer = window.setTimeout(() => {
      setVisible(true)
    }, delay)
    setTimer(newTimer)
  }

  const handleMouseLeave = () => {
    if (timer) {
      clearTimeout(timer)
      setTimer(null)
    }
    setVisible(false)
  }

  return (
    <div
      className="tooltip-wrapper"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {visible && (
        <div className={`tooltip tooltip-${position}`}>
          <div className="tooltip-content">{content}</div>
          <div className="tooltip-arrow" />
        </div>
      )}
    </div>
  )
}
