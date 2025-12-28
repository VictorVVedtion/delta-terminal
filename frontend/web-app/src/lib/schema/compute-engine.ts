/**
 * 计算字段引擎
 *
 * 安全的数学表达式评估器，支持：
 * - 基本运算: +, -, *, /, %
 * - 括号: ()
 * - 参数引用: params.xxx
 * - 上下文引用: ctx.xxx
 * - 内置函数: round, floor, ceil, abs, min, max
 */

import type { ParamValue } from '@/types/insight'
import type { ComputeContext } from '@/types/strategy-schema'

// =============================================================================
// 核心计算函数
// =============================================================================

/**
 * 计算单个字段的值
 *
 * @param formula 计算公式
 * @param params 当前参数值对象
 * @param context 计算上下文
 * @returns 计算结果
 */
export function computeFieldValue(
  formula: string,
  params: Record<string, ParamValue>,
  context: ComputeContext = {}
): ParamValue {
  // 创建安全的执行环境
  const safeEnv = createSafeEnvironment(params, context)

  try {
    // 解析并执行公式
    const result = evaluateFormula(formula, safeEnv)
    return result
  } catch (error) {
    console.error(`计算公式失败: ${formula}`, error)
    throw error
  }
}

/**
 * 创建安全的执行环境
 */
function createSafeEnvironment(
  params: Record<string, ParamValue>,
  context: ComputeContext
): Record<string, unknown> {
  return {
    // 参数值
    ...params,

    // 上下文值
    ctx: context,
    currentPrice: context.currentPrice ?? 0,
    high24h: context.high24h ?? 0,
    low24h: context.low24h ?? 0,
    balance: context.balance ?? 0,

    // 安全的数学函数
    round: Math.round,
    floor: Math.floor,
    ceil: Math.ceil,
    abs: Math.abs,
    min: Math.min,
    max: Math.max,
    pow: Math.pow,
    sqrt: Math.sqrt,

    // 辅助函数
    percentage: (value: number, percent: number) => value * (percent / 100),
    clamp: (value: number, min: number, max: number) =>
      Math.min(Math.max(value, min), max),
    toFixed: (value: number, digits: number) => Number(value.toFixed(digits)),
  }
}

/**
 * 安全地评估公式表达式
 */
function evaluateFormula(
  formula: string,
  env: Record<string, unknown>
): ParamValue {
  // 白名单验证 - 只允许安全的字符
  const safePattern = /^[a-zA-Z0-9_\s+\-*/%.()[\],<>=!&|?:'"]+$/
  if (!safePattern.test(formula)) {
    throw new Error(`不安全的公式: ${formula}`)
  }

  // 禁止的模式
  const dangerousPatterns = [
    /\beval\b/,
    /\bFunction\b/,
    /\bthis\b/,
    /\bwindow\b/,
    /\bglobal\b/,
    /\bprocess\b/,
    /\brequire\b/,
    /\bimport\b/,
    /\bexport\b/,
    /__proto__/,
    /constructor/,
  ]

  for (const pattern of dangerousPatterns) {
    if (pattern.test(formula)) {
      throw new Error(`公式包含不允许的内容: ${formula}`)
    }
  }

  // 构建函数参数
  const keys = Object.keys(env)
  const values = Object.values(env)

  try {
    // 使用 Function 构造器创建沙箱函数
    // eslint-disable-next-line no-new-func
    const fn = new Function(...keys, `"use strict"; return (${formula})`)
    const result = fn(...values)

    // 验证结果类型
    if (typeof result === 'number' && !isFinite(result)) {
      throw new Error(`计算结果无效: ${result}`)
    }

    return result as ParamValue
  } catch (error) {
    throw new Error(`公式执行失败: ${(error as Error).message}`)
  }
}

// =============================================================================
// 批量计算
// =============================================================================

/**
 * 批量计算所有派生字段
 *
 * @param fields Schema 字段定义列表
 * @param params 当前参数值
 * @param context 计算上下文
 * @returns 包含计算字段的完整参数值
 */
export function computeAllDerivedFields(
  fields: Array<{ key: string; formula?: string; computed?: boolean }>,
  params: Record<string, ParamValue>,
  context: ComputeContext = {}
): Record<string, ParamValue> {
  const result = { ...params }

  // 按依赖顺序排序（拓扑排序的简化版本）
  const computedFields = fields.filter(f => f.computed && f.formula)

  // 迭代计算（最多 10 轮，防止循环依赖）
  let changed = true
  let iterations = 0
  const maxIterations = 10

  while (changed && iterations < maxIterations) {
    changed = false
    iterations++

    for (const field of computedFields) {
      try {
        const newValue = computeFieldValue(field.formula!, result, context)
        if (result[field.key] !== newValue) {
          result[field.key] = newValue
          changed = true
        }
      } catch {
        // 计算失败，保持原值或使用默认值
      }
    }
  }

  if (iterations >= maxIterations) {
    console.warn('计算字段可能存在循环依赖，已达到最大迭代次数')
  }

  return result
}

// =============================================================================
// 验证工具
// =============================================================================

/**
 * 验证公式语法
 */
export function validateFormula(formula: string): { valid: boolean; error?: string } {
  try {
    // 尝试解析公式（使用虚拟参数）
    const dummyEnv = {
      value: 0,
      round: Math.round,
      floor: Math.floor,
      ceil: Math.ceil,
      abs: Math.abs,
      min: Math.min,
      max: Math.max,
      toFixed: (v: number, d: number) => Number(v.toFixed(d)),
    }

    // 替换所有变量为 0 进行语法检查
    const testFormula = formula.replace(/[a-zA-Z_][a-zA-Z0-9_]*/g, '0')
    evaluateFormula(testFormula, dummyEnv)
    return { valid: true }
  } catch (error) {
    return { valid: false, error: (error as Error).message }
  }
}

/**
 * 获取公式中引用的变量名
 */
export function getFormulaVariables(formula: string): string[] {
  // 匹配变量名（排除函数名）
  const funcNames = ['round', 'floor', 'ceil', 'abs', 'min', 'max', 'pow', 'sqrt', 'percentage', 'clamp', 'toFixed', 'ctx']
  const matches = formula.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || []
  return [...new Set(matches.filter(m => !funcNames.includes(m)))]
}
