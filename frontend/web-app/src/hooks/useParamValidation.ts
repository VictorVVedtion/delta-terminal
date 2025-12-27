/**
 * Parameter Validation Hook
 *
 * Validates InsightParams against their constraints:
 * - min_max: Value must be within range
 * - dependency: Value depends on another param (e.g., stop_loss < take_profit)
 * - mutual_exclusive: Only one of a group can be enabled
 * - conditional: Validation applies only when condition is met
 */

import { useCallback,useMemo } from 'react'

import type {
  Constraint,
  InsightParam,
  ParamValidationResult,
  ParamValue,
} from '@/types/insight'

// =============================================================================
// Types
// =============================================================================

interface ValidationContext {
  params: InsightParam[]
  values: Map<string, ParamValue>
}

type ValidationFn = (
  param: InsightParam,
  value: ParamValue,
  context: ValidationContext
) => string | null

// =============================================================================
// Validation Functions
// =============================================================================

const validators: Record<string, ValidationFn> = {
  /**
   * Validates min/max range constraints
   */
  min_max: (param, value, _context) => {
    if (typeof value !== 'number') return null

    const { min, max } = param.config
    if (min !== undefined && value < min) {
      return `${param.label} 不能小于 ${min}${param.config.unit || ''}`
    }
    if (max !== undefined && value > max) {
      return `${param.label} 不能大于 ${max}${param.config.unit || ''}`
    }
    return null
  },

  /**
   * Validates dependency constraints (e.g., stop_loss < take_profit)
   */
  dependency: (param, value, context) => {
    const constraint = param.constraints?.find(c => c.type === 'dependency')
    if (!constraint?.related_param) return null

    const relatedValue = context.values.get(constraint.related_param)
    if (relatedValue === undefined) return null

    // Parse rule like "< related_param" or "> related_param"
    const rule = constraint.rule
    if (typeof value !== 'number' || typeof relatedValue !== 'number') return null

    // Common patterns
    if (rule.includes('<') && !rule.includes('=')) {
      if (value >= relatedValue) {
        return constraint.message
      }
    } else if (rule.includes('<=')) {
      if (value > relatedValue) {
        return constraint.message
      }
    } else if (rule.includes('>') && !rule.includes('=')) {
      if (value <= relatedValue) {
        return constraint.message
      }
    } else if (rule.includes('>=')) {
      if (value < relatedValue) {
        return constraint.message
      }
    } else if (rule.includes('!=')) {
      if (value === relatedValue) {
        return constraint.message
      }
    }

    return null
  },

  /**
   * Validates mutual exclusivity (only one can be true)
   */
  mutual_exclusive: (param, value, context) => {
    if (typeof value !== 'boolean' || !value) return null

    const constraint = param.constraints?.find(c => c.type === 'mutual_exclusive')
    if (!constraint?.related_param) return null

    const relatedParams = constraint.related_param.split(',').map(s => s.trim())
    const conflicting = relatedParams.find(key => {
      const relatedValue = context.values.get(key)
      return relatedValue === true
    })

    if (conflicting) {
      return constraint.message
    }

    return null
  },

  /**
   * Validates conditional constraints
   */
  conditional: (param, value, context) => {
    const constraint = param.constraints?.find(c => c.type === 'conditional')
    if (!constraint?.related_param) return null

    const conditionParam = constraint.related_param
    const conditionValue = context.values.get(conditionParam)

    // Check if condition is met (e.g., when related param is true/enabled)
    if (!conditionValue) return null // Condition not met, skip validation

    // Apply the rule
    if (typeof value === 'number') {
      const match = constraint.rule.match(/(\d+)\s*-\s*(\d+)/)
      if (match?.[1] && match[2]) {
        const min = parseFloat(match[1])
        const max = parseFloat(match[2])
        if (value < min || value > max) {
          return constraint.message
        }
      }
    }

    return null
  },
}

// =============================================================================
// Main Validation Function
// =============================================================================

