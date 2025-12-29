"""意图识别服务

P0 优化: 集成 Redis 缓存，减少重复 LLM 调用
"""

import json
import logging
import time
from typing import Any, Dict, List, Optional, Tuple

from ..models.schemas import IntentRecognitionRequest, IntentRecognitionResponse, IntentType
from ..models.strategy_perspectives import (
    TradingConcept,
    detect_trading_concept,
    TRADING_CONCEPT_KEYWORDS,
)
from ..models.llm_routing import LLMTaskType
from ..prompts.strategy_prompts import INTENT_RECOGNITION_PROMPT
from .llm_service import LLMService, get_llm_service
from .llm_router import LLMRouter, get_llm_router
from .intent_cache import IntentCache, get_intent_cache
from ..utils.input_sanitizer import (
    sanitize_user_input,
    sanitize_for_llm,
    check_input_abuse,
    InputValidationError,
)

logger = logging.getLogger(__name__)


# 技术指标关键词 - 如果用户提到这些，说明已经有具体策略逻辑
TECHNICAL_INDICATOR_KEYWORDS: List[str] = [
    # 技术指标
    "RSI", "MACD", "KDJ", "BOLL", "布林", "EMA", "SMA", "MA",
    "均线", "移动平均", "金叉", "死叉", "背离",
    # 具体条件
    "超卖", "超买", "低于", "高于", "突破", "跌破",
    "触及", "接近", "大于", "小于",
    # 具体数值
    "30", "70", "80", "20",  # RSI 常用阈值
]


