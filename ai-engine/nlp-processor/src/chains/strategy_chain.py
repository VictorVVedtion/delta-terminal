"""LangChain 策略处理链"""

import logging
from typing import Any, Dict, List, Optional

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import ChatPromptTemplate

from ..config import settings
from ..models.schemas import IntentType, Message, MessageRole
from ..prompts.strategy_prompts import (
    CONVERSATION_PROMPT,
    STRATEGY_OPTIMIZATION_PROMPT,
)

logger = logging.getLogger(__name__)


class StrategyChain:
    """策略处理链"""

    def __init__(self) -> None:
        """初始化策略链"""
        self.llm = ChatAnthropic(
            model=settings.claude_model,
            anthropic_api_key=settings.anthropic_api_key,
            max_tokens=settings.claude_max_tokens,
            temperature=settings.claude_temperature,
        )
        self.json_parser = JsonOutputParser()

    async def process_conversation(
        self,
        user_input: str,
        chat_history: List[Message],
        user_id: str,
        conversation_id: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        处理对话

        Args:
            user_input: 用户输入
            chat_history: 对话历史
            user_id: 用户 ID
            conversation_id: 对话 ID
            context: 额外上下文

        Returns:
            AI 响应
        """
        try:
            logger.info(f"Processing conversation for user {user_id}")

            # 准备对话历史
            formatted_history = []
            for msg in chat_history[-10:]:  # 只保留最近 10 条
                if msg.role == MessageRole.USER:
                    formatted_history.append(HumanMessage(content=msg.content))
                elif msg.role == MessageRole.ASSISTANT:
                    formatted_history.append(
                        SystemMessage(content=msg.content)
                    )  # Assistant 消息作为 system

            # 构建提示
            prompt = CONVERSATION_PROMPT.format_messages(
                user_id=user_id,
                conversation_id=conversation_id,
                strategy_count=(context or {}).get("strategy_count", 0),
                chat_history=formatted_history,
                user_input=user_input,
            )

            # 调用 LLM
            response = await self.llm.ainvoke(prompt)

            return str(response.content)

        except Exception as e:
            logger.error(f"Error processing conversation: {e}")
            return "抱歉,我遇到了一些问题。请稍后再试。"

    async def generate_strategy_suggestions(
        self,
        strategy_config: Dict[str, Any],
        market_context: Optional[Dict[str, Any]] = None,
    ) -> List[str]:
        """
        生成策略优化建议

        Args:
            strategy_config: 策略配置
            market_context: 市场环境信息

        Returns:
            建议列表
        """
        try:
            logger.info("Generating strategy suggestions")

            prompt = ChatPromptTemplate.from_template(
                STRATEGY_OPTIMIZATION_PROMPT
            )

            messages = prompt.format_messages(
                strategy_config=str(strategy_config),
                market_context=str(market_context or {}),
            )

            response = await self.llm.ainvoke(messages)

            # 简单解析响应为列表
            content = str(response.content)
            suggestions = [
                line.strip("- ").strip()
                for line in content.split("\n")
                if line.strip().startswith("-")
            ]

            return suggestions

        except Exception as e:
            logger.error(f"Error generating suggestions: {e}")
            return []

    async def analyze_intent(
        self, user_input: str, context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        分析用户意图（使用 LangChain）

        Args:
            user_input: 用户输入
            context: 上下文信息

        Returns:
            意图分析结果
        """
        try:
            system_prompt = """分析用户输入的交易意图。

可能的意图类型：
- CREATE_STRATEGY: 创建新策略
- MODIFY_STRATEGY: 修改策略
- DELETE_STRATEGY: 删除策略
- QUERY_STRATEGY: 查询策略
- ANALYZE_MARKET: 市场分析
- BACKTEST: 回测
- GENERAL_CHAT: 一般对话

返回 JSON 格式：
{
  "intent": "意图类型",
  "confidence": 0.0-1.0,
  "entities": {},
  "reasoning": "推理过程"
}"""

            prompt = ChatPromptTemplate.from_messages([
                ("system", system_prompt),
                ("human", f"用户输入: {user_input}\n\n上下文: {context}"),
            ])

            chain = prompt | self.llm | self.json_parser

            result = await chain.ainvoke({})

            return result

        except Exception as e:
            logger.error(f"Error analyzing intent: {e}")
            return {
                "intent": IntentType.UNKNOWN,
                "confidence": 0.0,
                "entities": {},
                "reasoning": str(e),
            }

    async def extract_parameters(
        self, user_input: str, parameter_schema: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        提取参数

        Args:
            user_input: 用户输入
            parameter_schema: 参数模式

        Returns:
            提取的参数
        """
        try:
            system_prompt = f"""从用户输入中提取以下参数：

参数模式：
{parameter_schema}

返回 JSON 格式的参数字典。如果某个参数未提及，使用 null。"""

            prompt = ChatPromptTemplate.from_messages([
                ("system", system_prompt),
                ("human", user_input),
            ])

            chain = prompt | self.llm | self.json_parser

            result = await chain.ainvoke({})

            return result

        except Exception as e:
            logger.error(f"Error extracting parameters: {e}")
            return {}

    async def validate_strategy(
        self, strategy_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        验证策略配置

        Args:
            strategy_config: 策略配置

        Returns:
            验证结果
        """
        try:
            system_prompt = """验证交易策略配置的合理性。

检查要点：
1. 必填字段是否完整
2. 参数值是否合理
3. 逻辑是否一致
4. 风险管理是否充分

返回 JSON 格式：
{
  "is_valid": true/false,
  "errors": ["错误列表"],
  "warnings": ["警告列表"],
  "suggestions": ["建议列表"]
}"""

            prompt = ChatPromptTemplate.from_messages([
                ("system", system_prompt),
                ("human", f"策略配置：\n{strategy_config}"),
            ])

            chain = prompt | self.llm | self.json_parser

            result = await chain.ainvoke({})

            return result

        except Exception as e:
            logger.error(f"Error validating strategy: {e}")
            return {
                "is_valid": False,
                "errors": [str(e)],
                "warnings": [],
                "suggestions": [],
            }


# 全局策略链实例
strategy_chain = StrategyChain()


async def get_strategy_chain() -> StrategyChain:
    """获取策略链实例"""
    return strategy_chain
