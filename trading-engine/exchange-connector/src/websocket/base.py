"""WebSocket 基类"""
import asyncio
import json
import logging
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional, Set
import websockets
from websockets.client import WebSocketClientProtocol
import backoff

logger = logging.getLogger(__name__)


class BaseWebSocket(ABC):
    """WebSocket 连接基类"""

    def __init__(
        self,
        exchange_id: str,
        url: str,
        ping_interval: int = 30,
        ping_timeout: int = 10,
        max_reconnect_attempts: int = 10,
    ):
        """
        初始化 WebSocket

        Args:
            exchange_id: 交易所ID
            url: WebSocket URL
            ping_interval: 心跳间隔（秒）
            ping_timeout: 心跳超时（秒）
            max_reconnect_attempts: 最大重连次数
        """
        self.exchange_id = exchange_id
        self.url = url
        self.ping_interval = ping_interval
        self.ping_timeout = ping_timeout
        self.max_reconnect_attempts = max_reconnect_attempts

        self.ws: Optional[WebSocketClientProtocol] = None
        self.connected = False
        self.subscriptions: Set[str] = set()
        self.callbacks: Dict[str, List[Callable]] = {}

        # 任务管理
        self._receive_task: Optional[asyncio.Task] = None
        self._ping_task: Optional[asyncio.Task] = None
        self._reconnect_count = 0

    @abstractmethod
    async def _build_subscribe_message(self, channel: str, symbol: str) -> Dict[str, Any]:
        """
        构建订阅消息

        Args:
            channel: 频道名称
            symbol: 交易对

        Returns:
            订阅消息
        """
        pass

    @abstractmethod
    async def _build_unsubscribe_message(self, channel: str, symbol: str) -> Dict[str, Any]:
        """
        构建取消订阅消息

        Args:
            channel: 频道名称
            symbol: 交易对

        Returns:
            取消订阅消息
        """
        pass

    @abstractmethod
    async def _handle_message(self, message: Dict[str, Any]) -> None:
        """
        处理接收到的消息

        Args:
            message: 消息内容
        """
        pass

    @backoff.on_exception(
        backoff.expo,
        (websockets.exceptions.WebSocketException, ConnectionError),
        max_tries=10,
        max_time=300,
    )
    async def connect(self) -> None:
        """连接到 WebSocket"""
        try:
            logger.info(f"正在连接到 {self.exchange_id} WebSocket: {self.url}")

            self.ws = await websockets.connect(
                self.url,
                ping_interval=self.ping_interval,
                ping_timeout=self.ping_timeout,
            )

            self.connected = True
            self._reconnect_count = 0

            logger.info(f"已连接到 {self.exchange_id} WebSocket")

            # 启动接收任务
            self._receive_task = asyncio.create_task(self._receive_loop())

            # 启动心跳任务
            self._ping_task = asyncio.create_task(self._ping_loop())

            # 重新订阅
            await self._resubscribe()

        except Exception as e:
            logger.error(f"连接到 {self.exchange_id} WebSocket 失败: {e}")
            self.connected = False
            raise

    async def disconnect(self) -> None:
        """断开 WebSocket 连接"""
        logger.info(f"正在断开 {self.exchange_id} WebSocket 连接")

        self.connected = False

        # 取消任务
        if self._receive_task:
            self._receive_task.cancel()
            try:
                await self._receive_task
            except asyncio.CancelledError:
                pass

        if self._ping_task:
            self._ping_task.cancel()
            try:
                await self._ping_task
            except asyncio.CancelledError:
                pass

        # 关闭连接
        if self.ws:
            await self.ws.close()
            self.ws = None

        logger.info(f"已断开 {self.exchange_id} WebSocket 连接")

    async def subscribe(self, channel: str, symbol: str, callback: Optional[Callable] = None) -> None:
        """
        订阅频道

        Args:
            channel: 频道名称
            symbol: 交易对
            callback: 回调函数
        """
        subscription_key = f"{channel}:{symbol}"

        if subscription_key in self.subscriptions:
            logger.warning(f"已订阅 {subscription_key}，跳过")
            return

        # 构建订阅消息
        message = await self._build_subscribe_message(channel, symbol)

        # 发送订阅消息
        if self.ws and self.connected:
            await self.ws.send(json.dumps(message))
            logger.info(f"已订阅 {self.exchange_id} {subscription_key}")

        # 保存订阅信息
        self.subscriptions.add(subscription_key)

        # 注册回调
        if callback:
            if subscription_key not in self.callbacks:
                self.callbacks[subscription_key] = []
            self.callbacks[subscription_key].append(callback)

    async def unsubscribe(self, channel: str, symbol: str) -> None:
        """
        取消订阅

        Args:
            channel: 频道名称
            symbol: 交易对
        """
        subscription_key = f"{channel}:{symbol}"

        if subscription_key not in self.subscriptions:
            logger.warning(f"未订阅 {subscription_key}，跳过")
            return

        # 构建取消订阅消息
        message = await self._build_unsubscribe_message(channel, symbol)

        # 发送取消订阅消息
        if self.ws and self.connected:
            await self.ws.send(json.dumps(message))
            logger.info(f"已取消订阅 {self.exchange_id} {subscription_key}")

        # 移除订阅信息
        self.subscriptions.discard(subscription_key)
        self.callbacks.pop(subscription_key, None)

    async def _receive_loop(self) -> None:
        """接收消息循环"""
        while self.connected and self.ws:
            try:
                message = await self.ws.recv()

                # 解析消息
                if isinstance(message, str):
                    data = json.loads(message)
                else:
                    data = message

                # 处理消息
                await self._handle_message(data)

            except websockets.exceptions.ConnectionClosed:
                logger.warning(f"{self.exchange_id} WebSocket 连接已关闭")
                self.connected = False
                await self._reconnect()
                break

            except json.JSONDecodeError as e:
                logger.error(f"解析消息失败: {e}, 原始消息: {message}")

            except Exception as e:
                logger.error(f"处理消息时发生错误: {e}")

    async def _ping_loop(self) -> None:
        """心跳循环"""
        while self.connected and self.ws:
            try:
                await asyncio.sleep(self.ping_interval)

                if self.ws and self.connected:
                    pong = await self.ws.ping()
                    await asyncio.wait_for(pong, timeout=self.ping_timeout)
                    logger.debug(f"{self.exchange_id} WebSocket ping 成功")

            except asyncio.TimeoutError:
                logger.warning(f"{self.exchange_id} WebSocket ping 超时")
                self.connected = False
                await self._reconnect()
                break

            except Exception as e:
                logger.error(f"{self.exchange_id} WebSocket ping 失败: {e}")
                self.connected = False
                await self._reconnect()
                break

    async def _reconnect(self) -> None:
        """重连"""
        if self._reconnect_count >= self.max_reconnect_attempts:
            logger.error(f"{self.exchange_id} WebSocket 重连次数超过限制，放弃重连")
            return

        self._reconnect_count += 1
        delay = min(2 ** self._reconnect_count, 60)

        logger.info(
            f"{self.exchange_id} WebSocket 将在 {delay} 秒后尝试第 "
            f"{self._reconnect_count} 次重连"
        )

        await asyncio.sleep(delay)

        try:
            await self.connect()
        except Exception as e:
            logger.error(f"{self.exchange_id} WebSocket 重连失败: {e}")

    async def _resubscribe(self) -> None:
        """重新订阅所有频道"""
        if not self.subscriptions:
            return

        logger.info(f"正在重新订阅 {len(self.subscriptions)} 个频道")

        for subscription_key in list(self.subscriptions):
            try:
                channel, symbol = subscription_key.split(':', 1)
                message = await self._build_subscribe_message(channel, symbol)

                if self.ws and self.connected:
                    await self.ws.send(json.dumps(message))
                    logger.debug(f"重新订阅 {subscription_key}")

            except Exception as e:
                logger.error(f"重新订阅 {subscription_key} 失败: {e}")

    async def _notify_callbacks(self, subscription_key: str, data: Any) -> None:
        """
        通知回调函数

        Args:
            subscription_key: 订阅键
            data: 数据
        """
        if subscription_key not in self.callbacks:
            return

        for callback in self.callbacks[subscription_key]:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(data)
                else:
                    callback(data)
            except Exception as e:
                logger.error(f"执行回调函数时发生错误: {e}")
