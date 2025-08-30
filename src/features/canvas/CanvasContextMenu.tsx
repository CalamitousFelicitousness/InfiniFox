import { useEffect, useRef } from 'preact/hooks'

import './CanvasContextMenu.css'

interface CanvasContextMenuProps {
  visible: boolean
  x: number
  y: number
  onDelete: () => void
  onDuplicate: () => void
  onSendToImg2Img: () => void
  onDownload: () => void
  onClose: () => void
}

export function CanvasContextMenu({
  visible,
  x,
  y,
  onDelete,
  onDuplicate,
  onSendToImg2Img,
  onDownload,
  onClose,
}: CanvasContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    if (visible) {
      // Use capture phase to handle before button clicks
      setTimeout(() => {
        document.addEventListener('pointerdown', handlePointerDown)
      }, 0)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [visible, onClose])

  if (!visible) return null

  return (
    <div
      ref={menuRef}
      class="context-menu"
      style={{
        position: 'fixed',
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      <button onPointerDown={(e) => { e.preventDefault(); onSendToImg2Img() }}>
        Send to img2img
      </button>
      <button onPointerDown={(e) => { e.preventDefault(); onDuplicate() }}>
        Duplicate
      </button>
      <button onPointerDown={(e) => { e.preventDefault(); onDownload() }}>
        Download
      </button>
      <hr />
      <button onPointerDown={(e) => { e.preventDefault(); onDelete() }} class="delete-option">
        Delete
      </button>
    </div>
  )
}
