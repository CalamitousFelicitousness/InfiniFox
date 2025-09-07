/**
 * InfiniFox Animation Tokens
 * Consistent animation and transition system
 */

// Timing functions (easing curves)
export const easings = {
  // Basic easings
  linear: 'linear',
  ease: 'ease',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',

  // Cubic bezier easings
  easeInQuad: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)',
  easeOutQuad: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  easeInOutQuad: 'cubic-bezier(0.455, 0.03, 0.515, 0.955)',

  easeInCubic: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
  easeOutCubic: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
  easeInOutCubic: 'cubic-bezier(0.645, 0.045, 0.355, 1)',

  easeInQuart: 'cubic-bezier(0.895, 0.03, 0.685, 0.22)',
  easeOutQuart: 'cubic-bezier(0.165, 0.84, 0.44, 1)',
  easeInOutQuart: 'cubic-bezier(0.77, 0, 0.175, 1)',

  easeInQuint: 'cubic-bezier(0.755, 0.05, 0.855, 0.06)',
  easeOutQuint: 'cubic-bezier(0.23, 1, 0.32, 1)',
  easeInOutQuint: 'cubic-bezier(0.86, 0, 0.07, 1)',

  easeInExpo: 'cubic-bezier(0.95, 0.05, 0.795, 0.035)',
  easeOutExpo: 'cubic-bezier(0.19, 1, 0.22, 1)',
  easeInOutExpo: 'cubic-bezier(1, 0, 0, 1)',

  easeInCirc: 'cubic-bezier(0.6, 0.04, 0.98, 0.335)',
  easeOutCirc: 'cubic-bezier(0.075, 0.82, 0.165, 1)',
  easeInOutCirc: 'cubic-bezier(0.785, 0.135, 0.15, 0.86)',

  easeInBack: 'cubic-bezier(0.6, -0.28, 0.735, 0.045)',
  easeOutBack: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  easeInOutBack: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',

  // Spring animations
  spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  springSmooth: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  springSnappy: 'cubic-bezier(0.39, 0.575, 0.565, 1)',
  springBouncy: 'cubic-bezier(0.68, -0.75, 0.265, 1.75)',

  // Material Design easings
  materialStandard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  materialDecelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
  materialAccelerate: 'cubic-bezier(0.4, 0.0, 1, 1)',
  materialSharp: 'cubic-bezier(0.4, 0.0, 0.6, 1)',
} as const

// Duration scales
export const durations = {
  instant: '0ms',
  fastest: '50ms',
  faster: '100ms',
  fast: '150ms',
  base: '200ms',
  moderate: '250ms',
  slow: '300ms',
  slower: '400ms',
  slowest: '500ms',
  lazy: '600ms',
  sleepy: '800ms',
  sluggish: '1000ms',
  glacial: '2000ms',
} as const

