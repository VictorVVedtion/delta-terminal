/**
 * Schema 验证器
 *
 * 执行 Schema 级别的跨字段验证规则
 */

import type { ParamValue } from '@/types/insight'
import type { SchemaValidator } from '@/types/strategy-schema'

// =============================================================================
// 验证结果类型
// =============================================================================

export interface ValidationResult {
  /** 是否通过所有 error 级别验证 */
  valid: boolean
  /** 错误消息列表 */
  errors: string[]
  /** 警告消息列表 */
  warnings: string[]
}

// =============================================================================
// 验证函数
// =============================================================================

/**
 * 执行 Schema 级别的验证规则
 *
 * @param validators 验证规则列表
 * @param params 当前参数值
 * @returns 验证结果
 */
export function validateSchema(
  validators: SchemaValidator[],
  params: Record<string, ParamValue>
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  for (const validator of validators) {
    try {
      const isValid = evaluateValidatorExpression(validator.expression, params)

      if (!isValid) {
        if (validator.severity === 'error') {
          errors.push(validator.message)
        } else {
          warnings.push(validator.message)
        }
      }
    } catch (error) {
      // 验证表达式执行失败，视为 warning
      warnings.push(`验证规则 "${validator.name}" 执行失败: ${(error as Error).message}`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * 安全地执行验证表达式
 */
function evaluateValidatorExpression(
  expression: string,
  params: Record<string, ParamValue>
): boolean {
  // 白名单验证
  const safePattern = /^[a-zA-Z0-9_\s+\-*/%.()[\],<>=!&|?:'"]+$/
  if (!safePattern.test(expression)) {
    throw new Error(`不安全的验证表达式: ${expression}`)
  }

  // 禁止危险模式
  const dangerousPatterns = [
    /\beval\b/,
    /\bFunction\b/,
    /\bthis\b/,
    /\bwindow\b/,
    /\bglobal\b/,
    /\bprocess\b/,
    /\brequire\b/,
    /\bimport\b/,
  ]

  for (const pattern of dangerousPatterns) {
    if (pattern.test(expression)) {
      throw new Error(`验证表达式包含不允许的内容`)
    }
  }

  try {
    // 构建函数
    const keys = Object.keys(params)
    const values = Object.values(params)

    // eslint-disable-next-line no-new-func
    const fn = new Function(...keys, `"use strict"; return Boolean(${expression})`)
    return fn(...values)
  } catch (error) {
    throw new Error(`验证表达式执行失败: ${(error as Error).message}`)
  }
}

// =============================================================================
// 字段级验证
// =============================================================================

/**
 * 验证单个字段值
 */
export function validateFieldValue(
  key: string,
  value: ParamValue,
  config: {
    required?: boolean
    min?: number
    max?: number
    pattern?: string
  }
): { valid: boolean; error?: string } {
  // 必填验证
  if (config.required && (value === undefined || value === null || value === '')) {
    return { valid: false, error: '此字段为必填项' }
  }

  // 数值范围验证
  if (typeof value === 'number') {
    if (config.min !== undefined && value < config.min) {
      return { valid: false, error: `值不能小于 ${config.min}` }
    }
    if (config.max !== undefined && value > config.max) {
      return { valid: false, error: `值不能大于 ${config.max}` }
    }
  }

  // 正则验证
  if (config.pattern && typeof value === 'string') {
    const regex = new RegExp(config.pattern)
    if (!regex.test(value)) {
      return { valid: false, error: '格式不正确' }
    }
  }

  return { valid: true }
}

/**
 * 评估条件表达式（用于 showWhen）
 */
export function evaluateCondition(
  expression: string,
  params: Record<string, ParamValue>
): boolean {
  if (!expression) return true

  try {
    return evaluateValidatorExpression(expression, params)
  } catch {
    // 条件评估失败时默认显示
    return true
  }
}
