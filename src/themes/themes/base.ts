/**
 * InfiniFox Base Theme
 * Foundation theme structure that all themes extend from
 */

import * as tokens from '../tokens'
import type { Theme } from '../types'

/**
 * Create the base theme structure with all default tokens
 */
export const createBaseTheme = (): Theme => ({
  name: 'base',
  description: 'Base theme structure with default tokens',
  mode: 'dark',

  colors: {
    palette: tokens.corePalette,
    semantic: tokens.semanticColors,
  },

  typography: {
    families: tokens.fontFamilies,
    sizes: tokens.fontSizes,
    weights: tokens.fontWeights,
    lineHeights: tokens.lineHeights,
    letterSpacings: tokens.letterSpacings,
    presets: tokens.typographyPresets,
  },

  spacing: {
    scale: tokens.spacing,
    semantic: tokens.semanticSpacing,
    containers: tokens.containerWidths,
  },

  shadows: {
    box: tokens.shadows,
    drop: tokens.dropShadows,
    text: tokens.textShadows,
  },

  animations: {
    easings: tokens.easings,
    durations: tokens.durations,
    transitions: tokens.transitions,
    animations: tokens.animations,
    keyframes: tokens.keyframes,
  },

  borders: {
    widths: tokens.borderWidths,
    styles: tokens.borderStyles,
    radius: tokens.borderRadius,
    borders: tokens.borders,
    outlines: tokens.outlines,
    dividers: tokens.dividers,
  },

  breakpoints: {
    values: tokens.breakpoints,
    queries: tokens.mediaQueries,
    scale: tokens.responsiveScale,
    layouts: tokens.layouts,
  },
})

/**
 * Base theme instance
 */
export const baseTheme = createBaseTheme()
