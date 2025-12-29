"""
Delta Terminal 统一事件系统 (Python)

跨服务事件标准化定义
- 统一事件信封格式
- 事件类型枚举
- Redis 频道映射
- 事件发布/订阅工具
"""

import uuid
import time
import json
from dataclasses import dataclass, field, asdict
from typing import Any, Callable, Dict, List, Literal, Optional, TypeVar, Generic
from enum import Enum
import asyncio

try:
    import redis.asyncio as aioredis
except ImportError:
    aioredis = None


# =============================================================================
# 事件类型定义
# =============================================================================

class EventPriority(str, Enum):
    """事件优先级"""
    P0 = "p0"  # 紧急 (立即处理，如风险告警)
    P1 = "p1"  # 高优 (重要事件，如订单成交)
    P2 = "p2"  # 普通 (常规事件，如策略更新)
    P3 = "p3"  # 低优 (信息性事件，如日志)


class ServiceName(str, Enum):
    """服务名称"""
    API_GATEWAY = "api-gateway"
    AUTH_SERVICE = "auth-service"
    USER_SERVICE = "user-service"
    STRATEGY_SERVICE = "strategy-service"
    AI_ORCHESTRATOR = "ai-orchestrator"
    NLP_PROCESSOR = "nlp-processor"
    STRATEGY_GENERATOR = "strategy-generator"
    SIGNAL_ANALYZER = "signal-analyzer"
    ORDER_EXECUTOR = "order-executor"
    RISK_MANAGER = "risk-manager"
    EXCHANGE_CONNECTOR = "exchange-connector"
    MARKET_DATA_COLLECTOR = "market-data-collector"
    BACKTEST_ENGINE = "backtest-engine"
    ANALYTICS_SERVICE = "analytics-service"


class EventType(str, Enum):
    """事件类型"""
    # 订单事件
    ORDER_CREATED = "order.created"
    ORDER_SUBMITTED = "order.submitted"
    ORDER_FILLED = "order.filled"
    ORDER_PARTIALLY_FILLED = "order.partially_filled"
    ORDER_CANCELLED = "order.cancelled"
    ORDER_REJECTED = "order.rejected"
    ORDER_FAILED = "order.failed"

    # 风险事件
    RISK_ALERT = "risk.alert"
    RISK_LIMIT_REACHED = "risk.limit_reached"
    RISK_POSITION_WARNING = "risk.position_warning"
    RISK_DRAWDOWN_ALERT = "risk.drawdown_alert"
    RISK_EXPOSURE_EXCEEDED = "risk.exposure_exceeded"

    # AI 事件
    AI_INSIGHT_GENERATED = "ai.insight_generated"
    AI_ANALYSIS_STARTED = "ai.analysis_started"
    AI_ANALYSIS_COMPLETE = "ai.analysis_complete"
    AI_SIGNAL_DETECTED = "ai.signal_detected"
    AI_CLARIFICATION_NEEDED = "ai.clarification_needed"

    # 策略事件
    STRATEGY_CREATED = "strategy.created"
    STRATEGY_UPDATED = "strategy.updated"
    STRATEGY_DELETED = "strategy.deleted"
    STRATEGY_ACTIVATED = "strategy.activated"
    STRATEGY_PAUSED = "strategy.paused"
    STRATEGY_STOPPED = "strategy.stopped"
    STRATEGY_ERROR = "strategy.error"

    # 回测事件
    BACKTEST_STARTED = "backtest.started"
    BACKTEST_PROGRESS = "backtest.progress"
    BACKTEST_COMPLETED = "backtest.completed"
    BACKTEST_FAILED = "backtest.failed"
    BACKTEST_CANCELLED = "backtest.cancelled"

    # 市场数据事件
    MARKET_TICKER = "market.ticker"
    MARKET_ORDERBOOK = "market.orderbook"
    MARKET_TRADES = "market.trades"
    MARKET_KLINE = "market.kline"

    # 余额事件
    BALANCE_UPDATED = "balance.updated"
    BALANCE_DEPOSIT = "balance.deposit"
    BALANCE_WITHDRAWAL = "balance.withdrawal"

    # Spirit 事件
    SPIRIT_STATE_CHANGE = "spirit.state_change"
    SPIRIT_NOTIFICATION = "spirit.notification"
    SPIRIT_THINKING = "spirit.thinking"
    SPIRIT_ACTION = "spirit.action"

    # 系统事件
    SYSTEM_SERVICE_ONLINE = "system.service_online"
    SYSTEM_SERVICE_OFFLINE = "system.service_offline"
    SYSTEM_MAINTENANCE = "system.maintenance"
    SYSTEM_ERROR = "system.error"


