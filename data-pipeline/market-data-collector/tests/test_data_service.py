"""
数据服务测试 - 完整Mock实现
"""
import pytest
from datetime import datetime
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

from src.services.data_service import DataService
from src.models.schemas import (
    SubscriptionRequest,
    SubscriptionResponse,
    DataQueryRequest,
    TickerResponse,
    OrderBookResponse,
    KlineResponse,
    TickerData,
    OrderBookData,
    OrderBookLevel,
    Exchange,
    Interval,
)


# ============= Mock 存储层 =============

class MockRedisCache:
    """Mock Redis 缓存"""

    def __init__(self):
        self.connected = False
        self.tickers = {}
        self.orderbooks = {}
        self.subscriptions = {}

    async def connect(self):
        self.connected = True

    async def disconnect(self):
        self.connected = False

    async def set_ticker(self, ticker_data):
        key = f"{ticker_data.exchange}:{ticker_data.symbol}"
        self.tickers[key] = ticker_data.model_dump()

    async def get_ticker(self, exchange: str, symbol: str):
        key = f"{exchange}:{symbol}"
        return self.tickers.get(key)

    async def set_orderbook(self, orderbook_data):
        key = f"{orderbook_data.exchange}:{orderbook_data.symbol}"
        self.orderbooks[key] = orderbook_data.model_dump()

    async def get_orderbook(self, exchange: str, symbol: str):
        key = f"{exchange}:{symbol}"
        return self.orderbooks.get(key)

    async def set_subscription(self, subscription_id: str, data: dict):
        self.subscriptions[subscription_id] = data

    async def get_subscription(self, subscription_id: str):
        return self.subscriptions.get(subscription_id)

    async def delete_subscription(self, subscription_id: str):
        if subscription_id in self.subscriptions:
            del self.subscriptions[subscription_id]

    async def publish_ticker_update(self, ticker_data):
        pass  # Mock publish


class MockTimescaleStorage:
    """Mock Timescale 存储"""

    def __init__(self):
        self.connected = False
        self.tickers = []
        self.klines = []
        self.trades = []

    async def connect(self):
        self.connected = True

    async def disconnect(self):
        self.connected = False

    async def save_tickers_batch(self, tickers):
        self.tickers.extend(tickers)

    async def query_tickers(self, exchange, symbol, start_time=None, end_time=None, limit=100):
        filtered = [
            t for t in self.tickers
            if t.exchange == exchange and t.symbol == symbol
        ]
        return filtered[:limit]

    async def query_klines(self, exchange, symbol, interval, start_time=None, end_time=None, limit=100):
        filtered = [
            k for k in self.klines
            if k.exchange == exchange and k.symbol == symbol and k.interval == interval
        ]
        return filtered[:limit]

    async def query_trades(self, exchange, symbol, start_time=None, end_time=None, limit=100):
        filtered = [
            t for t in self.trades
            if t.exchange == exchange and t.symbol == symbol
        ]
        return filtered[:limit]


# ============= Fixtures =============

@pytest.fixture
def mock_redis():
    return MockRedisCache()


@pytest.fixture
def mock_timescale():
    return MockTimescaleStorage()


@pytest.fixture
async def data_service(mock_redis, mock_timescale):
    """创建带Mock的数据服务实例"""
    with patch("src.services.data_service.redis_cache", mock_redis), \
         patch("src.services.data_service.timescale_storage", mock_timescale):
        service = DataService()
        await service.initialize()
        yield service
        await service.shutdown()


@pytest.fixture
def sample_ticker_data():
    """样本Ticker数据"""
    return TickerData(
        exchange="binance",
        symbol="BTC/USDT",
        timestamp=datetime.utcnow(),
        last_price=Decimal("50000.00"),
        bid_price=Decimal("49999.50"),
        ask_price=Decimal("50000.50"),
        high_24h=Decimal("52000.00"),
        low_24h=Decimal("48000.00"),
        volume_24h=Decimal("1000.00"),
        quote_volume_24h=Decimal("50000000.00"),
        price_change_24h=Decimal("1000.00"),
        price_change_percent_24h=Decimal("2.04"),
    )


