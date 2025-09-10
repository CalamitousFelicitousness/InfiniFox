import { useState, useEffect, useCallback, useRef } from 'react'

type Position = {
  x: number
  y: number
}

interface UseFileOperationsProps {
  containerRef: React.RefObject<HTMLDivElement>
  scale: number
  position: Position
  onImageUpload: (file: File, x: number, y: number) => Promise<void>
}

/**
 * Hook for managing file operations including drag-drop and file uploads
 */
export function useFileOperations({
  containerRef,
  scale,
  position,
  onImageUpload,
}: UseFileOperationsProps) {
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [uploadPosition, setUploadPosition] = useState<Position>({ x: 0, y: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)

  /**
   * Convert screen coordinates to canvas coordinates
   */
  const screenToCanvas = useCallback(
    (screenPoint: Position): Position => {
      return {
        x: (screenPoint.x - position.x) / scale,
        y: (screenPoint.y - position.y) / scale,
      }
    },
    [scale, position]
  )

  /**
   * Handle image file processing
   */
  const handleImageFile = useCallback(
    async (file: File, canvasX: number, canvasY: number) => {
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }

      await onImageUpload(file, canvasX, canvasY)
    },
    [onImageUpload]
  )

  /**
   * Setup drag and drop handlers
   */
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      
      // Check if dragging files
      if (e.dataTransfer?.types.includes('Files')) {
        setIsDraggingFile(true)
        e.dataTransfer.dropEffect = 'copy'
      }
    }

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      
      // Check if dragging files
      if (e.dataTransfer?.types.includes('Files')) {
        setIsDraggingFile(true)
      }
    }

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      
      // Only set to false if we're leaving the container entirely
      const relatedTarget = e.relatedTarget as Node
      if (!container.contains(relatedTarget)) {
        setIsDraggingFile(false)
      }
    }

    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDraggingFile(false)

      const files = Array.from(e.dataTransfer?.files || [])
      const imageFile = files.find((f) => f.type.startsWith('image/'))

      if (imageFile) {
        // Calculate drop position relative to container
        const rect = container.getBoundingClientRect()
        const screenX = e.clientX - rect.left
        const screenY = e.clientY - rect.top
        const canvasPos = screenToCanvas({ x: screenX, y: screenY })
        
        handleImageFile(imageFile, canvasPos.x, canvasPos.y)
      }
    }

    // Add event listeners
    container.addEventListener('dragover', handleDragOver)
    container.addEventListener('dragenter', handleDragEnter)
    container.addEventListener('dragleave', handleDragLeave)
    container.addEventListener('drop', handleDrop)

    // Cleanup
    return () => {
      container.removeEventListener('dragover', handleDragOver)
      container.removeEventListener('dragenter', handleDragEnter)
      container.removeEventListener('dragleave', handleDragLeave)
      container.removeEventListener('drop', handleDrop)
    }
  }, [containerRef, screenToCanvas, handleImageFile])

  /**
   * Open file picker dialog
   */
  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  /**
   * Handle file selection from input
   */
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      await handleImageFile(file, uploadPosition.x, uploadPosition.y)

      // Reset file input
      if (e.target) {
        e.target.value = ''
      }
    },
    [handleImageFile, uploadPosition]
  )

  /**
   * Set position for next upload
   */
  const setNextUploadPosition = useCallback((x: number, y: number) => {
    setUploadPosition({ x, y })
  }, [])

  /**
   * Check if a file is an image
   */
  const isImageFile = useCallback((file: File): boolean => {
    return file.type.startsWith('image/')
  }, [])

  /**
   * Get accepted file types for input
   */
  const getAcceptedFileTypes = useCallback((): string => {
    return 'image/*'
  }, [])

  /**
   * Handle paste event for images
   */
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            // Paste at center of viewport
            const container = containerRef.current
            if (container) {
              const rect = container.getBoundingClientRect()
              const centerX = rect.width / 2
              const centerY = rect.height / 2
              const canvasPos = screenToCanvas({ x: centerX, y: centerY })
              await handleImageFile(file, canvasPos.x, canvasPos.y)
            }
          }
        }
      }
    }

    document.addEventListener('paste', handlePaste)
    return () => {
      document.removeEventListener('paste', handlePaste)
    }
  }, [containerRef, screenToCanvas, handleImageFile])

  return {
    // State
    isDraggingFile,
    uploadPosition,
    fileInputRef,

    // Methods
    openFilePicker,
    handleFileSelect,
    setNextUploadPosition,
    handleImageFile,

    // Utilities
    isImageFile,
    getAcceptedFileTypes,
  }
}
