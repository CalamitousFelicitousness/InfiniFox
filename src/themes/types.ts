/**
 * InfiniFox Theme Types
 * TypeScript definitions for the theme system
 */

import type { 
  CorePalette, 
  SemanticColors 
} from './tokens/colors'
import type { 
  FontFamily, 
  FontSize, 
  FontWeight, 
  LineHeight, 
  LetterSpacing,
  TypographyPreset 
} from './tokens/typography'
import type { 
  SpacingScale, 
  SemanticSpacing, 
  ContainerWidth 
} from './tokens/spacing'
import type { 
  Shadow, 
  DropShadow, 
  TextShadow 
} from './tokens/shadows'
import type { 
  Easing, 
  Duration, 
  Transition, 
  Animation, 
  Keyframe 
} from './tokens/animations'
import type { 
  BorderWidth, 
  BorderStyle, 
  BorderRadius, 
  Border, 
  Outline, 
  Divider 
} from './tokens/borders'
import type { 
  Breakpoint, 
  MediaQuery, 
  ResponsiveScale, 
  Layout 
} from './tokens/breakpoints'

/**
 * Complete theme interface
 */
export interface Theme {
  name: string
  description?: string
  mode: 'light' | 'dark' | 'auto'
  colors: ThemeColors
  typography: ThemeTypography
  spacing: ThemeSpacing
  shadows: ThemeShadows
  animations: ThemeAnimations
  borders: ThemeBorders
  breakpoints: ThemeBreakpoints
  custom?: Record<string, any>
}

/**
 * Theme colors interface
 */
export interface ThemeColors {
  palette: Partial<CorePalette>
  semantic: Partial<SemanticColors>
  custom?: Record<string, string>
}

/**
 * Theme typography interface
 */
export interface ThemeTypography {
  families?: Partial<Record<FontFamily, string>>
  sizes?: Partial<Record<FontSize, string>>
  weights?: Partial<Record<FontWeight, number>>
  lineHeights?: Partial<Record<LineHeight, number>>
  letterSpacings?: Partial<Record<LetterSpacing, string>>
  presets?: Partial<Record<TypographyPreset, any>>
  custom?: Record<string, any>
}

/**
 * Theme spacing interface
 */
export interface ThemeSpacing {
  scale?: Partial<Record<SpacingScale, string>>
  semantic?: Partial<SemanticSpacing>
  containers?: Partial<Record<ContainerWidth, string>>
  custom?: Record<string, string>
}

/**
 * Theme shadows interface
 */
export interface ThemeShadows {
  box?: Partial<Record<Shadow, string>>
  drop?: Partial<Record<DropShadow, string>>
  text?: Partial<Record<TextShadow, string>>
  custom?: Record<string, string>
}

/**
 * Theme animations interface
 */
export interface ThemeAnimations {
  easings?: Partial<Record<Easing, string>>
  durations?: Partial<Record<Duration, string>>
  transitions?: Partial<Record<Transition, string>>
  animations?: Partial<Record<Animation, string>>
  keyframes?: Partial<Record<Keyframe, any>>
  custom?: Record<string, any>
}

/**
 * Theme borders interface
 */
export interface ThemeBorders {
  widths?: Partial<Record<BorderWidth, string>>
  styles?: Partial<Record<BorderStyle, string>>
  radius?: Partial<Record<BorderRadius, string>>
  borders?: Partial<Record<Border, string>>
  outlines?: Partial<Record<Outline, string>>
  dividers?: Partial<Record<Divider, any>>
  custom?: Record<string, any>
}

/**
 * Theme breakpoints interface
 */
export interface ThemeBreakpoints {
  values?: Partial<Record<Breakpoint, string>>
  queries?: Partial<Record<MediaQuery, string>>
  scale?: Partial<Record<ResponsiveScale, number>>
  layouts?: Partial<Record<Layout, any>>
  custom?: Record<string, any>
}

/**
 * Theme variant for different modes
 */
export interface ThemeVariant {
  light?: Partial<Theme>
  dark?: Partial<Theme>
  custom?: Record<string, Partial<Theme>>
}

/**
 * Theme configuration
 */
