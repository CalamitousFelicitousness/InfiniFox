/**
 * InfiniFox Enhanced Theme Provider
 * React context provider for advanced theme management
 */

import { createContext } from 'preact'
import type { VNode } from 'preact'
import { useContext, useEffect, useState, useCallback, useRef } from 'preact/hooks'

import darkTheme from './themes/dark'
import lightTheme from './themes/light'
import { applyTokensToDocument } from './tokens'
import type { Theme, ThemeConfig, ThemeContextValue } from './types'
import {
  applyTransition,
  removeTransition,
  preloadTheme,
  getTransitionConfig,
  defaultTransition,
} from './utils/transitions'
import { validateTheme, validateContrast, autoFixTheme, mergeThemes } from './utils/validation'

// Default configuration
const defaultConfig: ThemeConfig = {
  defaultTheme: 'infinifox-dark',
  themes: {
    'infinifox-dark': darkTheme,
    'infinifox-light': lightTheme,
  },
  enableSystemTheme: true,
  persistTheme: true,
  storageKey: 'infinifox-theme',
  cssVariablePrefix: '',
}

// Create the theme context
const ThemeContext = createContext<ThemeContextValue | null>(null)

interface ThemeProviderProps {
  children: VNode | VNode[] | string | number | null
  config?: Partial<ThemeConfig>
  initialTheme?: string
  onThemeChange?: (theme: Theme) => void
  enableTransitions?: boolean
  validateThemes?: boolean
}

/**
 * Enhanced Theme Provider Component
 * Manages theme state with validation and smooth transitions
 */
