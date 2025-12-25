import { z } from 'zod';

/**
 * API 响应基础结构
 */
export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z
      .object({
        code: z.string(),
        message: z.string(),
        details: z.record(z.unknown()).optional(),
      })
      .optional(),
    meta: z
      .object({
        timestamp: z.string().datetime(),
        requestId: z.string().optional(),
        version: z.string().optional(),
      })
      .optional(),
  });

/**
 * 成功响应
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    timestamp: string;
    requestId?: string;
    version?: string;
  };
}

/**
 * 错误响应
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

/**
 * API 响应类型
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * 分页参数
 */
export const PaginationParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type PaginationParams = z.infer<typeof PaginationParamsSchema>;

/**
 * 分页响应元数据
 */
export const PaginationMetaSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  hasNextPage: z.boolean(),
  hasPrevPage: z.boolean(),
});

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

/**
 * API 错误码
 */
export const ApiErrorCode = {
  // 通用错误 (1xxx)
  INTERNAL_ERROR: 'E1000',
  VALIDATION_ERROR: 'E1001',
  NOT_FOUND: 'E1002',
  RATE_LIMITED: 'E1003',
  SERVICE_UNAVAILABLE: 'E1004',

  // 认证错误 (2xxx)
  UNAUTHORIZED: 'E2000',
  INVALID_TOKEN: 'E2001',
  TOKEN_EXPIRED: 'E2002',
  FORBIDDEN: 'E2003',
  INVALID_CREDENTIALS: 'E2004',
  ACCOUNT_LOCKED: 'E2005',
  EMAIL_NOT_VERIFIED: 'E2006',

  // 用户错误 (3xxx)
  USER_NOT_FOUND: 'E3000',
  EMAIL_ALREADY_EXISTS: 'E3001',
  INVALID_PASSWORD: 'E3002',

  // 交易所错误 (4xxx)
  EXCHANGE_ERROR: 'E4000',
  INVALID_API_KEY: 'E4001',
  EXCHANGE_CONNECTION_FAILED: 'E4002',
  EXCHANGE_RATE_LIMITED: 'E4003',
  INSUFFICIENT_BALANCE: 'E4004',
  INVALID_ORDER: 'E4005',
  ORDER_NOT_FOUND: 'E4006',

  // 策略错误 (5xxx)
  STRATEGY_NOT_FOUND: 'E5000',
  STRATEGY_ALREADY_RUNNING: 'E5001',
  INVALID_STRATEGY: 'E5002',
  BACKTEST_FAILED: 'E5003',

  // AI 错误 (6xxx)
  AI_SERVICE_ERROR: 'E6000',
  AI_RATE_LIMITED: 'E6001',
  INVALID_PROMPT: 'E6002',
} as const;

export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];

/**
 * WebSocket 消息类型
 */
export const WebSocketMessageType = {
  // 连接管理
  PING: 'ping',
  PONG: 'pong',
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe',
  SUBSCRIBED: 'subscribed',
  UNSUBSCRIBED: 'unsubscribed',
  ERROR: 'error',

  // 市场数据
  TICKER: 'ticker',
  ORDERBOOK: 'orderbook',
  TRADE: 'trade',
  CANDLE: 'candle',

  // 账户数据
  BALANCE: 'balance',
  ORDER: 'order',
  POSITION: 'position',

  // 策略数据
  STRATEGY_STATUS: 'strategy_status',
  SIGNAL: 'signal',
} as const;

export type WebSocketMessageType = (typeof WebSocketMessageType)[keyof typeof WebSocketMessageType];

/**
 * WebSocket 消息
 */
export interface WebSocketMessage<T = unknown> {
  type: WebSocketMessageType;
  channel?: string;
  data?: T;
  timestamp: number;
}
