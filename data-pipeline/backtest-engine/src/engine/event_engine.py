"""事件驱动引擎 - 回测系统核心"""
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from queue import PriorityQueue, Empty
from typing import Any, Callable, Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


class EventType(Enum):
    """事件类型枚举"""
    MARKET = "market"
    SIGNAL = "signal"
    ORDER = "order"
    FILL = "fill"
    PORTFOLIO = "portfolio"


@dataclass(order=True)
class Event:
    """事件基类 - 支持优先级队列"""
    timestamp: datetime
    event_type: EventType
    data: Any = None

    def __lt__(self, other: "Event") -> bool:
        """按时间戳排序"""
        return self.timestamp < other.timestamp


class MarketEvent(Event):
    """市场数据事件"""
    def __init__(self, timestamp: datetime, market_data: Dict[str, Any]):
        super().__init__(
            timestamp=timestamp,
            event_type=EventType.MARKET,
            data=market_data
        )


class SignalEvent(Event):
    """交易信号事件"""
    def __init__(
        self,
        timestamp: datetime,
        symbol: str,
        signal_type: str,
        strength: float = 1.0,
        metadata: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            timestamp=timestamp,
            event_type=EventType.SIGNAL,
            data={
                "symbol": symbol,
                "signal_type": signal_type,
                "strength": strength,
                "metadata": metadata or {}
            }
        )


class OrderEvent(Event):
    """订单事件"""
    def __init__(
        self,
        timestamp: datetime,
        symbol: str,
        order_type: str,
        side: str,
        quantity: float,
        price: Optional[float] = None
    ):
        super().__init__(
            timestamp=timestamp,
            event_type=EventType.ORDER,
            data={
                "symbol": symbol,
                "order_type": order_type,
                "side": side,
                "quantity": quantity,
                "price": price
            }
        )


class FillEvent(Event):
    """成交事件"""
    def __init__(
        self,
        timestamp: datetime,
        symbol: str,
        side: str,
        quantity: float,
        price: float,
        commission: float,
        slippage: float
    ):
        super().__init__(
            timestamp=timestamp,
            event_type=EventType.FILL,
            data={
                "symbol": symbol,
                "side": side,
                "quantity": quantity,
                "price": price,
                "commission": commission,
                "slippage": slippage
            }
        )


class EventEngine:
    """
    事件驱动引擎

    核心功能:
    1. 事件队列管理 (优先级队列,按时间排序)
    2. 事件处理器注册与调度
    3. 事件循环执行
    """

    def __init__(self):
        self.event_queue: PriorityQueue = PriorityQueue()
        self.handlers: Dict[EventType, List[Callable]] = {
            event_type: [] for event_type in EventType
        }
        self.is_running = False
        self._event_count = 0

    def register_handler(self, event_type: EventType, handler: Callable) -> None:
        """
        注册事件处理器

        Args:
            event_type: 事件类型
            handler: 处理函数 handler(event: Event) -> None
        """
        if handler not in self.handlers[event_type]:
            self.handlers[event_type].append(handler)
            logger.debug(f"注册处理器: {event_type.value} -> {handler.__name__}")

    def unregister_handler(self, event_type: EventType, handler: Callable) -> None:
        """取消注册事件处理器"""
        if handler in self.handlers[event_type]:
            self.handlers[event_type].remove(handler)
            logger.debug(f"取消注册: {event_type.value} -> {handler.__name__}")

    def put_event(self, event: Event) -> None:
        """添加事件到队列"""
        self.event_queue.put(event)
        self._event_count += 1

    def process_event(self, event: Event) -> None:
        """
        处理单个事件

        调用所有注册的处理器
        """
        handlers = self.handlers.get(event.event_type, [])
        for handler in handlers:
            try:
                handler(event)
            except Exception as e:
                logger.error(
                    f"事件处理失败: {event.event_type.value} "
                    f"| Handler: {handler.__name__} "
                    f"| Error: {str(e)}",
                    exc_info=True
                )

    def run(self, max_events: Optional[int] = None) -> None:
        """
        启动事件循环

        Args:
            max_events: 最大处理事件数 (None表示处理所有事件)
        """
        self.is_running = True
        processed = 0

        logger.info(f"事件引擎启动 | 队列大小: {self.event_queue.qsize()}")

        while self.is_running and not self.event_queue.empty():
            if max_events and processed >= max_events:
                logger.info(f"达到最大事件数限制: {max_events}")
                break

            try:
                event = self.event_queue.get(timeout=1)
                self.process_event(event)
                processed += 1

                if processed % 1000 == 0:
                    logger.debug(f"已处理事件: {processed} | 队列剩余: {self.event_queue.qsize()}")

            except Empty:
                logger.debug("事件队列为空")
                break
            except Exception as e:
                logger.error(f"事件循环异常: {str(e)}", exc_info=True)

        self.is_running = False
        logger.info(f"事件引擎停止 | 已处理: {processed} 个事件")

    def stop(self) -> None:
        """停止事件循环"""
        self.is_running = False
        logger.info("事件引擎停止请求")

    def clear(self) -> None:
        """清空事件队列"""
        while not self.event_queue.empty():
            try:
                self.event_queue.get_nowait()
            except Empty:
                break
        self._event_count = 0
        logger.info("事件队列已清空")

    def get_stats(self) -> Dict[str, Any]:
        """获取统计信息"""
        return {
            "total_events": self._event_count,
            "queue_size": self.event_queue.qsize(),
            "is_running": self.is_running,
            "handlers": {
                event_type.value: len(handlers)
                for event_type, handlers in self.handlers.items()
            }
        }
