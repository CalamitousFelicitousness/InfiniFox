import React from 'react'
import { Layer, Line } from 'react-konva'

import { snappingManager } from '../../../services/canvas/SnappingManager'

interface GridLayerProps {
  viewportX: number
  viewportY: number
  viewportWidth: number
  viewportHeight: number
  scale: number
  enabled: boolean
  opacity?: number
}

/**
 * Layer component for rendering grid lines
 */
function GridLayerComponent({
  viewportX,
  viewportY,
  viewportWidth,
  viewportHeight,
  scale,
  enabled,
  opacity = 0.15,
}: GridLayerProps) {
  if (!enabled) return null

  const gridLines = snappingManager.getGridLines(
    viewportX,
    viewportY,
    viewportWidth,
    viewportHeight,
    scale
  )

  return (
    <Layer listening={false}>
      {/* Vertical grid lines */}
      {gridLines.vertical.map((x) => (
        <Line
          key={`v-${x}`}
          points={[x, viewportY, x, viewportY + viewportHeight]}
          stroke="var(--color-border-subtle)"
          strokeWidth={1 / scale}
          opacity={opacity}
          listening={false}
        />
      ))}

      {/* Horizontal grid lines */}
      {gridLines.horizontal.map((y) => (
        <Line
          key={`h-${y}`}
          points={[viewportX, y, viewportX + viewportWidth, y]}
          stroke="var(--color-border-subtle)"
          strokeWidth={1 / scale}
          opacity={opacity}
          listening={false}
        />
      ))}
    </Layer>
  )
}

// Memoize to prevent re-renders when snap guides change
export const GridLayer = React.memo(GridLayerComponent)
