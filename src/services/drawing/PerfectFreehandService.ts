/**
 * PerfectFreehandService - Core drawing engine using perfect-freehand library
 * Handles stroke generation with pressure sensitivity and smoothing
 */

import { getStroke, getStrokePoints, getStrokeOutlinePoints } from 'perfect-freehand'

export interface StrokePoint {
  x: number
  y: number
  pressure?: number
}

// StrokeOptions type definition based on perfect-freehand library
export interface DrawingStrokeOptions {
  // Override some defaults for better drawing experience
  size?: number
  thinning?: number
  smoothing?: number
  streamline?: number
  simulatePressure?: boolean
  easing?: (t: number) => number
  start?: {
    taper?: number
    easing?: (t: number) => number
    cap?: boolean
  }
  end?: {
    taper?: number
    easing?: (t: number) => number
    cap?: boolean
  }
}

// Preset configurations for different brush types
export const BRUSH_PRESETS = {
  hard: {
    size: 8,
    thinning: 0,
    smoothing: 0.5,
    streamline: 0.5,
    simulatePressure: false,
    start: {
      taper: 0,
      cap: true
    },
    end: {
      taper: 0,
      cap: true
    }
  } as DrawingStrokeOptions,
  
  soft: {
    size: 16,
    thinning: 0.5,
    smoothing: 0.5,
    streamline: 0.5,
    simulatePressure: true,
    start: {
      taper: 100,
      easing: (t: number) => t * t * t
    },
    end: {
      taper: 100,
      easing: (t: number) => t * t * t
    }
  } as DrawingStrokeOptions,
  
  watercolor: {
    size: 20,
    thinning: 0.7,
    smoothing: 0.6,
    streamline: 0.6,
    simulatePressure: true,
    start: {
      taper: 150,
      easing: (t: number) => Math.sin(t * Math.PI / 2)
    },
    end: {
      taper: 20,
      easing: (t: number) => 1 - Math.pow(1 - t, 2)
    }
  } as DrawingStrokeOptions,
  
  pencil: {
    size: 4,
    thinning: 0.4,
    smoothing: 0.4,
    streamline: 0.45,
    simulatePressure: false,
    start: {
      taper: 10,
      cap: true
    },
    end: {
      taper: 10,
      cap: true
    }
  } as DrawingStrokeOptions,
  
  marker: {
    size: 12,
    thinning: 0.2,
    smoothing: 0.3,
    streamline: 0.3,
    simulatePressure: false,
    start: {
      taper: 0,
      cap: true
    },
    end: {
      taper: 0,
      cap: true
    }
  } as DrawingStrokeOptions
}

export class PerfectFreehandService {
  private currentOptions: DrawingStrokeOptions
  private currentStroke: StrokePoint[] = []
  private isDrawing: boolean = false
  
  constructor(options: DrawingStrokeOptions = BRUSH_PRESETS.soft) {
    this.currentOptions = options
  }
  
  /**
   * Set brush options
   */
  setOptions(options: DrawingStrokeOptions): void {
    this.currentOptions = { ...this.currentOptions, ...options }
  }
  
  /**
   * Use a preset brush configuration
   */
  usePreset(preset: keyof typeof BRUSH_PRESETS): void {
    this.currentOptions = { ...BRUSH_PRESETS[preset] }
  }
  
  /**
   * Start a new stroke
   */
  startStroke(point: StrokePoint): void {
    this.isDrawing = true
    this.currentStroke = [this.normalizePoint(point)]
  }
  
  /**
   * Add a point to the current stroke
   */
  addPoint(point: StrokePoint): void {
    if (!this.isDrawing) return
    this.currentStroke.push(this.normalizePoint(point))
  }
  
  /**
   * End the current stroke and get the final outline
   */
  endStroke(): number[][] | null {
    if (!this.isDrawing || this.currentStroke.length < 2) {
      this.isDrawing = false
      this.currentStroke = []
      return null
    }
    
    this.isDrawing = false
    const outline = this.generateStrokeOutline(this.currentStroke)
    this.currentStroke = []
    return outline
  }
  
  /**
   * Generate a stroke outline from a series of points
   */
  generateStrokeOutline(points: StrokePoint[]): number[][] {
    // Convert points to the format perfect-freehand expects
    const inputPoints = points.map(p => [p.x, p.y, p.pressure ?? 0.5])
    
    // Generate the stroke outline
    const strokePoints = getStroke(inputPoints, this.currentOptions)
    
    return strokePoints
  }
  
  /**
   * Generate a smooth path from stroke points (for advanced usage)
   */
  generateSmoothPath(points: StrokePoint[]): any[] {
    const inputPoints = points.map(p => ({
      x: p.x,
      y: p.y,
      pressure: p.pressure ?? 0.5
    }))
    
    return getStrokePoints(inputPoints, this.currentOptions)
  }
  
  /**
   * Generate outline points from smooth path (for advanced usage)
   */
  generateOutlineFromPath(pathPoints: any[]): number[][] {
    return getStrokeOutlinePoints(pathPoints, this.currentOptions)
  }
  
  /**
   * Convert stroke outline to SVG path data
   */
  static toSvgPath(outline: number[][]): string {
    if (!outline.length) return ''
    
    const d = outline.reduce(
      (acc, [x0, y0], i, arr) => {
        const [x1, y1] = arr[(i + 1) % arr.length]
        return `${acc} ${x0},${y0} ${(x0 + x1) / 2},${(y0 + y1) / 2}`
      },
      `M ${outline[0][0]},${outline[0][1]} Q`
    )
    
    return `${d} Z`
  }
  
  /**
   * Convert stroke outline to Konva Line points
   */
  static toKonvaPoints(outline: number[][]): number[] {
    return outline.flat()
  }
  
  /**
   * Normalize a point to ensure it has the expected format
   */
  private normalizePoint(point: StrokePoint): StrokePoint {
    return {
      x: point.x,
      y: point.y,
      pressure: point.pressure ?? 0.5
    }
  }
  
  /**
   * Get current drawing state
   */
  isCurrentlyDrawing(): boolean {
    return this.isDrawing
  }
  
  /**
   * Get current stroke points (for preview/debugging)
   */
  getCurrentStroke(): StrokePoint[] {
    return [...this.currentStroke]
  }
  
  /**
   * Clear current stroke without generating outline
   */
  cancelStroke(): void {
    this.isDrawing = false
    this.currentStroke = []
  }
  
  /**
   * Update brush size based on pressure
   */
  updateSizeWithPressure(baseSize: number, pressure: number): void {
    // Adjust size based on pressure if pressure simulation is disabled
    if (!this.currentOptions.simulatePressure) {
      const adjustedSize = baseSize * (0.5 + pressure * 0.5)
      this.currentOptions.size = adjustedSize
    }
  }
}

// Export a singleton instance for convenience
export const perfectFreehandService = new PerfectFreehandService()
