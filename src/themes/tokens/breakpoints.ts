/**
 * InfiniFox Breakpoint Tokens
 * Responsive design breakpoints and media queries
 */

// Breakpoint values
export const breakpoints = {
  xs: '480px',    // Extra small devices (phones)
  sm: '640px',    // Small devices (large phones)
  md: '768px',    // Medium devices (tablets)
  lg: '1024px',   // Large devices (desktops)
  xl: '1280px',   // Extra large devices (large desktops)
  '2xl': '1536px', // 2X large devices (larger desktops)
  '3xl': '1920px', // 3X large devices (full HD)
  '4xl': '2560px', // 4X large devices (2K/QHD)
  '5xl': '3840px', // 5X large devices (4K/UHD)
} as const

// Media query helpers
export const mediaQueries = {
  // Min-width queries (mobile-first)
  xs: `@media (min-width: ${breakpoints.xs})`,
  sm: `@media (min-width: ${breakpoints.sm})`,
  md: `@media (min-width: ${breakpoints.md})`,
  lg: `@media (min-width: ${breakpoints.lg})`,
  xl: `@media (min-width: ${breakpoints.xl})`,
  '2xl': `@media (min-width: ${breakpoints['2xl']})`,
  '3xl': `@media (min-width: ${breakpoints['3xl']})`,
  '4xl': `@media (min-width: ${breakpoints['4xl']})`,
  '5xl': `@media (min-width: ${breakpoints['5xl']})`,
  
  // Max-width queries (desktop-first)
  xsDown: `@media (max-width: ${parseInt(breakpoints.xs) - 1}px)`,
  smDown: `@media (max-width: ${parseInt(breakpoints.sm) - 1}px)`,
  mdDown: `@media (max-width: ${parseInt(breakpoints.md) - 1}px)`,
  lgDown: `@media (max-width: ${parseInt(breakpoints.lg) - 1}px)`,
  xlDown: `@media (max-width: ${parseInt(breakpoints.xl) - 1}px)`,
  '2xlDown': `@media (max-width: ${parseInt(breakpoints['2xl']) - 1}px)`,
  '3xlDown': `@media (max-width: ${parseInt(breakpoints['3xl']) - 1}px)`,
  '4xlDown': `@media (max-width: ${parseInt(breakpoints['4xl']) - 1}px)`,
  
  // Range queries
  xsOnly: `@media (min-width: ${breakpoints.xs}) and (max-width: ${parseInt(breakpoints.sm) - 1}px)`,
  smOnly: `@media (min-width: ${breakpoints.sm}) and (max-width: ${parseInt(breakpoints.md) - 1}px)`,
  mdOnly: `@media (min-width: ${breakpoints.md}) and (max-width: ${parseInt(breakpoints.lg) - 1}px)`,
  lgOnly: `@media (min-width: ${breakpoints.lg}) and (max-width: ${parseInt(breakpoints.xl) - 1}px)`,
  xlOnly: `@media (min-width: ${breakpoints.xl}) and (max-width: ${parseInt(breakpoints['2xl']) - 1}px)`,
  
  // Orientation queries
  portrait: '@media (orientation: portrait)',
  landscape: '@media (orientation: landscape)',
  
  // Aspect ratio queries
  widescreen: '@media (min-aspect-ratio: 16/9)',
  ultrawide: '@media (min-aspect-ratio: 21/9)',
  square: '@media (aspect-ratio: 1/1)',
  
  // Device capability queries
  touch: '@media (hover: none) and (pointer: coarse)',
  stylus: '@media (hover: none) and (pointer: fine)',
  mouse: '@media (hover: hover) and (pointer: fine)',
  keyboard: '@media (hover: hover)',
  
  // Reduced motion
  reducedMotion: '@media (prefers-reduced-motion: reduce)',
  normalMotion: '@media (prefers-reduced-motion: no-preference)',
  
  // Color scheme
  darkMode: '@media (prefers-color-scheme: dark)',
  lightMode: '@media (prefers-color-scheme: light)',
  
  // High contrast
  highContrast: '@media (prefers-contrast: high)',
  lowContrast: '@media (prefers-contrast: low)',
  
  // Resolution queries
  retina: '@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)',
  highRes: '@media (-webkit-min-device-pixel-ratio: 1.5), (min-resolution: 144dpi)',
  
  // Print
  print: '@media print',
  screen: '@media screen',
} as const

// Container queries (for future use with container queries)
export const containerQueries = {
  xs: '@container (min-width: 480px)',
  sm: '@container (min-width: 640px)',
  md: '@container (min-width: 768px)',
  lg: '@container (min-width: 1024px)',
  xl: '@container (min-width: 1280px)',
} as const

