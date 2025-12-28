"""
InsightData Generation Service

A2UI (Agent-to-UI) core service that generates structured InsightData
instead of plain text responses.
"""

import json
import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from ..models.insight_schemas import (
    Candle,
    CanvasMode,
    ChartData,
    ChartOverlay,
    ChartSignal,
    ClarificationCategory,
    ClarificationInsight,
    ClarificationOption,
    ClarificationOptionType,
    ComparisonData,
    ComparisonOperator,
    Constraint,
    ConstraintType,
    EquityCurvePoint,
    HeatmapZone,
    ImpactMetric,
    ImpactMetricKey,
    InsightData,
    InsightEvidence,
    InsightImpact,
    InsightParam,
    InsightTarget,
    InsightType,
    LogicCondition,
    ParamConfig,
    ParamOption,
    ParamType,
    RiskAlertInsight,
    RiskAlertSeverity,
    RiskAlertType,
    TimeoutAction,
    create_clarification_insight,
    create_insight_id,
)
from ..models.schemas import IntentType, Message
from ..prompts.insight_prompts import (
    BACKTEST_INSIGHT_PROMPT,
    CLARIFICATION_PROMPT,
    GENERAL_CHAT_PROMPT,
    MODIFY_INSIGHT_PROMPT,
    OPTIMIZE_INSIGHT_PROMPT,
    RISK_ALERT_PROMPT,
    RISK_ANALYSIS_PROMPT,
    STRATEGY_INSIGHT_PROMPT,
)
from .llm_service import LLMService, get_llm_service
from .reasoning_service import ReasoningChainService, get_reasoning_service

logger = logging.getLogger(__name__)


