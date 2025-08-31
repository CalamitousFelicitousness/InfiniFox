import { useEffect, useRef } from 'preact/hooks'

import { useStore } from '../../store/store'

import './CanvasContextMenu.css'

interface CanvasContextMenuProps {
  visible: boolean
  x: number
  y: number
  imageId: string | null
  onDelete: () => void
  onDuplicate: () => void
  onSendToImg2Img: () => void
  onDownload: () => void
  onUploadImage: () => void
  onClose: () => void
}

export function CanvasContextMenu({
  visible,
  x,
  y,
  imageId,
  onDelete,
  onDuplicate,
  onSendToImg2Img,
  onDownload,
  onUploadImage,
  onClose,
}: CanvasContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const { setImageRole, getImageRole } = useStore()

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

  const handleSendToImg2Img = () => {
    if (imageId) {
      setImageRole(imageId, 'img2img')
      onSendToImg2Img()
    }
  }

  const currentRole = imageId ? getImageRole(imageId) : null
  const roleIndicator = currentRole ? ` (Active: ${currentRole})` : ''

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
      {imageId === null ? (
        // Context menu for empty canvas space
        <>
          <button onPointerDown={(e) => { e.preventDefault(); onUploadImage() }}>
            Upload Image
          </button>
          <hr />
          <button onPointerDown={(e) => { e.preventDefault(); /* TODO: Quick generate */ }} disabled>
            Generate Here (Coming Soon)
          </button>
        </>
      ) : (
        // Context menu for image
        <>
      <button onPointerDown={(e) => { e.preventDefault(); handleSendToImg2Img() }}>
        Send to img2img{currentRole === 'img2img' ? ' ✓' : ''}
      </button>
      <button onPointerDown={(e) => { e.preventDefault(); /* TODO: Send to inpaint */ }} disabled>
        Send to Inpaint{currentRole === 'inpaint' ? ' ✓' : ''} (Coming Soon)
      </button>
      <hr />
      {currentRole && (
        <>
          <button onPointerDown={(e) => { e.preventDefault(); setImageRole(imageId, null) }}>
            Clear Role{roleIndicator}
          </button>
          <hr />
        </>
      )}
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
        </>
      )}
    </div>
  )
}
