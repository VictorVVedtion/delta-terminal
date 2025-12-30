/**
 * Perpetual Paper Trading Types - 永续合约模拟交易
 *
 * 扩展 Paper Trading 以支持：
 * - 杠杆交易 (1x - 100x)
 * - 做多/做空
 * - 保证金计算
 * - 爆仓模拟
 * - 风险管理
 */

import type { RiskLevel } from '@/types/perpetual'

// =============================================================================
// Constants
// =============================================================================

/** 默认维持保证金率 */
export const DEFAULT_MAINTENANCE_MARGIN_RATE = 0.005 // 0.5%

/** 不同币种的维持保证金率 */
export const MAINTENANCE_MARGIN_RATES: Record<string, number> = {
  BTC: 0.004,   // 0.4%
  ETH: 0.005,   // 0.5%
  SOL: 0.006,   // 0.6%
  DEFAULT: 0.008, // 0.8%
}

/** 最大杠杆限制 */
export const MAX_LEVERAGE_LIMITS: Record<string, number> = {
  BTC: 100,
  ETH: 100,
  SOL: 50,
  DEFAULT: 20,
}

/** 风险等级阈值 (保证金率) */
export const RISK_THRESHOLDS = {
  SAFE: 150,      // >= 150% 安全
  WARNING: 120,   // >= 120% 警告
  DANGER: 110,    // >= 110% 危险
  LIQUIDATION: 100, // < 100% 爆仓
}

// =============================================================================
// Perpetual Paper Account
// =============================================================================

/**
 * 永续合约模拟账户
 */
export interface PerpetualPaperAccount {
  /** 账户 ID */
  id: string
  /** 用户 ID */
  userId: string
  /** 关联的 Agent ID (可选) */
  agentId?: string
  /** 初始资金 (USDT) */
  initialCapital: number
  /** 钱包余额 (USDT) - 未使用的资金 */
  walletBalance: number
  /** 账户权益 (USDT) - 余额 + 未实现盈亏 */
  totalEquity: number
  /** 可用保证金 (USDT) */
  availableMargin: number
  /** 已用保证金 (USDT) */
  usedMargin: number
  /** 维持保证金 (USDT) */
  maintenanceMargin: number
  /** 保证金率 (%) */
  marginRatio: number
  /** 风险等级 */
  riskLevel: RiskLevel
  /** 总未实现盈亏 (USDT) */
  totalUnrealizedPnl: number
  /** 总已实现盈亏 (USDT) */
  totalRealizedPnl: number
  /** 持仓列表 */
  positions: PerpetualPaperPosition[]
  /** 交易记录 */
  trades: PerpetualPaperTrade[]
  /** 爆仓记录 */
  liquidations: PerpetualLiquidation[]
  /** 创建时间 */
  createdAt: number
  /** 最后更新时间 */
  updatedAt: number
}

// =============================================================================
// Perpetual Paper Position
// =============================================================================

/**
 * 持仓方向
 */
export type PositionSide = 'long' | 'short'

/**
 * 保证金模式
 */
export type MarginMode = 'cross' | 'isolated'

/**
 * 永续合约模拟持仓
 */
export interface PerpetualPaperPosition {
  /** 持仓 ID */
  id: string
  /** 账户 ID */
  accountId: string
  /** 交易对 (如 BTC-PERP) */
  symbol: string
  /** 币种 (如 BTC) */
  coin: string
  /** 方向 */
  side: PositionSide
  /** 持仓数量 (币) */
  size: number
  /** 名义价值 (USDT) */
  notionalValue: number
  /** 开仓均价 */
  entryPrice: number
  /** 当前标记价格 */
  markPrice: number
  /** 爆仓价格 */
  liquidationPrice: number
  /** 杠杆倍数 */
  leverage: number
  /** 保证金模式 */
  marginMode: MarginMode
  /** 初始保证金 (USDT) */
  initialMargin: number
  /** 维持保证金 (USDT) */
  maintenanceMargin: number
  /** 未实现盈亏 (USDT) */
  unrealizedPnl: number
  /** 未实现盈亏百分比 */
  unrealizedPnlPercent: number
  /** ROE (基于保证金的收益率) */
  returnOnEquity: number
  /** 止盈价格 */
  takeProfitPrice: number | null
  /** 止损价格 */
  stopLossPrice: number | null
  /** 开仓时间 */
  openedAt: number
  /** 最后更新时间 */
  updatedAt: number
}

// =============================================================================
// Perpetual Paper Trade
// =============================================================================

/**
 * 交易方向
 */
export type TradeSide = 'buy' | 'sell'

/**
 * 订单类型
 */
