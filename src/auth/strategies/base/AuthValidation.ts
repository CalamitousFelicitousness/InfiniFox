/**
 * Validation utilities for authentication strategies
 */

import type { ValidationResult } from '../../types/auth.types'

export class AuthValidation {
  static validateRequired(value: unknown, fieldName: string): ValidationResult {
    if (!value) {
      return {
        valid: false,
        errors: [`${fieldName} is required`],
      }
    }
    return { valid: true }
  }

  static validateString(
    value: unknown,
    fieldName: string,
    minLength?: number,
    maxLength?: number
  ): ValidationResult {
    if (typeof value !== 'string') {
      return {
        valid: false,
        errors: [`${fieldName} must be a string`],
      }
    }

    const errors: string[] = []

    if (minLength !== undefined && value.length < minLength) {
      errors.push(`${fieldName} must be at least ${minLength} characters`)
    }

    if (maxLength !== undefined && value.length > maxLength) {
      errors.push(`${fieldName} must be at most ${maxLength} characters`)
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    }
  }

  static validateUrl(value: unknown, fieldName: string): ValidationResult {
    try {
      new URL(value)
      return { valid: true }
    } catch {
      return {
        valid: false,
        errors: [`${fieldName} must be a valid URL`],
      }
    }
  }

  static validateEmail(value: unknown, fieldName: string): ValidationResult {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      return {
        valid: false,
        errors: [`${fieldName} must be a valid email address`],
      }
    }
    return { valid: true }
  }

  static combineResults(...results: ValidationResult[]): ValidationResult {
    const errors: string[] = []
    let valid = true

    for (const result of results) {
      if (!result.valid) {
        valid = false
        if (result.errors) {
          errors.push(...result.errors)
        }
      }
    }

    return {
      valid,
      errors: errors.length > 0 ? errors : undefined,
    }
  }
}