# =============================================================================
# 事件信封
# =============================================================================

T = TypeVar('T')


@dataclass
class EventEnvelope(Generic[T]):
    """统一事件信封格式"""
    id: str
    type: str
    source: str
    timestamp: int
    version: str
    payload: T
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    priority: str = "p2"
    ttl: Optional[int] = None
    correlation_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        result = {
            "id": self.id,
            "type": self.type,
            "source": self.source,
            "timestamp": self.timestamp,
            "version": self.version,
            "payload": self.payload if isinstance(self.payload, dict) else asdict(self.payload) if hasattr(self.payload, '__dataclass_fields__') else self.payload,
            "priority": self.priority,
        }
        if self.user_id:
            result["userId"] = self.user_id
        if self.session_id:
            result["sessionId"] = self.session_id
        if self.ttl:
            result["ttl"] = self.ttl
        if self.correlation_id:
            result["correlationId"] = self.correlation_id
        if self.metadata:
            result["metadata"] = self.metadata
        return result

    def to_json(self) -> str:
        """转换为 JSON 字符串"""
        return json.dumps(self.to_dict())

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "EventEnvelope":
        """从字典创建"""
        return cls(
            id=data["id"],
            type=data["type"],
            source=data["source"],
            timestamp=data["timestamp"],
            version=data["version"],
            payload=data["payload"],
            user_id=data.get("userId"),
            session_id=data.get("sessionId"),
            priority=data.get("priority", "p2"),
            ttl=data.get("ttl"),
            correlation_id=data.get("correlationId"),
            metadata=data.get("metadata"),
        )

    @classmethod
    def from_json(cls, json_str: str) -> "EventEnvelope":
        """从 JSON 字符串创建"""
        return cls.from_dict(json.loads(json_str))


# =============================================================================
# 事件负载类型
# =============================================================================

@dataclass
class OrderEventPayload:
    """订单事件负载"""
    order_id: str
    symbol: str
    side: Literal["buy", "sell"]
    type: Literal["market", "limit", "stop", "stop_limit"]
    quantity: float
    status: str
    exchange: str
    price: Optional[float] = None
    filled_quantity: Optional[float] = None
    avg_price: Optional[float] = None
    strategy_id: Optional[str] = None
    error: Optional[str] = None


@dataclass
class RiskAlertPayload:
    """风险告警负载"""
    alert_id: str
    level: Literal["warning", "critical", "emergency"]
    category: Literal["drawdown", "exposure", "volatility", "liquidity", "concentration"]
    message: str
    current_value: float
    threshold: float
    affected_strategies: Optional[List[str]] = None
    suggested_action: Optional[str] = None


@dataclass
class AIInsightPayload:
    """AI 洞察负载"""
    insight_id: str
    insight_type: str
    explanation: str
    confidence: float
    params: List[Dict[str, Any]]
    target: Optional[Dict[str, str]] = None
    expires_at: Optional[int] = None


@dataclass
class BacktestProgressPayload:
    """回测进度负载"""
    backtest_id: str
    strategy_id: str
    progress: float  # 0-100
    current_date: Optional[str] = None
    estimated_time_remaining: Optional[int] = None


@dataclass
class BacktestResultPayload:
    """回测结果负载"""
    backtest_id: str
    strategy_id: str
    start_date: str
    end_date: str
    metrics: Dict[str, float]
    equity: List[Dict[str, Any]]


@dataclass
class SpiritEventPayload:
    """Spirit 事件负载"""
    title: str
    description: str
    spirit_state: str
    priority: str
    metadata: Optional[Dict[str, Any]] = None


# =============================================================================
# Redis 频道映射
# =============================================================================