class InsightGeneratorService:
    """
    InsightData generation service

    Converts user natural language input into structured InsightData
    that can be rendered as interactive UI controls.
    """

    # Keywords that indicate abstract/vague requests requiring clarification
    ABSTRACT_KEYWORDS = [
        # 哲学/概念性
        "哲学", "思考", "理念", "概念", "思想", "智慧",
        # 模糊风险描述
        "稳定", "保守", "激进", "稳健", "安全", "波动",
        # 模糊收益描述
        "赚钱", "盈利", "收益", "躺赚", "被动收入",
        # 非具体描述
        "好的", "简单", "容易", "自动", "智能", "最好",
        # 新手描述
        "入门", "初学", "不懂", "新手", "小白",
    ]

    # Required parameters for strategy creation
    REQUIRED_STRATEGY_PARAMS = {
        "symbol": ["交易对", "币种", "BTC", "ETH", "SOL", "DOGE", "USDT"],
        "timeframe": ["周期", "小时", "分钟", "日线", "1h", "4h", "1d", "15m"],
        "strategy_type": ["策略", "网格", "RSI", "MACD", "趋势", "均线", "布林", "定投"],
    }

    def __init__(self, llm_service: LLMService, reasoning_service: Optional[ReasoningChainService] = None):
        """
        Initialize the service

        Args:
            llm_service: LLM service instance
            reasoning_service: Reasoning chain service instance (optional)
        """
        self.llm_service = llm_service
        self.reasoning_service = reasoning_service

    def _assess_intent_completeness(
        self,
        user_input: str,
        intent: IntentType,
        entities: Dict[str, Any],
    ) -> tuple[bool, List[str], bool]:
        """
        Assess whether user input has sufficient information for intent execution

        Args:
            user_input: User's raw input text
            intent: Detected intent type
            entities: Extracted entities from intent recognition

        Returns:
            Tuple of (is_complete, missing_params, has_abstract_concepts)
        """
        if intent != IntentType.CREATE_STRATEGY:
            # Only apply completeness check to strategy creation for now
            return (True, [], False)

        user_input_lower = user_input.lower()

        # Check for abstract/vague keywords
        has_abstract = any(
            keyword in user_input for keyword in self.ABSTRACT_KEYWORDS
        )

        # Check for required parameters
        missing_params = []
        for param_key, keywords in self.REQUIRED_STRATEGY_PARAMS.items():
            # Check if parameter is in entities
            if param_key in entities and entities[param_key]:
                continue

            # Check if any keyword appears in input
            found = any(kw.lower() in user_input_lower for kw in keywords)
            if not found:
                missing_params.append(param_key)

        # Determine if request is complete
        # Incomplete if: has abstract concepts OR missing 2+ required params
        is_complete = not has_abstract and len(missing_params) < 2

        logger.debug(
            f"Intent completeness check: complete={is_complete}, "
            f"missing={missing_params}, abstract={has_abstract}"
        )

        return (is_complete, missing_params, has_abstract)

    def _attach_reasoning_chain(
        self,
        insight: InsightData,
        reasoning_chain: Optional[Any],
    ) -> InsightData:
        """
        Attach reasoning chain to InsightData

        A2UI 2.0: Add reasoning chain to insight for transparency.
        Users can see how AI arrived at its recommendations.

        Args:
            insight: The generated InsightData
            reasoning_chain: The reasoning chain (if generated)

        Returns:
            InsightData with reasoning chain attached
        """
        if reasoning_chain is not None:
            insight.reasoning_chain = reasoning_chain.model_dump()
            insight.show_reasoning = True  # Default to showing reasoning
            insight.reasoning_display_mode = "collapsed"  # Start collapsed

            # Update the reasoning chain with insight ID for linkage
            if hasattr(reasoning_chain, 'insight_id'):
                reasoning_chain.insight_id = insight.id

            logger.debug(f"Attached reasoning chain to insight {insight.id}")

        return insight

    async def generate_insight(
        self,
        user_input: str,
        intent: IntentType,
        chat_history: List[Message],
        user_id: str,
        context: Optional[Dict[str, Any]] = None,
        target_strategy: Optional[Dict[str, Any]] = None,
        include_reasoning: bool = True,  # 新增：是否包含推理链
    ) -> InsightData:
        """
        Generate InsightData from user input

        Args:
            user_input: User's natural language input
            intent: Detected intent type
            chat_history: Conversation history
            user_id: User ID
            context: Additional context
            target_strategy: Target strategy for modifications
            include_reasoning: Whether to generate and include reasoning chain

        Returns:
            Structured InsightData with optional reasoning chain
        """
        try:
            logger.info(f"Generating insight for user {user_id}, intent: {intent}")

            # Extract entities from context
            entities = (context or {}).get("entities", {})

            # A2UI 2.0: Generate reasoning chain if service is available
            reasoning_chain = None
            if include_reasoning and self.reasoning_service:
                try:
                    reasoning_chain = await self.reasoning_service.generate_reasoning_chain(
                        user_input=user_input,
                        intent=intent,
                        context=context,
                    )
                    logger.info(f"Generated reasoning chain with {len(reasoning_chain.nodes)} nodes")
                except Exception as e:
                    logger.warning(f"Failed to generate reasoning chain: {e}")

            # A2UI Core: Check intent completeness before proceeding
            is_complete, missing_params, has_abstract = self._assess_intent_completeness(
                user_input, intent, entities
            )

            # If request is incomplete, generate clarification instead
            if not is_complete and intent == IntentType.CREATE_STRATEGY:
                logger.info(
                    f"Request incomplete (missing={missing_params}, abstract={has_abstract}), "
                    "generating clarification insight"
                )
                insight = await self._generate_clarification_insight(
                    user_input,
                    chat_history,
                    context or {},
                    missing_params=missing_params,
                    has_abstract=has_abstract,
                )
                return self._attach_reasoning_chain(insight, reasoning_chain)

            # Select prompt based on intent and generate InsightData
            insight: InsightData

            if intent == IntentType.CREATE_STRATEGY:
                insight = await self._generate_strategy_insight(
                    user_input, chat_history, context or {}
                )
            elif intent == IntentType.MODIFY_STRATEGY:
                insight = await self._generate_modify_insight(
                    user_input, chat_history, context or {}, target_strategy
                )
            elif intent == IntentType.OPTIMIZE_STRATEGY:
                # 策略优化建议
                insight = await self._generate_optimize_insight(
                    user_input, chat_history, context or {}, target_strategy
                )
            elif intent == IntentType.BACKTEST_SUGGEST:
                # 回测建议
                insight = await self._generate_backtest_insight(
                    user_input, chat_history, context or {}, target_strategy
                )
            elif intent == IntentType.RISK_ANALYSIS:
                # 风险分析
                insight = await self._generate_risk_analysis_insight(
                    user_input, chat_history, context or {}
                )
            elif intent in [IntentType.ANALYZE_MARKET, IntentType.BACKTEST]:
                # For analysis requests, still generate strategy insight with analysis focus
                insight = await self._generate_analysis_insight(
                    user_input, chat_history, context or {}
                )
            elif intent == IntentType.GENERAL_CHAT:
                # For general chat, return a minimal insight with just explanation
                insight = await self._generate_general_insight(
                    user_input, chat_history, context or {}
                )
            else:
                # For unclear intents, generate clarification insight
                insight = await self._generate_clarification_insight(
                    user_input, chat_history, context or {}
                )

            # A2UI 2.0: Attach reasoning chain to insight before returning
            return self._attach_reasoning_chain(insight, reasoning_chain)

        except Exception as e:
            logger.error(f"Error generating insight: {e}", exc_info=True)
            return self._create_error_insight(str(e))

    async def _generate_strategy_insight(
        self,
        user_input: str,
        chat_history: List[Message],
        context: Dict[str, Any],
    ) -> InsightData:
        """Generate InsightData for strategy creation"""
        # Format chat history for the prompt
        formatted_history = self._format_chat_history(chat_history)

        # Prepare prompt
        prompt_value = STRATEGY_INSIGHT_PROMPT.format_messages(
            chat_history=formatted_history,
            user_input=user_input,
            context=json.dumps(context, ensure_ascii=False),
        )

        # Convert to API format
        messages = []
        system_msg = None
        for msg in prompt_value:
            if msg.type == "system":
                system_msg = str(msg.content)
            else:
                # LangChain 使用 "human"，OpenAI API 需要 "user"
                role = "user" if msg.type == "human" else msg.type
                messages.append({"role": role, "content": str(msg.content)})

        # Call LLM for JSON response
        response = await self.llm_service.generate_json_response(
            messages=messages,
            system=system_msg,
            temperature=0.3,
        )

        # Parse and validate response
        return self._parse_insight_response(response, InsightType.STRATEGY_CREATE)

    async def _generate_modify_insight(
        self,
        user_input: str,
        chat_history: List[Message],
        context: Dict[str, Any],
        target_strategy: Optional[Dict[str, Any]],
    ) -> InsightData:
        """Generate InsightData for strategy modification"""
        formatted_history = self._format_chat_history(chat_history)

        prompt_value = MODIFY_INSIGHT_PROMPT.format_messages(
            chat_history=formatted_history,
            user_input=user_input,
            target_strategy=json.dumps(target_strategy or {}, ensure_ascii=False),
            context=json.dumps(context, ensure_ascii=False),
        )

        messages = []
        system_msg = None
        for msg in prompt_value:
            if msg.type == "system":
                system_msg = str(msg.content)
            else:
                # LangChain 使用 "human"，OpenAI API 需要 "user"
                role = "user" if msg.type == "human" else msg.type
                messages.append({"role": role, "content": str(msg.content)})

        response = await self.llm_service.generate_json_response(
            messages=messages,
            system=system_msg,
            temperature=0.3,
        )

        insight = self._parse_insight_response(response, InsightType.STRATEGY_MODIFY)

        # Add target information if available
        if target_strategy and "target" not in response:
            insight.target = InsightTarget(
                strategy_id=target_strategy.get("id", ""),
                name=target_strategy.get("name", ""),
                symbol=target_strategy.get("symbol", ""),
            )

        return insight

    async def _generate_analysis_insight(
        self,
        user_input: str,
        chat_history: List[Message],
        context: Dict[str, Any],
    ) -> InsightData:
        """Generate InsightData for market analysis"""
        # Use strategy prompt but with analysis context
        context["analysis_mode"] = True
        return await self._generate_strategy_insight(user_input, chat_history, context)

    async def _generate_optimize_insight(
        self,
        user_input: str,
        chat_history: List[Message],
        context: Dict[str, Any],
        target_strategy: Optional[Dict[str, Any]],
    ) -> InsightData:
        """Generate InsightData for strategy optimization suggestions"""
        formatted_history = self._format_chat_history(chat_history)

        # 准备策略配置和表现数据
        strategy_config = json.dumps(target_strategy or {}, ensure_ascii=False)
        performance_data = json.dumps(context.get("performance", {
            "totalReturn": 12.3,
            "sharpeRatio": 1.42,
            "maxDrawdown": -12.5,
            "winRate": 58.2,
            "totalTrades": 156
        }), ensure_ascii=False)
        market_context = json.dumps(context.get("market", {
            "trend": "bullish",
            "volatility": "medium",
            "btcPrice": 87000
        }), ensure_ascii=False)

        prompt_value = OPTIMIZE_INSIGHT_PROMPT.format_messages(
            chat_history=formatted_history,
            user_input=user_input,
            strategy_config=strategy_config,
            performance_data=performance_data,
            market_context=market_context,
        )

        messages = []
        system_msg = None
        for msg in prompt_value:
            if msg.type == "system":
                system_msg = str(msg.content)
            else:
                role = "user" if msg.type == "human" else msg.type
                messages.append({"role": role, "content": str(msg.content)})

        response = await self.llm_service.generate_json_response(
            messages=messages,
            system=system_msg,
            temperature=0.3,
        )

        insight = self._parse_insight_response(response, InsightType.STRATEGY_OPTIMIZE)

        # Add target information if available
        if target_strategy and insight.target is None:
            insight.target = InsightTarget(
                strategy_id=target_strategy.get("id", ""),
                name=target_strategy.get("name", ""),
                symbol=target_strategy.get("symbol", ""),
            )

        return insight

    async def _generate_backtest_insight(
        self,
        user_input: str,
        chat_history: List[Message],
        context: Dict[str, Any],
        target_strategy: Optional[Dict[str, Any]],
    ) -> InsightData:
        """Generate InsightData for backtest suggestions"""
        formatted_history = self._format_chat_history(chat_history)

        strategy_config = json.dumps(target_strategy or {}, ensure_ascii=False)
        data_range = json.dumps(context.get("dataRange", {
            "start": "2024-01-01",
            "end": "2024-12-26",
            "symbols": ["BTC/USDT", "ETH/USDT", "SOL/USDT"],
            "timeframes": ["1h", "4h", "1d"]
        }), ensure_ascii=False)

        prompt_value = BACKTEST_INSIGHT_PROMPT.format_messages(
            chat_history=formatted_history,
            user_input=user_input,
            strategy_config=strategy_config,
            data_range=data_range,
        )

        messages = []
        system_msg = None
        for msg in prompt_value:
            if msg.type == "system":
                system_msg = str(msg.content)
            else:
                role = "user" if msg.type == "human" else msg.type
                messages.append({"role": role, "content": str(msg.content)})

        response = await self.llm_service.generate_json_response(
            messages=messages,
            system=system_msg,
            temperature=0.3,
        )

        insight = self._parse_insight_response(response, InsightType.BACKTEST_SUGGEST)

        # Add target information if available
        if target_strategy and insight.target is None:
            insight.target = InsightTarget(
                strategy_id=target_strategy.get("id", ""),
                name=target_strategy.get("name", ""),
                symbol=target_strategy.get("symbol", ""),
            )

        return insight

    async def _generate_risk_analysis_insight(
        self,
        user_input: str,
        chat_history: List[Message],
        context: Dict[str, Any],
    ) -> InsightData:
        """Generate InsightData for portfolio risk analysis"""
        formatted_history = self._format_chat_history(chat_history)

        # 准备投资组合和策略数据
        portfolio = json.dumps(context.get("portfolio", {
            "totalValue": 50000,
            "positions": [
                {"symbol": "BTC/USDT", "value": 25000, "percentage": 50},
                {"symbol": "ETH/USDT", "value": 15000, "percentage": 30},
                {"symbol": "SOL/USDT", "value": 10000, "percentage": 20}
            ]
        }), ensure_ascii=False)

        active_strategies = json.dumps(context.get("strategies", [
            {"id": "strategy_1", "name": "RSI 反弹", "symbol": "BTC/USDT", "status": "running"},
            {"id": "strategy_2", "name": "网格交易", "symbol": "ETH/USDT", "status": "running"}
        ]), ensure_ascii=False)

        market_data = json.dumps(context.get("market", {
            "btcPrice": 87000,
            "volatilityIndex": 45,
            "fearGreedIndex": 65,
            "trend": "bullish"
        }), ensure_ascii=False)

        prompt_value = RISK_ANALYSIS_PROMPT.format_messages(
            chat_history=formatted_history,
            user_input=user_input,
            portfolio=portfolio,
            active_strategies=active_strategies,
            market_data=market_data,
        )

        messages = []
        system_msg = None
        for msg in prompt_value:
            if msg.type == "system":
                system_msg = str(msg.content)
            else:
                role = "user" if msg.type == "human" else msg.type
                messages.append({"role": role, "content": str(msg.content)})

        response = await self.llm_service.generate_json_response(
            messages=messages,
            system=system_msg,
            temperature=0.3,
        )

        return self._parse_insight_response(response, InsightType.RISK_ANALYSIS)

    async def _generate_general_insight(
        self,
        user_input: str,
        chat_history: List[Message],
        context: Dict[str, Any],
    ) -> InsightData:
        """Generate a minimal insight for general chat"""
        formatted_history = self._format_chat_history(chat_history)

        prompt_value = GENERAL_CHAT_PROMPT.format_messages(
            chat_history=formatted_history,
            user_input=user_input,
        )

        messages = []
        system_msg = None
        for msg in prompt_value:
            if msg.type == "system":
                system_msg = str(msg.content)
            else:
                # LangChain 使用 "human"，OpenAI API 需要 "user"
                role = "user" if msg.type == "human" else msg.type
                messages.append({"role": role, "content": str(msg.content)})

        # For general chat, we may get plain text response
        response_text = await self.llm_service.generate_response(
            messages=messages,
            system=system_msg,
            temperature=0.7,
        )

        # Create a minimal insight with just the explanation
        return InsightData(
            id=create_insight_id(),
            type=InsightType.STRATEGY_CREATE,  # Default type
            params=[],
            explanation=response_text,
            created_at=datetime.now().isoformat(),
        )

    async def _generate_clarification_insight(
        self,
        user_input: str,
        chat_history: List[Message],
        context: Dict[str, Any],
        missing_params: Optional[List[str]] = None,
        has_abstract: bool = False,
    ) -> ClarificationInsight:
        """
        Generate ClarificationInsight for vague/incomplete requests

        This is the core A2UI mechanism for handling unclear user intent.
        Instead of guessing, we ask structured questions with options.

        Args:
            user_input: User's raw input
            chat_history: Conversation history
            context: Additional context
            missing_params: List of missing required parameters
            has_abstract: Whether the request contains abstract concepts

        Returns:
            ClarificationInsight with structured question and options
        """
        formatted_history = self._format_chat_history(chat_history)
        missing_params = missing_params or []
        collected_params = context.get("collected_params", {})

        # Prepare prompt with missing params info
        prompt_value = CLARIFICATION_PROMPT.format_messages(
            chat_history=formatted_history,
            user_input=user_input,
            collected_params=json.dumps(collected_params, ensure_ascii=False),
            missing_params=json.dumps(missing_params, ensure_ascii=False),
            context=json.dumps(context, ensure_ascii=False),
        )

        messages = []
        system_msg = None
        for msg in prompt_value:
            if msg.type == "system":
                system_msg = str(msg.content)
            else:
                role = "user" if msg.type == "human" else msg.type
                messages.append({"role": role, "content": str(msg.content)})

        # Call LLM to generate clarification
        response = await self.llm_service.generate_json_response(
            messages=messages,
            system=system_msg,
            temperature=0.5,
        )

        # Parse the clarification response
        return self._parse_clarification_response(
            response,
            collected_params=collected_params,
            remaining_count=len(missing_params),
        )

    def _parse_clarification_response(
        self,
        response: Dict[str, Any],
        collected_params: Optional[Dict[str, Any]] = None,
        remaining_count: int = 0,
    ) -> ClarificationInsight:
        """
        Parse LLM response into ClarificationInsight

        Args:
            response: LLM JSON response
            collected_params: Already collected parameters
            remaining_count: Estimated remaining questions

        Returns:
            ClarificationInsight
        """
        try:
            # Parse category
            category_str = response.get("category", "general")
            try:
                category = ClarificationCategory(category_str)
            except ValueError:
                category = ClarificationCategory.GENERAL

            # Parse option type
            option_type_str = response.get("option_type", "single")
            try:
                option_type = ClarificationOptionType(option_type_str)
            except ValueError:
                option_type = ClarificationOptionType.SINGLE

            # Parse options
            options = []
            for opt in response.get("options", []):
                options.append(
                    ClarificationOption(
                        id=opt.get("id", ""),
                        label=opt.get("label", ""),
                        description=opt.get("description"),
                        icon=opt.get("icon"),
                        recommended=opt.get("recommended", False),
                    )
                )

            # Build ClarificationInsight
            return ClarificationInsight(
                id=create_insight_id(),
                type=InsightType.CLARIFICATION,
                params=[],  # Clarification uses options, not params
                question=response.get("question", "请提供更多信息"),
                category=category,
                option_type=option_type,
                options=options,
                allow_custom_input=response.get("allow_custom_input", True),
                custom_input_placeholder=response.get("custom_input_placeholder"),
                context_hint=response.get("context_hint"),
                collected_params=collected_params or {},
                remaining_questions=response.get("remaining_questions", remaining_count),
                explanation=response.get("explanation", ""),
                created_at=datetime.now().isoformat(),
            )

        except Exception as e:
            logger.error(f"Error parsing clarification response: {e}")
            # Return a fallback clarification
            return ClarificationInsight(
                id=create_insight_id(),
                type=InsightType.CLARIFICATION,
                params=[],
                question="您希望交易什么币种？",
                category=ClarificationCategory.TRADING_PAIR,
                option_type=ClarificationOptionType.SINGLE,
                options=[
                    ClarificationOption(
                        id="btc",
                        label="BTC/USDT",
                        description="比特币，市值最大的加密货币",
                        recommended=True,
                    ),
                    ClarificationOption(
                        id="eth",
                        label="ETH/USDT",
                        description="以太坊，最大的智能合约平台",
                        recommended=False,
                    ),
                    ClarificationOption(
                        id="sol",
                        label="SOL/USDT",
                        description="Solana，高性能公链",
                        recommended=False,
                    ),
                ],
                allow_custom_input=True,
                custom_input_placeholder="或输入其他交易对...",
                context_hint="选择交易对是创建策略的第一步",
                collected_params=collected_params or {},
                remaining_questions=remaining_count,
                explanation="让我们从选择交易对开始，这将帮助我为您定制最合适的策略。",
                created_at=datetime.now().isoformat(),
            )

    async def generate_risk_alert(
        self,
        risk_event: str,
        affected_strategies: List[Dict[str, Any]],
        market_data: Dict[str, Any],
    ) -> RiskAlertInsight:
        """
        Generate a risk alert insight

        Args:
            risk_event: Description of the risk event
            affected_strategies: List of affected strategies
            market_data: Current market data

        Returns:
            RiskAlertInsight
        """
        prompt_value = RISK_ALERT_PROMPT.format_messages(
            risk_event=risk_event,
            affected_strategies=json.dumps(affected_strategies, ensure_ascii=False),
            market_data=json.dumps(market_data, ensure_ascii=False),
        )

        messages = []
        system_msg = None
        for msg in prompt_value:
            if msg.type == "system":
                system_msg = str(msg.content)
            else:
                # LangChain 使用 "human"，OpenAI API 需要 "user"
                role = "user" if msg.type == "human" else msg.type
                messages.append({"role": role, "content": str(msg.content)})

        response = await self.llm_service.generate_json_response(
            messages=messages,
            system=system_msg,
            temperature=0.2,  # Lower temperature for risk alerts
        )

        return self._parse_risk_alert_response(response)

    def _format_chat_history(self, messages: List[Message]) -> List[tuple]:
        """Format chat history for LangChain prompts"""
        formatted = []
        for msg in messages[-10:]:  # Limit to last 10 messages
            role = "human" if msg.role.value == "user" else msg.role.value
            formatted.append((role, msg.content))
        return formatted

    def _parse_insight_response(
        self,
        response: Dict[str, Any],
        default_type: InsightType,
    ) -> InsightData:
        """Parse LLM response into InsightData"""
        try:
            # Extract type
            insight_type_str = response.get("type", default_type.value)
            try:
                insight_type = InsightType(insight_type_str)
            except ValueError:
                insight_type = default_type

            # Parse params
            params = self._parse_params(response.get("params", []))

            # Parse evidence if present
            evidence = None
            if "evidence" in response:
                evidence = self._parse_evidence(response["evidence"])

            # Parse impact if present
            impact = None
            if "impact" in response:
                impact = self._parse_impact(response["impact"])

            # Parse target if present
            target = None
            if "target" in response:
                target_data = response["target"]
                target = InsightTarget(
                    strategy_id=target_data.get("strategy_id", ""),
                    name=target_data.get("name", ""),
                    symbol=target_data.get("symbol", ""),
                )

            return InsightData(
                id=create_insight_id(),
                type=insight_type,
                target=target,
                params=params,
                evidence=evidence,
                impact=impact,
                explanation=response.get("explanation", ""),
                created_at=datetime.now().isoformat(),
            )

        except Exception as e:
            logger.error(f"Error parsing insight response: {e}")
            return self._create_error_insight(f"解析响应失败: {str(e)}")

    def _parse_params(self, params_data: List[Dict[str, Any]]) -> List[InsightParam]:
        """Parse parameter list from response"""
        params = []
        for p in params_data:
            try:
                # Parse config
                config_data = p.get("config", {})
                config = ParamConfig(
                    min=config_data.get("min"),
                    max=config_data.get("max"),
                    step=config_data.get("step"),
                    unit=config_data.get("unit"),
                    precision=config_data.get("precision"),
                )

                # Parse options if present
                if "options" in config_data:
                    config.options = [
                        ParamOption(
                            value=opt.get("value", ""),
                            label=opt.get("label", ""),
                            description=opt.get("description"),
                        )
                        for opt in config_data["options"]
                    ]

                # Parse heatmap zones if present
                if "heatmap_zones" in config_data:
                    config.heatmap_zones = [
                        HeatmapZone(
                            start=zone.get("start", 0),
                            end=zone.get("end", 100),
                            color=zone.get("color", "gray"),
                            label=zone.get("label", ""),
                        )
                        for zone in config_data["heatmap_zones"]
                    ]

                # Parse constraints if present
                constraints = None
                if "constraints" in p:
                    constraints = [
                        Constraint(
                            type=ConstraintType(c.get("type", "min_max")),
                            related_param=c.get("related_param"),
                            rule=c.get("rule", ""),
                            message=c.get("message", ""),
                            severity=c.get("severity", "error"),
                        )
                        for c in p["constraints"]
                    ]

                param = InsightParam(
                    key=p.get("key", f"param_{len(params)}"),
                    label=p.get("label", ""),
                    type=ParamType(p.get("type", "number")),
                    value=p.get("value"),
                    old_value=p.get("old_value"),
                    level=p.get("level", 1),
                    config=config,
                    constraints=constraints,
                    description=p.get("description"),
                    disabled=p.get("disabled"),
                )
                params.append(param)

            except Exception as e:
                logger.warning(f"Failed to parse param {p}: {e}")
                continue

        return params

    def _parse_evidence(self, evidence_data: Dict[str, Any]) -> InsightEvidence:
        """Parse evidence data from response"""
        chart = None
        comparison = None

        # Parse chart data
        if "chart" in evidence_data and evidence_data["chart"]:
            chart = self._parse_chart_data(evidence_data["chart"])

        # Parse comparison data
        if "comparison" in evidence_data and evidence_data["comparison"]:
            comparison = self._parse_comparison_data(evidence_data["comparison"])

        return InsightEvidence(
            chart=chart,
            comparison=comparison,
        )

    def _parse_chart_data(self, chart_data: Dict[str, Any]) -> Optional[ChartData]:
        """Parse chart data from LLM response"""
        try:
            # Parse candles
            candles = []
            for c in chart_data.get("candles", []):
                try:
                    candle = Candle(
                        timestamp=int(c.get("timestamp", 0)),
                        open=float(c.get("open", 0)),
                        high=float(c.get("high", 0)),
                        low=float(c.get("low", 0)),
                        close=float(c.get("close", 0)),
                        volume=float(c.get("volume", 0)),
                    )
                    candles.append(candle)
                except (ValueError, TypeError) as e:
                    logger.warning(f"Failed to parse candle: {c}, error: {e}")
                    continue

            if not candles:
                logger.warning("No valid candles in chart data")
                return None

            # Parse signals
            signals = None
            if "signals" in chart_data and chart_data["signals"]:
                signals = []
                for s in chart_data["signals"]:
                    try:
                        signal_type = s.get("type", "buy")
                        if signal_type not in ["buy", "sell", "close"]:
                            signal_type = "buy"
                        signal = ChartSignal(
                            timestamp=int(s.get("timestamp", 0)),
                            type=signal_type,
                            price=float(s.get("price", 0)),
                            label=s.get("label"),
                        )
                        signals.append(signal)
                    except (ValueError, TypeError) as e:
                        logger.warning(f"Failed to parse signal: {s}, error: {e}")
                        continue

            # Parse overlays
            overlays = None
            if "overlays" in chart_data and chart_data["overlays"]:
                overlays = []
                for o in chart_data["overlays"]:
                    try:
                        overlay = ChartOverlay(
                            name=o.get("name", "Unknown"),
                            color=o.get("color", "#3b82f6"),
                            data=o.get("data", []),
                        )
                        overlays.append(overlay)
                    except Exception as e:
                        logger.warning(f"Failed to parse overlay: {o}, error: {e}")
                        continue

            return ChartData(
                symbol=chart_data.get("symbol", "BTC/USDT"),
                timeframe=chart_data.get("timeframe", "1h"),
                candles=candles,
                signals=signals,
                overlays=overlays,
            )

        except Exception as e:
            logger.error(f"Error parsing chart data: {e}")
            return None

    def _parse_comparison_data(self, comparison_data: Dict[str, Any]) -> Optional[ComparisonData]:
        """Parse comparison data from LLM response"""
        try:
            # Parse original equity curve
            original = []
            for p in comparison_data.get("original", []):
                try:
                    point = EquityCurvePoint(
                        timestamp=int(p.get("timestamp", 0)),
                        value=float(p.get("value", 100)),
                    )
                    original.append(point)
                except (ValueError, TypeError) as e:
                    logger.warning(f"Failed to parse original point: {p}, error: {e}")
                    continue

            if not original:
                logger.warning("No valid original points in comparison data")
                return None

            # Parse modified equity curve
            modified = []
            for p in comparison_data.get("modified", []):
                try:
                    point = EquityCurvePoint(
                        timestamp=int(p.get("timestamp", 0)),
                        value=float(p.get("value", 100)),
                    )
                    modified.append(point)
                except (ValueError, TypeError) as e:
                    logger.warning(f"Failed to parse modified point: {p}, error: {e}")
                    continue

            if not modified:
                logger.warning("No valid modified points in comparison data")
                return None

            # Parse baseline (optional)
            baseline = None
            if "baseline" in comparison_data and comparison_data["baseline"]:
                baseline = []
                for p in comparison_data["baseline"]:
                    try:
                        point = EquityCurvePoint(
                            timestamp=int(p.get("timestamp", 0)),
                            value=float(p.get("value", 100)),
                        )
                        baseline.append(point)
                    except (ValueError, TypeError) as e:
                        logger.warning(f"Failed to parse baseline point: {p}, error: {e}")
                        continue

            return ComparisonData(
                original=original,
                modified=modified,
                baseline=baseline,
            )

        except Exception as e:
            logger.error(f"Error parsing comparison data: {e}")
            return None

    def _parse_impact(self, impact_data: Dict[str, Any]) -> InsightImpact:
        """Parse impact data from response"""
        metrics = []
        for m in impact_data.get("metrics", []):
            try:
                metric = ImpactMetric(
                    key=ImpactMetricKey(m.get("key", "expectedReturn")),
                    label=m.get("label", ""),
                    value=m.get("value", 0),
                    old_value=m.get("old_value"),
                    unit=m.get("unit", "%"),
                    trend=m.get("trend", "neutral"),
                )
                metrics.append(metric)
            except Exception as e:
                logger.warning(f"Failed to parse metric {m}: {e}")

        return InsightImpact(
            metrics=metrics,
            confidence=impact_data.get("confidence", 0.5),
            sample_size=impact_data.get("sample_size", 30),
        )

    def _parse_risk_alert_response(self, response: Dict[str, Any]) -> RiskAlertInsight:
        """Parse LLM response into RiskAlertInsight"""
        try:
            alert_type = RiskAlertType(response.get("alert_type", "strategy_anomaly"))
            severity = RiskAlertSeverity(response.get("severity", "warning"))

            suggested_action = self._parse_params(response.get("suggested_action", []))

            timeout_action = None
            if "timeout_action" in response:
                timeout_action = TimeoutAction(response["timeout_action"])

            return RiskAlertInsight(
                id=f"alert_{int(datetime.now().timestamp() * 1000)}_{uuid.uuid4().hex[:9]}",
                type=InsightType.RISK_ALERT,
                alert_type=alert_type,
                severity=severity,
                params=[],
                suggested_action=suggested_action,
                timeout_action=timeout_action,
                timeout_seconds=response.get("timeout_seconds"),
                affected_strategies=response.get("affected_strategies"),
                explanation=response.get("explanation", ""),
                created_at=datetime.now().isoformat(),
            )

        except Exception as e:
            logger.error(f"Error parsing risk alert response: {e}")
            # Return a default alert
            return RiskAlertInsight(
                id=f"alert_{int(datetime.now().timestamp() * 1000)}_{uuid.uuid4().hex[:9]}",
                type=InsightType.RISK_ALERT,
                alert_type=RiskAlertType.STRATEGY_ANOMALY,
                severity=RiskAlertSeverity.WARNING,
                params=[],
                suggested_action=[],
                explanation=f"风险告警解析失败: {str(e)}",
                created_at=datetime.now().isoformat(),
            )

    def _create_error_insight(self, error_message: str) -> InsightData:
        """Create an error insight when generation fails"""
        return InsightData(
            id=create_insight_id(),
            type=InsightType.STRATEGY_CREATE,
            params=[],
            explanation=f"抱歉，生成策略配置时遇到问题：{error_message}。请重新描述您的需求，或换一种方式表达。",
            created_at=datetime.now().isoformat(),
        )


# =============================================================================
# Service Factory
# =============================================================================


async def get_insight_service(include_reasoning: bool = True) -> InsightGeneratorService:
    """
    Get insight generator service instance

    Args:
        include_reasoning: Whether to include reasoning chain service (A2UI 2.0)

    Returns:
        InsightGeneratorService instance
    """
    llm_service = get_llm_service()

    # A2UI 2.0: Initialize reasoning service for transparent AI
    reasoning_service = None
    if include_reasoning:
        try:
            reasoning_service = await get_reasoning_service()
            logger.info("Reasoning chain service initialized for A2UI 2.0")
        except Exception as e:
            logger.warning(f"Failed to initialize reasoning service: {e}")

    return InsightGeneratorService(llm_service, reasoning_service)
