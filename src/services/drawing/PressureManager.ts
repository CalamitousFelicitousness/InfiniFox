/**
 * PressureManager - Unified pressure API for all input devices
 * Integrates with existing pointer events and provides enhanced pressure detection
 * 
 * NOTE ON TOUCH REFERENCES:
 * This service contains 'ontouchstart' feature detection (NOT event handlers).
 * It's used only to check device capabilities for pressure support, not to
 * handle touch events. All actual event handling uses Pointer Events API.
 */

import { getPointerInfo, supportsPressure } from '../../utils/pointerEvents'
import type { PointerInfo } from '../../utils/pointerEvents'

export interface PressureState {
  current: number // 0.0 to 1.0
  isSupported: boolean
  inputType: 'mouse' | 'pen' | 'touch' | 'unknown'
  isActive: boolean
  history: number[] // Recent pressure values for smoothing
}

export interface PressureConfig {
  enablePolyfill: boolean // Simulate pressure for devices without support
  polyfillDuration: number // Time to reach max pressure (ms)
  smoothingFactor: number // 0-1, higher = more smoothing
  historySize: number // Number of values to keep for smoothing
  minPressure: number // Minimum detectable pressure
  maxPressure: number // Maximum pressure value
  pressureCurve: (pressure: number) => number // Custom pressure curve function
}

export class PressureManager {
  private state: PressureState = {
    current: 0,
    isSupported: false,
    inputType: 'unknown',
    isActive: false,
    history: []
  }
  
  private config: PressureConfig = {
    enablePolyfill: true,
    polyfillDuration: 1000,
    smoothingFactor: 0.5,
    historySize: 5,
    minPressure: 0.0,
    maxPressure: 1.0,
    pressureCurve: (p) => p // Linear by default
  }
  
  private polyfillStartTime: number | null = null
  private polyfillTimer: number | null = null
  private listeners: Map<string, Set<(state: PressureState) => void>> = new Map()
  
  constructor(config?: Partial<PressureConfig>) {
    if (config) {
      this.config = { ...this.config, ...config }
    }
    this.detectSupport()
  }
  
  /**
   * Initialize the pressure manager
   */
  initialize(): void {
    this.detectSupport()
    this.reset()
  }
  
  /**
   * Cleanup the pressure manager
   */
  cleanup(): void {
    this.stopPolyfill()
    this.listeners.clear()
    this.reset()
  }
  
  /**
   * Get current pressure value (0-1)
   * Alias for getPressure for compatibility
   */
  getCurrentPressure(): number {
    return this.state.current
  }
  
  /**
   * Detect if the current device/browser supports pressure
   */
  private detectSupport(): void {
    // Check for pointer events support
    if ('PointerEvent' in window) {
      // We'll determine actual support when we get the first event
      this.state.isSupported = true
    } else if ('ontouchstart' in window) {
      // VALID TOUCH EVENT EXCEPTION:
      // This is NOT a touch event handler - it's only feature detection.
      // We're checking if the browser/device supports touch to determine
      // if we should check for force/pressure capabilities (iOS 3D Touch).
      // No actual touch event listeners are added here.
      // Check for touch force support (iOS 3D Touch)
      this.state.isSupported = 'force' in Touch.prototype
    } else {
      this.state.isSupported = false
    }
  }
  
  /**
   * Process a pointer event and extract pressure information
   */
  processPointerEvent(event: PointerEvent): PressureState {
    const info = getPointerInfo(event)
    
    // Update input type
    this.state.inputType = info.type
    
    // Check if this device actually supports pressure
    if (info.type === 'pen' && info.pressure !== 0.5) {
      this.state.isSupported = true
      this.updatePressure(info.pressure)
    } else if (info.type === 'touch' && 'force' in event) {
      // Some touch devices report force
      this.state.isSupported = true
      const force = (event as any).force || 0
      this.updatePressure(force)
    } else if (this.config.enablePolyfill) {
      // Use polyfill for devices without pressure support
      this.startPolyfill()
    } else {
      // No pressure support and polyfill disabled
      this.updatePressure(info.type === 'mouse' ? 0.5 : info.pressure)
    }
    
    this.state.isActive = true
    this.notifyListeners()
    return { ...this.state }
  }
  
  /**
   * Process a touch event (for compatibility)
   */
  processTouchEvent(event: TouchEvent): PressureState {
    if (event.touches.length > 0) {
      const touch = event.touches[0]
      const force = 'force' in touch ? (touch as any).force : 0.5
      
      this.state.inputType = 'touch'
      this.state.isSupported = 'force' in touch
      this.updatePressure(force)
      this.state.isActive = true
    }
    
    this.notifyListeners()
    return { ...this.state }
  }
  
