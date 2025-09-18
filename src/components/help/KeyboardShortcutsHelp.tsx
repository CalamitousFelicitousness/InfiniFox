/**
 * Keyboard Shortcuts Help Component
 * Displays available keyboard shortcuts in a modal overlay
 */

import { X, Keyboard, Command } from 'lucide-react'
import React, { useState, useCallback, useEffect } from 'react'

interface ShortcutCategory {
  name: string
  shortcuts: Shortcut[]
}

interface Shortcut {
  keys: string[]
  description: string
  context?: string
}

const SHORTCUTS: ShortcutCategory[] = [
  {
    name: 'Selection',
    shortcuts: [
      { keys: ['Ctrl', 'A'], description: 'Select all items' },
      { keys: ['Escape'], description: 'Deselect all items' },
      { keys: ['Ctrl', 'Click'], description: 'Toggle item selection' },
      { keys: ['Shift', 'Click'], description: 'Select range' },
      { keys: ['Click', 'Drag'], description: 'Selection box', context: 'Canvas' },
    ],
  },
  {
    name: 'Movement',
    shortcuts: [
      { keys: ['Arrow Keys'], description: 'Move selected items (10px)' },
      { keys: ['Shift', 'Arrow Keys'], description: 'Move selected items (1px)' },
      { keys: ['Ctrl', 'Arrow Keys'], description: 'Move selected items (50px)' },
    ],
  },
  {
    name: 'Editing',
    shortcuts: [
      { keys: ['Delete'], description: 'Delete selected items' },
      { keys: ['Ctrl', 'D'], description: 'Duplicate selected items' },
      { keys: ['Ctrl', 'C'], description: 'Copy selected items' },
      { keys: ['Ctrl', 'V'], description: 'Paste items' },
      { keys: ['Ctrl', 'X'], description: 'Cut selected items' },
      { keys: ['Ctrl', 'Z'], description: 'Undo' },
      { keys: ['Ctrl', 'Y'], description: 'Redo' },
    ],
  },
  {
    name: 'Arrangement',
    shortcuts: [
      { keys: ['Ctrl', '['], description: 'Send backward' },
      { keys: ['Ctrl', ']'], description: 'Bring forward' },
      { keys: ['Ctrl', 'Shift', '['], description: 'Send to back' },
      { keys: ['Ctrl', 'Shift', ']'], description: 'Bring to front' },
    ],
  },
  {
    name: 'Grouping',
    shortcuts: [
      { keys: ['Ctrl', 'G'], description: 'Group selected items' },
      { keys: ['Ctrl', 'Shift', 'G'], description: 'Ungroup selected items' },
    ],
  },
  {
    name: 'Canvas Navigation',
    shortcuts: [
      { keys: ['Space', 'Drag'], description: 'Pan canvas' },
      { keys: ['Ctrl', '0'], description: 'Reset zoom' },
      { keys: ['Ctrl', '+'], description: 'Zoom in' },
      { keys: ['Ctrl', '-'], description: 'Zoom out' },
      { keys: ['Ctrl', 'Scroll'], description: 'Zoom', context: 'Mouse' },
      { keys: ['Middle Click', 'Drag'], description: 'Pan', context: 'Mouse' },
    ],
  },
  {
    name: 'Drawing',
    shortcuts: [
      { keys: ['B'], description: 'Brush tool' },
      { keys: ['E'], description: 'Eraser tool' },
      { keys: ['['], description: 'Decrease brush size' },
      { keys: [']'], description: 'Increase brush size' },
      { keys: ['Shift', '['], description: 'Decrease brush opacity' },
      { keys: ['Shift', ']'], description: 'Increase brush opacity' },
    ],
  },
  {
    name: 'General',
    shortcuts: [
      { keys: ['?'], description: 'Show keyboard shortcuts' },
      { keys: ['Ctrl', 'S'], description: 'Save canvas' },
      { keys: ['Ctrl', 'O'], description: 'Open file' },
      { keys: ['Tab'], description: 'Navigate through items' },
      { keys: ['Shift', 'Tab'], description: 'Reverse navigate' },
    ],
  },
]

