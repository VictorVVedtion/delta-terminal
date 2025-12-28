/**
 * Strategy Templates Library
 *
 * EPIC-010 Story 10.3: 预设策略模板定义
 * 提供常用策略模板，用户可一键应用并调整参数
 */

import type { InsightData, InsightParam } from '@/types/insight'

// =============================================================================
// Types
// =============================================================================

export type TemplateCategory = 'trend' | 'mean_reversion' | 'market_making' | 'breakout'
export type RiskLevel = 'low' | 'medium' | 'high'

export interface StrategyTemplate {
  id: string
  name: string
  category: TemplateCategory
  description: string
  riskLevel: RiskLevel

  /** 策略参数 */
  params: InsightParam[]

  /** 默认配置 */
  defaultConfig: {
    symbol: string
    /** 多交易对支持 (S51) - 可选 */
    symbols?: string[]
    timeframe: string
    riskSettings: {
      stopLoss: { enabled: boolean; type: string; value: number }
      takeProfit: { enabled: boolean; type: string; value: number }
      positionLimit: { maxPositionPercent: number; maxTradeAmount: number }
    }
    /** 多交易对配置 (S51) */
    multiPairConfig?: {
      /** 相关性过滤阈值 */
      correlationThreshold: number
      /** 仓位分配模式 */
      allocationMode: 'equal' | 'risk_parity' | 'momentum_weighted'
      /** 最大同时持仓数 */
      maxConcurrentPositions: number
    }
  }

  /** 历史表现 (可选) */
  backtestMetrics?: {
    winRate: number
    totalReturn: number
    maxDrawdown: number
  }

  /** 适用市场条件 */
  marketConditions: string[]

  /** 使用提示 */
  tips: string[]

  /** 是否支持多交易对 (S51) */
  supportsMultiPair?: boolean
}

// =============================================================================
// Template Definitions
// =============================================================================

/**
 * RSI 超卖买入策略
 */
export const RSI_OVERSOLD_TEMPLATE: StrategyTemplate = {
  id: 'rsi_oversold',
  name: 'RSI 超卖买入策略',
  category: 'mean_reversion',
  description: '当 RSI 指标低于超卖线时买入，高于超买线时卖出，适合震荡市场',
  riskLevel: 'low',
  params: [
    {
      key: 'rsi_period',
      label: 'RSI 周期',
      type: 'slider',
      value: 14,
      level: 1,
      config: { min: 5, max: 30, step: 1 },
      description: 'RSI 指标计算周期',
    },
    {
      key: 'oversold_threshold',
      label: '超卖阈值',
      type: 'slider',
      value: 30,
      level: 1,
      config: { min: 10, max: 40, step: 1 },
      description: 'RSI 低于此值时产生买入信号',
    },
    {
      key: 'overbought_threshold',
      label: '超买阈值',
      type: 'slider',
      value: 70,
      level: 1,
      config: { min: 60, max: 90, step: 1 },
      description: 'RSI 高于此值时产生卖出信号',
    },
    {
      key: 'position_size',
      label: '仓位比例',
      type: 'slider',
      value: 15,
      level: 1,
      config: { min: 5, max: 50, step: 5, unit: '%' },
      description: '每次交易使用的资金比例',
    },
    {
      key: 'stop_loss',
      label: '止损',
      type: 'slider',
      value: 3,
      level: 2,
      config: { min: 1, max: 10, step: 0.5, unit: '%' },
      description: '止损百分比',
    },
    {
      key: 'take_profit',
      label: '止盈',
      type: 'slider',
      value: 10,
      level: 2,
      config: { min: 5, max: 30, step: 1, unit: '%' },
      description: '止盈百分比',
    },
  ],
  defaultConfig: {
    symbol: 'BTC/USDT',
    timeframe: '1h',
    riskSettings: {
      stopLoss: { enabled: true, type: 'percentage', value: 3 },
      takeProfit: { enabled: true, type: 'percentage', value: 10 },
      positionLimit: { maxPositionPercent: 15, maxTradeAmount: 5000 },
    },
  },
  backtestMetrics: {
    winRate: 62,
    totalReturn: 28,
    maxDrawdown: -8,
  },
  marketConditions: ['横盘震荡', 'RSI 指标有效'],
  tips: ['适合震荡市场，趋势市场效果较差', '建议结合成交量确认信号', '止损设置在关键支撑位下方'],
}

