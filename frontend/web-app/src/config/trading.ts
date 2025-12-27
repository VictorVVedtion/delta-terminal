/**
 * 交易相关配置
 * 统一管理交易参数默认值，避免硬编码
 */

// =============================================================================
// 部署配置
// =============================================================================

export const DEPLOY_CONFIG = {
  /** Paper Trading 默认初始资本 (USDT) */
  paperDefaultCapital: 10000,

  /** Live Trading 默认初始资本 (USDT) - 建议使用较小金额开始 */
  liveDefaultCapital: 1000,

  /** Paper Trading 最小资本 */
  paperMinCapital: 1000,

  /** Paper Trading 最大资本 */
  paperMaxCapital: 100000,

  /** Live Trading 最小资本 */
  liveMinCapital: 100,

  /** Live Trading 最大资本 */
  liveMaxCapital: 50000,

  /** 资本调整步长 */
  capitalStep: 1000,
} as const

// =============================================================================
// 交易费用配置
// =============================================================================

export const FEE_CONFIG = {
  /** 默认 Taker 手续费率 (0.1%) */
  defaultTakerFeeRate: 0.001,

  /** 默认 Maker 手续费率 (0.08%) */
  defaultMakerFeeRate: 0.0008,

  /** 最小下单金额 (USDT) */
  minOrderValue: 10,

  /** 默认滑点 (0.05%) */
  defaultSlippage: 0.0005,
} as const

// =============================================================================
// 风险控制配置
// =============================================================================

export const RISK_CONFIG = {
  /** 默认全局止损百分比 */
  defaultGlobalStopLoss: 10,

  /** 默认单笔止损百分比 */
  defaultPositionStopLoss: 5,

  /** 默认单笔止盈百分比 */
  defaultPositionTakeProfit: 10,

  /** 默认最大持仓比例 (相对于总资本) */
  defaultMaxPositionPercent: 30,

  /** 默认最大日亏损比例 */
  defaultMaxDailyLossPercent: 5,
} as const

// =============================================================================
// 回测通过标准配置
// =============================================================================

export const BACKTEST_PASS_CRITERIA = {
  /** 最低总收益率 */
  minTotalReturn: 0,

  /** 最大回撤限制 (绝对值) */
  maxDrawdownLimit: 30,

  /** 最低胜率 */
  minWinRate: 40,

  /** 最低夏普比率 */
  minSharpeRatio: 0.5,
} as const

// =============================================================================
// 导出工具函数
// =============================================================================

/**
 * 获取部署默认资本
 */
export function getDefaultCapital(mode: 'paper' | 'live'): number {
  return mode === 'paper'
    ? DEPLOY_CONFIG.paperDefaultCapital
    : DEPLOY_CONFIG.liveDefaultCapital
}

/**
 * 获取资本限制
 */
export function getCapitalLimits(mode: 'paper' | 'live') {
  return mode === 'paper'
    ? {
        min: DEPLOY_CONFIG.paperMinCapital,
        max: DEPLOY_CONFIG.paperMaxCapital,
        step: DEPLOY_CONFIG.capitalStep,
      }
    : {
        min: DEPLOY_CONFIG.liveMinCapital,
        max: DEPLOY_CONFIG.liveMaxCapital,
        step: DEPLOY_CONFIG.capitalStep,
      }
}
