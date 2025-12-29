# WebSocket 统一实时推送方案设计

> P1 任务：设计并实现跨服务的统一 WebSocket 事件推送系统

## 1. 当前问题分析

### 1.1 现有架构缺陷

| 问题 | 描述 | 影响 |
|------|------|------|
| **API Gateway 无 WS 代理** | 前端需要直接连接各服务 | 认证/限流绕过网关，多连接管理复杂 |
| **事件总线不统一** | 仅 Redis `spirit:events` 频道 | 订单/风险/AI事件无法实时推送 |
| **前端多客户端** | wsClient + spiritClient 分离 | 连接管理分散，状态不一致 |
| **缺少事件标准** | 各服务事件格式不统一 | 难以扩展和聚合 |

### 1.2 缺失的事件源

- ❌ Order Executor → 订单状态变更
- ❌ Risk Manager → 风险告警
- ❌ NLP Processor → AI 分析完成
- ❌ Signal Analyzer → 交易信号
- ❌ Backtest Engine → 回测进度/结果

## 2. 目标架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              UnifiedWebSocketClient                      │   │
│  │  - 单一连接管理                                          │   │
│  │  - 统一事件订阅 API                                      │   │
│  │  - 自动重连 + 背压处理                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│                    wss://api.delta.com/ws                       │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              WebSocket Gateway Handler                   │   │
│  │  - JWT 认证                                              │   │
│  │  - 连接限流                                              │   │
│  │  - 事件路由                                              │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Redis Event Bus                               │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ events:order │ │ events:risk  │ │ events:ai    │ ...        │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
└─────────────────────────────────────────────────────────────────┘
          ▲                  ▲                  ▲
          │                  │                  │
    ┌─────┴─────┐      ┌─────┴─────┐      ┌─────┴─────┐
    │Order Exec │      │Risk Mgr   │      │AI Engine  │
    └───────────┘      └───────────┘      └───────────┘
```

## 3. 事件标准化

### 3.1 统一事件信封 (EventEnvelope)

```typescript
interface EventEnvelope<T = unknown> {
  // 元数据
  id: string           // 事件唯一 ID (UUID)
  type: EventType      // 事件类型
  source: ServiceName  // 来源服务
  timestamp: number    // Unix 毫秒时间戳
  version: '1.0'       // 协议版本

  // 用户/会话上下文
  userId?: string      // 目标用户 ID (私有事件)
  sessionId?: string   // 会话 ID (可选)

  // 负载
  payload: T           // 事件数据

  // 元信息
  priority?: 'p0' | 'p1' | 'p2' | 'p3'  // 优先级
  ttl?: number         // 存活时间 (毫秒)
  correlationId?: string // 关联 ID (用于追踪)
}
```

### 3.2 事件类型定义

```typescript
type EventType =
  // 交易事件
  | 'order.created'
  | 'order.filled'
  | 'order.cancelled'
  | 'order.failed'

  // 风险事件
  | 'risk.alert'
  | 'risk.limit_reached'
  | 'risk.position_warning'

  // AI 事件
  | 'ai.insight_generated'
  | 'ai.analysis_complete'
  | 'ai.signal_detected'

  // 策略事件
  | 'strategy.created'
  | 'strategy.updated'
  | 'strategy.activated'
  | 'strategy.paused'

  // 回测事件
  | 'backtest.started'
  | 'backtest.progress'
  | 'backtest.completed'
  | 'backtest.failed'

  // 市场数据事件
  | 'market.ticker'
  | 'market.orderbook'
  | 'market.trades'

  // Spirit 系统事件
  | 'spirit.state_change'
  | 'spirit.notification'

type ServiceName =
  | 'order-executor'
  | 'risk-manager'
  | 'nlp-processor'
  | 'signal-analyzer'
  | 'strategy-service'
  | 'backtest-engine'
  | 'market-data-collector'
  | 'exchange-connector'
```

### 3.3 订阅协议

```typescript
// 客户端 → 服务端
interface SubscribeMessage {
  action: 'subscribe'
  channels: string[]  // e.g., ['order.*', 'risk.alert', 'market.ticker:BTC/USDT']
  options?: {
    priority?: 'p0' | 'p1' | 'p2' | 'p3'  // 仅订阅指定优先级以上
    limit?: number     // 每秒最大事件数
  }
}

interface UnsubscribeMessage {
  action: 'unsubscribe'
  channels: string[]
}

// 服务端 → 客户端
interface EventMessage {
  action: 'event'
  channel: string
  data: EventEnvelope
}

interface AckMessage {
  action: 'ack'
  subscribed: string[]
  unsubscribed?: string[]
}

interface ErrorMessage {
  action: 'error'
  code: string
  message: string
}
```

## 4. 实现计划

### Phase 1: 事件总线扩展 (本次实现)

**目标**: 扩展 Redis 事件总线，支持多类型事件

**文件变更**:

1. **`shared/config/src/events.ts`** (新建)
   - EventEnvelope 类型定义
   - EventType 枚举
   - Redis channel 映射

2. **`shared/config/python/events.py`** (新建)
   - Python 版事件类型定义
   - 事件发布/订阅工具函数

3. **`backend/strategy-service/src/services/eventBus.ts`** (新建)
   - EventBusService 类
   - 事件发布/订阅封装
   - 事件路由逻辑

### Phase 2: API Gateway WS 代理 (后续)

**目标**: API Gateway 支持 WebSocket 连接代理

### Phase 3: 前端统一客户端 (后续)

**目标**: 合并 wsClient 和 spiritClient

### Phase 4: 服务事件集成 (后续)

**目标**: 各服务发布事件到统一总线

## 5. Phase 1 详细实现

### 5.1 TypeScript 事件类型 (`shared/config/src/events.ts`)

```typescript
// 详见下方实现
```

### 5.2 Python 事件工具 (`shared/config/python/events.py`)

```python
# 详见下方实现
```

### 5.3 事件总线服务 (`backend/strategy-service/src/services/eventBus.ts`)

```typescript
// 详见下方实现
```

## 6. 迁移策略

### 6.1 向后兼容

- 保留现有 `spirit:events` 频道
- 新事件使用 `events:{type}` 频道
- 前端逐步迁移到新订阅 API

### 6.2 渐进式迁移

1. 先实现新事件总线，与现有系统并行
2. 新功能使用新事件格式
3. 逐步迁移现有 Spirit 事件
4. 最终统一到新架构

## 7. 监控与可观测性

### 7.1 指标

- 连接数量 (`ws_connections_total`)
- 事件发布速率 (`events_published_total`)
- 事件消费延迟 (`event_consume_latency_seconds`)
- 订阅频道数量 (`subscriptions_active`)

### 7.2 日志

- 连接建立/断开
- 订阅/取消订阅
- 事件发布失败
- 认证失败

## 8. 安全考虑

### 8.1 认证

- WebSocket 连接必须携带 JWT
- Token 过期自动断开连接
- 支持 Token 刷新机制

### 8.2 授权

- 用户只能订阅自己的私有事件
- 公共市场数据无需授权
- 管理员可订阅所有事件

### 8.3 限流

- 每用户连接数限制 (默认 5)
- 每连接订阅频道限制 (默认 50)
- 事件推送速率限制 (默认 100/s)

---

**文档版本**: 1.0
**创建日期**: 2025-12-28
**状态**: 设计中
