"""LLM 路由服务 - 多模型动态选择

根据任务类型和用户配置，动态选择最合适的 LLM 模型。
"""

import json
import logging
import time
from typing import Any, AsyncGenerator, Dict, List, Optional

import httpx

from ..config import settings
from ..models.llm_routing import (
    AVAILABLE_MODELS,
    DEFAULT_MODEL_ROUTING,
    LLMTaskType,
    ModelInfo,
    ModelRoutingConfig,
    UserModelRouting,
)
from .llm_service import LLMAPIError, LLMError, LLMRateLimitError

logger = logging.getLogger(__name__)


class LLMRouter:
    """LLM 路由服务 - 支持多模型动态选择"""

    # 重试配置
    MAX_RETRIES = 3
    RETRY_DELAY_BASE = 1.0
    RETRY_STATUS_CODES = {429, 500, 502, 503, 504}

    def __init__(self) -> None:
        """初始化 LLM 路由服务"""
        self.api_url = settings.openrouter_api_url
        self.api_key = settings.openrouter_api_key
        self.default_model = settings.llm_model
        self.max_tokens = settings.llm_max_tokens
        self.temperature = settings.llm_temperature
        self.timeout = 120.0

        # HTTP 客户端配置
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://delta-terminal.app",
            "X-Title": "Delta Terminal NLP Processor",
        }

        # 用户配置缓存 (user_id -> UserModelRouting)
        self._user_configs: Dict[str, UserModelRouting] = {}

        # 系统路由配置
        self._system_config = ModelRoutingConfig()

        if not self.api_key:
            logger.error("OpenRouter API Key 未配置")
            raise ValueError("OPENROUTER_API_KEY 环境变量未设置")

        logger.info(f"LLM Router 初始化完成: default_model={self.default_model}")

    # =========================================================================
    # 路由配置管理
    # =========================================================================

    def get_routing_config(self, user_id: Optional[str] = None) -> ModelRoutingConfig:
        """获取路由配置"""
        config = ModelRoutingConfig()
        if user_id and user_id in self._user_configs:
            config.user_overrides = self._user_configs[user_id]
        return config

    def set_user_routing(self, user_id: str, routing: UserModelRouting) -> None:
        """设置用户路由配置"""
        self._user_configs[user_id] = routing
        logger.info(f"用户 {user_id} 路由配置已更新")

    def get_user_routing(self, user_id: str) -> Optional[UserModelRouting]:
        """获取用户路由配置"""
        return self._user_configs.get(user_id)

    def clear_user_routing(self, user_id: str) -> None:
        """清除用户路由配置"""
        if user_id in self._user_configs:
            del self._user_configs[user_id]
            logger.info(f"用户 {user_id} 路由配置已清除")

    def resolve_model(
        self,
        task: LLMTaskType,
        user_id: Optional[str] = None,
        model_override: Optional[str] = None,
    ) -> str:
        """
        解析任务应使用的模型

        优先级：
        1. 显式指定的模型覆盖
        2. 用户配置的任务路由
        3. 用户配置的默认模型
        4. 系统默认任务路由
        5. 全局降级模型
        """
        # 1. 显式覆盖
        if model_override:
            if model_override in AVAILABLE_MODELS:
                return model_override
            logger.warning(f"指定的模型 {model_override} 不存在，使用默认路由")

        # 2-4. 使用路由配置
        config = self.get_routing_config(user_id)
        return config.get_model_for_task(task)

    def get_model_info(self, model_id: str) -> Optional[ModelInfo]:
        """获取模型信息"""
        return AVAILABLE_MODELS.get(model_id)

    def list_available_models(self) -> List[ModelInfo]:
        """列出所有可用模型"""
        return [m for m in AVAILABLE_MODELS.values() if m.enabled]

    # =========================================================================
    # LLM 调用方法
    # =========================================================================

    async def generate(
        self,
        messages: List[Dict[str, str]],
        task: LLMTaskType,
        system: Optional[str] = None,
        user_id: Optional[str] = None,
        model_override: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> str:
        """
        生成响应 (根据任务类型自动选择模型)

        Args:
            messages: 消息列表
            task: 任务类型
            system: 系统提示词
            user_id: 用户 ID (用于加载用户配置)
            model_override: 强制使用指定模型
            temperature: 温度参数
            max_tokens: 最大 token 数

        Returns:
            生成的响应文本
        """
        model = self.resolve_model(task, user_id, model_override)
        start_time = time.time()

        try:
            logger.info(f"[{task.value}] 使用模型: {model}")

            built_messages = self._build_messages(messages, system)
            request_body: Dict[str, Any] = {
                "model": model,
                "messages": built_messages,
                "max_tokens": max_tokens or self.max_tokens,
                "temperature": temperature if temperature is not None else self.temperature,
            }

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await self._request_with_retry(
                    client,
                    "POST",
                    f"{self.api_url}/chat/completions",
                    headers=self.headers,
                    json=request_body,
                )
                data = response.json()

            if data.get("choices") and len(data["choices"]) > 0:
                choice = data["choices"][0]
                if choice.get("message") and choice["message"].get("content"):
                    result = choice["message"]["content"]
                    elapsed = time.time() - start_time
                    usage = data.get("usage", {})
                    logger.info(
                        f"[{task.value}] 响应完成: model={model}, "
                        f"tokens(in={usage.get('prompt_tokens', '?')}, out={usage.get('completion_tokens', '?')}), "
                        f"耗时 {elapsed:.2f}s"
                    )
                    return result

            logger.warning(f"[{task.value}] API 返回空响应")
            return ""

        except (LLMError, LLMRateLimitError, LLMAPIError):
            raise
        except Exception as e:
            elapsed = time.time() - start_time
            logger.error(f"[{task.value}] 生成失败 (model={model}, 耗时 {elapsed:.2f}s): {e}")
            raise LLMError(f"生成响应失败: {e}") from e

    async def generate_json(
        self,
        messages: List[Dict[str, str]],
        task: LLMTaskType,
        system: Optional[str] = None,
        user_id: Optional[str] = None,
        model_override: Optional[str] = None,
        temperature: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        生成 JSON 格式响应

        Args:
            messages: 消息列表
            task: 任务类型
            system: 系统提示词
            user_id: 用户 ID
            model_override: 强制使用指定模型
            temperature: 温度参数

        Returns:
            解析后的 JSON 对象
        """
        response_text = ""
        try:
            json_system = (system or "") + "\n\n请确保返回有效的 JSON 格式。"

            response_text = await self.generate(
                messages=messages,
                task=task,
                system=json_system,
                user_id=user_id,
                model_override=model_override,
                temperature=temperature or 0.3,
            )

            response_text = response_text.strip()
            if response_text.startswith("```"):
                lines = response_text.split("\n")
                response_text = "\n".join(lines[1:-1])

            return json.loads(response_text)

        except json.JSONDecodeError as e:
            logger.error(f"[{task.value}] JSON 解析失败: {e}")
            logger.debug(f"响应文本: {response_text}")
            raise ValueError(f"无效的 JSON 响应: {e}")

    async def generate_stream(
        self,
        messages: List[Dict[str, str]],
        task: LLMTaskType,
        system: Optional[str] = None,
        user_id: Optional[str] = None,
        model_override: Optional[str] = None,
        temperature: Optional[float] = None,
    ) -> AsyncGenerator[str, None]:
        """
        生成流式响应

        Args:
            messages: 消息列表
            task: 任务类型
            system: 系统提示词
            user_id: 用户 ID
            model_override: 强制使用指定模型
            temperature: 温度参数

        Yields:
            文本片段
        """
        model = self.resolve_model(task, user_id, model_override)
        start_time = time.time()
        char_count = 0

        try:
            logger.info(f"[{task.value}] 开始流式响应: model={model}")

            built_messages = self._build_messages(messages, system)
            request_body: Dict[str, Any] = {
                "model": model,
                "messages": built_messages,
                "max_tokens": self.max_tokens,
                "temperature": temperature if temperature is not None else self.temperature,
                "stream": True,
            }

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                async with client.stream(
                    "POST",
                    f"{self.api_url}/chat/completions",
                    headers=self.headers,
                    json=request_body,
                ) as response:
                    if response.status_code == 429:
                        raise LLMRateLimitError("流式请求被速率限制")
                    if response.status_code >= 400:
                        error_text = await response.aread()
                        raise LLMAPIError(response.status_code, error_text.decode()[:500])

                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        if line.startswith("data: "):
                            data_str = line[6:]
                            if data_str.strip() == "[DONE]":
                                break
                            try:
                                data = json.loads(data_str)
                                if data.get("choices") and len(data["choices"]) > 0:
                                    delta = data["choices"][0].get("delta", {})
                                    content = delta.get("content", "")
                                    if content:
                                        char_count += len(content)
                                        yield content
                            except json.JSONDecodeError:
                                continue

            elapsed = time.time() - start_time
            logger.info(f"[{task.value}] 流式完成: model={model}, {char_count} 字符, 耗时 {elapsed:.2f}s")

        except (LLMError, LLMRateLimitError, LLMAPIError):
            raise
        except Exception as e:
            elapsed = time.time() - start_time
            logger.error(f"[{task.value}] 流式失败 (model={model}, 耗时 {elapsed:.2f}s): {e}")
            raise LLMError(f"流式响应失败: {e}") from e

    # =========================================================================
    # 便捷方法 (按任务类型)
    # =========================================================================

    async def intent_recognition(
        self,
        user_input: str,
        system: str,
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """意图识别 (使用轻量级模型)"""
        return await self.generate_json(
            messages=[{"role": "user", "content": user_input}],
            task=LLMTaskType.INTENT_RECOGNITION,
            system=system,
            user_id=user_id,
            temperature=0.1,
        )

    async def generate_insight(
        self,
        messages: List[Dict[str, str]],
        system: str,
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """生成 InsightData (使用高性能模型)"""
        return await self.generate_json(
            messages=messages,
            task=LLMTaskType.INSIGHT_GENERATION,
            system=system,
            user_id=user_id,
            temperature=0.5,
        )

    async def generate_strategy(
        self,
        messages: List[Dict[str, str]],
        system: str,
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """生成策略 (使用高性能模型)"""
        return await self.generate_json(
            messages=messages,
            task=LLMTaskType.STRATEGY_GENERATION,
            system=system,
            user_id=user_id,
            temperature=0.3,
        )

    async def simple_chat(
        self,
        messages: List[Dict[str, str]],
        system: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> str:
        """简单对话 (使用经济型模型)"""
        return await self.generate(
            messages=messages,
            task=LLMTaskType.SIMPLE_CHAT,
            system=system,
            user_id=user_id,
            temperature=0.7,
        )

    # =========================================================================
    # 内部方法
    # =========================================================================

    def _build_messages(
        self, messages: List[Dict[str, str]], system: Optional[str]
    ) -> List[Dict[str, str]]:
        """构建消息列表"""
        result = []
        if system:
            result.append({"role": "system", "content": system})
        result.extend(messages)
        return result

    async def _request_with_retry(
        self,
        client: httpx.AsyncClient,
        method: str,
        url: str,
        **kwargs: Any,
    ) -> httpx.Response:
        """带重试的 HTTP 请求"""
        import asyncio

        last_error: Optional[Exception] = None

        for attempt in range(self.MAX_RETRIES):
            try:
                start_time = time.time()
                response = await client.request(method, url, **kwargs)
                elapsed = time.time() - start_time

                logger.debug(f"API 请求: {method} {url} -> {response.status_code} ({elapsed:.2f}s)")

                if response.status_code == 429:
                    retry_after = int(response.headers.get("Retry-After", "5"))
                    logger.warning(f"速率限制，等待 {retry_after}s (尝试 {attempt + 1}/{self.MAX_RETRIES})")
                    if attempt < self.MAX_RETRIES - 1:
                        await asyncio.sleep(retry_after)
                        continue
                    raise LLMRateLimitError(f"速率限制: 重试 {self.MAX_RETRIES} 次后仍失败")

                if response.status_code in self.RETRY_STATUS_CODES:
                    delay = self.RETRY_DELAY_BASE * (2 ** attempt)
                    logger.warning(f"服务器错误 {response.status_code}，{delay:.1f}s 后重试")
                    if attempt < self.MAX_RETRIES - 1:
                        await asyncio.sleep(delay)
                        continue

                response.raise_for_status()
                return response

            except httpx.TimeoutException as e:
                delay = self.RETRY_DELAY_BASE * (2 ** attempt)
                logger.warning(f"请求超时，{delay:.1f}s 后重试 (尝试 {attempt + 1}/{self.MAX_RETRIES})")
                last_error = e
                if attempt < self.MAX_RETRIES - 1:
                    await asyncio.sleep(delay)
                    continue

            except httpx.HTTPStatusError as e:
                last_error = e
                error_body = e.response.text[:500] if e.response.text else "无响应内容"
                logger.error(f"HTTP 错误: {e.response.status_code} - {error_body}")
                raise LLMAPIError(e.response.status_code, error_body)

        raise LLMError(f"请求失败，已重试 {self.MAX_RETRIES} 次: {last_error}")


# =============================================================================
# 全局实例
# =============================================================================

_llm_router: Optional[LLMRouter] = None


def get_llm_router() -> LLMRouter:
    """获取 LLM 路由服务实例 (单例)"""
    global _llm_router
    if _llm_router is None:
        _llm_router = LLMRouter()
    return _llm_router


async def get_llm_router_async() -> LLMRouter:
    """获取 LLM 路由服务实例 (异步版本)"""
    return get_llm_router()


# =============================================================================
# 导出
# =============================================================================

__all__ = [
    "LLMRouter",
    "get_llm_router",
    "get_llm_router_async",
]
