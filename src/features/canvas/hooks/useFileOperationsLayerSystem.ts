import { useState, useEffect, useCallback, useRef } from 'react'

import { useStore } from '../../../store/store'

type Position = {
  x: number
  y: number
}

interface UseFileOperationsLayerSystemProps {
  containerRef: React.RefObject<HTMLDivElement>
  scale: number
  position: Position
  onImageUpload?: (file: File, x: number, y: number) => Promise<void>
}

/**
 * File operations hook with layer system support
 * Handles drag-drop, uploads, and adds images as layers to the active artboard
 */
export function useFileOperationsLayerSystem({
  containerRef,
  scale,
  position,
  onImageUpload,
}: UseFileOperationsLayerSystemProps) {
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [uploadPosition, setUploadPosition] = useState<Position>({ x: 0, y: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { activeArtboardId, addLayer, getArtboards, addArtboard, setActiveArtboard } = useStore()

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
   * Create image layer from file
   */
  const createImageLayer = useCallback(
    async (file: File, canvasX: number, canvasY: number): Promise<void> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        const img = new Image()

        reader.onload = (e) => {
          const dataUrl = e.target?.result as string
          img.src = dataUrl

          img.onload = () => {
            // Ensure we have an active artboard
            let targetArtboard = activeArtboardId
            if (!targetArtboard) {
              const artboards = getArtboards()
              if (artboards.length === 0) {
                // Create default artboard if none exist
                const newArtboardId = addArtboard({
                  width: 1920,
                  height: 1080,
                  backgroundColor: '#ffffff',
                })
                setActiveArtboard(newArtboardId)
                targetArtboard = newArtboardId
              } else {
                // Use first artboard
                targetArtboard = artboards[0].id
                setActiveArtboard(targetArtboard)
              }
            }

            // Create image layer
            const imageLayer = {
              type: 'image' as const,
              name: file.name || 'Uploaded Image',
              x: canvasX,
              y: canvasY,
              imageProps: {
                src: dataUrl,
                width: img.naturalWidth,
                height: img.naturalHeight,
                naturalWidth: img.naturalWidth,
                naturalHeight: img.naturalHeight,
              },
            }

            // Add to active artboard
            addLayer(imageLayer, targetArtboard)
            resolve()
          }

          img.onerror = () => {
            reject(new Error('Failed to load image'))
          }
        }

        reader.onerror = () => {
          reject(new Error('Failed to read file'))
        }

        reader.readAsDataURL(file)
      })
    },
    [activeArtboardId, getArtboards, addArtboard, setActiveArtboard, addLayer]
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

      try {
        // Use layer system if available, otherwise fall back to legacy handler
        if (addLayer && activeArtboardId !== undefined) {
          await createImageLayer(file, canvasX, canvasY)
        } else if (onImageUpload) {
          await onImageUpload(file, canvasX, canvasY)
        }
      } catch (error) {
        console.error('Error uploading image:', error)
        alert('Failed to upload image')
      }
    },
    [createImageLayer, onImageUpload, addLayer, activeArtboardId]
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

      if (e.dataTransfer?.types.includes('Files')) {
        setIsDraggingFile(true)
        e.dataTransfer.dropEffect = 'copy'
      }
    }

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (e.dataTransfer?.types.includes('Files')) {
        setIsDraggingFile(true)
      }
    }

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()

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
        const rect = container.getBoundingClientRect()
        const screenX = e.clientX - rect.left
        const screenY = e.clientY - rect.top
        const canvasPos = screenToCanvas({ x: screenX, y: screenY })

        handleImageFile(imageFile, canvasPos.x, canvasPos.y)
      }
    }

    container.addEventListener('dragover', handleDragOver)
    container.addEventListener('dragenter', handleDragEnter)
    container.addEventListener('dragleave', handleDragLeave)
    container.addEventListener('drop', handleDrop)

    return () => {
      container.removeEventListener('dragover', handleDragOver)
      container.removeEventListener('dragenter', handleDragEnter)
      container.removeEventListener('dragleave', handleDragLeave)
      container.removeEventListener('drop', handleDrop)
    }
  }, [containerRef, screenToCanvas, handleImageFile])

  /**
   * Handle file selection from input
   */
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      await handleImageFile(file, uploadPosition.x, uploadPosition.y)

      if (e.target) {
        e.target.value = ''
      }
    },
    [handleImageFile, uploadPosition]
  )

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
    isDraggingFile,
    uploadPosition,
    fileInputRef,
    handleFileSelect,
    handleImageFile,
    setNextUploadPosition: setUploadPosition,
    getAcceptedFileTypes: () => 'image/*',
  }
}
