"""
策略优化服务
"""

from typing import Any
from loguru import logger

from langchain_anthropic import ChatAnthropic
from langchain.prompts import ChatPromptTemplate

from ..config import settings
from ..models.schemas import (
    StrategyOptimizeRequest,
    StrategyOptimizeResponse,
    OptimizationSuggestion,
)


class StrategyOptimizerService:
    """策略优化服务类"""

    def __init__(self):
        """初始化服务"""
        self.llm = ChatAnthropic(
            model=settings.ai_model,
            api_key=settings.anthropic_api_key,
            temperature=settings.ai_temperature,
            max_tokens=settings.ai_max_tokens,
        )

    async def optimize_strategy(
        self, request: StrategyOptimizeRequest
    ) -> StrategyOptimizeResponse:
        """
        优化交易策略

        Args:
            request: 优化请求

        Returns:
            优化响应
        """
        try:
            logger.info(f"开始优化策略，目标: {request.optimization_goal}")

            # 1. 解析原始策略
            original_strategy = self._parse_strategy_code(request.strategy_code)

            # 2. 使用AI分析并生成优化建议
            suggestions = await self._generate_optimization_suggestions(
                original_strategy, request.optimization_goal, request.constraints
            )

            # 3. 应用优化建议
            optimized_strategy = None
            if request.suggest_parameters and suggestions:
                optimized_strategy = self._apply_optimizations(original_strategy, suggestions)

            # 4. 生成性能对比
            performance_comparison = self._estimate_performance_comparison(
                original_strategy, optimized_strategy, suggestions
            )

            logger.info(f"策略优化完成，生成了 {len(suggestions)} 条建议")

            return StrategyOptimizeResponse(
                success=True,
                original_strategy=original_strategy,
                optimized_strategy=optimized_strategy,
                suggestions=suggestions,
                performance_comparison=performance_comparison,
            )

        except Exception as e:
            logger.error(f"策略优化失败: {str(e)}")
            return StrategyOptimizeResponse(
                success=False,
                original_strategy={},
                optimized_strategy=None,
                suggestions=[],
                performance_comparison=None,
            )

    def _parse_strategy_code(self, strategy_code: str) -> dict[str, Any]:
        """解析策略代码"""
        import json

        try:
            # 尝试解析JSON格式
            return json.loads(strategy_code)
        except json.JSONDecodeError:
            # 如果是Python代码，提取关键信息
            logger.warning("策略代码不是有效的JSON，尝试从Python代码提取信息")
            return {"code": strategy_code, "format": "python"}

    async def _generate_optimization_suggestions(
        self, strategy: dict[str, Any], goal: str, constraints: dict[str, Any]
    ) -> list[OptimizationSuggestion]:
        """使用AI生成优化建议"""
        prompt_template = ChatPromptTemplate.from_template(
            """你是一个专业的量化交易策略优化专家。请分析以下策略并提供优化建议。

原始策略:
{strategy}

优化目标: {goal}
约束条件: {constraints}

请提供具体的参数优化建议，包括:
1. 参数名称
2. 当前值
3. 建议值
4. 优化原因
5. 预期改进

以JSON格式返回建议列表:
[
  {{
    "parameter": "参数名",
    "current_value": 当前值,
    "suggested_value": 建议值,
    "reason": "优化原因",
    "expected_improvement": "预期改进"
  }}
]

优化目标说明:
- maximize_sharpe_ratio: 最大化夏普比率（风险调整后收益）
- minimize_drawdown: 最小化最大回撤
- maximize_profit: 最大化总收益
- maximize_win_rate: 最大化胜率

请基于量化交易的最佳实践提供建议。
"""
        )

        try:
            import json

            prompt = prompt_template.format(
                strategy=json.dumps(strategy, indent=2, ensure_ascii=False),
                goal=goal,
                constraints=json.dumps(constraints, ensure_ascii=False),
            )

            response = await self.llm.ainvoke(prompt)
            content = response.content

            # 提取JSON部分
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()

            suggestions_data = json.loads(content)

            # 转换为OptimizationSuggestion对象
            suggestions = [
                OptimizationSuggestion(**sugg) for sugg in suggestions_data
            ]

            return suggestions

        except Exception as e:
            logger.error(f"生成优化建议失败: {str(e)}")
            # 返回一些默认建议
            return self._get_default_suggestions(strategy, goal)

    def _get_default_suggestions(
        self, strategy: dict[str, Any], goal: str
    ) -> list[OptimizationSuggestion]:
        """获取默认优化建议"""
        suggestions = []

        # 基于优化目标的通用建议
        if goal == "minimize_drawdown":
            suggestions.append(
                OptimizationSuggestion(
                    parameter="stop_loss_percent",
                    current_value=strategy.get("risk_management", {}).get(
                        "stop_loss_percent", 0.02
                    ),
                    suggested_value=0.015,
                    reason="收紧止损可以减少单笔交易的最大损失，从而降低整体回撤",
                    expected_improvement="预期最大回撤降低15-20%",
                )
            )
            suggestions.append(
                OptimizationSuggestion(
                    parameter="max_position_size",
                    current_value=strategy.get("risk_management", {}).get(
                        "max_position_size", 0.1
                    ),
                    suggested_value=0.05,
                    reason="减少单笔仓位可以分散风险，降低回撤幅度",
                    expected_improvement="预期最大回撤降低10-15%",
                )
            )

        elif goal == "maximize_sharpe_ratio":
            suggestions.append(
                OptimizationSuggestion(
                    parameter="risk_per_trade",
                    current_value=strategy.get("parameters", {}).get("risk_per_trade", 0.02),
                    suggested_value=0.01,
                    reason="降低每笔交易风险可以提高风险调整后收益",
                    expected_improvement="预期夏普比率提升20-30%",
                )
            )

        elif goal == "maximize_profit":
            suggestions.append(
                OptimizationSuggestion(
                    parameter="take_profit_percent",
                    current_value=strategy.get("risk_management", {}).get(
                        "take_profit_percent", 0.04
                    ),
                    suggested_value=0.06,
                    reason="提高止盈目标可以获取更大的单笔利润",
                    expected_improvement="预期总收益提升15-25%",
                )
            )

        return suggestions

    def _apply_optimizations(
        self, original_strategy: dict[str, Any], suggestions: list[OptimizationSuggestion]
    ) -> dict[str, Any]:
        """应用优化建议到策略"""
        import copy

        optimized_strategy = copy.deepcopy(original_strategy)

        for suggestion in suggestions:
            # 根据参数路径更新值
            if "risk_management" in original_strategy:
                if suggestion.parameter in [
                    "stop_loss_percent",
                    "take_profit_percent",
                    "max_position_size",
                ]:
                    optimized_strategy.setdefault("risk_management", {})[
                        suggestion.parameter
                    ] = suggestion.suggested_value

            if "parameters" in original_strategy:
                if suggestion.parameter in original_strategy["parameters"]:
                    optimized_strategy.setdefault("parameters", {})[
                        suggestion.parameter
                    ] = suggestion.suggested_value

            # 添加优化标记
            optimized_strategy.setdefault("optimizations", []).append(
                {
                    "parameter": suggestion.parameter,
                    "from": suggestion.current_value,
                    "to": suggestion.suggested_value,
                    "reason": suggestion.reason,
                }
            )

        return optimized_strategy

    def _estimate_performance_comparison(
        self,
        original_strategy: dict[str, Any],
        optimized_strategy: dict[str, Any] | None,
        suggestions: list[OptimizationSuggestion],
    ) -> dict[str, Any]:
        """估算性能对比"""
        if not optimized_strategy:
            return {}

        # 基于建议估算改进
        total_expected_improvement = 0.0
        improvement_areas = []

        for suggestion in suggestions:
            if suggestion.expected_improvement:
                improvement_areas.append(
                    {
                        "area": suggestion.parameter,
                        "description": suggestion.expected_improvement,
                    }
                )

        return {
            "optimization_count": len(suggestions),
            "improvement_areas": improvement_areas,
            "risk_assessment": {
                "original_risk_level": self._assess_risk_level(original_strategy),
                "optimized_risk_level": self._assess_risk_level(optimized_strategy),
            },
            "recommendation": "建议先在模拟环境中测试优化后的策略",
        }

    def _assess_risk_level(self, strategy: dict[str, Any]) -> str:
        """评估风险级别"""
        risk_management = strategy.get("risk_management", {})

        risk_per_trade = risk_management.get("risk_per_trade", 0.02)
        max_position_size = risk_management.get("max_position_size", 0.1)

        # 简单的风险评估逻辑
        risk_score = (risk_per_trade * 100) + (max_position_size * 50)

        if risk_score < 3:
            return "低风险"
        elif risk_score < 7:
            return "中等风险"
        else:
            return "高风险"
