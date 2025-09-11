/**
 * CSS Token Bridge for Konva
 * Extracts CSS variable values for use in canvas rendering
 */

export class CSSTokens {
  private static cache = new Map<string, string>()
  private static rootStyle: CSSStyleDeclaration | null = null

  static {
    // Initialize on first load
    if (typeof window !== 'undefined') {
      this.rootStyle = getComputedStyle(document.documentElement)
    }
  }

  /**
   * Get CSS variable value
   */
  static get(varName: string): string {
    // Check cache first
    if (this.cache.has(varName)) {
      return this.cache.get(varName)!
    }

    if (!this.rootStyle) {
      console.warn('CSS tokens not initialized')
      return ''
    }

    // Get computed value
    const value = this.rootStyle.getPropertyValue(varName).trim()

    // Cache for performance
    this.cache.set(varName, value)
    return value
  }

  /**
   * Get numeric value from CSS variable
   */
  static getNumber(varName: string): number {
    const value = this.get(varName)
    return parseFloat(value) || 0
  }

  /**
   * Clear cache when theme changes
   */
  static refresh(): void {
    this.cache.clear()
    if (typeof window !== 'undefined') {
      this.rootStyle = getComputedStyle(document.documentElement)
    }
  }

  /**
   * Get all token values for frame indicators
   */
  static getFrameTokens() {
    return {
      // Background
      glassBg: this.get('--custom-glass-bg') || 'rgba(30, 30, 35, 0.95)',
      glassBorder: this.get('--custom-glass-border') || 'rgba(255, 255, 255, 0.08)',

      // Typography
      fontSizeXs: this.getNumber('--font-size-xs') || 12,
      fontSize2xs: this.getNumber('--font-size-2xs') || 10,
      fontWeightSemibold: this.get('--font-weight-semibold') || '600',
      fontFamilyMono: this.get('--font-family-mono') || "'SF Mono', Monaco, monospace",

      // Colors
      textPrimary: this.get('--color-text-primary') || '#f4f4f5',
      textTertiary: this.get('--color-text-tertiary') || '#a1a1aa',

      // Borders
      radiusButtonBase: this.getNumber('--radius-button-base') || 6,

      // Spacing (for padding calculations)
      spacing1_5: this.getNumber('--spacing-1-5') || 6,
      spacing2_5: this.getNumber('--spacing-2-5') || 10,
    }
  }
}

// Named function for theme change listener
function handleThemeChange() {
  CSSTokens.refresh()
}

// Listen for theme changes
if (typeof window !== 'undefined') {
  window.addEventListener('theme-change', handleThemeChange)
}

// Export for cleanup if needed
export function removeThemeListener() {
  if (typeof window !== 'undefined') {
    window.removeEventListener('theme-change', handleThemeChange)
  }
}
