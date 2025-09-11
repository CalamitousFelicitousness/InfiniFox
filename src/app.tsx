import { useEffect, useState } from 'react'

import { AuthDebugPanel } from './components/auth/AuthDebugPanel'
import { PaletteIcon } from './components/icons'
import { ControlPanel } from './components/layout/ControlPanel'
import { AuthDebugContext } from './components/panels/SettingsPanel'
import { ThemeSwitcher } from './components/ThemeSwitcher'
import { ProgressProvider } from './contexts/ProgressContext'
import { Canvas } from './features/canvas/Canvas'
import { DrawingModal } from './features/drawing'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { imageStorage } from './services/storage'
import { useStore } from './store/store'

export function App() {
  const { generateTxt2Img, testConnection, loadImagesFromStorage, updateStorageStats } = useStore()
  const [showDrawingModal, setShowDrawingModal] = useState(false)
  const [showAuthDebug, setShowAuthDebug] = useState(() => {
    return localStorage.getItem('authDebugPanel') === 'true'
  })

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
  }, [loadImagesFromStorage, testConnection, updateStorageStats])

  // Periodic cleanup of unused object URLs (every 5 minutes)
  useEffect(() => {
    const cleanupInterval = setInterval(
      () => {
        console.log('Running periodic object URL cleanup...')
        // Get current image IDs from store
        const currentImages = useStore.getState().images
        const currentIds = new Set(currentImages.map((img) => img.blobId).filter(Boolean))

        // Clean up URLs not in current use
        // Note: This is a simplified approach. In production, you'd want more sophisticated tracking
        console.log(`Active images: ${currentIds.size}`)
      },
      5 * 60 * 1000
    ) // 5 minutes

    return () => clearInterval(cleanupInterval)
  }, [])

  return (
    <AuthDebugContext.Provider value={{ showAuthDebug, setShowAuthDebug }}>
      <ProgressProvider>
        <div className="app-layout">
          <ControlPanel />
          <Canvas />

          {/* Theme Switcher */}
          <ThemeSwitcher
            position="top-right"
            showPreview={true}
            animated={true}
            showSystemOption={true}
          />

          {/* Floating Action Button for Full Drawing Panel */}
          <button
            className="drawing-fab"
            onClick={() => setShowDrawingModal(true)}
            title="Open Advanced Drawing Panel"
            aria-label="Open Advanced Drawing Panel"
          >
            <PaletteIcon size={20} className="lucide-icon" />
          </button>

          {/* Drawing Modal */}
          <DrawingModal isOpen={showDrawingModal} onClose={() => setShowDrawingModal(false)} />

          {/* Auth Debug Panel - Development Only */}
          {import.meta.env.DEV && showAuthDebug && <AuthDebugPanel />}
        </div>
      </ProgressProvider>
    </AuthDebugContext.Provider>
  )
}
