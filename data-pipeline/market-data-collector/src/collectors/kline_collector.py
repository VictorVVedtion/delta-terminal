"""
K线数据采集器
"""
import logging
from datetime import datetime
from decimal import Decimal
from typing import List, Dict, Any

from src.collectors.base import PollingCollector
from src.models.schemas import KlineData
from src.storage.timescale import timescale_storage
from src.config import settings

logger = logging.getLogger(__name__)


class KlineCollector(PollingCollector):
    """K线数据采集器"""

    def __init__(self, exchange_name: str):
        super().__init__(exchange_name, interval=60)  # 每分钟轮询
        self.batch: List[KlineData] = []

    async def start(self, symbols: List[str], intervals: List[str] | None = None) -> None:
        """启动K线采集"""
        self.is_running = True
        self.intervals = intervals or settings.kline_intervals
        logger.info(
            f"启动 {self.exchange_name} K线采集，交易对: {symbols}，间隔: {self.intervals}"
        )

        import asyncio

        task = asyncio.create_task(self._polling_loop(symbols))
        self._tasks.append(task)

    async def _polling_loop(self, symbols: List[str]) -> None:
        """K线轮询循环"""
        import asyncio

        while self.is_running:
            try:
                for symbol in symbols:
                    if not self._validate_symbol(symbol):
                        continue

                    for interval in self.intervals:
                        await self._fetch_klines(symbol, interval)

                # 等待下一次轮询
                await asyncio.sleep(self.interval)

            except Exception as e:
                await self._handle_error(e, "K线轮询")
                await asyncio.sleep(5)

    async def _fetch_klines(self, symbol: str, interval: str) -> None:
        """获取K线数据"""
        try:
            # CCXT 使用不同的时间间隔格式
            ccxt_interval = self._convert_interval(interval)

            # 获取最近的K线
            ohlcv = await self.exchange.fetch_ohlcv(
                symbol, timeframe=ccxt_interval, limit=settings.kline_batch_size
            )

            await self._process_klines(symbol, interval, ohlcv)

        except Exception as e:
            logger.error(f"获取 {symbol} {interval} K线失败: {e}")

    def _convert_interval(self, interval: str) -> str:
        """转换时间间隔格式"""
        # Delta Terminal 格式 -> CCXT 格式
        interval_map = {
            "1m": "1m",
            "5m": "5m",
            "15m": "15m",
            "30m": "30m",
            "1h": "1h",
            "4h": "4h",
            "1d": "1d",
            "1w": "1w",
        }
        return interval_map.get(interval, interval)

    async def _process_klines(
        self, symbol: str, interval: str, ohlcv_list: List[List[Any]]
    ) -> None:
        """处理K线数据"""
        try:
            for ohlcv in ohlcv_list:
                kline_data = self._parse_kline(symbol, interval, ohlcv)
                self.batch.append(kline_data)

            # 批量写入数据库
            if len(self.batch) >= settings.kline_batch_size:
                await self._flush_batch()

        except Exception as e:
            logger.error(f"处理K线数据失败: {e}")

    def _parse_kline(
        self, symbol: str, interval: str, ohlcv: List[Any]
    ) -> KlineData:
        """
        解析K线数据
        OHLCV格式: [timestamp, open, high, low, close, volume]
        """
        timestamp_ms = ohlcv[0]
        dt = datetime.fromtimestamp(timestamp_ms / 1000)

        return KlineData(
            exchange=self.exchange_name,
            symbol=symbol,
            interval=interval,
            timestamp=dt,
            open_price=Decimal(str(ohlcv[1])),
            high_price=Decimal(str(ohlcv[2])),
            low_price=Decimal(str(ohlcv[3])),
            close_price=Decimal(str(ohlcv[4])),
            volume=Decimal(str(ohlcv[5])),
            quote_volume=None,  # 部分交易所提供
            trades_count=None,  # 部分交易所提供
        )

    async def _flush_batch(self) -> None:
        """刷新批次到数据库"""
        if not self.batch:
            return

        try:
            await timescale_storage.save_klines_batch(self.batch)
            logger.info(f"保存 {len(self.batch)} 条K线数据")
            self.batch.clear()

        except Exception as e:
            logger.error(f"批量保存K线数据失败: {e}")

    async def stop(self) -> None:
        """停止采集"""
        self.is_running = False

        # 刷新剩余数据
        await self._flush_batch()

        logger.info(f"{self.exchange_name} K线采集已停止")
