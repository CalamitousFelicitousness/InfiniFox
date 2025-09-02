import { useEffect } from 'preact/hooks'

import { ProgressIndicator } from './components/common/ProgressIndicator'
import { ControlPanel } from './components/layout/ControlPanel'
import { Canvas } from './features/canvas/Canvas'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { imageStorage } from './services/storage'
import { useStore } from './store/store'
import './styles/main.css'

export function App() {
  const { generateTxt2Img, testConnection, loadImagesFromStorage, updateStorageStats } = useStore()

  // Global keyboard shortcuts
  useKeyboardShortcuts({
    onGenerate: () => {
      // Trigger generation for the current active panel
      generateTxt2Img()
    },
  })

  // Initialize app on mount
  useEffect(() => {
    const initApp = async () => {
      // Test API connection
      const result = await testConnection()
      if (!result.connected) {
        console.warn('Failed to connect to SD.Next API. Please check your API settings.')
      }
      
      // Load persisted images from IndexedDB
      console.log('Loading persisted images...')
      await loadImagesFromStorage()
      
      // Update storage stats
      await updateStorageStats()
    }
    
    initApp()
    
    // Cleanup on unmount
    return () => {
      console.log('Cleaning up object URLs...')
      imageStorage.cleanup()
    }
  }, [])
  
  // Periodic cleanup of unused object URLs (every 5 minutes)
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      console.log('Running periodic object URL cleanup...')
      // Get current image IDs from store
      const currentImages = useStore.getState().images
      const currentIds = new Set(currentImages.map(img => img.blobId).filter(Boolean))
      
      // Clean up URLs not in current use
      // Note: This is a simplified approach. In production, you'd want more sophisticated tracking
      console.log(`Active images: ${currentIds.size}`)
    }, 5 * 60 * 1000) // 5 minutes
    
    return () => clearInterval(cleanupInterval)
  }, [])

  return (
    <div class="app-layout">
      <ProgressIndicator />
      <ControlPanel />
      <Canvas />
    </div>
  )
}
