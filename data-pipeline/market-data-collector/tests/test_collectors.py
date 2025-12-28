"""
数据采集器测试 - TickerCollector, OrderBookCollector, KlineCollector
"""
import pytest
from datetime import datetime
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

from src.collectors.ticker_collector import TickerCollector
from src.collectors.orderbook_collector import OrderBookCollector
from src.collectors.kline_collector import KlineCollector
from src.models.schemas import TickerData, OrderBookData, KlineData


# ============= Mock CCXT Exchange =============

class MockCCXTExchange:
    """Mock CCXT 交易所"""

    def __init__(self, exchange_name: str = "binance"):
        self.exchange_name = exchange_name
        self.markets = {
            "BTC/USDT": {"symbol": "BTC/USDT", "active": True},
            "ETH/USDT": {"symbol": "ETH/USDT", "active": True},
        }

    async def load_markets(self):
        return self.markets

    async def fetch_ticker(self, symbol: str):
        """模拟获取Ticker"""
        return {
            "symbol": symbol,
            "timestamp": int(datetime.utcnow().timestamp() * 1000),
            "last": 50000.0,
            "bid": 49999.5,
            "ask": 50000.5,
            "high": 52000.0,
            "low": 48000.0,
            "baseVolume": 1000.0,
            "quoteVolume": 50000000.0,
            "change": 1000.0,
            "percentage": 2.04,
        }

    async def watch_ticker(self, symbol: str):
        """模拟WebSocket Ticker监听"""
        return await self.fetch_ticker(symbol)

    async def fetch_order_book(self, symbol: str, limit: int = 20):
        """模拟获取订单簿"""
        return {
            "symbol": symbol,
            "timestamp": int(datetime.utcnow().timestamp() * 1000),
            "bids": [
                [49999.0, 1.5],
                [49998.0, 2.0],
                [49997.0, 3.0],
            ],
            "asks": [
                [50001.0, 1.0],
                [50002.0, 1.5],
                [50003.0, 2.0],
            ],
        }

    async def watch_order_book(self, symbol: str, limit: int = 20):
        """模拟WebSocket订单簿监听"""
        return await self.fetch_order_book(symbol, limit)

    async def fetch_ohlcv(self, symbol: str, timeframe: str = "1h", limit: int = 100):
        """模拟获取K线"""
        now = int(datetime.utcnow().timestamp() * 1000)
        return [
            [now - 3600000, 49000.0, 50500.0, 48500.0, 50000.0, 1000.0],  # [时间, 开, 高, 低, 收, 量]
            [now, 50000.0, 51000.0, 49500.0, 50800.0, 1200.0],
        ]

    async def watch_ohlcv(self, symbol: str, timeframe: str = "1h"):
        """模拟WebSocket K线监听"""
        ohlcv = await self.fetch_ohlcv(symbol, timeframe, 1)
        return ohlcv

    async def close(self):
        pass


# ============= Mock Storage =============

class MockRedisCache:
    """Mock Redis"""

    def __init__(self):
        self.tickers = {}
        self.orderbooks = {}

    async def set_ticker(self, ticker_data):
        key = f"{ticker_data.exchange}:{ticker_data.symbol}"
        self.tickers[key] = ticker_data

    async def publish_ticker_update(self, ticker_data):
        pass

    async def set_orderbook(self, orderbook_data):
        key = f"{orderbook_data.exchange}:{orderbook_data.symbol}"
        self.orderbooks[key] = orderbook_data

    async def publish_orderbook_update(self, orderbook_data):
        pass


class MockTimescaleStorage:
    """Mock Timescale"""

    def __init__(self):
        self.tickers = []
        self.klines = []

    async def save_tickers_batch(self, tickers):
        self.tickers.extend(tickers)

    async def save_klines_batch(self, klines):
        self.klines.extend(klines)


# ============= Fixtures =============

@pytest.fixture
def mock_exchange():
    return MockCCXTExchange()


@pytest.fixture
def mock_redis():
    return MockRedisCache()


@pytest.fixture
def mock_timescale():
    return MockTimescaleStorage()


# ============= TickerCollector Tests =============