export type OrderType = 'market' | 'limit' | 'stop_market' | 'take_profit' | 'stop_loss'

/**
 * 交易动作类型
 */
export type TradeAction = 'open' | 'close' | 'add' | 'reduce' | 'liquidation'

/**
 * 永续合约模拟交易记录
 */
export interface PerpetualPaperTrade {
  /** 交易 ID */
  id: string
  /** 账户 ID */
  accountId: string
  /** 关联持仓 ID */
  positionId?: string
  /** 交易对 */
  symbol: string
  /** 币种 */
  coin: string
  /** 交易方向 */
  side: TradeSide
  /** 持仓方向 */
  positionSide: PositionSide
  /** 订单类型 */
  orderType: OrderType
  /** 交易动作 */
  action: TradeAction
  /** 数量 */
  size: number
  /** 成交价格 */
  price: number
  /** 名义价值 */
  notionalValue: number
  /** 杠杆 */
  leverage: number
  /** 手续费 (USDT) */
  fee: number
  /** 已实现盈亏 (平仓时) */
  realizedPnl: number | null
  /** 成交时间 */
  timestamp: number
}

// =============================================================================
// Liquidation
// =============================================================================

/**
 * 爆仓记录
 */
export interface PerpetualLiquidation {
  /** 爆仓 ID */
  id: string
  /** 账户 ID */
  accountId: string
  /** 持仓 ID */
  positionId: string
  /** 交易对 */
  symbol: string
  /** 币种 */
  coin: string
  /** 方向 */
  side: PositionSide
  /** 持仓数量 */
  size: number
  /** 开仓价格 */
  entryPrice: number
  /** 爆仓价格 */
  liquidationPrice: number
  /** 实际爆仓时的标记价格 */
  markPriceAtLiquidation: number
  /** 损失金额 (USDT) */
  lossAmount: number
  /** 爆仓时间 */
  timestamp: number
}

// =============================================================================
// Order Actions
// =============================================================================

/**
 * 开仓参数
 */
export interface OpenPositionParams {
  /** 交易对 */
  symbol: string
  /** 币种 */
  coin: string
  /** 方向 */
  side: PositionSide
  /** 数量 (币) */
  size: number
  /** 价格 (市价单时使用当前价格) */
  price: number
  /** 杠杆倍数 */
  leverage: number
  /** 保证金模式 */
  marginMode?: MarginMode
  /** 止盈价格 (可选) */
  takeProfitPrice?: number
  /** 止损价格 (可选) */
  stopLossPrice?: number
}

/**
 * 开仓结果
 */
export interface OpenPositionResult {
  success: boolean
  position?: PerpetualPaperPosition
  trade?: PerpetualPaperTrade
  error?: string
}

/**
 * 平仓参数
 */
export interface ClosePositionParams {
  /** 持仓 ID */
  positionId: string
  /** 平仓数量 (可选，默认全部平仓) */
  size?: number
  /** 平仓价格 */
  price: number
}

/**
 * 平仓结果
 */
export interface ClosePositionResult {
  success: boolean
  trade?: PerpetualPaperTrade
  realizedPnl?: number
  error?: string
}

/**
 * 调整杠杆参数
 */
export interface AdjustLeverageParams {
  positionId: string
  newLeverage: number
}

/**
 * 设置止盈止损参数
 */
export interface SetTpSlParams {
  positionId: string
  takeProfitPrice?: number | null
  stopLossPrice?: number | null
}

// =============================================================================
// Account Statistics
// =============================================================================

/**
 * 账户统计信息
 */
export interface PerpetualPaperAccountStats {
  /** 账户 ID */
  accountId: string
  /** 总资产 */
  totalEquity: number
  /** 总盈亏 (USDT) */
  totalPnl: number
  /** 总盈亏百分比 */
  totalPnlPercent: number
  /** 未实现盈亏 */
  unrealizedPnl: number
  /** 已实现盈亏 */
  realizedPnl: number
  /** 总交易次数 */
  totalTrades: number
  /** 盈利交易次数 */
  winTrades: number
  /** 亏损交易次数 */
  lossTrades: number
  /** 胜率 (%) */
  winRate: number
  /** 最大回撤 (%) */
  maxDrawdown: number
  /** 平均盈利 */
  avgWin: number
  /** 平均亏损 */
  avgLoss: number
  /** 盈亏比 */
  profitFactor: number
  /** 总手续费 */
  totalFees: number
  /** 爆仓次数 */
  liquidationCount: number
  /** 总爆仓损失 */
  totalLiquidationLoss: number
}

// =============================================================================
// Configuration
// =============================================================================

/**
 * 永续合约 Paper Trading 配置
 */
