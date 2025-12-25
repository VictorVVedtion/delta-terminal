import { z } from 'zod';

/**
 * 策略状态
 */
export enum StrategyStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  STOPPED = 'stopped',
}

/**
 * 策略类型
 */
export enum StrategyType {
  TREND_FOLLOWING = 'trend_following',
  MEAN_REVERSION = 'mean_reversion',
  ARBITRAGE = 'arbitrage',
  MARKET_MAKING = 'market_making',
  CUSTOM = 'custom',
}

/**
 * 交易信号类型
 */
export enum SignalType {
  BUY = 'buy',
  SELL = 'sell',
  HOLD = 'hold',
}

/**
 * 策略 Schema
 */
export const StrategySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.nativeEnum(StrategyType),
  status: z.nativeEnum(StrategyStatus),
  config: z.record(z.unknown()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Strategy = z.infer<typeof StrategySchema>;

/**
 * 创建策略请求
 */
export const CreateStrategySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.nativeEnum(StrategyType),
  config: z.record(z.unknown()),
});

export type CreateStrategyRequest = z.infer<typeof CreateStrategySchema>;

/**
 * 交易信号 Schema
 */
export const TradingSignalSchema = z.object({
  id: z.string().uuid(),
  strategyId: z.string().uuid(),
  symbol: z.string(),
  type: z.nativeEnum(SignalType),
  price: z.number().positive(),
  quantity: z.number().positive().optional(),
  confidence: z.number().min(0).max(1),
  timestamp: z.string().datetime(),
  metadata: z.record(z.unknown()).optional(),
});

export type TradingSignal = z.infer<typeof TradingSignalSchema>;
