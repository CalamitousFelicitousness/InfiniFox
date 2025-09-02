import { useEffect } from 'preact/hooks'
import { useStore } from '../../store/store'
import { imageStorage } from '../../services/storage'
import './StorageStats.css'

export function StorageStats() {
  const { storageStats, updateStorageStats } = useStore()
  
  useEffect(() => {
    // Update stats on mount and periodically
    updateStorageStats()
    const interval = setInterval(updateStorageStats, 10000) // Every 10 seconds
    return () => clearInterval(interval)
  }, [updateStorageStats])
  
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
  }
  
  const handleClearStorage = async () => {
    if (confirm('This will permanently delete all stored images. Are you sure?')) {
      try {
        await imageStorage.clearAll()
        await useStore.getState().clearCanvas()
        await updateStorageStats()
        alert('Storage cleared successfully')
      } catch (error) {
        console.error('Failed to clear storage:', error)
        alert('Failed to clear storage')
      }
    }
  }
  
  if (!storageStats) {
    return null
  }
  
  return (
    <div class="storage-stats">
      <h4>Storage Usage</h4>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">Images:</span>
          <span class="stat-value">{storageStats.imageCount}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Size:</span>
          <span class="stat-value">{formatBytes(storageStats.totalSize)}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Active URLs:</span>
          <span class="stat-value">{storageStats.memoryUrls}</span>
        </div>
      </div>
      <div class="storage-actions">
        <button 
          class="clear-storage-btn"
          onClick={handleClearStorage}
          title="Clear all stored images"
        >
          Clear Storage
        </button>
      </div>
      <div class="storage-info">
        <small>Images are stored locally in your browser using IndexedDB</small>
      </div>
    </div>
  )
}
