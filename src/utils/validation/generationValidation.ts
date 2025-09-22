/**
 * Validation utilities for generation parameters
 */

export interface ValidationError {
  field: string
  message: string
  suggestedValue?: number | string
}

export interface GenerationParams {
  width?: number
  height?: number
  seed?: number
  steps?: number
  cfgScale?: number
  denoisingStrength?: number
  maskBlur?: number
  inpaintFullResPadding?: number
  batchSize?: number
  nIter?: number
}

/**
 * Validates generation parameters according to SD.Next requirements
 * @param params The parameters to validate
 * @returns Array of validation errors, empty if all valid
 */
export function validateGenerationParams(params: GenerationParams): ValidationError[] {
  const errors: ValidationError[] = []

  // Width validation - must be multiple of 8
  if (params.width !== undefined) {
    if (params.width <= 0) {
      errors.push({
        field: 'width',
        message: 'Width must be positive',
        suggestedValue: 512,
      })
    } else if (params.width % 8 !== 0) {
      const suggestedWidth = Math.round(params.width / 8) * 8
      errors.push({
        field: 'width',
        message: 'Width must be a multiple of 8',
        suggestedValue: suggestedWidth,
      })
    } else if (params.width > 2048) {
      errors.push({
        field: 'width',
        message: 'Width exceeds maximum of 2048',
        suggestedValue: 2048,
      })
    } else if (params.width < 256) {
      errors.push({
        field: 'width',
        message: 'Width below minimum of 256',
        suggestedValue: 256,
      })
    }
  }

  // Height validation - must be multiple of 8
  if (params.height !== undefined) {
    if (params.height <= 0) {
      errors.push({
        field: 'height',
        message: 'Height must be positive',
        suggestedValue: 512,
      })
    } else if (params.height % 8 !== 0) {
      const suggestedHeight = Math.round(params.height / 8) * 8
      errors.push({
        field: 'height',
        message: 'Height must be a multiple of 8',
        suggestedValue: suggestedHeight,
      })
    } else if (params.height > 2048) {
      errors.push({
        field: 'height',
        message: 'Height exceeds maximum of 2048',
        suggestedValue: 2048,
      })
    } else if (params.height < 256) {
      errors.push({
        field: 'height',
        message: 'Height below minimum of 256',
        suggestedValue: 256,
      })
    }
  }

  // Seed validation - must be -1 or positive integer
  if (params.seed !== undefined) {
    if (params.seed !== -1 && params.seed < 0) {
      errors.push({
        field: 'seed',
        message: 'Seed must be -1 (random) or a positive integer',
        suggestedValue: -1,
      })
    } else if (params.seed > 2147483647) {
      // Max 32-bit signed integer
      errors.push({
        field: 'seed',
        message: 'Seed exceeds maximum value',
        suggestedValue: Math.floor(Math.random() * 2147483647),
      })
    } else if (!Number.isInteger(params.seed)) {
      errors.push({
        field: 'seed',
        message: 'Seed must be an integer',
        suggestedValue: Math.floor(params.seed),
      })
    }
  }

  // Steps validation
  if (params.steps !== undefined) {
    if (params.steps <= 0) {
      errors.push({
        field: 'steps',
        message: 'Steps must be positive',
        suggestedValue: 20,
      })
    } else if (!Number.isInteger(params.steps)) {
      errors.push({
        field: 'steps',
        message: 'Steps must be an integer',
        suggestedValue: Math.round(params.steps),
      })
    } else if (params.steps > 150) {
      errors.push({
        field: 'steps',
        message: 'Steps exceeds recommended maximum of 150',
        suggestedValue: 150,
      })
    }
  }

  // CFG Scale validation
  if (params.cfgScale !== undefined) {
    if (params.cfgScale <= 0) {
      errors.push({
        field: 'cfgScale',
        message: 'CFG Scale must be positive',
        suggestedValue: 7.5,
      })
    } else if (params.cfgScale > 30) {
      errors.push({
        field: 'cfgScale',
        message: 'CFG Scale exceeds recommended maximum of 30',
        suggestedValue: 30,
      })
    }
  }

  // Denoising strength validation (for img2img/inpaint)
  if (params.denoisingStrength !== undefined) {
    if (params.denoisingStrength < 0 || params.denoisingStrength > 1) {
      errors.push({
        field: 'denoisingStrength',
        message: 'Denoising strength must be between 0 and 1',
        suggestedValue: Math.max(0, Math.min(1, params.denoisingStrength)),
      })
    }
  }

  // Mask blur validation (for inpaint)
  if (params.maskBlur !== undefined) {
    if (params.maskBlur < 0) {
      errors.push({
        field: 'maskBlur',
        message: 'Mask blur must be non-negative',
        suggestedValue: 4,
      })
    } else if (params.maskBlur > 64) {
      errors.push({
        field: 'maskBlur',
        message: 'Mask blur exceeds maximum of 64',
        suggestedValue: 64,
      })
    } else if (!Number.isInteger(params.maskBlur)) {
      errors.push({
        field: 'maskBlur',
        message: 'Mask blur must be an integer',
        suggestedValue: Math.round(params.maskBlur),
      })
    }
  }

  // Batch size validation
  if (params.batchSize !== undefined) {
    if (params.batchSize < 1) {
      errors.push({
        field: 'batchSize',
        message: 'Batch size must be at least 1',
        suggestedValue: 1,
      })
    } else if (params.batchSize > 8) {
      errors.push({
        field: 'batchSize',
        message: 'Batch size exceeds maximum of 8 (VRAM limitation)',
        suggestedValue: 8,
      })
    } else if (!Number.isInteger(params.batchSize)) {
      errors.push({
        field: 'batchSize',
        message: 'Batch size must be an integer',
        suggestedValue: Math.round(params.batchSize),
      })
    }
  }

  // N_iter validation
  if (params.nIter !== undefined) {
    if (params.nIter < 1) {
      errors.push({
        field: 'nIter',
        message: 'Iteration count must be at least 1',
        suggestedValue: 1,
      })
    } else if (params.nIter > 100) {
      errors.push({
        field: 'nIter',
        message: 'Iteration count exceeds maximum of 100',
        suggestedValue: 100,
      })
    } else if (!Number.isInteger(params.nIter)) {
      errors.push({
        field: 'nIter',
        message: 'Iteration count must be an integer',
        suggestedValue: Math.round(params.nIter),
      })
    }
  }

  return errors
}

/**
 * Auto-fix validation errors by applying suggested values
 * @param params The parameters to fix
 * @param errors The validation errors
 * @returns Fixed parameters
 */
export function autoFixGenerationParams(
  params: GenerationParams,
  errors: ValidationError[]
): GenerationParams {
  const fixed = { ...params }

  for (const error of errors) {
    if (error.suggestedValue !== undefined) {
      ;(fixed as any)[error.field] = error.suggestedValue
    }
  }

  return fixed
}

/**
 * Format validation errors for user display
 * @param errors The validation errors
 * @returns Formatted error message
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return ''

  const messages = errors.map((error) => {
    if (error.suggestedValue !== undefined) {
      return `${error.message} (suggested: ${error.suggestedValue})`
    }
    return error.message
  })

  return `Parameter validation errors:\n${messages.join('\n')}`
}

/**
 * Ensure dimensions are multiples of 8 (required by Stable Diffusion)
 * @param value The dimension value
 * @returns Adjusted value that's a multiple of 8
 */
export function ensureMultipleOf8(value: number): number {
  return Math.round(value / 8) * 8
}

/**
 * Clamp a value between min and max
 * @param value The value to clamp
 * @param min Minimum value
 * @param max Maximum value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
