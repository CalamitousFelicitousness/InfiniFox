/**
 * Theme Validation Utilities
 * Validates and ensures theme integrity
 */

import type { Theme, ThemeColors, ThemeTypography, ThemeSpacing } from '../types'

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

/**
 * Validation error
 */
export interface ValidationError {
  path: string
  message: string
  value?: any
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  path: string
  message: string
  suggestion?: string
}

/**
 * WCAG contrast ratio requirements
 */
export const WCAG_CONTRAST = {
  AA_NORMAL: 4.5,
  AA_LARGE: 3,
  AAA_NORMAL: 7,
  AAA_LARGE: 4.5,
}

/**
 * Validate theme structure
 */
export function validateTheme(theme: any): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  // Check required fields
  if (!theme.name) {
    errors.push({
      path: 'name',
      message: 'Theme must have a name',
    })
  }

  if (!theme.mode || !['light', 'dark', 'auto'].includes(theme.mode)) {
    errors.push({
      path: 'mode',
      message: 'Theme mode must be "light", "dark", or "auto"',
      value: theme.mode,
    })
  }

  // Validate colors
  if (!theme.colors) {
    errors.push({
      path: 'colors',
      message: 'Theme must have colors',
    })
  } else {
    validateColors(theme.colors, errors, warnings)
  }

  // Validate typography
  if (!theme.typography) {
    warnings.push({
      path: 'typography',
      message: 'Theme should have typography settings',
      suggestion: 'Add typography configuration for consistent text styling',
    })
  } else {
    validateTypography(theme.typography, errors, warnings)
  }

  // Validate spacing
  if (!theme.spacing) {
    warnings.push({
      path: 'spacing',
      message: 'Theme should have spacing settings',
      suggestion: 'Add spacing configuration for consistent layout',
    })
  } else {
    validateSpacing(theme.spacing, errors, warnings)
  }

  // Additional validations
  validateShadows(theme.shadows, warnings)
  validateBorders(theme.borders, warnings)
  validateAnimations(theme.animations, warnings)

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validate color configuration
 */
function validateColors(
  colors: ThemeColors,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  // Check for required semantic colors
  const requiredSemanticColors = [
    'background.primary',
    'background.secondary',
    'text.primary',
    'text.secondary',
    'border.primary',
    'interactive.primary',
  ]

  requiredSemanticColors.forEach((path) => {
    const [category, key] = path.split('.')
    if (!colors.semantic?.[category]?.[key]) {
      errors.push({
        path: `colors.semantic.${path}`,
        message: `Required semantic color "${path}" is missing`,
      })
    }
  })

  // Validate color values
  if (colors.palette) {
    Object.entries(colors.palette).forEach(([key, value]) => {
      // Handle nested color objects (e.g., gray: { 50: '#0a0a0a', ... })
      if (typeof value === 'object' && value !== null) {
        Object.entries(value).forEach(([shade, colorValue]) => {
          if (typeof colorValue === 'string' && !isValidColor(colorValue)) {
            warnings.push({
              path: `colors.palette.${key}.${shade}`,
              message: `Invalid color value: ${colorValue}`,
              suggestion: 'Use valid CSS color format (hex, rgb, hsl, etc.)',
            })
          }
        })
      } else if (typeof value === 'string' && !isValidColor(value)) {
        warnings.push({
          path: `colors.palette.${key}`,
          message: `Invalid color value: ${value}`,
          suggestion: 'Use valid CSS color format (hex, rgb, hsl, etc.)',
        })
      }
    })
  }
}

/**
 * Validate typography configuration
 */
function validateTypography(
  typography: ThemeTypography,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  // Check font sizes
  if (!typography.sizes) {
    warnings.push({
      path: 'typography.sizes',
      message: 'Typography should include font sizes',
    })
  }

  // Check font families
  if (typography.families) {
    Object.entries(typography.families).forEach(([key, value]) => {
      if (typeof value !== 'string') {
        errors.push({
          path: `typography.families.${key}`,
          message: 'Font family must be a string',
          value,
        })
      }
    })
  }

  // Check line heights
  if (typography.lineHeights) {
    Object.entries(typography.lineHeights).forEach(([key, value]) => {
      if (typeof value !== 'number' || value < 1 || value > 3) {
        warnings.push({
          path: `typography.lineHeights.${key}`,
          message: `Line height should be between 1 and 3`,
          suggestion: `Current value: ${value}`,
        })
      }
    })
  }
}

/**
 * Validate spacing configuration
 */
function validateSpacing(
  spacing: ThemeSpacing,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  // Check spacing scale
  if (!spacing.scale) {
    warnings.push({
      path: 'spacing.scale',
      message: 'Spacing should include a scale',
      suggestion: 'Add spacing scale for consistent spacing values',
    })
  }

  // Validate spacing values
  if (spacing.scale) {
    Object.entries(spacing.scale).forEach(([key, value]) => {
      if (!isValidSpacing(value)) {
        warnings.push({
          path: `spacing.scale.${key}`,
          message: `Invalid spacing value: ${value}`,
          suggestion: 'Use valid CSS length units (px, rem, em, etc.)',
        })
      }
    })
  }
}

/**
 * Validate shadows
 */
function validateShadows(shadows: any, warnings: ValidationWarning[]): void {
  if (!shadows) {
    warnings.push({
      path: 'shadows',
      message: 'Theme should include shadow definitions',
      suggestion: 'Add shadows for depth and hierarchy',
    })
  }
}

/**
 * Validate borders
 */