/**
 * 均线金叉策略
 */
export const MA_CROSS_TEMPLATE: StrategyTemplate = {
  id: 'ma_cross',
  name: '均线金叉策略',
  category: 'trend',
  description: '快线上穿慢线时买入，下穿时卖出，追踪中长期趋势',
  riskLevel: 'medium',
  params: [
    {
      key: 'fast_period',
      label: '快线周期',
      type: 'slider',
      value: 7,
      level: 1,
      config: { min: 3, max: 20, step: 1 },
      description: '短期均线周期',
    },
    {
      key: 'slow_period',
      label: '慢线周期',
      type: 'slider',
      value: 25,
      level: 1,
      config: { min: 15, max: 60, step: 1 },
      description: '长期均线周期',
    },
    {
      key: 'ma_type',
      label: '均线类型',
      type: 'select',
      value: 'EMA',
      level: 1,
      config: {
        options: [
          { value: 'SMA', label: '简单均线 (SMA)' },
          { value: 'EMA', label: '指数均线 (EMA)' },
          { value: 'WMA', label: '加权均线 (WMA)' },
        ],
      },
      description: '均线计算方式',
    },
    {
      key: 'position_size',
      label: '仓位比例',
      type: 'slider',
      value: 20,
      level: 1,
      config: { min: 5, max: 50, step: 5, unit: '%' },
    },
    {
      key: 'stop_loss',
      label: '止损',
      type: 'slider',
      value: 5,
      level: 2,
      config: { min: 2, max: 15, step: 0.5, unit: '%' },
    },
    {
      key: 'take_profit',
      label: '止盈',
      type: 'slider',
      value: 20,
      level: 2,
      config: { min: 10, max: 50, step: 5, unit: '%' },
    },
  ],
  defaultConfig: {
    symbol: 'BTC/USDT',
    timeframe: '4h',
    riskSettings: {
      stopLoss: { enabled: true, type: 'percentage', value: 5 },
      takeProfit: { enabled: true, type: 'percentage', value: 20 },
      positionLimit: { maxPositionPercent: 20, maxTradeAmount: 10000 },
    },
  },
  backtestMetrics: {
    winRate: 55,
    totalReturn: 42,
    maxDrawdown: -15,
  },
  marketConditions: ['上升趋势', '趋势明确'],
  tips: ['适合趋势市场，震荡市会频繁止损', 'EMA 对价格变化更敏感', '建议在4小时或日线级别使用'],
}

/**
 * MACD 金叉策略
 */
export const MACD_CROSS_TEMPLATE: StrategyTemplate = {
  id: 'macd_cross',
  name: 'MACD 金叉策略',
  category: 'trend',
  description: 'MACD 线上穿信号线时买入，下穿时卖出，确认趋势变化',
  riskLevel: 'medium',
  params: [
    {
      key: 'fast_period',
      label: '快线周期',
      type: 'slider',
      value: 12,
      level: 1,
      config: { min: 8, max: 20, step: 1 },
    },
    {
      key: 'slow_period',
      label: '慢线周期',
      type: 'slider',
      value: 26,
      level: 1,
      config: { min: 20, max: 40, step: 1 },
    },
    {
      key: 'signal_period',
      label: '信号线周期',
      type: 'slider',
      value: 9,
      level: 1,
      config: { min: 5, max: 15, step: 1 },
    },
    {
      key: 'position_size',
      label: '仓位比例',
      type: 'slider',
      value: 20,
      level: 1,
      config: { min: 5, max: 50, step: 5, unit: '%' },
    },
    {
      key: 'require_zero_cross',
      label: '需要零轴确认',
      type: 'toggle',
      value: false,
      level: 2,
      config: {},
      description: '仅在零轴上方做多，下方做空',
    },
    {
      key: 'stop_loss',
      label: '止损',
      type: 'slider',
      value: 5,
      level: 2,
      config: { min: 2, max: 15, step: 0.5, unit: '%' },
    },
  ],
  defaultConfig: {
    symbol: 'BTC/USDT',
    timeframe: '4h',
    riskSettings: {
      stopLoss: { enabled: true, type: 'percentage', value: 5 },
      takeProfit: { enabled: true, type: 'percentage', value: 15 },
      positionLimit: { maxPositionPercent: 20, maxTradeAmount: 10000 },
    },
  },
  backtestMetrics: {
    winRate: 52,
    totalReturn: 38,
    maxDrawdown: -12,
  },
  marketConditions: ['趋势确认', '动能转换'],
  tips: ['MACD 是趋势确认指标，信号相对滞后', '结合零轴可过滤假信号', '适合中长周期交易'],
}

