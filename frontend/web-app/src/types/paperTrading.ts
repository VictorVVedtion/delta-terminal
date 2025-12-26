/**
 * Paper Trading Types - 虚拟账户与模拟订单
 * Story 2: 虚拟账户与模拟订单系统
 */

// =============================================================================
// Paper Account Types
// =============================================================================

/**
 * 虚拟账户
 */
export interface PaperAccount {
  /** 账户 ID */
  id: string
  /** 关联的 Agent ID */
  agentId: string
  /** 初始资金 (USDT) */
  initialCapital: number
  /** 当前余额 (USDT) */
  currentBalance: number
  /** 持仓列表 */
  positions: PaperPosition[]
  /** 交易记录 */
  trades: PaperTrade[]
  /** 创建时间 */
  createdAt: number
  /** 最后更新时间 */
  updatedAt: number
}

/**
 * 持仓方向
 */
export type PositionSide = 'long' | 'short'

/**
 * 持仓信息
 */
export interface PaperPosition {
  /** 持仓 ID */
  id: string
  /** 交易对 */
  symbol: string
  /** 方向 */
  side: PositionSide
  /** 持仓数量 */
  size: number
  /** 开仓均价 */
  entryPrice: number
  /** 当前市价 (用于计算未实现盈亏) */
  currentPrice: number
  /** 未实现盈亏 (USDT) */
  unrealizedPnl: number
  /** 未实现盈亏百分比 */
  unrealizedPnlPercent: number
  /** 开仓时间 */
  openedAt: number
  /** 最后更新时间 */
  updatedAt: number
}

/**
 * 交易方向
 */
export type TradeSide = 'buy' | 'sell'

/**
 * 交易类型
 */
export type TradeType = 'market' | 'limit'

/**
 * 交易记录
 */
export interface PaperTrade {
  /** 交易 ID */
  id: string
  /** 账户 ID */
  accountId: string
  /** 交易对 */
  symbol: string
  /** 方向 */
  side: TradeSide
  /** 类型 */
  type: TradeType
  /** 数量 */
  size: number
  /** 成交价格 */
  price: number
  /** 手续费 (USDT) */
  fee: number
  /** 手续费率 */
  feeRate: number
  /** 总成本/收益 (含手续费) */
  total: number
  /** 已实现盈亏 (平仓时计算) */
  realizedPnl?: number
  /** 成交时间 */
  timestamp: number
}

// =============================================================================
// Paper Trading Actions
// =============================================================================

/**
 * 下单参数
 */
export interface PlaceOrderParams {
  /** 账户 ID */
  accountId: string
  /** 交易对 */
  symbol: string
  /** 方向 */
  side: TradeSide
  /** 类型 */
  type: TradeType
  /** 数量 */
  size: number
  /** 价格 (市价单时可选) */
  price?: number
}

/**
 * 下单结果
 */
export interface PlaceOrderResult {
  /** 是否成功 */
  success: boolean
  /** 交易记录 */
  trade?: PaperTrade
  /** 错误信息 */
  error?: string
}

/**
 * 平仓参数
 */
export interface ClosePositionParams {
  /** 账户 ID */
  accountId: string
  /** 持仓 ID */
  positionId: string
  /** 平仓价格 (市价单时可选) */
  price?: number
}

/**
 * 平仓结果
 */
export interface ClosePositionResult {
  /** 是否成功 */
  success: boolean
  /** 平仓交易记录 */
  trade?: PaperTrade
  /** 已实现盈亏 */
  realizedPnl?: number
  /** 错误信息 */
  error?: string
}

// =============================================================================
// Paper Trading Statistics
// =============================================================================

/**
 * 账户统计
 */
export interface PaperAccountStats {
  /** 账户 ID */
  accountId: string
  /** 总资产 (余额 + 持仓价值) */
  totalEquity: number
  /** 总盈亏 (USDT) */
  totalPnl: number
  /** 总盈亏百分比 */
  totalPnlPercent: number
  /** 未实现盈亏 (USDT) */
  unrealizedPnl: number
  /** 已实现盈亏 (USDT) */
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
  /** 平均盈利 (USDT) */
  avgWin: number
  /** 平均亏损 (USDT) */
  avgLoss: number
  /** 总手续费 (USDT) */
  totalFees: number
}

// =============================================================================
// Paper Trading Config
// =============================================================================

/**
 * Paper Trading 配置
 */
export interface PaperTradingConfig {
  /** 默认手续费率 (Taker) */
  defaultFeeRate: number
  /** 最小下单金额 (USDT) */
  minOrderValue: number
  /** 最大杠杆倍数 */
  maxLeverage: number
  /** 是否启用滑点模拟 */
  enableSlippage: boolean
  /** 滑点百分比 */
  slippagePercent: number
}

/**
 * 默认配置
 */
export const DEFAULT_PAPER_TRADING_CONFIG: PaperTradingConfig = {
  defaultFeeRate: 0.001, // 0.1% Taker Fee
  minOrderValue: 10, // 最小 10 USDT
  maxLeverage: 1, // 现货，无杠杆
  enableSlippage: false, // 暂不启用滑点
  slippagePercent: 0.001, // 0.1% 滑点
}

// =============================================================================
// Helper Types
// =============================================================================

/**
 * 持仓更新参数
 */
export interface PositionUpdateParams {
  positionId: string
  currentPrice: number
}

/**
 * 余额更新类型
 */
export type BalanceUpdateType = 'trade' | 'fee' | 'realized_pnl'

/**
 * 余额更新记录
 */
export interface BalanceUpdate {
  type: BalanceUpdateType
  amount: number
  timestamp: number
  note?: string
}
