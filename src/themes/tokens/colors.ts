/**
 * InfiniFox Color Tokens
 * Comprehensive color system with semantic naming
 */

// Core Palette - Raw color values
export const corePalette = {
  // Grayscale
  gray: {
    0: '#000000',
    50: '#0a0a0a',
    100: '#1a1a1a',
    150: '#1f1f1f',
    200: '#2a2a2a',
    250: '#2f2f2f',
    300: '#3a3a3a',
    350: '#3f3f3f',
    400: '#4a4a4a',
    450: '#555555',
    500: '#6a6a6a',
    550: '#7a7a7a',
    600: '#8a8a8a',
    650: '#9a9a9a',
    700: '#aaaaaa',
    750: '#bababa',
    800: '#cacaca',
    850: '#dadada',
    900: '#eaeaea',
    950: '#f5f5f5',
    1000: '#ffffff',
  },

  // Primary - InfiniFox Purple/Blue
  primary: {
    50: '#f3f4ff',
    100: '#e8e9ff',
    200: '#b8bbff',
    300: '#888dff',
    400: '#6870ff',
    500: '#646cff', // Base primary
    600: '#535bf2',
    700: '#4249d0',
    800: '#3137ae',
    900: '#20258c',
    950: '#161970',
  },

  // Success - Green
  success: {
    50: '#e8f5e9',
    100: '#c8e6c9',
    200: '#a5d6a7',
    300: '#81c784',
    400: '#66bb6a',
    500: '#4caf50', // Base success
    600: '#43a047',
    700: '#388e3c',
    800: '#2e7d32',
    900: '#1b5e20',
  },

  // Warning - Orange
  warning: {
    50: '#fff3e0',
    100: '#ffe0b2',
    200: '#ffcc80',
    300: '#ffb74d',
    400: '#ffa726',
    500: '#ff9800', // Base warning
    600: '#fb8c00',
    700: '#f57c00',
    800: '#ef6c00',
    900: '#e65100',
  },

  // Error - Red
  error: {
    50: '#ffebee',
    100: '#ffcdd2',
    200: '#ef9a9a',
    300: '#e57373',
    400: '#ef5350',
    500: '#f44336', // Base error
    600: '#e53935',
    700: '#d32f2f',
    800: '#c62828',
    900: '#b71c1c',
  },

  // Info - Blue
  info: {
    50: '#e3f2fd',
    100: '#bbdefb',
    200: '#90caf9',
    300: '#64b5f6',
    400: '#42a5f5',
    500: '#2196f3', // Base info
    600: '#1e88e5',
    700: '#1976d2',
    800: '#1565c0',
    900: '#0d47a1',
  },

  // Accent - Cyan/Teal
  accent: {
    50: '#e0f2f1',
    100: '#b2dfdb',
    200: '#80cbc4',
    300: '#4db6ac',
    400: '#26a69a',
    500: '#009688', // Base accent
    600: '#00897b',
    700: '#00796b',
    800: '#00695c',
    900: '#004d40',
  },
} as const

// Semantic Color Tokens - Intent-based colors
export const semanticColors = {
  // Background colors
  background: {
    primary: 'var(--color-gray-100)',
    secondary: 'var(--color-gray-200)',
    tertiary: 'var(--color-gray-300)',
    elevated: 'var(--color-gray-250)',
    overlay: 'rgba(0, 0, 0, 0.5)',
    overlayHeavy: 'rgba(0, 0, 0, 0.7)',
    overlayLight: 'rgba(0, 0, 0, 0.3)',
    canvas: 'var(--color-gray-50)',
  },

  // Surface colors
  surface: {
    primary: 'var(--color-gray-200)',
    secondary: 'var(--color-gray-300)',
    elevated: 'var(--color-gray-250)',
    hover: 'rgba(100, 108, 255, 0.1)',
    active: 'rgba(100, 108, 255, 0.2)',
    selected: 'rgba(100, 108, 255, 0.3)',
    disabled: 'rgba(255, 255, 255, 0.02)',
  },

  // Text colors
  text: {
    primary: 'rgba(255, 255, 255, 0.95)',
    secondary: 'rgba(255, 255, 255, 0.7)',
    tertiary: 'rgba(255, 255, 255, 0.5)',
    disabled: 'rgba(255, 255, 255, 0.3)',
    inverse: 'var(--color-gray-100)',
    link: 'var(--color-primary-400)',
    linkHover: 'var(--color-primary-300)',
  },

  // Border colors
  border: {
    primary: 'rgba(255, 255, 255, 0.1)',
    secondary: 'rgba(255, 255, 255, 0.05)',
    focus: 'var(--color-primary-500)',
    error: 'var(--color-error-500)',
    warning: 'var(--color-warning-500)',
    success: 'var(--color-success-500)',
  },

  // Interactive element colors
  interactive: {
    primary: 'var(--color-primary-500)',
    primaryHover: 'var(--color-primary-400)',
    primaryActive: 'var(--color-primary-600)',
    secondary: 'var(--color-gray-600)',
    secondaryHover: 'var(--color-gray-500)',
    secondaryActive: 'var(--color-gray-700)',
  },

  // State colors
  state: {
    success: 'var(--color-success-500)',
    successBg: 'rgba(76, 175, 80, 0.1)',
    warning: 'var(--color-warning-500)',
    warningBg: 'rgba(255, 152, 0, 0.1)',
    error: 'var(--color-error-500)',
    errorBg: 'rgba(244, 67, 54, 0.1)',
    info: 'var(--color-info-500)',
    infoBg: 'rgba(33, 150, 243, 0.1)',
  },

  // Special purpose colors
  special: {
    glow: 'rgba(100, 108, 255, 0.5)',
    glowIntense: 'rgba(100, 108, 255, 0.8)',
    glowSubtle: 'rgba(100, 108, 255, 0.3)',
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    highlightColor: 'rgba(255, 255, 255, 0.1)',
  },
} as const

// Generate CSS variables from tokens
export function generateColorCSSVariables(): string {
  let css = ':root {\n'
  
  // Core palette
  Object.entries(corePalette).forEach(([colorName, shades]) => {
    Object.entries(shades).forEach(([shade, value]) => {
      css += `  --color-${colorName}-${shade}: ${value};\n`
    })
  })
  
  css += '\n  /* Semantic Colors */\n'
  
  // Semantic colors
  Object.entries(semanticColors).forEach(([category, colors]) => {
    Object.entries(colors).forEach(([name, value]) => {
      const varName = name.replace(/([A-Z])/g, '-$1').toLowerCase()
      css += `  --color-${category}-${varName}: ${value};\n`
    })
  })
  
  css += '}\n'
  
  return css
}

// Type exports for TypeScript
export type CorePalette = typeof corePalette
export type SemanticColors = typeof semanticColors
export type ColorToken = keyof CorePalette | keyof SemanticColors
