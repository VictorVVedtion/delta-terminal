"""
策略生成服务
"""

from typing import Any, Optional
from datetime import datetime
from loguru import logger

from langchain_anthropic import ChatAnthropic
from langchain.prompts import ChatPromptTemplate
from langchain.output_parsers import PydanticOutputParser

from ..config import settings
from ..models.schemas import (
    StrategyGenerateRequest,
    StrategyGenerateResponse,
    GeneratedStrategy,
    StrategyType,
    StrategyComplexity,
    CodeFormat,
    StrategyIndicator,
    StrategyRule,
    StrategyCondition,
    TradingSignal,
)
from ..strategies.base import BaseStrategy, StrategyFactory
from ..strategies.templates import GridStrategy, DCAStrategy, MomentumStrategy


class StrategyGeneratorService:
    """策略生成服务类"""

    def __init__(self):
        """初始化服务"""
        self.llm = ChatAnthropic(
            model=settings.ai_model,
            api_key=settings.anthropic_api_key,
            temperature=settings.ai_temperature,
            max_tokens=settings.ai_max_tokens,
        )

    async def generate_strategy(
        self, request: StrategyGenerateRequest
    ) -> StrategyGenerateResponse:
        """
        生成交易策略

        Args:
            request: 策略生成请求

        Returns:
            策略生成响应
        """
        try:
            logger.info(f"开始生成策略: {request.description}")

            # 1. 使用AI分析用户需求，提取策略信息
            strategy_info = await self._analyze_strategy_description(request)

            # 2. 确定策略类型
            strategy_type = request.strategy_type or strategy_info.get(
                "strategy_type", StrategyType.CUSTOM
            )

            # 3. 生成策略参数
            parameters = self._build_strategy_parameters(request, strategy_info)

            # 4. 创建策略实例
            strategy = self._create_strategy_instance(
                strategy_type, request.description, parameters
            )

            # 5. 生成策略规则和指标
            indicators = strategy_info.get("indicators", [])
            rules = strategy_info.get("rules", [])

            # 6. 生成代码
            code_json = None
            code_python = None

            if request.code_format in [CodeFormat.JSON, CodeFormat.BOTH]:
                code_json = strategy.to_json_config() if strategy else {}

            if request.code_format in [CodeFormat.PYTHON, CodeFormat.BOTH]:
                code_python = strategy.to_python_code() if strategy else ""

            # 7. 分析复杂度
            complexity = self._analyze_complexity(len(rules))

            # 8. 生成风险管理配置
            risk_management = self._build_risk_management(request, parameters)

            # 9. 生成建议和警告
            warnings, suggestions = self._generate_recommendations(
                strategy_type, parameters, request
            )

            # 10. 构建响应
            generated_strategy = GeneratedStrategy(
                name=self._generate_strategy_name(strategy_type, request.trading_pair),
                description=request.description,
                strategy_type=strategy_type,
                complexity=complexity,
                indicators=indicators,
                rules=rules,
                risk_management=risk_management,
                code_json=code_json,
                code_python=code_python,
            )

            logger.info(f"策略生成成功: {generated_strategy.name}")

            return StrategyGenerateResponse(
                success=True,
                strategy=generated_strategy,
                warnings=warnings,
                suggestions=suggestions,
                generated_at=datetime.now(),
            )

        except Exception as e:
            logger.error(f"策略生成失败: {str(e)}")
            return StrategyGenerateResponse(
                success=False,
                strategy=None,
                warnings=[f"生成失败: {str(e)}"],
                suggestions=["请检查输入参数并重试"],
            )

    async def _analyze_strategy_description(self, request: StrategyGenerateRequest) -> dict:
        """使用AI分析策略描述"""
        prompt_template = ChatPromptTemplate.from_template(
            """你是一个专业的量化交易策略分析师。请分析以下策略描述，提取关键信息。

策略描述: {description}
交易对: {trading_pair}
时间框架: {timeframe}

请识别:
1. 策略类型 (grid/dca/momentum/mean_reversion/custom)
2. 需要的技术指标
3. 交易规则和条件
4. 风险管理要求

以JSON格式返回，包含:
- strategy_type: 策略类型
- indicators: 指标列表 [{{name, parameters, description}}]
- rules: 规则列表 [{{signal, conditions, description}}]
- risk_requirements: 风险管理要求

示例输出:
{{
  "strategy_type": "momentum",
  "indicators": [
    {{"name": "SMA", "parameters": {{"period": 20}}, "description": "20日简单移动平均线"}},
    {{"name": "RSI", "parameters": {{"period": 14}}, "description": "相对强弱指标"}}
  ],
  "rules": [
    {{
      "signal": "buy",
      "conditions": ["价格上穿SMA20", "RSI < 70"],
      "description": "突破买入信号"
    }}
  ],
  "risk_requirements": {{
    "stop_loss": true,
    "position_sizing": "fixed_percentage"
  }}
}}
"""
        )

        try:
            prompt = prompt_template.format(
                description=request.description,
                trading_pair=request.trading_pair,
                timeframe=request.timeframe,
            )

            response = await self.llm.ainvoke(prompt)
            content = response.content

            # 解析AI响应
            import json

            # 提取JSON部分
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()

            result = json.loads(content)

            # 转换为内部格式
            indicators = [
                StrategyIndicator(**ind) for ind in result.get("indicators", [])
            ]

            rules = []
            for rule_data in result.get("rules", []):
                conditions = [
                    StrategyCondition(
                        condition_type="entry" if rule_data["signal"] == "buy" else "exit",
                        expression=cond,
                        description=cond,
                    )
                    for cond in rule_data.get("conditions", [])
                ]

                rules.append(
                    StrategyRule(
                        signal=TradingSignal(rule_data["signal"]),
                        conditions=conditions,
                        position_size=request.risk_per_trade,
                        stop_loss=request.risk_per_trade * 2,
                        take_profit=request.risk_per_trade * 4,
                    )
                )

            return {
                "strategy_type": StrategyType(result.get("strategy_type", "custom")),
                "indicators": indicators,
                "rules": rules,
                "risk_requirements": result.get("risk_requirements", {}),
            }

        except Exception as e:
            logger.warning(f"AI分析失败，使用默认配置: {str(e)}")
            return {
                "strategy_type": StrategyType.CUSTOM,
                "indicators": [],
                "rules": [],
                "risk_requirements": {},
            }

    def _build_strategy_parameters(
        self, request: StrategyGenerateRequest, strategy_info: dict
    ) -> dict[str, Any]:
        """构建策略参数"""
        parameters = {
            "trading_pair": request.trading_pair,
            "timeframe": request.timeframe,
            "initial_capital": request.initial_capital,
            "risk_per_trade": request.risk_per_trade,
            "max_positions": request.max_positions,
            "max_position_size": request.risk_per_trade,
            "stop_loss_percent": request.risk_per_trade * 2,
            "take_profit_percent": request.risk_per_trade * 4,
        }

        # 根据策略类型添加特定参数
        strategy_type = strategy_info.get("strategy_type")

        if strategy_type == StrategyType.GRID:
            parameters.update(
                {
                    "lower_price": 30000.0,  # 默认值，应该从描述中提取
                    "upper_price": 50000.0,
                    "grid_count": 10,
                    "position_per_grid": 0.01,
                }
            )
        elif strategy_type == StrategyType.DCA:
            parameters.update(
                {
                    "investment_amount": request.initial_capital * 0.1,
                    "interval_hours": 24,
                    "buy_on_dip": True,
                    "dip_threshold": -0.05,
                    "dip_multiplier": 2.0,
                }
            )
        elif strategy_type == StrategyType.MOMENTUM:
            parameters.update(
                {
                    "fast_ma_period": 10,
                    "slow_ma_period": 20,
                    "rsi_period": 14,
                    "rsi_overbought": 70,
                    "rsi_oversold": 30,
                    "momentum_threshold": 0.02,
                }
            )

        return parameters

    def _create_strategy_instance(
        self, strategy_type: StrategyType, description: str, parameters: dict
    ) -> Optional[BaseStrategy]:
        """创建策略实例"""
        try:
            strategy_name = self._generate_strategy_name(
                strategy_type, parameters.get("trading_pair", "BTC/USDT")
            )

            if strategy_type in [StrategyType.GRID, StrategyType.DCA, StrategyType.MOMENTUM]:
                return StrategyFactory.create(strategy_type, strategy_name, parameters)
            else:
                # 自定义策略使用基类
                from ..strategies.base import BaseStrategy

                class CustomStrategy(BaseStrategy):
                    def initialize(self) -> None:
                        self.initialized = True

                    def on_data(self, data, historical_data):
                        return TradingSignal.HOLD

                    def calculate_position_size(self, signal, current_price, account_balance):
                        return account_balance * self.parameters.get("max_position_size", 0.1)

                    def calculate_stop_loss(self, signal, entry_price):
                        return entry_price * (
                            1 - self.parameters.get("stop_loss_percent", 0.02)
                        )

                    def calculate_take_profit(self, signal, entry_price):
                        return entry_price * (
                            1 + self.parameters.get("take_profit_percent", 0.04)
                        )

                return CustomStrategy(strategy_name, strategy_type, parameters, description)

        except Exception as e:
            logger.error(f"创建策略实例失败: {str(e)}")
            return None

    def _build_risk_management(
        self, request: StrategyGenerateRequest, parameters: dict
    ) -> dict[str, Any]:
        """构建风险管理配置"""
        return {
            "max_position_size": parameters.get("max_position_size", 0.1),
            "max_positions": request.max_positions,
            "risk_per_trade": request.risk_per_trade,
            "stop_loss_percent": parameters.get("stop_loss_percent", 0.02),
            "take_profit_percent": parameters.get("take_profit_percent", 0.04),
            "max_daily_loss": request.risk_per_trade * 5,  # 最大日损失
            "trailing_stop": False,  # 移动止损
            "use_atr_stops": False,  # 使用ATR止损
        }

    def _analyze_complexity(self, num_rules: int) -> StrategyComplexity:
        """分析策略复杂度"""
        if num_rules <= 3:
            return StrategyComplexity.SIMPLE
        elif num_rules <= 7:
            return StrategyComplexity.MEDIUM
        else:
            return StrategyComplexity.COMPLEX

    def _generate_recommendations(
        self,
        strategy_type: StrategyType,
        parameters: dict,
        request: StrategyGenerateRequest,
    ) -> tuple[list[str], list[str]]:
        """生成警告和建议"""
        warnings = []
        suggestions = []

        # 风险警告
        if request.risk_per_trade > 0.05:
            warnings.append("单笔交易风险超过5%，建议降低风险比例")

        if request.max_positions > 5:
            warnings.append("同时持仓数量较多，可能增加风险敞口")

        # 优化建议
        suggestions.append(f"建议在{request.timeframe}时间框架上进行至少30天的回测")
        suggestions.append("建议启用移动止损以保护利润")

        if strategy_type == StrategyType.MOMENTUM:
            suggestions.append("动量策略在趋势市场中表现更好，注意震荡市场的风险")

        return warnings, suggestions

    @staticmethod
    def _generate_strategy_name(strategy_type: StrategyType, trading_pair: str) -> str:
        """生成策略名称"""
        type_names = {
            StrategyType.GRID: "网格",
            StrategyType.DCA: "定投",
            StrategyType.MOMENTUM: "动量",
            StrategyType.MEAN_REVERSION: "均值回归",
            StrategyType.ARBITRAGE: "套利",
            StrategyType.CUSTOM: "自定义",
        }

        type_name = type_names.get(strategy_type, "自定义")
        pair_name = trading_pair.replace("/", "_")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        return f"{type_name}_{pair_name}_{timestamp}"
