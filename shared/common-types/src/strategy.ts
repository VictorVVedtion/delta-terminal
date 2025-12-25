import { z } from 'zod';

/**
 * 策略类型枚举
 */
export const StrategyType = {
  SPOT: 'spot',           // 现货策略
  GRID: 'grid',           // 网格交易
  DCA: 'dca',             // 定投策略
  SIGNAL: 'signal',       // 信号策略
  ARBITRAGE: 'arbitrage', // 套利策略
  CUSTOM: 'custom',       // 自定义策略
} as const;

export type StrategyType = (typeof StrategyType)[keyof typeof StrategyType];

/**
 * 策略状态枚举
 */
export const StrategyStatus = {
  DRAFT: 'draft',           // 草稿
  BACKTESTING: 'backtesting', // 回测中
  READY: 'ready',           // 就绪
  RUNNING: 'running',       // 运行中
  PAUSED: 'paused',         // 已暂停
  STOPPED: 'stopped',       // 已停止
  ERROR: 'error',           // 错误
} as const;

export type StrategyStatus = (typeof StrategyStatus)[keyof typeof StrategyStatus];

/**
 * 交易方向
 */
export const TradeSide = {
  BUY: 'buy',
  SELL: 'sell',
} as const;

export type TradeSide = (typeof TradeSide)[keyof typeof TradeSide];

/**
 * 条件操作符
 */
export const ConditionOperator = {
  GREATER_THAN: 'gt',
  GREATER_THAN_OR_EQUAL: 'gte',
  LESS_THAN: 'lt',
  LESS_THAN_OR_EQUAL: 'lte',
  EQUAL: 'eq',
  NOT_EQUAL: 'neq',
  CROSSES_ABOVE: 'crosses_above',
  CROSSES_BELOW: 'crosses_below',
} as const;

export type ConditionOperator = (typeof ConditionOperator)[keyof typeof ConditionOperator];

/**
 * 策略条件 Schema
 */
export const StrategyConditionSchema = z.object({
  id: z.string().uuid(),
  indicator: z.string(), // e.g., 'price', 'rsi', 'macd', 'volume'
  operator: z.enum(['gt', 'gte', 'lt', 'lte', 'eq', 'neq', 'crosses_above', 'crosses_below']),
  value: z.union([z.number(), z.string()]),
  timeframe: z.string().optional(), // e.g., '1m', '5m', '1h', '1d'
});

export type StrategyCondition = z.infer<typeof StrategyConditionSchema>;

/**
 * 策略动作 Schema
 */
export const StrategyActionSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['market_order', 'limit_order', 'stop_loss', 'take_profit', 'notify']),
  side: z.enum(['buy', 'sell']).optional(),
  amount: z.union([z.number(), z.string()]), // 固定金额或百分比 e.g., "10%" or 100
  price: z.number().optional(), // 限价单价格
  stopPrice: z.number().optional(), // 止损价格
  takeProfitPrice: z.number().optional(), // 止盈价格
});

export type StrategyAction = z.infer<typeof StrategyActionSchema>;

/**
 * 策略规则 Schema (条件 + 动作)
 */
export const StrategyRuleSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  conditions: z.array(StrategyConditionSchema),
  conditionLogic: z.enum(['and', 'or']).default('and'),
  actions: z.array(StrategyActionSchema),
  enabled: z.boolean().default(true),
});

export type StrategyRule = z.infer<typeof StrategyRuleSchema>;

/**
 * 风控设置 Schema
 */
export const RiskSettingsSchema = z.object({
  maxPositionSize: z.number().positive().optional(), // 最大持仓金额
  maxPositionPercent: z.number().min(0).max(100).optional(), // 最大持仓比例
  maxDailyLoss: z.number().positive().optional(), // 每日最大亏损
  maxDailyLossPercent: z.number().min(0).max(100).optional(), // 每日最大亏损比例
  stopLossPercent: z.number().min(0).max(100).optional(), // 默认止损比例
  takeProfitPercent: z.number().min(0).max(1000).optional(), // 默认止盈比例
  maxOpenOrders: z.number().int().positive().optional(), // 最大挂单数
  cooldownSeconds: z.number().int().nonnegative().optional(), // 交易冷却时间
});

export type RiskSettings = z.infer<typeof RiskSettingsSchema>;

/**
 * 策略 Schema
 */
export const StrategySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  type: z.enum(['spot', 'grid', 'dca', 'signal', 'arbitrage', 'custom']),
  status: z.enum(['draft', 'backtesting', 'ready', 'running', 'paused', 'stopped', 'error']),
  exchangeId: z.string(), // e.g., 'binance', 'okx'
  symbol: z.string(), // e.g., 'BTC/USDT'
  rules: z.array(StrategyRuleSchema),
  riskSettings: RiskSettingsSchema.optional(),
  backtestResults: z.any().optional(), // 回测结果
  createdAt: z.date(),
  updatedAt: z.date(),
  startedAt: z.date().optional(),
  stoppedAt: z.date().optional(),
});

export type Strategy = z.infer<typeof StrategySchema>;

/**
 * 创建策略请求 Schema
 */
export const CreateStrategyRequestSchema = StrategySchema.pick({
  name: true,
  description: true,
  type: true,
  exchangeId: true,
  symbol: true,
}).extend({
  rules: z.array(StrategyRuleSchema).optional(),
  riskSettings: RiskSettingsSchema.optional(),
});

export type CreateStrategyRequest = z.infer<typeof CreateStrategyRequestSchema>;

/**
 * AI 生成策略请求
 */
export const AIStrategyPromptSchema = z.object({
  prompt: z.string().min(10).max(5000), // 用户自然语言描述
  exchangeId: z.string().optional(),
  symbol: z.string().optional(),
  riskLevel: z.enum(['low', 'medium', 'high']).optional(),
});

export type AIStrategyPrompt = z.infer<typeof AIStrategyPromptSchema>;