class TestTickerCollector:
    """Ticker采集器测试"""

    @pytest.fixture
    async def ticker_collector(self, mock_exchange, mock_redis, mock_timescale):
        """创建Ticker采集器"""
        with patch("src.collectors.ticker_collector.redis_cache", mock_redis), \
             patch("src.collectors.ticker_collector.timescale_storage", mock_timescale), \
             patch("src.collectors.base.ccxt"):
            collector = TickerCollector("binance")
            collector.exchange = mock_exchange
            collector.markets = mock_exchange.markets
            yield collector
            await collector.stop()

    def test_ticker_collector_initialization(self):
        """测试Ticker采集器初始化"""
        with patch("src.collectors.base.ccxt"):
            collector = TickerCollector("binance")
            assert collector.exchange_name == "binance"
            assert collector.batch == []
            assert collector.is_running is False

    def test_parse_ticker(self, ticker_collector):
        """测试解析Ticker数据"""
        raw_ticker = {
            "timestamp": int(datetime.utcnow().timestamp() * 1000),
            "last": 50000.0,
            "bid": 49999.5,
            "ask": 50000.5,
            "high": 52000.0,
            "low": 48000.0,
            "baseVolume": 1000.0,
            "quoteVolume": 50000000.0,
            "change": 1000.0,
            "percentage": 2.04,
        }

        ticker_data = ticker_collector._parse_ticker("BTC/USDT", raw_ticker)

        assert isinstance(ticker_data, TickerData)
        assert ticker_data.exchange == "binance"
        assert ticker_data.symbol == "BTC/USDT"
        assert ticker_data.last_price == Decimal("50000.0")
        assert ticker_data.bid_price == Decimal("49999.5")
        assert ticker_data.ask_price == Decimal("50000.5")

    def test_parse_ticker_missing_optional_fields(self, ticker_collector):
        """测试解析缺少可选字段的Ticker"""
        raw_ticker = {
            "timestamp": int(datetime.utcnow().timestamp() * 1000),
            "last": 50000.0,
        }

        ticker_data = ticker_collector._parse_ticker("BTC/USDT", raw_ticker)

        assert ticker_data.last_price == Decimal("50000.0")
        assert ticker_data.bid_price is None
        assert ticker_data.ask_price is None

    def test_parse_ticker_without_timestamp(self, ticker_collector):
        """测试解析没有时间戳的Ticker"""
        raw_ticker = {"last": 50000.0}

        ticker_data = ticker_collector._parse_ticker("BTC/USDT", raw_ticker)

        assert ticker_data.timestamp is not None
        assert ticker_data.last_price == Decimal("50000.0")

    @pytest.mark.asyncio
    async def test_process_ticker(self, ticker_collector, mock_redis):
        """测试处理Ticker数据"""
        raw_ticker = {
            "timestamp": int(datetime.utcnow().timestamp() * 1000),
            "last": 50000.0,
            "bid": 49999.5,
            "ask": 50000.5,
        }

        await ticker_collector._process_ticker("BTC/USDT", raw_ticker)

        # 验证数据被添加到批次
        assert len(ticker_collector.batch) == 1
        assert ticker_collector.batch[0].symbol == "BTC/USDT"

    @pytest.mark.asyncio
    async def test_flush_batch(self, ticker_collector, mock_timescale):
        """测试刷新批次"""
        # 添加测试数据
        ticker_data = TickerData(
            exchange="binance",
            symbol="BTC/USDT",
            timestamp=datetime.utcnow(),
            last_price=Decimal("50000.0"),
        )
        ticker_collector.batch = [ticker_data]

        await ticker_collector._flush_batch()

        # 验证批次已清空
        assert len(ticker_collector.batch) == 0
        # 验证数据已保存到存储
        assert len(mock_timescale.tickers) == 1

    @pytest.mark.asyncio
    async def test_batch_size_trigger_flush(self, ticker_collector, mock_timescale):
        """测试批次大小触发刷新"""
        with patch.object(ticker_collector, "_flush_batch", new_callable=AsyncMock) as mock_flush:
            # 设置较小的批次大小
            with patch("src.collectors.ticker_collector.settings") as mock_settings:
                mock_settings.ticker_batch_size = 2

                raw_ticker = {"timestamp": int(datetime.utcnow().timestamp() * 1000), "last": 50000.0}

                # 处理第一个
                await ticker_collector._process_ticker("BTC/USDT", raw_ticker)
                mock_flush.assert_not_called()

                # 处理第二个应该触发flush
                await ticker_collector._process_ticker("ETH/USDT", raw_ticker)
                mock_flush.assert_called_once()


# ============= OrderBookCollector Tests =============

