import Konva from 'konva'

export interface LevelsAdjustment {
  // Input levels (shadows, midtones, highlights)
  inputBlack?: number // 0-255, default 0
  inputWhite?: number // 0-255, default 255
  inputGamma?: number // 0.01-10, default 1.0

  // Output levels
  outputBlack?: number // 0-255, default 0
  outputWhite?: number // 0-255, default 255

  // Per-channel adjustments
  red?: {
    inputBlack?: number
    inputWhite?: number
    inputGamma?: number
    outputBlack?: number
    outputWhite?: number
  }
  green?: {
    inputBlack?: number
    inputWhite?: number
    inputGamma?: number
    outputBlack?: number
    outputWhite?: number
  }
  blue?: {
    inputBlack?: number
    inputWhite?: number
    inputGamma?: number
    outputBlack?: number
    outputWhite?: number
  }
}

/**
 * Calculate histogram for an image channel
 */
export function calculateHistogram(
  data: Uint8ClampedArray,
  channel: 'rgb' | 'red' | 'green' | 'blue' = 'rgb'
): Uint32Array {
  const histogram = new Uint32Array(256)

  let channelOffset = 0
  switch (channel) {
    case 'red':
      channelOffset = 0
      break
    case 'green':
      channelOffset = 1
      break
    case 'blue':
      channelOffset = 2
      break
  }

  if (channel === 'rgb') {
    // Calculate luminance histogram
    for (let i = 0; i < data.length; i += 4) {
      const luminance = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
      histogram[luminance]++
    }
  } else {
    // Calculate single channel histogram
    for (let i = channelOffset; i < data.length; i += 4) {
      histogram[data[i]]++
    }
  }

  return histogram
}

/**
 * Apply levels adjustment to a single value
 */
function applyLevels(
  value: number,
  inputBlack: number,
  inputWhite: number,
  inputGamma: number,
  outputBlack: number,
  outputWhite: number
): number {
  // Clamp to input range
  if (value <= inputBlack) {
    return outputBlack
  }
  if (value >= inputWhite) {
    return outputWhite
  }

  // Normalize to 0-1 range
  let normalized = (value - inputBlack) / (inputWhite - inputBlack)

  // Apply gamma correction
  normalized = Math.pow(normalized, 1 / inputGamma)

  // Map to output range
  const output = outputBlack + normalized * (outputWhite - outputBlack)

  return Math.max(0, Math.min(255, Math.round(output)))
}

/**
 * Professional Levels Filter for Konva
 * Provides precise control over tonal range and color balance
 *
 * Usage:
 * image.cache();
 * image.filters([Konva.Filters.Levels]);
 * image.levels({
 *   inputBlack: 10,
 *   inputWhite: 245,
 *   inputGamma: 1.2,
 *   outputBlack: 0,
 *   outputWhite: 255,
 *   red: { inputGamma: 0.9 },
 *   blue: { inputGamma: 1.1 }
 * });
 */
Konva.Filters.Levels = function (imageData: ImageData) {
  const data = imageData.data
  const node = this as Konva.Node
  const levels = node.levels()

  if (!levels) return

  // Default values
  const defaultAdjustment = {
    inputBlack: 0,
    inputWhite: 255,
    inputGamma: 1.0,
    outputBlack: 0,
    outputWhite: 255,
  }

  // Merge with defaults
  const rgbLevels = {
    ...defaultAdjustment,
    ...(levels || {}),
  }

  const redLevels = levels.red
    ? {
        ...defaultAdjustment,
        ...levels.red,
      }
    : null

  const greenLevels = levels.green
    ? {
        ...defaultAdjustment,
        ...levels.green,
      }
    : null

  const blueLevels = levels.blue
    ? {
        ...defaultAdjustment,
        ...levels.blue,
      }
    : null

  // Create lookup tables for performance
  const rgbLUT = new Uint8Array(256)
  const redLUT = redLevels ? new Uint8Array(256) : null
  const greenLUT = greenLevels ? new Uint8Array(256) : null
  const blueLUT = blueLevels ? new Uint8Array(256) : null

  // Generate RGB lookup table
  for (let i = 0; i < 256; i++) {
    rgbLUT[i] = applyLevels(
      i,
      rgbLevels.inputBlack,
      rgbLevels.inputWhite,
      rgbLevels.inputGamma,
      rgbLevels.outputBlack,
      rgbLevels.outputWhite
    )
  }

  // Generate per-channel lookup tables
  if (redLUT && redLevels) {
    for (let i = 0; i < 256; i++) {
      redLUT[i] = applyLevels(
        i,
        redLevels.inputBlack,
        redLevels.inputWhite,
        redLevels.inputGamma,
        redLevels.outputBlack,
        redLevels.outputWhite
      )
    }
  }

  if (greenLUT && greenLevels) {
    for (let i = 0; i < 256; i++) {
      greenLUT[i] = applyLevels(
        i,
        greenLevels.inputBlack,
        greenLevels.inputWhite,
        greenLevels.inputGamma,
        greenLevels.outputBlack,
        greenLevels.outputWhite
      )
    }
  }

  if (blueLUT && blueLevels) {
    for (let i = 0; i < 256; i++) {
      blueLUT[i] = applyLevels(
        i,
        blueLevels.inputBlack,
        blueLevels.inputWhite,
        blueLevels.inputGamma,
        blueLevels.outputBlack,
        blueLevels.outputWhite
      )
    }
  }

  // Apply levels to image data
  for (let i = 0; i < data.length; i += 4) {
    // Apply combined RGB levels first
    let r = rgbLUT[data[i]]
    let g = rgbLUT[data[i + 1]]
    let b = rgbLUT[data[i + 2]]

    // Apply per-channel levels
    if (redLUT) {
      r = redLUT[r]
    }
    if (greenLUT) {
      g = greenLUT[g]
    }
    if (blueLUT) {
      b = blueLUT[b]
    }

    data[i] = r
    data[i + 1] = g
    data[i + 2] = b
  }
}

