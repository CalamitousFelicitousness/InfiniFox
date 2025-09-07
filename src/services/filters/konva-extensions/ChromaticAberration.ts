import Konva from 'konva'

export interface ChromaticAberrationConfig {
  amount?: number // 0-20, default 5 - Amount of channel separation in pixels
  radialAmount?: number // 0-1, default 0.5 - How much the effect increases from center to edge
  angle?: number // 0-360, default 0 - Direction of aberration in degrees
  centerX?: number // 0-1, default 0.5 - Center point X (normalized)
  centerY?: number // 0-1, default 0.5 - Center point Y (normalized)
  mode?: 'linear' | 'radial' | 'zoom' // default 'radial'
}

/**
 * Professional Chromatic Aberration Filter for Konva
 * Simulates lens chromatic aberration by separating RGB channels
 * Creates realistic lens distortion effects used in photography and cinematography
 *
 * Usage:
 * image.cache();
 * image.filters([Konva.Filters.ChromaticAberration]);
 * image.chromaticAberration({
 *   amount: 5,
 *   radialAmount: 0.8,
 *   mode: 'radial'
 * });
 */
Konva.Filters.ChromaticAberration = function (imageData: ImageData) {
  const data = imageData.data
  const width = imageData.width
  const height = imageData.height
  const node = this as Konva.Node
  const config = node.chromaticAberration() || {}

  // Extract configuration with defaults
  const amount = config.amount ?? 5
  const radialAmount = config.radialAmount ?? 0.5
  const angle = ((config.angle ?? 0) * Math.PI) / 180 // Convert to radians
  const centerX = (config.centerX ?? 0.5) * width
  const centerY = (config.centerY ?? 0.5) * height
  const mode = config.mode ?? 'radial'

  if (amount === 0) return

  // Create temporary arrays for separated channels
  const redChannel = new Uint8ClampedArray(data.length)
  const greenChannel = new Uint8ClampedArray(data.length)
  const blueChannel = new Uint8ClampedArray(data.length)
  const alphaChannel = new Uint8ClampedArray(data.length)

  // Copy original data to channels
  for (let i = 0; i < data.length; i += 4) {
    redChannel[i] = data[i]
    redChannel[i + 1] = 0
    redChannel[i + 2] = 0
    redChannel[i + 3] = data[i + 3]

    greenChannel[i] = 0
    greenChannel[i + 1] = data[i + 1]
    greenChannel[i + 2] = 0
    greenChannel[i + 3] = data[i + 3]

    blueChannel[i] = 0
    blueChannel[i + 1] = 0
    blueChannel[i + 2] = data[i + 2]
    blueChannel[i + 3] = data[i + 3]

    alphaChannel[i + 3] = data[i + 3]
  }

  // Clear original data
  for (let i = 0; i < data.length; i++) {
    data[i] = 0
  }

  // Calculate maximum distance for normalization
  const maxDistance = Math.sqrt(
    Math.pow(Math.max(centerX, width - centerX), 2) +
      Math.pow(Math.max(centerY, height - centerY), 2)
  )

  // Process each pixel
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelIndex = (y * width + x) * 4

      let offsetR = 0,
        offsetG = 0,
        offsetB = 0

      if (mode === 'linear') {
        // Linear chromatic aberration (uniform across image)
        offsetR = amount * Math.cos(angle)
        offsetG = 0
        offsetB = -amount * Math.cos(angle)
      } else if (mode === 'radial') {
        // Radial chromatic aberration (increases from center)
        const dx = x - centerX
        const dy = y - centerY
        const distance = Math.sqrt(dx * dx + dy * dy)
        const normalizedDistance = distance / maxDistance

        // Calculate the effect strength based on distance from center
        const effectStrength = normalizedDistance * radialAmount * amount

        // Calculate offset direction (away from center)
        const offsetAngle = Math.atan2(dy, dx)

        // Red channel moves outward
        offsetR = effectStrength * Math.cos(offsetAngle)
        // Green channel stays mostly in place
        offsetG = effectStrength * 0.1 * Math.cos(offsetAngle)
        // Blue channel moves inward
        offsetB = -effectStrength * 0.8 * Math.cos(offsetAngle)
      } else if (mode === 'zoom') {
        // Zoom chromatic aberration (radial blur effect)
        const dx = x - centerX
        const dy = y - centerY
        const distance = Math.sqrt(dx * dx + dy * dy)
        const normalizedDistance = distance / maxDistance

        const zoomFactor = 1 + normalizedDistance * radialAmount * amount * 0.01

        // Calculate zoomed positions for each channel
        const zoomedRX = centerX + dx * (1 + zoomFactor * 0.02)
        const zoomedBX = centerX + dx * (1 - zoomFactor * 0.015)

        offsetR = zoomedRX - x
        offsetB = zoomedBX - x
      }

      // Bilinear interpolation for smoother results
      const bilinearSample = (
        channel: Uint8ClampedArray,
        xOffset: number,
        yOffset: number,
        channelIndex: number
      ) => {
        const sampleX = x + xOffset
        const sampleY = y + yOffset

        const x0 = Math.floor(sampleX)
        const x1 = Math.ceil(sampleX)
        const y0 = Math.floor(sampleY)
        const y1 = Math.ceil(sampleY)

        const fx = sampleX - x0
        const fy = sampleY - y0

        // Check bounds and sample
        const getValue = (px: number, py: number) => {
          if (px >= 0 && px < width && py >= 0 && py < height) {
            return channel[(py * width + px) * 4 + channelIndex]
          }
          return 0
        }

        const v00 = getValue(x0, y0)
        const v10 = getValue(x1, y0)
        const v01 = getValue(x0, y1)
        const v11 = getValue(x1, y1)

        const v0 = v00 * (1 - fx) + v10 * fx
        const v1 = v01 * (1 - fx) + v11 * fx

        return v0 * (1 - fy) + v1 * fy
      }

      // Sample each channel with its offset
      data[pixelIndex] = bilinearSample(redChannel, offsetR, offsetR * 0.5, 0)
      data[pixelIndex + 1] = bilinearSample(greenChannel, offsetG, offsetG * 0.5, 1)
      data[pixelIndex + 2] = bilinearSample(blueChannel, offsetB, offsetB * 0.5, 2)
      data[pixelIndex + 3] = alphaChannel[pixelIndex + 3]
    }
  }

  // Add slight color fringing at edges for more realistic effect
  if (mode === 'radial' && amount > 2) {
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const pixelIndex = (y * width + x) * 4

        const dx = x - centerX
        const dy = y - centerY
        const distance = Math.sqrt(dx * dx + dy * dy)
        const normalizedDistance = distance / maxDistance

        if (normalizedDistance > 0.5) {
          // Add purple/green fringing
          const fringeStrength = (normalizedDistance - 0.5) * 0.3

          // Check for edges (high contrast areas)
          const centerValue = data[pixelIndex] + data[pixelIndex + 1] + data[pixelIndex + 2]
          const topValue =
            data[((y - 1) * width + x) * 4] +
            data[((y - 1) * width + x) * 4 + 1] +
            data[((y - 1) * width + x) * 4 + 2]

          const edgeStrength = Math.abs(centerValue - topValue) / 765 // Normalize to 0-1

          if (edgeStrength > 0.1) {
            // Add purple fringe on one side
            if (dx > 0) {
              data[pixelIndex] = Math.min(
                255,
                data[pixelIndex] + fringeStrength * edgeStrength * 30
              )
              data[pixelIndex + 2] = Math.min(
                255,
                data[pixelIndex + 2] + fringeStrength * edgeStrength * 40
              )
            } else {
              // Add green fringe on the other side
              data[pixelIndex + 1] = Math.min(
                255,
                data[pixelIndex + 1] + fringeStrength * edgeStrength * 35
              )
            }
          }
        }
      }
    }
  }
}

