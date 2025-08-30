import { useEffect } from 'preact/hooks'

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
  useEffect(() => {
    const handleClick = () => onClose()
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    if (visible) {
      document.addEventListener('click', handleClick)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [visible, onClose])

  if (!visible) return null

  return (
    <div
      class="context-menu"
      style={{
        position: 'fixed',
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      <button onClick={onSendToImg2Img}>Send to img2img</button>
      <button onClick={onDuplicate}>Duplicate</button>
      <button onClick={onDownload}>Download</button>
      <hr />
      <button onClick={onDelete} class="delete-option">Delete</button>
    </div>
  )
}
