import React from 'react'
import { Rect, Group, Text } from 'react-konva'

interface ArtboardLoadingOverlayProps {
  x: number
  y: number
  width: number
  height: number
  operation?: string
}

export const ArtboardLoadingOverlay: React.FC<ArtboardLoadingOverlayProps> = ({
  x,
  y,
  width,
  height,
  operation = 'Processing...',
}) => {
  // Create spinning animation using timestamp
  const [rotation, setRotation] = React.useState(0)

  React.useEffect(() => {
    const interval = setInterval(() => {
      setRotation((prev) => (prev + 10) % 360)
    }, 50)

    return () => clearInterval(interval)
  }, [])

  return (
    <Group x={x} y={y}>
      {/* Semi-transparent overlay */}
      <Rect width={width} height={height} fill="rgba(0, 0, 0, 0.5)" listening={false} />

      {/* Loading indicator group */}
      <Group x={width / 2} y={height / 2}>
        {/* Spinning circle segments */}
        {[0, 1, 2, 3].map((i) => (
          <Rect
            key={i}
            x={-2}
            y={-20}
            width={4}
            height={10}
            fill="#fff"
            opacity={1 - i * 0.25}
            rotation={rotation + i * 90}
            offsetX={2}
            offsetY={-20}
            listening={false}
          />
        ))}

        {/* Operation text */}
        <Text
          text={operation}
          y={30}
          fontSize={14}
          fill="#fff"
          align="center"
          offsetX={50}
          listening={false}
        />
      </Group>
    </Group>
  )
}
