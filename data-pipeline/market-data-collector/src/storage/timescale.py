"""
TimescaleDB 时序数据存储
"""
import logging
from datetime import datetime
from typing import List, Optional
from decimal import Decimal

from sqlalchemy import (
    MetaData,
    Table,
    Column,
    String,
    DateTime,
    Numeric,
    Integer,
    Boolean,
    text,
    select,
    and_,
)
from sqlalchemy.ext.asyncio import create_async_engine, AsyncEngine, AsyncSession
from sqlalchemy.orm import sessionmaker

from src.config import settings
from src.models.schemas import TickerData, TradeData, KlineData

logger = logging.getLogger(__name__)

metadata = MetaData()

# Ticker 表
ticker_table = Table(
    "tickers",
    metadata,
    Column("exchange", String(50), nullable=False),
    Column("symbol", String(50), nullable=False),
    Column("timestamp", DateTime(timezone=True), nullable=False, primary_key=True),
    Column("last_price", Numeric(20, 8), nullable=False),
    Column("bid_price", Numeric(20, 8)),
    Column("ask_price", Numeric(20, 8)),
    Column("high_24h", Numeric(20, 8)),
    Column("low_24h", Numeric(20, 8)),
    Column("volume_24h", Numeric(20, 8)),
    Column("quote_volume_24h", Numeric(20, 8)),
    Column("price_change_24h", Numeric(20, 8)),
    Column("price_change_percent_24h", Numeric(10, 4)),
)

# 成交表
trades_table = Table(
    "trades",
    metadata,
    Column("exchange", String(50), nullable=False),
    Column("symbol", String(50), nullable=False),
    Column("trade_id", String(100), nullable=False),
    Column("timestamp", DateTime(timezone=True), nullable=False, primary_key=True),
    Column("price", Numeric(20, 8), nullable=False),
    Column("quantity", Numeric(20, 8), nullable=False),
    Column("side", String(10), nullable=False),
    Column("is_buyer_maker", Boolean),
)

# K线表
klines_table = Table(
    "klines",
    metadata,
    Column("exchange", String(50), nullable=False),
    Column("symbol", String(50), nullable=False),
    Column("interval", String(10), nullable=False),
    Column("timestamp", DateTime(timezone=True), nullable=False, primary_key=True),
    Column("open_price", Numeric(20, 8), nullable=False),
    Column("high_price", Numeric(20, 8), nullable=False),
    Column("low_price", Numeric(20, 8), nullable=False),
    Column("close_price", Numeric(20, 8), nullable=False),
    Column("volume", Numeric(20, 8), nullable=False),
    Column("quote_volume", Numeric(20, 8)),
    Column("trades_count", Integer),
)