// Transition presets
export const transitions = {
  // Basic transitions
  none: 'none',
  all: `all ${durations.base} ${easings.ease}`,
  colors: `color ${durations.fast} ${easings.ease}, background-color ${durations.fast} ${easings.ease}, border-color ${durations.fast} ${easings.ease}, text-decoration-color ${durations.fast} ${easings.ease}, fill ${durations.fast} ${easings.ease}, stroke ${durations.fast} ${easings.ease}`,
  opacity: `opacity ${durations.base} ${easings.ease}`,
  shadow: `box-shadow ${durations.base} ${easings.ease}`,
  transform: `transform ${durations.base} ${easings.ease}`,

  // Fast transitions
  fast: `all ${durations.fast} ${easings.ease}`,
  fastColors: `color ${durations.fastest} ${easings.ease}, background-color ${durations.fastest} ${easings.ease}`,
  fastOpacity: `opacity ${durations.fast} ${easings.ease}`,
  fastTransform: `transform ${durations.fast} ${easings.ease}`,

  // Smooth transitions
  smooth: `all ${durations.slow} ${easings.easeInOut}`,
  smoothColors: `color ${durations.moderate} ${easings.easeInOut}, background-color ${durations.moderate} ${easings.easeInOut}`,
  smoothTransform: `transform ${durations.slow} ${easings.easeInOut}`,
  smoothShadow: `box-shadow ${durations.slow} ${easings.easeInOut}`,

  // Spring transitions
  spring: `all ${durations.base} ${easings.spring}`,
  springTransform: `transform ${durations.base} ${easings.spring}`,
  springScale: `transform ${durations.moderate} ${easings.springBouncy}`,

  // Component-specific
  button: `all ${durations.fast} ${easings.easeOut}`,
  buttonHover: `background-color ${durations.fast} ${easings.ease}, transform ${durations.fast} ${easings.easeOut}, box-shadow ${durations.fast} ${easings.ease}`,

  input: `border-color ${durations.fast} ${easings.ease}, box-shadow ${durations.fast} ${easings.ease}`,
  inputFocus: `border-color ${durations.fast} ${easings.ease}, box-shadow ${durations.base} ${easings.ease}`,

  panel: `transform ${durations.moderate} ${easings.easeInOut}, opacity ${durations.moderate} ${easings.ease}`,
  panelCollapse: `height ${durations.slow} ${easings.easeInOut}, opacity ${durations.moderate} ${easings.ease}`,

  modal: `opacity ${durations.moderate} ${easings.ease}, transform ${durations.moderate} ${easings.springSmooth}`,
  modalBackdrop: `opacity ${durations.slow} ${easings.ease}`,

  dropdown: `opacity ${durations.fast} ${easings.ease}, transform ${durations.fast} ${easings.easeOut}`,
  tooltip: `opacity ${durations.fast} ${easings.ease}, transform ${durations.fast} ${easings.easeOut}`,

  // Canvas-specific
  canvas: `transform ${durations.instant} ${easings.linear}`,
  canvasZoom: `transform ${durations.fast} ${easings.easeOut}`,
  canvasPan: `transform ${durations.instant} ${easings.linear}`,
} as const

// Keyframe animations
export const keyframes = {
  // Fade animations
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  fadeOut: {
    from: { opacity: 1 },
    to: { opacity: 0 },
  },

  // Scale animations
  scaleIn: {
    from: { transform: 'scale(0.9)', opacity: 0 },
    to: { transform: 'scale(1)', opacity: 1 },
  },
  scaleOut: {
    from: { transform: 'scale(1)', opacity: 1 },
    to: { transform: 'scale(0.9)', opacity: 0 },
  },

  // Slide animations
  slideInUp: {
    from: { transform: 'translateY(100%)', opacity: 0 },
    to: { transform: 'translateY(0)', opacity: 1 },
  },
  slideInDown: {
    from: { transform: 'translateY(-100%)', opacity: 0 },
    to: { transform: 'translateY(0)', opacity: 1 },
  },
  slideInLeft: {
    from: { transform: 'translateX(-100%)', opacity: 0 },
    to: { transform: 'translateX(0)', opacity: 1 },
  },
  slideInRight: {
    from: { transform: 'translateX(100%)', opacity: 0 },
    to: { transform: 'translateX(0)', opacity: 1 },
  },

  // Rotate animations
  spin: {
    from: { transform: 'rotate(0deg)' },
    to: { transform: 'rotate(360deg)' },
  },
  spinReverse: {
    from: { transform: 'rotate(360deg)' },
    to: { transform: 'rotate(0deg)' },
  },

  // Pulse animations
  pulse: {
    '0%, 100%': { opacity: 1, transform: 'scale(1)' },
    '50%': { opacity: 0.8, transform: 'scale(1.05)' },
  },
  pulseSlow: {
    '0%, 100%': { opacity: 1, transform: 'scale(1)' },
    '50%': { opacity: 0.9, transform: 'scale(1.02)' },
  },

  // Bounce animations
  bounce: {
    '0%, 100%': { transform: 'translateY(0)' },
    '50%': { transform: 'translateY(-4px)' },
  },
  bounceIn: {
    '0%': { transform: 'scale(0.3)', opacity: 0 },
    '50%': { transform: 'scale(1.05)' },
    '70%': { transform: 'scale(0.9)' },
    '100%': { transform: 'scale(1)', opacity: 1 },
  },

  // Shake animations
  shake: {
    '0%, 100%': { transform: 'translateX(0)' },
    '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-2px)' },
    '20%, 40%, 60%, 80%': { transform: 'translateX(2px)' },
  },
  shakeHard: {
    '0%, 100%': { transform: 'translateX(0)' },
    '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
    '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
  },

  // Loading animations
  loading: {
    '0%': { transform: 'rotate(0deg)' },
    '100%': { transform: 'rotate(360deg)' },
  },
  loadingDots: {
    '0%, 80%, 100%': { opacity: 0 },
    '40%': { opacity: 1 },
  },

  // Skeleton loading
  shimmer: {
    '0%': { backgroundPosition: '-100% 0' },
    '100%': { backgroundPosition: '100% 0' },
  },
} as const