EVENT_CHANNELS = {
    # 订单事件 - 用户私有
    "order.*": "events:order",
    "order.created": "events:order:created",
    "order.filled": "events:order:filled",
    "order.cancelled": "events:order:cancelled",

    # 风险事件 - 用户私有
    "risk.*": "events:risk",
    "risk.alert": "events:risk:alert",

    # AI 事件 - 用户私有
    "ai.*": "events:ai",
    "ai.insight_generated": "events:ai:insight",
    "ai.signal_detected": "events:ai:signal",

    # 策略事件 - 用户私有
    "strategy.*": "events:strategy",
    "strategy.updated": "events:strategy:updated",

    # 回测事件 - 用户私有
    "backtest.*": "events:backtest",
    "backtest.progress": "events:backtest:progress",
    "backtest.completed": "events:backtest:completed",

    # 市场数据 - 公共
    "market.*": "events:market",
    "market.ticker": "events:market:ticker",
    "market.orderbook": "events:market:orderbook",
    "market.trades": "events:market:trades",

    # Spirit 事件 - 用户私有
    "spirit.*": "events:spirit",
    "spirit.notification": "events:spirit:notification",

    # 系统事件 - 公共
    "system.*": "events:system",
}


def get_event_channel(event_type: str) -> str:
    """获取事件对应的 Redis 频道"""
    # 精确匹配
    if event_type in EVENT_CHANNELS:
        return EVENT_CHANNELS[event_type]

    # 通配符匹配
    namespace = event_type.split(".")[0]
    wildcard_key = f"{namespace}.*"
    if wildcard_key in EVENT_CHANNELS:
        return EVENT_CHANNELS[wildcard_key]

    # 默认频道
    return "events:unknown"


def get_user_channel(base_channel: str, user_id: str) -> str:
    """获取用户特定的频道名"""
    return f"{base_channel}:user:{user_id}"


# =============================================================================
# 事件创建工具
# =============================================================================

