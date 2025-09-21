/**
 * Selection Style Utilities
 * Helper functions to get selection styles from CSS variables
 * These values are defined in themes/styles/components/selection.css
 */

export interface SelectionStyles {
  stroke: string
  strokeWidth: number
  strokeOpacity?: number
  fill?: string
  shadowColor?: string
  shadowBlur?: number
  shadowOpacity?: number
  shadowOffsetX?: number
  shadowOffsetY?: number
}

/**
 * Get selection border styles based on type and state
 */
export function getSelectionBorderStyles(
  type: 'artboard' | 'image' | 'group',
  isActive: boolean = false
): SelectionStyles {
  // Get computed styles from root
  const root = getComputedStyle(document.documentElement)

  // Base colors and values from CSS variables
  const primaryRgb = root.getPropertyValue('--selection-glow-color-rgb').trim() || '100, 108, 255'
  const borderWidth = isActive
    ? parseFloat(root.getPropertyValue('--border-width-medium').trim()) || 2
    : parseFloat(root.getPropertyValue('--border-width-base').trim()) || 1.5
  const borderOpacity = isActive
    ? parseFloat(root.getPropertyValue('--selection-border-opacity-active').trim()) || 1
    : parseFloat(root.getPropertyValue('--selection-border-opacity-base').trim()) || 0.85

  return {
    stroke: `rgba(${primaryRgb}, ${borderOpacity})`,
    strokeWidth: borderWidth,
    fill: 'transparent',
  }
}

/**
 * Get selection glow styles based on type and state
 */
export function getSelectionGlowStyles(
  type: 'artboard' | 'image' | 'group',
  isActive: boolean = false,
  scale: number = 1
): SelectionStyles {
  const root = getComputedStyle(document.documentElement)
  const primaryRgb = root.getPropertyValue('--selection-glow-color-rgb').trim() || '100, 108, 255'

  let shadowBlur: number
  let shadowOpacity: number

  switch (type) {
    case 'artboard':
      shadowBlur = isActive
        ? parseFloat(root.getPropertyValue('--selection-glow-blur-xl').trim()) || 50
        : parseFloat(root.getPropertyValue('--selection-glow-blur-lg').trim()) || 40
      shadowOpacity = isActive
        ? parseFloat(root.getPropertyValue('--selection-glow-opacity-intense').trim()) || 0.85
        : parseFloat(root.getPropertyValue('--selection-glow-opacity-strong').trim()) || 0.7
      break

    case 'image':
      shadowBlur = isActive
        ? parseFloat(root.getPropertyValue('--selection-glow-blur-base').trim()) || 25
        : parseFloat(root.getPropertyValue('--selection-glow-blur-sm').trim()) || 15
      shadowOpacity = isActive
        ? parseFloat(root.getPropertyValue('--selection-glow-opacity-base').trim()) || 0.5
        : parseFloat(root.getPropertyValue('--selection-glow-opacity-subtle').trim()) || 0.3
      break

    case 'group':
      shadowBlur = parseFloat(root.getPropertyValue('--selection-glow-blur-base').trim()) || 25
      shadowOpacity =
        parseFloat(root.getPropertyValue('--selection-glow-opacity-base').trim()) || 0.5
      break

    default:
      shadowBlur = 25
      shadowOpacity = 0.5
  }

  // Adjust for zoom level
  if (scale < 0.2) {
    // Very low zoom - hide glow
    return {
      stroke: 'transparent',
      strokeWidth: 0,
      fill: 'transparent',
    }
  } else if (scale < 0.5) {
    // Low zoom - reduce glow
    shadowBlur *= 0.5
    shadowOpacity *= 0.5
  } else if (scale > 2) {
    // High zoom - enhance glow
    shadowBlur *= 1.2
  }

  return {
    stroke: 'transparent',
    strokeWidth: 0,
    fill: 'transparent',
    shadowColor: `rgba(${primaryRgb}, ${shadowOpacity})`,
    shadowBlur,
    shadowOpacity,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
  }
}

/**
 * Get drag hover styles
 */
export function getDragHoverStyles(): SelectionStyles {
  const root = getComputedStyle(document.documentElement)
  const primaryRgb = root.getPropertyValue('--selection-glow-color-rgb').trim() || '100, 108, 255'

  return {
    stroke: `rgba(${primaryRgb}, 0.6)`,
    strokeWidth: 3,
    fill: `rgba(${primaryRgb}, 0.05)`,
  }
}

/**
 * Check if selection effects should be visible at current zoom
 */
export function shouldShowSelectionEffects(scale: number): boolean {
  return scale >= 0.2
}

/**
 * Get zoom level category for CSS classes
 */
export function getZoomLevelCategory(scale: number): 'very-low' | 'low' | 'normal' | 'high' {
  if (scale < 0.2) return 'very-low'
  if (scale < 0.5) return 'low'
  if (scale > 2) return 'high'
  return 'normal'
}
