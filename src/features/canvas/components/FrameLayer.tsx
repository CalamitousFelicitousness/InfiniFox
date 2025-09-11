import type { KonvaEventObject } from 'konva/lib/Node'
import React, { useEffect, useState } from 'react'
import { Layer, Rect, Text, Circle, Image as KonvaImage } from 'react-konva'

import { useKonvaTokens } from '../../../hooks/useKonvaTokens'
import { CanvasTool } from '../hooks/useCanvasTools'

interface GenerationFrame {
  id: string
  x: number
  y: number
  width: number
  height: number
  isPlaceholder: boolean
  isGenerating: boolean
  progress: number
  previewImage?: string
  error?: string
  label?: string
  locked?: boolean
}

interface FrameLayerProps {
  // Frame data
  frames: GenerationFrame[]
  selectedFrameId: string | null
  contextMenuFrameId: string | null

  // Tool state
  currentTool: CanvasTool

  // Callbacks
  onFrameSelect: (frameId: string | null) => void
  onFrameDragEnd: (frameId: string, newX: number, newY: number) => void
  onFrameContextMenu: (e: KonvaEventObject<PointerEvent>, frameId: string) => void

  // Utilities
  isFrameDraggable: (frame: GenerationFrame) => boolean
  getFrameStrokeColor: (frame: GenerationFrame) => string
  getFrameFillColor: (frame: GenerationFrame) => string
}

/**
 * Custom hook to manage preview image loading
 */
function usePreviewImage(src: string | undefined) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    if (!src) {
      setImage(null)
      return
    }

    // Create new image for each src change
    const img = new window.Image()
    let cancelled = false

    img.onload = () => {
      if (!cancelled) {
        setImage(img)
      }
    }

    img.onerror = () => {
      if (!cancelled) {
        console.error('Failed to load preview image:', src)
        setImage(null)
      }
    }

    // Set src after attaching handlers
    img.src = src

    return () => {
      cancelled = true
      // Clear the image src to stop loading
      img.src = ''
      setImage(null)
    }
  }, [src])

  return image
}

/**
 * Layer component responsible for rendering generation frames
 * Handles both placeholder frames and active generation frames with progress
 */
