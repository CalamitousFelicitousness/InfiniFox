import React from 'react'
import { Group, Line } from 'react-konva'

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
      guide.position === nextGuide.position &&
      guide.start === nextGuide.start &&
      guide.end === nextGuide.end &&
      guide.color === nextGuide.color &&
      guide.source === nextGuide.source
    )
  })
}

/**
 * Get dash pattern based on guide source
 */
function getDashPattern(source: string | undefined, scale: number): number[] | undefined {
  switch (source) {
    case 'artboard':
      return [10 / scale, 5 / scale] // Longer dashes for artboards
    case 'spacing':
      return [3 / scale, 3 / scale] // Dots for spacing guides
    default:
      return [5 / scale, 5 / scale] // Default for images/layers
  }
}

/**
 * Get opacity based on guide source
 */
function getOpacity(source: string | undefined): number {
  switch (source) {
    case 'artboard':
      return 0.9 // More prominent for artboards
    case 'spacing':
      return 0.7 // Slightly less prominent for spacing
    default:
      return 0.8 // Default for images/layers
  }
}

/**
 * Layer component for rendering snap guide lines
 */
function SnapGuideLayerComponent({ guides, scale }: SnapGuideLayerProps) {
  if (guides.length === 0) return null

  return (
    <Group listening={false}>
      {guides.map((guide, index) => (
        <Line
          key={`guide-${guide.type}-${guide.position}-${index}`}
          points={
            guide.type === 'vertical'
              ? [guide.position, guide.start, guide.position, guide.end]
              : [guide.start, guide.position, guide.end, guide.position]
          }
          stroke={guide.color || '#4CAF50'}
          strokeWidth={guide.source === 'artboard' ? 2.5 / scale : 2 / scale}
          opacity={getOpacity(guide.source)}
          dash={getDashPattern(guide.source, scale)}
          listening={false}
        />
      ))}
    </Group>
  )
}

// Memoize with custom comparison to only re-render when guides actually change
export const SnapGuideLayer = React.memo(SnapGuideLayerComponent, (prevProps, nextProps) => {
  return prevProps.scale === nextProps.scale && areGuidesEqual(prevProps.guides, nextProps.guides)
})