/**
 * 网格交易策略
 */
export const GRID_TRADING_TEMPLATE: StrategyTemplate = {
  id: 'grid_trading',
  name: '网格交易策略',
  category: 'market_making',
  description: '在价格区间内设置网格，低买高卖赚取差价，适合横盘震荡',
  riskLevel: 'low',
  params: [
    {
      key: 'grid_count',
      label: '网格数量',
      type: 'slider',
      value: 10,
      level: 1,
      config: { min: 5, max: 50, step: 1 },
      description: '价格区间内的网格数量',
    },
    {
      key: 'price_range',
      label: '价格范围',
      type: 'slider',
      value: 10,
      level: 1,
      config: { min: 5, max: 30, step: 1, unit: '%' },
      description: '上下波动范围',
    },
    {
      key: 'initial_capital',
      label: '投入资金',
      type: 'number',
      value: 10000,
      level: 1,
      config: { min: 100, max: 100000, step: 100, unit: 'USDT' },
    },
    {
      key: 'grid_mode',
      label: '网格模式',
      type: 'select',
      value: 'arithmetic',
      level: 2,
      config: {
        options: [
          { value: 'arithmetic', label: '等差网格' },
          { value: 'geometric', label: '等比网格' },
        ],
      },
    },
    {
      key: 'stop_loss',
      label: '止损',
      type: 'slider',
      value: 15,
      level: 2,
      config: { min: 5, max: 30, step: 1, unit: '%' },
      description: '跌破此比例停止策略',
    },
  ],
  defaultConfig: {
    symbol: 'BTC/USDT',
    timeframe: '15m',
    riskSettings: {
      stopLoss: { enabled: true, type: 'percentage', value: 15 },
      takeProfit: { enabled: false, type: 'percentage', value: 0 },
      positionLimit: { maxPositionPercent: 80, maxTradeAmount: 10000 },
    },
  },
  backtestMetrics: {
    winRate: 68,
    totalReturn: 35,
    maxDrawdown: -10,
  },
  marketConditions: ['横盘震荡', '区间波动'],
  tips: ['适合长期横盘的币种', '网格越密交易越频繁，收益越稳定', '趋势行情可能造成套牢'],
}

/**
 * 布林带反弹策略
 */
export const BOLLINGER_BOUNCE_TEMPLATE: StrategyTemplate = {
  id: 'bollinger_bounce',
  name: '布林带反弹策略',
  category: 'mean_reversion',
  description: '价格触及布林带下轨时买入，触及上轨时卖出',
  riskLevel: 'low',
  params: [
    {
      key: 'bb_period',
      label: '布林带周期',
      type: 'slider',
      value: 20,
      level: 1,
      config: { min: 10, max: 50, step: 1 },
    },
    {
      key: 'bb_std',
      label: '标准差倍数',
      type: 'slider',
      value: 2,
      level: 1,
      config: { min: 1, max: 3, step: 0.1 },
    },
    {
      key: 'position_size',
      label: '仓位比例',
      type: 'slider',
      value: 15,
      level: 1,
      config: { min: 5, max: 50, step: 5, unit: '%' },
    },
    {
      key: 'confirm_candle',
      label: '等待确认',
      type: 'toggle',
      value: true,
      level: 2,
      config: {},
      description: '等待反转K线确认后再入场',
    },
    {
      key: 'stop_loss',
      label: '止损',
      type: 'slider',
      value: 3,
      level: 2,
      config: { min: 1, max: 10, step: 0.5, unit: '%' },
    },
  ],
  defaultConfig: {
    symbol: 'BTC/USDT',
    timeframe: '1h',
    riskSettings: {
      stopLoss: { enabled: true, type: 'percentage', value: 3 },
      takeProfit: { enabled: true, type: 'percentage', value: 8 },
      positionLimit: { maxPositionPercent: 15, maxTradeAmount: 5000 },
    },
  },
  backtestMetrics: {
    winRate: 60,
    totalReturn: 25,
    maxDrawdown: -7,
  },
  marketConditions: ['震荡市', '波动稳定'],
  tips: ['标准差越大，信号越少但更可靠', '强趋势时不要逆势交易', '建议等待确认K线'],
}