export function ThemeProvider({
  children,
  config: userConfig,
  initialTheme,
  onThemeChange,
  enableTransitions = true,
  validateThemes: shouldValidate = true,
}: ThemeProviderProps) {
  // Merge user config with defaults
  const config = { ...defaultConfig, ...userConfig }

  // Performance tracking
  const performanceRef = useRef<{ lastSwitch: number; average: number[] }>({
    lastSwitch: 0,
    average: [],
  })

  // Initialize and validate themes
  const [themes, setThemesState] = useState(() => {
    const validatedThemes: Record<string, Theme> = {}

    Object.entries(config.themes).forEach(([name, theme]) => {
      if (shouldValidate) {
        const validation = validateTheme(theme)
        if (!validation.valid) {
          console.warn(`Theme "${name}" validation errors:`, validation.errors)
          validatedThemes[name] = autoFixTheme(theme)
        } else {
          if (validation.warnings.length > 0) {
            console.info(`Theme "${name}" warnings:`, validation.warnings)
          }
          validatedThemes[name] = theme
        }

        // Validate contrast for accessibility
        const contrastValidation = validateContrast(theme)
        if (!contrastValidation.valid) {
          console.warn(`Theme "${name}" contrast issues:`, contrastValidation.errors)
        }
      } else {
        validatedThemes[name] = theme
      }
    })

    return validatedThemes
  })

  // Get initial theme name with system preference support
  const getInitialThemeName = (): string => {
    // Priority: initialTheme prop > localStorage > system preference > default
    if (initialTheme && themes[initialTheme]) {
      return initialTheme
    }

    if (config.persistTheme) {
      const stored = localStorage.getItem(config.storageKey)
      if (stored && themes[stored]) {
        return stored
      }
    }

    if (config.enableSystemTheme) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const systemTheme = prefersDark ? 'infinifox-dark' : 'infinifox-light'
      if (themes[systemTheme]) {
        return systemTheme
      }
    }

    return config.defaultTheme
  }

  // Theme state
  const [currentThemeName, setCurrentThemeName] = useState(getInitialThemeName)
  const [theme, setThemeState] = useState(themes[currentThemeName])
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Track if initial theme has been applied
  const initialRenderRef = useRef(true)

  // Apply theme to document with performance tracking
  const applyTheme = useCallback(
    (theme: Theme, _skipTransition = false) => {
      const startTime = performance.now()

      // Generate and apply CSS variables
      const cssVars = generateThemeVariables(theme)
      applyTokensToDocument(cssVars)

      // Add theme class to body
      document.body.className = `theme-${theme.name} theme-${theme.mode}`

      // Set data attributes for better detection
      document.documentElement.setAttribute('data-theme', theme.mode) // 'light' or 'dark'
      document.documentElement.setAttribute('data-theme-name', theme.name) // full theme name
      document.documentElement.setAttribute('data-theme-provider', 'true') // marker for detection

      // Set color-scheme for native elements
      document.documentElement.style.colorScheme = theme.mode

      // Set meta theme-color for mobile browsers
      const metaThemeColor = document.querySelector('meta[name="theme-color"]')
      if (metaThemeColor) {
        const bgColor = theme.colors?.semantic?.background?.primary || '#1a1a1a'
        metaThemeColor.setAttribute('content', bgColor)
      }

      // Track performance
      const endTime = performance.now()
      const duration = endTime - startTime
      performanceRef.current.lastSwitch = duration
      performanceRef.current.average.push(duration)

      if (duration > 50) {
        console.warn(`Theme application took ${duration.toFixed(2)}ms (target: <50ms)`)
      }

      // Call onChange handler
      onThemeChange?.(theme)
    },
    [onThemeChange]
  )

  // Set theme by name with transition support
  const setTheme = useCallback(
    async (themeName: string) => {
      if (!themes[themeName]) {
        console.warn(`Theme "${themeName}" not found`)
        return
      }

      // Skip if same theme
      if (themeName === currentThemeName && !initialRenderRef.current) {
        return
      }

      const newTheme = themes[themeName]

      // Apply transition if enabled and not initial render
      if (enableTransitions && !initialRenderRef.current) {
        setIsTransitioning(true)

        // Get transition config based on user preference
        const transitionConfig = getTransitionConfig(defaultTransition)

        // Apply transition styles
        if (transitionConfig.duration > 0) {
          applyTransition(transitionConfig)
        }

        // Preload theme assets
        await preloadTheme(newTheme)

        // Apply theme
        requestAnimationFrame(() => {
          setCurrentThemeName(themeName)
          setThemeState(newTheme)
          applyTheme(newTheme)

          // Remove transition after completion
          if (transitionConfig.duration > 0) {
            setTimeout(() => {
              removeTransition()
              setIsTransitioning(false)
            }, transitionConfig.duration)
          } else {
            setIsTransitioning(false)
          }
        })
      } else {
        // Instant theme change
        setCurrentThemeName(themeName)
        setThemeState(newTheme)
        applyTheme(newTheme, true)
      }

      // Persist theme preference
      if (config.persistTheme) {
        localStorage.setItem(config.storageKey, themeName)
      }

      initialRenderRef.current = false
    },
    [
      themes,
      currentThemeName,
      applyTheme,
      config.persistTheme,
      config.storageKey,
      enableTransitions,
    ]
  )

  // Toggle between themes
  const toggleTheme = useCallback(() => {
    const themeNames = Object.keys(themes)
    const currentIndex = themeNames.indexOf(currentThemeName)
    const nextIndex = (currentIndex + 1) % themeNames.length
    setTheme(themeNames[nextIndex])
  }, [currentThemeName, themes, setTheme])

  // Toggle between light and dark specifically
  const toggleLightDark = useCallback(() => {
    const newTheme = theme.mode === 'dark' ? 'infinifox-light' : 'infinifox-dark'
    if (themes[newTheme]) {
      setTheme(newTheme)
    } else {
      toggleTheme()
    }
  }, [theme.mode, themes, setTheme, toggleTheme])

  // Create a new theme with validation
  const createTheme = useCallback(
    (name: string, themeData: Partial<Theme>) => {
      const baseTheme = themes[config.defaultTheme]
      const newTheme = mergeThemes(baseTheme, themeData)
      newTheme.name = name

      if (shouldValidate) {
        const validation = validateTheme(newTheme)
        if (!validation.valid) {
          console.error(`Cannot create theme "${name}":`, validation.errors)
          return
        }
      }

      setThemesState((prev) => ({
        ...prev,
        [name]: newTheme,
      }))
    },
    [themes, config.defaultTheme, shouldValidate]
  )

  // Update an existing theme
  const updateTheme = useCallback(
    (name: string, updates: Partial<Theme>) => {
      if (!themes[name]) {
        console.warn(`Theme "${name}" not found`)
        return
      }

      const updatedTheme = mergeThemes(themes[name], updates)

      if (shouldValidate) {
        const validation = validateTheme(updatedTheme)
        if (!validation.valid) {
          console.error(`Cannot update theme "${name}":`, validation.errors)
          return
        }
      }

      setThemesState((prev) => ({
        ...prev,
        [name]: updatedTheme,
      }))

      // If updating current theme, reapply it
      if (name === currentThemeName) {
        applyTheme(updatedTheme)
      }
    },
    [themes, currentThemeName, applyTheme, shouldValidate]
  )

  // Delete a theme
  const deleteTheme = useCallback(
    (name: string) => {
      if (name === config.defaultTheme) {
        console.warn('Cannot delete default theme')
        return
      }

      setThemesState((prev) => {
        const newThemes = { ...prev }
        delete newThemes[name]
        return newThemes
      })

      // If deleting current theme, switch to default
      if (name === currentThemeName) {
        setTheme(config.defaultTheme)
      }
    },
    [currentThemeName, config.defaultTheme, setTheme]
  )

  // Export theme as JSON
  const exportTheme = useCallback(
    (name: string): string => {
      if (!themes[name]) {
        console.warn(`Theme "${name}" not found`)
        return '{}'
      }

      return JSON.stringify(themes[name], null, 2)
    },
    [themes]
  )

  // Import theme from JSON
  const importTheme = useCallback(
    (themeData: string) => {
      try {
        const theme = JSON.parse(themeData) as Theme
        if (!theme.name) {
          console.error('Invalid theme: missing name')
          return
        }

        createTheme(theme.name, theme)
      } catch (error) {
        console.error('Failed to import theme:', error)
      }
    },
    [createTheme]
  )

  // Get theme performance metrics
  const getPerformanceMetrics = useCallback(() => {
    const metrics = performanceRef.current
    const average =
      metrics.average.length > 0
        ? metrics.average.reduce((a, b) => a + b, 0) / metrics.average.length
        : 0

    return {
      lastSwitch: metrics.lastSwitch,
      averageSwitch: average,
      switchCount: metrics.average.length,
    }
  }, [])

  // Apply initial theme
  useEffect(() => {
    // Apply theme without transition on mount
    applyTheme(theme, true)
    initialRenderRef.current = false
  }, [theme, applyTheme]) // Include dependencies

  // Listen for system theme changes
  useEffect(() => {
    if (!config.enableSystemTheme) return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      // Only auto-switch if user hasn't manually selected a theme
      const hasManualSelection =
        config.persistTheme && localStorage.getItem(config.storageKey) !== null

      if (!hasManualSelection) {
        const systemTheme = e.matches ? 'infinifox-dark' : 'infinifox-light'
        if (themes[systemTheme]) {
          setTheme(systemTheme)
        }
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [config.enableSystemTheme, config.persistTheme, config.storageKey, themes, setTheme])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + L to toggle light/dark
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'L') {
        e.preventDefault()
        toggleLightDark()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleLightDark])

  // Context value
  const contextValue: ThemeContextValue = {
    theme,
    themes,
    currentThemeName,
    setTheme,
    toggleTheme,
    createTheme,
    updateTheme,
    deleteTheme,
    exportTheme,
    importTheme,
    isTransitioning,
    getPerformanceMetrics,
  }

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>
}

