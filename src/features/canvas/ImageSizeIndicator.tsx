import { useEffect, useRef, useState } from 'preact/hooks'
import './ImageSizeIndicator.css'

interface ImageSizeIndicatorProps {
  imageId: string | null
  images: Array<{
    id: string
    x: number
    y: number
    image: HTMLImageElement
  }>
  scale: number
  position: { x: number; y: number }
}

export function ImageSizeIndicator({ imageId, images, scale, position }: ImageSizeIndicatorProps) {
  const [indicatorPos, setIndicatorPos] = useState({ x: 0, y: 0 })
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  
  useEffect(() => {
    if (!imageId) {
      setImageSize({ width: 0, height: 0 })
      return
    }
    
    const selectedImage = images.find(img => img.id === imageId)
    if (selectedImage && selectedImage.image) {
      // Get natural dimensions
      const width = selectedImage.image.naturalWidth
      const height = selectedImage.image.naturalHeight
      setImageSize({ width, height })
      
      // Calculate indicator position (bottom-right of image with some padding)
      const x = (selectedImage.x * scale) + position.x + (width * scale) - 100
      const y = (selectedImage.y * scale) + position.y + (height * scale) + 10
      
      setIndicatorPos({ x, y })
    }
  }, [imageId, images, scale, position])
  
  if (!imageId || imageSize.width === 0) return null
  
  return (
    <div 
      class="image-size-indicator"
      style={{
        left: `${indicatorPos.x}px`,
        top: `${indicatorPos.y}px`
      }}
    >
      <span class="size-value">{imageSize.width} × {imageSize.height}</span>
      <span class="size-label">px</span>
    </div>
  )
}
