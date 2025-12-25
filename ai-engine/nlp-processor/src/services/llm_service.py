"""LLM 服务 - Claude API 集成"""

import json
import logging
from typing import Any, Dict, List, Optional

from anthropic import Anthropic, AsyncAnthropic
from anthropic.types import Message as ClaudeMessage

from ..config import settings

logger = logging.getLogger(__name__)


class LLMService:
    """LLM 服务类"""

    def __init__(self) -> None:
        """初始化 LLM 服务"""
        self.client = AsyncAnthropic(api_key=settings.anthropic_api_key)
        self.sync_client = Anthropic(api_key=settings.anthropic_api_key)
        self.model = settings.claude_model
        self.max_tokens = settings.claude_max_tokens
        self.temperature = settings.claude_temperature

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

            response: ClaudeMessage = await self.client.messages.create(
                model=self.model,
                max_tokens=max_tokens or self.max_tokens,
                temperature=temperature or self.temperature,
                system=system or "",
                messages=messages,
            )

            # 提取文本内容
            if response.content and len(response.content) > 0:
                content = response.content[0]
                if hasattr(content, "text"):
                    result = content.text
                    logger.info(f"Generated response length: {len(result)}")
                    return result

            logger.warning("Empty response from Claude API")
            return ""

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
    ) -> Any:
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

            async with self.client.messages.stream(
                model=self.model,
                max_tokens=self.max_tokens,
                temperature=temperature or self.temperature,
                system=system or "",
                messages=messages,
            ) as stream:
                async for text in stream.text_stream:
                    yield text

            logger.info("Streaming response completed")

        except Exception as e:
            logger.error(f"Error in streaming response: {e}")
            raise

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


# 全局 LLM 服务实例
llm_service = LLMService()


async def get_llm_service() -> LLMService:
    """获取 LLM 服务实例"""
    return llm_service