# ============= 订阅测试 =============

class TestSubscriptionManagement:
    """订阅管理测试"""

    @pytest.mark.asyncio
    async def test_create_subscription_success(self, data_service, mock_redis):
        """测试成功创建订阅"""
        # Mock采集器启动
        with patch.object(data_service, "_start_collector", new_callable=AsyncMock) as mock_start:
            request = SubscriptionRequest(
                exchange=Exchange.BINANCE,
                symbols=["BTC/USDT", "ETH/USDT"],
                data_types=["ticker"],
                intervals=None,
            )

            subscription = await data_service.create_subscription(request)

            # 验证订阅创建
            assert subscription.exchange == "binance"
            assert len(subscription.symbols) == 2
            assert subscription.status == "active"
            assert subscription.subscription_id is not None

            # 验证采集器启动调用
            mock_start.assert_called()

    @pytest.mark.asyncio
    async def test_create_subscription_multiple_data_types(self, data_service):
        """测试创建多数据类型订阅"""
        with patch.object(data_service, "_start_collector", new_callable=AsyncMock) as mock_start:
            request = SubscriptionRequest(
                exchange=Exchange.BINANCE,
                symbols=["BTC/USDT"],
                data_types=["ticker", "orderbook", "trade"],
                intervals=None,
            )

            subscription = await data_service.create_subscription(request)

            assert subscription.status == "active"
            assert len(subscription.data_types) == 3

            # 应该启动3个采集器
            assert mock_start.call_count == 3

    @pytest.mark.asyncio
    async def test_cancel_subscription(self, data_service, mock_redis):
        """测试取消订阅"""
        with patch.object(data_service, "_start_collector", new_callable=AsyncMock):
            request = SubscriptionRequest(
                exchange=Exchange.BINANCE,
                symbols=["BTC/USDT"],
                data_types=["ticker"],
                intervals=None,
            )

            subscription = await data_service.create_subscription(request)
            subscription_id = subscription.subscription_id

            # 取消订阅
            await data_service.cancel_subscription(subscription_id)

            # 验证订阅已删除
            assert subscription_id not in data_service.subscriptions

    @pytest.mark.asyncio
    async def test_cancel_nonexistent_subscription(self, data_service):
        """测试取消不存在的订阅"""
        with pytest.raises(ValueError, match="订阅不存在"):
            await data_service.cancel_subscription("nonexistent_id")

    @pytest.mark.asyncio
    async def test_get_subscription(self, data_service, mock_redis):
        """测试获取订阅信息"""
        with patch.object(data_service, "_start_collector", new_callable=AsyncMock):
            request = SubscriptionRequest(
                exchange=Exchange.BINANCE,
                symbols=["BTC/USDT"],
                data_types=["ticker"],
                intervals=None,
            )

            subscription = await data_service.create_subscription(request)
            subscription_id = subscription.subscription_id

            # 获取订阅
            retrieved = await data_service.get_subscription(subscription_id)

            assert retrieved is not None
            assert retrieved.subscription_id == subscription_id


# ============= 数据查询测试 =============

