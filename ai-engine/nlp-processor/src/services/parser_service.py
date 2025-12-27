"""策略解析服务"""

import json
import logging
from typing import Any, Dict, List, Optional

from ..models.schemas import (
    ParseStrategyRequest,
    ParseStrategyResponse,
    StrategyConfig,
)
from ..prompts.strategy_prompts import STRATEGY_PARSING_PROMPT
from .llm_service import LLMService, get_llm_service

logger = logging.getLogger(__name__)


class ParserService:
    """策略解析服务"""

    def __init__(self, llm_service: LLMService):
        """
        初始化解析服务

        Args:
            llm_service: LLM 服务实例
        """
        self.llm_service = llm_service

    async def parse_strategy(
        self, request: ParseStrategyRequest
    ) -> ParseStrategyResponse:
        """
        解析策略描述

        Args:
            request: 策略解析请求

        Returns:
            策略解析响应
        """
        try:
            logger.info(f"Parsing strategy for user {request.user_id}")

            # 构建上下文
            context = json.dumps(request.context or {}, ensure_ascii=False)

            # 构建提示
            prompt_value = STRATEGY_PARSING_PROMPT.format_messages(
                strategy_description=request.description, context=context
            )

            # 转换为 API 消息格式
            messages = []
            for msg in prompt_value:
                if msg.type == "system":
                    continue
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

            # 验证和解析响应
            return await self._validate_and_build_response(response)

        except Exception as e:
            logger.error(f"Error parsing strategy: {e}")
            return ParseStrategyResponse(
                success=False,
                strategy=None,
                errors=[f"解析失败: {str(e)}"],
                warnings=None,
                suggestions=None,
                confidence=0.0,
            )

    async def _validate_and_build_response(
        self, llm_response: Dict[str, Any]
    ) -> ParseStrategyResponse:
        """
        验证并构建响应

        Args:
            llm_response: LLM 返回的 JSON

        Returns:
            策略解析响应
        """
        errors: List[str] = []
        warnings: List[str] = []
        suggestions: List[str] = []

        try:
            # 尝试构建 StrategyConfig
            strategy_data = llm_response

            # 如果 LLM 返回的是包装格式
            if "strategy" in llm_response:
                strategy_data = llm_response["strategy"]
                errors = llm_response.get("errors", [])
                warnings = llm_response.get("warnings", [])
                suggestions = llm_response.get("suggestions", [])

            # 验证必填字段
            required_fields = [
                "name",
                "strategy_type",
                "symbol",
                "timeframe",
                "entry_conditions",
                "entry_action",
            ]

            for field in required_fields:
                if field not in strategy_data:
                    errors.append(f"缺少必填字段: {field}")

            if errors:
                return ParseStrategyResponse(
                    success=False,
                    strategy=None,
                    errors=errors,
                    warnings=warnings,
                    suggestions=suggestions,
                    confidence=0.0,
                )

            # 构建 StrategyConfig
            try:
                strategy = StrategyConfig(**strategy_data)
            except Exception as e:
                errors.append(f"策略配置验证失败: {str(e)}")
                return ParseStrategyResponse(
                    success=False,
                    strategy=None,
                    errors=errors,
                    warnings=warnings,
                    suggestions=suggestions,
                    confidence=0.0,
                )

            # 进行额外的业务逻辑验证
            await self._validate_strategy_logic(strategy, warnings, suggestions)

            # 计算置信度
            confidence = self._calculate_confidence(strategy, warnings, errors)

            return ParseStrategyResponse(
                success=True,
                strategy=strategy,
                errors=errors if errors else None,
                warnings=warnings if warnings else None,
                suggestions=suggestions if suggestions else None,
                confidence=confidence,
            )

        except Exception as e:
            logger.error(f"Error validating strategy response: {e}")
            return ParseStrategyResponse(
                success=False,
                strategy=None,
                errors=[f"验证失败: {str(e)}"],
                warnings=None,
                suggestions=None,
                confidence=0.0,
            )

    async def _validate_strategy_logic(
        self, strategy: StrategyConfig, warnings: List[str], suggestions: List[str]
    ) -> None:
        """
        验证策略逻辑

        Args:
            strategy: 策略配置
            warnings: 警告列表
            suggestions: 建议列表
        """
        # 检查风险管理
        if not strategy.risk_management:
            warnings.append("未设置风险管理参数")
            suggestions.append("建议添加止损、止盈和仓位管理")
        else:
            if not strategy.risk_management.stop_loss_percent:
                warnings.append("未设置止损")
                suggestions.append("建议设置止损以控制风险")

            if not strategy.risk_management.max_position_size and not strategy.risk_management.max_position_percent:
                warnings.append("未设置最大仓位限制")
                suggestions.append("建议设置最大仓位以控制风险敞口")

        # 检查出场条件
        if not strategy.exit_conditions:
            warnings.append("未设置出场条件")
            suggestions.append("建议设置明确的出场条件")

        # 检查入场条件的合理性
        if len(strategy.entry_conditions) > 5:
            warnings.append("入场条件过多可能导致交易机会减少")
            suggestions.append("建议简化入场条件，保留核心信号")

        # 检查订单类型和动作的匹配
        if strategy.entry_action.order_type == "limit" and not strategy.entry_action.price:
            warnings.append("限价单未指定价格")
            suggestions.append("限价单需要指定具体价格或价格偏移")

    def _calculate_confidence(
        self, strategy: StrategyConfig, warnings: List[str], errors: List[str]
    ) -> float:
        """
        计算置信度

        Args:
            strategy: 策略配置
            warnings: 警告列表
            errors: 错误列表

        Returns:
            置信度分数 (0-1)
        """
        confidence = 1.0

        # 错误降低置信度
        confidence -= len(errors) * 0.2

        # 警告降低置信度
        confidence -= len(warnings) * 0.1

        # 缺少风险管理降低置信度
        if not strategy.risk_management:
            confidence -= 0.15

        # 缺少出场条件降低置信度
        if not strategy.exit_conditions:
            confidence -= 0.1

        # 确保置信度在 [0, 1] 范围内
        return max(0.0, min(1.0, confidence))


async def get_parser_service() -> ParserService:
    """获取解析服务实例"""
    llm_service = get_llm_service()
    return ParserService(llm_service)
