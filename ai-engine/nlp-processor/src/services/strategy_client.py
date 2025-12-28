"""
Strategy Service Client

调用策略服务的 HTTP 客户端
"""

import logging
from typing import Any, Dict, List, Optional

import httpx

from ..config import get_settings

logger = logging.getLogger(__name__)


class StrategyServiceError(Exception):
    """策略服务错误"""

    def __init__(self, message: str, status_code: Optional[int] = None):
        super().__init__(message)
        self.status_code = status_code


class StrategyClient:
    """策略服务客户端"""

    def __init__(self, base_url: Optional[str] = None, timeout: float = 30.0):
        """
        初始化策略服务客户端

        Args:
            base_url: 策略服务基础 URL
            timeout: 请求超时时间（秒）
        """
        settings = get_settings()
        self.base_url = base_url or settings.strategy_service_url
        self.timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """获取 HTTP 客户端"""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=self.timeout,
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
            )
        return self._client

    async def close(self) -> None:
        """关闭客户端连接"""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    async def create_strategy(
        self,
        name: str,
        symbol: str,
        strategy_type: str,
        config: Dict[str, Any],
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        创建策略

        Args:
            name: 策略名称
            symbol: 交易对
            strategy_type: 策略类型
            config: 策略配置
            user_id: 用户 ID

        Returns:
            创建的策略数据（包含 strategy_id）
        """
        client = await self._get_client()

        payload = {
            "name": name,
            "symbol": symbol,
            "type": strategy_type,
            "config": config,
        }

        if user_id:
            payload["userId"] = user_id

        try:
            response = await client.post("/", json=payload)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"Strategy service error: {e.response.status_code} - {e.response.text}")
            raise StrategyServiceError(
                f"创建策略失败: {e.response.text}",
                status_code=e.response.status_code,
            )
        except httpx.RequestError as e:
            logger.error(f"Strategy service request error: {e}")
            raise StrategyServiceError(f"策略服务连接失败: {str(e)}")

    async def get_strategy(self, strategy_id: str) -> Optional[Dict[str, Any]]:
        """
        获取策略详情

        Args:
            strategy_id: 策略 ID

        Returns:
            策略数据，不存在则返回 None
        """
        client = await self._get_client()

        try:
            response = await client.get(f"/{strategy_id}")
            if response.status_code == 404:
                return None
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"Get strategy error: {e.response.status_code}")
            raise StrategyServiceError(
                f"获取策略失败: {e.response.text}",
                status_code=e.response.status_code,
            )
        except httpx.RequestError as e:
            logger.error(f"Strategy service request error: {e}")
            raise StrategyServiceError(f"策略服务连接失败: {str(e)}")

    async def list_strategies(
        self,
        user_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """
        获取策略列表

        Args:
            user_id: 用户 ID（可选，用于过滤）
            status: 策略状态（可选，用于过滤）
            limit: 返回数量限制
            offset: 偏移量

        Returns:
            策略列表
        """
        client = await self._get_client()

        params = {"limit": limit, "offset": offset}
        if user_id:
            params["userId"] = user_id
        if status:
            params["status"] = status

        try:
            response = await client.get("/", params=params)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"List strategies error: {e.response.status_code}")
            raise StrategyServiceError(
                f"获取策略列表失败: {e.response.text}",
                status_code=e.response.status_code,
            )
        except httpx.RequestError as e:
            logger.error(f"Strategy service request error: {e}")
            raise StrategyServiceError(f"策略服务连接失败: {str(e)}")

    async def update_strategy(
        self,
        strategy_id: str,
        updates: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        更新策略

        Args:
            strategy_id: 策略 ID
            updates: 更新的字段

        Returns:
            更新后的策略数据
        """
        client = await self._get_client()

        try:
            response = await client.patch(f"/{strategy_id}", json=updates)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"Update strategy error: {e.response.status_code}")
            raise StrategyServiceError(
                f"更新策略失败: {e.response.text}",
                status_code=e.response.status_code,
            )
        except httpx.RequestError as e:
            logger.error(f"Strategy service request error: {e}")
            raise StrategyServiceError(f"策略服务连接失败: {str(e)}")

    async def delete_strategy(self, strategy_id: str) -> bool:
        """
        删除策略

        Args:
            strategy_id: 策略 ID

        Returns:
            是否删除成功
        """
        client = await self._get_client()

        try:
            response = await client.delete(f"/{strategy_id}")
            return response.status_code in [200, 204]
        except httpx.HTTPStatusError as e:
            logger.error(f"Delete strategy error: {e.response.status_code}")
            raise StrategyServiceError(
                f"删除策略失败: {e.response.text}",
                status_code=e.response.status_code,
            )
        except httpx.RequestError as e:
            logger.error(f"Strategy service request error: {e}")
            raise StrategyServiceError(f"策略服务连接失败: {str(e)}")

    async def start_strategy(self, strategy_id: str) -> Dict[str, Any]:
        """
        启动策略

        Args:
            strategy_id: 策略 ID

        Returns:
            启动结果
        """
        client = await self._get_client()

        try:
            response = await client.post(f"/{strategy_id}/start")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"Start strategy error: {e.response.status_code}")
            raise StrategyServiceError(
                f"启动策略失败: {e.response.text}",
                status_code=e.response.status_code,
            )
        except httpx.RequestError as e:
            logger.error(f"Strategy service request error: {e}")
            raise StrategyServiceError(f"策略服务连接失败: {str(e)}")

    async def stop_strategy(self, strategy_id: str) -> Dict[str, Any]:
        """
        停止策略

        Args:
            strategy_id: 策略 ID

        Returns:
            停止结果
        """
        client = await self._get_client()

        try:
            response = await client.post(f"/{strategy_id}/stop")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"Stop strategy error: {e.response.status_code}")
            raise StrategyServiceError(
                f"停止策略失败: {e.response.text}",
                status_code=e.response.status_code,
            )
        except httpx.RequestError as e:
            logger.error(f"Strategy service request error: {e}")
            raise StrategyServiceError(f"策略服务连接失败: {str(e)}")


# =============================================================================
# Singleton Instance
# =============================================================================

_client: Optional[StrategyClient] = None


def get_strategy_client() -> StrategyClient:
    """获取策略服务客户端单例"""
    global _client
    if _client is None:
        _client = StrategyClient()
    return _client


async def close_strategy_client() -> None:
    """关闭策略服务客户端"""
    global _client
    if _client is not None:
        await _client.close()
        _client = None