// Register the levels property
Konva.Factory.addGetterSetter(Konva.Node, 'levels', null)

// Helper functions for auto-levels
export const LevelsHelpers = {
  /**
   * Calculate auto levels based on histogram
   * Finds the black and white points that clip a small percentage of pixels
   */
  autoLevels(
    histogram: Uint32Array,
    clipPercent: number = 0.1
  ): { inputBlack: number; inputWhite: number } {
    const totalPixels = histogram.reduce((sum, count) => sum + count, 0)
    const clipPixels = Math.round((totalPixels * clipPercent) / 100)

    // Find black point
    let blackPoint = 0
    let accum = 0
    for (let i = 0; i < 256; i++) {
      accum += histogram[i]
      if (accum > clipPixels) {
        blackPoint = i
        break
      }
    }

    // Find white point
    let whitePoint = 255
    accum = 0
    for (let i = 255; i >= 0; i--) {
      accum += histogram[i]
      if (accum > clipPixels) {
        whitePoint = i
        break
      }
    }

    return { inputBlack: blackPoint, inputWhite: whitePoint }
  },

  /**
   * Calculate optimal gamma based on image brightness
   */
  autoGamma(histogram: Uint32Array): number {
    const totalPixels = histogram.reduce((sum, count) => sum + count, 0)

    // Calculate mean brightness
    let meanBrightness = 0
    for (let i = 0; i < 256; i++) {
      meanBrightness += i * histogram[i]
    }
    meanBrightness /= totalPixels
    meanBrightness /= 255 // Normalize to 0-1

    // Calculate gamma to bring mean to 0.5
    if (meanBrightness > 0 && meanBrightness < 1) {
      return Math.log(0.5) / Math.log(meanBrightness)
    }

    return 1.0
  },
}

// Preset levels adjustments
export const LevelsPresets = {
  /**
   * Auto contrast
   */
  autoContrast: (histogram: Uint32Array): LevelsAdjustment => {
    const auto = LevelsHelpers.autoLevels(histogram, 0.1)
    return {
      inputBlack: auto.inputBlack,
      inputWhite: auto.inputWhite,
      inputGamma: 1.0,
    }
  },

  /**
   * Auto tone
   */
  autoTone: (histogram: Uint32Array): LevelsAdjustment => {
    const auto = LevelsHelpers.autoLevels(histogram, 0.1)
    const gamma = LevelsHelpers.autoGamma(histogram)
    return {
      inputBlack: auto.inputBlack,
      inputWhite: auto.inputWhite,
      inputGamma: gamma,
    }
  },

  /**
   * Brighten shadows
   */
  brightenShadows: (): LevelsAdjustment => ({
    outputBlack: 20,
    inputGamma: 1.2,
  }),

  /**
   * Darken highlights
   */
  darkenHighlights: (): LevelsAdjustment => ({
    outputWhite: 235,
    inputGamma: 0.85,
  }),

  /**
   * Increase contrast
   */
  increaseContrast: (): LevelsAdjustment => ({
    inputBlack: 15,
    inputWhite: 240,
    outputBlack: 0,
    outputWhite: 255,
  }),

  /**
   * Fade effect
   */
  fade: (): LevelsAdjustment => ({
    outputBlack: 30,
    outputWhite: 225,
    inputGamma: 1.1,
  }),

  /**
   * Cool tone
   */
  coolTone: (): LevelsAdjustment => ({
    red: { inputGamma: 1.1 },
    blue: { inputGamma: 0.9 },
  }),

  /**
   * Warm tone
   */
  warmTone: (): LevelsAdjustment => ({
    red: { inputGamma: 0.9 },
    blue: { inputGamma: 1.1 },
  }),
}

// Type augmentation for TypeScript
declare module 'konva/lib/Node' {
  interface Node {
    levels: (value?: LevelsAdjustment) => LevelsAdjustment | this
  }
}

declare module 'konva/lib/Shape' {
  interface Shape {
    levels: (value?: LevelsAdjustment) => LevelsAdjustment | this
  }
}
