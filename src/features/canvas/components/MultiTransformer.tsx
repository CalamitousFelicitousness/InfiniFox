import type Konva from 'konva'
import React, { useRef, useEffect } from 'react'
import { Transformer } from 'react-konva'

// import { useStore } from '../../../store/store'

interface MultiTransformerProps {
  selectedIds: string[]
  onTransformEnd?: () => void
}

export const MultiTransformer: React.FC<MultiTransformerProps> = ({
  selectedIds,
  onTransformEnd,
}) => {
  const transformerRef = useRef<Konva.Transformer>(null)
  const stageRef = useRef<Konva.Stage | null>(null)

  useEffect(() => {
    if (!transformerRef.current) return

    const transformer = transformerRef.current
    const stage = transformer.getStage()
    if (!stage) return

    stageRef.current = stage

    // Find nodes by their IDs
    const nodes: Konva.Node[] = []
    selectedIds.forEach((id) => {
      const node = stage.findOne(`#${id}`)
      if (node) {
        nodes.push(node)
      }
    })

    // Attach nodes to transformer
    transformer.nodes(nodes)

    // Force update
    transformer.getLayer()?.batchDraw()
  }, [selectedIds])

  if (selectedIds.length === 0) {
    return null
  }

  return (
    <Transformer
      ref={transformerRef}
      boundBoxFunc={(oldBox, newBox) => {
        // Limit resize
        if (newBox.width < 5 || newBox.height < 5) {
          return oldBox
        }
        return newBox
      }}
      anchorStroke="rgb(59, 130, 246)"
      anchorFill="white"
      anchorSize={8}
      borderStroke="rgb(59, 130, 246)"
      borderStrokeWidth={1}
      borderDash={[3, 3]}
      rotateAnchorOffset={20}
      enabledAnchors={
        selectedIds.length === 1
          ? [
              'top-left',
              'top-right',
              'bottom-left',
              'bottom-right',
              'middle-left',
              'middle-right',
              'top-center',
              'bottom-center',
            ]
          : ['top-left', 'top-right', 'bottom-left', 'bottom-right'] // Simplified anchors for multiple selection
      }
      onTransformEnd={onTransformEnd}
      keepRatio={false}
      ignoreStroke={true}
    />
  )
}
