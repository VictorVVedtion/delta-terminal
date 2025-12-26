"""LLM 服务 - OpenRouter API 集成

使用 OpenRouter 统一 API 调用各种 LLM 模型（Claude, GPT 等）
"""

import json
import logging
from typing import Any, AsyncGenerator, Dict, List, Optional

import httpx

from ..config import settings

logger = logging.getLogger(__name__)


class LLMService:
    """LLM 服务类 - OpenRouter 实现"""

    def __init__(self) -> None:
        """初始化 LLM 服务"""
        self.api_url = settings.openrouter_api_url
        self.api_key = settings.openrouter_api_key
        self.model = settings.llm_model
        self.max_tokens = settings.llm_max_tokens
        self.temperature = settings.llm_temperature

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

        logger.info(f"LLM 服务初始化完成: model={self.model}")

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
        """
        try:
            logger.info(f"Generating response with {len(messages)} messages")

            # 构建请求体 (OpenAI 兼容格式)
            request_body: Dict[str, Any] = {
                "model": self.model,
                "messages": self._build_messages(messages, system),
                "max_tokens": max_tokens or self.max_tokens,
                "temperature": temperature if temperature is not None else self.temperature,
            }

            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"{self.api_url}/chat/completions",
                    headers=self.headers,
                    json=request_body,
                )
                response.raise_for_status()
                data = response.json()

            # 提取响应内容
            if data.get("choices") and len(data["choices"]) > 0:
                choice = data["choices"][0]
                if choice.get("message") and choice["message"].get("content"):
                    result = choice["message"]["content"]
                    logger.info(f"Generated response length: {len(result)}")
                    return result

            logger.warning("Empty response from OpenRouter API")
            return ""

        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error from OpenRouter: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            raise

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
        """
        try:
            logger.info("Starting streaming response")

            # 构建请求体
            request_body: Dict[str, Any] = {
                "model": self.model,
                "messages": self._build_messages(messages, system),
                "max_tokens": self.max_tokens,
                "temperature": temperature if temperature is not None else self.temperature,
                "stream": True,
            }

            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream(
                    "POST",
                    f"{self.api_url}/chat/completions",
                    headers=self.headers,
                    json=request_body,
                ) as response:
                    response.raise_for_status()

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
                                        yield content
                            except json.JSONDecodeError:
                                logger.warning(f"Failed to parse streaming data: {data_str}")
                                continue

            logger.info("Streaming response completed")

        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error in streaming: {e.response.status_code}")
            raise
        except Exception as e:
            logger.error(f"Error in streaming response: {e}")
            raise

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