export interface PerpetualPaperTradingConfig {
  /** 默认手续费率 (Taker) */
  defaultFeeRate: number
  /** 最小下单金额 (USDT) */
  minOrderValue: number
  /** 默认杠杆 */
  defaultLeverage: number
  /** 最大杠杆 */
  maxLeverage: number
  /** 默认保证金模式 */
  defaultMarginMode: MarginMode
  /** 是否启用滑点模拟 */
  enableSlippage: boolean
  /** 滑点百分比 */
  slippagePercent: number
  /** 是否启用资金费率 */
  enableFundingRate: boolean
  /** 资金费率间隔 (小时) */
  fundingRateInterval: number
}

/**
 * 默认配置
 */
export const DEFAULT_PERPETUAL_PAPER_CONFIG: PerpetualPaperTradingConfig = {
  defaultFeeRate: 0.0005,     // 0.05% Taker Fee (Hyperliquid rate)
  minOrderValue: 10,          // 最小 10 USDT
  defaultLeverage: 10,        // 默认 10x
  maxLeverage: 100,           // 最大 100x
  defaultMarginMode: 'cross', // 默认全仓
  enableSlippage: false,      // 暂不启用滑点
  slippagePercent: 0.001,     // 0.1% 滑点
  enableFundingRate: false,   // 暂不启用资金费率
  fundingRateInterval: 8,     // 8小时一次
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * 获取币种的维持保证金率
 */
export function getMaintenanceMarginRate(coin: string): number {
  return MAINTENANCE_MARGIN_RATES[coin] ?? MAINTENANCE_MARGIN_RATES.DEFAULT
}

/**
 * 获取币种的最大杠杆
 */
export function getMaxLeverage(coin: string): number {
  return MAX_LEVERAGE_LIMITS[coin] ?? MAX_LEVERAGE_LIMITS.DEFAULT
}

/**
 * 计算未实现盈亏
 */
export function calculateUnrealizedPnl(
  side: PositionSide,
  entryPrice: number,
  markPrice: number,
  size: number
): { pnl: number; pnlPercent: number } {
  let pnl = 0
  if (side === 'long') {
    pnl = (markPrice - entryPrice) * size
  } else {
    pnl = (entryPrice - markPrice) * size
  }

  const positionValue = entryPrice * size
  const pnlPercent = positionValue > 0 ? (pnl / positionValue) * 100 : 0

  return { pnl, pnlPercent }
}

/**
 * 计算 ROE (基于保证金的收益率)
 */
export function calculateROE(
  unrealizedPnl: number,
  initialMargin: number
): number {
  return initialMargin > 0 ? (unrealizedPnl / initialMargin) * 100 : 0
}

/**
 * 计算爆仓价格
 */
export function calculateLiquidationPrice(
  side: PositionSide,
  entryPrice: number,
  leverage: number,
  maintenanceMarginRate: number
): number {
  if (side === 'long') {
    // Long: liqPrice = entryPrice * (1 - 1/leverage + maintenanceMarginRate)
    return entryPrice * (1 - 1 / leverage + maintenanceMarginRate)
  } else {
    // Short: liqPrice = entryPrice * (1 + 1/leverage - maintenanceMarginRate)
    return entryPrice * (1 + 1 / leverage - maintenanceMarginRate)
  }
}

/**
 * 计算初始保证金
 */
export function calculateInitialMargin(
  notionalValue: number,
  leverage: number
): number {
  return notionalValue / leverage
}

/**
 * 计算维持保证金
 */
export function calculateMaintenanceMargin(
  notionalValue: number,
  maintenanceMarginRate: number
): number {
  return notionalValue * maintenanceMarginRate
}

/**
 * 计算保证金率
 */
export function calculateMarginRatio(
  totalEquity: number,
  maintenanceMargin: number
): number {
  return maintenanceMargin > 0 ? (totalEquity / maintenanceMargin) * 100 : 999
}

/**
 * 计算风险等级
 */
export function calculateRiskLevel(marginRatio: number): RiskLevel {
  if (marginRatio >= RISK_THRESHOLDS.SAFE) {
    return 'safe'
  } else if (marginRatio >= RISK_THRESHOLDS.WARNING) {
    return 'warning'
  } else if (marginRatio >= RISK_THRESHOLDS.DANGER) {
    return 'danger'
  } else {
    return 'liquidation'
  }
}

/**
 * 检查是否会被爆仓
 */
export function checkLiquidation(
  position: PerpetualPaperPosition,
  markPrice: number
): boolean {
  if (position.side === 'long') {
    return markPrice <= position.liquidationPrice
  } else {
    return markPrice >= position.liquidationPrice
  }
}

/**
 * 生成唯一 ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