class TestDataQuery:
    """数据查询测试"""

    @pytest.mark.asyncio
    async def test_query_ticker_from_cache(self, mock_redis, mock_timescale, sample_ticker_data):
        """测试从缓存查询Ticker"""
        # 预填充缓存
        await mock_redis.set_ticker(sample_ticker_data)

        with patch("src.services.data_service.redis_cache", mock_redis), \
             patch("src.services.data_service.timescale_storage", mock_timescale):
            service = DataService()

            request = DataQueryRequest(
                exchange=Exchange.BINANCE,
                symbol="BTC/USDT",
                data_type="ticker",
                limit=10,
            )

            response = await service.query_ticker_data(request)

            assert response.exchange == "binance"
            assert response.symbol == "BTC/USDT"
            assert response.total == 1
            assert len(response.data) == 1

    @pytest.mark.asyncio
    async def test_query_ticker_with_time_range(self, mock_redis, mock_timescale, sample_ticker_data):
        """测试带时间范围的Ticker查询"""
        # 填充存储
        mock_timescale.tickers.append(sample_ticker_data)

        with patch("src.services.data_service.redis_cache", mock_redis), \
             patch("src.services.data_service.timescale_storage", mock_timescale):
            service = DataService()

            request = DataQueryRequest(
                exchange=Exchange.BINANCE,
                symbol="BTC/USDT",
                data_type="ticker",
                start_time=datetime(2024, 1, 1),
                end_time=datetime(2024, 12, 31),
                limit=100,
            )

            response = await service.query_ticker_data(request)

            assert response.exchange == "binance"
            assert isinstance(response.data, list)

    @pytest.mark.asyncio
    async def test_query_orderbook(self, mock_redis, mock_timescale):
        """测试查询订单簿"""
        # 预填充订单簿缓存
        orderbook = OrderBookData(
            exchange="binance",
            symbol="BTC/USDT",
            timestamp=datetime.utcnow(),
            bids=[
                OrderBookLevel(price=Decimal("49999.00"), quantity=Decimal("1.5")),
                OrderBookLevel(price=Decimal("49998.00"), quantity=Decimal("2.0")),
            ],
            asks=[
                OrderBookLevel(price=Decimal("50001.00"), quantity=Decimal("1.0")),
                OrderBookLevel(price=Decimal("50002.00"), quantity=Decimal("1.5")),
            ],
        )
        await mock_redis.set_orderbook(orderbook)

        with patch("src.services.data_service.redis_cache", mock_redis), \
             patch("src.services.data_service.timescale_storage", mock_timescale):
            service = DataService()

            request = DataQueryRequest(
                exchange=Exchange.BINANCE,
                symbol="BTC/USDT",
                data_type="orderbook",
            )

            response = await service.query_orderbook_data(request)

            assert response.exchange == "binance"
            assert response.symbol == "BTC/USDT"
            assert len(response.data.bids) == 2
            assert len(response.data.asks) == 2

    @pytest.mark.asyncio
    async def test_query_orderbook_not_found(self, mock_redis, mock_timescale):
        """测试查询不存在的订单簿"""
        with patch("src.services.data_service.redis_cache", mock_redis), \
             patch("src.services.data_service.timescale_storage", mock_timescale):
            service = DataService()

            request = DataQueryRequest(
                exchange=Exchange.BINANCE,
                symbol="UNKNOWN/USDT",
                data_type="orderbook",
            )

            with pytest.raises(ValueError, match="订单簿数据不存在"):
                await service.query_orderbook_data(request)

    @pytest.mark.asyncio
    async def test_query_kline_without_interval(self, mock_redis, mock_timescale):
        """测试查询K线时必须指定interval"""
        with patch("src.services.data_service.redis_cache", mock_redis), \
             patch("src.services.data_service.timescale_storage", mock_timescale):
            service = DataService()

            request = DataQueryRequest(
                exchange=Exchange.BINANCE,
                symbol="BTC/USDT",
                data_type="kline",
                interval=None,
            )

            with pytest.raises(ValueError, match="查询K线数据需要指定 interval"):
                await service.query_kline_data(request)


# ============= 采集器启动测试 =============

