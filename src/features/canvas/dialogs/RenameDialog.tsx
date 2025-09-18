import { useState, useEffect, useRef } from 'react'
import './RenameDialog.css'

export interface RenameDialogProps {
  currentName: string
  onRename: (name: string) => void
  onClose: () => void
}

export function RenameDialog({ currentName, onRename, onClose }: RenameDialogProps) {
  const [name, setName] = useState(currentName)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.select()
  }, [])

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (name.trim()) {
      onRename(name.trim())
      onClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className="rename-dialog-overlay" onPointerDown={onClose}>
      <div className="rename-dialog" onPointerDown={(e) => e.stopPropagation()}>
        <div className="rename-dialog-header">
          <h3>Rename</h3>
          <button className="rename-dialog-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="rename-dialog-content">
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter name"
            autoFocus
          />
        </div>

        <div className="rename-dialog-footer">
          <button className="rename-dialog-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="rename-dialog-apply"
            onClick={() => handleSubmit()}
            disabled={!name.trim()}
          >
            Rename
          </button>
        </div>
      </div>
    </div>
  )
}
