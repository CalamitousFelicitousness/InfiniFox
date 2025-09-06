/**
 * InfiniFox Theme Provider
 * React context provider for theme management
 */

import { createContext } from 'preact'
import { useContext, useEffect, useState, useCallback } from 'preact/hooks'
import type { VNode } from 'preact'
import type { Theme, ThemeConfig, ThemeContextValue } from './types'
import darkTheme from './themes/dark'
import { applyTokensToDocument, generateAllCSSVariables } from './tokens'

// Default configuration
const defaultConfig: ThemeConfig = {
  defaultTheme: 'infinifox-dark',
  themes: {
    'infinifox-dark': darkTheme,
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
}

/**
 * Theme Provider Component
 * Manages theme state and provides theme context to children
 */
export function ThemeProvider({
  children,
  config: userConfig,
  initialTheme,
  onThemeChange,
}: ThemeProviderProps) {
  // Merge user config with defaults
  const config = { ...defaultConfig, ...userConfig }
  
  // Initialize themes
  const [themes] = useState(config.themes)
  
  // Get initial theme name
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
  
  // Apply theme to document
  const applyTheme = useCallback((theme: Theme) => {
    // Generate and apply CSS variables
    const cssVars = generateThemeVariables(theme)
    applyTokensToDocument(cssVars)
    
    // Add theme class to body
    document.body.className = `theme-${theme.name} theme-${theme.mode}`
    
    // Set color-scheme
    document.documentElement.style.colorScheme = theme.mode
    
    // Call onChange handler
    onThemeChange?.(theme)
  }, [onThemeChange])
  
  // Set theme by name
  const setTheme = useCallback((themeName: string) => {
    if (!themes[themeName]) {
      console.warn(`Theme "${themeName}" not found`)
      return
    }
    
    const newTheme = themes[themeName]
    setCurrentThemeName(themeName)
    setThemeState(newTheme)
    applyTheme(newTheme)
    
    // Persist theme preference
    if (config.persistTheme) {
      localStorage.setItem(config.storageKey, themeName)
    }
  }, [themes, applyTheme, config.persistTheme, config.storageKey])
  
  // Toggle between themes
  const toggleTheme = useCallback(() => {
    const themeNames = Object.keys(themes)
    const currentIndex = themeNames.indexOf(currentThemeName)
    const nextIndex = (currentIndex + 1) % themeNames.length
    setTheme(themeNames[nextIndex])
  }, [currentThemeName, themes, setTheme])
  
  // Create a new theme
  const createTheme = useCallback((name: string, theme: Partial<Theme>) => {
    const baseTheme = themes[config.defaultTheme]
    const newTheme: Theme = {
      ...baseTheme,
      ...theme,
      name,
    }
    themes[name] = newTheme
  }, [themes, config.defaultTheme])
  
  // Update an existing theme
  const updateTheme = useCallback((name: string, updates: Partial<Theme>) => {
    if (!themes[name]) {
      console.warn(`Theme "${name}" not found`)
      return
    }
    
    themes[name] = {
      ...themes[name],
      ...updates,
    }
    
    // If updating current theme, reapply it
    if (name === currentThemeName) {
      applyTheme(themes[name])
    }
  }, [themes, currentThemeName, applyTheme])
  
  // Delete a theme
  const deleteTheme = useCallback((name: string) => {
    if (name === config.defaultTheme) {
      console.warn('Cannot delete default theme')
      return
    }
    
    delete themes[name]
    
    // If deleting current theme, switch to default
    if (name === currentThemeName) {
      setTheme(config.defaultTheme)
    }
  }, [themes, currentThemeName, config.defaultTheme, setTheme])
  
  // Export theme as JSON
  const exportTheme = useCallback((name: string): string => {
    if (!themes[name]) {
      console.warn(`Theme "${name}" not found`)
      return '{}'
    }
    
    return JSON.stringify(themes[name], null, 2)
  }, [themes])
  
  // Import theme from JSON
  const importTheme = useCallback((themeData: string) => {
    try {
      const theme = JSON.parse(themeData) as Theme
      if (!theme.name) {
        console.error('Invalid theme: missing name')
        return
      }
      
      themes[theme.name] = theme
    } catch (error) {
      console.error('Failed to import theme:', error)
    }
  }, [themes])
  
  // Apply initial theme
  useEffect(() => {
    applyTheme(theme)
  }, []) // Only on mount
  
  // Listen for system theme changes
  useEffect(() => {
    if (!config.enableSystemTheme) return
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      const systemTheme = e.matches ? 'infinifox-dark' : 'infinifox-light'
      if (themes[systemTheme]) {
        setTheme(systemTheme)
      }
    }
    
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [config.enableSystemTheme, themes, setTheme])
  
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
  }
  
  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
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
  const flatten = (obj: any, prefix = '') => {
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
