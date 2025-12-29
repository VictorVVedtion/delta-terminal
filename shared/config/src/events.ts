/**
 * Delta Terminal 统一事件系统
 *
 * 跨服务事件标准化定义
 * - 统一事件信封格式
 * - 事件类型枚举
 * - Redis 频道映射
 */

import { randomUUID } from 'crypto'

// =============================================================================
// 事件类型定义
// =============================================================================

/**
 * 事件优先级
 * P0: 紧急 (立即处理，如风险告警)
 * P1: 高优 (重要事件，如订单成交)
 * P2: 普通 (常规事件，如策略更新)
 * P3: 低优 (信息性事件，如日志)
 */
export type EventPriority = 'p0' | 'p1' | 'p2' | 'p3'

/**
 * 服务名称
 */
export type ServiceName =
  | 'api-gateway'
  | 'auth-service'
  | 'user-service'
  | 'strategy-service'
  | 'ai-orchestrator'
  | 'nlp-processor'
  | 'strategy-generator'
  | 'signal-analyzer'
  | 'order-executor'
  | 'risk-manager'
  | 'exchange-connector'
  | 'market-data-collector'
  | 'backtest-engine'
  | 'analytics-service'

/**
 * 事件类型 - 使用点分命名空间
 */
export type EventType =
  // 订单事件
  | 'order.created'
  | 'order.submitted'
  | 'order.filled'
  | 'order.partially_filled'
  | 'order.cancelled'
  | 'order.rejected'
  | 'order.failed'

  // 风险事件
  | 'risk.alert'
  | 'risk.limit_reached'
  | 'risk.position_warning'
  | 'risk.drawdown_alert'
  | 'risk.exposure_exceeded'

  // AI 事件
  | 'ai.insight_generated'
  | 'ai.analysis_started'
  | 'ai.analysis_complete'
  | 'ai.signal_detected'
  | 'ai.clarification_needed'

  // 策略事件
  | 'strategy.created'
  | 'strategy.updated'
  | 'strategy.deleted'
  | 'strategy.activated'
  | 'strategy.paused'
  | 'strategy.stopped'
  | 'strategy.error'

  // 回测事件
  | 'backtest.started'
  | 'backtest.progress'
  | 'backtest.completed'
  | 'backtest.failed'
  | 'backtest.cancelled'

  // 市场数据事件
  | 'market.ticker'
  | 'market.orderbook'
  | 'market.trades'
  | 'market.kline'

  // 余额事件
  | 'balance.updated'
  | 'balance.deposit'
  | 'balance.withdrawal'

  // Spirit 系统事件
  | 'spirit.state_change'
  | 'spirit.notification'
  | 'spirit.thinking'
  | 'spirit.action'

  // 系统事件
  | 'system.service_online'
  | 'system.service_offline'
  | 'system.maintenance'
  | 'system.error'

// =============================================================================
// 事件信封
// =============================================================================

/**
 * 统一事件信封格式
 * 所有跨服务事件必须使用此格式
 */
export interface EventEnvelope<T = unknown> {
  /** 事件唯一 ID (UUID v4) */
  id: string

  /** 事件类型 */
  type: EventType

  /** 来源服务 */
  source: ServiceName

  /** Unix 毫秒时间戳 */
  timestamp: number

  /** 协议版本 */
  version: '1.0'

  /** 目标用户 ID (私有事件必填) */
  userId?: string

  /** 会话 ID (可选) */
  sessionId?: string

  /** 事件数据 */
  payload: T

  /** 优先级 (默认 p2) */
  priority?: EventPriority

  /** 存活时间 (毫秒，默认无限制) */
  ttl?: number

  /** 关联 ID (用于事件链追踪) */
  correlationId?: string

  /** 元数据 */
  metadata?: Record<string, unknown>
}

// =============================================================================
// 事件负载类型
// =============================================================================

/** 订单事件负载 */
export interface OrderEventPayload {
  orderId: string
  symbol: string
  side: 'buy' | 'sell'
  type: 'market' | 'limit' | 'stop' | 'stop_limit'
  quantity: number
  price?: number
  filledQuantity?: number
  avgPrice?: number
  status: string
  exchange: string
  strategyId?: string
  error?: string
}

/** 风险告警负载 */
export interface RiskAlertPayload {
  alertId: string
  level: 'warning' | 'critical' | 'emergency'
  category: 'drawdown' | 'exposure' | 'volatility' | 'liquidity' | 'concentration'
  message: string
  currentValue: number
  threshold: number
  affectedStrategies?: string[]
  suggestedAction?: string
}

/** AI 洞察负载 */
export interface AIInsightPayload {
  insightId: string
  insightType: string
  target?: {
    symbol?: string
    strategyId?: string
  }
  explanation: string
  confidence: number
  params: Array<{
    key: string
    label: string
    value: unknown
  }>
  expiresAt?: number
}

/** 策略事件负载 */
export interface StrategyEventPayload {
  strategyId: string
  name: string
  status: 'active' | 'paused' | 'stopped' | 'error'
  previousStatus?: string
  performance?: {
    pnl: number
    pnlPercent: number
    winRate: number
  }
  error?: string
}

/** 回测进度负载 */
export interface BacktestProgressPayload {
  backtestId: string
  strategyId: string
  progress: number // 0-100
  currentDate?: string
  estimatedTimeRemaining?: number // 秒
}

/** 回测结果负载 */
export interface BacktestResultPayload {
  backtestId: string
  strategyId: string
  startDate: string
  endDate: string
  metrics: {
    totalReturn: number
    annualizedReturn: number
    sharpeRatio: number
    maxDrawdown: number
    winRate: number
    profitFactor: number
    totalTrades: number
  }
  equity: Array<{ date: string; value: number }>
}

