/**
 * InfiniFox Border Tokens
 * Comprehensive border system for consistent styling
 */

// Border widths
export const borderWidths = {
  none: '0',
  hairline: '0.5px',
  thin: '1px',
  base: '1px',
  medium: '2px',
  thick: '3px',
  bold: '4px',
  heavy: '6px',
  massive: '8px',
} as const

// Border styles
export const borderStyles = {
  none: 'none',
  solid: 'solid',
  dashed: 'dashed',
  dotted: 'dotted',
  double: 'double',
  hidden: 'hidden',
  groove: 'groove',
  ridge: 'ridge',
  inset: 'inset',
  outset: 'outset',
} as const

// Border radius scales
export const borderRadius = {
  none: '0',
  xs: '2px',
  sm: '4px',
  base: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '20px',
  '3xl': '24px',
  '4xl': '32px',
  full: '9999px',
  circle: '50%',
} as const

// Component-specific border radius
export const componentRadius = {
  button: {
    sm: borderRadius.sm,
    base: borderRadius.base,
    lg: borderRadius.md,
    xl: borderRadius.lg,
    pill: borderRadius.full,
  },
  input: {
    sm: borderRadius.xs,
    base: borderRadius.sm,
    lg: borderRadius.base,
  },
  card: {
    sm: borderRadius.base,
    base: borderRadius.md,
    lg: borderRadius.lg,
    xl: borderRadius.xl,
  },
  panel: {
    sm: borderRadius.base,
    base: borderRadius.md,
    lg: borderRadius.lg,
    xl: borderRadius.xl,
  },
  modal: {
    sm: borderRadius.md,
    base: borderRadius.lg,
    lg: borderRadius.xl,
  },
  tooltip: {
    sm: borderRadius.xs,
    base: borderRadius.sm,
    lg: borderRadius.base,
  },
  badge: {
    sm: borderRadius.xs,
    base: borderRadius.sm,
    lg: borderRadius.base,
    pill: borderRadius.full,
  },
  avatar: {
    sm: borderRadius.base,
    base: borderRadius.md,
    lg: borderRadius.lg,
    circle: borderRadius.circle,
  },
  toolbar: {
    sm: borderRadius.base,
    base: borderRadius.md,
    lg: borderRadius.lg,
  },
} as const

// Border colors (references color tokens)
export const borderColors = {
  // Base borders
  default: 'var(--color-border-primary)',
  subtle: 'var(--color-border-secondary)',
  transparent: 'transparent',

  // Interactive borders
  interactive: 'var(--color-border-primary)',
  interactiveHover: 'var(--color-primary-400)',
  interactiveFocus: 'var(--color-border-focus)',
  interactiveActive: 'var(--color-primary-600)',

  // State borders
  success: 'var(--color-border-success)',
  warning: 'var(--color-border-warning)',
  error: 'var(--color-border-error)',
  info: 'var(--color-info-500)',

  // Component-specific
  input: {
    default: 'var(--color-border-primary)',
    hover: 'rgba(255, 255, 255, 0.15)',
    focus: 'var(--color-border-focus)',
    error: 'var(--color-border-error)',
    success: 'var(--color-border-success)',
    disabled: 'rgba(255, 255, 255, 0.05)',
  },

  card: {
    default: 'var(--color-border-primary)',
    hover: 'rgba(255, 255, 255, 0.15)',
    selected: 'var(--color-primary-500)',
  },

  divider: {
    light: 'rgba(255, 255, 255, 0.05)',
    default: 'var(--color-border-primary)',
    strong: 'rgba(255, 255, 255, 0.2)',
  },
} as const

// Border presets - complete border definitions
export const borders = {
  // Base borders
  none: 'none',
  default: `${borderWidths.thin} ${borderStyles.solid} ${borderColors.default}`,
  subtle: `${borderWidths.thin} ${borderStyles.solid} ${borderColors.subtle}`,
  strong: `${borderWidths.medium} ${borderStyles.solid} ${borderColors.default}`,

  // Interactive borders
  interactive: `${borderWidths.thin} ${borderStyles.solid} ${borderColors.interactive}`,
  interactiveHover: `${borderWidths.thin} ${borderStyles.solid} ${borderColors.interactiveHover}`,
  interactiveFocus: `${borderWidths.medium} ${borderStyles.solid} ${borderColors.interactiveFocus}`,

  // State borders
  success: `${borderWidths.thin} ${borderStyles.solid} ${borderColors.success}`,
  warning: `${borderWidths.thin} ${borderStyles.solid} ${borderColors.warning}`,
  error: `${borderWidths.thin} ${borderStyles.solid} ${borderColors.error}`,
  info: `${borderWidths.thin} ${borderStyles.solid} ${borderColors.info}`,

  // Style variations
  dashed: `${borderWidths.thin} ${borderStyles.dashed} ${borderColors.default}`,
  dotted: `${borderWidths.thin} ${borderStyles.dotted} ${borderColors.default}`,
  double: `${borderWidths.thick} ${borderStyles.double} ${borderColors.default}`,
} as const

