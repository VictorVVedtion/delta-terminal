"""
数据服务 - 管理所有采集器
"""
import logging
import uuid
from datetime import datetime
from typing import Dict, List, Optional

from src.collectors.ticker_collector import TickerCollector
from src.collectors.orderbook_collector import OrderBookCollector
from src.collectors.trade_collector import TradeCollector
from src.collectors.kline_collector import KlineCollector
from src.models.schemas import (
    SubscriptionRequest,
    SubscriptionResponse,
    DataQueryRequest,
    TickerResponse,
    OrderBookResponse,
    TradeResponse,
    KlineResponse,
)
from src.storage.redis_cache import redis_cache
from src.storage.timescale import timescale_storage

logger = logging.getLogger(__name__)


class DataService:
    """数据服务管理器"""

    def __init__(self) -> None:
        self.collectors: Dict[str, Dict[str, any]] = {}
        self.subscriptions: Dict[str, SubscriptionResponse] = {}

    async def initialize(self) -> None:
        """初始化服务"""
        try:
            # 连接存储
            await redis_cache.connect()
            await timescale_storage.connect()

            logger.info("数据服务初始化成功")

        except Exception as e:
            logger.error(f"数据服务初始化失败: {e}")
            raise

    async def shutdown(self) -> None:
        """关闭服务"""
        # 停止所有采集器
        for exchange_collectors in self.collectors.values():
            for collector in exchange_collectors.values():
                try:
                    await collector.shutdown()
                except Exception as e:
                    logger.error(f"关闭采集器失败: {e}")

        # 关闭存储连接
        await redis_cache.disconnect()
        await timescale_storage.disconnect()

        logger.info("数据服务已关闭")

    async def create_subscription(
        self, request: SubscriptionRequest
    ) -> SubscriptionResponse:
        """创建数据订阅"""
        subscription_id = str(uuid.uuid4())

        try:
            # 初始化交易所的采集器字典
            exchange = request.exchange.value
            if exchange not in self.collectors:
                self.collectors[exchange] = {}

            # 根据数据类型启动采集器
            for data_type in request.data_types:
                await self._start_collector(
                    exchange, data_type, request.symbols, request.intervals
                )

            # 创建订阅响应
            subscription = SubscriptionResponse(
                subscription_id=subscription_id,
                exchange=exchange,
                symbols=request.symbols,
                data_types=request.data_types,
                status="active",
                created_at=datetime.utcnow(),
            )

            self.subscriptions[subscription_id] = subscription

            # 保存到 Redis
            await redis_cache.set_subscription(
                subscription_id, subscription.model_dump()
            )

            logger.info(f"创建订阅成功: {subscription_id}")
            return subscription

        except Exception as e:
            logger.error(f"创建订阅失败: {e}")
            raise

    async def _start_collector(
        self,
        exchange: str,
        data_type: str,
        symbols: List[str],
        intervals: List[str] | None = None,
    ) -> None:
        """启动采集器"""
        collector_key = f"{exchange}_{data_type}"

        # 如果采集器已存在，跳过
        if collector_key in self.collectors.get(exchange, {}):
            logger.info(f"采集器已存在: {collector_key}")
            return

        try:
            # 创建采集器
            if data_type == "ticker":
                collector = TickerCollector(exchange)
            elif data_type == "orderbook":
                collector = OrderBookCollector(exchange)
            elif data_type == "trade":
                collector = TradeCollector(exchange)
            elif data_type == "kline":
                collector = KlineCollector(exchange)
            else:
                raise ValueError(f"不支持的数据类型: {data_type}")

            # 初始化并启动
            await collector.initialize()

            if data_type == "kline":
                await collector.start(symbols, intervals)
            else:
                await collector.start(symbols)

            # 确保 exchange 字典存在
            if exchange not in self.collectors:
                self.collectors[exchange] = {}
            self.collectors[exchange][collector_key] = collector
            logger.info(f"启动采集器成功: {collector_key}")

        except Exception as e:
            logger.error(f"启动采集器失败: {e}")
            raise

    async def cancel_subscription(self, subscription_id: str) -> None:
        """取消订阅"""
        if subscription_id not in self.subscriptions:
            raise ValueError(f"订阅不存在: {subscription_id}")

        subscription = self.subscriptions[subscription_id]

        # TODO: 停止相关采集器（需要引用计数）

        # 删除订阅
        del self.subscriptions[subscription_id]
        await redis_cache.delete_subscription(subscription_id)

        logger.info(f"取消订阅成功: {subscription_id}")

    async def get_subscription(
        self, subscription_id: str
    ) -> Optional[SubscriptionResponse]:
        """获取订阅信息"""
        if subscription_id in self.subscriptions:
            return self.subscriptions[subscription_id]

        # 从 Redis 获取
        data = await redis_cache.get_subscription(subscription_id)
        if data:
            return SubscriptionResponse(**data)

        return None

    async def query_ticker_data(
        self, request: DataQueryRequest
    ) -> TickerResponse:
        """查询 Ticker 数据"""
        exchange = request.exchange.value
        symbol = request.symbol

        # 先从缓存获取最新数据
        if not request.start_time and not request.end_time:
            cached_ticker = await redis_cache.get_ticker(exchange, symbol)
            if cached_ticker:
                return TickerResponse(
                    data=[cached_ticker],
                    total=1,
                    exchange=exchange,
                    symbol=symbol,
                )

        # 从数据库查询历史数据
        tickers = await timescale_storage.query_tickers(
            exchange=exchange,
            symbol=symbol,
            start_time=request.start_time,
            end_time=request.end_time,
            limit=request.limit,
        )

        return TickerResponse(
            data=tickers,
            total=len(tickers),
            exchange=exchange,
            symbol=symbol,
        )

    async def query_orderbook_data(
        self, request: DataQueryRequest
    ) -> OrderBookResponse:
        """查询订单簿数据"""
        exchange = request.exchange.value
        symbol = request.symbol

        # 订单簿只从缓存获取（实时数据）
        orderbook = await redis_cache.get_orderbook(exchange, symbol)

        if not orderbook:
            raise ValueError(f"订单簿数据不存在: {exchange} {symbol}")

        return OrderBookResponse(
            data=orderbook,
            exchange=exchange,
            symbol=symbol,
        )

    async def query_trade_data(self, request: DataQueryRequest) -> TradeResponse:
        """查询成交数据"""
        trades = await timescale_storage.query_trades(
            exchange=request.exchange.value,
            symbol=request.symbol,
            start_time=request.start_time,
            end_time=request.end_time,
            limit=request.limit,
        )

        return TradeResponse(
            data=trades,
            total=len(trades),
            exchange=request.exchange.value,
            symbol=request.symbol,
        )

    async def query_kline_data(self, request: DataQueryRequest) -> KlineResponse:
        """查询K线数据"""
        if not request.interval:
            raise ValueError("查询K线数据需要指定 interval")

        klines = await timescale_storage.query_klines(
            exchange=request.exchange.value,
            symbol=request.symbol,
            interval=request.interval.value,
            start_time=request.start_time,
            end_time=request.end_time,
            limit=request.limit,
        )

        return KlineResponse(
            data=klines,
            total=len(klines),
            exchange=request.exchange.value,
            symbol=request.symbol,
            interval=request.interval.value,
        )


# 全局实例
data_service = DataService()