/**
 * 价格突破策略
 */
export const BREAKOUT_TEMPLATE: StrategyTemplate = {
  id: 'breakout',
  name: '价格突破策略',
  category: 'breakout',
  description: '价格突破关键阻力位时买入，突破支撑位时卖出，捕捉趋势启动',
  riskLevel: 'high',
  params: [
    {
      key: 'lookback_period',
      label: '回溯周期',
      type: 'slider',
      value: 20,
      level: 1,
      config: { min: 10, max: 50, step: 1 },
      description: '计算高低点的周期',
    },
    {
      key: 'breakout_confirm',
      label: '突破确认',
      type: 'slider',
      value: 0.5,
      level: 1,
      config: { min: 0.1, max: 2, step: 0.1, unit: '%' },
      description: '突破阈值，避免假突破',
    },
    {
      key: 'position_size',
      label: '仓位比例',
      type: 'slider',
      value: 25,
      level: 1,
      config: { min: 10, max: 50, step: 5, unit: '%' },
    },
    {
      key: 'use_volume',
      label: '成交量确认',
      type: 'toggle',
      value: true,
      level: 2,
      config: {},
      description: '突破时成交量需放大',
    },
    {
      key: 'stop_loss',
      label: '止损',
      type: 'slider',
      value: 3,
      level: 2,
      config: { min: 1, max: 8, step: 0.5, unit: '%' },
    },
    {
      key: 'trailing_stop',
      label: '追踪止损',
      type: 'toggle',
      value: true,
      level: 2,
      config: {},
      description: '使用追踪止损保护利润',
    },
  ],
  defaultConfig: {
    symbol: 'BTC/USDT',
    timeframe: '1h',
    riskSettings: {
      stopLoss: { enabled: true, type: 'percentage', value: 3 },
      takeProfit: { enabled: false, type: 'percentage', value: 0 },
      positionLimit: { maxPositionPercent: 25, maxTradeAmount: 8000 },
    },
  },
  backtestMetrics: {
    winRate: 45,
    totalReturn: 55,
    maxDrawdown: -18,
  },
  marketConditions: ['盘整突破', '趋势启动'],
  tips: ['突破策略胜率较低，需靠盈亏比取胜', '成交量放大确认更可靠', '建议使用追踪止损'],
}

/**
 * 多交易对轮动策略 (S51 - Multi-Pair Trading)
 * PO 评审 P0 优先级
 */
