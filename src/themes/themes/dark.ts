/**
 * InfiniFox Dark Theme
 * Default dark theme optimized for creative work
 */

import type { Theme } from '../types'

import { createBaseTheme } from './base'

/**
 * InfiniFox Dark Theme
 * Professional dark theme with purple accent colors
 */
export const darkTheme: Theme = {
  ...createBaseTheme(),
  name: 'infinifox-dark',
  description: 'InfiniFox default dark theme optimized for extended creative sessions',
  mode: 'dark',

  // Dark theme uses all the default tokens which are already optimized for dark mode
  // Any customizations specific to the dark theme can be added here

  // Example of theme-specific customizations:
  colors: {
    ...createBaseTheme().colors,
    semantic: {
      ...createBaseTheme().colors.semantic,
      // Dark theme specific overrides if needed
      background: {
        primary: 'var(--color-gray-100)', // #1a1a1a
        secondary: 'var(--color-gray-200)', // #2a2a2a
        tertiary: 'var(--color-gray-300)', // #3a3a3a
        elevated: 'var(--color-gray-250)', // #2f2f2f
        overlay: 'rgba(0, 0, 0, 0.5)',
        overlayHeavy: 'rgba(0, 0, 0, 0.7)',
        overlayLight: 'rgba(0, 0, 0, 0.3)',
        canvas: 'var(--color-gray-50)', // #0a0a0a
      },
    },
  },

  // Custom properties specific to dark theme
  custom: {
    // Glass morphism effects
    glassBg: 'rgba(42, 42, 42, 0.95)',
    glassBlur: '10px',
    glassBorder: 'rgba(255, 255, 255, 0.1)',

    // Canvas specific
    canvasGridColor: 'rgba(255, 255, 255, 0.03)',
    canvasGridColorStrong: 'rgba(255, 255, 255, 0.06)',

    // Code editor colors
    codeBackground: 'var(--color-gray-50)',
    codeText: 'var(--color-text-primary)',
    codeComment: 'var(--color-text-tertiary)',
    codeKeyword: 'var(--color-primary-400)',
    codeString: 'var(--color-success-400)',
    codeNumber: 'var(--color-warning-400)',
    codeFunction: 'var(--color-info-400)',

    // Scrollbar styling
    scrollbarTrack: 'var(--color-gray-200)',
    scrollbarThumb: 'var(--color-gray-500)',
    scrollbarThumbHover: 'var(--color-gray-600)',
  },
}

/**
 * Dark theme color overrides for better contrast
 */
export const darkThemeOverrides = {
  // Enhanced shadows for dark theme
  shadows: {
    sm: '0 2px 4px 0 rgba(0, 0, 0, 0.3)',
    base: '0 2px 10px rgba(0, 0, 0, 0.3)',
    md: '0 4px 20px rgba(0, 0, 0, 0.4)',
    lg: '0 4px 20px rgba(0, 0, 0, 0.5)',
    xl: '0 8px 30px rgba(0, 0, 0, 0.6)',
    '2xl': '0 12px 40px rgba(0, 0, 0, 0.7)',
  },

  // Adjusted glow effects for dark theme
  glows: {
    primary: '0 0 20px rgba(100, 108, 255, 0.4)',
    primaryIntense: '0 0 30px rgba(100, 108, 255, 0.6)',
    primarySubtle: '0 0 10px rgba(100, 108, 255, 0.2)',
  },
}

// Export as default dark theme
export default darkTheme
