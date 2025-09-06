/**
 * InfiniFox Icon Tokens
 * Standardized icon sizing system
 */

/**
 * Icon size scale
 * Consistent sizing for all icons across the application
 */
export const iconSizes = {
  xs: '12px',
  sm: '14px',
  base: '16px',
  md: '18px',
  lg: '20px',
  xl: '24px',
  '2xl': '32px',
} as const

/**
 * Icon size numeric values (for lucide-preact size prop)
 */
export const iconSizeValues = {
  xs: 12,
  sm: 14,
  base: 16,
  md: 18,
  lg: 20,
  xl: 24,
  '2xl': 32,
} as const

/**
 * Icon stroke widths
 */
export const iconStrokes = {
  thin: 1,
  light: 1.5,
  base: 2,
  medium: 2.5,
  bold: 3,
} as const

/**
 * Generate CSS variables for icons
 */
export function generateIconCSSVariables(): string {
  const variables: string[] = []
  
  // Icon sizes
  Object.entries(iconSizes).forEach(([key, value]) => {
    variables.push(`  --icon-size-${key}: ${value};`)
  })
  
  // Icon strokes
  Object.entries(iconStrokes).forEach(([key, value]) => {
    variables.push(`  --icon-stroke-${key}: ${value};`)
  })
  
  return variables.join('\n')
}

/**
 * Type exports
 */
export type IconSize = keyof typeof iconSizes
export type IconStroke = keyof typeof iconStrokes
