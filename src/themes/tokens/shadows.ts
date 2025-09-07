/**
 * InfiniFox Shadow Tokens
 * Comprehensive shadow system for depth and elevation
 */

// Box Shadow tokens
export const shadows = {
  // Elevation shadows (Material Design inspired)
  none: 'none',
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  base: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  md: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  lg: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  xl: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  '2xl': '0 35px 60px -15px rgba(0, 0, 0, 0.3)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',

  // Dark mode optimized shadows
  dark: {
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.2)',
    sm: '0 2px 4px 0 rgba(0, 0, 0, 0.3)',
    base: '0 2px 10px rgba(0, 0, 0, 0.3)',
    md: '0 4px 20px rgba(0, 0, 0, 0.4)',
    lg: '0 4px 20px rgba(0, 0, 0, 0.5)',
    xl: '0 8px 30px rgba(0, 0, 0, 0.6)',
    '2xl': '0 12px 40px rgba(0, 0, 0, 0.7)',
  },

  // Glow effects
  glow: {
    sm: '0 0 5px rgba(100, 108, 255, 0.2)',
    base: '0 0 10px rgba(100, 108, 255, 0.3)',
    md: '0 0 15px rgba(100, 108, 255, 0.4)',
    lg: '0 0 20px rgba(100, 108, 255, 0.5)',
    xl: '0 0 30px rgba(100, 108, 255, 0.6)',
    intense: '0 0 40px rgba(100, 108, 255, 0.8)',
  },

  // Colored shadows
  colored: {
    primary: '0 4px 20px rgba(100, 108, 255, 0.2)',
    success: '0 4px 20px rgba(76, 175, 80, 0.2)',
    warning: '0 4px 20px rgba(255, 152, 0, 0.2)',
    error: '0 4px 20px rgba(244, 67, 54, 0.2)',
    info: '0 4px 20px rgba(33, 150, 243, 0.2)',
  },

  // Focus shadows
  focus: {
    default: '0 0 0 3px rgba(100, 108, 255, 0.3)',
    primary: '0 0 0 3px rgba(100, 108, 255, 0.3)',
    success: '0 0 0 3px rgba(76, 175, 80, 0.3)',
    warning: '0 0 0 3px rgba(255, 152, 0, 0.3)',
    error: '0 0 0 3px rgba(244, 67, 54, 0.3)',
    info: '0 0 0 3px rgba(33, 150, 243, 0.3)',
  },

  // Component-specific shadows
  button: {
    default: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
    hover: '0 3px 6px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.12)',
    active: '0 1px 2px rgba(0, 0, 0, 0.2)',
    focus: '0 0 0 3px rgba(100, 108, 255, 0.3)',
  },

  card: {
    default: '0 2px 8px rgba(0, 0, 0, 0.1)',
    hover: '0 4px 16px rgba(0, 0, 0, 0.15)',
    dragging: '0 8px 24px rgba(0, 0, 0, 0.2)',
  },

  panel: {
    default: '0 2px 10px rgba(0, 0, 0, 0.3)',
    elevated: '0 4px 20px rgba(0, 0, 0, 0.4)',
    floating: '0 8px 30px rgba(0, 0, 0, 0.5)',
  },

  toolbar: {
    default: '0 2px 10px rgba(0, 0, 0, 0.3)',
    floating: '0 4px 20px rgba(0, 0, 0, 0.4)',
  },

  modal: {
    backdrop: 'inset 0 0 0 100vmax rgba(0, 0, 0, 0.5)',
    content: '0 20px 60px rgba(0, 0, 0, 0.3)',
  },

  dropdown: {
    default: '0 10px 40px rgba(0, 0, 0, 0.2)',
  },

  tooltip: {
    default: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },
} as const