interface KeyboardShortcutsHelpProps {
  isOpen?: boolean
  onClose?: () => void
  trigger?: 'manual' | 'hotkey'
}

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  isOpen: controlledIsOpen,
  onClose,
  trigger = 'hotkey',
}) => {
  const [isOpen, setIsOpen] = useState(controlledIsOpen || false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Use controlled state if provided
  useEffect(() => {
    if (controlledIsOpen !== undefined) {
      setIsOpen(controlledIsOpen)
    }
  }, [controlledIsOpen])

  // Handle keyboard shortcut to open help
  useEffect(() => {
    if (trigger !== 'hotkey') return

    const handleKeyPress = (e: KeyboardEvent) => {
      // Show help with '?' key
      if (e.key === '?' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
      // Close with Escape
      if (e.key === 'Escape' && isOpen) {
        handleClose()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isOpen, trigger, handleClose])

  const handleClose = useCallback(() => {
    setIsOpen(false)
    setSearchQuery('')
    setSelectedCategory(null)
    onClose?.()
  }, [onClose])

  // Filter shortcuts based on search
  const filteredCategories = SHORTCUTS.map((category) => ({
    ...category,
    shortcuts: category.shortcuts.filter(
      (shortcut) =>
        shortcut.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shortcut.keys.some((key) => key.toLowerCase().includes(searchQuery.toLowerCase()))
    ),
  })).filter(
    (category) =>
      category.shortcuts.length > 0 ||
      (!searchQuery && (!selectedCategory || selectedCategory === category.name))
  )

  // Get platform-specific key names
  const getPlatformKey = (key: string) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0

    switch (key) {
      case 'Ctrl':
        return isMac ? '⌘' : 'Ctrl'
      case 'Alt':
        return isMac ? '⌥' : 'Alt'
      case 'Shift':
        return isMac ? '⇧' : 'Shift'
      case 'Delete':
        return isMac ? '⌫' : 'Del'
      case 'Enter':
        return isMac ? '⏎' : 'Enter'
      case 'Tab':
        return isMac ? '⇥' : 'Tab'
      case 'Escape':
        return isMac ? '⎋' : 'Esc'
      case 'Space':
        return '␣'
      default:
        return key
    }
  }

  if (!isOpen) return null

  return (
    <div className="keyboard-shortcuts-overlay" onClick={handleClose}>
      <div className="keyboard-shortcuts-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="keyboard-shortcuts-header">
          <div className="keyboard-shortcuts-title">
            <Keyboard size={24} />
            <h2>Keyboard Shortcuts</h2>
          </div>
          <button
            className="keyboard-shortcuts-close"
            onClick={handleClose}
            aria-label="Close shortcuts help"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="keyboard-shortcuts-search">
          <input
            type="text"
            placeholder="Search shortcuts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>

        {/* Categories Filter */}
        <div className="keyboard-shortcuts-categories">
          <button
            className={`category-tab ${!selectedCategory ? 'active' : ''}`}
            onClick={() => setSelectedCategory(null)}
          >
            All
          </button>
          {SHORTCUTS.map((category) => (
            <button
              key={category.name}
              className={`category-tab ${selectedCategory === category.name ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category.name)}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Shortcuts List */}
        <div className="keyboard-shortcuts-content">
          {filteredCategories.map((category) => (
            <div key={category.name} className="shortcut-category">
              <h3>{category.name}</h3>
              <div className="shortcuts-list">
                {category.shortcuts.map((shortcut, index) => (
                  <div key={index} className="shortcut-item">
                    <div className="shortcut-keys">
                      {shortcut.keys.map((key, keyIndex) => (
                        <React.Fragment key={keyIndex}>
                          <kbd>{getPlatformKey(key)}</kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="key-separator">+</span>
                          )}
                        </React.Fragment>
                      ))}
                      {shortcut.context && (
                        <span className="shortcut-context">({shortcut.context})</span>
                      )}
                    </div>
                    <div className="shortcut-description">{shortcut.description}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="keyboard-shortcuts-footer">
          <div className="footer-hint">
            Press <kbd>?</kbd> to toggle this help
          </div>
          <div className="footer-hint">
            <Command size={14} /> = Cmd on Mac, Ctrl on Windows/Linux
          </div>
        </div>
      </div>
    </div>
  )
}

// Export a hook for programmatic control
export function useKeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])

  return {
    isOpen,
    open,
    close,
    toggle,
    Component: (props: Omit<KeyboardShortcutsHelpProps, 'isOpen' | 'onClose'>) => (
      <KeyboardShortcutsHelp {...props} isOpen={isOpen} onClose={close} />
    ),
  }
}