class IntentService:
    """意图识别服务 (P0 优化: 集成 Redis 缓存)"""

    def __init__(
        self,
        llm_service: LLMService,
        llm_router: Optional[LLMRouter] = None,
        user_id: Optional[str] = None,
        intent_cache: Optional[IntentCache] = None,
    ):
        """
        初始化意图服务

        Args:
            llm_service: LLM 服务实例 (deprecated, use llm_router)
            llm_router: LLM 路由服务实例 (推荐)
            user_id: 用户 ID (用于加载用户特定配置)
            intent_cache: 意图缓存实例 (P0 优化)
        """
        self.llm_service = llm_service
        self.llm_router = llm_router
        self.user_id = user_id
        self.intent_cache = intent_cache

        if self.llm_router:
            logger.info("IntentService: Using LLMRouter for task-based model selection")
        else:
            logger.info("IntentService: Using legacy LLMService (single model)")

        if self.intent_cache:
            logger.info("IntentService: Intent caching enabled (P0 optimization)")

    async def recognize_intent(
        self,
        request: IntentRecognitionRequest,
        user_id: Optional[str] = None,
    ) -> IntentRecognitionResponse:
        """
        识别用户意图 (P0 优化: 支持缓存)

        Args:
            request: 意图识别请求
            user_id: 用户 ID (可选，用于加载用户模型配置)

        Returns:
            意图识别响应
        """
        # 使用传入的 user_id，或回退到实例级别的 user_id
        effective_user_id = user_id or self.user_id
        start_time = time.time()

        try:
            # ====================================================================
            # 安全检查: 输入清理和验证
            # ====================================================================
            try:
                # 清理用户输入
                cleaned_text, warnings = sanitize_user_input(
                    request.text,
                    max_length=2000,
                    allow_special_chars=True,
                    strict_mode=False,  # 非严格模式，记录但不阻止
                )

                # 记录警告
                if warnings:
                    logger.warning(f"输入清理警告 (user: {effective_user_id}): {warnings}")

                # 滥用检测
                if effective_user_id and check_input_abuse(effective_user_id, cleaned_text):
                    logger.warning(f"检测到重复输入滥用: {effective_user_id}")

            except InputValidationError as e:
                logger.error(f"输入验证失败: {e}")
                return IntentRecognitionResponse(
                    intent=IntentType.UNKNOWN,
                    confidence=0.0,
                    entities={},
                    reasoning=f"输入验证失败: {str(e)}",
                )

            # 为 LLM 准备安全输入
            safe_input = sanitize_for_llm(cleaned_text, context="intent_recognition")

            # ====================================================================
            # P0 优化: 检查缓存
            # ====================================================================
            if self.intent_cache:
                cached_response = await self.intent_cache.get(
                    safe_input, request.context
                )
                if cached_response:
                    elapsed = (time.time() - start_time) * 1000
                    logger.info(
                        f"Intent cache HIT: {cached_response.intent} "
                        f"(latency: {elapsed:.0f}ms, saved ~800-1500ms)"
                    )
                    return cached_response

            logger.info(f"Recognizing intent for text: {safe_input[:100]}...")

            # 构建提示
            context = json.dumps(request.context or {}, ensure_ascii=False)
            prompt_value = INTENT_RECOGNITION_PROMPT.format_messages(
                user_input=safe_input, context=context
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

            # 调用 LLM (优先使用 LLMRouter 进行任务路由)
            if self.llm_router:
                response = await self.llm_router.generate_json(
                    messages=messages,
                    task=LLMTaskType.INTENT_RECOGNITION,
                    system=system_msg,
                    user_id=effective_user_id,
                    temperature=0.3,
                )
            else:
                response = await self.llm_service.generate_json_response(
                    messages=messages, system=system_msg, temperature=0.3
                )

            # 解析响应
            intent = IntentType(response.get("intent", "UNKNOWN"))
            confidence = float(response.get("confidence", 0.0))
            entities = response.get("entities", {})
            reasoning = response.get("reasoning", "")

            elapsed = (time.time() - start_time) * 1000
            logger.info(
                f"Recognized intent: {intent} "
                f"(confidence: {confidence}, latency: {elapsed:.0f}ms)"
            )

            result = IntentRecognitionResponse(
                intent=intent,
                confidence=confidence,
                entities=entities,
                reasoning=reasoning,
            )

            # ====================================================================
            # P0 优化: 缓存结果
            # ====================================================================
            if self.intent_cache:
                await self.intent_cache.set(safe_input, result, request.context)

            return result

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
        # 归一化文本：移除数字与中文之间的空格
        normalized_text = text.replace(" 小时", "小时").replace(" 分钟", "分钟").replace(" 天", "天")

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
            if keyword in normalized_text:
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

        # 提取查询类型（优先级：active > all > history）
        # 先检查更具体的状态词
        if "运行" in text or "活跃" in text:
            entities["query_type"] = "active"
        elif "历史" in text:
            entities["query_type"] = "history"
        elif "所有" in text or "全部" in text:
            entities["query_type"] = "all"

        return entities

    # =========================================================================
    # 策略角度推荐相关方法 (A2UI 分层澄清机制)
    # =========================================================================

    def detect_trading_concept_from_text(self, text: str) -> Optional[TradingConcept]:
        """
        从用户输入文本中检测交易概念

        Args:
            text: 用户输入文本

        Returns:
            检测到的交易概念，未检测到返回 None
        """
        return detect_trading_concept(text)

    def has_specific_indicator(self, text: str) -> bool:
        """
        检查用户是否已经提到了具体的技术指标或交易条件

        如果用户已经有具体的策略逻辑，就不需要推荐策略角度

        Args:
            text: 用户输入文本

        Returns:
            是否包含具体技术指标
        """
        text_upper = text.upper()

        for keyword in TECHNICAL_INDICATOR_KEYWORDS:
            if keyword.upper() in text_upper:
                logger.debug(f"Found technical indicator keyword: {keyword}")
                return True

        return False

    def needs_perspective_recommendation(
        self,
        text: str,
        intent: IntentType,
        entities: Dict[str, Any]
    ) -> Tuple[bool, Optional[TradingConcept]]:
        """
        判断是否需要策略角度推荐

        分层澄清机制的核心逻辑：
        - Level 1: 如果用户表达了交易概念但没有具体指标 → 推荐策略角度
        - Level 2: 如果用户已经有策略角度但缺少技术参数 → 询问技术参数

        Args:
            text: 用户输入文本
            intent: 已识别的意图
            entities: 已提取的实体

        Returns:
            (是否需要推荐, 检测到的交易概念)
        """
        # 只对创建策略的意图进行策略角度推荐
        if intent != IntentType.CREATE_STRATEGY:
            return False, None

        # 检测交易概念
        concept = self.detect_trading_concept_from_text(text)

        if concept is None:
            # 没有检测到交易概念，不需要推荐角度
            logger.debug("No trading concept detected, skipping perspective recommendation")
            return False, None

        # 检查是否已经有具体的技术指标
        if self.has_specific_indicator(text):
            # 用户已经有具体策略逻辑，不需要推荐角度
            logger.debug(f"User already has specific indicators, skipping perspective recommendation")
            return False, concept

        # 检查是否已经有入场条件实体
        if entities.get("entry_conditions") or entities.get("indicators"):
            logger.debug("User already has entry conditions, skipping perspective recommendation")
            return False, concept

        # 需要推荐策略角度
        logger.info(f"Needs perspective recommendation for concept: {concept}")
        return True, concept


async def get_intent_service(user_id: Optional[str] = None) -> IntentService:
    """
    获取意图服务实例 (P0 优化: 自动初始化缓存)

    Args:
        user_id: 用户 ID (可选，用于加载用户模型配置)

    Returns:
        IntentService 实例
    """
    llm_service = get_llm_service()
    llm_router = get_llm_router()

    # P0 优化: 获取意图缓存实例
    intent_cache = await get_intent_cache()

    return IntentService(
        llm_service=llm_service,
        llm_router=llm_router,
        user_id=user_id,
        intent_cache=intent_cache,
    )
