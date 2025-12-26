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
    CanvasMode,
    ComparisonOperator,
    Constraint,
    ConstraintType,
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
    create_insight_id,
)
from ..models.schemas import IntentType, Message
from ..prompts.insight_prompts import (
    CLARIFICATION_PROMPT,
    GENERAL_CHAT_PROMPT,
    MODIFY_INSIGHT_PROMPT,
    RISK_ALERT_PROMPT,
    STRATEGY_INSIGHT_PROMPT,
)
from .llm_service import LLMService, get_llm_service

logger = logging.getLogger(__name__)


class InsightGeneratorService:
    """
    InsightData generation service

    Converts user natural language input into structured InsightData
    that can be rendered as interactive UI controls.
    """

    def __init__(self, llm_service: LLMService):
        """
        Initialize the service

        Args:
            llm_service: LLM service instance
        """
        self.llm_service = llm_service

    async def generate_insight(
        self,
        user_input: str,
        intent: IntentType,
        chat_history: List[Message],
        user_id: str,
        context: Optional[Dict[str, Any]] = None,
        target_strategy: Optional[Dict[str, Any]] = None,
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

        Returns:
            Structured InsightData
        """
        try:
            logger.info(f"Generating insight for user {user_id}, intent: {intent}")

            # Select prompt based on intent
            if intent == IntentType.CREATE_STRATEGY:
                return await self._generate_strategy_insight(
                    user_input, chat_history, context or {}
                )
            elif intent == IntentType.MODIFY_STRATEGY:
                return await self._generate_modify_insight(
                    user_input, chat_history, context or {}, target_strategy
                )
            elif intent in [IntentType.ANALYZE_MARKET, IntentType.BACKTEST]:
                # For analysis requests, still generate strategy insight with analysis focus
                return await self._generate_analysis_insight(
                    user_input, chat_history, context or {}
                )
            elif intent == IntentType.GENERAL_CHAT:
                # For general chat, return a minimal insight with just explanation
                return await self._generate_general_insight(
                    user_input, chat_history, context or {}
                )
            else:
                # For unclear intents, generate clarification insight
                return await self._generate_clarification_insight(
                    user_input, chat_history, context or {}
                )

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
                messages.append({"role": msg.type, "content": str(msg.content)})

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
                messages.append({"role": msg.type, "content": str(msg.content)})

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
                messages.append({"role": msg.type, "content": str(msg.content)})

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
    ) -> InsightData:
        """Generate insight with clarification questions"""
        formatted_history = self._format_chat_history(chat_history)

        prompt_value = CLARIFICATION_PROMPT.format_messages(
            chat_history=formatted_history,
            user_input=user_input,
            context=json.dumps(context, ensure_ascii=False),
        )

        messages = []
        system_msg = None
        for msg in prompt_value:
            if msg.type == "system":
                system_msg = str(msg.content)
            else:
                messages.append({"role": msg.type, "content": str(msg.content)})

        response = await self.llm_service.generate_json_response(
            messages=messages,
            system=system_msg,
            temperature=0.5,
        )

        return self._parse_insight_response(response, InsightType.STRATEGY_CREATE)

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
                messages.append({"role": msg.type, "content": str(msg.content)})

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
        # For now, return a basic evidence structure
        # Full implementation would parse chart and comparison data
        return InsightEvidence(
            chart=None,  # TODO: Parse chart data
            comparison=None,  # TODO: Parse comparison data
        )

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


async def get_insight_service() -> InsightGeneratorService:
    """Get insight generator service instance"""
    llm_service = get_llm_service()
    return InsightGeneratorService(llm_service)
