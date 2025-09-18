/**
 * LayerImage component with proper blob URL lifecycle management
 * Resolves image URLs from UnifiedImageStorageService on demand
 */

import type Konva from 'konva'
import React, { useEffect, useState, useRef } from 'react'
import { Image } from 'react-konva'

import { imageStorage } from '../../services/storage/UnifiedImageStorageService'
import type { LayerNode } from '../../store/slices/layerSystemSlice'

interface LayerImageProps {
  layer: LayerNode
  isSelected?: boolean
  onSelect?: () => void
  onTransform?: (transform: Konva.KonvaEventObject<DragEvent | Event>) => void
}

export const LayerImage: React.FC<LayerImageProps> = ({
  layer,
  isSelected = false,
  onSelect,
  onTransform,
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null)
  const imageIdRef = useRef<string | null>(null)
  const urlCleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    // Early exit if not image layer
    if (layer.type !== 'image' || !layer.imageProps) {
      return
    }

    const imageId = layer.imageProps.imageId
    if (!imageId) {
      console.warn(`Layer ${layer.id} missing imageId reference`)
      return
    }

    // Skip if same image
    if (imageIdRef.current === imageId && imageUrl) {
      return
    }

    // Cleanup previous URL
    if (urlCleanupRef.current) {
      urlCleanupRef.current()
      urlCleanupRef.current = null
    }

    // Load new image URL
    let cancelled = false
    imageIdRef.current = imageId

    imageStorage
      .getOrCreateObjectUrl(imageId)
      .then((url) => {
        if (cancelled || !url) return

        // Create image element for Konva
        const img = new window.Image()
        img.onload = () => {
          if (!cancelled) {
            setImageElement(img)
            setImageUrl(url)
          }
        }
        img.onerror = () => {
          console.error(`Failed to load image ${imageId}`)
          setImageElement(null)
          setImageUrl(null)
        }
        img.src = url

        // Setup cleanup
        urlCleanupRef.current = () => {
          imageStorage.releaseObjectUrl(imageId)
        }
      })
      .catch((error) => {
        console.error(`Failed to get URL for image ${imageId}:`, error)
      })

    // Cleanup on unmount or change
    return () => {
      cancelled = true
      if (urlCleanupRef.current) {
        urlCleanupRef.current()
        urlCleanupRef.current = null
      }
    }
  }, [layer.id, layer.type, layer.imageProps, imageUrl])

  // Don't render if not image or no element
  if (layer.type !== 'image' || !imageElement || !layer.imageProps) {
    return null
  }

  const { width, height } = layer.imageProps

  return (
    <Image
      id={layer.id}
      image={imageElement}
      x={layer.x || 0}
      y={layer.y || 0}
      width={width}
      height={height}
      scaleX={layer.scaleX || 1}
      scaleY={layer.scaleY || 1}
      rotation={layer.rotation || 0}
      opacity={layer.opacity || 1}
      visible={layer.visible !== false}
      listening={!layer.locked}
      draggable={!layer.locked && isSelected}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={onTransform}
      onTransformEnd={onTransform}
    />
  )
}
