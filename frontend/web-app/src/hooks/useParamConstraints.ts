/**
 * useParamConstraints - InsightParam 约束验证 Hook
 *
 * 验证参数值是否满足定义的约束条件
 */

import { useMemo, useCallback } from 'react'
import type { InsightParam, Constraint, ConstraintType } from '@/types/insight'

// =============================================================================
// Types
// =============================================================================

export interface ConstraintViolation {
  paramKey: string
  constraintType: ConstraintType
  message: string
  severity: 'error' | 'warning'
  rule: string
}

export interface ParamValidationResult {
  /** 是否全部通过验证 */
  valid: boolean
  /** 是否有警告 */
  hasWarnings: boolean
  /** 是否有错误 */
  hasErrors: boolean
  /** 所有违规项 */
  violations: ConstraintViolation[]
  /** 按参数分组的违规 */
  violationsByParam: Record<string, ConstraintViolation[]>
  /** 验证单个参数 */
  validateParam: (param: InsightParam) => ConstraintViolation[]
}

// =============================================================================
// Constraint Evaluators
// =============================================================================

/**
 * 评估 min_max 约束
 */
function evaluateMinMax(
  param: InsightParam,
  constraint: Constraint,
  allParams: InsightParam[]
): ConstraintViolation | null {
  const value = param.value as number
  const config = param.config

  // Check against param config min/max first
  if (config?.min !== undefined && value < config.min) {
    return {
      paramKey: param.key,
      constraintType: 'min_max',
      message: constraint.message || `${param.label} 不能小于 ${config.min}`,
      severity: constraint.severity || 'error',
      rule: constraint.rule,
    }
  }

  if (config?.max !== undefined && value > config.max) {
    return {
      paramKey: param.key,
      constraintType: 'min_max',
      message: constraint.message || `${param.label} 不能大于 ${config.max}`,
      severity: constraint.severity || 'error',
      rule: constraint.rule,
    }
  }

  // Evaluate custom rule expression if present
  if (constraint.rule) {
    try {
      // Simple expression evaluation (e.g., "value >= 5 && value <= 100")
      const evalResult = evaluateExpression(constraint.rule, {
        value,
        params: Object.fromEntries(allParams.map(p => [p.key, p.value])),
      })
      if (!evalResult) {
        return {
          paramKey: param.key,
          constraintType: 'min_max',
          message: constraint.message,
          severity: constraint.severity || 'error',
          rule: constraint.rule,
        }
      }
    } catch {
      // Rule evaluation failed, skip
    }
  }

  return null
}

/**
 * 评估 dependency 约束
 */
function evaluateDependency(
  param: InsightParam,
  constraint: Constraint,
  allParams: InsightParam[]
): ConstraintViolation | null {
  if (!constraint.related_param) return null

  const relatedParam = allParams.find(p => p.key === constraint.related_param)
  if (!relatedParam) return null

  try {
    const evalResult = evaluateExpression(constraint.rule, {
      value: param.value,
      related: relatedParam.value,
      params: Object.fromEntries(allParams.map(p => [p.key, p.value])),
    })

    if (!evalResult) {
      return {
        paramKey: param.key,
        constraintType: 'dependency',
        message: constraint.message || `${param.label} 依赖于 ${relatedParam.label} 的值`,
        severity: constraint.severity || 'warning',
        rule: constraint.rule,
      }
    }
  } catch {
    // Rule evaluation failed
  }

  return null
}

/**
 * 评估 mutual_exclusive 约束
 */
function evaluateMutualExclusive(
  param: InsightParam,
  constraint: Constraint,
  allParams: InsightParam[]
): ConstraintViolation | null {
  if (!constraint.related_param) return null

  const relatedParam = allParams.find(p => p.key === constraint.related_param)
  if (!relatedParam) return null

  // Check if both are truthy (for toggles) or both have values
  const paramActive = Boolean(param.value)
  const relatedActive = Boolean(relatedParam.value)

  if (paramActive && relatedActive) {
    return {
      paramKey: param.key,
      constraintType: 'mutual_exclusive',
      message: constraint.message || `${param.label} 与 ${relatedParam.label} 不能同时启用`,
      severity: constraint.severity || 'error',
      rule: constraint.rule,
    }
  }

  return null
}

/**
 * 评估 conditional 约束
 */
function evaluateConditional(
  param: InsightParam,
  constraint: Constraint,
  allParams: InsightParam[]
): ConstraintViolation | null {
  try {
    const evalResult = evaluateExpression(constraint.rule, {
      value: param.value,
      params: Object.fromEntries(allParams.map(p => [p.key, p.value])),
    })

    if (!evalResult) {
      return {
        paramKey: param.key,
        constraintType: 'conditional',
        message: constraint.message,
        severity: constraint.severity || 'warning',
        rule: constraint.rule,
      }
    }
  } catch {
    // Rule evaluation failed
  }

  return null
}

/**
 * 简单表达式评估器
 * 支持基本的比较和逻辑运算
 */
function evaluateExpression(
  expression: string,
  context: Record<string, unknown>
): boolean {
  // Safety: Only allow simple expressions
  const safeExpression = expression
    .replace(/[^a-zA-Z0-9_\s<>=!&|+\-*/.()]/g, '')

  // Create a safe evaluation function
  const keys = Object.keys(context)
  const values = Object.values(context)

  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(...keys, `return ${safeExpression}`)
    return Boolean(fn(...values))
  } catch {
    return true // Default to valid if expression fails
  }
}

// =============================================================================
// Main Hook
// =============================================================================

export function useParamConstraints(params: InsightParam[]): ParamValidationResult {
  /**
   * 验证单个参数的所有约束
   */
  const validateParam = useCallback((param: InsightParam): ConstraintViolation[] => {
    const violations: ConstraintViolation[] = []
    const constraints = param.constraints || []

    for (const constraint of constraints) {
      let violation: ConstraintViolation | null = null

      switch (constraint.type) {
        case 'min_max':
          violation = evaluateMinMax(param, constraint, params)
          break
        case 'dependency':
          violation = evaluateDependency(param, constraint, params)
          break
        case 'mutual_exclusive':
          violation = evaluateMutualExclusive(param, constraint, params)
          break
        case 'conditional':
          violation = evaluateConditional(param, constraint, params)
          break
      }

      if (violation) {
        violations.push(violation)
      }
    }

    return violations
  }, [params])

  /**
   * 计算所有参数的验证结果
   */
  const validationResult = useMemo(() => {
    const allViolations: ConstraintViolation[] = []
    const violationsByParam: Record<string, ConstraintViolation[]> = {}

    for (const param of params) {
      const paramViolations = validateParam(param)
      if (paramViolations.length > 0) {
        allViolations.push(...paramViolations)
        violationsByParam[param.key] = paramViolations
      }
    }

    const hasErrors = allViolations.some(v => v.severity === 'error')
    const hasWarnings = allViolations.some(v => v.severity === 'warning')

    return {
      valid: !hasErrors,
      hasWarnings,
      hasErrors,
      violations: allViolations,
      violationsByParam,
      validateParam,
    }
  }, [params, validateParam])

  return validationResult
}

export default useParamConstraints
