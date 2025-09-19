import Konva from 'konva'
import React, { useRef, useEffect, useCallback } from 'react'
import { Transformer } from 'react-konva'

// import type { LayerNode } from '../../../store/slices/layerSystemSlice'
import { useStore } from '../../../store/store'

interface LayerTransformerProps {
  selectedLayerIds: Set<string>
  scale: number
}

/**
 * Transformer component for layer operations
 * Handles resize, rotate, and transform for selected layers
 */
export const LayerTransformer: React.FC<LayerTransformerProps> = ({ selectedLayerIds }) => {
  const transformerRef = useRef<Konva.Transformer>(null)
  const { updateLayer, getLayer, layers } = useStore()

  // Check if layer is an artboard
  const isArtboard = useCallback(
    (layerId: string): boolean => {
      const layer = getLayer(layerId)
      return layer?.type === 'artboard'
    },
    [getLayer]
  )

  // Update transformer nodes when selection changes
  useEffect(() => {
    if (!transformerRef.current) return

    const transformer = transformerRef.current
    const stage = transformer.getStage()
    if (!stage) return

    // Find all selected nodes
    const nodes: Konva.Node[] = []
    selectedLayerIds.forEach((layerId) => {
      const node = stage.findOne(`#${layerId}`)
      if (node && !isArtboard(layerId)) {
        // Don't transform artboards
        nodes.push(node)
      }
    })

    // Attach nodes to transformer
    transformer.nodes(nodes)
    transformer.getLayer()?.batchDraw()
  }, [selectedLayerIds, layers, isArtboard])

  // Handle transform end
  const handleTransformEnd = useCallback(
    (e: Konva.KonvaEventObject<Event>) => {
      const node = e.target
      const layerId = node.id()

      if (!layerId) return

      // Get transform values
      const scaleX = node.scaleX()
      const scaleY = node.scaleY()
      const rotation = node.rotation()
      const x = node.x()
      const y = node.y()

      // Update layer state
      updateLayer(layerId, {
        x,
        y,
        rotation,
        scaleX,
        scaleY,
      })

      // Reset node scale to 1 and apply to width/height for images
      if (node.className === 'Image') {
        const layer = getLayer(layerId)
        if (layer?.imageProps) {
          const newWidth = layer.imageProps.width * scaleX
          const newHeight = layer.imageProps.height * scaleY

          updateLayer(layerId, {
            imageProps: {
              ...layer.imageProps,
              width: newWidth,
              height: newHeight,
            },
            scaleX: 1,
            scaleY: 1,
          })

          node.scaleX(1)
          node.scaleY(1)
          node.width(newWidth)
          node.height(newHeight)
        }
      }
    },
    [updateLayer, getLayer]
  )

  if (selectedLayerIds.size === 0) {
    return null
  }

  return (
    <Transformer
      ref={transformerRef}
      rotateEnabled={true}
      resizeEnabled={true}
      keepRatio={false}
      enabledAnchors={[
        'top-left',
        'top-center',
        'top-right',
        'middle-left',
        'middle-right',
        'bottom-left',
        'bottom-center',
        'bottom-right',
      ]}
      boundBoxFunc={(oldBox, newBox) => {
        // Limit minimum size
        if (Math.abs(newBox.width) < 10 || Math.abs(newBox.height) < 10) {
          return oldBox
        }
        return newBox
      }}
      onTransformEnd={handleTransformEnd}
      anchorStroke="rgba(100, 108, 255, 1)"
      anchorFill="white"
      anchorSize={8}
      borderStroke="rgba(100, 108, 255, 0.8)"
      borderStrokeWidth={2}
      borderDash={[]}
      anchorCornerRadius={2}
      padding={0}
      rotateAnchorOffset={25}
      anchorStyleFunc={(anchor) => {
        // Style rotation anchor differently
        if (anchor.hasName('rotater')) {
          anchor.cornerRadius(10)
        }
      }}
    />
  )
}

export default LayerTransformer
