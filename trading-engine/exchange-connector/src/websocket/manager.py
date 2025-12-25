"""WebSocket 管理器"""
import logging
from typing import Any, Callable, Dict, Optional
from .base import BaseWebSocket
from .binance_ws import BinanceWebSocket

logger = logging.getLogger(__name__)


class WebSocketManager:
    """WebSocket 连接管理器"""

    def __init__(self):
        """初始化管理器"""
        self.connections: Dict[str, BaseWebSocket] = {}

    def _get_connection_key(self, exchange_id: str, testnet: bool) -> str:
        """获取连接键"""
        return f"{exchange_id}:{'testnet' if testnet else 'mainnet'}"

    async def connect(
        self,
        exchange_id: str,
        testnet: bool = False,
        **kwargs: Any
    ) -> BaseWebSocket:
        """
        连接到交易所 WebSocket

        Args:
            exchange_id: 交易所ID
            testnet: 是否使用测试网
            **kwargs: 额外参数

        Returns:
            WebSocket 连接

        Raises:
            ValueError: 不支持的交易所
        """
        connection_key = self._get_connection_key(exchange_id, testnet)

        # 如果已存在连接，返回现有连接
        if connection_key in self.connections:
            ws = self.connections[connection_key]
            if ws.connected:
                logger.info(f"使用现有的 {exchange_id} WebSocket 连接")
                return ws
            else:
                # 连接已断开，尝试重新连接
                await ws.connect()
                return ws

        # 创建新连接
        ws = self._create_websocket(exchange_id, testnet, **kwargs)
        await ws.connect()

        self.connections[connection_key] = ws
        logger.info(f"创建了新的 {exchange_id} WebSocket 连接")

        return ws

    def _create_websocket(
        self,
        exchange_id: str,
        testnet: bool,
        **kwargs: Any
    ) -> BaseWebSocket:
        """
        创建 WebSocket 实例

        Args:
            exchange_id: 交易所ID
            testnet: 是否使用测试网
            **kwargs: 额外参数

        Returns:
            WebSocket 实例

        Raises:
            ValueError: 不支持的交易所
        """
        exchange_id = exchange_id.lower()

        if exchange_id == 'binance':
            return BinanceWebSocket(testnet=testnet, **kwargs)
        # 可以添加其他交易所的 WebSocket 实现
        # elif exchange_id == 'okx':
        #     return OKXWebSocket(testnet=testnet, **kwargs)
        # elif exchange_id == 'bybit':
        #     return BybitWebSocket(testnet=testnet, **kwargs)
        else:
            raise ValueError(f"不支持的交易所 WebSocket: {exchange_id}")

    async def disconnect(self, exchange_id: str, testnet: bool = False) -> None:
        """
        断开 WebSocket 连接

        Args:
            exchange_id: 交易所ID
            testnet: 是否使用测试网
        """
        connection_key = self._get_connection_key(exchange_id, testnet)

        if connection_key in self.connections:
            ws = self.connections[connection_key]
            await ws.disconnect()
            del self.connections[connection_key]
            logger.info(f"已断开 {exchange_id} WebSocket 连接")

    async def disconnect_all(self) -> None:
        """断开所有 WebSocket 连接"""
        for connection_key, ws in list(self.connections.items()):
            await ws.disconnect()
            logger.info(f"已断开 {connection_key} WebSocket 连接")

        self.connections.clear()

    async def subscribe(
        self,
        exchange_id: str,
        channel: str,
        symbol: str,
        callback: Optional[Callable] = None,
        testnet: bool = False,
    ) -> None:
        """
        订阅频道

        Args:
            exchange_id: 交易所ID
            channel: 频道名称
            symbol: 交易对
            callback: 回调函数
            testnet: 是否使用测试网
        """
        # 确保连接存在
        ws = await self.connect(exchange_id, testnet)

        # 订阅频道
        await ws.subscribe(channel, symbol, callback)

    async def unsubscribe(
        self,
        exchange_id: str,
        channel: str,
        symbol: str,
        testnet: bool = False,
    ) -> None:
        """
        取消订阅

        Args:
            exchange_id: 交易所ID
            channel: 频道名称
            symbol: 交易对
            testnet: 是否使用测试网
        """
        connection_key = self._get_connection_key(exchange_id, testnet)

        if connection_key not in self.connections:
            logger.warning(f"{exchange_id} WebSocket 未连接，无法取消订阅")
            return

        ws = self.connections[connection_key]
        await ws.unsubscribe(channel, symbol)

    def get_connection(
        self,
        exchange_id: str,
        testnet: bool = False
    ) -> Optional[BaseWebSocket]:
        """
        获取 WebSocket 连接

        Args:
            exchange_id: 交易所ID
            testnet: 是否使用测试网

        Returns:
            WebSocket 连接或 None
        """
        connection_key = self._get_connection_key(exchange_id, testnet)
        return self.connections.get(connection_key)

    def get_all_connections(self) -> Dict[str, BaseWebSocket]:
        """
        获取所有连接

        Returns:
            连接字典
        """
        return self.connections.copy()

    def is_connected(self, exchange_id: str, testnet: bool = False) -> bool:
        """
        检查是否已连接

        Args:
            exchange_id: 交易所ID
            testnet: 是否使用测试网

        Returns:
            是否已连接
        """
        connection_key = self._get_connection_key(exchange_id, testnet)

        if connection_key not in self.connections:
            return False

        return self.connections[connection_key].connected


# 全局单例
_ws_manager: Optional[WebSocketManager] = None


def get_ws_manager() -> WebSocketManager:
    """
    获取全局 WebSocket 管理器

    Returns:
        WebSocket 管理器
    """
    global _ws_manager
    if _ws_manager is None:
        _ws_manager = WebSocketManager()
    return _ws_manager
