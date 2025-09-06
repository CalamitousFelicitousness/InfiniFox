/**
 * InfiniFox Typography Tokens
 * Comprehensive typography system with consistent scales
 */

// Font Families
export const fontFamilies = {
  base: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  mono: "'Fira Code', 'Courier New', Consolas, 'Liberation Mono', Menlo, Monaco, monospace",
  display: "'Inter', system-ui, -apple-system, sans-serif",
} as const

// Font Sizes - Using modular scale (1.25 ratio)
export const fontSizes = {
  '2xs': '0.625rem',    // 10px
  xs: '0.75rem',        // 12px
  sm: '0.875rem',       // 14px
  base: '1rem',         // 16px
  lg: '1.125rem',       // 18px
  xl: '1.25rem',        // 20px
  '2xl': '1.5rem',      // 24px
  '3xl': '1.875rem',    // 30px
  '4xl': '2.25rem',     // 36px
  '5xl': '3rem',        // 48px
  '6xl': '3.75rem',     // 60px
  '7xl': '4.5rem',      // 72px
} as const

// Font Weights
export const fontWeights = {
  thin: 100,
  extralight: 200,
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
} as const

// Line Heights
export const lineHeights = {
  none: 1,
  tight: 1.25,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 1.75,
  body: 1.625,
  heading: 1.2,
} as const

// Letter Spacing
export const letterSpacings = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em',
} as const

// Text Transforms
export const textTransforms = {
  none: 'none',
  uppercase: 'uppercase',
  lowercase: 'lowercase',
  capitalize: 'capitalize',
} as const

// Text Decorations
export const textDecorations = {
  none: 'none',
  underline: 'underline',
  overline: 'overline',
  lineThrough: 'line-through',
} as const

// Typography Presets - Combination of above tokens
export const typographyPresets = {
  // Display
  display1: {
    fontFamily: fontFamilies.display,
    fontSize: fontSizes['6xl'],
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.heading,
    letterSpacing: letterSpacings.tight,
  },
  display2: {
    fontFamily: fontFamilies.display,
    fontSize: fontSizes['5xl'],
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.heading,
    letterSpacing: letterSpacings.tight,
  },
  display3: {
    fontFamily: fontFamilies.display,
    fontSize: fontSizes['4xl'],
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.heading,
    letterSpacing: letterSpacings.tight,
  },

  // Headings
  h1: {
    fontFamily: fontFamilies.base,
    fontSize: fontSizes['3xl'],
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.heading,
    letterSpacing: letterSpacings.tight,
  },
  h2: {
    fontFamily: fontFamilies.base,
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.heading,
    letterSpacing: letterSpacings.tight,
  },
  h3: {
    fontFamily: fontFamilies.base,
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.heading,
    letterSpacing: letterSpacings.normal,
  },
  h4: {
    fontFamily: fontFamilies.base,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.heading,
    letterSpacing: letterSpacings.normal,
  },
  h5: {
    fontFamily: fontFamilies.base,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.heading,
    letterSpacing: letterSpacings.normal,
  },
  h6: {
    fontFamily: fontFamilies.base,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.heading,
    letterSpacing: letterSpacings.wide,
    textTransform: textTransforms.uppercase,
  },

  // Body text
  bodyLarge: {
    fontFamily: fontFamilies.base,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.normal,
    lineHeight: lineHeights.body,
    letterSpacing: letterSpacings.normal,
  },
  bodyBase: {
    fontFamily: fontFamilies.base,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.normal,
    lineHeight: lineHeights.body,
    letterSpacing: letterSpacings.normal,
  },
  bodySmall: {
    fontFamily: fontFamilies.base,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.normal,
    lineHeight: lineHeights.body,
    letterSpacing: letterSpacings.normal,
  },
  bodyXSmall: {
    fontFamily: fontFamilies.base,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.normal,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacings.normal,
  },

  // UI elements
  button: {
    fontFamily: fontFamilies.base,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacings.wide,
  },
  buttonLarge: {
    fontFamily: fontFamilies.base,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacings.normal,
  },
  label: {
    fontFamily: fontFamilies.base,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacings.normal,
  },
  caption: {
    fontFamily: fontFamilies.base,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.normal,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacings.wide,
  },
  overline: {
    fontFamily: fontFamilies.base,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacings.widest,
    textTransform: textTransforms.uppercase,
  },

  // Code
  code: {
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.normal,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacings.normal,
  },
  codeBlock: {
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.normal,
    lineHeight: lineHeights.relaxed,
    letterSpacing: letterSpacings.normal,
  },
} as const

// Generate CSS variables from tokens
export function generateTypographyCSSVariables(): string {
  let css = ':root {\n'
  
  // Font families
  css += '  /* Font Families */\n'
  Object.entries(fontFamilies).forEach(([name, value]) => {
    css += `  --font-family-${name}: ${value};\n`
  })
  
  // Font sizes
  css += '\n  /* Font Sizes */\n'
  Object.entries(fontSizes).forEach(([name, value]) => {
    css += `  --font-size-${name}: ${value};\n`
  })
  
  // Font weights
  css += '\n  /* Font Weights */\n'
  Object.entries(fontWeights).forEach(([name, value]) => {
    css += `  --font-weight-${name}: ${value};\n`
  })
  
  // Line heights
  css += '\n  /* Line Heights */\n'
  Object.entries(lineHeights).forEach(([name, value]) => {
    css += `  --line-height-${name}: ${value};\n`
  })
  
  // Letter spacing
  css += '\n  /* Letter Spacing */\n'
  Object.entries(letterSpacings).forEach(([name, value]) => {
    css += `  --letter-spacing-${name}: ${value};\n`
  })
  
  css += '}\n'
  
  return css
}

// Type exports for TypeScript
export type FontFamily = keyof typeof fontFamilies
export type FontSize = keyof typeof fontSizes
export type FontWeight = keyof typeof fontWeights
export type LineHeight = keyof typeof lineHeights
export type LetterSpacing = keyof typeof letterSpacings
export type TypographyPreset = keyof typeof typographyPresets