// Outline styles (for focus states)
export const outlines = {
  none: 'none',
  default: `${borderWidths.medium} ${borderStyles.solid} ${borderColors.interactiveFocus}`,
  subtle: `${borderWidths.thin} ${borderStyles.solid} ${borderColors.interactiveFocus}`,
  strong: `${borderWidths.thick} ${borderStyles.solid} ${borderColors.interactiveFocus}`,

  // Offset outlines
  offset: {
    sm: '1px',
    base: '2px',
    lg: '4px',
  },

  // Ring styles (box-shadow based)
  ring: {
    sm: `0 0 0 1px ${borderColors.interactiveFocus}`,
    base: `0 0 0 2px ${borderColors.interactiveFocus}`,
    lg: `0 0 0 3px ${borderColors.interactiveFocus}`,
    xl: `0 0 0 4px ${borderColors.interactiveFocus}`,
  },

  // Colored rings
  ringColored: {
    primary: `0 0 0 3px rgba(100, 108, 255, 0.3)`,
    success: `0 0 0 3px rgba(76, 175, 80, 0.3)`,
    warning: `0 0 0 3px rgba(255, 152, 0, 0.3)`,
    error: `0 0 0 3px rgba(244, 67, 54, 0.3)`,
    info: `0 0 0 3px rgba(33, 150, 243, 0.3)`,
  },
} as const

// Divider styles
export const dividers = {
  horizontal: {
    light: `${borderWidths.thin} ${borderStyles.solid} ${borderColors.divider.light}`,
    default: `${borderWidths.thin} ${borderStyles.solid} ${borderColors.divider.default}`,
    strong: `${borderWidths.thin} ${borderStyles.solid} ${borderColors.divider.strong}`,
    thick: `${borderWidths.medium} ${borderStyles.solid} ${borderColors.divider.default}`,
  },
  vertical: {
    light: `${borderWidths.thin} ${borderStyles.solid} ${borderColors.divider.light}`,
    default: `${borderWidths.thin} ${borderStyles.solid} ${borderColors.divider.default}`,
    strong: `${borderWidths.thin} ${borderStyles.solid} ${borderColors.divider.strong}`,
    thick: `${borderWidths.medium} ${borderStyles.solid} ${borderColors.divider.default}`,
  },
} as const

// Generate CSS variables from tokens
export function generateBorderCSSVariables(): string {
  let css = ':root {\n'

  // Border widths
  css += '  /* Border Widths */\n'
  Object.entries(borderWidths).forEach(([name, value]) => {
    css += `  --border-width-${name}: ${value};\n`
  })

  // Border radius
  css += '\n  /* Border Radius */\n'
  Object.entries(borderRadius).forEach(([name, value]) => {
    css += `  --radius-${name}: ${value};\n`
  })

  // Component radius
  css += '\n  /* Component Border Radius */\n'
  Object.entries(componentRadius).forEach(([component, sizes]) => {
    Object.entries(sizes).forEach(([size, value]) => {
      css += `  --radius-${component}-${size}: ${value};\n`
    })
  })

  // Border presets
  css += '\n  /* Border Presets */\n'
  Object.entries(borders).forEach(([name, value]) => {
    const varName = name.replace(/([A-Z])/g, '-$1').toLowerCase()
    css += `  --border-${varName}: ${value};\n`
  })

  // Outline offsets
  css += '\n  /* Outline Offsets */\n'
  Object.entries(outlines.offset).forEach(([name, value]) => {
    css += `  --outline-offset-${name}: ${value};\n`
  })

  // Ring styles
  css += '\n  /* Focus Rings */\n'
  Object.entries(outlines.ring).forEach(([name, value]) => {
    css += `  --ring-${name}: ${value};\n`
  })
  Object.entries(outlines.ringColored).forEach(([name, value]) => {
    css += `  --ring-${name}: ${value};\n`
  })

  css += '}\n'

  return css
}

// Type exports for TypeScript
export type BorderWidth = keyof typeof borderWidths
export type BorderStyle = keyof typeof borderStyles
export type BorderRadius = keyof typeof borderRadius
export type Border = keyof typeof borders
export type Outline = keyof typeof outlines
export type Divider = keyof typeof dividers
