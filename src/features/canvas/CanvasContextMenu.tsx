import { useEffect, useRef } from 'preact/hooks'
import { Check } from 'lucide-preact'
import { Icon } from '../../components/common/Icon'

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
  onInpaint: () => void
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
  onInpaint,
  onDownload,
  onUploadImage,
  onClose,
}: CanvasContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const { setImageRole, getImageRole, clearImageRoles, activeImageRoles } = useStore()

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
      setImageRole(imageId, 'img2img_init')
      onSendToImg2Img()
      onClose()  // Close menu after setting role
    }
  }

  const handleSendToInpaint = () => {
    if (imageId) {
      setImageRole(imageId, 'inpaint_image')
      onInpaint()
      onClose()  // Close menu after setting role
    }
  }

  const currentRole = imageId ? getImageRole(imageId) : null
  const roleIndicator = currentRole ? ` (Active: ${currentRole})` : ''

  return (
    <div
      ref={menuRef}
      class="menu canvas-context-menu"
      style={{
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      {imageId === null ? (
        // Context menu for empty canvas space
        <>
          <button class="menu-item" onPointerDown={(e) => { 
            e.preventDefault(); 
            onUploadImage();
            onClose()
          }}>
            Upload Image
          </button>
          {activeImageRoles.length > 0 && (
            <>
              <hr class="menu-divider" />
              <button class="menu-item" onPointerDown={(e) => { 
                e.preventDefault(); 
                clearImageRoles();
                onClose()
              }}>
                Clear All Image Roles ({activeImageRoles.length} active)
              </button>
            </>
          )}
          <hr class="menu-divider" />
          <button class="menu-item" onPointerDown={(e) => { e.preventDefault(); /* TODO: Quick generate */ }} disabled>
            Generate Here (Coming Soon)
          </button>
        </>
      ) : (
        // Context menu for image
        <>
      <button class="menu-item" onPointerDown={(e) => { e.preventDefault(); handleSendToImg2Img() }}>
        Send to img2img{currentRole === 'img2img_init' ? <Icon icon={Check} size="sm" className="inline-icon" /> : ''}
      </button>
      <button class="menu-item" onPointerDown={(e) => { e.preventDefault(); handleSendToInpaint() }}>
        Send to Inpaint{currentRole === 'inpaint_image' ? <Icon icon={Check} size="sm" className="inline-icon" /> : ''}
      </button>
      <hr class="menu-divider" />
      {currentRole && (
        <>
          <button class="menu-item" onPointerDown={(e) => { 
            e.preventDefault(); 
            setImageRole(imageId, null);
            onClose()  // Close menu after clearing role
          }}>
            Clear Role{roleIndicator}
          </button>
          <hr class="menu-divider" />
        </>
      )}
      <button class="menu-item" onPointerDown={(e) => { 
        e.preventDefault(); 
        onDuplicate();
        onClose()
      }}>
        Duplicate
      </button>
      <button class="menu-item" onPointerDown={(e) => { 
        e.preventDefault(); 
        onDownload();
        onClose()
      }}>
        Download
      </button>
      <hr class="menu-divider" />
      <button class="menu-item menu-item-danger" onPointerDown={(e) => { 
        e.preventDefault(); 
        onDelete();
        onClose()
      }}>
        Delete
      </button>
        </>
      )}
    </div>
  )
}
