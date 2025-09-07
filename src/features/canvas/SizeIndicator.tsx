import { useEffect, useState } from 'preact/hooks'
import './SizeIndicator.css'

interface CanvasElement {
  id: string
  x: number
  y: number
  width?: number
  height?: number
  type: 'image' | 'frame'
  image?: HTMLImageElement
}

interface SizeIndicatorProps {
  selectedId: string | null
  elements: CanvasElement[]
  scale: number
  position: { x: number; y: number }
}

export function SizeIndicator({ selectedId, elements, scale, position }: SizeIndicatorProps) {
  const [indicatorPos, setIndicatorPos] = useState({ x: 0, y: 0 })
  const [elementSize, setElementSize] = useState({ width: 0, height: 0 })
  const [elementType, setElementType] = useState<'image' | 'frame'>('image')

  useEffect(() => {
    if (!selectedId) {
      setElementSize({ width: 0, height: 0 })
      return
    }

    const selectedElement = elements.find((el) => el.id === selectedId)
    if (!selectedElement) return

    setElementType(selectedElement.type)

    let width = 0
    let height = 0

    if (selectedElement.type === 'image' && selectedElement.image) {
      width = selectedElement.image.naturalWidth
      height = selectedElement.image.naturalHeight
    } else if (selectedElement.type === 'frame') {
      width = selectedElement.width || 0
      height = selectedElement.height || 0
    }

    setElementSize({ width, height })

    // Position indicator at bottom-right corner with padding
    const x = selectedElement.x * scale + position.x + width * scale - 100
    const y = selectedElement.y * scale + position.y + height * scale + 10

    setIndicatorPos({ x, y })
  }, [selectedId, elements, scale, position])

  if (!selectedId || elementSize.width === 0) return null

  return (
    <div
      class={`size-indicator ${elementType === 'frame' ? 'size-indicator--frame' : ''}`}
      style={{
        left: `${indicatorPos.x}px`,
        top: `${indicatorPos.y}px`,
      }}
    >
      <span class="size-value">
        {elementSize.width} × {elementSize.height}
      </span>
      <span class="size-label">px</span>
    </div>
  )
}
