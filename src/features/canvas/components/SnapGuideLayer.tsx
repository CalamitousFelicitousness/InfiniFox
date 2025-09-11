import React from 'react'
import { Layer, Line } from 'react-konva'

import type { SnapGuide } from '../../../services/canvas/SnappingManager'

interface SnapGuideLayerProps {
  guides: SnapGuide[]
  scale: number
}

/**
 * Compare guides for equality to prevent unnecessary re-renders
 */
function areGuidesEqual(prev: SnapGuide[], next: SnapGuide[]): boolean {
  if (prev.length !== next.length) return false
  
  return prev.every((guide, index) => {
    const nextGuide = next[index]
    return (
      guide.type === nextGuide.type &&
      guide.orientation === nextGuide.orientation &&
      guide.position === nextGuide.position &&
      guide.start === nextGuide.start &&
      guide.end === nextGuide.end &&
      guide.color === nextGuide.color
    )
  })
}

/**
 * Layer component for rendering snap guide lines
 */
function SnapGuideLayerComponent({ guides, scale }: SnapGuideLayerProps) {
  if (guides.length === 0) return null

  return (
    <Layer listening={false}>
      {guides.map((guide, index) => (
        <Line
          key={`guide-${guide.type}-${guide.position}-${index}`}
          points={
            guide.type === 'vertical'
              ? [guide.position, guide.start, guide.position, guide.end]
              : [guide.start, guide.position, guide.end, guide.position]
          }
          stroke={guide.color || '#4CAF50'}
          strokeWidth={2 / scale}
          opacity={0.8}
          dash={[5 / scale, 5 / scale]}
          listening={false}
        />
      ))}
    </Layer>
  )
}

// Memoize with custom comparison to only re-render when guides actually change
export const SnapGuideLayer = React.memo(SnapGuideLayerComponent, (prevProps, nextProps) => {
  return (
    prevProps.scale === nextProps.scale &&
    areGuidesEqual(prevProps.guides, nextProps.guides)
  )
})
