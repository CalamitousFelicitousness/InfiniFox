import React from 'react'
import { Layer, Rect } from 'react-konva'

interface SelectionBoxProps {
  startX: number
  startY: number
  endX: number
  endY: number
  visible: boolean
  scale: number
}

export const SelectionBox: React.FC<SelectionBoxProps> = ({
  startX,
  startY,
  endX,
  endY,
  visible,
  scale,
}) => {
  if (!visible) return null

  const x = Math.min(startX, endX)
  const y = Math.min(startY, endY)
  const width = Math.abs(endX - startX)
  const height = Math.abs(endY - startY)

  return (
    <Layer>
      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="rgba(59, 130, 246, 0.1)"
        stroke="rgb(59, 130, 246)"
        strokeWidth={1 / scale}
        dash={[5 / scale, 5 / scale]}
        listening={false}
        perfectDrawEnabled={false}
        shadowForStrokeEnabled={false}
      />
    </Layer>
  )
}
