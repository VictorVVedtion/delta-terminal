/**
 * 事件总线服务
 *
 * 提供跨服务事件发布/订阅能力
 * 基于 Redis Pub/Sub 实现
 */

import Redis from 'ioredis'

import { config } from '../config'

// =============================================================================
// 事件类型定义 (与 @delta/config events.ts 保持同步)
// =============================================================================

export type EventPriority = 'p0' | 'p1' | 'p2' | 'p3'

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
  // AI 事件
  | 'ai.insight_generated'
  | 'ai.analysis_started'
  | 'ai.analysis_complete'
  | 'ai.signal_detected'
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
  // 市场数据事件
  | 'market.ticker'
  | 'market.orderbook'
  | 'market.trades'
  // Spirit 事件
  | 'spirit.state_change'
  | 'spirit.notification'
  | 'spirit.thinking'
  | 'spirit.action'
  // 系统事件
  | 'system.service_online'
  | 'system.service_offline'

export interface EventEnvelope<T = unknown> {
  id: string
  type: EventType
  source: ServiceName
  timestamp: number
  version: '1.0'
  userId?: string
  sessionId?: string
  payload: T
  priority?: EventPriority
  ttl?: number
  correlationId?: string
  metadata?: Record<string, unknown>
}

// =============================================================================
// 频道映射
// =============================================================================

const EVENT_CHANNELS: Record<string, string> = {
  // 订单事件
  'order.*': 'events:order',
  'order.created': 'events:order:created',
  'order.filled': 'events:order:filled',

  // 风险事件
  'risk.*': 'events:risk',
  'risk.alert': 'events:risk:alert',

  // AI 事件
  'ai.*': 'events:ai',
  'ai.insight_generated': 'events:ai:insight',

  // 策略事件
  'strategy.*': 'events:strategy',
  'strategy.updated': 'events:strategy:updated',

  // 回测事件
  'backtest.*': 'events:backtest',
  'backtest.progress': 'events:backtest:progress',
  'backtest.completed': 'events:backtest:completed',

  // 市场数据
  'market.*': 'events:market',

  // Spirit 事件
  'spirit.*': 'events:spirit',

  // 系统事件
  'system.*': 'events:system',
}

function getEventChannel(eventType: EventType): string {
  if (eventType in EVENT_CHANNELS) {
    return EVENT_CHANNELS[eventType]
  }

  const namespace = eventType.split('.')[0]
  const wildcardKey = `${namespace}.*`
  if (wildcardKey in EVENT_CHANNELS) {
    return EVENT_CHANNELS[wildcardKey]
  }

  return 'events:unknown'
}

function getUserChannel(baseChannel: string, userId: string): string {
  return `${baseChannel}:user:${userId}`
}

// =============================================================================
// 事件总线服务
// =============================================================================

export type EventCallback<T = unknown> = (event: EventEnvelope<T>) => void | Promise<void>

export class EventBusService {
  private publisher: Redis
  private subscriber: Redis
  private subscriptions: Map<string, Set<EventCallback>> = new Map()
  private isConnected = false

  constructor() {
    const redisOptions = {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password || undefined,
      db: config.redis.db,
      retryStrategy: (times: number) => {
        if (times > 10) return null
        return Math.min(times * 100, 3000)
      },
    }

    this.publisher = new Redis(redisOptions)
    this.subscriber = new Redis(redisOptions)

    this.setupEventHandlers()
  }

  private setupEventHandlers() {
    this.publisher.on('connect', () => {
      console.log('[EventBus] Publisher connected to Redis')
    })

    this.subscriber.on('connect', () => {
      console.log('[EventBus] Subscriber connected to Redis')
      this.isConnected = true
    })

    this.publisher.on('error', (err) => {
      console.error('[EventBus] Publisher error:', err.message)
    })

    this.subscriber.on('error', (err) => {
      console.error('[EventBus] Subscriber error:', err.message)
    })

    // 处理 pattern 订阅消息
    this.subscriber.on('pmessage', (pattern, _channel, message) => {
      this.handleMessage(pattern, message)
    })

    // 处理普通订阅消息
    this.subscriber.on('message', (channel, message) => {
      this.handleMessage(channel, message)
    })
  }

