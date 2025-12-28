/**
 * 策略参数智能默认值工具模块
 *
 * 提供基于交易对的智能默认值，用于当 AI 返回的参数值为空或无效时的回退处理
 * 这是一个多层防御机制的一部分，确保用户界面始终显示有意义的值
 */

// =============================================================================
// 类型定义
// =============================================================================

export interface PriceRange {
  upper: number
  lower: number
}

export type SymbolPriceRanges = Record<string, PriceRange>

// =============================================================================
// 价格区间配置
// =============================================================================

/**
 * 各交易对的合理价格区间
 * 基于当前市场价格的合理估算，用于智能默认值
 */
export const PRICE_RANGES: SymbolPriceRanges = {
  'BTC/USDT': { upper: 105000, lower: 85000 },
  'ETH/USDT': { upper: 4200, lower: 3200 },
  'SOL/USDT': { upper: 250, lower: 180 },
  'BNB/USDT': { upper: 800, lower: 650 },
}

/**
 * 默认价格区间（当交易对未知时使用）
 */
export const DEFAULT_PRICE_RANGE: PriceRange = {
  upper: 105000,
  lower: 85000,
}

// =============================================================================
// 策略参数默认值配置
// =============================================================================

/**
 * 策略参数的通用默认值
 */
export const STRATEGY_DEFAULTS = {
  gridCount: 20,
  investment: 1000,
  backtestDays: 90,
  stopLossPercent: 15,
  takeProfitPercent: 50,
  baseAssetRatio: 50,
} as const

// =============================================================================
// 工具函数
// =============================================================================

/**
 * 获取指定交易对的价格区间
 *
 * @param symbol - 交易对符号，如 'BTC/USDT'
 * @returns 价格区间对象 { upper, lower }
 */
export function getPriceRange(symbol?: string): PriceRange {
  if (!symbol) {
    return DEFAULT_PRICE_RANGE
  }
  return PRICE_RANGES[symbol] ?? DEFAULT_PRICE_RANGE
}

/**
 * 判断值是否需要使用智能默认值
 *
 * 注意：此函数区分"未设置"和"有意设为0"的情况
 * - undefined/null: 需要使用默认值
 * - 0 且参数是价格相关: 可能需要默认值（价格不太可能为0）
 * - 0 且参数是数量相关: 可能是有效值，需要根据上下文判断
 *
 * @param value - 当前参数值
 * @param key - 参数键名
 * @returns 是否需要使用智能默认值
 */
export function needsSmartDefault(value: unknown, key: string): boolean {
  // undefined 或 null 始终需要默认值
  if (value === undefined || value === null) {
    return true
  }

  // 对于数值类型，只有价格相关参数在值为 0 时需要默认值
  // 因为价格不可能为 0，所以 0 意味着"未设置"
  if (typeof value === 'number' && value === 0) {
    const priceRelatedKeys = ['upperBound', 'lowerBound', 'triggerPrice', 'entryPrice', 'stopPrice']
    return priceRelatedKeys.includes(key)
  }

  return false
}

/**
 * 获取策略参数的智能默认值
 *
 * 当参数值为空或无效时，根据参数类型和交易对提供合理的默认值
 * 这是 A2UI 系统多层防御机制的关键部分
 *
 * @param key - 参数键名
 * @param currentValue - 当前参数值
 * @param symbol - 交易对符号（可选）
 * @returns 智能默认值，如果不需要默认值则返回原值
 *
 * @example
 * ```typescript
 * // 价格上界为 0 时，返回 BTC 的默认上界
 * getSmartDefaultValue('upperBound', 0, 'BTC/USDT') // 105000
 *
 * // 网格数量为 undefined 时，返回默认值
 * getSmartDefaultValue('gridCount', undefined) // 20
 *
 * // 有效值直接返回
 * getSmartDefaultValue('upperBound', 98000, 'BTC/USDT') // 98000
 * ```
 */
export function getSmartDefaultValue(
  key: string,
  currentValue: number | undefined | null,
  symbol?: string
): number | undefined {
  // 检查是否需要使用智能默认值
  if (!needsSmartDefault(currentValue, key)) {
    return currentValue ?? undefined
  }

  // 获取交易对的价格区间
  const priceRange = getPriceRange(symbol)

  // 根据参数类型返回智能默认值
  switch (key) {
    // 价格相关参数
    case 'upperBound':
      return priceRange.upper
    case 'lowerBound':
      return priceRange.lower

    // 网格策略参数
    case 'gridCount':
      return STRATEGY_DEFAULTS.gridCount
    case 'investment':
      return STRATEGY_DEFAULTS.investment

    // 风险管理参数
    case 'stopLossPercent':
      return STRATEGY_DEFAULTS.stopLossPercent
    case 'takeProfitPercent':
      return STRATEGY_DEFAULTS.takeProfitPercent

    // 其他参数
    case 'backtestDays':
      return STRATEGY_DEFAULTS.backtestDays
    case 'baseAssetRatio':
      return STRATEGY_DEFAULTS.baseAssetRatio

    default:
      return currentValue ?? undefined
  }
}

/**
 * 批量应用智能默认值到参数对象
 *
 * @param params - 参数对象 { key: value }
 * @param symbol - 交易对符号
 * @returns 应用了智能默认值的新参数对象
 */
export function applySmartDefaults(
  params: Record<string, number | undefined | null>,
  symbol?: string
): Record<string, number | undefined> {
  const result: Record<string, number | undefined> = {}

  for (const [key, value] of Object.entries(params)) {
    result[key] = getSmartDefaultValue(key, value, symbol)
  }

  return result
}

// =============================================================================
// 调试辅助
// =============================================================================

/**
 * 记录智能默认值应用的调试日志
 *
 * @param component - 组件名称
 * @param key - 参数键名
 * @param originalValue - 原始值
 * @param smartValue - 智能默认值
 * @param symbol - 交易对
 */
export function logSmartDefault(
  component: string,
  key: string,
  originalValue: unknown,
  smartValue: number | undefined,
  symbol?: string
): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(
      `[${component}] Smart default applied: ${key} = ${originalValue} → ${smartValue}`,
      symbol ? `(${symbol})` : ''
    )
  }
}