function validateBorders(borders: any, warnings: ValidationWarning[]): void {
  if (!borders) {
    warnings.push({
      path: 'borders',
      message: 'Theme should include border definitions',
      suggestion: 'Add border configurations for consistent UI',
    })
  }
}

/**
 * Validate animations
 */
function validateAnimations(animations: any, warnings: ValidationWarning[]): void {
  if (!animations) {
    warnings.push({
      path: 'animations',
      message: 'Theme should include animation definitions',
      suggestion: 'Add animation configurations for smooth transitions',
    })
  }
}

/**
 * Check if a value is a valid CSS color
 */
export function isValidColor(color: string | any): boolean {
  // Type guard - ensure color is a string
  if (typeof color !== 'string') return false

  // Check for CSS variables
  if (color.startsWith('var(--')) return true

  // Check for common color formats
  const colorPatterns = [
    /^#[0-9A-Fa-f]{3,8}$/, // Hex
    /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/, // RGB
    /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/, // RGBA
    /^hsl\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\)$/, // HSL
    /^hsla\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*,\s*[\d.]+\s*\)$/, // HSLA
  ]

  return colorPatterns.some((pattern) => pattern.test(color)) || isNamedColor(color)
}

/**
 * Check if a color is a valid CSS named color
 */
function isNamedColor(color: string): boolean {
  const namedColors = [
    'transparent',
    'currentColor',
    'black',
    'white',
    'red',
    'green',
    'blue',
    'yellow',
    'cyan',
    'magenta',
    'gray',
    'grey',
    'orange',
    'purple',
    'brown',
  ]
  return namedColors.includes(color.toLowerCase())
}

/**
 * Check if a value is valid CSS spacing
 */
function isValidSpacing(value: string): boolean {
  // Check for CSS variables
  if (value.startsWith('var(--')) return true

  // Check for valid units
  const spacingPattern = /^-?\d+(\.\d+)?(px|rem|em|vh|vw|%|ch|ex|cm|mm|in|pt|pc)$/
  return spacingPattern.test(value) || value === '0' || value === 'auto'
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(color1: string, color2: string): number {
  // This would use a proper color library in production
  // For now, return a mock value
  return 4.5
}

/**
 * Check if contrast meets WCAG requirements
 */
export function meetsContrastRequirements(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA',
  largeText: boolean = false
): boolean {
  const ratio = getContrastRatio(foreground, background)
  const requirement = largeText ? WCAG_CONTRAST[`${level}_LARGE`] : WCAG_CONTRAST[`${level}_NORMAL`]

  return ratio >= requirement
}

/**
 * Validate theme contrast
 */
export function validateContrast(theme: Theme): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  // Check primary text on backgrounds
  const textPrimary = theme.colors?.semantic?.text?.primary || '#000'
  const bgPrimary = theme.colors?.semantic?.background?.primary || '#fff'

  if (!meetsContrastRequirements(textPrimary, bgPrimary)) {
    errors.push({
      path: 'colors.contrast',
      message: 'Primary text on primary background does not meet WCAG AA requirements',
      value: `${textPrimary} on ${bgPrimary}`,
    })
  }

  // Check secondary text
  const textSecondary = theme.colors?.semantic?.text?.secondary || '#666'

  if (!meetsContrastRequirements(textSecondary, bgPrimary)) {
    warnings.push({
      path: 'colors.contrast',
      message: 'Secondary text on primary background has low contrast',
      suggestion: 'Consider darkening secondary text for better readability',
    })
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Auto-fix common theme issues
 */
export function autoFixTheme(theme: Partial<Theme>): Theme {
  const fixed = { ...theme } as Theme

  // Ensure required fields
  if (!fixed.name) {
    fixed.name = 'custom-theme'
  }

  if (!fixed.mode) {
    fixed.mode = 'dark'
  }

  // Ensure basic structure
  if (!fixed.colors) {
    fixed.colors = { palette: {}, semantic: {} }
  }

  if (!fixed.typography) {
    fixed.typography = {}
  }

  if (!fixed.spacing) {
    fixed.spacing = {}
  }

  if (!fixed.shadows) {
    fixed.shadows = {}
  }

  if (!fixed.borders) {
    fixed.borders = {}
  }

  if (!fixed.animations) {
    fixed.animations = {}
  }

  if (!fixed.breakpoints) {
    fixed.breakpoints = {}
  }

  return fixed
}

/**
 * Merge themes with validation
 */
export function mergeThemes(...themes: Partial<Theme>[]): Theme {
  const merged = themes.reduce((acc, theme) => {
    return {
      ...acc,
      ...theme,
      colors: {
        ...acc.colors,
        ...theme.colors,
        palette: { ...acc.colors?.palette, ...theme.colors?.palette },
        semantic: { ...acc.colors?.semantic, ...theme.colors?.semantic },
      },
      typography: { ...acc.typography, ...theme.typography },
      spacing: { ...acc.spacing, ...theme.spacing },
      shadows: { ...acc.shadows, ...theme.shadows },
      borders: { ...acc.borders, ...theme.borders },
      animations: { ...acc.animations, ...theme.animations },
      breakpoints: { ...acc.breakpoints, ...theme.breakpoints },
      custom: { ...acc.custom, ...theme.custom },
    }
  }, {} as Partial<Theme>)

  return autoFixTheme(merged)
}

/**
 * Export validation utilities
 */
export const validation = {
  validateTheme,
  validateContrast,
  isValidColor,
  meetsContrastRequirements,
  autoFixTheme,
  mergeThemes,
}
