/**
 * SnappingManager - Handles grid and object-to-object snapping for canvas elements
 */

export interface SnapConfig {
  gridEnabled: boolean
  gridSize: number
  objectSnapEnabled: boolean
  snapThreshold: number
  showSnapGuides: boolean
}

export interface SnapPoint {
  x: number
  y: number
}

export interface SnapGuide {
  type: 'vertical' | 'horizontal'
  position: number
  start: number
  end: number
  color?: string
}

export interface SnapResult {
  x: number
  y: number
  snapped: boolean
  guides: SnapGuide[]
}

export interface BoundingBox {
  id: string
  x: number
  y: number
  width: number
  height: number
  rotation?: number
}

export class SnappingManager {
  private config: SnapConfig = {
    gridEnabled: false,
    gridSize: 50,
    objectSnapEnabled: false,
    snapThreshold: 20,
    showSnapGuides: true,
  }

  private objects: BoundingBox[] = []
  private currentObjectId: string | null = null

  /**
   * Update snap configuration
   */
  public updateConfig(config: Partial<SnapConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get current configuration
   */
  public getConfig(): SnapConfig {
    return { ...this.config }
  }

  /**
   * Set the objects available for snapping
   */
  public setObjects(objects: BoundingBox[]): void {
    this.objects = objects
  }

  /**
   * Set the current object being dragged (to exclude from snap targets)
   */
  public setCurrentObject(id: string | null): void {
    this.currentObjectId = id
  }

  /**
   * Calculate snapped position for a point
   */
  public snap(x: number, y: number, width = 0, height = 0): SnapResult {
    let snappedX = x
    let snappedY = y
    let snapped = false
    const guides: SnapGuide[] = []

    // Grid snapping
    if (this.config.gridEnabled) {
      const gridSnap = this.snapToGrid(x, y, width, height)
      snappedX = gridSnap.x
      snappedY = gridSnap.y
      snapped = gridSnap.snapped
    }

    // Object snapping (overrides grid if both are enabled)
    if (this.config.objectSnapEnabled && this.objects.length > 0) {
      const objectSnap = this.snapToObjects(
        snapped ? snappedX : x,
        snapped ? snappedY : y,
        width,
        height
      )
      
      if (objectSnap.snapped) {
        snappedX = objectSnap.x
        snappedY = objectSnap.y
        snapped = true
        guides.push(...objectSnap.guides)
      }
    }

    return { x: snappedX, y: snappedY, snapped, guides }
  }

  /**
   * Snap to grid
   */
  private snapToGrid(x: number, y: number, width: number, height: number): SnapResult {
    const { gridSize } = this.config
    
    // Snap center point
    const centerX = x + width / 2
    const centerY = y + height / 2
    
    const snappedCenterX = Math.round(centerX / gridSize) * gridSize
    const snappedCenterY = Math.round(centerY / gridSize) * gridSize
    
    // Calculate position from snapped center
    const snappedX = snappedCenterX - width / 2
    const snappedY = snappedCenterY - height / 2
    
    const snapped = Math.abs(snappedX - x) < gridSize / 2 || Math.abs(snappedY - y) < gridSize / 2
    
    return { x: snappedX, y: snappedY, snapped, guides: [] }
  }

  /**
   * Snap to other objects
   */
  private snapToObjects(x: number, y: number, width: number, height: number): SnapResult {
    const { snapThreshold } = this.config
    const guides: SnapGuide[] = []
    let snappedX = x
    let snappedY = y
    let snapped = false

    // Get snap points for current object
    const currentPoints = this.getSnapPoints(x, y, width, height)
    const targetObjects = this.objects.filter(obj => obj.id !== this.currentObjectId)

    // Track best snap distances
    let bestXDistance = snapThreshold
    let bestYDistance = snapThreshold
    let bestXSnap: { position: number; guide?: SnapGuide } | null = null
    let bestYSnap: { position: number; guide?: SnapGuide } | null = null

    for (const target of targetObjects) {
      const targetPoints = this.getSnapPoints(target.x, target.y, target.width, target.height)

      // Check X-axis snapping (vertical alignment)
      for (const currentPoint of currentPoints) {
        for (const targetPoint of targetPoints) {
          const xDistance = Math.abs(currentPoint.x - targetPoint.x)
          
          if (xDistance < bestXDistance) {
            bestXDistance = xDistance
            const xOffset = targetPoint.x - currentPoint.x
            bestXSnap = {
              position: x + xOffset,
              guide: this.config.showSnapGuides ? {
                type: 'vertical',
                position: targetPoint.x,
                start: Math.min(y, target.y),
                end: Math.max(y + height, target.y + target.height),
                color: '#4CAF50'
              } : undefined
            }
          }
        }
      }

      // Check Y-axis snapping (horizontal alignment)
      for (const currentPoint of currentPoints) {
        for (const targetPoint of targetPoints) {
          const yDistance = Math.abs(currentPoint.y - targetPoint.y)
          
          if (yDistance < bestYDistance) {
            bestYDistance = yDistance
            const yOffset = targetPoint.y - currentPoint.y
            bestYSnap = {
              position: y + yOffset,
              guide: this.config.showSnapGuides ? {
                type: 'horizontal',
                position: targetPoint.y,
                start: Math.min(x, target.x),
                end: Math.max(x + width, target.x + target.width),
                color: '#4CAF50'
              } : undefined
            }
          }
        }
      }

      // Check spacing snaps (equal spacing between objects)
      this.checkSpacingSnaps(
        x, y, width, height,
        target,
        targetObjects,
        bestXDistance,
        bestYDistance,
        (xSnap) => { if (xSnap.distance < bestXDistance) { bestXDistance = xSnap.distance; bestXSnap = xSnap } },
        (ySnap) => { if (ySnap.distance < bestYDistance) { bestYDistance = ySnap.distance; bestYSnap = ySnap } }
      )
    }

    // Apply snaps
    if (bestXSnap) {
      snappedX = bestXSnap.position
      if (bestXSnap.guide) guides.push(bestXSnap.guide)
      snapped = true
    }

    if (bestYSnap) {
      snappedY = bestYSnap.position
      if (bestYSnap.guide) guides.push(bestYSnap.guide)
      snapped = true
    }

    return { x: snappedX, y: snappedY, snapped, guides }
  }

  /**
   * Get snap points for an object (corners, edges, center)
   */
  private getSnapPoints(x: number, y: number, width: number, height: number): SnapPoint[] {
    const centerX = x + width / 2
    const centerY = y + height / 2
    const right = x + width
    const bottom = y + height

    return [
      // Corners
      { x, y },
      { x: right, y },
      { x, y: bottom },
      { x: right, y: bottom },
      // Edge midpoints
      { x: centerX, y },
      { x: centerX, y: bottom },
      { x, y: centerY },
      { x: right, y: centerY },
      // Center
      { x: centerX, y: centerY }
    ]
  }

  /**
   * Check for equal spacing snaps
   */
  private checkSpacingSnaps(
    x: number, y: number, width: number, height: number,
    target: BoundingBox,
    allTargets: BoundingBox[],
    bestXDistance: number,
    bestYDistance: number,
    onXSnap: (snap: { position: number; distance: number; guide?: SnapGuide }) => void,
    onYSnap: (snap: { position: number; distance: number; guide?: SnapGuide }) => void
  ): void {
    // Find objects that could form a spacing pattern
    for (const other of allTargets) {
      if (other.id === target.id) continue

      // Check horizontal spacing
      const targetSpacing = target.x - other.x
      if (Math.abs(targetSpacing) > 10) { // Minimum spacing threshold
        const suggestedX = target.x + targetSpacing
        const distance = Math.abs(suggestedX - x)
        
        if (distance < bestXDistance) {
          onXSnap({
            position: suggestedX,
            distance,
            guide: this.config.showSnapGuides ? {
              type: 'vertical',
              position: suggestedX + width / 2,
              start: Math.min(y, target.y, other.y),
              end: Math.max(y + height, target.y + target.height, other.y + other.height),
              color: '#FF9800'
            } : undefined
          })
        }
      }

      // Check vertical spacing
      const verticalSpacing = target.y - other.y
      if (Math.abs(verticalSpacing) > 10) {
        const suggestedY = target.y + verticalSpacing
        const distance = Math.abs(suggestedY - y)
        
        if (distance < bestYDistance) {
          onYSnap({
            position: suggestedY,
            distance,
            guide: this.config.showSnapGuides ? {
              type: 'horizontal',
              position: suggestedY + height / 2,
              start: Math.min(x, target.x, other.x),
              end: Math.max(x + width, target.x + target.width, other.x + other.width),
              color: '#FF9800'
            } : undefined
          })
        }
      }
    }
  }

  /**
   * Get visible grid lines for rendering
   */
  public getGridLines(
    viewportX: number,
    viewportY: number,
    viewportWidth: number,
    viewportHeight: number,
    scale: number
  ): { vertical: number[]; horizontal: number[] } {
    if (!this.config.gridEnabled) {
      return { vertical: [], horizontal: [] }
    }

    const { gridSize } = this.config
    const scaledGridSize = gridSize * scale

    // Calculate visible grid range
    const startX = Math.floor(viewportX / gridSize) * gridSize
    const endX = Math.ceil((viewportX + viewportWidth) / gridSize) * gridSize
    const startY = Math.floor(viewportY / gridSize) * gridSize
    const endY = Math.ceil((viewportY + viewportHeight) / gridSize) * gridSize

    const vertical: number[] = []
    const horizontal: number[] = []

    // Only show grid lines if they're not too dense
    if (scaledGridSize > 10) {
      for (let x = startX; x <= endX; x += gridSize) {
        vertical.push(x)
      }
      for (let y = startY; y <= endY; y += gridSize) {
        horizontal.push(y)
      }
    }

    return { vertical, horizontal }
  }
}

// Singleton instance
export const snappingManager = new SnappingManager()
