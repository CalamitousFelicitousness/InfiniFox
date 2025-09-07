/**
 * InfiniFox Design Tokens
 * Central export for all design tokens
 */

// Token exports
export * from './colors'
export * from './typography'
export * from './spacing'
export * from './shadows'
export * from './animations'
export * from './borders'
export * from './breakpoints'
export * from './icons'

// Import all token generators
import { generateAnimationCSS } from './animations'
import { generateBorderCSSVariables } from './borders'
import { generateBreakpointCSSVariables } from './breakpoints'
import { generateColorCSSVariables } from './colors'
import { generateIconCSSVariables } from './icons'
import { generateShadowCSSVariables } from './shadows'
import { generateSpacingCSSVariables } from './spacing'
import { generateTypographyCSSVariables } from './typography'

// Re-export commonly used tokens for convenience
export { corePalette, semanticColors } from './colors'

export {
  fontFamilies,
  fontSizes,
  fontWeights,
  lineHeights,
  letterSpacings,
  typographyPresets,
} from './typography'

export { spacing, semanticSpacing, containerWidths } from './spacing'

export { shadows, dropShadows, textShadows } from './shadows'

export { easings, durations, transitions, animations, keyframes } from './animations'

export { borderWidths, borderStyles, borderRadius, borders, outlines, dividers } from './borders'

export { breakpoints, mediaQueries, breakpointUtils, layouts } from './breakpoints'

export { iconSizes, iconSizeValues, iconStrokes } from './icons'

/**
 * Generate all CSS variables for the theme system
 */
export function generateAllCSSVariables(): string {
  return [
    generateColorCSSVariables(),
    generateTypographyCSSVariables(),
    generateSpacingCSSVariables(),
    generateShadowCSSVariables(),
    generateAnimationCSS(),
    generateBorderCSSVariables(),
    generateBreakpointCSSVariables(),
    generateIconCSSVariables(),
  ].join('\n')
}

/**
 * Token types for TypeScript
 */
export interface DesignTokens {
  colors: typeof import('./colors')
  typography: typeof import('./typography')
  spacing: typeof import('./spacing')
  shadows: typeof import('./shadows')
  animations: typeof import('./animations')
  borders: typeof import('./borders')
  breakpoints: typeof import('./breakpoints')
  icons: typeof import('./icons')
}

/**
 * Utility function to apply tokens to the document
 */
export function applyTokensToDocument(tokens: Record<string, string>): void {
  const root = document.documentElement
  Object.entries(tokens).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value)
  })
}

/**
 * Utility function to get a CSS variable value
 */
export function getCSSVariable(name: string): string {
  const root = document.documentElement
  return getComputedStyle(root).getPropertyValue(`--${name}`).trim()
}

/**
 * Utility function to set a CSS variable value
 */
export function setCSSVariable(name: string, value: string): void {
  const root = document.documentElement
  root.style.setProperty(`--${name}`, value)
}

/**
 * Utility function to remove a CSS variable
 */
export function removeCSSVariable(name: string): void {
  const root = document.documentElement
  root.style.removeProperty(`--${name}`)
}

/**
 * Batch update CSS variables
 */
export function batchUpdateCSSVariables(updates: Record<string, string>): void {
  const root = document.documentElement
  Object.entries(updates).forEach(([name, value]) => {
    root.style.setProperty(`--${name}`, value)
  })
}

/**
 * Clear all custom CSS variables
 */
export function clearCSSVariables(): void {
  const root = document.documentElement
  const computedStyle = getComputedStyle(root)

  // Get all CSS custom properties
  const customProps = Array.from(computedStyle).filter((prop) => prop.startsWith('--'))

  // Remove each custom property
  customProps.forEach((prop) => {
    root.style.removeProperty(prop)
  })
}

/**
 * Export all CSS variables as an object
 */
export function exportCSSVariables(): Record<string, string> {
  const root = document.documentElement
  const computedStyle = getComputedStyle(root)
  const variables: Record<string, string> = {}

  // Get all CSS custom properties
  Array.from(computedStyle)
    .filter((prop) => prop.startsWith('--'))
    .forEach((prop) => {
      variables[prop] = computedStyle.getPropertyValue(prop).trim()
    })

  return variables
}