def create_event(
    event_type: EventType,
    source: ServiceName,
    payload: Any,
    user_id: Optional[str] = None,
    priority: EventPriority = EventPriority.P2,
    ttl: Optional[int] = None,
    correlation_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> EventEnvelope:
    """创建事件信封"""
    return EventEnvelope(
        id=str(uuid.uuid4()),
        type=event_type.value,
        source=source.value,
        timestamp=int(time.time() * 1000),
        version="1.0",
        payload=payload,
        user_id=user_id,
        priority=priority.value,
        ttl=ttl,
        correlation_id=correlation_id,
        metadata=metadata,
    )


def create_order_event(
    event_type: EventType,
    payload: OrderEventPayload,
    user_id: str,
    source: ServiceName = ServiceName.ORDER_EXECUTOR,
) -> EventEnvelope[OrderEventPayload]:
    """创建订单事件"""
    return create_event(
        event_type=event_type,
        source=source,
        payload=payload,
        user_id=user_id,
        priority=EventPriority.P1,
    )


def create_risk_alert_event(
    payload: RiskAlertPayload,
    user_id: str,
) -> EventEnvelope[RiskAlertPayload]:
    """创建风险告警事件"""
    priority = {
        "emergency": EventPriority.P0,
        "critical": EventPriority.P1,
        "warning": EventPriority.P2,
    }.get(payload.level, EventPriority.P2)

    return create_event(
        event_type=EventType.RISK_ALERT,
        source=ServiceName.RISK_MANAGER,
        payload=payload,
        user_id=user_id,
        priority=priority,
    )


def create_ai_insight_event(
    payload: AIInsightPayload,
    user_id: str,
) -> EventEnvelope[AIInsightPayload]:
    """创建 AI 洞察事件"""
    return create_event(
        event_type=EventType.AI_INSIGHT_GENERATED,
        source=ServiceName.NLP_PROCESSOR,
        payload=payload,
        user_id=user_id,
        priority=EventPriority.P2,
    )


def create_backtest_progress_event(
    payload: BacktestProgressPayload,
    user_id: str,
) -> EventEnvelope[BacktestProgressPayload]:
    """创建回测进度事件"""
    return create_event(
        event_type=EventType.BACKTEST_PROGRESS,
        source=ServiceName.BACKTEST_ENGINE,
        payload=payload,
        user_id=user_id,
        priority=EventPriority.P3,
    )


def create_backtest_result_event(
    payload: BacktestResultPayload,
    user_id: str,
) -> EventEnvelope[BacktestResultPayload]:
    """创建回测完成事件"""
    return create_event(
        event_type=EventType.BACKTEST_COMPLETED,
        source=ServiceName.BACKTEST_ENGINE,
        payload=payload,
        user_id=user_id,
        priority=EventPriority.P1,
    )


# =============================================================================
# 事件验证
# =============================================================================

def validate_event(event: Any) -> bool:
    """验证事件信封格式"""
    if not isinstance(event, dict):
        return False

    required_fields = ["id", "type", "source", "timestamp", "version", "payload"]
    return all(field in event for field in required_fields) and event.get("version") == "1.0"


def is_event_expired(event: EventEnvelope) -> bool:
    """检查事件是否过期"""
    if not event.ttl:
        return False
    return int(time.time() * 1000) > event.timestamp + event.ttl


# =============================================================================
# 事件总线客户端
# =============================================================================

class EventBusClient:
    """事件总线客户端 (Redis Pub/Sub)"""

    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis_url = redis_url
        self._redis: Optional[aioredis.Redis] = None
        self._pubsub: Optional[aioredis.client.PubSub] = None
        self._subscriptions: Dict[str, List[Callable]] = {}
        self._running = False

    async def connect(self):
        """连接到 Redis"""
        if aioredis is None:
            raise ImportError("redis.asyncio is required for EventBusClient")
        self._redis = aioredis.from_url(self.redis_url)
        self._pubsub = self._redis.pubsub()

    async def disconnect(self):
        """断开连接"""
        self._running = False
        if self._pubsub:
            await self._pubsub.close()
        if self._redis:
            await self._redis.close()

    async def publish(self, event: EventEnvelope) -> int:
        """发布事件"""
        if not self._redis:
            raise RuntimeError("EventBusClient not connected")

        channel = get_event_channel(event.type)

        # 如果是用户私有事件，使用用户特定频道
        if event.user_id:
            channel = get_user_channel(channel, event.user_id)

        return await self._redis.publish(channel, event.to_json())

    async def subscribe(
        self,
        channel_pattern: str,
        callback: Callable[[EventEnvelope], None],
    ):
        """订阅频道"""
        if not self._pubsub:
            raise RuntimeError("EventBusClient not connected")

        if channel_pattern not in self._subscriptions:
            self._subscriptions[channel_pattern] = []
            await self._pubsub.psubscribe(channel_pattern)

        self._subscriptions[channel_pattern].append(callback)

    async def unsubscribe(self, channel_pattern: str):
        """取消订阅"""
        if not self._pubsub:
            return

        if channel_pattern in self._subscriptions:
            del self._subscriptions[channel_pattern]
            await self._pubsub.punsubscribe(channel_pattern)

    async def start_listening(self):
        """开始监听消息"""
        if not self._pubsub:
            raise RuntimeError("EventBusClient not connected")

        self._running = True
        async for message in self._pubsub.listen():
            if not self._running:
                break

            if message["type"] == "pmessage":
                pattern = message["pattern"].decode() if isinstance(message["pattern"], bytes) else message["pattern"]
                data = message["data"].decode() if isinstance(message["data"], bytes) else message["data"]

                try:
                    event = EventEnvelope.from_json(data)

                    # 检查是否过期
                    if is_event_expired(event):
                        continue

                    # 调用回调
                    callbacks = self._subscriptions.get(pattern, [])
                    for callback in callbacks:
                        try:
                            if asyncio.iscoroutinefunction(callback):
                                await callback(event)
                            else:
                                callback(event)
                        except Exception as e:
                            print(f"Error in event callback: {e}")
                except Exception as e:
                    print(f"Failed to parse event: {e}")


# =============================================================================
# 便捷单例
# =============================================================================

_event_bus: Optional[EventBusClient] = None


def get_event_bus(redis_url: str = "redis://localhost:6379") -> EventBusClient:
    """获取事件总线单例"""
    global _event_bus
    if _event_bus is None:
        _event_bus = EventBusClient(redis_url)
    return _event_bus
