import type { Command } from '../historyStore'
import type { ImageData, Transform } from '../types'

// Store reference type to avoid circular dependency
type StoreRef = {
  getState: () => {
    batchUpdatePositions: (updates: Array<{ id: string; x: number; y: number }>) => void
    batchUpdateTransforms: (updates: Array<{ id: string; transform: Transform }>) => void
    batchRemoveImages: (ids: string[]) => void
    batchDuplicateImages: (ids: string[]) => void
    addImageDirect: (image: ImageData) => void
    removeImageDirect: (id: string) => void
    images: ImageData[]
  }
}

/**
 * Command for batch moving multiple images
 */
export class BatchMoveCommand implements Command {
  constructor(
    private updates: Array<{
      id: string
      oldPosition: { x: number; y: number }
      newPosition: { x: number; y: number }
    }>,
    private storeRef: StoreRef
  ) {}

  execute(): void {
    const positionUpdates = this.updates.map((u) => ({
      id: u.id,
      x: u.newPosition.x,
      y: u.newPosition.y,
    }))
    this.storeRef.getState().batchUpdatePositions(positionUpdates)
  }

  undo(): void {
    const positionUpdates = this.updates.map((u) => ({
      id: u.id,
      x: u.oldPosition.x,
      y: u.oldPosition.y,
    }))
    this.storeRef.getState().batchUpdatePositions(positionUpdates)
  }
}

/**
 * Command for batch transforming multiple images
 */
export class BatchTransformCommand implements Command {
  constructor(
    private updates: Array<{ id: string; oldTransform: Transform; newTransform: Transform }>,
    private storeRef: StoreRef
  ) {}

  execute(): void {
    const transformUpdates = this.updates.map((u) => ({
      id: u.id,
      transform: u.newTransform,
    }))
    this.storeRef.getState().batchUpdateTransforms(transformUpdates)
  }

  undo(): void {
    const transformUpdates = this.updates.map((u) => ({
      id: u.id,
      transform: u.oldTransform,
    }))
    this.storeRef.getState().batchUpdateTransforms(transformUpdates)
  }
}

/**
 * Command for batch deleting multiple images
 */
export class BatchDeleteCommand implements Command {
  private deletedImages: ImageData[] = []

  constructor(
    private imageIds: string[],
    private storeRef: StoreRef
  ) {
    // Store copies of images to be deleted for undo
    const state = this.storeRef.getState()
    this.deletedImages = state.images
      .filter((img) => this.imageIds.includes(img.id))
      .map((img) => ({ ...img })) // Create copies
  }

  execute(): void {
    this.storeRef.getState().batchRemoveImages(this.imageIds)
  }

  undo(): void {
    // Restore deleted images
    const state = this.storeRef.getState()
    this.deletedImages.forEach((img) => {
      state.addImageDirect(img)
    })
  }
}

/**
 * Command for batch duplicating multiple images
 */
export class BatchDuplicateCommand implements Command {
  private duplicatedImageIds: string[] = []

  constructor(
    private imageIds: string[],
    private storeRef: StoreRef
  ) {}

  execute(): void {
    // Store the IDs of duplicated images for undo
    const state = this.storeRef.getState()
    const beforeCount = state.images.length

    state.batchDuplicateImages(this.imageIds)

    // After duplication, get the new image IDs
    const afterImages = state.images
    const newImages = afterImages.slice(beforeCount)
    this.duplicatedImageIds = newImages.map((img) => img.id)
  }

  undo(): void {
    // Remove the duplicated images
    if (this.duplicatedImageIds.length > 0) {
      this.storeRef.getState().batchRemoveImages(this.duplicatedImageIds)
    }
  }
}

/**
 * Command for changing z-index of multiple images
 */
export class BatchZIndexCommand implements Command {
  private oldZIndices: Map<string, number | undefined> = new Map()

  constructor(
    private imageIds: string[],
    private operation: 'front' | 'back' | 'forward' | 'backward',
    private storeRef: StoreRef
  ) {
    // Store current z-indices for undo
    const state = this.storeRef.getState()
    this.imageIds.forEach((id) => {
      const img = state.images.find((i) => i.id === id)
      if (img) {
        this.oldZIndices.set(id, img.zIndex)
      }
    })
  }

  execute(): void {
    const state = this.storeRef.getState() as StoreRef['getState'] extends () => infer R
      ? R & {
          bringToFront?: (ids: string[]) => void
          sendToBack?: (ids: string[]) => void
          bringForward?: (ids: string[]) => void
          sendBackward?: (ids: string[]) => void
        }
      : never

    switch (this.operation) {
      case 'front':
        state.bringToFront?.(this.imageIds)
        break
      case 'back':
        state.sendToBack?.(this.imageIds)
        break
      case 'forward':
        state.bringForward?.(this.imageIds)
        break
      case 'backward':
        state.sendBackward?.(this.imageIds)
        break
    }
  }

  undo(): void {
    // Restore original z-indices
    const updates: Array<{ id: string; transform: Transform }> = []

    this.oldZIndices.forEach((zIndex, id) => {
      updates.push({
        id,
        transform: { zIndex: zIndex ?? 0 },
      })
    })

    if (updates.length > 0) {
      this.storeRef.getState().batchUpdateTransforms(updates)
    }
  }
}
