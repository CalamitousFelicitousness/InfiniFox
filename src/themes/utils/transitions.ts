/**
 * Theme Transition Utilities
 * Manages smooth transitions between themes
 */

import type { Theme } from '../types'

/**
 * Transition configuration
 */
export interface TransitionConfig {
  duration: number
  easing: string
  properties: string[]
  delay?: number
  stagger?: number
}

/**
 * Default transition configuration
 */
export const defaultTransition: TransitionConfig = {
  duration: 300,
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  properties: [
    'background-color',
    'border-color',
    'color',
    'fill',
    'stroke',
    'opacity',
    'box-shadow',
    'text-shadow',
  ],
  delay: 0,
  stagger: 0,
}

/**
 * Fast transition for immediate feedback
 */
export const fastTransition: TransitionConfig = {
  duration: 150,
  easing: 'ease-out',
  properties: defaultTransition.properties,
}

/**
 * Smooth transition for theme switching
 */
export const smoothTransition: TransitionConfig = {
  duration: 500,
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  properties: defaultTransition.properties,
}

/**
 * No transition (instant)
 */
export const instantTransition: TransitionConfig = {
  duration: 0,
  easing: 'linear',
  properties: [],
}

/**
 * Generate CSS transition string
 */
export function generateTransitionCSS(config: TransitionConfig = defaultTransition): string {
  if (config.duration === 0 || config.properties.length === 0) {
    return 'none'
  }

  return config.properties
    .map((prop, index) => {
      const delay = config.delay || 0
      const stagger = config.stagger || 0
      const totalDelay = delay + stagger * index

      return `${prop} ${config.duration}ms ${config.easing}${
        totalDelay > 0 ? ` ${totalDelay}ms` : ''
      }`
    })
    .join(', ')
}

/**
 * Apply transition to document
 */
export function applyTransition(config: TransitionConfig = defaultTransition): void {
  const transitionCSS = generateTransitionCSS(config)

  // Create or update transition style element
  let styleEl = document.getElementById('theme-transition-style') as HTMLStyleElement

  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = 'theme-transition-style'
    document.head.appendChild(styleEl)
  }

  styleEl.textContent = `
    * {
      transition: ${transitionCSS} !important;
    }
    
    /* Exclude certain elements from transitions */
    img, video, canvas, iframe, embed, object {
      transition: none !important;
    }
    
    /* Exclude performance-critical elements */
    .no-transition,
    .konva-stage,
    .konva-layer,
    [data-no-transition] {
      transition: none !important;
    }
  `
}

/**
 * Remove transition from document
 */
export function removeTransition(): void {
  const styleEl = document.getElementById('theme-transition-style')
  if (styleEl) {
    styleEl.remove()
  }
}

/**
 * Transition between themes with animation
 */
export async function transitionTheme(
  fromTheme: Theme,
  toTheme: Theme,
  config: TransitionConfig = defaultTransition,
  onTransitionStart?: () => void,
  onTransitionEnd?: () => void
): Promise<void> {
  return new Promise((resolve) => {
    // Call start callback
    onTransitionStart?.()

    // Apply transition styles
    applyTransition(config)

    // Wait for next frame to ensure transition is applied
    requestAnimationFrame(() => {
      // Theme will be applied by ThemeProvider
      // We just need to wait for transition to complete

      setTimeout(
        () => {
          // Remove transition styles
          removeTransition()

          // Call end callback
          onTransitionEnd?.()

          resolve()
        },
        config.duration + (config.delay || 0)
      )
    })
  })
}

/**
 * Preload theme assets
 */
export async function preloadTheme(theme: Theme): Promise<void> {
  // Preload any custom fonts
  if (theme.typography?.families) {
    const fonts = Object.values(theme.typography.families)

    // Use Font Face Observer or similar for actual implementation
    // For now, just simulate loading
    await Promise.all(
      fonts.map((font) => {
        return new Promise((resolve) => {
          // Check if font is already loaded
          if (document.fonts?.check(`16px ${font}`)) {
            resolve(true)
          } else {
            // Simulate font loading
            setTimeout(resolve, 100)
          }
        })
      })
    )
  }

  // Preload any images referenced in theme
  // This would scan theme for image URLs and preload them
  // For now, just return
  return Promise.resolve()
}

/**
 * Detect reduced motion preference
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Get appropriate transition config based on user preference
 */
export function getTransitionConfig(
  preferredConfig: TransitionConfig = defaultTransition
): TransitionConfig {
  if (prefersReducedMotion()) {
    return instantTransition
  }
  return preferredConfig
}

/**
 * Create staggered transition for elements
 */
export function createStaggeredTransition(
  elements: HTMLElement[],
  config: TransitionConfig = defaultTransition
): void {
  elements.forEach((el, index) => {
    const delay = (config.delay || 0) + (config.stagger || 50) * index
    el.style.transitionDelay = `${delay}ms`
  })
}

/**
 * Reset staggered transition
 */
export function resetStaggeredTransition(elements: HTMLElement[]): void {
  elements.forEach((el) => {
    el.style.transitionDelay = ''
  })
}

/**
 * Measure theme switch performance
 */
export function measureThemeSwitch(callback: () => void): number {
  const startTime = performance.now()
  callback()
  const endTime = performance.now()
  const duration = endTime - startTime

  // Log performance metric
  if (duration > 50) {
    console.warn(`Theme switch took ${duration.toFixed(2)}ms (target: <50ms)`)
  }

  return duration
}

/**
 * Debounce theme switches to prevent rapid changes
 */
export function debounceThemeSwitch(
  switchFn: (theme: string) => void,
  delay: number = 100
): (theme: string) => void {
  let timeoutId: NodeJS.Timeout | null = null

  return (theme: string) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      switchFn(theme)
      timeoutId = null
    }, delay)
  }
}

/**
 * Export all transition configs
 */
export const transitions = {
  default: defaultTransition,
  fast: fastTransition,
  smooth: smoothTransition,
  instant: instantTransition,
}
