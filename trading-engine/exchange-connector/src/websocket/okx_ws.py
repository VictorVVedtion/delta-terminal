"""OKX WebSocket 实现"""
import logging
from typing import Any, Dict, List
from .base import BaseWebSocket

logger = logging.getLogger(__name__)


class OKXWebSocket(BaseWebSocket):
    """OKX WebSocket 连接"""

    def __init__(
        self,
        testnet: bool = False,
        ping_interval: int = 25,
        ping_timeout: int = 10,
        max_reconnect_attempts: int = 10,
    ):
        """
        初始化 OKX WebSocket

        Args:
            testnet: 是否使用模拟盘
            ping_interval: 心跳间隔
            ping_timeout: 心跳超时
            max_reconnect_attempts: 最大重连次数
        """
        if testnet:
            url = "wss://wspap.okx.com:8443/ws/v5/public?brokerId=9999"
        else:
            url = "wss://ws.okx.com:8443/ws/v5/public"

        super().__init__(
            exchange_id="okx",
            url=url,
            ping_interval=ping_interval,
            ping_timeout=ping_timeout,
            max_reconnect_attempts=max_reconnect_attempts,
        )

    async def _build_subscribe_message(self, channel: str, symbol: str) -> Dict[str, Any]:
        """
        构建订阅消息

        Args:
            channel: 频道名称 (ticker, depth, trade, kline)
            symbol: 交易对

        Returns:
            订阅消息
        """
        # OKX 使用 BTC-USDT 格式
        inst_id = self._format_symbol(symbol)
        channel_name, args = self._build_channel_args(channel, inst_id)

        return {
            "op": "subscribe",
            "args": args,
        }

    async def _build_unsubscribe_message(self, channel: str, symbol: str) -> Dict[str, Any]:
        """
        构建取消订阅消息

        Args:
            channel: 频道名称
            symbol: 交易对

        Returns:
            取消订阅消息
        """
        inst_id = self._format_symbol(symbol)
        channel_name, args = self._build_channel_args(channel, inst_id)

        return {
            "op": "unsubscribe",
            "args": args,
        }

    def _format_symbol(self, symbol: str) -> str:
        """
        格式化交易对

        Args:
            symbol: 原始交易对 (BTC/USDT 或 BTCUSDT)

        Returns:
            OKX 格式交易对 (BTC-USDT)
        """
        # 处理 BTC/USDT 格式
        if '/' in symbol:
            return symbol.replace('/', '-').upper()
        # 处理 BTCUSDT 格式 - 假设是现货对
        if 'USDT' in symbol.upper():
            base = symbol.upper().replace('USDT', '')
            return f"{base}-USDT"
        return symbol.upper()

    def _build_channel_args(self, channel: str, inst_id: str) -> tuple:
        """
        构建频道参数

        Args:
            channel: 频道名称
            inst_id: OKX 交易对ID

        Returns:
            (channel_name, args)
        """
        # OKX 频道映射
        channel_map = {
            'ticker': 'tickers',
            'depth': 'books',
            'depth5': 'books5',
            'depth50': 'books50-l2-tbt',
            'trade': 'trades',
            'kline_1m': 'candle1m',
            'kline_5m': 'candle5m',
            'kline_15m': 'candle15m',
            'kline_1H': 'candle1H',
            'kline_1h': 'candle1H',
            'kline_4H': 'candle4H',
            'kline_4h': 'candle4H',
            'kline_1D': 'candle1D',
            'kline_1d': 'candle1D',
        }

        okx_channel = channel_map.get(channel, channel)

        args = [{"channel": okx_channel, "instId": inst_id}]

        return okx_channel, args

    async def _handle_message(self, message: Dict[str, Any]) -> None:
        """
        处理消息

        Args:
            message: 消息内容
        """
        # 处理事件响应消息
        if 'event' in message:
            event = message['event']
            if event == 'subscribe':
                logger.debug(f"OKX 订阅成功: {message.get('arg', {})}")
            elif event == 'unsubscribe':
                logger.debug(f"OKX 取消订阅成功: {message.get('arg', {})}")
            elif event == 'error':
                logger.error(f"OKX 错误: {message.get('msg', message)}")
            return

        # 处理数据消息
        if 'arg' not in message or 'data' not in message:
            logger.debug(f"OKX 收到未知消息: {message}")
            return

        arg = message['arg']
        channel = arg.get('channel', '')
        inst_id = arg.get('instId', '')
        data_list = message.get('data', [])

        # 根据频道类型分发消息
        if channel == 'tickers':
            await self._handle_ticker(inst_id, data_list)
        elif channel.startswith('books'):
            await self._handle_depth(inst_id, data_list, message.get('action'))
        elif channel == 'trades':
            await self._handle_trade(inst_id, data_list)
        elif channel.startswith('candle'):
            interval = channel.replace('candle', '')
            await self._handle_kline(inst_id, interval, data_list)
        else:
            logger.debug(f"OKX 收到未处理的频道: {channel}")

    async def _handle_ticker(self, inst_id: str, data_list: List[Dict]) -> None:
        """处理行情数据"""
        subscription_key = f"ticker:{inst_id}"

        for data in data_list:
            ticker_data = {
                'symbol': inst_id,
                'timestamp': int(data.get('ts', 0)),
                'open': float(data.get('open24h', 0)),
                'high': float(data.get('high24h', 0)),
                'low': float(data.get('low24h', 0)),
                'close': float(data.get('last', 0)),
                'volume': float(data.get('vol24h', 0)),
                'quote_volume': float(data.get('volCcy24h', 0)),
                'bid': float(data.get('bidPx', 0)),
                'bid_volume': float(data.get('bidSz', 0)),
                'ask': float(data.get('askPx', 0)),
                'ask_volume': float(data.get('askSz', 0)),
                'change': float(data.get('last', 0)) - float(data.get('open24h', 0)),
                'change_percent': (
                    (float(data.get('last', 0)) - float(data.get('open24h', 0)))
                    / float(data.get('open24h', 1)) * 100
                    if float(data.get('open24h', 0)) > 0 else 0
                ),
            }

            await self._notify_callbacks(subscription_key, ticker_data)

    async def _handle_depth(
        self,
        inst_id: str,
        data_list: List[Dict],
        action: str = None
    ) -> None:
        """处理深度数据"""
        subscription_key = f"depth:{inst_id}"

        for data in data_list:
            depth_data = {
                'symbol': inst_id,
                'timestamp': int(data.get('ts', 0)),
                'action': action or 'snapshot',
                'checksum': data.get('checksum'),
                'bids': [[float(p), float(q), int(o), int(n)]
                         for p, q, o, n in data.get('bids', [])],
                'asks': [[float(p), float(q), int(o), int(n)]
                         for p, q, o, n in data.get('asks', [])],
            }

            await self._notify_callbacks(subscription_key, depth_data)

    async def _handle_trade(self, inst_id: str, data_list: List[Dict]) -> None:
        """处理成交数据"""
        subscription_key = f"trade:{inst_id}"

        for data in data_list:
            trade_data = {
                'symbol': inst_id,
                'trade_id': data.get('tradeId'),
                'timestamp': int(data.get('ts', 0)),
                'price': float(data.get('px', 0)),
                'quantity': float(data.get('sz', 0)),
                'side': data.get('side', 'buy'),
            }

            await self._notify_callbacks(subscription_key, trade_data)

    async def _handle_kline(
        self,
        inst_id: str,
        interval: str,
        data_list: List[List]
    ) -> None:
        """处理K线数据"""
        subscription_key = f"kline_{interval}:{inst_id}"

        for data in data_list:
            # OKX K线数据格式: [ts, o, h, l, c, vol, volCcy, volCcyQuote, confirm]
            if len(data) >= 8:
                kline_data = {
                    'symbol': inst_id,
                    'timestamp': int(data[0]),
                    'interval': interval,
                    'open': float(data[1]),
                    'high': float(data[2]),
                    'low': float(data[3]),
                    'close': float(data[4]),
                    'volume': float(data[5]),
                    'quote_volume': float(data[7]) if len(data) > 7 else 0,
                    'closed': data[8] == '1' if len(data) > 8 else False,
                }

                await self._notify_callbacks(subscription_key, kline_data)
