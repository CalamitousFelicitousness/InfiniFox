import { useState, useCallback, useEffect } from 'react'

import { useStore } from '../../../store/store'

/**
 * Canvas tool types enum for better mode management
 */
export enum CanvasTool {
  SELECT = 'select',
  BRUSH = 'brush',
  ERASER = 'eraser',
  PAN = 'pan',
}

/**
 * Hook for managing canvas tool state and interactions
 * Handles tool switching, temporary tool modes, and keyboard shortcuts
 */
export function useCanvasTools() {
  const { setDrawingMode, setDrawingTool } = useStore()

  // Tool state
  const [currentTool, setCurrentToolInternal] = useState<CanvasTool>(CanvasTool.SELECT)
  const [previousTool, setPreviousTool] = useState<CanvasTool | null>(null)

  // Keyboard modifier states
  const [isSpacePressed, setIsSpacePressed] = useState(false)
  const [isShiftPressed, setIsShiftPressed] = useState(false)
  const [isCtrlPressed, setIsCtrlPressed] = useState(false)

  /**
   * Handle tool changes with automatic drawing mode management
   */
  const setCurrentTool = useCallback(
    (tool: CanvasTool, isTemporary = false) => {
      // Don't allow tool changes while space is pressed (temporary pan mode)
      if (isSpacePressed && !isTemporary) return

      setCurrentToolInternal(tool)

      // Automatically enable/disable drawing mode based on tool
      const isDrawingTool = tool === CanvasTool.BRUSH || tool === CanvasTool.ERASER
      setDrawingMode(isDrawingTool)

      if (isDrawingTool) {
        setDrawingTool(tool === CanvasTool.ERASER ? 'eraser' : 'brush')
      }
    },
    [isSpacePressed, setDrawingMode, setDrawingTool]
  )

  /**
   * Handle space-to-pan functionality
   */
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

      // Handle space key for temporary pan mode
      if (e.code === 'Space' && !e.repeat && !isSpacePressed) {
        e.preventDefault() // Prevent page scroll

        // Don't activate pan mode if already in pan mode
        if (currentTool !== CanvasTool.PAN) {
          setIsSpacePressed(true)
          setPreviousTool(currentTool)
          setCurrentTool(CanvasTool.PAN, true) // true indicates temporary switch
        }
      }

      // Track modifier keys
      if (e.shiftKey && !isShiftPressed) {
        setIsShiftPressed(true)
      }
      if (e.ctrlKey && !isCtrlPressed) {
        setIsCtrlPressed(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      // Handle space key release
      if (e.code === 'Space') {
        e.preventDefault() // Prevent page scroll

        if (isSpacePressed && previousTool !== null) {
          setIsSpacePressed(false)
          setCurrentTool(previousTool, true) // Restore previous tool
          setPreviousTool(null)
        }
      }

      // Track modifier keys
      if (!e.shiftKey && isShiftPressed) {
        setIsShiftPressed(false)
      }
      if (!e.ctrlKey && isCtrlPressed) {
        setIsCtrlPressed(false)
      }
    }

    const handleBlur = () => {
      // Reset modifier state when window loses focus
      setIsShiftPressed(false)
      setIsCtrlPressed(false)

      // Reset space-to-pan if window loses focus while space is pressed
      if (isSpacePressed && previousTool !== null) {
        setIsSpacePressed(false)
        setCurrentTool(previousTool, true)
        setPreviousTool(null)
      }
    }

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
    }
  }, [currentTool, isSpacePressed, previousTool, setCurrentTool, isShiftPressed, isCtrlPressed])

  /**
   * Get the appropriate cursor class based on current tool
   */
  const getCursorClass = useCallback(() => {
    switch (currentTool) {
      case CanvasTool.BRUSH:
      case CanvasTool.ERASER:
        return 'drawing-mode'
      case CanvasTool.PAN:
        return 'pan-mode'
      default:
        return ''
    }
  }, [currentTool])

  /**
   * Check if the current tool is a drawing tool
   */
  const isDrawingTool = currentTool === CanvasTool.BRUSH || currentTool === CanvasTool.ERASER

  /**
   * Get the mode indicator for keyboard shortcuts
   */
  const getKeyboardMode = useCallback(() => {
    if (isSpacePressed) return 'space-pan'
    if (isShiftPressed) return 'shift-scroll'
    if (isCtrlPressed) return 'ctrl-scroll'
    return null
  }, [isSpacePressed, isShiftPressed, isCtrlPressed])

  return {
    // Tool state
    currentTool,
    setCurrentTool,
    previousTool,

    // Keyboard modifiers
    isSpacePressed,
    isShiftPressed,
    isCtrlPressed,

    // Helper methods
    getCursorClass,
    isDrawingTool,
    getKeyboardMode,
  }
}
