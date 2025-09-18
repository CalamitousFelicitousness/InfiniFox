/**
 * Batch operations service for efficient layer updates
 * Groups multiple layer operations to reduce render overhead
 */

import type { LayerNode } from '../../store/slices/layerSystemSlice'
import type { LayerSystemSlice } from '../../store/slices/layerSystemSlice'

export interface LayerUpdate {
  id: string
  changes: Partial<LayerNode>
}

export interface BatchOperation {
  type: 'update' | 'move' | 'delete' | 'visibility'
  updates?: LayerUpdate[]
  layerIds?: string[]
  targetState?: { parentId?: string; index?: number }
}

class LayerBatchOperations {
  private pendingOperations: BatchOperation[] = []
  private batchTimer: NodeJS.Timeout | null = null
  private batchDelay = 16 // ~60fps
  private store: LayerSystemSlice | null = null

  /**
   * Initialize with store reference
   */
  init(store: LayerSystemSlice): void {
    this.store = store
  }

  /**
   * Batch update multiple layers
   */
  batchUpdate(updates: LayerUpdate[]): void {
    this.addOperation({
      type: 'update',
      updates,
    })
  }

  /**
   * Batch visibility changes
   */
  batchSetVisibility(layerIds: string[], visible: boolean): void {
    const updates = layerIds.map((id) => ({
      id,
      changes: { visible },
    }))

    this.addOperation({
      type: 'visibility',
      updates,
    })
  }

  /**
   * Batch lock changes
   */
  batchSetLock(layerIds: string[], locked: boolean): void {
    const updates = layerIds.map((id) => ({
      id,
      changes: { locked },
    }))

    this.addOperation({
      type: 'update',
      updates,
    })
  }

  /**
   * Batch opacity changes
   */
  batchSetOpacity(layerIds: string[], opacity: number): void {
    const updates = layerIds.map((id) => ({
      id,
      changes: { opacity },
    }))

    this.addOperation({
      type: 'update',
      updates,
    })
  }

  /**
   * Batch blend mode changes
   */
  batchSetBlendMode(layerIds: string[], blendMode: string): void {
    const updates = layerIds.map((id) => ({
      id,
      changes: { blendMode: blendMode as LayerNode['blendMode'] },
    }))

    this.addOperation({
      type: 'update',
      updates,
    })
  }

  /**
   * Batch delete layers
   */
  batchDelete(layerIds: string[]): void {
    this.addOperation({
      type: 'delete',
      layerIds,
    })
  }

  /**
   * Batch move layers
   */
  batchMove(moves: Array<{ layerId: string; parentId?: string; index?: number }>): void {
    moves.forEach((move) => {
      this.addOperation({
        type: 'move',
        layerIds: [move.layerId],
        targetState: { parentId: move.parentId, index: move.index },
      })
    })
  }

  /**
   * Execute all pending operations immediately
   */
  flush(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
      this.batchTimer = null
    }

    this.executeBatch()
  }

  /**
   * Clear pending operations without executing
   */
  clear(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
      this.batchTimer = null
    }

    this.pendingOperations = []
  }

  // Private methods

  private addOperation(operation: BatchOperation): void {
    this.pendingOperations.push(operation)

    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.executeBatch()
      }, this.batchDelay)
    }
  }

  private executeBatch(): void {
    if (!this.store || this.pendingOperations.length === 0) {
      return
    }

    // Group operations by type for efficiency
    const updateOperations: LayerUpdate[] = []
    const deleteOperations: string[] = []
    const moveOperations: Array<{ layerId: string; parentId?: string; index?: number }> = []

    for (const op of this.pendingOperations) {
      switch (op.type) {
        case 'update':
        case 'visibility':
          if (op.updates) {
            updateOperations.push(...op.updates)
          }
          break

        case 'delete':
          if (op.layerIds) {
            deleteOperations.push(...op.layerIds)
          }
          break

        case 'move':
          if (op.layerIds && op.targetState) {
            op.layerIds.forEach((id) => {
              moveOperations.push({
                layerId: id,
                ...op.targetState,
              })
            })
          }
          break
      }
    }

    // Merge updates for same layer
    const mergedUpdates = new Map<string, Partial<LayerNode>>()
    for (const update of updateOperations) {
      const existing = mergedUpdates.get(update.id) || {}
      mergedUpdates.set(update.id, { ...existing, ...update.changes })
    }

    // Execute all operations in order
    try {
      // Batch updates
      mergedUpdates.forEach((changes, id) => {
        this.store!.updateLayerDirect(id, changes)
      })

      // Batch moves
      moveOperations.forEach((move) => {
        this.store!.moveLayerDirect(move.layerId, move.parentId, move.index)
      })

      // Batch deletes
      deleteOperations.forEach((id) => {
        this.store!.deleteLayerDirect(id)
      })
    } catch (error) {
      console.error('Failed to execute batch operations:', error)
    }

    // Clear operations
    this.pendingOperations = []
    this.batchTimer = null
  }

  /**
   * Get number of pending operations
   */
  getPendingCount(): number {
    return this.pendingOperations.length
  }

  /**
   * Set batch delay
   */
  setBatchDelay(delay: number): void {
    this.batchDelay = Math.max(0, delay)
  }
}

// Export singleton instance
export const layerBatchOperations = new LayerBatchOperations()