// Register the chromaticAberration property
Konva.Factory.addGetterSetter(Konva.Node, 'chromaticAberration', null)

// Preset chromatic aberration effects
export const ChromaticAberrationPresets = {
  /**
   * Subtle lens effect
   */
  subtle: (): ChromaticAberrationConfig => ({
    amount: 2,
    radialAmount: 0.3,
    mode: 'radial',
  }),

  /**
   * Classic photography lens
   */
  photographicLens: (): ChromaticAberrationConfig => ({
    amount: 5,
    radialAmount: 0.7,
    mode: 'radial',
  }),

  /**
   * Strong vintage lens
   */
  vintageLens: (): ChromaticAberrationConfig => ({
    amount: 10,
    radialAmount: 0.9,
    mode: 'radial',
  }),

  /**
   * Glitch effect
   */
  glitch: (): ChromaticAberrationConfig => ({
    amount: 15,
    radialAmount: 0.2,
    angle: 45,
    mode: 'linear',
  }),

  /**
   * Zoom blur effect
   */
  zoomBlur: (): ChromaticAberrationConfig => ({
    amount: 8,
    radialAmount: 1.0,
    mode: 'zoom',
  }),

  /**
   * Cinematic anamorphic lens
   */
  anamorphic: (): ChromaticAberrationConfig => ({
    amount: 6,
    radialAmount: 0.4,
    angle: 0, // Horizontal aberration
    mode: 'linear',
  }),

  /**
   * Extreme artistic effect
   */
  artistic: (): ChromaticAberrationConfig => ({
    amount: 20,
    radialAmount: 1.0,
    centerX: 0.3,
    centerY: 0.3,
    mode: 'radial',
  }),
}

// Type augmentation for TypeScript
declare module 'konva/lib/Node' {
  interface Node {
    chromaticAberration: (value?: ChromaticAberrationConfig) => ChromaticAberrationConfig | this
  }
}

declare module 'konva/lib/Shape' {
  interface Shape {
    chromaticAberration: (value?: ChromaticAberrationConfig) => ChromaticAberrationConfig | this
  }
}