  private handleMessage(channelOrPattern: string, message: string) {
    try {
      const event = JSON.parse(message) as EventEnvelope

      // 验证事件格式
      if (!this.validateEvent(event)) {
        console.warn('[EventBus] Invalid event format:', message)
        return
      }

      // 检查是否过期
      if (this.isEventExpired(event)) {
        return
      }

      // 调用回调
      const callbacks = this.subscriptions.get(channelOrPattern)
      if (callbacks) {
        callbacks.forEach((callback) => {
          try {
            const result = callback(event)
            if (result instanceof Promise) {
              result.catch((err) => {
                console.error('[EventBus] Callback error:', err)
              })
            }
          } catch (err) {
            console.error('[EventBus] Callback error:', err)
          }
        })
      }
    } catch (err) {
      console.error('[EventBus] Failed to parse message:', err)
    }
  }

  private validateEvent(event: unknown): event is EventEnvelope {
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

  private isEventExpired(event: EventEnvelope): boolean {
    if (!event.ttl) return false
    return Date.now() > event.timestamp + event.ttl
  }

  /**
   * 发布事件
   */
  async publish<T>(event: EventEnvelope<T>): Promise<number> {
    const baseChannel = getEventChannel(event.type)
    let channel = baseChannel

    // 如果是用户私有事件，使用用户特定频道
    if (event.userId) {
      channel = getUserChannel(baseChannel, event.userId)
    }

    const message = JSON.stringify(event)
    return this.publisher.publish(channel, message)
  }

  /**
   * 创建并发布事件
   */
  async emit<T>(
    type: EventType,
    payload: T,
    options?: {
      userId?: string
      priority?: EventPriority
      ttl?: number
      correlationId?: string
      metadata?: Record<string, unknown>
    }
  ): Promise<number> {
    const event: EventEnvelope<T> = {
      id: crypto.randomUUID(),
      type,
      source: 'strategy-service',
      timestamp: Date.now(),
      version: '1.0',
      payload,
      priority: options?.priority ?? 'p2',
      userId: options?.userId,
      ttl: options?.ttl,
      correlationId: options?.correlationId,
      metadata: options?.metadata,
    }

    return this.publish(event)
  }

  /**
   * 订阅频道 (支持通配符)
   */
  async subscribe<T = unknown>(
    channelPattern: string,
    callback: EventCallback<T>
  ): Promise<void> {
    if (!this.subscriptions.has(channelPattern)) {
      this.subscriptions.set(channelPattern, new Set())

      // 使用 psubscribe 支持通配符
      if (channelPattern.includes('*')) {
        await this.subscriber.psubscribe(channelPattern)
      } else {
        await this.subscriber.subscribe(channelPattern)
      }
    }

    this.subscriptions.get(channelPattern)!.add(callback as EventCallback)
  }

  /**
   * 订阅用户事件
   */
  async subscribeUserEvents<T = unknown>(
    userId: string,
    eventNamespace: string,
    callback: EventCallback<T>
  ): Promise<void> {
    const baseChannel = `events:${eventNamespace}`
    const userChannel = getUserChannel(baseChannel, userId)
    await this.subscribe(userChannel, callback)
  }

  /**
   * 取消订阅
   */
  async unsubscribe(channelPattern: string): Promise<void> {
    if (!this.subscriptions.has(channelPattern)) return

    this.subscriptions.delete(channelPattern)

    if (channelPattern.includes('*')) {
      await this.subscriber.punsubscribe(channelPattern)
    } else {
      await this.subscriber.unsubscribe(channelPattern)
    }
  }

  /**
   * 关闭连接
   */
  async close(): Promise<void> {
    this.subscriptions.clear()
    await this.subscriber.quit()
    await this.publisher.quit()
    this.isConnected = false
  }

  /**
   * 检查连接状态
   */
  get connected(): boolean {
    return this.isConnected
  }
}

// =============================================================================
// 单例导出
// =============================================================================

let eventBusInstance: EventBusService | null = null

export function getEventBus(): EventBusService {
  if (!eventBusInstance) {
    eventBusInstance = new EventBusService()
  }
  return eventBusInstance
}

export default getEventBus
