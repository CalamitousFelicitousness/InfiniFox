import { useEffect } from 'react'

import { useHistoryStore } from '../store/historyStore'
import { useStore } from '../store/store'

interface ShortcutHandlers {
  onGenerate?: () => void
  onDelete?: () => void
  onDuplicate?: () => void
  onUndo?: () => void
  onRedo?: () => void
  onClearCanvas?: () => void
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers = {}) {
  const { clearCanvas } = useStore()
  const { undo, redo, canUndo, canRedo } = useHistoryStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input field
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      ) {
        return
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey

      // Generate (Ctrl/Cmd + Enter)
      if (ctrlOrCmd && e.key === 'Enter') {
        e.preventDefault()
        handlers.onGenerate?.()
      }

      // Delete (Delete or Backspace)
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        handlers.onDelete?.()
      }

      // Duplicate (Ctrl/Cmd + D)
      if (ctrlOrCmd && e.key === 'd') {
        e.preventDefault()
        handlers.onDuplicate?.()
      }

      // Undo (Ctrl/Cmd + Z)
      if (ctrlOrCmd && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (canUndo) {
          undo()
        }
      }

      // Redo (Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y)
      if ((ctrlOrCmd && e.shiftKey && e.key === 'z') || (ctrlOrCmd && e.key === 'y')) {
        e.preventDefault()
        if (canRedo) {
          redo()
        }
      }

      // Clear Canvas (Ctrl/Cmd + Shift + Delete)
      if (ctrlOrCmd && e.shiftKey && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault()
        if (confirm('Clear all images from canvas?')) {
          clearCanvas()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handlers, clearCanvas, undo, redo, canUndo, canRedo])
}