// Responsive spacing scale multipliers
export const responsiveScale = {
  xs: 0.75,  // 75% of base
  sm: 0.875, // 87.5% of base
  base: 1,   // 100%
  lg: 1.125, // 112.5% of base
  xl: 1.25,  // 125% of base
  '2xl': 1.5, // 150% of base
} as const

// Responsive typography scale
export const responsiveTypography = {
  // Mobile scales
  mobile: {
    h1: '1.875rem', // 30px
    h2: '1.5rem',   // 24px
    h3: '1.25rem',  // 20px
    h4: '1.125rem', // 18px
    h5: '1rem',     // 16px
    h6: '0.875rem', // 14px
    body: '0.875rem', // 14px
    small: '0.75rem', // 12px
  },
  // Tablet scales
  tablet: {
    h1: '2.25rem', // 36px
    h2: '1.875rem', // 30px
    h3: '1.5rem',   // 24px
    h4: '1.25rem',  // 20px
    h5: '1.125rem', // 18px
    h6: '0.875rem', // 14px
    body: '1rem',   // 16px
    small: '0.875rem', // 14px
  },
  // Desktop scales
  desktop: {
    h1: '3rem',     // 48px
    h2: '2.25rem',  // 36px
    h3: '1.875rem', // 30px
    h4: '1.5rem',   // 24px
    h5: '1.25rem',  // 20px
    h6: '1rem',     // 16px
    body: '1rem',   // 16px
    small: '0.875rem', // 14px
  },
} as const

// Responsive grid columns
export const gridColumns = {
  mobile: {
    default: 1,
    max: 2,
  },
  tablet: {
    default: 2,
    max: 4,
  },
  desktop: {
    default: 3,
    max: 12,
  },
} as const

// Responsive layout configurations
export const layouts = {
  // Control panel widths
  controlPanel: {
    mobile: '100%',
    tablet: '320px',
    desktop: '400px',
    wide: '480px',
  },
  // Toolbar heights
  toolbar: {
    mobile: '48px',
    tablet: '56px',
    desktop: '64px',
  },
  // Modal sizes
  modal: {
    mobile: '95%',
    tablet: '80%',
    desktop: '60%',
    maxWidth: '1200px',
  },
  // Floating panel sizes
  floatingPanel: {
    mobile: '280px',
    tablet: '320px',
    desktop: '400px',
  },
} as const

// JavaScript helper functions
export const breakpointUtils = {
  // Get current breakpoint
  getCurrentBreakpoint: (): keyof typeof breakpoints => {
    const width = window.innerWidth
    const entries = Object.entries(breakpoints).reverse()
    
    for (const [key, value] of entries) {
      if (width >= parseInt(value)) {
        return key as keyof typeof breakpoints
      }
    }
    
    return 'xs'
  },
  
  // Check if viewport is at least a certain breakpoint
  isAtLeast: (breakpoint: keyof typeof breakpoints): boolean => {
    return window.innerWidth >= parseInt(breakpoints[breakpoint])
  },
  
  // Check if viewport is at most a certain breakpoint
  isAtMost: (breakpoint: keyof typeof breakpoints): boolean => {
    return window.innerWidth <= parseInt(breakpoints[breakpoint])
  },
  
  // Check if viewport is between two breakpoints
  isBetween: (
    min: keyof typeof breakpoints,
    max: keyof typeof breakpoints
  ): boolean => {
    const width = window.innerWidth
    return width >= parseInt(breakpoints[min]) && width <= parseInt(breakpoints[max])
  },
  
  // Check device capabilities
  isTouchDevice: (): boolean => {
    return window.matchMedia('(hover: none) and (pointer: coarse)').matches
  },
  
  isMouseDevice: (): boolean => {
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches
  },
  
  prefersReducedMotion: (): boolean => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  },
  
  prefersDarkMode: (): boolean => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  },
}

// Generate CSS variables from tokens
export function generateBreakpointCSSVariables(): string {
  let css = ':root {\n'
  
  // Breakpoint values
  css += '  /* Breakpoint Values */\n'
  Object.entries(breakpoints).forEach(([name, value]) => {
    css += `  --breakpoint-${name}: ${value};\n`
  })
  
  // Layout configurations
  css += '\n  /* Responsive Layout Configurations */\n'
  Object.entries(layouts).forEach(([component, sizes]) => {
    Object.entries(sizes).forEach(([size, value]) => {
      css += `  --layout-${component}-${size}: ${value};\n`
    })
  })
  
  css += '}\n'
  
  return css
}

// Type exports for TypeScript
export type Breakpoint = keyof typeof breakpoints
export type MediaQuery = keyof typeof mediaQueries
export type ResponsiveScale = keyof typeof responsiveScale
export type Layout = keyof typeof layouts
