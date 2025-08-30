import { useEffect, useState, useRef } from 'preact/hooks'
import Konva from 'konva'
import { Stage, Layer, Image as KonvaImage, Transformer } from 'react-konva'

import { useStore } from '../../store/store'

import { CanvasContextMenu } from './CanvasContextMenu'
import './Canvas.css'

interface KonvaImageData {
  id: string
  src: string
  x: number
  y: number
  image: HTMLImageElement
}

export function Canvas() {
  const { images, removeImage, duplicateImage, setImageAsInput } = useStore()
  const [konvaImages, setKonvaImages] = useState<KonvaImageData[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; imageId: string | null }>({
    visible: false,
    x: 0,
    y: 0,
    imageId: null,
  })
  const stageRef = useRef<Konva.Stage>(null)
  const transformerRef = useRef<Konva.Transformer>(null)

  useEffect(() => {
    const imagePromises = images.map((imgData) => {
      return new Promise((resolve) => {
        const img = new window.Image()
        img.src = imgData.src
        img.onload = () => resolve({ ...imgData, image: img })
      })
    })

    Promise.all(imagePromises).then(setKonvaImages)
  }, [images])

  useEffect(() => {
    // Update transformer when selection changes
    if (transformerRef.current && stageRef.current) {
      const stage = stageRef.current
      const transformer = transformerRef.current
      
      if (selectedId) {
        const selectedNode = stage.findOne(`#${selectedId}`)
        if (selectedNode) {
          transformer.nodes([selectedNode])
        }
      } else {
        transformer.nodes([])
      }
      transformer.getLayer()?.batchDraw()
    }
  }, [selectedId])

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const stage = stageRef.current
    if (!stage) return

    const oldScale = scale
    const pointer = stage.getPointerPosition()
    if (!pointer) return

    const mousePointTo = {
      x: (pointer.x - position.x) / oldScale,
      y: (pointer.y - position.y) / oldScale,
    }

    const direction = e.evt.deltaY > 0 ? -1 : 1
    const newScale = direction > 0 ? oldScale * 1.1 : oldScale / 1.1
    const clampedScale = Math.max(0.1, Math.min(5, newScale))

    setScale(clampedScale)
    setPosition({
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    })
  }

  const handleContextMenu = (e: Konva.KonvaEventObject<PointerEvent>, imageId: string) => {
    e.evt.preventDefault()
    const stage = stageRef.current
    if (!stage) return

    const containerRect = stage.container().getBoundingClientRect()
    setContextMenu({
      visible: true,
      x: containerRect.left + stage.getPointerPosition()!.x,
      y: containerRect.top + stage.getPointerPosition()!.y,
      imageId,
    })
  }

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // Deselect if clicking on empty area
    const clickedOnEmpty = e.target === e.target.getStage()
    if (clickedOnEmpty) {
      setSelectedId(null)
    }
    // Hide context menu
    setContextMenu({ ...contextMenu, visible: false })
  }

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>, imageId: string) => {
    const node = e.target
    useStore.getState().updateImagePosition(imageId, node.x(), node.y())
  }

  const handleDelete = () => {
    if (contextMenu.imageId) {
      removeImage(contextMenu.imageId)
      setContextMenu({ ...contextMenu, visible: false })
      setSelectedId(null)
    }
  }

  const handleDuplicate = () => {
    if (contextMenu.imageId) {
      duplicateImage(contextMenu.imageId)
      setContextMenu({ ...contextMenu, visible: false })
    }
  }

  const handleSendToImg2Img = () => {
    if (contextMenu.imageId) {
      const image = konvaImages.find((img) => img.id === contextMenu.imageId)
      if (image) {
        setImageAsInput(image.src)
        setContextMenu({ ...contextMenu, visible: false })
      }
    }
  }

  const handleDownload = () => {
    if (contextMenu.imageId) {
      const image = konvaImages.find((img) => img.id === contextMenu.imageId)
      if (image) {
        const link = document.createElement('a')
        link.href = image.src
        link.download = `generated-${contextMenu.imageId}.png`
        link.click()
        setContextMenu({ ...contextMenu, visible: false })
      }
    }
  }

  return (
    <div class="canvas-container">
      <div class="canvas-controls">
        <button onClick={() => setScale(scale * 1.2)}>Zoom In</button>
        <button onClick={() => setScale(scale / 1.2)}>Zoom Out</button>
        <button onClick={() => { setScale(1); setPosition({ x: 0, y: 0 }) }}>Reset</button>
        <span class="zoom-level">{Math.round(scale * 100)}%</span>
      </div>

      <Stage
        ref={stageRef}
        width={window.innerWidth - 350}
        height={window.innerHeight}
        draggable
        onWheel={handleWheel}
        onClick={handleStageClick}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
      >
        <Layer>
          {konvaImages.map((img) => (
            <KonvaImage
              key={img.id}
              id={img.id}
              image={img.image}
              x={img.x}
              y={img.y}
              draggable
              onClick={() => setSelectedId(img.id)}
              onTap={() => setSelectedId(img.id)}
              onContextMenu={(e) => handleContextMenu(e, img.id)}
              onDragEnd={(e) => handleDragEnd(e, img.id)}
            />
          ))}
          <Transformer ref={transformerRef} />
        </Layer>
      </Stage>

      <CanvasContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        onSendToImg2Img={handleSendToImg2Img}
        onDownload={handleDownload}
        onClose={() => setContextMenu({ ...contextMenu, visible: false })}
      />
    </div>
  )
}