/** Spirit 事件负载 */
export interface SpiritEventPayload {
  title: string
  description: string
  spiritState: string
  priority: EventPriority
  metadata?: Record<string, unknown>
}

// =============================================================================
// Redis 频道映射
// =============================================================================

/**
 * 事件类型到 Redis 频道的映射
 */
export const EVENT_CHANNELS = {
  // 订单事件 - 用户私有
  'order.*': 'events:order',
  'order.created': 'events:order:created',
  'order.filled': 'events:order:filled',
  'order.cancelled': 'events:order:cancelled',

  // 风险事件 - 用户私有
  'risk.*': 'events:risk',
  'risk.alert': 'events:risk:alert',

  // AI 事件 - 用户私有
  'ai.*': 'events:ai',
  'ai.insight_generated': 'events:ai:insight',
  'ai.signal_detected': 'events:ai:signal',

  // 策略事件 - 用户私有
  'strategy.*': 'events:strategy',
  'strategy.updated': 'events:strategy:updated',

  // 回测事件 - 用户私有
  'backtest.*': 'events:backtest',
  'backtest.progress': 'events:backtest:progress',
  'backtest.completed': 'events:backtest:completed',

  // 市场数据 - 公共
  'market.*': 'events:market',
  'market.ticker': 'events:market:ticker',
  'market.orderbook': 'events:market:orderbook',
  'market.trades': 'events:market:trades',

  // Spirit 事件 - 用户私有
  'spirit.*': 'events:spirit',
  'spirit.notification': 'events:spirit:notification',

  // 系统事件 - 公共
  'system.*': 'events:system',
} as const

/**
 * 获取事件对应的 Redis 频道
 */
export function getEventChannel(eventType: EventType): string {
  // 精确匹配
  if (eventType in EVENT_CHANNELS) {
    return EVENT_CHANNELS[eventType as keyof typeof EVENT_CHANNELS]
  }

  // 通配符匹配
  const namespace = eventType.split('.')[0]
  const wildcardKey = `${namespace}.*` as keyof typeof EVENT_CHANNELS
  if (wildcardKey in EVENT_CHANNELS) {
    return EVENT_CHANNELS[wildcardKey]
  }

  // 默认频道
  return 'events:unknown'
}

/**
 * 获取用户特定的频道名
 * 私有事件需要加上用户 ID 后缀
 */
export function getUserChannel(baseChannel: string, userId: string): string {
  return `${baseChannel}:user:${userId}`
}

// =============================================================================
// 事件创建工具
// =============================================================================

/**
 * 创建事件信封
 */
export function createEvent<T>(
  type: EventType,
  source: ServiceName,
  payload: T,
  options?: Partial<Omit<EventEnvelope<T>, 'id' | 'type' | 'source' | 'payload' | 'timestamp' | 'version'>>
): EventEnvelope<T> {
  return {
    id: randomUUID(),
    type,
    source,
    timestamp: Date.now(),
    version: '1.0',
    payload,
    priority: options?.priority ?? 'p2',
    ...options,
  }
}

/**
 * 创建订单事件
 */
export function createOrderEvent(
  eventType: Extract<EventType, `order.${string}`>,
  source: ServiceName,
  payload: OrderEventPayload,
  userId: string
): EventEnvelope<OrderEventPayload> {
  return createEvent(eventType, source, payload, { userId, priority: 'p1' })
}

/**
 * 创建风险告警事件
 */
export function createRiskEvent(
  payload: RiskAlertPayload,
  userId: string
): EventEnvelope<RiskAlertPayload> {
  const priority: EventPriority =
    payload.level === 'emergency' ? 'p0' : payload.level === 'critical' ? 'p1' : 'p2'
  return createEvent('risk.alert', 'risk-manager', payload, { userId, priority })
}

/**
 * 创建 AI 洞察事件
 */
export function createAIInsightEvent(
  payload: AIInsightPayload,
  userId: string
): EventEnvelope<AIInsightPayload> {
  return createEvent('ai.insight_generated', 'nlp-processor', payload, { userId, priority: 'p2' })
}

/**
 * 创建回测进度事件
 */
export function createBacktestProgressEvent(
  payload: BacktestProgressPayload,
  userId: string
): EventEnvelope<BacktestProgressPayload> {
  return createEvent('backtest.progress', 'backtest-engine', payload, { userId, priority: 'p3' })
}

/**
 * 创建回测完成事件
 */
export function createBacktestResultEvent(
  payload: BacktestResultPayload,
  userId: string
): EventEnvelope<BacktestResultPayload> {
  return createEvent('backtest.completed', 'backtest-engine', payload, { userId, priority: 'p1' })
}

// =============================================================================
// 事件验证
// =============================================================================

/**
 * 验证事件信封格式
 */
export function validateEvent(event: unknown): event is EventEnvelope {
  if (typeof event !== 'object' || event === null) return false

  const e = event as Record<string, unknown>

  return (
    typeof e.id === 'string' &&
    typeof e.type === 'string' &&
    typeof e.source === 'string' &&
    typeof e.timestamp === 'number' &&
    e.version === '1.0' &&
    'payload' in e
  )
}

/**
 * 检查事件是否过期
 */
export function isEventExpired(event: EventEnvelope): boolean {
  if (!event.ttl) return false
  return Date.now() > event.timestamp + event.ttl
}

// =============================================================================
// 导出
// =============================================================================

export type {
  EventEnvelope,
  OrderEventPayload,
  RiskAlertPayload,
  AIInsightPayload,
  StrategyEventPayload,
  BacktestProgressPayload,
  BacktestResultPayload,
  SpiritEventPayload,
}
