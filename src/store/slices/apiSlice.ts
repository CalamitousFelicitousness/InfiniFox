import { progressService, type ProgressMethod } from '../../services/progress/ProgressService'
import type { ApiSettings, SliceCreator } from '../types'

export interface ApiSlice {
  // State
  apiSettings: ApiSettings
  isLoading: boolean

  // Actions
  setApiSettings: (settings: Partial<ApiSettings>) => Promise<void>
  setIsLoading: (loading: boolean) => void
  testConnection: () => Promise<{ connected: boolean; progressMethod: string }>
  detectApiType: () => Promise<string>
}

export const createApiSlice: SliceCreator<ApiSlice> = (set, get) => ({
  // Initial state
  apiSettings: {
    apiUrl: import.meta.env.VITE_SDNEXT_API_URL || 'http://127.0.0.1:7860/sdapi/v1',
    wsUrl: import.meta.env.VITE_SDNEXT_WS_URL || '127.0.0.1:7860',
    progressMethod: 'auto' as ProgressMethod,
    apiType: 'sdnext' as const,
  },
  isLoading: false,

  // Actions
  setApiSettings: async (settings) => {
    set((state) => ({
      apiSettings: { ...state.apiSettings, ...settings },
    }))

    // Update progress service if method changed
    if (settings.progressMethod !== undefined && settings.progressMethod !== null) {
      await progressService.setMethod(settings.progressMethod)
    }
  },

  setIsLoading: (isLoading) => set({ isLoading }),

  testConnection: async () => {
    const { apiSettings } = get()
    try {
      // Test basic API connection
      const response = await fetch(`${apiSettings.apiUrl}/samplers`)
      if (!response.ok) {
        return { connected: false, progressMethod: 'none' }
      }

      // Test progress monitoring
      const method = apiSettings.progressMethod || 'auto'
      await progressService.setMethod(method)
      const progressMethod = progressService.getActiveMethod()

      return { connected: true, progressMethod }
    } catch (error) {
      console.error('Connection test failed:', error)
      return { connected: false, progressMethod: 'none' }
    }
  },

  detectApiType: async () => {
    const { apiSettings } = get()
    try {
      // SD.Next detection - check for specific endpoints
      try {
        // SD.Next has /sdapi/v1/platform endpoint
        const platformResponse = await fetch(`${apiSettings.apiUrl}/platform`)
        if (platformResponse.ok) {
          const data = await platformResponse.json()
          if (data.app === 'sd.next') {
            return 'sdnext'
          }
        }
      } catch {
        /* empty */
      }

      // Alternative SD.Next detection
      try {
        const response = await fetch(`${apiSettings.apiUrl}/../motd`)
        if (response.ok) {
          return 'sdnext'
        }
      } catch {
        /* empty */
      }

      // Check for ComfyUI
      try {
        const response = await fetch(`${apiSettings.apiUrl.replace('/sdapi/v1', '')}/system_stats`)
        if (response.ok) {
          return 'comfyui'
        }
      } catch {
        /* empty */
      }

      // Default to A1111 if standard endpoints work
      const response = await fetch(`${apiSettings.apiUrl}/sd-models`)
      if (response.ok) {
        return 'a1111'
      }

      return 'custom'
    } catch {
      return 'custom'
    }
  },
})
