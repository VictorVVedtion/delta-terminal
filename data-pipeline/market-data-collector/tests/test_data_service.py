"""
数据服务测试
"""
import pytest
from datetime import datetime
from decimal import Decimal

from src.services.data_service import DataService
from src.models.schemas import (
    SubscriptionRequest,
    Exchange,
    Interval,
    DataQueryRequest,
)


@pytest.fixture
async def data_service():
    """创建数据服务实例"""
    service = DataService()
    # 注意：实际测试需要 Mock 存储层
    yield service
    await service.shutdown()


@pytest.mark.asyncio
async def test_create_subscription(data_service):
    """测试创建订阅"""
    request = SubscriptionRequest(
        exchange=Exchange.BINANCE,
        symbols=["BTC/USDT", "ETH/USDT"],
        data_types=["ticker", "orderbook"],
        intervals=None,
    )

    # 注意：需要 Mock 采集器初始化
    # subscription = await data_service.create_subscription(request)

    # assert subscription.exchange == "binance"
    # assert len(subscription.symbols) == 2
    # assert subscription.status == "active"


@pytest.mark.asyncio
async def test_query_ticker_data(data_service):
    """测试查询 Ticker 数据"""
    request = DataQueryRequest(
        exchange=Exchange.BINANCE,
        symbol="BTC/USDT",
        data_type="ticker",
        limit=10,
    )

    # 注意：需要 Mock 存储层
    # response = await data_service.query_ticker_data(request)

    # assert response.exchange == "binance"
    # assert response.symbol == "BTC/USDT"
    # assert isinstance(response.data, list)


@pytest.mark.asyncio
async def test_query_kline_data(data_service):
    """测试查询K线数据"""
    request = DataQueryRequest(
        exchange=Exchange.BINANCE,
        symbol="BTC/USDT",
        data_type="kline",
        interval=Interval.H1,
        limit=100,
    )

    # 注意：需要 Mock 存储层
    # response = await data_service.query_kline_data(request)

    # assert response.exchange == "binance"
    # assert response.interval == "1h"
    # assert isinstance(response.data, list)
