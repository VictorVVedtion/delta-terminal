"""
成交数据采集器
"""
import logging
from datetime import datetime
from decimal import Decimal
from typing import List, Dict, Any

from src.collectors.base import WebSocketCollector
from src.models.schemas import TradeData
from src.storage.timescale import timescale_storage
from src.config import settings

logger = logging.getLogger(__name__)


class TradeCollector(WebSocketCollector):
    """成交数据采集器"""

    def __init__(self, exchange_name: str):
        super().__init__(exchange_name)
        self.batch: List[TradeData] = []
        self.processed_ids: set = set()  # 防止重复

    async def start(self, symbols: List[str]) -> None:
        """启动成交数据采集"""
        self.is_running = True
        logger.info(f"启动 {self.exchange_name} 成交数据采集，交易对: {symbols}")

        try:
            # 使用 CCXT 的 watch 方法（WebSocket）
            if hasattr(self.exchange, "watch_trades"):
                for symbol in symbols:
                    if self._validate_symbol(symbol):
                        await self._watch_trades(symbol)
            else:
                # 降级为轮询模式
                logger.warning(f"{self.exchange_name} 不支持 WebSocket，使用轮询模式")
                await self._poll_trades(symbols)

        except Exception as e:
            await self._handle_error(e, "启动成交数据采集")

    async def _watch_trades(self, symbol: str) -> None:
        """WebSocket 监听成交"""
        try:
            while self.is_running:
                trades = await self.exchange.watch_trades(symbol)
                await self._process_trades(symbol, trades)

        except Exception as e:
            await self._handle_error(e, f"WebSocket 成交监听 {symbol}")

    async def _poll_trades(self, symbols: List[str]) -> None:
        """轮询获取成交数据"""
        import asyncio

        # 记录每个交易对的最后成交ID
        last_trade_ids: Dict[str, str] = {}

        while self.is_running:
            try:
                for symbol in symbols:
                    if not self._validate_symbol(symbol):
                        continue

                    # 获取最近成交
                    params = {}
                    if symbol in last_trade_ids:
                        params["since"] = last_trade_ids[symbol]

                    trades = await self.exchange.fetch_trades(symbol, params=params)

                    if trades:
                        await self._process_trades(symbol, trades)
                        # 更新最后成交ID
                        last_trade_ids[symbol] = trades[-1]["id"]

                # 等待下一次轮询
                await asyncio.sleep(settings.trade_fetch_interval)

            except Exception as e:
                await self._handle_error(e, "轮询成交数据")
                await asyncio.sleep(5)

    async def _process_trades(
        self, symbol: str, raw_trades: List[Dict[str, Any]]
    ) -> None:
        """处理成交数据"""
        try:
            for raw_trade in raw_trades:
                trade_data = self._parse_trade(symbol, raw_trade)

                # 防止重复处理
                if trade_data.trade_id in self.processed_ids:
                    continue

                self.batch.append(trade_data)
                self.processed_ids.add(trade_data.trade_id)

            # 批量写入数据库
            if len(self.batch) >= settings.trade_batch_size:
                await self._flush_batch()

            # 限制 processed_ids 大小
            if len(self.processed_ids) > 10000:
                self.processed_ids.clear()

        except Exception as e:
            logger.error(f"处理成交数据失败: {e}")

    def _parse_trade(self, symbol: str, raw_trade: Dict[str, Any]) -> TradeData:
        """解析成交数据"""
        timestamp = raw_trade.get("timestamp")
        if timestamp:
            dt = datetime.fromtimestamp(timestamp / 1000)
        else:
            dt = datetime.utcnow()

        # 判断方向
        side = raw_trade.get("side", "unknown")
        if side not in ["buy", "sell"]:
            # 有些交易所使用 takerOrMaker
            side = "buy" if raw_trade.get("takerOrMaker") == "taker" else "sell"

        return TradeData(
            exchange=self.exchange_name,
            symbol=symbol,
            trade_id=str(raw_trade.get("id", raw_trade.get("timestamp"))),
            timestamp=dt,
            price=Decimal(str(raw_trade.get("price", 0))),
            quantity=Decimal(str(raw_trade.get("amount", 0))),
            side=side,
            is_buyer_maker=raw_trade.get("takerOrMaker") == "maker",
        )

    async def _flush_batch(self) -> None:
        """刷新批次到数据库"""
        if not self.batch:
            return

        try:
            await timescale_storage.save_trades_batch(self.batch)
            logger.info(f"保存 {len(self.batch)} 条成交数据")
            self.batch.clear()

        except Exception as e:
            logger.error(f"批量保存成交数据失败: {e}")

    async def stop(self) -> None:
        """停止采集"""
        self.is_running = False

        # 刷新剩余数据
        await self._flush_batch()

        logger.info(f"{self.exchange_name} 成交数据采集已停止")
