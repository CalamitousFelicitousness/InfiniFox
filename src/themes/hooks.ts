/**
 * InfiniFox Theme Hooks
 * Custom hooks for theme system interaction
 */

import { useContext, useEffect, useState, useMemo } from 'preact/hooks'

import { ThemeContext } from './ThemeProvider'
import { breakpointUtils } from './tokens/breakpoints'
import type { Theme, UseThemeReturn, ThemeTokens, Breakpoint, MediaQuery } from './types'

/**
 * Main theme hook with enhanced functionality
 */
export function useTheme(): UseThemeReturn {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }

  const { theme, currentThemeName, setTheme, toggleTheme } = context

  // Determine if theme is dark or light
  const isDark = theme.mode === 'dark'
  const isLight = theme.mode === 'light'

  // Create token accessors
  const tokens: ThemeTokens = useMemo(
    () => ({
      color: (path: string) => {
        const parts = path.split('.')
        let value: any = theme.colors
        for (const part of parts) {
          value = value?.[part]
        }
        return value || ''
      },

      typography: (path: string) => {
        const parts = path.split('.')
        let value: any = theme.typography
        for (const part of parts) {
          value = value?.[part]
        }
        return value
      },

      spacing: (scale: any) => {
        return theme.spacing?.scale?.[scale] || '0'
      },

      shadow: (type: any) => {
        return theme.shadows?.box?.[type] || 'none'
      },

      border: (type: any) => {
        return theme.borders?.borders?.[type] || 'none'
      },

      radius: (size: any) => {
        return theme.borders?.radius?.[size] || '0'
      },

      duration: (speed: any) => {
        return theme.animations?.durations?.[speed] || '0ms'
      },

      easing: (type: any) => {
        return theme.animations?.easings?.[type] || 'linear'
      },

      breakpoint: (size: any) => {
        return theme.breakpoints?.values?.[size] || '0px'
      },

      mediaQuery: (query: any) => {
        return theme.breakpoints?.queries?.[query] || ''
      },
    }),
    [theme]
  )

  return {
    theme,
    themeName: currentThemeName,
    isDark,
    isLight,
    setTheme,
    toggleTheme,
    tokens,
  }
}

/**
 * Hook to access specific token values
 */
export function useToken<T = string>(category: keyof Theme, path: string): T | undefined {
  const { theme } = useTheme()

  const value = useMemo(() => {
    const parts = path.split('.')
    let result: any = theme[category]

    for (const part of parts) {
      result = result?.[part]
    }

    return result as T
  }, [theme, category, path])

  return value
}

/**
 * Hook for responsive values based on breakpoints
 */
export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(breakpointUtils.getCurrentBreakpoint())

  useEffect(() => {
    const handleResize = () => {
      setBreakpoint(breakpointUtils.getCurrentBreakpoint())
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return breakpoint
}

/**
 * Hook to check if a media query matches
 */
export function useMediaQuery(query: MediaQuery | string): boolean {
  const { tokens } = useTheme()

  // Get the actual media query string
  const mediaQueryString = useMemo(() => {
    if (query.startsWith('@media')) {
      return query
    }
    return tokens.mediaQuery(query as MediaQuery)
  }, [query, tokens])

  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      const mq = mediaQueryString.replace('@media ', '')
      return window.matchMedia(mq).matches
    }
    return false
  })

  useEffect(() => {
    const mq = mediaQueryString.replace('@media ', '')
    const mediaQuery = window.matchMedia(mq)

    const handleChange = (e: MediaQueryListEvent) => {
      setMatches(e.matches)
    }

    // Set initial value
    setMatches(mediaQuery.matches)

    // Listen for changes
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [mediaQueryString])

  return matches
}

/**
 * Hook for responsive values
 */
export function useResponsive<T>(values: Partial<Record<Breakpoint, T>>): T | undefined {
  const breakpoint = useBreakpoint()
  const { theme } = useTheme()

  const value = useMemo(() => {
    const breakpoints = Object.keys(theme.breakpoints?.values || {}) as Breakpoint[]
    const currentIndex = breakpoints.indexOf(breakpoint)

    // Find the value for current or smaller breakpoint
    for (let i = currentIndex; i >= 0; i--) {
      const bp = breakpoints[i]
      if (values[bp] !== undefined) {
        return values[bp]
      }
    }

    // Return the smallest defined value
    for (const bp of breakpoints) {
      if (values[bp] !== undefined) {
        return values[bp]
      }
    }

    return undefined
  }, [breakpoint, values, theme])

  return value
}

/**
 * Hook to detect user preferences
 */
export function useUserPreferences() {
  const [preferences, setPreferences] = useState(() => ({
    prefersReducedMotion: breakpointUtils.prefersReducedMotion(),
    prefersDarkMode: breakpointUtils.prefersDarkMode(),
    isTouchDevice: breakpointUtils.isTouchDevice(),
    isMouseDevice: breakpointUtils.isMouseDevice(),
  }))

  useEffect(() => {
    const queries = [
      {
        query: '(prefers-reduced-motion: reduce)',
        key: 'prefersReducedMotion',
      },
      {
        query: '(prefers-color-scheme: dark)',
        key: 'prefersDarkMode',
      },
      {
        query: '(hover: none) and (pointer: coarse)',
        key: 'isTouchDevice',
      },
      {
        query: '(hover: hover) and (pointer: fine)',
        key: 'isMouseDevice',
      },
    ]

    const handlers = queries.map(({ query, key }) => {
      const mq = window.matchMedia(query)
      const handler = (e: MediaQueryListEvent) => {
        setPreferences((prev) => ({
          ...prev,
          [key]: e.matches,
        }))
      }

      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    })

    return () => handlers.forEach((cleanup) => cleanup())
  }, [])

  return preferences
}

/**
 * Hook for theme-aware styles
 */
export function useThemeStyles<T extends Record<string, any>>(stylesFn: (theme: Theme) => T): T {
  const { theme } = useTheme()

  return useMemo(() => stylesFn(theme), [theme, stylesFn])
}

/**
 * Hook for component variants based on theme
 */
export function useComponentVariant(component: string, variant?: string, size?: string) {
  const { theme } = useTheme()

  const styles = useMemo(() => {
    const componentTheme = theme.custom?.components?.[component]
    if (!componentTheme) return {}

    const baseStyles = componentTheme.root || {}
    const variantStyles = variant ? componentTheme.variants?.[variant] || {} : {}
    const sizeStyles = size ? componentTheme.sizes?.[size] || {} : {}

    return {
      ...baseStyles,
      ...variantStyles,
      ...sizeStyles,
    }
  }, [theme, component, variant, size])

  return styles
}

/**
 * Hook for CSS variable value
 */
export function useCSSVariable(name: string): string {
  const [value, setValue] = useState(() => {
    if (typeof window !== 'undefined') {
      return getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim()
    }
    return ''
  })

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const newValue = getComputedStyle(document.documentElement)
        .getPropertyValue(`--${name}`)
        .trim()
      setValue(newValue)
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style'],
    })

    return () => observer.disconnect()
  }, [name])

  return value
}

/**
 * Hook for contrast color based on background
 */
export function useContrastColor(backgroundColor: string): string {
  return useMemo(() => {
    // Simple luminance calculation
    const rgb = backgroundColor.match(/\d+/g)
    if (!rgb || rgb.length < 3) return 'white'

    const [r, g, b] = rgb.map(Number)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

    return luminance > 0.5 ? 'black' : 'white'
  }, [backgroundColor])
}
