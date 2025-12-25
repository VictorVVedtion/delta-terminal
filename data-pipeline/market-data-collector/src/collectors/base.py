"""
基础数据采集器
"""
import logging
from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
import asyncio

import ccxt.async_support as ccxt

from src.config import settings

logger = logging.getLogger(__name__)


class BaseCollector(ABC):
    """基础采集器抽象类"""

    def __init__(self, exchange_name: str):
        self.exchange_name = exchange_name
        self.exchange: ccxt.Exchange | None = None
        self.is_running = False
        self._tasks: List[asyncio.Task] = []

    async def initialize(self) -> None:
        """初始化交易所连接"""
        try:
            exchange_class = getattr(ccxt, self.exchange_name)
            self.exchange = exchange_class(
                {
                    "enableRateLimit": True,
                    "options": {"defaultType": "spot"},
                }
            )

            # 加载市场数据
            await self.exchange.load_markets()
            logger.info(f"{self.exchange_name} 交易所初始化成功")

        except Exception as e:
            logger.error(f"{self.exchange_name} 交易所初始化失败: {e}")
            raise

    async def shutdown(self) -> None:
        """关闭连接"""
        self.is_running = False

        # 取消所有任务
        for task in self._tasks:
            task.cancel()

        if self._tasks:
            await asyncio.gather(*self._tasks, return_exceptions=True)

        if self.exchange:
            await self.exchange.close()
            logger.info(f"{self.exchange_name} 交易所连接已关闭")

    @abstractmethod
    async def start(self, symbols: List[str]) -> None:
        """启动采集"""
        pass

    @abstractmethod
    async def stop(self) -> None:
        """停止采集"""
        pass

    def _validate_symbol(self, symbol: str) -> bool:
        """验证交易对是否有效"""
        if not self.exchange:
            return False

        return symbol in self.exchange.markets

    def _get_ccxt_symbol(self, symbol: str) -> str:
        """转换为 CCXT 格式的交易对"""
        # 统一格式 BTCUSDT -> BTC/USDT
        if "/" not in symbol:
            # 尝试常见的分隔方式
            for quote in ["USDT", "USDC", "BTC", "ETH", "BNB"]:
                if symbol.endswith(quote):
                    base = symbol[: -len(quote)]
                    return f"{base}/{quote}"
        return symbol

    async def _handle_error(self, error: Exception, context: str) -> None:
        """统一错误处理"""
        logger.error(f"{self.exchange_name} - {context}: {error}")

        # 特定错误处理
        if isinstance(error, ccxt.NetworkError):
            logger.warning(f"网络错误，等待重试: {error}")
            await asyncio.sleep(5)
        elif isinstance(error, ccxt.ExchangeError):
            logger.error(f"交易所错误: {error}")
        elif isinstance(error, ccxt.RateLimitExceeded):
            logger.warning(f"速率限制，等待重试: {error}")
            await asyncio.sleep(10)

    async def _retry_on_error(
        self,
        func,
        *args,
        max_retries: int = 3,
        retry_delay: int = 5,
        **kwargs,
    ) -> Optional[Any]:
        """错误重试装饰器"""
        for attempt in range(max_retries):
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                if attempt == max_retries - 1:
                    await self._handle_error(e, func.__name__)
                    return None
                else:
                    logger.warning(
                        f"{func.__name__} 失败，重试 {attempt + 1}/{max_retries}"
                    )
                    await asyncio.sleep(retry_delay)
        return None


class WebSocketCollector(BaseCollector):
    """WebSocket 采集器基类"""

    def __init__(self, exchange_name: str):
        super().__init__(exchange_name)
        self.ws_connections: Dict[str, Any] = {}

    async def _connect_websocket(self, symbol: str) -> None:
        """连接 WebSocket (子类实现)"""
        pass

    async def _handle_websocket_message(self, message: Dict[str, Any]) -> None:
        """处理 WebSocket 消息 (子类实现)"""
        pass

    async def shutdown(self) -> None:
        """关闭 WebSocket 连接"""
        # 关闭所有 WebSocket 连接
        for symbol, ws in self.ws_connections.items():
            try:
                if hasattr(ws, "close"):
                    await ws.close()
                logger.info(f"关闭 {symbol} WebSocket 连接")
            except Exception as e:
                logger.error(f"关闭 WebSocket 失败: {e}")

        await super().shutdown()


class PollingCollector(BaseCollector):
    """轮询采集器基类"""

    def __init__(self, exchange_name: str, interval: int = 1):
        super().__init__(exchange_name)
        self.interval = interval

    async def _polling_loop(self, symbols: List[str]) -> None:
        """轮询循环 (子类实现)"""
        pass

    async def start(self, symbols: List[str]) -> None:
        """启动轮询"""
        self.is_running = True
        task = asyncio.create_task(self._polling_loop(symbols))
        self._tasks.append(task)

    async def stop(self) -> None:
        """停止轮询"""
        self.is_running = False