/**
 * Hook to use theme context
 */
export function useTheme() {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }

  return context
}

/**
 * Generate CSS variables from theme
 */
function generateThemeVariables(theme: Theme): Record<string, string> {
  const variables: Record<string, string> = {}

  // Helper to flatten nested objects
  const flatten = (obj: Record<string, unknown>, prefix = '') => {
    Object.entries(obj).forEach(([key, value]) => {
      const varName = prefix ? `${prefix}-${key}` : key

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        flatten(value, varName)
      } else if (typeof value === 'string' || typeof value === 'number') {
        variables[varName] = String(value)
      }
    })
  }

  // Process each token category
  if (theme.colors?.palette) {
    flatten(theme.colors.palette, 'color')
  }
  if (theme.colors?.semantic) {
    Object.entries(theme.colors.semantic).forEach(([category, values]) => {
      flatten(values, `color-${category}`)
    })
  }

  if (theme.typography) {
    flatten(theme.typography.families, 'font-family')
    flatten(theme.typography.sizes, 'font-size')
    flatten(theme.typography.weights, 'font-weight')
    flatten(theme.typography.lineHeights, 'line-height')
    flatten(theme.typography.letterSpacings, 'letter-spacing')
  }

  if (theme.spacing) {
    flatten(theme.spacing.scale, 'spacing')
    flatten(theme.spacing.semantic, 'spacing')
    flatten(theme.spacing.containers, 'container')
  }

  if (theme.shadows) {
    flatten(theme.shadows.box, 'shadow')
    flatten(theme.shadows.drop, 'drop-shadow')
    flatten(theme.shadows.text, 'text-shadow')
  }

  if (theme.borders) {
    flatten(theme.borders.widths, 'border-width')
    flatten(theme.borders.radius, 'radius')
    flatten(theme.borders.borders, 'border')
  }

  if (theme.animations) {
    flatten(theme.animations.durations, 'duration')
    flatten(theme.animations.easings, 'easing')
    flatten(theme.animations.transitions, 'transition')
  }

  if (theme.breakpoints) {
    flatten(theme.breakpoints.values, 'breakpoint')
    flatten(theme.breakpoints.layouts, 'layout')
  }

  // Add custom properties
  if (theme.custom) {
    flatten(theme.custom, 'custom')
  }

  return variables
}

// Export theme context for advanced use cases
export { ThemeContext }
