"""
Ticker 数据采集器
"""
import logging
from datetime import datetime
from decimal import Decimal
from typing import List, Dict, Any

from src.collectors.base import WebSocketCollector
from src.models.schemas import TickerData
from src.storage.redis_cache import redis_cache
from src.storage.timescale import timescale_storage
from src.config import settings

logger = logging.getLogger(__name__)


class TickerCollector(WebSocketCollector):
    """Ticker 数据采集器"""

    def __init__(self, exchange_name: str):
        super().__init__(exchange_name)
        self.batch: List[TickerData] = []

    async def start(self, symbols: List[str]) -> None:
        """启动 Ticker 采集"""
        self.is_running = True
        logger.info(f"启动 {self.exchange_name} Ticker 采集，交易对: {symbols}")

        try:
            # 使用 CCXT 的 watch 方法（WebSocket）
            if hasattr(self.exchange, "watch_ticker"):
                for symbol in symbols:
                    if self._validate_symbol(symbol):
                        await self._watch_ticker(symbol)
            else:
                # 降级为轮询模式
                logger.warning(f"{self.exchange_name} 不支持 WebSocket，使用轮询模式")
                await self._poll_tickers(symbols)

        except Exception as e:
            await self._handle_error(e, "启动 Ticker 采集")

    async def _watch_ticker(self, symbol: str) -> None:
        """WebSocket 监听 Ticker"""
        try:
            while self.is_running:
                ticker = await self.exchange.watch_ticker(symbol)
                await self._process_ticker(symbol, ticker)

        except Exception as e:
            await self._handle_error(e, f"WebSocket Ticker 监听 {symbol}")

    async def _poll_tickers(self, symbols: List[str]) -> None:
        """轮询获取 Ticker"""
        import asyncio

        while self.is_running:
            try:
                for symbol in symbols:
                    if not self._validate_symbol(symbol):
                        continue

                    ticker = await self.exchange.fetch_ticker(symbol)
                    await self._process_ticker(symbol, ticker)

                # 等待下一次轮询
                await asyncio.sleep(settings.ticker_update_interval)

            except Exception as e:
                await self._handle_error(e, "轮询 Ticker")
                await asyncio.sleep(5)

    async def _process_ticker(self, symbol: str, raw_ticker: Dict[str, Any]) -> None:
        """处理 Ticker 数据"""
        try:
            ticker_data = self._parse_ticker(symbol, raw_ticker)

            # 缓存到 Redis
            await redis_cache.set_ticker(ticker_data)

            # 发布更新
            await redis_cache.publish_ticker_update(ticker_data)

            # 批量写入数据库
            self.batch.append(ticker_data)
            if len(self.batch) >= settings.ticker_batch_size:
                await self._flush_batch()

        except Exception as e:
            logger.error(f"处理 Ticker 数据失败: {e}")

    def _parse_ticker(self, symbol: str, raw_ticker: Dict[str, Any]) -> TickerData:
        """解析 Ticker 数据"""
        timestamp = raw_ticker.get("timestamp")
        if timestamp:
            dt = datetime.fromtimestamp(timestamp / 1000)
        else:
            dt = datetime.utcnow()

        return TickerData(
            exchange=self.exchange_name,
            symbol=symbol,
            timestamp=dt,
            last_price=Decimal(str(raw_ticker.get("last", 0))),
            bid_price=Decimal(str(raw_ticker.get("bid", 0)))
            if raw_ticker.get("bid")
            else None,
            ask_price=Decimal(str(raw_ticker.get("ask", 0)))
            if raw_ticker.get("ask")
            else None,
            high_24h=Decimal(str(raw_ticker.get("high", 0)))
            if raw_ticker.get("high")
            else None,
            low_24h=Decimal(str(raw_ticker.get("low", 0)))
            if raw_ticker.get("low")
            else None,
            volume_24h=Decimal(str(raw_ticker.get("baseVolume", 0)))
            if raw_ticker.get("baseVolume")
            else None,
            quote_volume_24h=Decimal(str(raw_ticker.get("quoteVolume", 0)))
            if raw_ticker.get("quoteVolume")
            else None,
            price_change_24h=Decimal(str(raw_ticker.get("change", 0)))
            if raw_ticker.get("change")
            else None,
            price_change_percent_24h=Decimal(str(raw_ticker.get("percentage", 0)))
            if raw_ticker.get("percentage")
            else None,
        )

    async def _flush_batch(self) -> None:
        """刷新批次到数据库"""
        if not self.batch:
            return

        try:
            await timescale_storage.save_tickers_batch(self.batch)
            logger.info(f"保存 {len(self.batch)} 条 Ticker 数据")
            self.batch.clear()

        except Exception as e:
            logger.error(f"批量保存 Ticker 失败: {e}")

    async def stop(self) -> None:
        """停止采集"""
        self.is_running = False

        # 刷新剩余数据
        await self._flush_batch()

        logger.info(f"{self.exchange_name} Ticker 采集已停止")
