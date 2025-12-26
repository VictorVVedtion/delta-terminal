/**
 * Strategy Templates Library
 *
 * EPIC-010 Story 10.3: 预设策略模板定义
 * 提供常用策略模板，用户可一键应用并调整参数
 */

import type { InsightParam, InsightData } from '@/types/insight'

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
    timeframe: string
    riskSettings: {
      stopLoss: { enabled: boolean; type: string; value: number }
      takeProfit: { enabled: boolean; type: string; value: number }
      positionLimit: { maxPositionPercent: number; maxTradeAmount: number }
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
  tips: [
    '适合震荡市场，趋势市场效果较差',
    '建议结合成交量确认信号',
    '止损设置在关键支撑位下方',
  ],
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
  tips: [
    '适合趋势市场，震荡市会频繁止损',
    'EMA 对价格变化更敏感',
    '建议在4小时或日线级别使用',
  ],
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
  tips: [
    'MACD 是趋势确认指标，信号相对滞后',
    '结合零轴可过滤假信号',
    '适合中长周期交易',
  ],
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
  tips: [
    '适合长期横盘的币种',
    '网格越密交易越频繁，收益越稳定',
    '趋势行情可能造成套牢',
  ],
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
  tips: [
    '标准差越大，信号越少但更可靠',
    '强趋势时不要逆势交易',
    '建议等待确认K线',
  ],
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
  tips: [
    '突破策略胜率较低，需靠盈亏比取胜',
    '成交量放大确认更可靠',
    '建议使用追踪止损',
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
  trend: { label: '趋势跟踪', icon: '📈' },
  mean_reversion: { label: '均值回归', icon: '🔄' },
  market_making: { label: '做市策略', icon: '💹' },
  breakout: { label: '突破策略', icon: '🚀' },
}

/**
 * Risk level display config
 */
export const RISK_LEVEL_CONFIG: Record<RiskLevel, { label: string; color: string; icon: string }> = {
  low: { label: '低风险', color: 'text-green-500', icon: '🟢' },
  medium: { label: '中等风险', color: 'text-yellow-500', icon: '🟡' },
  high: { label: '高风险', color: 'text-red-500', icon: '🔴' },
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