// Drop Shadow filters (for icons and SVGs)
export const dropShadows = {
  none: 'none',
  xs: 'drop-shadow(0 1px 1px rgba(0, 0, 0, 0.05))',
  sm: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))',
  base: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))',
  md: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))',
  lg: 'drop-shadow(0 10px 15px rgba(0, 0, 0, 0.1))',
  xl: 'drop-shadow(0 20px 25px rgba(0, 0, 0, 0.1))',
  '2xl': 'drop-shadow(0 25px 50px rgba(0, 0, 0, 0.15))',

  // Glow drop shadows
  glow: {
    sm: 'drop-shadow(0 0 3px rgba(100, 108, 255, 0.3))',
    base: 'drop-shadow(0 0 5px rgba(100, 108, 255, 0.4))',
    md: 'drop-shadow(0 0 10px rgba(100, 108, 255, 0.5))',
    lg: 'drop-shadow(0 0 15px rgba(100, 108, 255, 0.6))',
  },

  // Colored drop shadows
  colored: {
    primary: 'drop-shadow(0 2px 4px rgba(100, 108, 255, 0.3))',
    success: 'drop-shadow(0 2px 4px rgba(76, 175, 80, 0.3))',
    warning: 'drop-shadow(0 2px 4px rgba(255, 152, 0, 0.3))',
    error: 'drop-shadow(0 2px 4px rgba(244, 67, 54, 0.3))',
    info: 'drop-shadow(0 2px 4px rgba(33, 150, 243, 0.3))',
  },
} as const

// Text shadows
export const textShadows = {
  none: 'none',
  sm: '0 1px 2px rgba(0, 0, 0, 0.2)',
  base: '0 2px 4px rgba(0, 0, 0, 0.3)',
  lg: '0 3px 6px rgba(0, 0, 0, 0.4)',

  // Glow text shadows
  glow: {
    sm: '0 0 3px rgba(100, 108, 255, 0.5)',
    base: '0 0 5px rgba(100, 108, 255, 0.6)',
    lg: '0 0 10px rgba(100, 108, 255, 0.7)',
  },

  // Outline text shadows (for better readability)
  outline: {
    light: '0 0 2px rgba(255, 255, 255, 0.8)',
    dark: '0 0 2px rgba(0, 0, 0, 0.8)',
  },
} as const

// Generate CSS variables from tokens
export function generateShadowCSSVariables(): string {
  let css = ':root {\n'

  // Box shadows
  css += '  /* Box Shadows */\n'
  Object.entries(shadows).forEach(([category, values]) => {
    if (typeof values === 'object' && !Array.isArray(values)) {
      Object.entries(values).forEach(([name, value]) => {
        if (typeof value === 'object') {
          Object.entries(value).forEach(([subName, subValue]) => {
            css += `  --shadow-${category}-${name}-${subName}: ${subValue};\n`
          })
        } else {
          css += `  --shadow-${category}-${name}: ${value};\n`
        }
      })
    } else {
      css += `  --shadow-${category}: ${values};\n`
    }
  })

  // Drop shadows
  css += '\n  /* Drop Shadows */\n'
  Object.entries(dropShadows).forEach(([category, value]) => {
    if (typeof value === 'object') {
      Object.entries(value).forEach(([name, shadowValue]) => {
        css += `  --drop-shadow-${category}-${name}: ${shadowValue};\n`
      })
    } else {
      css += `  --drop-shadow-${category}: ${value};\n`
    }
  })

  // Text shadows
  css += '\n  /* Text Shadows */\n'
  Object.entries(textShadows).forEach(([category, value]) => {
    if (typeof value === 'object') {
      Object.entries(value).forEach(([name, shadowValue]) => {
        css += `  --text-shadow-${category}-${name}: ${shadowValue};\n`
      })
    } else {
      css += `  --text-shadow-${category}: ${value};\n`
    }
  })

  css += '}\n'

  return css
}

// Type exports for TypeScript
export type Shadow = keyof typeof shadows
export type DropShadow = keyof typeof dropShadows
export type TextShadow = keyof typeof textShadows
