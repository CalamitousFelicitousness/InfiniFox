/**
 * useThemeTransition Hook
 * Manages smooth theme transitions with performance optimization
 */

import { useState, useCallback, useRef, useEffect } from 'preact/hooks'
import { useTheme } from '../themes/ThemeProvider'
import {
  transitionTheme,
  getTransitionConfig,
  measureThemeSwitch,
  preloadTheme,
  defaultTransition,
  instantTransition,
} from '../themes/utils/transitions'
import type { TransitionConfig } from '../themes/utils/transitions'
import type { Theme } from '../themes/types'

/**
 * Theme transition state
 */
export interface ThemeTransitionState {
  isTransitioning: boolean
  fromTheme: string | null
  toTheme: string | null
  progress: number
  duration: number
}

/**
 * Theme transition hook options
 */
export interface UseThemeTransitionOptions {
  duration?: number
  easing?: string
  preload?: boolean
  measurePerformance?: boolean
  onTransitionStart?: (from: string, to: string) => void
  onTransitionEnd?: (theme: string, duration: number) => void
  onTransitionError?: (error: Error) => void
}

/**
 * Theme transition hook return value
 */
export interface UseThemeTransitionReturn {
  switchTheme: (themeName: string, config?: TransitionConfig) => Promise<void>
  transitionState: ThemeTransitionState
  isTransitioning: boolean
  cancelTransition: () => void
  preloadThemes: (themeNames: string[]) => Promise<void>
}

/**
 * Hook for managing theme transitions
 */
export function useThemeTransition(
  options: UseThemeTransitionOptions = {}
): UseThemeTransitionReturn {
  const {
    duration = 300,
    easing = 'cubic-bezier(0.4, 0, 0.2, 1)',
    preload = true,
    measurePerformance = true,
    onTransitionStart,
    onTransitionEnd,
    onTransitionError,
  } = options
  
  const { theme, themes, currentThemeName, setTheme } = useTheme()
  const transitionRef = useRef<NodeJS.Timeout | null>(null)
  const performanceRef = useRef<number>(0)
  const preloadedThemes = useRef<Set<string>>(new Set())
  
  const [transitionState, setTransitionState] = useState<ThemeTransitionState>({
    isTransitioning: false,
    fromTheme: null,
    toTheme: null,
    progress: 0,
    duration: 0,
  })
  
  /**
   * Cancel ongoing transition
   */
  const cancelTransition = useCallback(() => {
    if (transitionRef.current) {
      clearTimeout(transitionRef.current)
      transitionRef.current = null
    }
    
    setTransitionState({
      isTransitioning: false,
      fromTheme: null,
      toTheme: null,
      progress: 0,
      duration: 0,
    })
  }, [])
  
  /**
   * Preload multiple themes
   */
  const preloadThemes = useCallback(async (themeNames: string[]) => {
    const promises = themeNames.map(async (name) => {
      if (preloadedThemes.current.has(name)) {
        return // Already preloaded
      }
      
      const themeToPreload = themes[name]
      if (themeToPreload) {
        try {
          await preloadTheme(themeToPreload)
          preloadedThemes.current.add(name)
        } catch (error) {
          console.warn(`Failed to preload theme "${name}":`, error)
        }
      }
    })
    
    await Promise.all(promises)
  }, [themes])
  
  /**
   * Switch theme with transition
   */
  const switchTheme = useCallback(async (
    themeName: string,
    config?: TransitionConfig
  ): Promise<void> => {
    // Check if theme exists
    if (!themes[themeName]) {
      const error = new Error(`Theme "${themeName}" not found`)
      onTransitionError?.(error)
      throw error
    }
    
    // Don't transition to the same theme
    if (themeName === currentThemeName) {
      return
    }
    
    // Cancel any ongoing transition
    cancelTransition()
    
    // Get transition configuration
    const transitionConfig = config || getTransitionConfig({
      duration,
      easing,
      properties: defaultTransition.properties,
    })
    
    // Update state
    setTransitionState({
      isTransitioning: true,
      fromTheme: currentThemeName,
      toTheme: themeName,
      progress: 0,
      duration: transitionConfig.duration,
    })
    
    try {
      // Preload theme if enabled
      if (preload && !preloadedThemes.current.has(themeName)) {
        await preloadTheme(themes[themeName])
        preloadedThemes.current.add(themeName)
      }
      
      // Call transition start callback
      onTransitionStart?.(currentThemeName, themeName)
      
      // Measure performance
      const switchDuration = measurePerformance
        ? measureThemeSwitch(() => setTheme(themeName))
        : (() => { setTheme(themeName); return 0 })()
      
      performanceRef.current = switchDuration
      
      // Perform transition
      await transitionTheme(
        theme,
        themes[themeName],
        transitionConfig,
        () => {
          // Update progress during transition
          const steps = 10
          const stepDuration = transitionConfig.duration / steps
          let currentStep = 0
          
          const updateProgress = () => {
            currentStep++
            const progress = (currentStep / steps) * 100
            
            setTransitionState(prev => ({
              ...prev,
              progress,
            }))
            
            if (currentStep < steps) {
              transitionRef.current = setTimeout(updateProgress, stepDuration)
            }
          }
          
          updateProgress()
        },
        () => {
          // Transition complete
          setTransitionState({
            isTransitioning: false,
            fromTheme: null,
            toTheme: null,
            progress: 100,
            duration: 0,
          })
          
          // Call completion callback
          onTransitionEnd?.(themeName, performanceRef.current)
        }
      )
    } catch (error) {
      console.error('Theme transition failed:', error)
      onTransitionError?.(error as Error)
      
      // Reset state on error
      setTransitionState({
        isTransitioning: false,
        fromTheme: null,
        toTheme: null,
        progress: 0,
        duration: 0,
      })
      
      // Apply theme without transition as fallback
      setTheme(themeName)
    }
  }, [
    themes,
    theme,
    currentThemeName,
    setTheme,
    duration,
    easing,
    preload,
    measurePerformance,
    onTransitionStart,
    onTransitionEnd,
    onTransitionError,
    cancelTransition,
  ])
  
  /**
   * Preload adjacent themes on mount
   */
  useEffect(() => {
    if (preload) {
      // Preload common themes
      const commonThemes = ['infinifox-dark', 'infinifox-light']
      preloadThemes(commonThemes).catch(console.warn)
    }
  }, [preload, preloadThemes])
  
  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      cancelTransition()
    }
  }, [cancelTransition])
  
  return {
    switchTheme,
    transitionState,
    isTransitioning: transitionState.isTransitioning,
    cancelTransition,
    preloadThemes,
  }
}

