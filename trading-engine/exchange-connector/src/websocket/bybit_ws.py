"""Bybit WebSocket 实现"""
import logging
import time
from typing import Any, Dict, List
from .base import BaseWebSocket

logger = logging.getLogger(__name__)


class BybitWebSocket(BaseWebSocket):
    """Bybit WebSocket 连接"""

    def __init__(
        self,
        testnet: bool = False,
        category: str = "spot",
        ping_interval: int = 20,
        ping_timeout: int = 10,
        max_reconnect_attempts: int = 10,
    ):
        """
        初始化 Bybit WebSocket

        Args:
            testnet: 是否使用测试网
            category: 市场类型 (spot, linear, inverse, option)
            ping_interval: 心跳间隔
            ping_timeout: 心跳超时
            max_reconnect_attempts: 最大重连次数
        """
        self.category = category

        if testnet:
            base_url = "wss://stream-testnet.bybit.com"
        else:
            base_url = "wss://stream.bybit.com"

        url = f"{base_url}/v5/public/{category}"

        super().__init__(
            exchange_id="bybit",
            url=url,
            ping_interval=ping_interval,
            ping_timeout=ping_timeout,
            max_reconnect_attempts=max_reconnect_attempts,
        )

        self.req_id = 1

    async def _build_subscribe_message(self, channel: str, symbol: str) -> Dict[str, Any]:
        """
        构建订阅消息

        Args:
            channel: 频道名称 (ticker, depth, trade, kline)
            symbol: 交易对

        Returns:
            订阅消息
        """
        # Bybit 使用 BTCUSDT 格式
        formatted_symbol = self._format_symbol(symbol)
        topic = self._build_topic(channel, formatted_symbol)

        message = {
            "op": "subscribe",
            "args": [topic],
            "req_id": str(self.req_id),
        }

        self.req_id += 1
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
        formatted_symbol = self._format_symbol(symbol)
        topic = self._build_topic(channel, formatted_symbol)

        message = {
            "op": "unsubscribe",
            "args": [topic],
            "req_id": str(self.req_id),
        }

        self.req_id += 1
        return message

    def _format_symbol(self, symbol: str) -> str:
        """
        格式化交易对

        Args:
            symbol: 原始交易对 (BTC/USDT 或 BTC-USDT)

        Returns:
            Bybit 格式交易对 (BTCUSDT)
        """
        return symbol.replace('/', '').replace('-', '').upper()

    def _build_topic(self, channel: str, symbol: str) -> str:
        """
        构建主题名称

        Args:
            channel: 频道名称
            symbol: 交易对

        Returns:
            主题名称
        """
        # Bybit 频道映射
        topic_map = {
            'ticker': f"tickers.{symbol}",
            'depth': f"orderbook.50.{symbol}",
            'depth1': f"orderbook.1.{symbol}",
            'depth50': f"orderbook.50.{symbol}",
            'depth200': f"orderbook.200.{symbol}",
            'depth500': f"orderbook.500.{symbol}",
            'trade': f"publicTrade.{symbol}",
            'kline_1': f"kline.1.{symbol}",
            'kline_1m': f"kline.1.{symbol}",
            'kline_3': f"kline.3.{symbol}",
            'kline_5': f"kline.5.{symbol}",
            'kline_5m': f"kline.5.{symbol}",
            'kline_15': f"kline.15.{symbol}",
            'kline_15m': f"kline.15.{symbol}",
            'kline_30': f"kline.30.{symbol}",
            'kline_60': f"kline.60.{symbol}",
            'kline_1h': f"kline.60.{symbol}",
            'kline_240': f"kline.240.{symbol}",
            'kline_4h': f"kline.240.{symbol}",
            'kline_D': f"kline.D.{symbol}",
            'kline_1d': f"kline.D.{symbol}",
            'kline_W': f"kline.W.{symbol}",
            'kline_M': f"kline.M.{symbol}",
        }

        return topic_map.get(channel, f"{channel}.{symbol}")

    async def _handle_message(self, message: Dict[str, Any]) -> None:
        """
        处理消息

        Args:
            message: 消息内容
        """
        # 处理订阅响应
        if 'success' in message:
            if message['success']:
                logger.debug(f"Bybit 订阅成功: {message.get('req_id')}")
            else:
                logger.error(f"Bybit 订阅失败: {message.get('ret_msg')}")
            return

        # 处理 pong 响应
        if message.get('op') == 'pong':
            logger.debug("Bybit WebSocket pong received")
            return

        # 处理数据消息
        topic = message.get('topic', '')
        data = message.get('data')
        msg_type = message.get('type', '')

        if not topic or data is None:
            logger.debug(f"Bybit 收到未知消息: {message}")
            return

        # 解析主题
        topic_parts = topic.split('.')
        if len(topic_parts) < 2:
            return

        channel_type = topic_parts[0]
        symbol = topic_parts[-1]

        # 根据频道类型分发消息
        if channel_type == 'tickers':
            await self._handle_ticker(symbol, data)
        elif channel_type == 'orderbook':
            depth_level = topic_parts[1] if len(topic_parts) > 2 else '50'
            await self._handle_depth(symbol, data, msg_type, depth_level)
        elif channel_type == 'publicTrade':
            await self._handle_trade(symbol, data)
        elif channel_type == 'kline':
            interval = topic_parts[1] if len(topic_parts) > 2 else '1'
            await self._handle_kline(symbol, interval, data)
        else:
            logger.debug(f"Bybit 收到未处理的频道: {channel_type}")

    async def _handle_ticker(self, symbol: str, data: Dict[str, Any]) -> None:
        """处理行情数据"""
        subscription_key = f"ticker:{symbol}"

        # Bybit ticker 可能是单个对象或列表
        ticker_list = data if isinstance(data, list) else [data]

        for ticker in ticker_list:
            ticker_data = {
                'symbol': symbol,
                'timestamp': int(ticker.get('ts', time.time() * 1000)),
                'open': float(ticker.get('prevPrice24h', 0)),
                'high': float(ticker.get('highPrice24h', 0)),
                'low': float(ticker.get('lowPrice24h', 0)),
                'close': float(ticker.get('lastPrice', 0)),
                'volume': float(ticker.get('volume24h', 0)),
                'quote_volume': float(ticker.get('turnover24h', 0)),
                'bid': float(ticker.get('bid1Price', 0)),
                'bid_volume': float(ticker.get('bid1Size', 0)),
                'ask': float(ticker.get('ask1Price', 0)),
                'ask_volume': float(ticker.get('ask1Size', 0)),
                'change': float(ticker.get('price24hPcnt', 0)) * float(ticker.get('prevPrice24h', 0)),
                'change_percent': float(ticker.get('price24hPcnt', 0)) * 100,
            }

            await self._notify_callbacks(subscription_key, ticker_data)

    async def _handle_depth(
        self,
        symbol: str,
        data: Dict[str, Any],
        msg_type: str,
        depth_level: str
    ) -> None:
        """处理深度数据"""
        subscription_key = f"depth:{symbol}"

        depth_data = {
            'symbol': symbol,
            'timestamp': int(data.get('ts', time.time() * 1000)),
            'type': msg_type,  # snapshot or delta
            'update_id': data.get('u'),
            'seq': data.get('seq'),
            'bids': [[float(p), float(q)] for p, q in data.get('b', [])],
            'asks': [[float(p), float(q)] for p, q in data.get('a', [])],
        }

        await self._notify_callbacks(subscription_key, depth_data)

    async def _handle_trade(self, symbol: str, data: List[Dict]) -> None:
        """处理成交数据"""
        subscription_key = f"trade:{symbol}"

        # Bybit trade 是列表
        trade_list = data if isinstance(data, list) else [data]

        for trade in trade_list:
            trade_data = {
                'symbol': symbol,
                'trade_id': trade.get('i'),
                'timestamp': int(trade.get('T', time.time() * 1000)),
                'price': float(trade.get('p', 0)),
                'quantity': float(trade.get('v', 0)),
                'side': trade.get('S', 'Buy').lower(),
                'is_block_trade': trade.get('BT', False),
            }

            await self._notify_callbacks(subscription_key, trade_data)

    async def _handle_kline(
        self,
        symbol: str,
        interval: str,
        data: List[Dict]
    ) -> None:
        """处理K线数据"""
        subscription_key = f"kline_{interval}:{symbol}"

        # Bybit kline 是列表
        kline_list = data if isinstance(data, list) else [data]

        for kline in kline_list:
            kline_data = {
                'symbol': symbol,
                'timestamp': int(kline.get('start', 0)),
                'close_timestamp': int(kline.get('end', 0)),
                'interval': interval,
                'open': float(kline.get('open', 0)),
                'high': float(kline.get('high', 0)),
                'low': float(kline.get('low', 0)),
                'close': float(kline.get('close', 0)),
                'volume': float(kline.get('volume', 0)),
                'quote_volume': float(kline.get('turnover', 0)),
                'closed': kline.get('confirm', False),
            }

            await self._notify_callbacks(subscription_key, kline_data)

    async def send_ping(self) -> None:
        """发送 ping 消息"""
        if self.ws and self.connected:
            ping_message = {"op": "ping"}
            import json
            await self.ws.send(json.dumps(ping_message))
            logger.debug("Bybit WebSocket ping sent")
