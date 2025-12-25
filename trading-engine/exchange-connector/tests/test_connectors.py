"""连接器测试"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from src.connectors.binance import BinanceConnector
from src.connectors.factory import ConnectorFactory


class TestConnectorFactory:
    """连接器工厂测试"""

    def test_get_supported_exchanges(self):
        """测试获取支持的交易所列表"""
        exchanges = ConnectorFactory.get_supported_exchanges()
        assert 'binance' in exchanges
        assert 'okx' in exchanges
        assert 'bybit' in exchanges

    def test_create_connector_binance(self):
        """测试创建币安连接器"""
        connector = ConnectorFactory.create_connector(
            exchange_id='binance',
            api_key='test_key',
            api_secret='test_secret',
            singleton=False,
        )
        assert isinstance(connector, BinanceConnector)
        assert connector.exchange_id == 'binance'

    def test_create_connector_invalid(self):
        """测试创建不支持的交易所"""
        with pytest.raises(ValueError, match="不支持的交易所"):
            ConnectorFactory.create_connector(
                exchange_id='invalid_exchange',
                singleton=False,
            )

    def test_singleton_mode(self):
        """测试单例模式"""
        connector1 = ConnectorFactory.create_connector(
            exchange_id='binance',
            singleton=True,
        )
        connector2 = ConnectorFactory.create_connector(
            exchange_id='binance',
            singleton=True,
        )
        assert connector1 is connector2

    def test_non_singleton_mode(self):
        """测试非单例模式"""
        connector1 = ConnectorFactory.create_connector(
            exchange_id='binance',
            singleton=False,
        )
        connector2 = ConnectorFactory.create_connector(
            exchange_id='binance',
            singleton=False,
        )
        assert connector1 is not connector2


class TestBinanceConnector:
    """币安连接器测试"""

    @pytest.fixture
    def connector(self):
        """创建连接器实例"""
        return BinanceConnector(
            exchange_id='binance',
            api_key='test_key',
            api_secret='test_secret',
            testnet=True,
        )

    def test_create_exchange(self, connector):
        """测试创建交易所实例"""
        assert connector.exchange is not None
        assert connector.exchange.id == 'binance'

    @pytest.mark.asyncio
    async def test_connect(self, connector):
        """测试连接"""
        with patch.object(connector.exchange, 'load_markets', new_callable=AsyncMock):
            result = await connector.connect()
            assert result is True
            assert connector.connected is True

    @pytest.mark.asyncio
    async def test_disconnect(self, connector):
        """测试断开连接"""
        with patch.object(connector.exchange, 'close', new_callable=AsyncMock):
            await connector.disconnect()
            assert connector.connected is False

    @pytest.mark.asyncio
    async def test_fetch_ticker(self, connector):
        """测试获取行情"""
        mock_ticker = {
            'symbol': 'BTC/USDT',
            'timestamp': 1234567890,
            'datetime': '2023-01-01T00:00:00.000Z',
            'high': 50000.0,
            'low': 49000.0,
            'bid': 49500.0,
            'ask': 49600.0,
            'last': 49550.0,
            'close': 49550.0,
            'baseVolume': 1000.0,
            'quoteVolume': 49550000.0,
            'info': {},
        }

        with patch.object(
            connector.exchange,
            'fetch_ticker',
            new_callable=AsyncMock,
            return_value=mock_ticker
        ):
            ticker = await connector.fetch_ticker('BTC/USDT')
            assert ticker.symbol == 'BTC/USDT'
            assert ticker.last == 49550.0

    @pytest.mark.asyncio
    async def test_set_market_type(self, connector):
        """测试设置市场类型"""
        await connector.set_market_type('spot')
        assert connector.exchange.options['defaultType'] == 'spot'

        await connector.set_market_type('future')
        assert connector.exchange.options['defaultType'] == 'future'

        with pytest.raises(ValueError):
            await connector.set_market_type('invalid_type')


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
