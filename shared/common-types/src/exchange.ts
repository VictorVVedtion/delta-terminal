import { z } from 'zod';

/**
 * 支持的交易所
 */
export const SupportedExchange = {
  BINANCE: 'binance',
  OKX: 'okx',
  BYBIT: 'bybit',
  COINBASE: 'coinbase',
  KRAKEN: 'kraken',
  BITGET: 'bitget',
  GATE: 'gate',
  KUCOIN: 'kucoin',
} as const;

export type SupportedExchange = (typeof SupportedExchange)[keyof typeof SupportedExchange];

/**
 * 交易所连接状态
 */
export const ExchangeConnectionStatus = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
  RATE_LIMITED: 'rate_limited',
} as const;

export type ExchangeConnectionStatus = (typeof ExchangeConnectionStatus)[keyof typeof ExchangeConnectionStatus];

/**
 * 交易所账户 Schema
 */
export const ExchangeAccountSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  exchangeId: z.enum(['binance', 'okx', 'bybit', 'coinbase', 'kraken', 'bitget', 'gate', 'kucoin']),
  name: z.string().min(1).max(50), // 用户自定义名称
  apiKey: z.string(), // 加密存储
  apiSecret: z.string(), // 加密存储
  passphrase: z.string().optional(), // OKX 等需要
  isTestnet: z.boolean().default(false),
  status: z.enum(['connected', 'disconnected', 'error', 'rate_limited']),
  lastConnectedAt: z.date().optional(),
  permissions: z.array(z.enum(['read', 'trade', 'withdraw'])).default(['read']),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ExchangeAccount = z.infer<typeof ExchangeAccountSchema>;

/**
 * 添加交易所账户请求
 */
export const AddExchangeAccountRequestSchema = z.object({
  exchangeId: z.enum(['binance', 'okx', 'bybit', 'coinbase', 'kraken', 'bitget', 'gate', 'kucoin']),
  name: z.string().min(1).max(50),
  apiKey: z.string().min(1),
  apiSecret: z.string().min(1),
  passphrase: z.string().optional(),
  isTestnet: z.boolean().optional().default(false),
});

export type AddExchangeAccountRequest = z.infer<typeof AddExchangeAccountRequestSchema>;

/**
 * 资产余额 Schema
 */
export const BalanceSchema = z.object({
  currency: z.string(), // e.g., 'BTC', 'USDT'
  free: z.number().nonnegative(), // 可用余额
  locked: z.number().nonnegative(), // 冻结余额
  total: z.number().nonnegative(), // 总余额
  usdValue: z.number().nonnegative().optional(), // USD 估值
});

export type Balance = z.infer<typeof BalanceSchema>;

/**
 * 账户余额汇总
 */
export const AccountBalanceSchema = z.object({
  exchangeAccountId: z.string().uuid(),
  exchangeId: z.string(),
  balances: z.array(BalanceSchema),
  totalUsdValue: z.number().nonnegative(),
  updatedAt: z.date(),
});

export type AccountBalance = z.infer<typeof AccountBalanceSchema>;

/**
 * 交易对信息
 */
export const SymbolInfoSchema = z.object({
  symbol: z.string(), // e.g., 'BTC/USDT'
  base: z.string(), // e.g., 'BTC'
  quote: z.string(), // e.g., 'USDT'
  exchangeId: z.string(),
  active: z.boolean(),
  minQuantity: z.number().positive().optional(),
  maxQuantity: z.number().positive().optional(),
  quantityPrecision: z.number().int().nonnegative(),
  minPrice: z.number().positive().optional(),
  maxPrice: z.number().positive().optional(),
  pricePrecision: z.number().int().nonnegative(),
  minNotional: z.number().positive().optional(), // 最小下单金额
});

export type SymbolInfo = z.infer<typeof SymbolInfoSchema>;

/**
 * K线数据
 */
export const CandleSchema = z.object({
  timestamp: z.number(), // Unix 毫秒时间戳
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number().nonnegative(),
  quoteVolume: z.number().nonnegative().optional(),
});

export type Candle = z.infer<typeof CandleSchema>;

/**
 * 实时行情
 */
export const TickerSchema = z.object({
  symbol: z.string(),
  exchangeId: z.string(),
  price: z.number().positive(),
  bid: z.number().positive().optional(),
  ask: z.number().positive().optional(),
  high24h: z.number().positive(),
  low24h: z.number().positive(),
  volume24h: z.number().nonnegative(),
  quoteVolume24h: z.number().nonnegative().optional(),
  change24h: z.number(),
  changePercent24h: z.number(),
  timestamp: z.number(),
});

export type Ticker = z.infer<typeof TickerSchema>;

/**
 * 订单簿
 */
export const OrderBookSchema = z.object({
  symbol: z.string(),
  exchangeId: z.string(),
  bids: z.array(z.tuple([z.number(), z.number()])), // [price, quantity]
  asks: z.array(z.tuple([z.number(), z.number()])), // [price, quantity]
  timestamp: z.number(),
});

export type OrderBook = z.infer<typeof OrderBookSchema>;
