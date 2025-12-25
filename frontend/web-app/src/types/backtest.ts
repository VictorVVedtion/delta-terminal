// =============================================================================
// Backtest Types
// =============================================================================

/**
 * 回测配置
 */
export interface BacktestConfig {
  /** 策略名称 */
  name: string
  /** 交易对 */
  symbol: string
  /** 策略类型 */
  strategyType: StrategyType
  /** 开始日期 */
  startDate: string
  /** 结束日期 */
  endDate: string
  /** 初始资金 */
  initialCapital: number
  /** 手续费率 (%) */
  feeRate: number
  /** 滑点 (%) */
  slippage: number
  /** 策略参数 */
  params: Record<string, unknown>
}

/**
 * 策略类型
 */
export type StrategyType =
  | 'grid'
  | 'dca'
  | 'rsi'
  | 'macd'
  | 'ma_crossover'
  | 'breakout'
  | 'mean_reversion'
  | 'custom'

/**
 * 策略类型配置
 */
export const STRATEGY_TYPES: Record<StrategyType, StrategyTypeConfig> = {
  grid: {
    id: 'grid',
    name: '网格策略',
    description: '在价格区间内自动挂单，低买高卖',
    icon: 'grid',
    defaultParams: {
      upperPrice: 0,
      lowerPrice: 0,
      gridCount: 10,
      orderAmount: 100,
    },
  },
  dca: {
    id: 'dca',
    name: '定投策略',
    description: '定期定额买入，平均成本',
    icon: 'calendar',
    defaultParams: {
      interval: 'daily',
      amount: 100,
      priceLimit: 0,
    },
  },
  rsi: {
    id: 'rsi',
    name: 'RSI 策略',
    description: '基于相对强弱指标进行买卖',
    icon: 'activity',
    defaultParams: {
      period: 14,
      overbought: 70,
      oversold: 30,
    },
  },
  macd: {
    id: 'macd',
    name: 'MACD 策略',
    description: '基于 MACD 指标交叉信号',
    icon: 'trending-up',
    defaultParams: {
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
    },
  },
  ma_crossover: {
    id: 'ma_crossover',
    name: '均线交叉策略',
    description: '短期均线穿越长期均线时交易',
    icon: 'git-merge',
    defaultParams: {
      shortPeriod: 7,
      longPeriod: 25,
      maType: 'SMA',
    },
  },
  breakout: {
    id: 'breakout',
    name: '突破策略',
    description: '价格突破关键位置时入场',
    icon: 'arrow-up-right',
    defaultParams: {
      lookbackPeriod: 20,
      breakoutMultiplier: 1.5,
    },
  },
  mean_reversion: {
    id: 'mean_reversion',
    name: '均值回归策略',
    description: '价格偏离均值后回归交易',
    icon: 'refresh-cw',
    defaultParams: {
      period: 20,
      stdDevMultiplier: 2,
    },
  },
  custom: {
    id: 'custom',
    name: '自定义策略',
    description: '使用 AI 生成或手动编写策略',
    icon: 'code',
    defaultParams: {},
  },
}

export interface StrategyTypeConfig {
  id: StrategyType
  name: string
  description: string
  icon: string
  defaultParams: Record<string, unknown>
}

/**
 * 回测结果
 */
export interface BacktestResult {
  /** 回测ID */
  id: string
  /** 回测配置 */
  config: BacktestConfig
  /** 性能指标 */
  metrics: BacktestMetrics
  /** 权益曲线 */
  equity: EquityPoint[]
  /** 交易记录 */
  trades: BacktestTrade[]
  /** 创建时间 */
  createdAt: string
  /** 完成时间 */
  completedAt?: string
}

/**
 * 回测性能指标
 */
export interface BacktestMetrics {
  /** 总收益率 (%) */
  totalReturn: number
  /** 年化收益率 (%) */
  annualizedReturn: number
  /** 最大回撤 (%) */
  maxDrawdown: number
  /** 夏普比率 */
  sharpeRatio: number
  /** 胜率 (%) */
  winRate: number
  /** 总交易次数 */
  totalTrades: number
  /** 盈利因子 */
  profitFactor: number
  /** 平均盈利 (%) */
  avgWin: number
  /** 平均亏损 (%) */
  avgLoss: number
  /** 最大连续盈利次数 */
  maxConsecutiveWins?: number
  /** 最大连续亏损次数 */
  maxConsecutiveLosses?: number
  /** 平均持仓时间 (小时) */
  avgHoldingTime?: number
}

/**
 * 权益曲线点
 */
export interface EquityPoint {
  /** 日期 */
  date: string
  /** 权益值 */
  equity: number
  /** 回撤 */
  drawdown?: number
}

/**
 * 回测交易记录
 */
export interface BacktestTrade {
  /** 交易ID */
  id: string
  /** 交易对 */
  symbol: string
  /** 方向 */
  side: 'buy' | 'sell'
  /** 入场价格 */
  entryPrice: number
  /** 出场价格 */
  exitPrice: number
  /** 数量 */
  quantity: number
  /** 盈亏金额 */
  pnl: number
  /** 盈亏比例 (%) */
  pnlPercent: number
  /** 入场时间 */
  entryTime: string
  /** 出场时间 */
  exitTime: string
  /** 手续费 */
  fee?: number
  /** 交易信号 */
  signal?: string
}

/**
 * 回测历史项
 */
export interface BacktestHistoryItem {
  /** 回测ID */
  id: string
  /** 策略名称 */
  name: string
  /** 交易对 */
  symbol: string
  /** 时间周期 */
  period: string
  /** 总收益率 */
  totalReturn: number
  /** 状态 */
  status: 'pending' | 'running' | 'completed' | 'failed'
  /** 创建时间 */
  createdAt: number
}

/**
 * 回测运行状态
 */
export interface BacktestRunState {
  /** 是否运行中 */
  isRunning: boolean
  /** 进度 (0-100) */
  progress: number
  /** 当前阶段 */
  stage: 'preparing' | 'loading_data' | 'running' | 'analyzing' | 'completed'
  /** 错误信息 */
  error?: string
}