class TestOrderBookCollector:
    """订单簿采集器测试"""

    @pytest.fixture
    async def orderbook_collector(self, mock_exchange, mock_redis):
        """创建订单簿采集器"""
        with patch("src.collectors.orderbook_collector.redis_cache", mock_redis), \
             patch("src.collectors.base.ccxt"):
            collector = OrderBookCollector("binance")
            collector.exchange = mock_exchange
            collector.markets = mock_exchange.markets
            yield collector
            await collector.stop()

    def test_orderbook_collector_initialization(self):
        """测试订单簿采集器初始化"""
        with patch("src.collectors.base.ccxt"):
            collector = OrderBookCollector("binance")
            assert collector.exchange_name == "binance"
            assert collector.is_running is False

    @pytest.mark.asyncio
    async def test_parse_orderbook(self, orderbook_collector):
        """测试解析订单簿"""
        raw_orderbook = {
            "timestamp": int(datetime.utcnow().timestamp() * 1000),
            "bids": [
                [49999.0, 1.5],
                [49998.0, 2.0],
            ],
            "asks": [
                [50001.0, 1.0],
                [50002.0, 1.5],
            ],
        }

        orderbook_data = orderbook_collector._parse_orderbook("BTC/USDT", raw_orderbook)

        assert isinstance(orderbook_data, OrderBookData)
        assert orderbook_data.exchange == "binance"
        assert orderbook_data.symbol == "BTC/USDT"
        assert len(orderbook_data.bids) == 2
        assert len(orderbook_data.asks) == 2
        assert orderbook_data.bids[0].price == Decimal("49999.0")
        assert orderbook_data.asks[0].price == Decimal("50001.0")

    @pytest.mark.asyncio
    async def test_process_orderbook(self, orderbook_collector, mock_redis):
        """测试处理订单簿"""
        raw_orderbook = {
            "timestamp": int(datetime.utcnow().timestamp() * 1000),
            "bids": [[49999.0, 1.5]],
            "asks": [[50001.0, 1.0]],
        }

        await orderbook_collector._process_orderbook("BTC/USDT", raw_orderbook)

        # 验证数据已缓存
        key = "binance:BTC/USDT"
        assert key in mock_redis.orderbooks


# ============= KlineCollector Tests =============

class TestKlineCollector:
    """K线采集器测试"""

    @pytest.fixture
    async def kline_collector(self, mock_exchange, mock_timescale):
        """创建K线采集器"""
        with patch("src.collectors.kline_collector.timescale_storage", mock_timescale), \
             patch("src.collectors.base.ccxt"):
            collector = KlineCollector("binance")
            collector.exchange = mock_exchange
            collector.markets = mock_exchange.markets
            yield collector
            await collector.stop()

    def test_kline_collector_initialization(self):
        """测试K线采集器初始化"""
        with patch("src.collectors.base.ccxt"):
            collector = KlineCollector("binance")
            assert collector.exchange_name == "binance"
            assert collector.batch == []

    def test_parse_kline(self, kline_collector):
        """测试解析K线"""
        raw_kline = [
            int(datetime.utcnow().timestamp() * 1000),  # timestamp
            49000.0,  # open
            50500.0,  # high
            48500.0,  # low
            50000.0,  # close
            1000.0,   # volume
        ]

        kline_data = kline_collector._parse_kline("BTC/USDT", "1h", raw_kline)

        assert isinstance(kline_data, KlineData)
        assert kline_data.exchange == "binance"
        assert kline_data.symbol == "BTC/USDT"
        assert kline_data.interval == "1h"
        assert kline_data.open_price == Decimal("49000.0")
        assert kline_data.high_price == Decimal("50500.0")
        assert kline_data.low_price == Decimal("48500.0")
        assert kline_data.close_price == Decimal("50000.0")
        assert kline_data.volume == Decimal("1000.0")

    @pytest.mark.asyncio
    async def test_flush_kline_batch(self, kline_collector, mock_timescale):
        """测试刷新K线批次"""
        kline_data = KlineData(
            exchange="binance",
            symbol="BTC/USDT",
            interval="1h",
            timestamp=datetime.utcnow(),
            open_price=Decimal("49000.0"),
            high_price=Decimal("50500.0"),
            low_price=Decimal("48500.0"),
            close_price=Decimal("50000.0"),
            volume=Decimal("1000.0"),
        )
        kline_collector.batch = [kline_data]

        await kline_collector._flush_batch()

        assert len(kline_collector.batch) == 0
        assert len(mock_timescale.klines) == 1


# ============= Base Collector Tests =============

