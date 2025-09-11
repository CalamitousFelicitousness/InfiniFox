import React, { createContext, useContext, useEffect } from 'react'

import { progressService } from '../services/progress/ProgressService'
import type { ProgressHandler } from '../services/progress/ProgressService'

const ProgressContext = createContext(progressService)

/**
 * Provider for managing progress service lifecycle
 */
export function ProgressProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Connect on mount
    progressService.connect().catch(console.error)
    
    return () => {
      // Disconnect on unmount
      progressService.disconnect()
    }
  }, [])
  
  return (
    <ProgressContext.Provider value={progressService}>
      {children}
    </ProgressContext.Provider>
  )
}

/**
 * Hook for subscribing to progress updates with automatic cleanup
 */
export function useProgress(handler: ProgressHandler) {
  const service = useContext(ProgressContext)
  
  useEffect(() => {
    const unsubscribe = service.onProgress(handler)
    return unsubscribe
  }, [service, handler])
  
  return service
}

/**
 * Hook for getting progress service without subscription
 */
export function useProgressService() {
  return useContext(ProgressContext)
}
