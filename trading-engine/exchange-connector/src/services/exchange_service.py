"""交易所服务"""
import logging
from typing import Any, Dict, List, Optional
from datetime import datetime
import redis.asyncio as redis
import json
from cryptography.fernet import Fernet

from ..config import settings
from ..connectors.factory import ConnectorFactory
from ..connectors.base import BaseConnector
from ..models.schemas import (
    ExchangeCredentials,
    ExchangeConnection,
    Market,
    Ticker,
    OrderBook,
    Trade,
    OHLCV,
    Balance,
    Position,
    Order,
    OrderRequest,
)

logger = logging.getLogger(__name__)


class ExchangeService:
    """交易所服务"""

    def __init__(self):
        """初始化服务"""
        self.redis_client: Optional[redis.Redis] = None
        self.cipher: Optional[Fernet] = None

        # 初始化加密
        if settings.encryption_key:
            self.cipher = Fernet(settings.encryption_key.encode())

    async def initialize(self) -> None:
        """初始化服务"""
        # 连接 Redis
        self.redis_client = redis.Redis(
            host=settings.redis_host,
            port=settings.redis_port,
            db=settings.redis_db,
            password=settings.redis_password,
            decode_responses=False,
        )

        logger.info("交易所服务已初始化")

    async def cleanup(self) -> None:
        """清理资源"""
        # 断开所有连接
        await ConnectorFactory.disconnect_all()

        # 关闭 Redis
        if self.redis_client:
            await self.redis_client.close()

        logger.info("交易所服务已清理")

    # ==================== 连接管理 ====================

    async def connect_exchange(
        self,
        exchange_id: str,
        credentials: ExchangeCredentials,
    ) -> ExchangeConnection:
        """
        连接到交易所

        Args:
            exchange_id: 交易所ID
            credentials: API凭证

        Returns:
            连接信息
        """
        try:
            # 创建连接器
            connector = ConnectorFactory.create_connector(
                exchange_id=exchange_id,
                api_key=credentials.api_key,
                api_secret=credentials.api_secret,
                password=credentials.password or "",
                testnet=credentials.testnet,
            )

            # 连接
            await connector.connect()

            # 保存凭证到 Redis（加密）
            await self._save_credentials(exchange_id, credentials)

            return ExchangeConnection(
                exchange_id=exchange_id,
                connected=connector.connected,
                testnet=credentials.testnet,
                last_ping=connector.last_ping,
            )

        except Exception as e:
            logger.error(f"连接到 {exchange_id} 失败: {e}")
            raise

    async def disconnect_exchange(self, exchange_id: str) -> None:
        """
        断开交易所连接

        Args:
            exchange_id: 交易所ID
        """
        # 从 Redis 删除凭证
        await self._delete_credentials(exchange_id)

        logger.info(f"已断开 {exchange_id} 连接")

    async def get_connector(self, exchange_id: str) -> BaseConnector:
        """
        获取连接器

        Args:
            exchange_id: 交易所ID

        Returns:
            连接器实例

        Raises:
            ValueError: 交易所未连接
        """
        # 从 Redis 加载凭证
        credentials = await self._load_credentials(exchange_id)
        if not credentials:
            raise ValueError(f"交易所 {exchange_id} 未连接或凭证不存在")

        # 获取连接器
        connector = ConnectorFactory.create_connector(
            exchange_id=exchange_id,
            api_key=credentials.api_key,
            api_secret=credentials.api_secret,
            password=credentials.password or "",
            testnet=credentials.testnet,
        )

        # 检查连接
        if not connector.connected:
            await connector.connect()

        return connector

    # ==================== 市场数据 ====================

    async def fetch_markets(self, exchange_id: str) -> List[Market]:
        """获取市场列表"""
        connector = await self.get_connector(exchange_id)

        # 尝试从缓存获取
        cache_key = f"markets:{exchange_id}"
        cached = await self._get_cache(cache_key)
        if cached:
            return [Market(**m) for m in json.loads(cached)]

        # 从交易所获取
        markets = await connector.fetch_markets()

        # 缓存
        await self._set_cache(
            cache_key,
            json.dumps([m.model_dump() for m in markets]),
            ttl=settings.market_cache_ttl,
        )

        return markets

    async def fetch_ticker(self, exchange_id: str, symbol: str) -> Ticker:
        """获取行情"""
        connector = await self.get_connector(exchange_id)

        # 尝试从缓存获取
        cache_key = f"ticker:{exchange_id}:{symbol}"
        cached = await self._get_cache(cache_key)
        if cached:
            return Ticker(**json.loads(cached))

        # 从交易所获取
        ticker = await connector.fetch_ticker(symbol)

        # 缓存
        await self._set_cache(
            cache_key,
            json.dumps(ticker.model_dump()),
            ttl=settings.ticker_cache_ttl,
        )

        return ticker

    async def fetch_order_book(
        self,
        exchange_id: str,
        symbol: str,
        limit: Optional[int] = None
    ) -> OrderBook:
        """获取订单簿"""
        connector = await self.get_connector(exchange_id)

        # 尝试从缓存获取
        cache_key = f"orderbook:{exchange_id}:{symbol}:{limit or 'full'}"
        cached = await self._get_cache(cache_key)
        if cached:
            return OrderBook(**json.loads(cached))

        # 从交易所获取
        orderbook = await connector.fetch_order_book(symbol, limit)

        # 缓存
        await self._set_cache(
            cache_key,
            json.dumps(orderbook.model_dump()),
            ttl=settings.orderbook_cache_ttl,
        )

        return orderbook

    async def fetch_trades(
        self,
        exchange_id: str,
        symbol: str,
        since: Optional[int] = None,
        limit: Optional[int] = None
    ) -> List[Trade]:
        """获取成交记录"""
        connector = await self.get_connector(exchange_id)
        return await connector.fetch_trades(symbol, since, limit)

    async def fetch_ohlcv(
        self,
        exchange_id: str,
        symbol: str,
        timeframe: str = "1m",
        since: Optional[int] = None,
        limit: Optional[int] = None
    ) -> List[OHLCV]:
        """获取K线数据"""
        connector = await self.get_connector(exchange_id)
        return await connector.fetch_ohlcv(symbol, timeframe, since, limit)

    # ==================== 账户管理 ====================

    async def fetch_balance(self, exchange_id: str) -> List[Balance]:
        """获取账户余额"""
        connector = await self.get_connector(exchange_id)
        return await connector.fetch_balance()

    async def fetch_positions(
        self,
        exchange_id: str,
        symbols: Optional[List[str]] = None
    ) -> List[Position]:
        """获取持仓"""
        connector = await self.get_connector(exchange_id)
        return await connector.fetch_positions(symbols)

    # ==================== 订单管理 ====================

    async def create_order(
        self,
        exchange_id: str,
        order_request: OrderRequest
    ) -> Order:
        """创建订单"""
        connector = await self.get_connector(exchange_id)
        return await connector.create_order(order_request)

    async def cancel_order(
        self,
        exchange_id: str,
        order_id: str,
        symbol: str
    ) -> Order:
        """取消订单"""
        connector = await self.get_connector(exchange_id)
        return await connector.cancel_order(order_id, symbol)

    async def fetch_order(
        self,
        exchange_id: str,
        order_id: str,
        symbol: str
    ) -> Order:
        """查询订单"""
        connector = await self.get_connector(exchange_id)
        return await connector.fetch_order(order_id, symbol)

    async def fetch_open_orders(
        self,
        exchange_id: str,
        symbol: Optional[str] = None
    ) -> List[Order]:
        """查询未完成订单"""
        connector = await self.get_connector(exchange_id)
        return await connector.fetch_open_orders(symbol)

    async def fetch_closed_orders(
        self,
        exchange_id: str,
        symbol: Optional[str] = None,
        since: Optional[int] = None,
        limit: Optional[int] = None
    ) -> List[Order]:
        """查询已完成订单"""
        connector = await self.get_connector(exchange_id)
        return await connector.fetch_closed_orders(symbol, since, limit)

    # ==================== 缓存管理 ====================

    async def _get_cache(self, key: str) -> Optional[str]:
        """获取缓存"""
        if not self.redis_client:
            return None

        try:
            value = await self.redis_client.get(key)
            return value.decode() if value else None
        except Exception as e:
            logger.error(f"获取缓存失败: {e}")
            return None

    async def _set_cache(self, key: str, value: str, ttl: int) -> None:
        """设置缓存"""
        if not self.redis_client:
            return

        try:
            await self.redis_client.setex(key, ttl, value)
        except Exception as e:
            logger.error(f"设置缓存失败: {e}")

    async def _delete_cache(self, pattern: str) -> None:
        """删除缓存"""
        if not self.redis_client:
            return

        try:
            cursor = 0
            while True:
                cursor, keys = await self.redis_client.scan(cursor, match=pattern)
                if keys:
                    await self.redis_client.delete(*keys)
                if cursor == 0:
                    break
        except Exception as e:
            logger.error(f"删除缓存失败: {e}")

    # ==================== 凭证管理 ====================

    async def _save_credentials(
        self,
        exchange_id: str,
        credentials: ExchangeCredentials
    ) -> None:
        """保存凭证到 Redis"""
        if not self.redis_client:
            return

        try:
            key = f"credentials:{exchange_id}"

            # 加密敏感信息
            data = credentials.model_dump()
            if self.cipher:
                data['api_key'] = self.cipher.encrypt(data['api_key'].encode()).decode()
                data['api_secret'] = self.cipher.encrypt(data['api_secret'].encode()).decode()
                if data.get('password'):
                    data['password'] = self.cipher.encrypt(data['password'].encode()).decode()

            await self.redis_client.set(key, json.dumps(data))
            logger.info(f"已保存 {exchange_id} 凭证")

        except Exception as e:
            logger.error(f"保存凭证失败: {e}")
            raise

    async def _load_credentials(self, exchange_id: str) -> Optional[ExchangeCredentials]:
        """从 Redis 加载凭证"""
        if not self.redis_client:
            return None

        try:
            key = f"credentials:{exchange_id}"
            value = await self.redis_client.get(key)

            if not value:
                return None

            data = json.loads(value.decode())

            # 解密敏感信息
            if self.cipher:
                data['api_key'] = self.cipher.decrypt(data['api_key'].encode()).decode()
                data['api_secret'] = self.cipher.decrypt(data['api_secret'].encode()).decode()
                if data.get('password'):
                    data['password'] = self.cipher.decrypt(data['password'].encode()).decode()

            return ExchangeCredentials(**data)

        except Exception as e:
            logger.error(f"加载凭证失败: {e}")
            return None

    async def _delete_credentials(self, exchange_id: str) -> None:
        """删除凭证"""
        if not self.redis_client:
            return

        try:
            key = f"credentials:{exchange_id}"
            await self.redis_client.delete(key)
            logger.info(f"已删除 {exchange_id} 凭证")

        except Exception as e:
            logger.error(f"删除凭证失败: {e}")


# 全局单例
_exchange_service: Optional[ExchangeService] = None


def get_exchange_service() -> ExchangeService:
    """获取交易所服务单例"""
    global _exchange_service
    if _exchange_service is None:
        _exchange_service = ExchangeService()
    return _exchange_service