class TestBaseCollector:
    """基础采集器测试"""

    def test_validate_symbol_valid(self):
        """测试有效交易对验证"""
        with patch("src.collectors.base.ccxt"):
            collector = TickerCollector("binance")
            # Mock exchange with markets
            mock_exchange = MagicMock()
            mock_exchange.markets = {"BTC/USDT": {"active": True}}
            collector.exchange = mock_exchange

            assert collector._validate_symbol("BTC/USDT") is True

    def test_validate_symbol_invalid(self):
        """测试无效交易对验证"""
        with patch("src.collectors.base.ccxt"):
            collector = TickerCollector("binance")
            # Mock exchange with markets
            mock_exchange = MagicMock()
            mock_exchange.markets = {"BTC/USDT": {"active": True}}
            collector.exchange = mock_exchange

            assert collector._validate_symbol("INVALID/USDT") is False

    def test_validate_symbol_no_exchange(self):
        """测试无交易所连接时验证失败"""
        with patch("src.collectors.base.ccxt"):
            collector = TickerCollector("binance")
            collector.exchange = None

            assert collector._validate_symbol("BTC/USDT") is False

    @pytest.mark.asyncio
    async def test_handle_error(self):
        """测试错误处理 - 通用异常"""
        with patch("src.collectors.base.ccxt") as mock_ccxt:
            # Mock ccxt exception types
            mock_ccxt.NetworkError = type("NetworkError", (Exception,), {})
            mock_ccxt.ExchangeError = type("ExchangeError", (Exception,), {})
            mock_ccxt.RateLimitExceeded = type("RateLimitExceeded", (Exception,), {})

            collector = TickerCollector("binance")
            collector.is_running = True

            # 不应该抛出异常
            await collector._handle_error(Exception("Test error"), "测试操作")

            # 采集器应该仍在运行
            assert collector.is_running is True


# ============= 数据验证测试 =============

class TestDataValidation:
    """数据验证测试"""

    def test_ticker_data_decimal_precision(self):
        """测试Ticker数据的Decimal精度"""
        ticker = TickerData(
            exchange="binance",
            symbol="BTC/USDT",
            timestamp=datetime.utcnow(),
            last_price=Decimal("50000.12345678"),
            bid_price=Decimal("49999.99999999"),
        )

        assert ticker.last_price == Decimal("50000.12345678")
        assert ticker.bid_price == Decimal("49999.99999999")

    def test_orderbook_level_ordering(self):
        """测试订单簿档位排序"""
        from src.models.schemas import OrderBookLevel

        bids = [
            OrderBookLevel(price=Decimal("49999"), quantity=Decimal("1.0")),
            OrderBookLevel(price=Decimal("49998"), quantity=Decimal("2.0")),
        ]

        # 买单应该价格从高到低
        assert bids[0].price > bids[1].price

    def test_kline_ohlc_consistency(self):
        """测试K线OHLC一致性"""
        kline = KlineData(
            exchange="binance",
            symbol="BTC/USDT",
            interval="1h",
            timestamp=datetime.utcnow(),
            open_price=Decimal("49000"),
            high_price=Decimal("50500"),
            low_price=Decimal("48500"),
            close_price=Decimal("50000"),
            volume=Decimal("1000"),
        )

        # 最高价应该 >= 开盘价和收盘价
        assert kline.high_price >= kline.open_price
        assert kline.high_price >= kline.close_price

        # 最低价应该 <= 开盘价和收盘价
        assert kline.low_price <= kline.open_price
        assert kline.low_price <= kline.close_price


# ============= 并发测试 =============

class TestConcurrency:
    """并发测试"""

    @pytest.mark.asyncio
    async def test_multiple_symbol_processing(self, mock_exchange, mock_redis, mock_timescale):
        """测试多交易对并发处理"""
        with patch("src.collectors.ticker_collector.redis_cache", mock_redis), \
             patch("src.collectors.ticker_collector.timescale_storage", mock_timescale), \
             patch("src.collectors.base.ccxt"):
            collector = TickerCollector("binance")
            collector.exchange = mock_exchange
            collector.markets = mock_exchange.markets

            symbols = ["BTC/USDT", "ETH/USDT"]
            raw_ticker = {
                "timestamp": int(datetime.utcnow().timestamp() * 1000),
                "last": 50000.0,
            }

            # 并发处理多个交易对
            import asyncio
            await asyncio.gather(
                *[collector._process_ticker(symbol, raw_ticker) for symbol in symbols]
            )

            # 验证所有交易对都被处理
            assert len(collector.batch) == 2
            processed_symbols = {t.symbol for t in collector.batch}
            assert processed_symbols == {"BTC/USDT", "ETH/USDT"}

            await collector.stop()


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--asyncio-mode=auto"])
