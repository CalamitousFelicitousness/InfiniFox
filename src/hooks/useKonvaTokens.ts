import { useEffect, useMemo } from 'preact/compat'

import { KonvaTokenBridge } from '../services/canvas/KonvaTokenBridge'

export interface KonvaTokens {
  colors: {
    // Backgrounds
    backgroundPrimary: string
    backgroundSecondary: string
    backgroundCanvas: string

    // Surfaces
    surfacePrimary: string
    surfaceHover: string
    surfaceActive: string
    surfaceSelected: string

    // Text
    textPrimary: string
    textSecondary: string
    textTertiary: string

    // Borders
    borderPrimary: string
    borderFocus: string
    borderError: string

    // Interactive
    interactivePrimary: string
    interactivePrimaryHover: string

    // Semantic
    success: string
    warning: string
    error: string
    info: string
  }

  spacing: {
    xs: number
    sm: number
    base: number
    lg: number
    xl: number
  }

  typography: {
    fontSizeXs: number
    fontSizeSm: number
    fontSizeBase: number
    fontSizeLg: number
    fontSizeXl: number

    fontWeightNormal: number
    fontWeightMedium: number
    fontWeightSemibold: number
    fontWeightBold: number

    fontFamilyBase: string
    fontFamilyMono: string
  }

  borders: {
    radiusXs: number
    radiusSm: number
    radiusBase: number
    radiusMd: number
    radiusLg: number

    widthThin: number
    widthBase: number
    widthMedium: number
    widthThick: number
  }

  shadows: {
    sm: ReturnType<typeof KonvaTokenBridge.parseShadow>
    base: ReturnType<typeof KonvaTokenBridge.parseShadow>
    md: ReturnType<typeof KonvaTokenBridge.parseShadow>
    lg: ReturnType<typeof KonvaTokenBridge.parseShadow>
    panel: ReturnType<typeof KonvaTokenBridge.parseShadow>
    button: ReturnType<typeof KonvaTokenBridge.parseShadow>
    glow: ReturnType<typeof KonvaTokenBridge.parseShadow>
  }

  opacity: {
    disabled: number
    hover: number
    active: number
    selected: number
  }
}

export function useKonvaTokens(): KonvaTokens {
  // Initialize bridge on mount
  useEffect(() => {
    KonvaTokenBridge.initialize()

    // Re-initialize on theme changes
    const handleThemeChange = () => {
      KonvaTokenBridge.clearCache()
      KonvaTokenBridge.initialize()
    }

    // Listen for theme changes (assuming you dispatch a custom event)
    window.addEventListener('theme-changed', handleThemeChange)

    return () => {
      window.removeEventListener('theme-changed', handleThemeChange)
    }
  }, [])

  // Memoize token values
  const tokens = useMemo<KonvaTokens>(
    () => ({
      colors: {
        backgroundPrimary: KonvaTokenBridge.getColor('color-background-primary'),
        backgroundSecondary: KonvaTokenBridge.getColor('color-background-secondary'),
        backgroundCanvas: KonvaTokenBridge.getColor('color-background-canvas'),
        surfacePrimary: KonvaTokenBridge.getColor('color-surface-primary'),
        surfaceHover: KonvaTokenBridge.getColor('color-surface-hover'),
        surfaceActive: KonvaTokenBridge.getColor('color-surface-active'),
        surfaceSelected: KonvaTokenBridge.getColor('color-surface-selected'),
        textPrimary: KonvaTokenBridge.getColor('color-text-primary'),
        textSecondary: KonvaTokenBridge.getColor('color-text-secondary'),
        textTertiary: KonvaTokenBridge.getColor('color-text-tertiary'),
        borderPrimary: KonvaTokenBridge.getColor('color-border-primary'),
        borderFocus: KonvaTokenBridge.getColor('color-border-focus'),
        borderError: KonvaTokenBridge.getColor('color-border-error'),
        interactivePrimary: KonvaTokenBridge.getColor('color-primary-500'),
        interactivePrimaryHover: KonvaTokenBridge.getColor('color-primary-400'),
        success: KonvaTokenBridge.getColor('color-success-500'),
        warning: KonvaTokenBridge.getColor('color-warning-500'),
        error: KonvaTokenBridge.getColor('color-error-500'),
        info: KonvaTokenBridge.getColor('color-info-500'),
      },

      spacing: {
        xs: KonvaTokenBridge.getNumber('spacing-2'),
        sm: KonvaTokenBridge.getNumber('spacing-3'),
        base: KonvaTokenBridge.getNumber('spacing-4'),
        lg: KonvaTokenBridge.getNumber('spacing-5'),
        xl: KonvaTokenBridge.getNumber('spacing-6'),
      },

      typography: {
        fontSizeXs: KonvaTokenBridge.getNumber('font-size-xs'),
        fontSizeSm: KonvaTokenBridge.getNumber('font-size-sm'),
        fontSizeBase: KonvaTokenBridge.getNumber('font-size-base'),
        fontSizeLg: KonvaTokenBridge.getNumber('font-size-lg'),
        fontSizeXl: KonvaTokenBridge.getNumber('font-size-xl'),
        fontWeightNormal: KonvaTokenBridge.getNumber('font-weight-normal'),
        fontWeightMedium: KonvaTokenBridge.getNumber('font-weight-medium'),
        fontWeightSemibold: KonvaTokenBridge.getNumber('font-weight-semibold'),
        fontWeightBold: KonvaTokenBridge.getNumber('font-weight-bold'),
        fontFamilyBase: KonvaTokenBridge.getToken('font-family-base'),
        fontFamilyMono: KonvaTokenBridge.getToken('font-family-mono'),
      },

      borders: {
        radiusXs: KonvaTokenBridge.getNumber('radius-xs'),
        radiusSm: KonvaTokenBridge.getNumber('radius-sm'),
        radiusBase: KonvaTokenBridge.getNumber('radius-base'),
        radiusMd: KonvaTokenBridge.getNumber('radius-md'),
        radiusLg: KonvaTokenBridge.getNumber('radius-lg'),
        widthThin: KonvaTokenBridge.getNumber('border-width-thin'),
        widthBase: KonvaTokenBridge.getNumber('border-width-base'),
        widthMedium: KonvaTokenBridge.getNumber('border-width-medium'),
        widthThick: KonvaTokenBridge.getNumber('border-width-thick'),
      },

      shadows: {
        sm: KonvaTokenBridge.parseShadow('shadow-sm'),
        base: KonvaTokenBridge.parseShadow('shadow-base'),
        md: KonvaTokenBridge.parseShadow('shadow-md'),
        lg: KonvaTokenBridge.parseShadow('shadow-lg'),
        panel: KonvaTokenBridge.parseShadow('shadow-panel-default'),
        button: KonvaTokenBridge.parseShadow('shadow-button-default'),
        glow: KonvaTokenBridge.parseShadow('shadow-glow-base'),
      },

      opacity: {
        disabled: KonvaTokenBridge.getNumber('opacity-disabled') / 100,
        hover: KonvaTokenBridge.getNumber('opacity-hover') / 100,
        active: KonvaTokenBridge.getNumber('opacity-active') / 100,
        selected: KonvaTokenBridge.getNumber('opacity-selected') / 100,
      },
    }),
    []
  )

  return tokens
}
