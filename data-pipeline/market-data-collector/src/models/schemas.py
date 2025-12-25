"""
数据模型定义
"""
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class Exchange(str, Enum):
    """交易所枚举"""

    BINANCE = "binance"
    OKX = "okx"
    BYBIT = "bybit"


class Interval(str, Enum):
    """K线间隔"""

    M1 = "1m"
    M5 = "5m"
    M15 = "15m"
    M30 = "30m"
    H1 = "1h"
    H4 = "4h"
    D1 = "1d"
    W1 = "1w"


class TickerData(BaseModel):
    """Ticker 数据"""

    model_config = ConfigDict(from_attributes=True)

    exchange: str
    symbol: str
    timestamp: datetime
    last_price: Decimal
    bid_price: Decimal | None = None
    ask_price: Decimal | None = None
    high_24h: Decimal | None = None
    low_24h: Decimal | None = None
    volume_24h: Decimal | None = None
    quote_volume_24h: Decimal | None = None
    price_change_24h: Decimal | None = None
    price_change_percent_24h: Decimal | None = None


class OrderBookLevel(BaseModel):
    """订单簿单个档位"""

    price: Decimal
    quantity: Decimal


class OrderBookData(BaseModel):
    """订单簿数据"""

    model_config = ConfigDict(from_attributes=True)

    exchange: str
    symbol: str
    timestamp: datetime
    bids: List[OrderBookLevel]
    asks: List[OrderBookLevel]
    checksum: str | None = None


class TradeData(BaseModel):
    """成交数据"""

    model_config = ConfigDict(from_attributes=True)

    exchange: str
    symbol: str
    trade_id: str
    timestamp: datetime
    price: Decimal
    quantity: Decimal
    side: str  # buy/sell
    is_buyer_maker: bool | None = None


class KlineData(BaseModel):
    """K线数据"""

    model_config = ConfigDict(from_attributes=True)

    exchange: str
    symbol: str
    interval: str
    timestamp: datetime
    open_price: Decimal
    high_price: Decimal
    low_price: Decimal
    close_price: Decimal
    volume: Decimal
    quote_volume: Decimal | None = None
    trades_count: int | None = None


class SubscriptionRequest(BaseModel):
    """订阅请求"""

    exchange: Exchange
    symbols: List[str]
    data_types: List[str]  # ticker, orderbook, trade, kline
    intervals: List[Interval] | None = None  # For kline subscriptions


class SubscriptionResponse(BaseModel):
    """订阅响应"""

    subscription_id: str
    exchange: str
    symbols: List[str]
    data_types: List[str]
    status: str
    created_at: datetime


class DataQueryRequest(BaseModel):
    """数据查询请求"""

    exchange: Exchange
    symbol: str
    data_type: str  # ticker, orderbook, trade, kline
    start_time: datetime | None = None
    end_time: datetime | None = None
    interval: Interval | None = None
    limit: int = Field(default=100, ge=1, le=1000)


class TickerResponse(BaseModel):
    """Ticker 响应"""

    data: List[TickerData]
    total: int
    exchange: str
    symbol: str


class OrderBookResponse(BaseModel):
    """订单簿响应"""

    data: OrderBookData
    exchange: str
    symbol: str


class TradeResponse(BaseModel):
    """成交响应"""

    data: List[TradeData]
    total: int
    exchange: str
    symbol: str


class KlineResponse(BaseModel):
    """K线响应"""

    data: List[KlineData]
    total: int
    exchange: str
    symbol: str
    interval: str


class HealthCheck(BaseModel):
    """健康检查"""

    status: str
    timestamp: datetime
    services: Dict[str, bool]
    version: str


class ErrorResponse(BaseModel):
    """错误响应"""

    error: str
    message: str
    timestamp: datetime
    details: Dict[str, Any] | None = None
