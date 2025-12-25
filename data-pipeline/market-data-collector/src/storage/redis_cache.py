"""
Redis 缓存管理
"""
import json
import logging
from typing import Any, List, Optional
from datetime import datetime, timedelta

import redis.asyncio as redis
from redis.asyncio import Redis

from src.config import settings
from src.models.schemas import TickerData, OrderBookData

logger = logging.getLogger(__name__)


class RedisCache:
    """Redis 缓存管理器"""

    def __init__(self) -> None:
        self.client: Redis | None = None

    async def connect(self) -> None:
        """连接 Redis"""
        try:
            self.client = await redis.from_url(
                settings.redis_url,
                encoding="utf-8",
                decode_responses=True,
            )
            await self.client.ping()
            logger.info("Redis 连接成功")
        except Exception as e:
            logger.error(f"Redis 连接失败: {e}")
            raise

    async def disconnect(self) -> None:
        """断开 Redis 连接"""
        if self.client:
            await self.client.close()
            logger.info("Redis 连接已关闭")

    def _ticker_key(self, exchange: str, symbol: str) -> str:
        """生成 Ticker 缓存键"""
        return f"ticker:{exchange}:{symbol}"

    def _orderbook_key(self, exchange: str, symbol: str) -> str:
        """生成订单簿缓存键"""
        return f"orderbook:{exchange}:{symbol}"

    def _subscription_key(self, subscription_id: str) -> str:
        """生成订阅缓存键"""
        return f"subscription:{subscription_id}"

    async def set_ticker(self, ticker: TickerData, ttl: int | None = None) -> None:
        """缓存 Ticker 数据"""
        if not self.client:
            raise RuntimeError("Redis not connected")

        key = self._ticker_key(ticker.exchange, ticker.symbol)
        value = ticker.model_dump_json()

        ttl = ttl or settings.redis_ttl
        await self.client.setex(key, ttl, value)

    async def get_ticker(self, exchange: str, symbol: str) -> Optional[TickerData]:
        """获取缓存的 Ticker 数据"""
        if not self.client:
            raise RuntimeError("Redis not connected")

        key = self._ticker_key(exchange, symbol)
        value = await self.client.get(key)

        if value:
            return TickerData.model_validate_json(value)
        return None

    async def set_orderbook(
        self, orderbook: OrderBookData, ttl: int | None = None
    ) -> None:
        """缓存订单簿数据"""
        if not self.client:
            raise RuntimeError("Redis not connected")

        key = self._orderbook_key(orderbook.exchange, orderbook.symbol)
        value = orderbook.model_dump_json()

        ttl = ttl or settings.redis_ttl
        await self.client.setex(key, ttl, value)

    async def get_orderbook(
        self, exchange: str, symbol: str
    ) -> Optional[OrderBookData]:
        """获取缓存的订单簿数据"""
        if not self.client:
            raise RuntimeError("Redis not connected")

        key = self._orderbook_key(exchange, symbol)
        value = await self.client.get(key)

        if value:
            return OrderBookData.model_validate_json(value)
        return None

    async def set_subscription(
        self, subscription_id: str, data: dict[str, Any], ttl: int = 86400
    ) -> None:
        """保存订阅信息"""
        if not self.client:
            raise RuntimeError("Redis not connected")

        key = self._subscription_key(subscription_id)
        value = json.dumps(data)
        await self.client.setex(key, ttl, value)

    async def get_subscription(self, subscription_id: str) -> Optional[dict[str, Any]]:
        """获取订阅信息"""
        if not self.client:
            raise RuntimeError("Redis not connected")

        key = self._subscription_key(subscription_id)
        value = await self.client.get(key)

        if value:
            return json.loads(value)
        return None

    async def delete_subscription(self, subscription_id: str) -> None:
        """删除订阅信息"""
        if not self.client:
            raise RuntimeError("Redis not connected")

        key = self._subscription_key(subscription_id)
        await self.client.delete(key)

    async def get_all_tickers(self, exchange: str) -> List[TickerData]:
        """获取所有缓存的 Ticker"""
        if not self.client:
            raise RuntimeError("Redis not connected")

        pattern = f"ticker:{exchange}:*"
        tickers: List[TickerData] = []

        async for key in self.client.scan_iter(match=pattern):
            value = await self.client.get(key)
            if value:
                tickers.append(TickerData.model_validate_json(value))

        return tickers

    async def publish_ticker_update(self, ticker: TickerData) -> None:
        """发布 Ticker 更新"""
        if not self.client:
            raise RuntimeError("Redis not connected")

        channel = f"ticker_updates:{ticker.exchange}:{ticker.symbol}"
        message = ticker.model_dump_json()
        await self.client.publish(channel, message)

    async def publish_orderbook_update(self, orderbook: OrderBookData) -> None:
        """发布订单簿更新"""
        if not self.client:
            raise RuntimeError("Redis not connected")

        channel = f"orderbook_updates:{orderbook.exchange}:{orderbook.symbol}"
        message = orderbook.model_dump_json()
        await self.client.publish(channel, message)

    async def subscribe_to_updates(
        self, exchange: str, symbol: str, data_type: str
    ) -> Any:
        """订阅数据更新"""
        if not self.client:
            raise RuntimeError("Redis not connected")

        pubsub = self.client.pubsub()
        channel = f"{data_type}_updates:{exchange}:{symbol}"
        await pubsub.subscribe(channel)
        return pubsub

    async def set_rate_limit(
        self, key: str, limit: int, window: int
    ) -> bool:
        """设置速率限制"""
        if not self.client:
            raise RuntimeError("Redis not connected")

        current = await self.client.get(key)
        if current and int(current) >= limit:
            return False

        pipe = self.client.pipeline()
        pipe.incr(key)
        pipe.expire(key, window)
        await pipe.execute()
        return True

    async def clear_cache(self, pattern: str = "*") -> int:
        """清除缓存"""
        if not self.client:
            raise RuntimeError("Redis not connected")

        count = 0
        async for key in self.client.scan_iter(match=pattern):
            await self.client.delete(key)
            count += 1

        logger.info(f"清除了 {count} 个缓存键")
        return count

    async def health_check(self) -> bool:
        """健康检查"""
        if not self.client:
            return False

        try:
            await self.client.ping()
            return True
        except Exception as e:
            logger.error(f"Redis 健康检查失败: {e}")
            return False


# 全局实例
redis_cache = RedisCache()
