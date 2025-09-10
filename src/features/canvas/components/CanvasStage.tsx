import Konva from 'konva'
import React, { forwardRef } from 'react'
import { Stage } from 'react-konva'

import { CanvasTool } from '../hooks/useCanvasTools'

interface CanvasStageProps {
  // Stage dimensions
  width: number
  height: number

  // Tool state
  currentTool: CanvasTool

  // Event handlers
  onWheel: (e: Konva.KonvaEventObject<WheelEvent>) => void
  onPointerDown: (e: Konva.KonvaEventObject<PointerEvent>) => void
  onPointerMove: (e: Konva.KonvaEventObject<PointerEvent>) => void
  onPointerUp: (e?: Konva.KonvaEventObject<PointerEvent>) => void
  onPointerCancel?: (e?: Konva.KonvaEventObject<PointerEvent>) => void
  onPointerEnter?: (e: Konva.KonvaEventObject<PointerEvent>) => void
  onPointerLeave?: (e: Konva.KonvaEventObject<PointerEvent>) => void
  onContextMenu: (e: Konva.KonvaEventObject<PointerEvent>) => void
  onDragStart?: (e: Konva.KonvaEventObject<DragEvent>) => void
  onDragMove?: (e: Konva.KonvaEventObject<DragEvent>) => void
  onDragEnd?: (e: Konva.KonvaEventObject<DragEvent>) => void

  // Children (layers)
  children: React.ReactNode

  // Additional props
  className?: string
  style?: React.CSSProperties
}

/**
 * Wrapper component for Konva Stage that provides common configuration
 * and simplifies the main Canvas component
 */
export const CanvasStage = forwardRef<Konva.Stage, CanvasStageProps>(
  (
    {
      width,
      height,
      currentTool,
      onWheel,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onPointerEnter,
      onPointerLeave,
      onContextMenu,
      onDragStart,
      onDragMove,
      onDragEnd,
      children,
      className,
      style,
    },
    ref
  ) => {
    /**
     * Determine if stage should be draggable based on current tool
     */
    const isDraggable = currentTool === CanvasTool.PAN

    /**
     * Get stage container style
     */
    const containerStyle: React.CSSProperties = {
      position: 'relative',
      overflow: 'hidden',
      ...style,
    }

    return (
      <div className={className} style={containerStyle}>
        <Stage
          ref={ref}
          width={width}
          height={height}
          draggable={isDraggable}
          // Wheel events
          onWheel={onWheel}
          // Pointer events
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel || onPointerUp}
          onPointerEnter={onPointerEnter}
          onPointerLeave={onPointerLeave}
          // Context menu
          onContextMenu={onContextMenu}
          // Drag events (for panning)
          onDragStart={onDragStart}
          onDragMove={onDragMove}
          onDragEnd={onDragEnd}
          // Performance optimizations
          perfectDrawEnabled={false}
          listening={true}
        >
          {children}
        </Stage>
      </div>
    )
  }
)

CanvasStage.displayName = 'CanvasStage'

/**
 * Hook to calculate stage dimensions based on container and sidebar
 */
export function useStageSize(sidebarWidth: number = 400) {
  const [stageSize, setStageSize] = React.useState({
    width: window.innerWidth - sidebarWidth,
    height: window.innerHeight,
  })

  React.useEffect(() => {
    const handleResize = () => {
      setStageSize({
        width: window.innerWidth - sidebarWidth,
        height: window.innerHeight,
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [sidebarWidth])

  return stageSize
}

/**
 * Default stage configuration
 */
export const DEFAULT_STAGE_CONFIG = {
  // Performance settings
  perfectDrawEnabled: false,
  listening: true,

  // Touch settings
  preventDefault: true,

  // Pixel ratio for high DPI displays
  pixelRatio: window.devicePixelRatio || 1,
}
