"""币安 WebSocket 实现"""
import logging
from typing import Any, Dict
from .base import BaseWebSocket

logger = logging.getLogger(__name__)


class BinanceWebSocket(BaseWebSocket):
    """币安 WebSocket 连接"""

    def __init__(
        self,
        testnet: bool = False,
        ping_interval: int = 30,
        ping_timeout: int = 10,
        max_reconnect_attempts: int = 10,
    ):
        """
        初始化币安 WebSocket

        Args:
            testnet: 是否使用测试网
            ping_interval: 心跳间隔
            ping_timeout: 心跳超时
            max_reconnect_attempts: 最大重连次数
        """
        if testnet:
            url = "wss://testnet.binance.vision/ws"
        else:
            url = "wss://stream.binance.com:9443/ws"

        super().__init__(
            exchange_id="binance",
            url=url,
            ping_interval=ping_interval,
            ping_timeout=ping_timeout,
            max_reconnect_attempts=max_reconnect_attempts,
        )

        self.stream_id = 1

    async def _build_subscribe_message(self, channel: str, symbol: str) -> Dict[str, Any]:
        """
        构建订阅消息

        Args:
            channel: 频道名称 (ticker, depth, trade, kline)
            symbol: 交易对

        Returns:
            订阅消息
        """
        # 币安使用小写交易对
        symbol = symbol.lower().replace('/', '')

        # 构建流名称
        stream_name = self._build_stream_name(channel, symbol)

        message = {
            "method": "SUBSCRIBE",
            "params": [stream_name],
            "id": self.stream_id,
        }

        self.stream_id += 1
        return message

    async def _build_unsubscribe_message(self, channel: str, symbol: str) -> Dict[str, Any]:
        """
        构建取消订阅消息

        Args:
            channel: 频道名称
            symbol: 交易对

        Returns:
            取消订阅消息
        """
        symbol = symbol.lower().replace('/', '')
        stream_name = self._build_stream_name(channel, symbol)

        message = {
            "method": "UNSUBSCRIBE",
            "params": [stream_name],
            "id": self.stream_id,
        }

        self.stream_id += 1
        return message

    def _build_stream_name(self, channel: str, symbol: str) -> str:
        """
        构建流名称

        Args:
            channel: 频道名称
            symbol: 交易对

        Returns:
            流名称
        """
        channel_map = {
            'ticker': f"{symbol}@ticker",
            'depth': f"{symbol}@depth",
            'depth5': f"{symbol}@depth5",
            'depth10': f"{symbol}@depth10",
            'depth20': f"{symbol}@depth20",
            'trade': f"{symbol}@trade",
            'aggTrade': f"{symbol}@aggTrade",
            'kline_1m': f"{symbol}@kline_1m",
            'kline_5m': f"{symbol}@kline_5m",
            'kline_15m': f"{symbol}@kline_15m",
            'kline_1h': f"{symbol}@kline_1h",
            'kline_4h': f"{symbol}@kline_4h",
            'kline_1d': f"{symbol}@kline_1d",
        }

        return channel_map.get(channel, f"{symbol}@{channel}")

    async def _handle_message(self, message: Dict[str, Any]) -> None:
        """
        处理消息

        Args:
            message: 消息内容
        """
        # 处理响应消息
        if 'result' in message:
            if message['result'] is None:
                logger.debug(f"订阅/取消订阅成功: {message}")
            return

        # 处理错误消息
        if 'error' in message:
            logger.error(f"收到错误消息: {message}")
            return

        # 处理数据消息
        if 'e' not in message:
            logger.debug(f"收到未知消息: {message}")
            return

        event_type = message['e']
        symbol = message.get('s', '').upper()

        # 根据事件类型分发消息
        if event_type == '24hrTicker':
            await self._handle_ticker(symbol, message)
        elif event_type == 'depthUpdate':
            await self._handle_depth(symbol, message)
        elif event_type == 'trade':
            await self._handle_trade(symbol, message)
        elif event_type == 'aggTrade':
            await self._handle_agg_trade(symbol, message)
        elif event_type == 'kline':
            await self._handle_kline(symbol, message)
        else:
            logger.debug(f"收到未处理的事件类型: {event_type}")

    async def _handle_ticker(self, symbol: str, data: Dict[str, Any]) -> None:
        """处理行情数据"""
        subscription_key = f"ticker:{symbol}"

        ticker_data = {
            'symbol': symbol,
            'timestamp': data.get('E'),
            'open': float(data.get('o', 0)),
            'high': float(data.get('h', 0)),
            'low': float(data.get('l', 0)),
            'close': float(data.get('c', 0)),
            'volume': float(data.get('v', 0)),
            'quote_volume': float(data.get('q', 0)),
            'bid': float(data.get('b', 0)),
            'bid_volume': float(data.get('B', 0)),
            'ask': float(data.get('a', 0)),
            'ask_volume': float(data.get('A', 0)),
            'change': float(data.get('p', 0)),
            'change_percent': float(data.get('P', 0)),
        }

        await self._notify_callbacks(subscription_key, ticker_data)

    async def _handle_depth(self, symbol: str, data: Dict[str, Any]) -> None:
        """处理深度数据"""
        subscription_key = f"depth:{symbol}"

        depth_data = {
            'symbol': symbol,
            'timestamp': data.get('E'),
            'first_update_id': data.get('U'),
            'last_update_id': data.get('u'),
            'bids': [[float(p), float(q)] for p, q in data.get('b', [])],
            'asks': [[float(p), float(q)] for p, q in data.get('a', [])],
        }

        await self._notify_callbacks(subscription_key, depth_data)

    async def _handle_trade(self, symbol: str, data: Dict[str, Any]) -> None:
        """处理成交数据"""
        subscription_key = f"trade:{symbol}"

        trade_data = {
            'symbol': symbol,
            'trade_id': data.get('t'),
            'timestamp': data.get('T'),
            'price': float(data.get('p', 0)),
            'quantity': float(data.get('q', 0)),
            'side': 'sell' if data.get('m') else 'buy',
        }

        await self._notify_callbacks(subscription_key, trade_data)

    async def _handle_agg_trade(self, symbol: str, data: Dict[str, Any]) -> None:
        """处理聚合成交数据"""
        subscription_key = f"aggTrade:{symbol}"

        trade_data = {
            'symbol': symbol,
            'agg_trade_id': data.get('a'),
            'timestamp': data.get('T'),
            'price': float(data.get('p', 0)),
            'quantity': float(data.get('q', 0)),
            'first_trade_id': data.get('f'),
            'last_trade_id': data.get('l'),
            'side': 'sell' if data.get('m') else 'buy',
        }

        await self._notify_callbacks(subscription_key, trade_data)

    async def _handle_kline(self, symbol: str, data: Dict[str, Any]) -> None:
        """处理K线数据"""
        kline = data.get('k', {})
        interval = kline.get('i', '')
        subscription_key = f"kline_{interval}:{symbol}"

        kline_data = {
            'symbol': symbol,
            'timestamp': kline.get('t'),
            'close_timestamp': kline.get('T'),
            'interval': interval,
            'open': float(kline.get('o', 0)),
            'high': float(kline.get('h', 0)),
            'low': float(kline.get('l', 0)),
            'close': float(kline.get('c', 0)),
            'volume': float(kline.get('v', 0)),
            'quote_volume': float(kline.get('q', 0)),
            'trades': kline.get('n', 0),
            'closed': kline.get('x', False),
        }

        await self._notify_callbacks(subscription_key, kline_data)
