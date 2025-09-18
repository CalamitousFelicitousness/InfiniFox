import type { LayerSystemSlice } from '../../store/slices/layerSystemSlice'
import { layerStorage } from '../storage/UpdatedLayerStorageService'

class LayerPersistenceManager {
  private saveTimeout: NodeJS.Timeout | null = null
  private isSaving = false
  private lastSaveTime = 0
  private SAVE_DELAY = 1000 // 1 second debounce
  private MIN_SAVE_INTERVAL = 500 // Minimum time between saves

  /**
   * Schedule an auto-save
   */
  scheduleSave(state: Partial<LayerSystemSlice>): void {
    // Clear existing timeout
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
    }

    // Don't save if already saving
    if (this.isSaving) return

    // Check minimum interval
    const now = Date.now()
    const timeSinceLastSave = now - this.lastSaveTime

    if (timeSinceLastSave < this.MIN_SAVE_INTERVAL) {
      // Schedule for later
      this.saveTimeout = setTimeout(() => {
        this.performSave(state)
      }, this.MIN_SAVE_INTERVAL - timeSinceLastSave)
      return
    }

    // Schedule save
    this.saveTimeout = setTimeout(() => {
      this.performSave(state)
    }, this.SAVE_DELAY)
  }

  /**
   * Perform the actual save
   */
  private async performSave(state: Partial<LayerSystemSlice>): Promise<void> {
    if (this.isSaving) return

    this.isSaving = true
    this.lastSaveTime = Date.now()

    try {
      if (state.layers && state.layerOrder !== undefined && state.activeArtboardId !== undefined) {
        await layerStorage.saveLayerStructure(
          state.layers,
          state.layerOrder,
          state.activeArtboardId
        )
        console.log('Layer structure auto-saved')
      }
    } catch (error) {
      console.error('Failed to auto-save layer structure:', error)
    } finally {
      this.isSaving = false
    }
  }

  /**
   * Force immediate save
   */
  async saveNow(state: Partial<LayerSystemSlice>): Promise<void> {
    // Cancel any pending saves
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
      this.saveTimeout = null
    }

    await this.performSave(state)
  }

  /**
   * Cancel pending saves
   */
  cancelPendingSaves(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
      this.saveTimeout = null
    }
  }

  /**
   * Restore layer structure on app load
   */
  async restoreOnLoad(): Promise<{
    layers: Map<string, import('../../store/slices/layerSystemSlice').LayerNode>
    layerOrder: string[]
    activeArtboardId: string | null
  } | null> {
    try {
      const data = await layerStorage.loadLayerStructure()
      if (data) {
        console.log('Layer structure restored from storage')
        return data
      }
    } catch (error) {
      console.error('Failed to restore layer structure:', error)
    }
    return null
  }

  /**
   * Get save status
   */
  getSaveStatus(): {
    isSaving: boolean
    lastSaveTime: number
    hasPendingSave: boolean
  } {
    return {
      isSaving: this.isSaving,
      lastSaveTime: this.lastSaveTime,
      hasPendingSave: this.saveTimeout !== null,
    }
  }
}

export const layerPersistenceManager = new LayerPersistenceManager()
