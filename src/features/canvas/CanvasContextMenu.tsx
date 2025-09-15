import { Check } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { Icon } from '../../components/common/Icon'
import { useStore } from '../../store/store'

import './CanvasContextMenu.css'

interface CanvasContextMenuProps {
  visible: boolean
  x: number
  y: number
  imageId: string | null
  frameId?: string | null
  selectedIds?: Set<string>  // Multi-selection support
  onDelete: () => void
  onDuplicate: () => void
  onSendToImg2Img: () => void
  onInpaint: () => void
  onDownload: () => void
  onUploadImage: () => void
  onGenerateHere: () => void
  onPlaceEmptyFrame: () => void
  onClose: () => void
  // Multi-selection operations
  onGroupSelection?: () => void
  onUngroupSelection?: () => void
  onAlignLeft?: () => void
  onAlignCenter?: () => void
  onAlignRight?: () => void
  onAlignTop?: () => void
  onAlignMiddle?: () => void
  onAlignBottom?: () => void
  onDistributeHorizontally?: () => void
  onDistributeVertically?: () => void
  onBringToFront?: () => void
  onSendToBack?: () => void
}

export function CanvasContextMenu({
  visible,
  x,
  y,
  imageId,
  frameId,
  selectedIds,
  onDelete,
  onDuplicate,
  onSendToImg2Img,
  onInpaint,
  onDownload,
  onUploadImage,
  onGenerateHere,
  onPlaceEmptyFrame,
  onClose,
  onGroupSelection,
  onUngroupSelection,
  onAlignLeft,
  onAlignCenter,
  onAlignRight,
  onAlignTop,
  onAlignMiddle,
  onAlignBottom,
  onDistributeHorizontally,
  onDistributeVertically,
  onBringToFront,
  onSendToBack,
}: CanvasContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
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
      timeoutRef.current = setTimeout(() => {
        document.addEventListener('pointerdown', handlePointerDown)
      }, 0)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
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
  const isMultiSelection = selectedIds && selectedIds.size > 1 && imageId && selectedIds.has(imageId)

  if (frameId && currentFrame) {
    return (
      <div
        ref={menuRef}
        className="menu canvas-context-menu"
        style={{
          position: 'absolute',
          left: `${x}px`,
          top: `${y}px`,
        }}
      >
        {currentFrame.isPlaceholder && (
          <>
            <button
              className="menu-item"
              onPointerDown={(e) => {
                e.preventDefault()
                generateInFrame(frameId)
                onClose()
              }}
            >
              Generate in Frame
            </button>
            <button
              className="menu-item"
              onPointerDown={(e) => {
                e.preventDefault()
                lockFrame(frameId, !currentFrame.locked)
                onClose()
              }}
            >
              {currentFrame.locked ? 'Unlock' : 'Lock'} Frame
            </button>
            <hr className="menu-divider" />
          </>
        )}
        <button
          className="menu-item menu-item-danger"
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

  // Multi-selection context menu
  if (isMultiSelection) {
    return (
      <div
        ref={menuRef}
        className="menu canvas-context-menu"
        style={{
          position: 'absolute',
          left: `${x}px`,
          top: `${y}px`,
        }}
      >
        <div className="menu-header">
          <span className="menu-header-text">{selectedIds?.size} items selected</span>
        </div>
        
        {/* Grouping Operations */}
        {onGroupSelection && (
          <button
            className="menu-item"
            onPointerDown={(e) => {
              e.preventDefault()
              onGroupSelection()
              onClose()
            }}
          >
            Group Selection (Ctrl+G)
          </button>
        )}
        {onUngroupSelection && (
          <button
            className="menu-item"
            onPointerDown={(e) => {
              e.preventDefault()
              onUngroupSelection()
              onClose()
            }}
          >
            Ungroup Selection (Ctrl+Shift+G)
          </button>
        )}
        
        <hr className="menu-divider" />
        
        {/* Alignment Operations */}
        <div className="menu-section">
          <span className="menu-section-title">Align</span>
          <div className="menu-grid">
            {onAlignLeft && (
              <button
                className="menu-item-small"
                onPointerDown={(e) => {
                  e.preventDefault()
                  onAlignLeft()
                  onClose()
                }}
                title="Align Left"
              >
                ⬅
              </button>
            )}
            {onAlignCenter && (
              <button
                className="menu-item-small"
                onPointerDown={(e) => {
                  e.preventDefault()
                  onAlignCenter()
                  onClose()
                }}
                title="Align Center"
              >
                ↔
              </button>
            )}
            {onAlignRight && (
              <button
                className="menu-item-small"
                onPointerDown={(e) => {
                  e.preventDefault()
                  onAlignRight()
                  onClose()
                }}
                title="Align Right"
              >
                ➡
              </button>
            )}
            {onAlignTop && (
              <button
                className="menu-item-small"
                onPointerDown={(e) => {
                  e.preventDefault()
                  onAlignTop()
                  onClose()
                }}
                title="Align Top"
              >
                ⬆
              </button>
            )}
            {onAlignMiddle && (
              <button
                className="menu-item-small"
                onPointerDown={(e) => {
                  e.preventDefault()
                  onAlignMiddle()
                  onClose()
                }}
                title="Align Middle"
              >
                ↕
              </button>
            )}
            {onAlignBottom && (
              <button
                className="menu-item-small"
                onPointerDown={(e) => {
                  e.preventDefault()
                  onAlignBottom()
                  onClose()
                }}
                title="Align Bottom"
              >
                ⬇
              </button>
            )}
          </div>
        </div>
        
        {/* Distribution Operations */}
        {(onDistributeHorizontally || onDistributeVertically) && (
          <>
            <div className="menu-section">
              <span className="menu-section-title">Distribute</span>
              <div className="menu-grid">
                {onDistributeHorizontally && (
                  <button
                    className="menu-item-small"
                    onPointerDown={(e) => {
                      e.preventDefault()
                      onDistributeHorizontally()
                      onClose()
                    }}
                    title="Distribute Horizontally"
                  >
                    ⬌
                  </button>
                )}
                {onDistributeVertically && (
                  <button
                    className="menu-item-small"
                    onPointerDown={(e) => {
                      e.preventDefault()
                      onDistributeVertically()
                      onClose()
                    }}
                    title="Distribute Vertically"
                  >
                    ⬍
                  </button>
                )}
              </div>
            </div>
          </>
        )}
        
        <hr className="menu-divider" />
        
        {/* Arrangement Operations */}
        {onBringToFront && (
          <button
            className="menu-item"
            onPointerDown={(e) => {
              e.preventDefault()
              onBringToFront()
              onClose()
            }}
          >
            Bring to Front (Ctrl+Shift+])
          </button>
        )}
        {onSendToBack && (
          <button
            className="menu-item"
            onPointerDown={(e) => {
              e.preventDefault()
              onSendToBack()
              onClose()
            }}
          >
            Send to Back (Ctrl+Shift+[)
          </button>
        )}
        
        <hr className="menu-divider" />
        
        {/* Basic Operations */}
        <button
          className="menu-item"
          onPointerDown={(e) => {
            e.preventDefault()
            onDuplicate()
            onClose()
          }}
        >
          Duplicate All (Ctrl+D)
        </button>
        <button
          className="menu-item menu-item-danger"
          onPointerDown={(e) => {
            e.preventDefault()
            onDelete()
            onClose()
          }}
        >
          Delete All (Delete)
        </button>
      </div>
    )
  }

  return (
    <div
      ref={menuRef}
      className="menu canvas-context-menu"
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
            className="menu-item"
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
              <hr className="menu-divider" />
              <button
                className="menu-item"
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
          <hr className="menu-divider" />
          <button
            className="menu-item"
            onPointerDown={(e) => {
              e.preventDefault()
              onPlaceEmptyFrame()
            }}
          >
            Place Empty Frame
          </button>
          <button
            className="menu-item"
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
            <div className="canvas-context-menu__role-info">
              {activeImageRoles.map((role) => (
                <div key={role.imageId} className="canvas-context-menu__role-item">
                  <span className="canvas-context-menu__role-text">
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
            className="menu-item"
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
            className="menu-item"
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
          <hr className="menu-divider" />
          {currentRole && (
            <>
              <button
                className="menu-item"
                onPointerDown={(e) => {
                  e.preventDefault()
                  setImageRole(imageId, null)
                  onClose() // Close menu after clearing role
                }}
              >
                Clear Role{roleIndicator}
              </button>
              <hr className="menu-divider" />
            </>
          )}
          <button
            className="menu-item"
            onPointerDown={(e) => {
              e.preventDefault()
              onDuplicate()
              onClose()
            }}
          >
            Duplicate
          </button>
          <button
            className="menu-item"
            onPointerDown={(e) => {
              e.preventDefault()
              onDownload()
              onClose()
            }}
          >
            Download
          </button>
          <hr className="menu-divider" />
          <button
            className="menu-item menu-item-danger"
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