/**
 * Hook for detecting system theme preference
 */
export function useSystemTheme(): 'light' | 'dark' {
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light')
    }
    
    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
    // Legacy browsers
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange)
      return () => mediaQuery.removeListener(handleChange)
    }
  }, [])
  
  return systemTheme
}

/**
 * Hook for theme persistence
 */
export function useThemePersistence(
  storageKey: string = 'infinifox-theme'
): {
  savedTheme: string | null
  saveTheme: (theme: string) => void
  clearSavedTheme: () => void
} {
  const [savedTheme, setSavedTheme] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(storageKey)
  })
  
  const saveTheme = useCallback((theme: string) => {
    localStorage.setItem(storageKey, theme)
    setSavedTheme(theme)
  }, [storageKey])
  
  const clearSavedTheme = useCallback(() => {
    localStorage.removeItem(storageKey)
    setSavedTheme(null)
  }, [storageKey])
  
  return {
    savedTheme,
    saveTheme,
    clearSavedTheme,
  }
}

/**
 * Hook for keyboard shortcuts
 */
export function useThemeShortcuts(
  shortcuts: Record<string, () => void> = {}
): void {
  useEffect(() => {
    const defaultShortcuts = {
      'ctrl+shift+l': () => {
        const { toggleTheme } = useTheme()
        toggleTheme()
      },
      ...shortcuts,
    }
    
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = [
        e.ctrlKey && 'ctrl',
        e.shiftKey && 'shift',
        e.altKey && 'alt',
        e.metaKey && 'meta',
        e.key.toLowerCase(),
      ]
        .filter(Boolean)
        .join('+')
      
      const handler = defaultShortcuts[key]
      if (handler) {
        e.preventDefault()
        handler()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts])
}
