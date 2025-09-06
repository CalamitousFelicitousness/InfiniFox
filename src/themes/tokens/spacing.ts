/**
 * InfiniFox Spacing Tokens
 * Consistent spacing scale for margins, paddings, and gaps
 */

// Base spacing unit (4px)
const SPACING_UNIT = 4

// Spacing Scale - Using 4px base unit
export const spacing = {
  0: '0',
  px: '1px',
  0.5: `${SPACING_UNIT * 0.5}px`,    // 2px
  1: `${SPACING_UNIT * 1}px`,        // 4px
  1.5: `${SPACING_UNIT * 1.5}px`,    // 6px
  2: `${SPACING_UNIT * 2}px`,        // 8px
  2.5: `${SPACING_UNIT * 2.5}px`,    // 10px
  3: `${SPACING_UNIT * 3}px`,        // 12px
  3.5: `${SPACING_UNIT * 3.5}px`,    // 14px
  4: `${SPACING_UNIT * 4}px`,        // 16px
  5: `${SPACING_UNIT * 5}px`,        // 20px
  6: `${SPACING_UNIT * 6}px`,        // 24px
  7: `${SPACING_UNIT * 7}px`,        // 28px
  8: `${SPACING_UNIT * 8}px`,        // 32px
  9: `${SPACING_UNIT * 9}px`,        // 36px
  10: `${SPACING_UNIT * 10}px`,      // 40px
  11: `${SPACING_UNIT * 11}px`,      // 44px
  12: `${SPACING_UNIT * 12}px`,      // 48px
  14: `${SPACING_UNIT * 14}px`,      // 56px
  16: `${SPACING_UNIT * 16}px`,      // 64px
  18: `${SPACING_UNIT * 18}px`,      // 72px
  20: `${SPACING_UNIT * 20}px`,      // 80px
  24: `${SPACING_UNIT * 24}px`,      // 96px
  28: `${SPACING_UNIT * 28}px`,      // 112px
  32: `${SPACING_UNIT * 32}px`,      // 128px
  36: `${SPACING_UNIT * 36}px`,      // 144px
  40: `${SPACING_UNIT * 40}px`,      // 160px
  44: `${SPACING_UNIT * 44}px`,      // 176px
  48: `${SPACING_UNIT * 48}px`,      // 192px
  52: `${SPACING_UNIT * 52}px`,      // 208px
  56: `${SPACING_UNIT * 56}px`,      // 224px
  60: `${SPACING_UNIT * 60}px`,      // 240px
  64: `${SPACING_UNIT * 64}px`,      // 256px
  72: `${SPACING_UNIT * 72}px`,      // 288px
  80: `${SPACING_UNIT * 80}px`,      // 320px
  96: `${SPACING_UNIT * 96}px`,      // 384px
} as const

// Semantic spacing for specific use cases
export const semanticSpacing = {
  // Component padding
  component: {
    xs: spacing[2],     // 8px
    sm: spacing[3],     // 12px
    base: spacing[4],   // 16px
    lg: spacing[5],     // 20px
    xl: spacing[6],     // 24px
  },
  
  // Content sections
  section: {
    xs: spacing[4],     // 16px
    sm: spacing[6],     // 24px
    base: spacing[8],   // 32px
    lg: spacing[12],    // 48px
    xl: spacing[16],    // 64px
  },
  
  // Form elements
  form: {
    fieldGap: spacing[4],      // 16px
    groupGap: spacing[6],       // 24px
    sectionGap: spacing[8],     // 32px
    inputPaddingX: spacing[3],  // 12px
    inputPaddingY: spacing[2],  // 8px
  },
  
  // Grid and layout
  grid: {
    gap: {
      xs: spacing[2],   // 8px
      sm: spacing[3],   // 12px
      base: spacing[4], // 16px
      lg: spacing[6],   // 24px
      xl: spacing[8],   // 32px
    },
    margin: {
      xs: spacing[2],   // 8px
      sm: spacing[4],   // 16px
      base: spacing[6], // 24px
      lg: spacing[8],   // 32px
      xl: spacing[12],  // 48px
    },
  },
  
  // Button spacing
  button: {
    paddingX: {
      xs: spacing[2],   // 8px
      sm: spacing[3],   // 12px
      base: spacing[4], // 16px
      lg: spacing[6],   // 24px
      xl: spacing[8],   // 32px
    },
    paddingY: {
      xs: spacing[1],     // 4px
      sm: spacing[2],     // 8px
      base: spacing[2.5], // 10px
      lg: spacing[3],     // 12px
      xl: spacing[4],     // 16px
    },
    iconGap: spacing[2], // 8px
  },
  
  // Panel spacing
  panel: {
    padding: {
      xs: spacing[3],   // 12px
      sm: spacing[4],   // 16px
      base: spacing[5], // 20px
      lg: spacing[6],   // 24px
      xl: spacing[8],   // 32px
    },
    headerGap: spacing[3],    // 12px
    contentGap: spacing[4],   // 16px
    sectionGap: spacing[6],   // 24px
  },
  
  // Toolbar spacing
  toolbar: {
    padding: spacing[2],       // 8px
    gap: spacing[2],          // 8px
    groupGap: spacing[3],     // 12px
    itemPadding: spacing[1.5], // 6px
  },
  
  // Modal/Dialog spacing
  modal: {
    padding: {
      sm: spacing[4],   // 16px
      base: spacing[6], // 24px
      lg: spacing[8],   // 32px
    },
    headerGap: spacing[4],   // 16px
    contentGap: spacing[5],  // 20px
    footerGap: spacing[4],   // 16px
  },
  
  // Card spacing
  card: {
    padding: {
      xs: spacing[3],   // 12px
      sm: spacing[4],   // 16px
      base: spacing[5], // 20px
      lg: spacing[6],   // 24px
      xl: spacing[8],   // 32px
    },
    gap: spacing[3], // 12px
  },
  
  // List spacing
  list: {
    itemGap: spacing[2],      // 8px
    itemPadding: spacing[3],  // 12px
    nestedIndent: spacing[6], // 24px
  },
  
  // Icon spacing
  icon: {
    padding: spacing[1],      // 4px
    margin: spacing[2],       // 8px
    gap: spacing[2],         // 8px
  },
} as const

