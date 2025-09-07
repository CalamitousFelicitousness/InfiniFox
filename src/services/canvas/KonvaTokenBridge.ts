/**
 * KonvaTokenBridge v1.0
 * Bridges CSS custom properties (design tokens) to Konva-compatible values
 */

export class KonvaTokenBridge {
  private static tokenCache = new Map<string, string>()
  private static computedStyle: CSSStyleDeclaration | null = null
  
  /**
   * Initialize the bridge by caching computed styles
   */
  static initialize(): void {
    this.computedStyle = getComputedStyle(document.documentElement)
    this.tokenCache.clear()
  }
  
  /**
   * Get a CSS custom property value
   */
  static getToken(tokenName: string): string {
    // Ensure token name starts with --
    const varName = tokenName.startsWith('--') ? tokenName : `--${tokenName}`
    
    // Check cache first
    if (this.tokenCache.has(varName)) {
      return this.tokenCache.get(varName)!
    }
    
    // Get from computed styles
    if (!this.computedStyle) {
      this.initialize()
    }
    
    const value = this.computedStyle!.getPropertyValue(varName).trim()
    
    // Cache the result
    if (value) {
      this.tokenCache.set(varName, value)
    }
    
    return value
  }
  
  /**
   * Get a color token value
   */
  static getColor(tokenName: string): string {
    const value = this.getToken(tokenName)
    
    // Handle var() references
    if (value.startsWith('var(')) {
      const referencedVar = value.match(/var\((--[^)]+)\)/)?.[1]
      if (referencedVar) {
        return this.getColor(referencedVar)
      }
    }
    
    // Handle rgba() with opacity
    if (value.startsWith('rgba(')) {
      return value
    }
    
    // Handle hex colors
    if (value.startsWith('#')) {
      return value
    }
    
    return value || '#000000'
  }
  
  /**
   * Get a numeric value from a token (strips 'px', 'rem', etc.)
   */
  static getNumber(tokenName: string): number {
    const value = this.getToken(tokenName)
    
    // Handle var() references
    if (value.startsWith('var(')) {
      const referencedVar = value.match(/var\((--[^)]+)\)/)?.[1]
      if (referencedVar) {
        return this.getNumber(referencedVar)
      }
    }
    
    // Parse numeric value
    const numValue = parseFloat(value)
    
    // Handle rem values (assuming 1rem = 16px)
    if (value.endsWith('rem')) {
      return numValue * 16
    }
    
    // Handle em values (assuming 1em = 16px for root)
    if (value.endsWith('em')) {
      return numValue * 16
    }
    
    return numValue || 0
  }
  
  /**
   * Parse shadow string to Konva-compatible properties
   */
  static parseShadow(tokenName: string): {
    shadowOffsetX: number
    shadowOffsetY: number
    shadowBlur: number
    shadowColor: string
  } | null {
    const value = this.getToken(tokenName)
    
    if (!value || value === 'none') {
      return null
    }
    
    // Handle var() references
    if (value.startsWith('var(')) {
      const referencedVar = value.match(/var\((--[^)]+)\)/)?.[1]
      if (referencedVar) {
        return this.parseShadow(referencedVar)
      }
    }
    
    // Parse box-shadow: offsetX offsetY blur spread color
    const parts = value.match(/([+-]?\d*\.?\d+\w*)\s+([+-]?\d*\.?\d+\w*)\s+(\d*\.?\d+\w*)(?:\s+(\d*\.?\d+\w*))?\s+(.+)/)
    
    if (parts) {
      return {
        shadowOffsetX: parseFloat(parts[1]),
        shadowOffsetY: parseFloat(parts[2]),
        shadowBlur: parseFloat(parts[3]),
        shadowColor: parts[5].trim()
      }
    }
    
    return null
  }
  
  /**
   * Get stroke properties from border token
   */
  static parseStroke(tokenName: string): {
    stroke: string
    strokeWidth: number
    dash?: number[]
  } | null {
    const value = this.getToken(tokenName)
    
    if (!value || value === 'none') {
      return null
    }
    
    // Handle var() references
    if (value.startsWith('var(')) {
      const referencedVar = value.match(/var\((--[^)]+)\)/)?.[1]
      if (referencedVar) {
        return this.parseStroke(referencedVar)
      }
    }
    
    // Parse border: width style color
    const parts = value.split(' ')
    
    const strokeWidth = parseFloat(parts[0]) || 1
    const style = parts[1] || 'solid'
    const color = parts.slice(2).join(' ') || '#000000'
    
    const result: any = {
      stroke: color.startsWith('var(') ? this.getColor(color.match(/var\((--[^)]+)\)/)?.[1] || '') : color,
      strokeWidth
    }
    
    // Handle dashed/dotted styles
    if (style === 'dashed') {
      result.dash = [strokeWidth * 5, strokeWidth * 5]
    } else if (style === 'dotted') {
      result.dash = [strokeWidth, strokeWidth * 2]
    }
    
    return result
  }
  
  /**
   * Clear the token cache (useful when theme changes)
   */
  static clearCache(): void {
    this.tokenCache.clear()
    this.computedStyle = null
  }
}