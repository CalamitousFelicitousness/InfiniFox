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
  onSelectAll?: () => void
  onDeselectAll?: () => void
  onMoveSelected?: (direction: 'up' | 'down' | 'left' | 'right') => void
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers = {}) {
  const {
    clearCanvas,
    selectAll,
    deselectAll,
    moveSelectedImagesWithHistory,
    deleteSelectedImagesWithHistory,
    duplicateSelectedImagesWithHistory,
    selectedIds,
    bringToFront,
    sendToBack,
    bringForward,
    sendBackward,
  } = useStore()
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

      // Get layer system state for artboard shortcuts
      const store = useStore.getState()
      const { selectedLayerIds } = store

      // Generate (Ctrl/Cmd + Enter)
      if (ctrlOrCmd && e.key === 'Enter') {
        e.preventDefault()
        handlers.onGenerate?.()
      }

      // Select All (Ctrl/Cmd + A)
      if (ctrlOrCmd && e.key === 'a') {
        e.preventDefault()
        selectAll()
        handlers.onSelectAll?.()
      }

      // Deselect All (Escape)
      if (e.key === 'Escape') {
        e.preventDefault()
        deselectAll()
        handlers.onDeselectAll?.()
      }

      // Delete (Delete or Backspace)
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        if (selectedIds.size > 0) {
          deleteSelectedImagesWithHistory()
        } else {
          handlers.onDelete?.()
        }
      }

      // Duplicate (Ctrl/Cmd + D)
      if (ctrlOrCmd && e.key === 'd') {
        e.preventDefault()
        if (selectedIds.size > 0) {
          duplicateSelectedImagesWithHistory()
        } else {
          handlers.onDuplicate?.()
        }
      }

      // Move Selection (Arrow Keys)
      if (!ctrlOrCmd && !e.shiftKey && !e.altKey) {
        const moveDistance = e.shiftKey ? 50 : 10 // Shift for larger moves

        if (e.key === 'ArrowUp') {
          e.preventDefault()
          if (selectedIds.size > 0) {
            moveSelectedImagesWithHistory(0, -moveDistance)
            handlers.onMoveSelected?.('up')
          }
        } else if (e.key === 'ArrowDown') {
          e.preventDefault()
          if (selectedIds.size > 0) {
            moveSelectedImagesWithHistory(0, moveDistance)
            handlers.onMoveSelected?.('down')
          }
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault()
          if (selectedIds.size > 0) {
            moveSelectedImagesWithHistory(-moveDistance, 0)
            handlers.onMoveSelected?.('left')
          }
        } else if (e.key === 'ArrowRight') {
          e.preventDefault()
          if (selectedIds.size > 0) {
            moveSelectedImagesWithHistory(moveDistance, 0)
            handlers.onMoveSelected?.('right')
          }
        }
      }

      // Z-Index Management
      if (ctrlOrCmd && selectedIds.size > 0) {
        const selectedIdsArray = Array.from(selectedIds)

        // Bring to Front (Ctrl/Cmd + ])
        if (e.key === ']' && e.shiftKey) {
          e.preventDefault()
          bringToFront(selectedIdsArray)
        }
        // Send to Back (Ctrl/Cmd + [)
        else if (e.key === '[' && e.shiftKey) {
          e.preventDefault()
          sendToBack(selectedIdsArray)
        }
        // Bring Forward (Ctrl/Cmd + ])
        else if (e.key === ']' && !e.shiftKey) {
          e.preventDefault()
          bringForward(selectedIdsArray)
        }
        // Send Backward (Ctrl/Cmd + [)
        else if (e.key === '[' && !e.shiftKey) {
          e.preventDefault()
          sendBackward(selectedIdsArray)
        }
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

      // Artboard shortcuts - check if selected layer is an artboard
      if (selectedLayerIds.size === 1) {
        const layerId = Array.from(selectedLayerIds)[0]
        const layer = store.getLayer(layerId)

        if (layer?.type === 'artboard') {
          // Select All Children (Ctrl/Cmd + Shift + A)
          if (ctrlOrCmd && e.shiftKey && e.key === 'a') {
            e.preventDefault()
            store.selectArtboardChildren(layerId)
          }

          // Bring to Front (Ctrl/Cmd + Shift + ])
          if (ctrlOrCmd && e.shiftKey && e.key === ']') {
            e.preventDefault()
            store.moveArtboardToFront(layerId)
          }

          // Send to Back (Ctrl/Cmd + Shift + [)
          if (ctrlOrCmd && e.shiftKey && e.key === '[') {
            e.preventDefault()
            store.moveArtboardToBack(layerId)
          }
        }
      }
    }

    // Use capture phase to intercept before bubbling
    document.addEventListener('keydown', handleKeyDown, { capture: true })

    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true })
    }
  }, [
    handlers,
    clearCanvas,
    selectAll,
    deselectAll,
    moveSelectedImagesWithHistory,
    deleteSelectedImagesWithHistory,
    duplicateSelectedImagesWithHistory,
    selectedIds,
    bringToFront,
    sendToBack,
    bringForward,
    sendBackward,
    undo,
    redo,
    canUndo,
    canRedo,
  ])
}