class TestCollectorStartup:
    """采集器启动测试"""

    @pytest.mark.asyncio
    async def test_start_ticker_collector(self, data_service):
        """测试启动Ticker采集器"""
        with patch("src.services.data_service.TickerCollector") as MockCollector:
            mock_instance = MagicMock()
            mock_instance.initialize = AsyncMock()
            mock_instance.start = AsyncMock()
            MockCollector.return_value = mock_instance

            await data_service._start_collector(
                exchange="binance",
                data_type="ticker",
                symbols=["BTC/USDT"],
                intervals=None,
            )

            MockCollector.assert_called_once_with("binance")
            mock_instance.initialize.assert_called_once()
            mock_instance.start.assert_called_once_with(["BTC/USDT"])

    @pytest.mark.asyncio
    async def test_start_kline_collector_with_intervals(self, data_service):
        """测试启动K线采集器带间隔"""
        with patch("src.services.data_service.KlineCollector") as MockCollector:
            mock_instance = MagicMock()
            mock_instance.initialize = AsyncMock()
            mock_instance.start = AsyncMock()
            MockCollector.return_value = mock_instance

            await data_service._start_collector(
                exchange="binance",
                data_type="kline",
                symbols=["BTC/USDT"],
                intervals=[Interval.H1, Interval.D1],
            )

            MockCollector.assert_called_once_with("binance")
            mock_instance.start.assert_called_once_with(
                ["BTC/USDT"], [Interval.H1, Interval.D1]
            )

    @pytest.mark.asyncio
    async def test_start_unsupported_data_type(self, data_service):
        """测试启动不支持的数据类型"""
        with pytest.raises(ValueError, match="不支持的数据类型"):
            await data_service._start_collector(
                exchange="binance",
                data_type="invalid_type",
                symbols=["BTC/USDT"],
                intervals=None,
            )

    @pytest.mark.asyncio
    async def test_skip_existing_collector(self, data_service):
        """测试跳过已存在的采集器"""
        with patch("src.services.data_service.TickerCollector") as MockCollector:
            mock_instance = MagicMock()
            mock_instance.initialize = AsyncMock()
            mock_instance.start = AsyncMock()
            MockCollector.return_value = mock_instance

            # 第一次启动
            await data_service._start_collector(
                exchange="binance",
                data_type="ticker",
                symbols=["BTC/USDT"],
                intervals=None,
            )

            # 第二次启动应该跳过
            await data_service._start_collector(
                exchange="binance",
                data_type="ticker",
                symbols=["ETH/USDT"],
                intervals=None,
            )

            # 只应该创建一次
            assert MockCollector.call_count == 1


# ============= 服务生命周期测试 =============

class TestServiceLifecycle:
    """服务生命周期测试"""

    @pytest.mark.asyncio
    async def test_initialize_success(self, mock_redis, mock_timescale):
        """测试初始化成功"""
        with patch("src.services.data_service.redis_cache", mock_redis), \
             patch("src.services.data_service.timescale_storage", mock_timescale):
            service = DataService()
            await service.initialize()

            assert mock_redis.connected is True
            assert mock_timescale.connected is True

    @pytest.mark.asyncio
    async def test_shutdown(self, mock_redis, mock_timescale):
        """测试关闭服务"""
        with patch("src.services.data_service.redis_cache", mock_redis), \
             patch("src.services.data_service.timescale_storage", mock_timescale):
            service = DataService()
            await service.initialize()
            await service.shutdown()

            assert mock_redis.connected is False
            assert mock_timescale.connected is False

    @pytest.mark.asyncio
    async def test_shutdown_with_active_collectors(self, mock_redis, mock_timescale):
        """测试关闭时停止所有采集器"""
        with patch("src.services.data_service.redis_cache", mock_redis), \
             patch("src.services.data_service.timescale_storage", mock_timescale):
            service = DataService()
            await service.initialize()

            # 模拟添加采集器
            mock_collector = MagicMock()
            mock_collector.shutdown = AsyncMock()
            service.collectors["binance"] = {"binance_ticker": mock_collector}

            await service.shutdown()

            mock_collector.shutdown.assert_called_once()


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--asyncio-mode=auto"])