class TimescaleStorage:
    """TimescaleDB 存储管理器"""

    def __init__(self) -> None:
        self.engine: AsyncEngine | None = None
        self.async_session: sessionmaker | None = None

    async def connect(self) -> None:
        """连接数据库"""
        try:
            self.engine = create_async_engine(
                settings.database_url,
                pool_size=settings.db_pool_size,
                max_overflow=settings.db_max_overflow,
                echo=settings.debug,
            )

            self.async_session = sessionmaker(
                self.engine, class_=AsyncSession, expire_on_commit=False
            )

            # 创建表
            async with self.engine.begin() as conn:
                await conn.run_sync(metadata.create_all)

            # 创建 Hypertables (TimescaleDB 特性)
            await self._create_hypertables()

            logger.info("TimescaleDB 连接成功")

        except Exception as e:
            logger.error(f"TimescaleDB 连接失败: {e}")
            raise

    async def _create_hypertables(self) -> None:
        """创建 TimescaleDB Hypertables"""
        hypertable_queries = [
            """
            SELECT create_hypertable('tickers', 'timestamp',
                if_not_exists => TRUE,
                chunk_time_interval => INTERVAL '1 day'
            );
            """,
            """
            SELECT create_hypertable('trades', 'timestamp',
                if_not_exists => TRUE,
                chunk_time_interval => INTERVAL '1 day'
            );
            """,
            """
            SELECT create_hypertable('klines', 'timestamp',
                if_not_exists => TRUE,
                chunk_time_interval => INTERVAL '7 days'
            );
            """,
        ]

        async with self.engine.begin() as conn:
            for query in hypertable_queries:
                try:
                    await conn.execute(text(query))
                except Exception as e:
                    # Hypertable 可能已存在
                    logger.debug(f"Hypertable 创建跳过: {e}")

        # 创建索引
        await self._create_indexes()

    async def _create_indexes(self) -> None:
        """创建索引"""
        index_queries = [
            "CREATE INDEX IF NOT EXISTS idx_tickers_exchange_symbol ON tickers (exchange, symbol, timestamp DESC);",
            "CREATE INDEX IF NOT EXISTS idx_trades_exchange_symbol ON trades (exchange, symbol, timestamp DESC);",
            "CREATE INDEX IF NOT EXISTS idx_klines_exchange_symbol_interval ON klines (exchange, symbol, interval, timestamp DESC);",
        ]

        async with self.engine.begin() as conn:
            for query in index_queries:
                await conn.execute(text(query))

    async def disconnect(self) -> None:
        """断开数据库连接"""
        if self.engine:
            await self.engine.dispose()
            logger.info("TimescaleDB 连接已关闭")

    async def save_ticker(self, ticker: TickerData) -> None:
        """保存 Ticker 数据"""
        if not self.async_session:
            raise RuntimeError("Database not connected")

        async with self.async_session() as session:
            async with session.begin():
                await session.execute(
                    ticker_table.insert().values(
                        exchange=ticker.exchange,
                        symbol=ticker.symbol,
                        timestamp=ticker.timestamp,
                        last_price=ticker.last_price,
                        bid_price=ticker.bid_price,
                        ask_price=ticker.ask_price,
                        high_24h=ticker.high_24h,
                        low_24h=ticker.low_24h,
                        volume_24h=ticker.volume_24h,
                        quote_volume_24h=ticker.quote_volume_24h,
                        price_change_24h=ticker.price_change_24h,
                        price_change_percent_24h=ticker.price_change_percent_24h,
                    )
                )

    async def save_tickers_batch(self, tickers: List[TickerData]) -> None:
        """批量保存 Ticker 数据"""
        if not self.async_session or not tickers:
            return

        async with self.async_session() as session:
            async with session.begin():
                values = [
                    {
                        "exchange": t.exchange,
                        "symbol": t.symbol,
                        "timestamp": t.timestamp,
                        "last_price": t.last_price,
                        "bid_price": t.bid_price,
                        "ask_price": t.ask_price,
                        "high_24h": t.high_24h,
                        "low_24h": t.low_24h,
                        "volume_24h": t.volume_24h,
                        "quote_volume_24h": t.quote_volume_24h,
                        "price_change_24h": t.price_change_24h,
                        "price_change_percent_24h": t.price_change_percent_24h,
                    }
                    for t in tickers
                ]
                await session.execute(ticker_table.insert(), values)

    async def save_trades_batch(self, trades: List[TradeData]) -> None:
        """批量保存成交数据"""
        if not self.async_session or not trades:
            return

        async with self.async_session() as session:
            async with session.begin():
                values = [
                    {
                        "exchange": t.exchange,
                        "symbol": t.symbol,
                        "trade_id": t.trade_id,
                        "timestamp": t.timestamp,
                        "price": t.price,
                        "quantity": t.quantity,
                        "side": t.side,
                        "is_buyer_maker": t.is_buyer_maker,
                    }
                    for t in trades
                ]
                await session.execute(trades_table.insert(), values)

    async def save_klines_batch(self, klines: List[KlineData]) -> None:
        """批量保存K线数据"""
        if not self.async_session or not klines:
            return

        async with self.async_session() as session:
            async with session.begin():
                values = [
                    {
                        "exchange": k.exchange,
                        "symbol": k.symbol,
                        "interval": k.interval,
                        "timestamp": k.timestamp,
                        "open_price": k.open_price,
                        "high_price": k.high_price,
                        "low_price": k.low_price,
                        "close_price": k.close_price,
                        "volume": k.volume,
                        "quote_volume": k.quote_volume,
                        "trades_count": k.trades_count,
                    }
                    for k in klines
                ]
                await session.execute(klines_table.insert(), values)

    async def query_tickers(
        self,
        exchange: str,
        symbol: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 100,
    ) -> List[TickerData]:
        """查询 Ticker 数据"""
        if not self.async_session:
            raise RuntimeError("Database not connected")

        async with self.async_session() as session:
            query = select(ticker_table).where(
                and_(
                    ticker_table.c.exchange == exchange,
                    ticker_table.c.symbol == symbol,
                )
            )

            if start_time:
                query = query.where(ticker_table.c.timestamp >= start_time)
            if end_time:
                query = query.where(ticker_table.c.timestamp <= end_time)

            query = query.order_by(ticker_table.c.timestamp.desc()).limit(limit)

            result = await session.execute(query)
            rows = result.fetchall()

            return [TickerData(**dict(row._mapping)) for row in rows]

    async def query_trades(
        self,
        exchange: str,
        symbol: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 100,
    ) -> List[TradeData]:
        """查询成交数据"""
        if not self.async_session:
            raise RuntimeError("Database not connected")

        async with self.async_session() as session:
            query = select(trades_table).where(
                and_(
                    trades_table.c.exchange == exchange,
                    trades_table.c.symbol == symbol,
                )
            )

            if start_time:
                query = query.where(trades_table.c.timestamp >= start_time)
            if end_time:
                query = query.where(trades_table.c.timestamp <= end_time)

            query = query.order_by(trades_table.c.timestamp.desc()).limit(limit)

            result = await session.execute(query)
            rows = result.fetchall()

            return [TradeData(**dict(row._mapping)) for row in rows]

    async def query_klines(
        self,
        exchange: str,
        symbol: str,
        interval: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 100,
    ) -> List[KlineData]:
        """查询K线数据"""
        if not self.async_session:
            raise RuntimeError("Database not connected")

        async with self.async_session() as session:
            query = select(klines_table).where(
                and_(
                    klines_table.c.exchange == exchange,
                    klines_table.c.symbol == symbol,
                    klines_table.c.interval == interval,
                )
            )

            if start_time:
                query = query.where(klines_table.c.timestamp >= start_time)
            if end_time:
                query = query.where(klines_table.c.timestamp <= end_time)

            query = query.order_by(klines_table.c.timestamp.desc()).limit(limit)

            result = await session.execute(query)
            rows = result.fetchall()

            return [KlineData(**dict(row._mapping)) for row in rows]


# 全局实例
timescale_storage = TimescaleStorage()
