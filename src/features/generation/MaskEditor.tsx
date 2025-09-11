import Konva from 'konva'
import { Brush, Eraser } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { Stage, Layer, Image as KonvaImage, Line, Circle } from 'react-konva'

import { Icon } from '../../components/common/Icon'
import { getPressureAdjustedSize, preventDefaultTouch } from '../../utils/pointerEvents'

import './MaskEditor.css'

interface MaskLine {
  tool: 'brush' | 'eraser'
  points: number[]
  brushSize: number
}

interface MaskEditorProps {
  baseImage: string
  onMaskUpdate: (maskDataUrl: string) => void
  disabled?: boolean
}

export function MaskEditor({ baseImage, onMaskUpdate, disabled = false }: MaskEditorProps) {
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush')
  const [brushSize, setBrushSize] = useState(20)
  const [isDrawing, setIsDrawing] = useState(false)
  const [lines, setLines] = useState<MaskLine[]>([])
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [dimensions, setDimensions] = useState({ width: 512, height: 512 })
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 })
  const [showCursor, setShowCursor] = useState(false)
  const [currentPressure, setCurrentPressure] = useState(0.5)
  const [pointerType, setPointerType] = useState<'mouse' | 'pen' | 'touch'>('mouse')

  const stageRef = useRef<Konva.Stage>(null)
  const maskLayerRef = useRef<Konva.Layer>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const img = new window.Image()
    img.src = baseImage
    img.onload = () => {
      setImage(img)
      const maxSize = 512
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1)
      setDimensions({
        width: img.width * scale,
        height: img.height * scale,
      })
    }
  }, [baseImage])

  useEffect(() => {
    const container = containerRef.current
    if (container) {
      preventDefaultTouch(container)
    }
  }, [])

  const handlePointerDown = (e: Konva.KonvaEventObject<PointerEvent | MouseEvent | TouchEvent>) => {
    if (disabled) return

    // Get pointer info if available
    const evt = e.evt as PointerEvent
    if ('pointerType' in evt) {
      setPointerType(evt.pointerType as 'mouse' | 'pen' | 'touch')
      setCurrentPressure(evt.pressure || 0.5)
    }

    setIsDrawing(true)
    const pos = e.target.getStage()?.getPointerPosition()
    if (pos) {
      const adjustedSize =
        pointerType === 'pen' ? getPressureAdjustedSize(brushSize, currentPressure) : brushSize

      setLines([...lines, { tool, points: [pos.x, pos.y], brushSize: adjustedSize }])
    }
  }

  const handlePointerMove = (e: Konva.KonvaEventObject<PointerEvent | MouseEvent | TouchEvent>) => {
    const stage = e.target.getStage()
    const pos = stage?.getPointerPosition()
    if (pos) {
      setCursorPos(pos)
    }

    // Update pressure if using pen
    const evt = e.evt as PointerEvent
    if ('pressure' in evt && evt.pointerType === 'pen') {
      setCurrentPressure(evt.pressure || 0.5)
    }

    if (!isDrawing || disabled) return

    const point = stage?.getPointerPosition()
    if (!point) return

    const lastLine = lines[lines.length - 1]
    if (lastLine) {
      // Adjust brush size based on pressure for pen
      if (pointerType === 'pen') {
        lastLine.brushSize = getPressureAdjustedSize(brushSize, currentPressure)
      }
      lastLine.points = lastLine.points.concat([point.x, point.y])
      lines.splice(lines.length - 1, 1, lastLine)
      setLines(lines.concat())
    }
  }

  const handlePointerUp = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    exportMask()
  }

  const handlePointerEnter = () => {
    setShowCursor(true)
  }

  const handlePointerLeave = () => {
    setShowCursor(false)
    if (isDrawing) {
      setIsDrawing(false)
      exportMask()
    }
  }

  const exportMask = () => {
    if (!maskLayerRef.current) return

    // Create a temporary stage for the mask
    const tempStage = new Konva.Stage({
      container: document.createElement('div'),
      width: dimensions.width,
      height: dimensions.height,
    })

    const tempLayer = new Konva.Layer()
    tempStage.add(tempLayer)

    // Add white background
    const bg = new Konva.Rect({
      x: 0,
      y: 0,
      width: dimensions.width,
      height: dimensions.height,
      fill: 'black',
    })
    tempLayer.add(bg)

    // Draw all mask lines
    lines.forEach((line) => {
      const konvaLine = new Konva.Line({
        points: line.points,
        stroke: line.tool === 'brush' ? 'white' : 'black',
        strokeWidth: line.brushSize,
        tension: 0.5,
        lineCap: 'round',
        lineJoin: 'round',
        globalCompositeOperation: line.tool === 'brush' ? 'source-over' : 'destination-out',
      })
      tempLayer.add(konvaLine)
    })

    tempLayer.draw()
    const dataURL = tempStage.toDataURL()
    onMaskUpdate(dataURL)
    tempStage.destroy()
  }

  const clearMask = () => {
    setLines([])
    onMaskUpdate('')
  }

  const downloadMask = () => {
    exportMask()
    if (!maskLayerRef.current) return

    const dataURL = stageRef.current?.toDataURL()
    if (dataURL) {
      const link = document.createElement('a')
      link.download = 'mask.png'
      link.href = dataURL
      link.click()
    }
  }

  // Get cursor size - adjust for pressure if using pen
  const getCursorRadius = () => {
    if (pointerType === 'pen') {
      return getPressureAdjustedSize(brushSize, currentPressure) / 2
    }
    return brushSize / 2
  }

  return (
    <div className="mask-editor">
      <div className="mask-tools">
        <div className="tool-buttons">
          <button
            type="button"
            className={`btn btn-secondary ${tool === 'brush' ? 'active' : ''}`}
            onClick={() => setTool('brush')}
            disabled={disabled}
          >
            <Icon icon={Brush} size="base" /> Brush
          </button>
          <button
            type="button"
            className={`btn btn-secondary ${tool === 'eraser' ? 'active' : ''}`}
            onClick={() => setTool('eraser')}
            disabled={disabled}
          >
            <Icon icon={Eraser} size="base" /> Eraser
          </button>
        </div>

        <div className="brush-size-control">
          <label>
            Size: {brushSize}px
            {pointerType === 'pen' && (
              <span> (Pressure: {Math.round(currentPressure * 100)}%)</span>
            )}
          </label>
          <input
            type="range"
            min="1"
            max="100"
            value={brushSize}
            onInput={(e) => setBrushSize(parseInt(e.currentTarget.value))}
            disabled={disabled}
          />
        </div>

        {pointerType !== 'mouse' && (
          <div className="input-type-indicator">Using: {pointerType}</div>
        )}

        <div className="mask-actions">
          <button type="button" className="btn btn-ghost" onClick={clearMask} disabled={disabled}>
            Clear
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={downloadMask}
            disabled={disabled}
          >
            Download
          </button>
        </div>
      </div>

      <div className="mask-canvas" ref={containerRef}>
        <Stage
          ref={stageRef}
          width={dimensions.width}
          height={dimensions.height}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp} // Handle pointer cancel events
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          style={{ cursor: disabled ? 'not-allowed' : 'none' }}
        >
          <Layer>
            {image && (
              <KonvaImage image={image} width={dimensions.width} height={dimensions.height} />
            )}
          </Layer>
          <Layer ref={maskLayerRef} opacity={0.5}>
            {lines.map((line, i) => (
              <Line
                key={i}
                points={line.points}
                stroke={line.tool === 'brush' ? 'rgba(255, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.5)'}
                strokeWidth={line.brushSize}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
                globalCompositeOperation={line.tool === 'brush' ? 'source-over' : 'destination-out'}
              />
            ))}
          </Layer>
          <Layer>
            {showCursor && !disabled && (
              <Circle
                x={cursorPos.x}
                y={cursorPos.y}
                radius={getCursorRadius()}
                stroke={tool === 'brush' ? 'red' : 'blue'}
                strokeWidth={2}
                fill="transparent"
                listening={false}
              />
            )}
          </Layer>
        </Stage>
      </div>

      <div className="mask-hint">
        Red areas will be regenerated. Use brush to add, eraser to remove.
      </div>
    </div>
  )
}