export function FrameLayer({
  frames,
  _selectedFrameId,
  _contextMenuFrameId,
  currentTool,
  onFrameSelect,
  onFrameDragEnd,
  onFrameContextMenu,
  isFrameDraggable,
  getFrameStrokeColor,
  getFrameFillColor,
}: FrameLayerProps) {
  const tokens = useKonvaTokens()

  /**
   * Handle frame pointer down
   */
  const handleFramePointerDown = (frame: GenerationFrame) => {
    if (currentTool === CanvasTool.SELECT && frame.isPlaceholder) {
      onFrameSelect(frame.id)
    }
  }

  /**
   * Handle frame drag start
   */
  const handleFrameDragStart = (e: KonvaEventObject<DragEvent>, frame: GenerationFrame) => {
    e.cancelBubble = true
    onFrameSelect(frame.id)

    // Update cursor
    const container = document.querySelector('.canvas-container') as HTMLElement
    if (container) {
      container.style.cursor = 'move'
    }
  }

  /**
   * Handle frame drag end
   */
  const handleFrameDragEnd = (e: KonvaEventObject<DragEvent>, frame: GenerationFrame) => {
    e.cancelBubble = true
    const node = e.target
    onFrameDragEnd(frame.id, node.x(), node.y())

    // Reset cursor
    const container = document.querySelector('.canvas-container') as HTMLElement
    if (container) {
      container.style.cursor = ''
    }
  }

  /**
   * Handle frame context menu
   */
  const handleFrameContextMenu = (e: KonvaEventObject<PointerEvent>, frame: GenerationFrame) => {
    e.evt.preventDefault()
    e.cancelBubble = true
    onFrameContextMenu(e, frame.id)
  }

  /**
   * Get dash pattern for frame border
   */
  const getDashPattern = (frame: GenerationFrame) => {
    return frame.isPlaceholder ? [5, 5] : [10, 5]
  }

  /**
   * Get stroke width for frame border
   */
  const getStrokeWidth = (frame: GenerationFrame) => {
    return frame.isPlaceholder ? tokens.borders.widthThin : tokens.borders.widthMedium
  }

  /**
   * Render progress bar for generating frames
   */
  const renderProgressBar = (frame: GenerationFrame) => {
    if (!frame.isGenerating || frame.isPlaceholder) return null

    return (
      <>
        {/* Progress bar background */}
        <Rect
          x={frame.x}
          y={frame.y - 25}
          width={frame.width}
          height={20}
          fill={tokens.colors.backgroundPrimary}
          cornerRadius={tokens.borders.radiusSm}
          listening={false}
        />

        {/* Progress bar fill */}
        <Rect
          x={frame.x + 2}
          y={frame.y - 23}
          width={(frame.width - 4) * (frame.progress / 100)}
          height={16}
          fill={tokens.colors.interactivePrimary}
          cornerRadius={tokens.borders.radiusSm}
          listening={false}
        />

        {/* Progress text */}
        <Text
          x={frame.x}
          y={frame.y - 20}
          width={frame.width}
          height={20}
          text={`${Math.round(frame.progress)}%`}
          fontSize={tokens.typography.fontSizeXs}
          fontFamily={tokens.typography.fontFamilyMono}
          fill={tokens.colors.textPrimary}
          align="center"
          listening={false}
        />
      </>
    )
  }

  /**
   * Render size indicator for placeholder frames
   */
  const renderSizeIndicator = (frame: GenerationFrame) => {
    if (!frame.isPlaceholder) return null

    return (
      <>
        {/* Background */}
        <Rect
          x={frame.x + frame.width / 2 - 45}
          y={frame.y + frame.height / 2 - 10}
          width={90}
          height={20}
          fill={tokens.colors.surfacePrimary}
          stroke={tokens.colors.borderPrimary}
          strokeWidth={tokens.borders.widthThin}
          cornerRadius={tokens.borders.radiusBase}
          listening={false}
        />

        {/* Size text */}
        <Text
          x={frame.x + frame.width / 2 - 30}
          y={frame.y + frame.height / 2 - 6}
          text={`${frame.width} × ${frame.height}`}
          fontSize={tokens.typography.fontSizeXs}
          fontFamily={tokens.typography.fontFamilyMono}
          fontStyle={tokens.typography.fontWeightSemibold.toString()}
          fill={tokens.colors.textPrimary}
          listening={false}
        />

        {/* Unit text */}
        <Text
          x={frame.x + frame.width / 2 + 30}
          y={frame.y + frame.height / 2 - 5}
          text="px"
          fontSize={10}
          fontFamily={tokens.typography.fontFamilyBase}
          fill={tokens.colors.textTertiary}
          listening={false}
        />
      </>
    )
  }

  /**
   * Render frame label
   */
  const renderFrameLabel = (frame: GenerationFrame) => {
    if (!frame.isPlaceholder || !frame.label) return null

    return (
      <Text
        x={frame.x}
        y={frame.y - 20}
        text={frame.label}
        fontSize={tokens.typography.fontSizeXs}
        fontFamily={tokens.typography.fontFamilyBase}
        fill={tokens.colors.textTertiary}
        listening={false}
      />
    )
  }

  /**
   * Render lock indicator
   */
  const renderLockIndicator = (frame: GenerationFrame) => {
    if (!frame.locked) return null

    return (
      <Circle
        x={frame.x + frame.width - 10}
        y={frame.y + 10}
        radius={5}
        fill={tokens.colors.error}
        listening={false}
      />
    )
  }

  /**
   * Render preview image
   */
  const PreviewImage = ({ frame }: { frame: GenerationFrame }) => {
    const image = usePreviewImage(frame.previewImage)

    if (!image) return null

    return (
      <KonvaImage
        x={frame.x}
        y={frame.y}
        width={frame.width}
        height={frame.height}
        image={image}
        opacity={0.8}
        listening={false}
      />
    )
  }

  /**
   * Render error message
   */
  const renderError = (frame: GenerationFrame) => {
    if (!frame.error) return null

    return (
      <Text
        x={frame.x}
        y={frame.y + frame.height / 2 - 10}
        width={frame.width}
        text={frame.error}
        fontSize={tokens.typography.fontSizeSm}
        fontFamily={tokens.typography.fontFamilyBase}
        fill={tokens.colors.error}
        align="center"
        listening={false}
      />
    )
  }

  return (
    <Layer listening={currentTool === CanvasTool.SELECT}>
      {frames.map((frame) => (
        <React.Fragment key={frame.id}>
          {/* Frame border */}
          <Rect
            id={`frame-${frame.id}`}
            x={frame.x}
            y={frame.y}
            width={frame.width}
            height={frame.height}
            stroke={getFrameStrokeColor(frame)}
            strokeWidth={getStrokeWidth(frame)}
            fill={getFrameFillColor(frame)}
            dash={getDashPattern(frame)}
            draggable={isFrameDraggable(frame)}
            // Events
            onPointerDown={() => handleFramePointerDown(frame)}
            onDragStart={(e) => handleFrameDragStart(e, frame)}
            onDragEnd={(e) => handleFrameDragEnd(e, frame)}
            onContextMenu={(e) => handleFrameContextMenu(e, frame)}
            // Hover effects
            onPointerEnter={() => {
              if (frame.isPlaceholder && !frame.locked && currentTool === CanvasTool.SELECT) {
                const container = document.querySelector('.canvas-container') as HTMLElement
                if (container) {
                  container.style.cursor = 'move'
                }
              }
            }}
            onPointerLeave={() => {
              const container = document.querySelector('.canvas-container') as HTMLElement
              if (container) {
                container.style.cursor = ''
              }
            }}
            listening={true}
          />

          {/* Frame components */}
          {renderSizeIndicator(frame)}
          {renderFrameLabel(frame)}
          {renderLockIndicator(frame)}
          {renderProgressBar(frame)}
          <PreviewImage frame={frame} />
          {renderError(frame)}
        </React.Fragment>
      ))}
    </Layer>
  )
}
