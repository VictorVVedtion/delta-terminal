"""意图识别服务"""

import json
import logging
from typing import Any, Dict, Optional

from ..models.schemas import IntentRecognitionRequest, IntentRecognitionResponse, IntentType
from ..prompts.strategy_prompts import INTENT_RECOGNITION_PROMPT
from .llm_service import LLMService, get_llm_service

logger = logging.getLogger(__name__)


class IntentService:
    """意图识别服务"""

    def __init__(self, llm_service: LLMService):
        """
        初始化意图服务

        Args:
            llm_service: LLM 服务实例
        """
        self.llm_service = llm_service

    async def recognize_intent(
        self, request: IntentRecognitionRequest
    ) -> IntentRecognitionResponse:
        """
        识别用户意图

        Args:
            request: 意图识别请求

        Returns:
            意图识别响应
        """
        try:
            logger.info(f"Recognizing intent for text: {request.text[:100]}...")

            # 构建提示
            context = json.dumps(request.context or {}, ensure_ascii=False)
            prompt_value = INTENT_RECOGNITION_PROMPT.format_messages(
                user_input=request.text, context=context
            )

            # 转换为 API 消息格式
            messages = []
            for msg in prompt_value:
                if msg.type == "system":
                    continue  # 系统消息单独处理
                # LangChain 使用 "human"，OpenAI API 需要 "user"
                role = "user" if msg.type == "human" else msg.type
                messages.append({"role": role, "content": str(msg.content)})

            # 提取系统消息
            system_msg = next(
                (str(msg.content) for msg in prompt_value if msg.type == "system"),
                None,
            )

            # 调用 LLM
            response = await self.llm_service.generate_json_response(
                messages=messages, system=system_msg, temperature=0.3
            )

            # 解析响应
            intent = IntentType(response.get("intent", "UNKNOWN"))
            confidence = float(response.get("confidence", 0.0))
            entities = response.get("entities", {})
            reasoning = response.get("reasoning", "")

            logger.info(f"Recognized intent: {intent} (confidence: {confidence})")

            return IntentRecognitionResponse(
                intent=intent,
                confidence=confidence,
                entities=entities,
                reasoning=reasoning,
            )

        except Exception as e:
            logger.error(f"Error recognizing intent: {e}")
            # 返回未知意图
            return IntentRecognitionResponse(
                intent=IntentType.UNKNOWN,
                confidence=0.0,
                entities={},
                reasoning=f"Error: {str(e)}",
            )

    async def extract_entities(
        self, text: str, intent: IntentType
    ) -> Dict[str, Any]:
        """
        根据意图提取实体

        Args:
            text: 用户输入文本
            intent: 已识别的意图

        Returns:
            提取的实体字典
        """
        try:
            logger.info(f"Extracting entities for intent: {intent}")

            # 根据不同意图使用不同的提取策略
            if intent == IntentType.CREATE_STRATEGY:
                return await self._extract_strategy_entities(text)
            elif intent == IntentType.ANALYZE_MARKET:
                return await self._extract_market_entities(text)
            elif intent == IntentType.QUERY_STRATEGY:
                return await self._extract_query_entities(text)
            else:
                return {}

        except Exception as e:
            logger.error(f"Error extracting entities: {e}")
            return {}

    async def _extract_strategy_entities(self, text: str) -> Dict[str, Any]:
        """提取策略相关实体"""
        entities: Dict[str, Any] = {}

        # 简单的关键词匹配（实际应使用更复杂的 NER）
        text_upper = text.upper()

        # 提取交易对
        symbols = ["BTC/USDT", "ETH/USDT", "BNB/USDT", "SOL/USDT"]
        for symbol in symbols:
            if symbol in text_upper:
                entities["symbol"] = symbol
                break

        # 提取时间周期
        timeframes = {
            "1分钟": "1m",
            "5分钟": "5m",
            "15分钟": "15m",
            "30分钟": "30m",
            "1小时": "1h",
            "4小时": "4h",
            "1天": "1d",
            "日线": "1d",
            "周线": "1w",
        }
        for keyword, timeframe in timeframes.items():
            if keyword in text:
                entities["timeframe"] = timeframe
                break

        # 提取策略类型
        if "网格" in text:
            entities["strategy_type"] = "grid"
        elif "定投" in text or "DCA" in text_upper:
            entities["strategy_type"] = "dca"
        elif "波段" in text:
            entities["strategy_type"] = "swing"
        elif "剥头皮" in text or "scalping" in text.lower():
            entities["strategy_type"] = "scalping"

        return entities

    async def _extract_market_entities(self, text: str) -> Dict[str, Any]:
        """提取市场分析相关实体"""
        entities: Dict[str, Any] = {}

        text_upper = text.upper()

        # 提取交易对
        symbols = ["BTC/USDT", "ETH/USDT", "BNB/USDT", "SOL/USDT"]
        for symbol in symbols:
            if symbol in text_upper:
                entities["symbol"] = symbol
                break

        # 提取分析类型
        if "趋势" in text:
            entities["analysis_type"] = "trend"
        elif "支撑" in text or "阻力" in text:
            entities["analysis_type"] = "support_resistance"
        elif "指标" in text:
            entities["analysis_type"] = "indicators"

        return entities

    async def _extract_query_entities(self, text: str) -> Dict[str, Any]:
        """提取查询相关实体"""
        entities: Dict[str, Any] = {}

        # 提取查询类型
        if "所有" in text or "全部" in text:
            entities["query_type"] = "all"
        elif "运行" in text or "活跃" in text:
            entities["query_type"] = "active"
        elif "历史" in text:
            entities["query_type"] = "history"

        return entities


async def get_intent_service() -> IntentService:
    """获取意图服务实例"""
    llm_service = get_llm_service()
    return IntentService(llm_service)
