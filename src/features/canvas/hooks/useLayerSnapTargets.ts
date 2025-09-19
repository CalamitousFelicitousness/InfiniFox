import { useEffect, useMemo } from 'react'

import { snappingManager, type BoundingBox } from '../../../services/canvas/SnappingManager'
import { useStore } from '../../../store/store'

/**
 * Hook to register layer and artboard targets with the snapping manager
 * @param activeDragId - The ID of the currently dragged item (to exclude from targets)
 */
export function useLayerSnapTargets(activeDragId: string | null) {
  const { getArtboards, getRootLayers, getLayerBounds } = useStore()

  // Collect all snap targets
  const snapTargets = useMemo(() => {
    // Get artboard targets
    const artboardTargets: BoundingBox[] = getArtboards().map((board) => ({
      id: board.id,
      x: board.x,
      y: board.y,
      width: board.artboardProps?.width ?? 800,
      height: board.artboardProps?.height ?? 600,
      kind: 'artboard' as const,
    }))

    // Get other layer targets (non-artboards)
    const layerTargets: BoundingBox[] = getRootLayers()
      .filter((layer) => layer.type !== 'artboard') // Exclude artboards (already handled above)
      .map((layer) => {
        const bounds = getLayerBounds(layer.id)
        if (!bounds) return null
        return {
          id: layer.id,
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          kind: layer.type === 'group' ? ('group' as const) : ('layer' as const),
        }
      })
      .filter((target): target is BoundingBox => target !== null)

    // Combine and filter out the active drag item
    const allTargets = [...artboardTargets, ...layerTargets].filter(
      (target) => target.id !== activeDragId
    )

    return allTargets
  }, [getArtboards, getRootLayers, getLayerBounds, activeDragId])

  // Register targets with the snapping manager
  useEffect(() => {
    snappingManager.setObjects(snapTargets)
  }, [snapTargets])

  // Clear current object when activeDragId changes to null
  useEffect(() => {
    if (activeDragId === null) {
      snappingManager.setCurrentObject(null)
    } else {
      snappingManager.setCurrentObject(activeDragId)
    }
  }, [activeDragId])

  return snapTargets
}