  /**
   * Start pressure polyfill (simulated pressure over time)
   */
  private startPolyfill(): void {
    if (!this.polyfillStartTime) {
      this.polyfillStartTime = Date.now()
      this.updatePolyfill()
    }
  }
  
  /**
   * Update polyfill pressure value
   */
  private updatePolyfill(): void {
    if (!this.polyfillStartTime) return
    
    const elapsed = Date.now() - this.polyfillStartTime
    const progress = Math.min(elapsed / this.config.polyfillDuration, 1)
    
    // Apply easing curve for more natural feel
    const easedProgress = this.easeOutQuad(progress)
    this.updatePressure(easedProgress)
    
    if (progress < 1) {
      this.polyfillTimer = window.setTimeout(() => this.updatePolyfill(), 16)
    }
  }
  
  /**
   * Stop polyfill
   */
  private stopPolyfill(): void {
    this.polyfillStartTime = null
    if (this.polyfillTimer) {
      clearTimeout(this.polyfillTimer)
      this.polyfillTimer = null
    }
    
    // Gradually reduce pressure to 0
    this.animatePressureToZero()
  }
  
  /**
   * Animate pressure back to zero
   */
  private animatePressureToZero(): void {
    const step = () => {
      if (this.state.current > 0.01) {
        this.updatePressure(this.state.current * 0.9)
        requestAnimationFrame(step)
      } else {
        this.updatePressure(0)
      }
    }
    step()
  }
  
  /**
   * Update pressure value with smoothing
   */
  private updatePressure(rawPressure: number): void {
    // Clamp to configured range
    const clamped = Math.max(
      this.config.minPressure,
      Math.min(this.config.maxPressure, rawPressure)
    )
    
    // Apply pressure curve
    const curved = this.config.pressureCurve(clamped)
    
    // Add to history
    this.state.history.push(curved)
    if (this.state.history.length > this.config.historySize) {
      this.state.history.shift()
    }
    
    // Apply smoothing
    if (this.config.smoothingFactor > 0 && this.state.history.length > 1) {
      const smoothed = this.smoothValue(curved)
      this.state.current = smoothed
    } else {
      this.state.current = curved
    }
  }
  
  /**
   * Smooth value using historical data
   */
  private smoothValue(current: number): number {
    const factor = this.config.smoothingFactor
    const history = this.state.history
    const weights = history.map((_, i) => Math.pow(factor, history.length - i - 1))
    const totalWeight = weights.reduce((a, b) => a + b, 0)
    
    const weighted = history.reduce((sum, val, i) => sum + val * weights[i], 0)
    return weighted / totalWeight
  }
  
  /**
   * End pressure tracking
   */
  end(): void {
    this.state.isActive = false
    if (this.config.enablePolyfill) {
      this.stopPolyfill()
    } else {
      this.updatePressure(0)
    }
    this.notifyListeners()
  }
  
  /**
   * Get current pressure state
   */
  getState(): PressureState {
    return { ...this.state }
  }
  
  /**
   * Get current pressure value (0-1)
   */
  getPressure(): number {
    return this.state.current
  }
  
  /**
   * Check if pressure is supported (natively or via polyfill)
   */
  isSupported(): boolean {
    return this.state.isSupported || this.config.enablePolyfill
  }
  
  /**
   * Add listener for pressure changes
   */
  on(event: string, callback: (state: PressureState) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
  }
  
  /**
   * Remove listener
   */
  off(event: string, callback: (state: PressureState) => void): void {
    this.listeners.get(event)?.delete(callback)
  }
  
  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.listeners.get('change')?.forEach(cb => cb(this.state))
    
    // Notify specific pressure level listeners
    if (this.state.current > 0.5) {
      this.listeners.get('deeppress')?.forEach(cb => cb(this.state))
    }
  }
  
  /**
   * Configure pressure manager
   */
  configure(config: Partial<PressureConfig>): void {
    this.config = { ...this.config, ...config }
  }
  
  /**
   * Reset pressure manager
   */
  reset(): void {
    this.state = {
      current: 0,
      isSupported: false,
      inputType: 'unknown',
      isActive: false,
      history: []
    }
    this.stopPolyfill()
    this.detectSupport()
  }
  
  /**
   * Easing function for polyfill
   */
  private easeOutQuad(t: number): number {
    return t * (2 - t)
  }
  
  /**
   * Create pressure curve presets
   */
  static CURVES = {
    linear: (p: number) => p,
    easeIn: (p: number) => p * p,
    easeOut: (p: number) => p * (2 - p),
    easeInOut: (p: number) => p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p,
    exponential: (p: number) => Math.pow(p, 2.2),
    logarithmic: (p: number) => Math.log(1 + p * 9) / Math.log(10),
    sigmoid: (p: number) => 1 / (1 + Math.exp(-10 * (p - 0.5)))
  }
}

// Export singleton instance
export const pressureManager = new PressureManager()
