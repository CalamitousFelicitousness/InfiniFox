import { Check } from 'lucide-preact'
import { useEffect, useRef } from 'preact/hooks'

import { Icon } from '../../components/common/Icon'
import { useStore } from '../../store/store'

import './CanvasContextMenu.css'

interface CanvasContextMenuProps {
  visible: boolean
  x: number
  y: number
  imageId: string | null
  frameId?: string | null
  onDelete: () => void
  onDuplicate: () => void
  onSendToImg2Img: () => void
  onInpaint: () => void
  onDownload: () => void
  onUploadImage: () => void
  onGenerateHere: () => void
  onPlaceEmptyFrame: () => void
  onClose: () => void
}

export function CanvasContextMenu({
  visible,
  x,
  y,
  imageId,
  frameId,
  onDelete,
  onDuplicate,
  onSendToImg2Img,
  onInpaint,
  onDownload,
  onUploadImage,
  onGenerateHere,
  onPlaceEmptyFrame,
  onClose,
}: CanvasContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const {
    setImageRole,
    getImageRole,
    clearImageRoles,
    activeImageRoles,
    generationFrames,
    removeGenerationFrame,
    lockFrame,
    generateInFrame,
  } = useStore()

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
      onClose() // Close menu after setting role
    }
  }

  const handleSendToInpaint = () => {
    if (imageId) {
      setImageRole(imageId, 'inpaint_image')
      onInpaint()
      onClose() // Close menu after setting role
    }
  }

  const currentRole = imageId ? getImageRole(imageId) : null
  const roleIndicator = currentRole ? ` (Active: ${currentRole})` : ''
  const currentFrame = frameId ? generationFrames.find((f) => f.id === frameId) : null

  if (frameId && currentFrame) {
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
        {currentFrame.isPlaceholder && (
          <>
            <button
              class="menu-item"
              onPointerDown={(e) => {
                e.preventDefault()
                generateInFrame(frameId)
                onClose()
              }}
            >
              Generate in Frame
            </button>
            <button
              class="menu-item"
              onPointerDown={(e) => {
                e.preventDefault()
                lockFrame(frameId, !currentFrame.locked)
                onClose()
              }}
            >
              {currentFrame.locked ? 'Unlock' : 'Lock'} Frame
            </button>
            <hr class="menu-divider" />
          </>
        )}
        <button
          class="menu-item menu-item-danger"
          onPointerDown={(e) => {
            e.preventDefault()
            removeGenerationFrame(frameId)
            onClose()
          }}
        >
          Delete Frame
        </button>
      </div>
    )
  }

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
          <button
            class="menu-item"
            onPointerDown={(e) => {
              e.preventDefault()
              onUploadImage()
              onClose()
            }}
          >
            Upload Image
          </button>
          {activeImageRoles.length > 0 && (
            <>
              <hr class="menu-divider" />
              <button
                class="menu-item"
                onPointerDown={(e) => {
                  e.preventDefault()
                  clearImageRoles()
                  onClose()
                }}
              >
                Clear All Image Roles ({activeImageRoles.length} active)
              </button>
            </>
          )}
          <hr class="menu-divider" />
          <button
            class="menu-item"
            onPointerDown={(e) => {
              e.preventDefault()
              onPlaceEmptyFrame()
            }}
          >
            Place Empty Frame
          </button>
          <button
            class="menu-item"
            onPointerDown={(e) => {
              e.preventDefault()
              onGenerateHere()
              onClose()
            }}
          >
            {(() => {
              // Determine which generation mode will be used
              const img2imgRole = activeImageRoles.find((r) => r.role === 'img2img_init')
              const inpaintRole = activeImageRoles.find((r) => r.role === 'inpaint_image')

              if (inpaintRole) {
                return 'Quick Inpaint Here'
              } else if (img2imgRole) {
                return 'Quick Img2Img Here'
              } else {
                return 'Quick Generate Here'
              }
            })()}
          </button>
          {/* Show info about active image roles */}
          {activeImageRoles.length > 0 && (
            <div class="canvas-context-menu__role-info">
              {activeImageRoles.map((role) => (
                <div key={role.imageId} class="canvas-context-menu__role-item">
                  <span class="canvas-context-menu__role-text">
                    {role.role === 'img2img_init' && 'Img2Img'}
                    {role.role === 'inpaint_image' && 'Inpaint'}
                    {role.role === 'controlnet' && 'ControlNet'}: Image {role.imageId.slice(-6)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        // Context menu for image
        <>
          <button
            class="menu-item"
            onPointerDown={(e) => {
              e.preventDefault()
              handleSendToImg2Img()
            }}
          >
            Set as Img2Img Init
            {currentRole === 'img2img_init' && (
              <Icon icon={Check} size="sm" className="menu-item__check-inline" />
            )}
          </button>
          <button
            class="menu-item"
            onPointerDown={(e) => {
              e.preventDefault()
              handleSendToInpaint()
            }}
          >
            Set as Inpaint Init
            {currentRole === 'inpaint_image' && (
              <Icon icon={Check} size="sm" className="menu-item__check-inline" />
            )}
          </button>
          <hr class="menu-divider" />
          {currentRole && (
            <>
              <button
                class="menu-item"
                onPointerDown={(e) => {
                  e.preventDefault()
                  setImageRole(imageId, null)
                  onClose() // Close menu after clearing role
                }}
              >
                Clear Role{roleIndicator}
              </button>
              <hr class="menu-divider" />
            </>
          )}
          <button
            class="menu-item"
            onPointerDown={(e) => {
              e.preventDefault()
              onDuplicate()
              onClose()
            }}
          >
            Duplicate
          </button>
          <button
            class="menu-item"
            onPointerDown={(e) => {
              e.preventDefault()
              onDownload()
              onClose()
            }}
          >
            Download
          </button>
          <hr class="menu-divider" />
          <button
            class="menu-item menu-item-danger"
            onPointerDown={(e) => {
              e.preventDefault()
              onDelete()
              onClose()
            }}
          >
            Delete
          </button>
        </>
      )}
    </div>
  )
}
