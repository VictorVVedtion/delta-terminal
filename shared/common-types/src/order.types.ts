import { z } from 'zod';

/**
 * 订单类型
 */
export enum OrderType {
  MARKET = 'market',
  LIMIT = 'limit',
  STOP_LOSS = 'stop_loss',
  STOP_LIMIT = 'stop_limit',
  TAKE_PROFIT = 'take_profit',
}

/**
 * 订单方向
 */
export enum OrderSide {
  BUY = 'buy',
  SELL = 'sell',
}

/**
 * 订单状态
 */
export enum OrderStatus {
  PENDING = 'pending',
  OPEN = 'open',
  PARTIALLY_FILLED = 'partially_filled',
  FILLED = 'filled',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

/**
 * 时间有效期类型
 */
export enum TimeInForce {
  GTC = 'gtc', // Good Till Cancelled
  IOC = 'ioc', // Immediate or Cancel
  FOK = 'fok', // Fill or Kill
  DAY = 'day', // Day order
}

/**
 * 订单 Schema
 */
export const OrderSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  strategyId: z.string().uuid().optional(),
  exchange: z.string(),
  symbol: z.string(),
  type: z.nativeEnum(OrderType),
  side: z.nativeEnum(OrderSide),
  status: z.nativeEnum(OrderStatus),
  price: z.number().positive().optional(),
  quantity: z.number().positive(),
  filledQuantity: z.number().nonnegative().default(0),
  averagePrice: z.number().positive().optional(),
  timeInForce: z.nativeEnum(TimeInForce).default(TimeInForce.GTC),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  executedAt: z.string().datetime().optional(),
});

export type Order = z.infer<typeof OrderSchema>;

/**
 * 创建订单请求
 */
export const CreateOrderSchema = z.object({
  strategyId: z.string().uuid().optional(),
  exchange: z.string(),
  symbol: z.string(),
  type: z.nativeEnum(OrderType),
  side: z.nativeEnum(OrderSide),
  price: z.number().positive().optional(),
  quantity: z.number().positive(),
  timeInForce: z.nativeEnum(TimeInForce).default(TimeInForce.GTC),
});

export type CreateOrderRequest = z.infer<typeof CreateOrderSchema>;

/**
 * 订单执行结果
 */
export const OrderExecutionResultSchema = z.object({
  orderId: z.string().uuid(),
  status: z.nativeEnum(OrderStatus),
  filledQuantity: z.number().nonnegative(),
  averagePrice: z.number().positive().optional(),
  commission: z.number().nonnegative().optional(),
  executedAt: z.string().datetime(),
});

export type OrderExecutionResult = z.infer<typeof OrderExecutionResultSchema>;