function validateParam(
  param: InsightParam,
  value: ParamValue,
  context: ValidationContext
): { error: string | null; warning: string | null } {
  let error: string | null = null
  let warning: string | null = null

  // Check all constraints
  for (const constraint of param.constraints || []) {
    const validator = validators[constraint.type]
    if (!validator) continue

    const message = validator(param, value, context)
    if (message) {
      if (constraint.severity === 'warning') {
        warning = message
      } else {
        error = message
      }
    }
  }

  // Also run min_max validation even without explicit constraint
  if (!error && validators.min_max) {
    const minMaxError = validators.min_max(param, value, context)
    if (minMaxError) {
      error = minMaxError
    }
  }

  return { error, warning }
}

function validateAllParams(
  params: InsightParam[],
  values: Map<string, ParamValue>
): ParamValidationResult {
  const context: ValidationContext = { params, values }
  const errors: Record<string, string> = {}
  const warnings: Record<string, string> = {}

  for (const param of params) {
    const value = values.get(param.key) ?? param.value
    const { error, warning } = validateParam(param, value, context)

    if (error) {
      errors[param.key] = error
    }
    if (warning) {
      warnings[param.key] = warning
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    warnings,
  }
}

// =============================================================================
// Hook
// =============================================================================

export interface UseParamValidationOptions {
  /** Params to validate */
  params: InsightParam[]
  /** Current values (key -> value) */
  values: Map<string, ParamValue>
  /** Whether to validate on every change (default: true) */
  validateOnChange?: boolean
}

export interface UseParamValidationResult {
  /** Validation result */
  result: ParamValidationResult
  /** Check if a specific param has error */
  hasError: (key: string) => boolean
  /** Get error message for a param */
  getError: (key: string) => string | undefined
  /** Check if a specific param has warning */
  hasWarning: (key: string) => boolean
  /** Get warning message for a param */
  getWarning: (key: string) => string | undefined
  /** Whether form is valid */
  isValid: boolean
  /** Validate a single param */
  validateOne: (key: string, value: ParamValue) => { error: string | null; warning: string | null }
  /** Validate all params */
  validateAll: () => ParamValidationResult
}

export function useParamValidation({
  params,
  values,
  validateOnChange = true,
}: UseParamValidationOptions): UseParamValidationResult {
  // Memoized validation result
  const result = useMemo(() => {
    if (!validateOnChange) {
      return { valid: true, errors: {}, warnings: {} }
    }
    return validateAllParams(params, values)
  }, [params, values, validateOnChange])

  // Helper functions
  const hasError = useCallback(
    (key: string) => key in result.errors,
    [result.errors]
  )

  const getError = useCallback(
    (key: string) => result.errors[key],
    [result.errors]
  )

  const hasWarning = useCallback(
    (key: string) => key in result.warnings,
    [result.warnings]
  )

  const getWarning = useCallback(
    (key: string) => result.warnings[key],
    [result.warnings]
  )

  const validateOne = useCallback(
    (key: string, value: ParamValue) => {
      const param = params.find(p => p.key === key)
      if (!param) return { error: null, warning: null }

      const context: ValidationContext = { params, values }
      return validateParam(param, value, context)
    },
    [params, values]
  )

  const validateAll = useCallback(
    () => validateAllParams(params, values),
    [params, values]
  )

  return {
    result,
    hasError,
    getError,
    hasWarning,
    getWarning,
    isValid: result.valid,
    validateOne,
    validateAll,
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create a constraint object
 */
export function createConstraint(
  type: Constraint['type'],
  rule: string,
  message: string,
  options?: {
    related_param?: string
    severity?: 'error' | 'warning'
  }
): Constraint {
  return {
    type,
    rule,
    message,
    related_param: options?.related_param,
    severity: options?.severity ?? 'error',
  }
}

/**
 * Common constraint presets
 */
export const constraintPresets = {
  /** Stop loss must be less than take profit */
  stopLossLessThanTakeProfit: createConstraint(
    'dependency',
    '< take_profit',
    '止损价格必须小于止盈价格',
    { related_param: 'take_profit' }
  ),

  /** Take profit must be greater than stop loss */
  takeProfitGreaterThanStopLoss: createConstraint(
    'dependency',
    '> stop_loss',
    '止盈价格必须大于止损价格',
    { related_param: 'stop_loss' }
  ),

  /** Position size warning */
  positionSizeWarning: (maxPercent: number) =>
    createConstraint(
      'min_max',
      `0-${maxPercent}`,
      `建议仓位不超过 ${maxPercent}%`,
      { severity: 'warning' }
    ),
}

export default useParamValidation
