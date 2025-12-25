import { z } from 'zod';

/**
 * K线周期
 */
export enum CandlestickInterval {
  ONE_MINUTE = '1m',
  FIVE_MINUTES = '5m',
  FIFTEEN_MINUTES = '15m',
  THIRTY_MINUTES = '30m',
  ONE_HOUR = '1h',
  FOUR_HOURS = '4h',
  ONE_DAY = '1d',
  ONE_WEEK = '1w',
  ONE_MONTH = '1M',
}

/**
 * K线数据 Schema
 */
export const CandlestickSchema = z.object({
  symbol: z.string(),
  interval: z.nativeEnum(CandlestickInterval),
  openTime: z.number(),
  open: z.number().positive(),
  high: z.number().positive(),
  low: z.number().positive(),
  close: z.number().positive(),
  volume: z.number().nonnegative(),
  closeTime: z.number(),
  trades: z.number().int().nonnegative().optional(),
});

export type Candlestick = z.infer<typeof CandlestickSchema>;

/**
 * 订单簿数据 Schema
 */
export const OrderBookSchema = z.object({
  symbol: z.string(),
  timestamp: z.number(),
  bids: z.array(
    z.tuple([
      z.number().positive(), // price
      z.number().positive(), // quantity
    ])
  ),
  asks: z.array(
    z.tuple([
      z.number().positive(), // price
      z.number().positive(), // quantity
    ])
  ),
});

export type OrderBook = z.infer<typeof OrderBookSchema>;

/**
 * Ticker 数据 Schema
 */
export const TickerSchema = z.object({
  symbol: z.string(),
  lastPrice: z.number().positive(),
  bid: z.number().positive(),
  ask: z.number().positive(),
  high24h: z.number().positive(),
  low24h: z.number().positive(),
  volume24h: z.number().nonnegative(),
  priceChange24h: z.number(),
  priceChangePercent24h: z.number(),
  timestamp: z.number(),
});

export type Ticker = z.infer<typeof TickerSchema>;

/**
 * 交易对信息 Schema
 */
export const TradingPairSchema = z.object({
  symbol: z.string(),
  baseAsset: z.string(),
  quoteAsset: z.string(),
  status: z.enum(['TRADING', 'HALTED', 'BREAK']),
  minPrice: z.number().positive().optional(),
  maxPrice: z.number().positive().optional(),
  minQuantity: z.number().positive().optional(),
  maxQuantity: z.number().positive().optional(),
  stepSize: z.number().positive().optional(),
});

export type TradingPair = z.infer<typeof TradingPairSchema>;