export const MULTI_PAIR_ROTATION_TEMPLATE: StrategyTemplate = {
  id: 'multi_pair_rotation',
  name: '多交易对轮动策略',
  category: 'trend',
  description: '在多个交易对之间智能轮动，追踪强势币种，规避弱势资产，分散风险提升收益',
  riskLevel: 'medium',
  supportsMultiPair: true,
  params: [
    {
      key: 'symbols',
      label: '交易对列表',
      type: 'select',
      value: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'],
      level: 1,
      config: {
        options: [
          { value: 'BTC/USDT', label: 'BTC/USDT' },
          { value: 'ETH/USDT', label: 'ETH/USDT' },
          { value: 'SOL/USDT', label: 'SOL/USDT' },
          { value: 'BNB/USDT', label: 'BNB/USDT' },
          { value: 'XRP/USDT', label: 'XRP/USDT' },
          { value: 'ADA/USDT', label: 'ADA/USDT' },
          { value: 'DOGE/USDT', label: 'DOGE/USDT' },
          { value: 'AVAX/USDT', label: 'AVAX/USDT' },
        ],
      },
      description: '选择多个交易对进行轮动交易',
    },
    {
      key: 'momentum_period',
      label: '动量周期',
      type: 'slider',
      value: 14,
      level: 1,
      config: { min: 7, max: 30, step: 1 },
      description: '评估动量的时间周期',
    },
    {
      key: 'max_positions',
      label: '最大持仓数',
      type: 'slider',
      value: 3,
      level: 1,
      config: { min: 1, max: 5, step: 1 },
      description: '同时持有的最大交易对数量',
    },
    {
      key: 'allocation_mode',
      label: '仓位分配',
      type: 'select',
      value: 'momentum_weighted',
      level: 1,
      config: {
        options: [
          { value: 'equal', label: '等权分配' },
          { value: 'risk_parity', label: '风险平价' },
          { value: 'momentum_weighted', label: '动量加权' },
        ],
      },
      description: '资金在多个交易对间的分配方式',
    },
    {
      key: 'rebalance_interval',
      label: '再平衡周期',
      type: 'select',
      value: '1d',
      level: 1,
      config: {
        options: [
          { value: '4h', label: '4小时' },
          { value: '1d', label: '每日' },
          { value: '1w', label: '每周' },
        ],
      },
      description: '重新评估并调整持仓的频率',
    },
    {
      key: 'correlation_threshold',
      label: '相关性阈值',
      type: 'slider',
      value: 0.7,
      level: 2,
      config: { min: 0.3, max: 0.9, step: 0.1 },
      description: '高相关性币种不同时持有',
    },
    {
      key: 'min_momentum_score',
      label: '最低动量分',
      type: 'slider',
      value: 60,
      level: 2,
      config: { min: 40, max: 80, step: 5 },
      description: '低于此分数不开仓',
    },
    {
      key: 'stop_loss',
      label: '止损',
      type: 'slider',
      value: 8,
      level: 2,
      config: { min: 3, max: 15, step: 1, unit: '%' },
    },
    {
      key: 'take_profit',
      label: '止盈',
      type: 'slider',
      value: 25,
      level: 2,
      config: { min: 10, max: 50, step: 5, unit: '%' },
    },
  ],
  defaultConfig: {
    symbol: 'BTC/USDT',
    symbols: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'],
    timeframe: '4h',
    riskSettings: {
      stopLoss: { enabled: true, type: 'percentage', value: 8 },
      takeProfit: { enabled: true, type: 'percentage', value: 25 },
      positionLimit: { maxPositionPercent: 30, maxTradeAmount: 15000 },
    },
    multiPairConfig: {
      correlationThreshold: 0.7,
      allocationMode: 'momentum_weighted',
      maxConcurrentPositions: 3,
    },
  },
  backtestMetrics: {
    winRate: 58,
    totalReturn: 65,
    maxDrawdown: -12,
  },
  marketConditions: ['市场分化', '板块轮动'],
  tips: [
    '选择低相关性的交易对以分散风险',
    '动量加权适合趋势明确的市场',
    '风险平价模式更稳健',
    '至少选择5个交易对以获得更好的轮动效果',
  ],
}

/**
 * 多交易对配对交易策略 (S51)
 */
export const PAIR_TRADING_TEMPLATE: StrategyTemplate = {
  id: 'pair_trading',
  name: '配对交易策略',
  category: 'mean_reversion',
  description: '利用高相关性交易对的价差回归特性，同时做多一个做空另一个，赚取价差收益',
  riskLevel: 'low',
  supportsMultiPair: true,
  params: [
    {
      key: 'pair_a',
      label: '交易对 A',
      type: 'select',
      value: 'BTC/USDT',
      level: 1,
      config: {
        options: [
          { value: 'BTC/USDT', label: 'BTC/USDT' },
          { value: 'ETH/USDT', label: 'ETH/USDT' },
          { value: 'SOL/USDT', label: 'SOL/USDT' },
        ],
      },
    },
    {
      key: 'pair_b',
      label: '交易对 B',
      type: 'select',
      value: 'ETH/USDT',
      level: 1,
      config: {
        options: [
          { value: 'BTC/USDT', label: 'BTC/USDT' },
          { value: 'ETH/USDT', label: 'ETH/USDT' },
          { value: 'SOL/USDT', label: 'SOL/USDT' },
        ],
      },
    },
    {
      key: 'spread_lookback',
      label: '价差周期',
      type: 'slider',
      value: 60,
      level: 1,
      config: { min: 20, max: 120, step: 5 },
      description: '计算价差均值和标准差的周期',
    },
    {
      key: 'entry_zscore',
      label: '入场Z分数',
      type: 'slider',
      value: 2,
      level: 1,
      config: { min: 1, max: 3, step: 0.1 },
      description: '价差偏离均值多少标准差时入场',
    },
    {
      key: 'exit_zscore',
      label: '出场Z分数',
      type: 'slider',
      value: 0.5,
      level: 1,
      config: { min: 0, max: 1, step: 0.1 },
      description: '价差回归到多少标准差时出场',
    },
    {
      key: 'position_size',
      label: '仓位比例',
      type: 'slider',
      value: 20,
      level: 1,
      config: { min: 10, max: 40, step: 5, unit: '%' },
    },
    {
      key: 'stop_loss_zscore',
      label: '止损Z分数',
      type: 'slider',
      value: 4,
      level: 2,
      config: { min: 3, max: 5, step: 0.5 },
      description: '价差偏离超过此值止损',
    },
  ],
  defaultConfig: {
    symbol: 'BTC/USDT',
    symbols: ['BTC/USDT', 'ETH/USDT'],
    timeframe: '1h',
    riskSettings: {
      stopLoss: { enabled: true, type: 'zscore', value: 4 },
      takeProfit: { enabled: true, type: 'zscore', value: 0.5 },
      positionLimit: { maxPositionPercent: 20, maxTradeAmount: 10000 },
    },
    multiPairConfig: {
      correlationThreshold: 0.8,
      allocationMode: 'equal',
      maxConcurrentPositions: 2,
    },
  },
  backtestMetrics: {
    winRate: 72,
    totalReturn: 28,
    maxDrawdown: -5,
  },
  marketConditions: ['高相关性', '价差稳定'],
  tips: [
    '选择历史相关性>0.8的交易对',
    '适合市场中性策略，不依赖方向判断',
    '需要同时支持做多和做空',
    '价差回归需要时间，耐心持有',
  ],
}