// Container max widths
export const containerWidths = {
  xs: '320px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
  '3xl': '1920px',
  full: '100%',
} as const

// Generate CSS variables from tokens
export function generateSpacingCSSVariables(): string {
  let css = ':root {\n'
  
  // Base spacing scale
  css += '  /* Spacing Scale */\n'
  Object.entries(spacing).forEach(([name, value]) => {
    const varName = name.replace('.', '-')
    css += `  --spacing-${varName}: ${value};\n`
  })
  
  // Component spacing
  css += '\n  /* Component Spacing */\n'
  Object.entries(semanticSpacing.component).forEach(([name, value]) => {
    css += `  --spacing-component-${name}: ${value};\n`
  })
  
  // Section spacing
  css += '\n  /* Section Spacing */\n'
  Object.entries(semanticSpacing.section).forEach(([name, value]) => {
    css += `  --spacing-section-${name}: ${value};\n`
  })
  
  // Form spacing
  css += '\n  /* Form Spacing */\n'
  Object.entries(semanticSpacing.form).forEach(([name, value]) => {
    const varName = name.replace(/([A-Z])/g, '-$1').toLowerCase()
    css += `  --spacing-form-${varName}: ${value};\n`
  })
  
  // Panel spacing
  css += '\n  /* Panel Spacing */\n'
  Object.entries(semanticSpacing.panel).forEach(([category, values]) => {
    if (typeof values === 'object') {
      Object.entries(values).forEach(([name, value]) => {
        css += `  --spacing-panel-${category}-${name}: ${value};\n`
      })
    } else {
      const varName = category.replace(/([A-Z])/g, '-$1').toLowerCase()
      css += `  --spacing-panel-${varName}: ${values};\n`
    }
  })
  
  // Button spacing
  css += '\n  /* Button Spacing */\n'
  Object.entries(semanticSpacing.button).forEach(([category, values]) => {
    if (typeof values === 'object') {
      Object.entries(values).forEach(([name, value]) => {
        css += `  --spacing-button-${category}-${name}: ${value};\n`
      })
    } else {
      const varName = category.replace(/([A-Z])/g, '-$1').toLowerCase()
      css += `  --spacing-button-${varName}: ${values};\n`
    }
  })
  
  // Toolbar spacing
  css += '\n  /* Toolbar Spacing */\n'
  Object.entries(semanticSpacing.toolbar).forEach(([name, value]) => {
    const varName = name.replace(/([A-Z])/g, '-$1').toLowerCase()
    css += `  --spacing-toolbar-${varName}: ${value};\n`
  })
  
  // Container widths
  css += '\n  /* Container Widths */\n'
  Object.entries(containerWidths).forEach(([name, value]) => {
    css += `  --container-${name}: ${value};\n`
  })
  
  css += '}\n'
  
  return css
}

// Type exports for TypeScript
export type SpacingScale = keyof typeof spacing
export type SemanticSpacing = typeof semanticSpacing
export type ContainerWidth = keyof typeof containerWidths
