import { HardDrive, Trash2, ChevronRight } from 'lucide-preact'
import { useState } from 'preact/hooks'
import { useEffect } from 'preact/hooks'

import { imageStorage } from '../../services/storage'
import { useStore } from '../../store/store'

export function StorageStats() {
  const [isExpanded, setIsExpanded] = useState(false)
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
    <div class={`panel storage-stats-panel ${isExpanded ? '' : 'collapsed'}`}>
      <div class="panel-header">
        <div class="d-flex items-center gap-2">
          <HardDrive class="icon-base" />
          <h4 class="panel-title">Storage Usage</h4>
        </div>
        <button
          class="settings-toggle"
          onPointerDown={(e) => {
            e.preventDefault()
            setIsExpanded(!isExpanded)
          }}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          <ChevronRight class="icon-base" />
        </button>
      </div>
      <div class={`panel-content compact ${!isExpanded ? 'collapsed' : ''}`}>
        <div class="storage-stats-grid">
          <div class="storage-stat-item">
            <span class="storage-stat-label">Images:</span>
            <span class="storage-stat-value">{storageStats.imageCount}</span>
          </div>
          <div class="storage-stat-item">
            <span class="storage-stat-label">Size:</span>
            <span class="storage-stat-value">{formatBytes(storageStats.totalSize)}</span>
          </div>
          <div class="storage-stat-item">
            <span class="storage-stat-label">Active URLs:</span>
            <span class="storage-stat-value">{storageStats.memoryUrls}</span>
          </div>
        </div>

        <div class="panel-actions mt-3">
          <button
            class="btn btn-sm btn-danger w-full"
            onClick={handleClearStorage}
            title="Clear all stored images"
          >
            <Trash2 class="icon-sm" />
            <span>Clear Storage</span>
          </button>
        </div>

        <div class="form-help mt-3">Images are stored locally in your browser using IndexedDB</div>
      </div>
    </div>
  )
}