// =============================================================================
// Template Registry
// =============================================================================

export const STRATEGY_TEMPLATES: StrategyTemplate[] = [
  RSI_OVERSOLD_TEMPLATE,
  MA_CROSS_TEMPLATE,
  MACD_CROSS_TEMPLATE,
  GRID_TRADING_TEMPLATE,
  BOLLINGER_BOUNCE_TEMPLATE,
  BREAKOUT_TEMPLATE,
  // S51 多交易对策略
  MULTI_PAIR_ROTATION_TEMPLATE,
  PAIR_TRADING_TEMPLATE,
]

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: TemplateCategory): StrategyTemplate[] {
  return STRATEGY_TEMPLATES.filter((t) => t.category === category)
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): StrategyTemplate | undefined {
  return STRATEGY_TEMPLATES.find((t) => t.id === id)
}

/**
 * Category display config
 */
export const TEMPLATE_CATEGORIES: Record<TemplateCategory, { label: string; icon: string }> = {
  trend: { label: '趋势跟踪', icon: 'TrendingUp' },
  mean_reversion: { label: '均值回归', icon: 'RefreshCcw' },
  market_making: { label: '做市策略', icon: 'LineChart' },
  breakout: { label: '突破策略', icon: 'Zap' },
}

/**
 * Risk level display config
 */
export const RISK_LEVEL_CONFIG: Record<RiskLevel, { label: string; color: string; icon: string }> =
  {
    low: { label: '低风险', color: 'text-green-500', icon: 'ShieldCheck' },
    medium: { label: '中等风险', color: 'text-yellow-500', icon: 'AlertTriangle' },
    high: { label: '高风险', color: 'text-red-500', icon: 'Flame' },
  }

// =============================================================================
// Template to InsightData Conversion
// =============================================================================

/**
 * Convert template to InsightData for Canvas rendering
 */
export function templateToInsightData(template: StrategyTemplate): InsightData {
  const baseInsight: InsightData = {
    id: `template_${template.id}_${Date.now()}`,
    type: 'strategy_create',
    target: {
      strategy_id: 'new',
      name: template.name,
      symbol: template.defaultConfig.symbol,
    },
    params: template.params,
    explanation: template.description,
    created_at: new Date().toISOString(),
    actions: ['approve', 'reject', 'run_backtest'],
  }

  // Add impact metrics if backtest data available
  if (template.backtestMetrics) {
    baseInsight.impact = {
      metrics: [
        {
          key: 'winRate',
          label: '胜率',
          value: template.backtestMetrics.winRate,
          unit: '%',
          trend: template.backtestMetrics.winRate > 50 ? 'up' : 'neutral',
        },
        {
          key: 'expectedReturn',
          label: '历史收益',
          value: template.backtestMetrics.totalReturn,
          unit: '%',
          trend: template.backtestMetrics.totalReturn > 0 ? 'up' : 'down',
        },
        {
          key: 'maxDrawdown',
          label: '最大回撤',
          value: template.backtestMetrics.maxDrawdown,
          unit: '%',
          trend: 'down',
        },
      ],
      confidence: 0.8,
      sample_size: 180,
    }
  }

  return baseInsight
}
