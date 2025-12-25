import { z } from 'zod';

/**
 * 订单类型
 */
export const OrderType = {
  MARKET: 'market',
  LIMIT: 'limit',
  STOP_LOSS: 'stop_loss',
  STOP_LOSS_LIMIT: 'stop_loss_limit',
  TAKE_PROFIT: 'take_profit',
  TAKE_PROFIT_LIMIT: 'take_profit_limit',
} as const;

export type OrderType = (typeof OrderType)[keyof typeof OrderType];

/**
 * 订单状态
 */
export const OrderStatus = {
  PENDING: 'pending',       // 待提交
  OPEN: 'open',             // 已挂单
  PARTIALLY_FILLED: 'partially_filled', // 部分成交
  FILLED: 'filled',         // 完全成交
  CANCELED: 'canceled',     // 已取消
  REJECTED: 'rejected',     // 被拒绝
  EXPIRED: 'expired',       // 已过期
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

/**
 * 订单 Schema
 */
export const OrderSchema = z.object({
  id: z.string().uuid(),
  strategyId: z.string().uuid().optional(),
  userId: z.string().uuid(),
  exchangeId: z.string(),
  exchangeOrderId: z.string().optional(), // 交易所返回的订单ID
  symbol: z.string(),
  type: z.enum(['market', 'limit', 'stop_loss', 'stop_loss_limit', 'take_profit', 'take_profit_limit']),
  side: z.enum(['buy', 'sell']),
  status: z.enum(['pending', 'open', 'partially_filled', 'filled', 'canceled', 'rejected', 'expired']),
  price: z.number().positive().optional(), // 限价单价格
  stopPrice: z.number().positive().optional(), // 触发价格
  quantity: z.number().positive(),
  filledQuantity: z.number().nonnegative().default(0),
  averagePrice: z.number().positive().optional(), // 平均成交价
  fee: z.number().nonnegative().optional(),
  feeCurrency: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  filledAt: z.date().optional(),
});

export type Order = z.infer<typeof OrderSchema>;

/**
 * 创建订单请求
 */
export const CreateOrderRequestSchema = z.object({
  exchangeId: z.string(),
  symbol: z.string(),
  type: z.enum(['market', 'limit', 'stop_loss', 'stop_loss_limit', 'take_profit', 'take_profit_limit']),
  side: z.enum(['buy', 'sell']),
  quantity: z.number().positive(),
  price: z.number().positive().optional(),
  stopPrice: z.number().positive().optional(),
  strategyId: z.string().uuid().optional(),
});

export type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>;

/**
 * 持仓 Schema
 */
export const PositionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  exchangeId: z.string(),
  symbol: z.string(),
  side: z.enum(['long', 'short']),
  quantity: z.number(),
  entryPrice: z.number().positive(),
  currentPrice: z.number().positive(),
  unrealizedPnl: z.number(),
  unrealizedPnlPercent: z.number(),
  leverage: z.number().positive().default(1),
  marginType: z.enum(['isolated', 'cross']).optional(),
  liquidationPrice: z.number().positive().optional(),
  updatedAt: z.date(),
});

export type Position = z.infer<typeof PositionSchema>;

/**
 * 交易记录 Schema
 */
export const TradeSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  strategyId: z.string().uuid().optional(),
  userId: z.string().uuid(),
  exchangeId: z.string(),
  exchangeTradeId: z.string(),
  symbol: z.string(),
  side: z.enum(['buy', 'sell']),
  price: z.number().positive(),
  quantity: z.number().positive(),
  fee: z.number().nonnegative(),
  feeCurrency: z.string(),
  realizedPnl: z.number().optional(),
  executedAt: z.date(),
});

export type Trade = z.infer<typeof TradeSchema>;

/**
 * 投资组合汇总
 */
export const PortfolioSummarySchema = z.object({
  userId: z.string().uuid(),
  totalValue: z.number(), // 总价值 (USDT)
  totalPnl: z.number(), // 总盈亏
  totalPnlPercent: z.number(), // 总盈亏百分比
  dailyPnl: z.number(), // 今日盈亏
  dailyPnlPercent: z.number(), // 今日盈亏百分比
  positions: z.array(PositionSchema),
  updatedAt: z.date(),
});

export type PortfolioSummary = z.infer<typeof PortfolioSummarySchema>;

/**
 * 回测结果
 */
export const BacktestResultSchema = z.object({
  strategyId: z.string().uuid(),
  startDate: z.date(),
  endDate: z.date(),
  initialCapital: z.number().positive(),
  finalCapital: z.number(),
  totalReturn: z.number(), // 总收益率 (%)
  annualizedReturn: z.number(), // 年化收益率 (%)
  maxDrawdown: z.number(), // 最大回撤 (%)
  sharpeRatio: z.number(), // 夏普比率
  sortinoRatio: z.number().optional(), // 索提诺比率
  winRate: z.number(), // 胜率 (%)
  totalTrades: z.number().int(),
  profitableTrades: z.number().int(),
  losingTrades: z.number().int(),
  averageWin: z.number(), // 平均盈利
  averageLoss: z.number(), // 平均亏损
  profitFactor: z.number(), // 盈亏比
  trades: z.array(TradeSchema).optional(), // 交易明细
  equityCurve: z.array(z.object({
    timestamp: z.date(),
    equity: z.number(),
  })).optional(),
});

export type BacktestResult = z.infer<typeof BacktestResultSchema>;
