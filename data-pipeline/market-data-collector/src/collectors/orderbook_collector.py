"""
订单簿数据采集器
"""
import logging
from datetime import datetime
from decimal import Decimal
from typing import List, Dict, Any

from src.collectors.base import WebSocketCollector
from src.models.schemas import OrderBookData, OrderBookLevel
from src.storage.redis_cache import redis_cache
from src.config import settings

logger = logging.getLogger(__name__)


class OrderBookCollector(WebSocketCollector):
    """订单簿数据采集器"""

    def __init__(self, exchange_name: str):
        super().__init__(exchange_name)

    async def start(self, symbols: List[str]) -> None:
        """启动订单簿采集"""
        self.is_running = True
        logger.info(f"启动 {self.exchange_name} 订单簿采集，交易对: {symbols}")

        try:
            # 使用 CCXT 的 watch 方法（WebSocket）
            if hasattr(self.exchange, "watch_order_book"):
                for symbol in symbols:
                    if self._validate_symbol(symbol):
                        await self._watch_orderbook(symbol)
            else:
                # 降级为轮询模式
                logger.warning(f"{self.exchange_name} 不支持 WebSocket，使用轮询模式")
                await self._poll_orderbooks(symbols)

        except Exception as e:
            await self._handle_error(e, "启动订单簿采集")

    async def _watch_orderbook(self, symbol: str) -> None:
        """WebSocket 监听订单簿"""
        try:
            while self.is_running:
                orderbook = await self.exchange.watch_order_book(
                    symbol, limit=settings.orderbook_depth
                )
                await self._process_orderbook(symbol, orderbook)

        except Exception as e:
            await self._handle_error(e, f"WebSocket 订单簿监听 {symbol}")

    async def _poll_orderbooks(self, symbols: List[str]) -> None:
        """轮询获取订单簿"""
        import asyncio

        while self.is_running:
            try:
                for symbol in symbols:
                    if not self._validate_symbol(symbol):
                        continue

                    orderbook = await self.exchange.fetch_order_book(
                        symbol, limit=settings.orderbook_depth
                    )
                    await self._process_orderbook(symbol, orderbook)

                # 等待下一次轮询
                await asyncio.sleep(settings.orderbook_update_interval)

            except Exception as e:
                await self._handle_error(e, "轮询订单簿")
                await asyncio.sleep(5)

    async def _process_orderbook(
        self, symbol: str, raw_orderbook: Dict[str, Any]
    ) -> None:
        """处理订单簿数据"""
        try:
            orderbook_data = self._parse_orderbook(symbol, raw_orderbook)

            # 缓存到 Redis
            await redis_cache.set_orderbook(orderbook_data)

            # 发布更新
            await redis_cache.publish_orderbook_update(orderbook_data)

        except Exception as e:
            logger.error(f"处理订单簿数据失败: {e}")

    def _parse_orderbook(
        self, symbol: str, raw_orderbook: Dict[str, Any]
    ) -> OrderBookData:
        """解析订单簿数据"""
        timestamp = raw_orderbook.get("timestamp")
        if timestamp:
            dt = datetime.fromtimestamp(timestamp / 1000)
        else:
            dt = datetime.utcnow()

        # 解析买单
        bids = [
            OrderBookLevel(
                price=Decimal(str(bid[0])), quantity=Decimal(str(bid[1]))
            )
            for bid in raw_orderbook.get("bids", [])
        ]

        # 解析卖单
        asks = [
            OrderBookLevel(
                price=Decimal(str(ask[0])), quantity=Decimal(str(ask[1]))
            )
            for ask in raw_orderbook.get("asks", [])
        ]

        return OrderBookData(
            exchange=self.exchange_name,
            symbol=symbol,
            timestamp=dt,
            bids=bids,
            asks=asks,
            checksum=raw_orderbook.get("nonce"),
        )

    async def stop(self) -> None:
        """停止采集"""
        self.is_running = False
        logger.info(f"{self.exchange_name} 订单簿采集已停止")