export interface ThemeConfig {
  defaultTheme: string
  themes: Record<string, Theme>
  variants?: ThemeVariant
  enableSystemTheme?: boolean
  persistTheme?: boolean
  storageKey?: string
  cssVariablePrefix?: string
}

/**
 * Theme context value
 */
export interface ThemeContextValue {
  theme: Theme
  themes: Record<string, Theme>
  currentThemeName: string
  setTheme: (themeName: string) => void
  toggleTheme: () => void
  createTheme: (name: string, theme: Partial<Theme>) => void
  updateTheme: (name: string, updates: Partial<Theme>) => void
  deleteTheme: (name: string) => void
  exportTheme: (name: string) => string
  importTheme: (themeData: string) => void
  isTransitioning?: boolean
  getPerformanceMetrics?: () => {
    lastSwitch: number
    averageSwitch: number
    switchCount: number
  }
}

/**
 * Theme provider props
 */
export interface ThemeProviderProps {
  children: React.ReactNode
  config?: Partial<ThemeConfig>
  initialTheme?: string
  onThemeChange?: (theme: Theme) => void
}

/**
 * Theme hook return type
 */
export interface UseThemeReturn {
  theme: Theme
  themeName: string
  isDark: boolean
  isLight: boolean
  setTheme: (name: string) => void
  toggleTheme: () => void
  tokens: ThemeTokens
}

/**
 * Consolidated theme tokens
 */
export interface ThemeTokens {
  color: (path: string) => string
  typography: (path: string) => any
  spacing: (scale: SpacingScale) => string
  shadow: (type: Shadow) => string
  border: (type: Border) => string
  radius: (size: BorderRadius) => string
  duration: (speed: Duration) => string
  easing: (type: Easing) => string
  breakpoint: (size: Breakpoint) => string
  mediaQuery: (query: MediaQuery) => string
}

/**
 * CSS-in-JS style object
 */
export type StyleObject = Record<string, any>

/**
 * Theme style generator function
 */
export type StyleGenerator<P = {}> = (theme: Theme, props?: P) => StyleObject

/**
 * Component theme overrides
 */
export interface ComponentTheme {
  root?: StyleObject
  variants?: Record<string, StyleObject>
  sizes?: Record<string, StyleObject>
  states?: Record<string, StyleObject>
  modifiers?: Record<string, StyleObject>
}

/**
 * Global component themes
 */
export interface ComponentThemes {
  Button?: ComponentTheme
  Input?: ComponentTheme
  Panel?: ComponentTheme
  Toolbar?: ComponentTheme
  Modal?: ComponentTheme
  Card?: ComponentTheme
  Tooltip?: ComponentTheme
  Dropdown?: ComponentTheme
  Badge?: ComponentTheme
  Avatar?: ComponentTheme
  [key: string]: ComponentTheme | undefined
}

/**
 * Theme creation options
 */
export interface CreateThemeOptions {
  name: string
  mode?: 'light' | 'dark' | 'auto'
  base?: string // Base theme to extend from
  tokens?: Partial<Theme>
  components?: ComponentThemes
  custom?: Record<string, any>
}

/**
 * Theme utilities
 */
export interface ThemeUtils {
  mergeThemes: (...themes: Partial<Theme>[]) => Theme
  createVariant: (base: Theme, variant: Partial<Theme>) => Theme
  generateCSSVariables: (theme: Theme) => string
  parseTheme: (themeString: string) => Theme
  validateTheme: (theme: any) => theme is Theme
  getContrastColor: (backgroundColor: string) => string
  getColorShade: (color: string, shade: number) => string
  responsive: <T>(values: Partial<Record<Breakpoint, T>>) => T
}

/**
 * Export all types
 */
export type {
  // Token types
  CorePalette,
  SemanticColors,
  FontFamily,
  FontSize,
  FontWeight,
  LineHeight,
  LetterSpacing,
  TypographyPreset,
  SpacingScale,
  SemanticSpacing,
  ContainerWidth,
  Shadow,
  DropShadow,
  TextShadow,
  Easing,
  Duration,
  Transition,
  Animation,
  Keyframe,
  BorderWidth,
  BorderStyle,
  BorderRadius,
  Border,
  Outline,
  Divider,
  Breakpoint,
  MediaQuery,
  ResponsiveScale,
  Layout,
}