// Animation presets
export const animations = {
  // Basic animations
  spin: `spin ${durations.sluggish} ${easings.linear} infinite`,
  spinSlow: `spin ${durations.glacial} ${easings.linear} infinite`,
  spinFast: `spin ${durations.slowest} ${easings.linear} infinite`,

  pulse: `pulse ${durations.glacial} ${easings.ease} infinite`,
  pulseSlow: `pulseSlow ${durations.glacial} ${easings.ease} infinite`,

  bounce: `bounce ${durations.slowest} ${easings.ease} infinite`,
  bounceIn: `bounceIn ${durations.slower} ${easings.springBouncy}`,

  shake: `shake ${durations.slower} ${easings.ease}`,
  shakeHard: `shakeHard ${durations.slow} ${easings.ease}`,

  // Fade animations
  fadeIn: `fadeIn ${durations.moderate} ${easings.ease}`,
  fadeOut: `fadeOut ${durations.moderate} ${easings.ease}`,

  // Scale animations
  scaleIn: `scaleIn ${durations.moderate} ${easings.springSmooth}`,
  scaleOut: `scaleOut ${durations.moderate} ${easings.ease}`,

  // Slide animations
  slideInUp: `slideInUp ${durations.slow} ${easings.easeOut}`,
  slideInDown: `slideInDown ${durations.slow} ${easings.easeOut}`,
  slideInLeft: `slideInLeft ${durations.slow} ${easings.easeOut}`,
  slideInRight: `slideInRight ${durations.slow} ${easings.easeOut}`,

  // Loading animations
  loading: `loading ${durations.sluggish} ${easings.linear} infinite`,
  loadingDots: `loadingDots ${durations.sluggish} ${easings.ease} infinite`,
  shimmer: `shimmer ${durations.glacial} ${easings.linear} infinite`,
} as const

// Generate CSS variables and keyframes
export function generateAnimationCSS(): string {
  let css = ':root {\n'

  // Durations
  css += '  /* Animation Durations */\n'
  Object.entries(durations).forEach(([name, value]) => {
    css += `  --duration-${name}: ${value};\n`
  })

  // Easings
  css += '\n  /* Animation Easings */\n'
  Object.entries(easings).forEach(([name, value]) => {
    const varName = name.replace(/([A-Z])/g, '-$1').toLowerCase()
    css += `  --easing-${varName}: ${value};\n`
  })

  // Transitions
  css += '\n  /* Transition Presets */\n'
  Object.entries(transitions).forEach(([name, value]) => {
    const varName = name.replace(/([A-Z])/g, '-$1').toLowerCase()
    css += `  --transition-${varName}: ${value};\n`
  })

  css += '}\n\n'

  // Keyframes
  css += '/* Keyframe Animations */\n'
  Object.entries(keyframes).forEach(([name, frames]) => {
    css += `@keyframes ${name} {\n`
    Object.entries(frames).forEach(([key, value]) => {
      css += `  ${key} {\n`
      Object.entries(value as Record<string, string | number>).forEach(([prop, val]) => {
        css += `    ${prop}: ${val};\n`
      })
      css += '  }\n'
    })
    css += '}\n\n'
  })

  return css
}

// Type exports for TypeScript
export type Easing = keyof typeof easings
export type Duration = keyof typeof durations
export type Transition = keyof typeof transitions
export type Animation = keyof typeof animations
export type Keyframe = keyof typeof keyframes
