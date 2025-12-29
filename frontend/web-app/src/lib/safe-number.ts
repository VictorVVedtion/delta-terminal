/**
 * safe-number.ts - 安全的数值处理工具
 *
 * 提供防御性的数值处理函数，防止 undefined/null/NaN 导致的渲染崩溃
 */

// =============================================================================
// 类型定义
// =============================================================================

type NumberInput = number | string | null | undefined

// =============================================================================
// 核心函数
// =============================================================================

/**
 * 将任意值安全地转换为数字
 *
 * @param value - 待转换的值
 * @param fallback - 无法转换时的默认值（默认 0）
 * @returns 安全的数字值
 *
 * @example
 * safeNumber(123) // 123
 * safeNumber("45.6") // 45.6
 * safeNumber(null, 100) // 100
 * safeNumber(undefined) // 0
 * safeNumber(NaN) // 0
 * safeNumber("abc") // 0
 */
export function safeNumber(value: unknown, fallback: number = 0): number {
  // 已经是合法数字
  if (typeof value === 'number' && !Number.isNaN(value) && Number.isFinite(value)) {
    return value
  }

  // 尝试转换字符串
  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
      return parsed
    }
  }

  // 其他情况返回默认值
  return fallback
}

/**
 * 安全地格式化百分比
 *
 * @param value - 百分比数值（0-100 或 0-1 格式）
 * @param decimals - 小数位数（默认 2）
 * @param showSign - 是否显示 +/- 符号（默认 true）
 * @returns 格式化的百分比字符串
 *
 * @example
 * formatSafePercent(15.678) // "+15.68%"
 * formatSafePercent(-5.2) // "-5.20%"
 * formatSafePercent(null) // "0.00%"
 * formatSafePercent(0.156, 2) // "+15.60%" (自动检测 0-1 格式)
 */
export function formatSafePercent(
  value: unknown,
  decimals: number = 2,
  showSign: boolean = true
): string {
  const num = safeNumber(value, 0)

  // 自动检测是否为 0-1 格式（小于 1 的正数或大于 -1 的负数）
  const isDecimalFormat = num > -1 && num < 1 && num !== 0
  const percentValue = isDecimalFormat ? num * 100 : num

  const formatted = percentValue.toFixed(decimals)

  if (showSign && percentValue >= 0) {
    return `+${formatted}%`
  }

  return `${formatted}%`
}

/**
 * 安全地格式化货币
 *
 * @param value - 金额数值
 * @param decimals - 小数位数（默认 2）
 * @param symbol - 货币符号（默认 '$'）
 * @returns 格式化的货币字符串
 *
 * @example
 * formatSafeCurrency(1234.567) // "$1,234.57"
 * formatSafeCurrency(null) // "$0.00"
 * formatSafeCurrency(9999, 0, '¥') // "¥9,999"
 */
export function formatSafeCurrency(
  value: unknown,
  decimals: number = 2,
  symbol: string = '$'
): string {
  const num = safeNumber(value, 0)

  return `${symbol}${num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}

/**
 * 安全地格式化数字（带千分位）
 *
 * @param value - 数值
 * @param decimals - 小数位数（默认 2）
 * @returns 格式化的数字字符串
 *
 * @example
 * formatSafeNumber(1234567.89) // "1,234,567.89"
 * formatSafeNumber(null) // "0.00"
 * formatSafeNumber(1234, 0) // "1,234"
 */
export function formatSafeNumber(value: unknown, decimals: number = 2): string {
  const num = safeNumber(value, 0)

  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * 检查值是否为合法数字
 *
 * @param value - 待检查的值
 * @returns 是否为合法数字
 *
 * @example
 * isValidNumber(123) // true
 * isValidNumber("45.6") // true
 * isValidNumber(null) // false
 * isValidNumber(NaN) // false
 * isValidNumber(Infinity) // false
 */
export function isValidNumber(value: unknown): value is number {
  if (typeof value === 'number') {
    return !Number.isNaN(value) && Number.isFinite(value)
  }

  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    return !Number.isNaN(parsed) && Number.isFinite(parsed)
  }

  return false
}

/**
 * 安全地进行除法运算
 *
 * @param numerator - 分子
 * @param denominator - 分母
 * @param fallback - 除数为 0 时的默认值
 * @returns 除法结果
 *
 * @example
 * safeDivide(10, 2) // 5
 * safeDivide(10, 0) // 0
 * safeDivide(10, 0, 100) // 100
 */
export function safeDivide(
  numerator: unknown,
  denominator: unknown,
  fallback: number = 0
): number {
  const num = safeNumber(numerator, 0)
  const den = safeNumber(denominator, 0)

  if (den === 0) {
    return fallback
  }

  const result = num / den

  return isValidNumber(result) ? result : fallback
}

/**
 * 安全地计算百分比变化
 *
 * @param current - 当前值
 * @param previous - 之前的值
 * @param asDecimal - 是否返回小数格式（0-1）而非百分比格式（0-100）
 * @returns 百分比变化
 *
 * @example
 * safePercentChange(110, 100) // 10 (+10%)
 * safePercentChange(90, 100) // -10 (-10%)
 * safePercentChange(110, 0) // 0 (避免除以零)
 * safePercentChange(110, 100, true) // 0.1 (10% as decimal)
 */
export function safePercentChange(
  current: unknown,
  previous: unknown,
  asDecimal: boolean = false
): number {
  const curr = safeNumber(current, 0)
  const prev = safeNumber(previous, 0)

  if (prev === 0) {
    return 0
  }

  const change = ((curr - prev) / prev) * (asDecimal ? 1 : 100)

  return isValidNumber(change) ? change : 0
}

/**
 * 将数字限制在指定范围内
 *
 * @param value - 待限制的值
 * @param min - 最小值
 * @param max - 最大值
 * @returns 限制后的值
 *
 * @example
 * clamp(150, 0, 100) // 100
 * clamp(-10, 0, 100) // 0
 * clamp(50, 0, 100) // 50
 */
export function clamp(value: unknown, min: number, max: number): number {
  const num = safeNumber(value, min)
  return Math.min(Math.max(num, min), max)
}

/**
 * 安全地四舍五入到指定小数位
 *
 * @param value - 待四舍五入的值
 * @param decimals - 小数位数
 * @returns 四舍五入后的值
 *
 * @example
 * safeRound(3.14159, 2) // 3.14
 * safeRound(null, 2) // 0.00
 */
export function safeRound(value: unknown, decimals: number = 0): number {
  const num = safeNumber(value, 0)
  const multiplier = Math.pow(10, decimals)
  return Math.round(num * multiplier) / multiplier
}

// =============================================================================
// 导出所有函数
// =============================================================================

export default {
  safeNumber,
  formatSafePercent,
  formatSafeCurrency,
  formatSafeNumber,
  isValidNumber,
  safeDivide,
  safePercentChange,
  clamp,
  safeRound,
}
