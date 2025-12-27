"""LLM 服务 - OpenRouter API 集成

使用 OpenRouter 统一 API 调用各种 LLM 模型（Claude, GPT 等）
"""

import json
import logging
import time
from typing import Any, AsyncGenerator, Dict, List, Optional

import httpx

from ..config import settings

logger = logging.getLogger(__name__)


class LLMError(Exception):
    """LLM 服务基础异常"""
    pass


class LLMRateLimitError(LLMError):
    """速率限制错误"""
    pass


class LLMAPIError(LLMError):
    """API 调用错误"""
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        super().__init__(f"API Error ({status_code}): {message}")


class LLMService:
    """LLM 服务类 - OpenRouter 实现"""

    # 重试配置
    MAX_RETRIES = 3
    RETRY_DELAY_BASE = 1.0  # 基础延迟秒数
    RETRY_STATUS_CODES = {429, 500, 502, 503, 504}  # 需要重试的状态码

    def __init__(self) -> None:
        """初始化 LLM 服务"""
        self.api_url = settings.openrouter_api_url
        self.api_key = settings.openrouter_api_key
        self.model = settings.llm_model
        self.max_tokens = settings.llm_max_tokens
        self.temperature = settings.llm_temperature
        self.timeout = 120.0  # 默认超时秒数

        # HTTP 客户端配置
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://delta-terminal.app",
            "X-Title": "Delta Terminal NLP Processor",
        }

        # 验证 API Key 配置
        if not self.api_key:
            logger.error("OpenRouter API Key 未配置")
            raise ValueError("OPENROUTER_API_KEY 环境变量未设置")

        logger.info(f"LLM 服务初始化完成: model={self.model}, timeout={self.timeout}s")

    async def _request_with_retry(
        self,
        client: httpx.AsyncClient,
        method: str,
        url: str,
        **kwargs: Any,
    ) -> httpx.Response:
        """带重试的 HTTP 请求"""
        last_error: Optional[Exception] = None

        for attempt in range(self.MAX_RETRIES):
            try:
                start_time = time.time()
                response = await client.request(method, url, **kwargs)
                elapsed = time.time() - start_time

                # 记录请求信息
                logger.debug(
                    f"API 请求完成: {method} {url} -> {response.status_code} ({elapsed:.2f}s)"
                )

                # 处理速率限制
                if response.status_code == 429:
                    retry_after = int(response.headers.get("Retry-After", "5"))
                    logger.warning(f"速率限制触发，等待 {retry_after}s 后重试 (尝试 {attempt + 1}/{self.MAX_RETRIES})")
                    if attempt < self.MAX_RETRIES - 1:
                        await self._async_sleep(retry_after)
                        continue
                    raise LLMRateLimitError(f"速率限制: 重试 {self.MAX_RETRIES} 次后仍失败")

                # 处理可重试错误
                if response.status_code in self.RETRY_STATUS_CODES:
                    delay = self.RETRY_DELAY_BASE * (2 ** attempt)
                    logger.warning(
                        f"服务器错误 {response.status_code}，{delay:.1f}s 后重试 (尝试 {attempt + 1}/{self.MAX_RETRIES})"
                    )
                    if attempt < self.MAX_RETRIES - 1:
                        await self._async_sleep(delay)
                        continue

                response.raise_for_status()
                return response

            except httpx.TimeoutException as e:
                delay = self.RETRY_DELAY_BASE * (2 ** attempt)
                logger.warning(f"请求超时，{delay:.1f}s 后重试 (尝试 {attempt + 1}/{self.MAX_RETRIES})")
                last_error = e
                if attempt < self.MAX_RETRIES - 1:
                    await self._async_sleep(delay)
                    continue

            except httpx.HTTPStatusError as e:
                last_error = e
                error_body = e.response.text[:500] if e.response.text else "无响应内容"
                logger.error(f"HTTP 错误: {e.response.status_code} - {error_body}")
                raise LLMAPIError(e.response.status_code, error_body)

        # 所有重试都失败
        raise LLMError(f"请求失败，已重试 {self.MAX_RETRIES} 次: {last_error}")

    @staticmethod
    async def _async_sleep(seconds: float) -> None:
        """异步等待"""
        import asyncio
        await asyncio.sleep(seconds)

    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        system: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> str:
        """
        生成响应

        Args:
            messages: 消息列表，格式 [{"role": "user", "content": "..."}, ...]
            system: 系统提示词
            temperature: 温度参数
            max_tokens: 最大 token 数

        Returns:
            生成的响应文本

        Raises:
            LLMError: LLM 调用失败
            LLMRateLimitError: 速率限制
            LLMAPIError: API 错误
        """
        start_time = time.time()
        try:
            logger.info(f"生成响应: {len(messages)} 条消息, model={self.model}")

            # 构建请求体 (OpenAI 兼容格式)
            built_messages = self._build_messages(messages, system)
            request_body: Dict[str, Any] = {
                "model": self.model,
                "messages": built_messages,
                "max_tokens": max_tokens or self.max_tokens,
                "temperature": temperature if temperature is not None else self.temperature,
            }

            # 记录请求详情（debug 级别）
            logger.debug(f"请求体: model={self.model}, messages={len(built_messages)}, max_tokens={request_body['max_tokens']}")

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await self._request_with_retry(
                    client,
                    "POST",
                    f"{self.api_url}/chat/completions",
                    headers=self.headers,
                    json=request_body,
                )
                data = response.json()

            # 提取响应内容
            if data.get("choices") and len(data["choices"]) > 0:
                choice = data["choices"][0]
                if choice.get("message") and choice["message"].get("content"):
                    result = choice["message"]["content"]
                    elapsed = time.time() - start_time
                    # 记录使用情况
                    usage = data.get("usage", {})
                    logger.info(
                        f"响应完成: {len(result)} 字符, "
                        f"tokens(in={usage.get('prompt_tokens', '?')}, out={usage.get('completion_tokens', '?')}), "
                        f"耗时 {elapsed:.2f}s"
                    )
                    return result

            logger.warning("OpenRouter API 返回空响应")
            return ""

        except (LLMError, LLMRateLimitError, LLMAPIError):
            raise
        except Exception as e:
            elapsed = time.time() - start_time
            logger.error(f"生成响应失败 (耗时 {elapsed:.2f}s): {type(e).__name__}: {e}")
            raise LLMError(f"生成响应失败: {e}") from e

    async def generate_json_response(
        self,
        messages: List[Dict[str, str]],
        system: Optional[str] = None,
        temperature: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        生成 JSON 格式响应

        Args:
            messages: 消息列表
            system: 系统提示词
            temperature: 温度参数

        Returns:
            解析后的 JSON 对象
        """
        response_text = ""
        try:
            # 在系统提示中强调返回 JSON
            json_system = (system or "") + "\n\n请确保返回有效的 JSON 格式。"

            response_text = await self.generate_response(
                messages=messages,
                system=json_system,
                temperature=temperature or 0.3,  # JSON 生成使用较低温度
            )

            # 尝试提取 JSON
            response_text = response_text.strip()

            # 如果响应被代码块包裹，提取内容
            if response_text.startswith("```"):
                lines = response_text.split("\n")
                # 移除第一行（```json）和最后一行（```）
                response_text = "\n".join(lines[1:-1])

            # 解析 JSON
            return json.loads(response_text)

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {e}")
            logger.debug(f"Response text: {response_text}")
            raise ValueError(f"Invalid JSON response: {e}")
        except Exception as e:
            logger.error(f"Error generating JSON response: {e}")
            raise

    async def generate_streaming_response(
        self,
        messages: List[Dict[str, str]],
        system: Optional[str] = None,
        temperature: Optional[float] = None,
    ) -> AsyncGenerator[str, None]:
        """
        生成流式响应

        Args:
            messages: 消息列表
            system: 系统提示词
            temperature: 温度参数

        Yields:
            文本片段

        Raises:
            LLMError: LLM 调用失败
        """
        start_time = time.time()
        char_count = 0

        try:
            logger.info(f"开始流式响应: {len(messages)} 条消息, model={self.model}")

            # 构建请求体
            built_messages = self._build_messages(messages, system)
            request_body: Dict[str, Any] = {
                "model": self.model,
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
                    # 检查状态码
                    if response.status_code == 429:
                        raise LLMRateLimitError("流式请求被速率限制")
                    if response.status_code >= 400:
                        error_text = await response.aread()
                        raise LLMAPIError(response.status_code, error_text.decode()[:500])

                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        if line.startswith("data: "):
                            data_str = line[6:]  # 移除 "data: " 前缀
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
                                logger.debug(f"跳过无效流数据: {data_str[:100]}")
                                continue

            elapsed = time.time() - start_time
            logger.info(f"流式响应完成: {char_count} 字符, 耗时 {elapsed:.2f}s")

        except (LLMError, LLMRateLimitError, LLMAPIError):
            raise
        except httpx.TimeoutException as e:
            elapsed = time.time() - start_time
            logger.error(f"流式请求超时 (耗时 {elapsed:.2f}s)")
            raise LLMError(f"流式请求超时: {e}") from e
        except Exception as e:
            elapsed = time.time() - start_time
            logger.error(f"流式响应失败 (耗时 {elapsed:.2f}s): {type(e).__name__}: {e}")
            raise LLMError(f"流式响应失败: {e}") from e

    def _build_messages(
        self, messages: List[Dict[str, str]], system: Optional[str]
    ) -> List[Dict[str, str]]:
        """
        构建消息列表（OpenAI 格式）

        Args:
            messages: 用户消息列表
            system: 系统提示词

        Returns:
            完整的消息列表
        """
        result = []

        # 添加系统消息
        if system:
            result.append({"role": "system", "content": system})

        # 添加对话消息
        result.extend(messages)

        return result

    async def count_tokens(self, text: str) -> int:
        """
        估算文本 token 数量

        Args:
            text: 输入文本

        Returns:
            大致的 token 数量
        """
        # 粗略估算：英文平均 1 token = 4 字符，中文平均 1 token = 2 字符
        # 这是一个简化的估算，实际应该使用 tiktoken 库
        return len(text) // 3

    async def validate_api_key(self) -> bool:
        """
        验证 API 密钥是否有效

        Returns:
            API 密钥是否有效
        """
        try:
            # 发送一个简单的请求测试
            await self.generate_response(
                messages=[{"role": "user", "content": "Hello"}],
                max_tokens=10,
            )
            return True
        except Exception as e:
            logger.error(f"API key validation failed: {e}")
            return False

    async def list_available_models(self) -> List[Dict[str, Any]]:
        """
        获取 OpenRouter 可用模型列表

        Returns:
            模型列表
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.api_url}/models",
                    headers=self.headers,
                )
                response.raise_for_status()
                data = response.json()
                return data.get("data", [])
        except Exception as e:
            logger.error(f"Failed to list models: {e}")
            return []


# 延迟初始化的全局 LLM 服务实例
_llm_service: Optional[LLMService] = None


def get_llm_service() -> LLMService:
    """获取 LLM 服务实例（懒加载单例）"""
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service


# 为了向后兼容，提供异步版本
async def get_llm_service_async() -> LLMService:
    """获取 LLM 服务实例（异步版本）"""
    return get_llm_service()


# 向后兼容别名
llm_service = None  # 将在首次调用 get_llm_service() 时初始化


# 导出列表
__all__ = [
    "LLMService",
    "LLMError",
    "LLMRateLimitError",
    "LLMAPIError",
    "get_llm_service",
    "get_llm_service_async",
]
