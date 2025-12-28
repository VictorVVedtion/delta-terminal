"""InsightData 数据模型测试"""

import pytest
from datetime import datetime
from pydantic import ValidationError

from src.models.insight_schemas import (
    # 枚举类型
    InsightType,
    ParamType,
    ConstraintType,
    ComparisonOperator,
    ImpactMetricKey,
    RiskAlertSeverity,
    RiskAlertType,
    TimeoutAction,
    ClarificationCategory,
    ClarificationOptionType,
    # 数据模型
    ParamOption,
    ParamConfig,
    HeatmapZone,
    Constraint,
    LogicCondition,
    InsightParam,
    Candle,
    ChartSignal,
    ChartOverlay,
    ChartData,
    EquityCurvePoint,
    ComparisonData,
    InsightEvidence,
    ImpactMetric,
    InsightImpact,
    InsightTarget,
    InsightData,
    RiskAlertInsight,
    ClarificationOption,
    ClarificationInsight,
    # 工厂函数
    create_insight_id,
    create_strategy_insight,
    create_risk_alert,
    create_clarification_insight,
)


class TestEnums:
    """测试枚举类型"""

    def test_insight_type_enum(self):
        """测试 InsightType 枚举"""
        assert InsightType.STRATEGY_CREATE.value == "strategy_create"
        assert InsightType.STRATEGY_MODIFY.value == "strategy_modify"
        assert InsightType.RISK_ALERT.value == "risk_alert"
        assert InsightType.CLARIFICATION.value == "clarification"

    def test_param_type_enum(self):
        """测试 ParamType 枚举"""
        assert ParamType.SLIDER.value == "slider"
        assert ParamType.NUMBER.value == "number"
        assert ParamType.SELECT.value == "select"
        assert ParamType.TOGGLE.value == "toggle"
        assert ParamType.BUTTON_GROUP.value == "button_group"
        assert ParamType.LOGIC_BUILDER.value == "logic_builder"
        assert ParamType.HEATMAP_SLIDER.value == "heatmap_slider"

    def test_constraint_type_enum(self):
        """测试 ConstraintType 枚举"""
        assert ConstraintType.MIN_MAX.value == "min_max"
        assert ConstraintType.DEPENDENCY.value == "dependency"

    def test_comparison_operator_enum(self):
        """测试 ComparisonOperator 枚举"""
        assert ComparisonOperator.GT.value == ">"
        assert ComparisonOperator.LT.value == "<"
        assert ComparisonOperator.CROSSES_ABOVE.value == "crosses_above"

    def test_impact_metric_key_enum(self):
        """测试 ImpactMetricKey 枚举"""
        assert ImpactMetricKey.EXPECTED_RETURN.value == "expectedReturn"
        assert ImpactMetricKey.WIN_RATE.value == "winRate"
        assert ImpactMetricKey.SHARPE_RATIO.value == "sharpeRatio"

    def test_risk_alert_severity_enum(self):
        """测试 RiskAlertSeverity 枚举"""
        assert RiskAlertSeverity.INFO.value == "info"
        assert RiskAlertSeverity.WARNING.value == "warning"
        assert RiskAlertSeverity.CRITICAL.value == "critical"

    def test_clarification_category_enum(self):
        """测试 ClarificationCategory 枚举"""
        assert ClarificationCategory.TRADING_PAIR.value == "trading_pair"
        assert ClarificationCategory.STRATEGY_TYPE.value == "strategy_type"
        assert ClarificationCategory.RISK_PREFERENCE.value == "risk_preference"


class TestBasicModels:
    """测试基础数据模型"""

    def test_param_option(self):
        """测试 ParamOption"""
        option = ParamOption(
            value="BTC/USDT",
            label="比特币/USDT",
            description="比特币交易对"
        )

        assert option.value == "BTC/USDT"
        assert option.label == "比特币/USDT"
        assert option.description == "比特币交易对"

    def test_heatmap_zone(self):
        """测试 HeatmapZone"""
        zone = HeatmapZone(
            start=0,
            end=30,
            color="green",
            label="低风险"
        )

        assert zone.start == 0
        assert zone.end == 30
        assert zone.color == "green"
        assert zone.label == "低风险"

        # 测试边界验证
        with pytest.raises(ValidationError):
            HeatmapZone(start=-10, end=30, color="green", label="测试")

        with pytest.raises(ValidationError):
            HeatmapZone(start=0, end=150, color="green", label="测试")

    def test_param_config(self):
        """测试 ParamConfig"""
        config = ParamConfig(
            min=7,
            max=21,
            step=1,
            unit="天",
            precision=0
        )

        assert config.min == 7
        assert config.max == 21
        assert config.step == 1
        assert config.unit == "天"
        assert config.precision == 0

    def test_param_config_with_options(self):
        """测试带选项的 ParamConfig"""
        config = ParamConfig(
            options=[
                ParamOption(value="1h", label="1小时"),
                ParamOption(value="4h", label="4小时"),
            ]
        )

        assert len(config.options) == 2
        assert config.options[0].value == "1h"

    def test_constraint(self):
        """测试 Constraint"""
        constraint = Constraint(
            type=ConstraintType.MIN_MAX,
            rule="value >= 1 && value <= 10",
            message="值必须在 1-10 之间",
            severity="error"
        )

        assert constraint.type == ConstraintType.MIN_MAX
        assert constraint.rule == "value >= 1 && value <= 10"
        assert constraint.severity == "error"

    def test_logic_condition(self):
        """测试 LogicCondition"""
        condition = LogicCondition(
            id="cond_1",
            indicator="RSI",
            operator=ComparisonOperator.LT,
            value=30,
            indicator_params={"period": 14}
        )

        assert condition.id == "cond_1"
        assert condition.indicator == "RSI"
        assert condition.operator == ComparisonOperator.LT
        assert condition.value == 30
        assert condition.indicator_params["period"] == 14


class TestInsightParam:
    """测试 InsightParam"""

    def test_insight_param_slider(self):
        """测试 slider 类型参数"""
        param = InsightParam(
            key="rsi_period",
            label="RSI 周期",
            type=ParamType.SLIDER,
            value=14,
            level=1,
            config=ParamConfig(min=7, max=21, step=1)
        )

        assert param.key == "rsi_period"
        assert param.type == ParamType.SLIDER
        assert param.value == 14
        assert param.level == 1
        assert param.config.min == 7

    def test_insight_param_select(self):
        """测试 select 类型参数"""
        param = InsightParam(
            key="symbol",
            label="交易对",
            type=ParamType.SELECT,
            value="BTC/USDT",
            level=1,
            config=ParamConfig(
                options=[
                    ParamOption(value="BTC/USDT", label="BTC/USDT"),
                    ParamOption(value="ETH/USDT", label="ETH/USDT"),
                ]
            )
        )

        assert param.type == ParamType.SELECT
        assert len(param.config.options) == 2

    def test_insight_param_toggle(self):
        """测试 toggle 类型参数"""
        param = InsightParam(
            key="enable_leverage",
            label="启用杠杆",
            type=ParamType.TOGGLE,
            value=False,
            level=2,
            config=ParamConfig()
        )

        assert param.type == ParamType.TOGGLE
        assert param.value is False
        assert param.level == 2

    def test_insight_param_with_constraints(self):
        """测试带约束的参数"""
        param = InsightParam(
            key="stop_loss",
            label="止损",
            type=ParamType.NUMBER,
            value=3.0,
            level=1,
            config=ParamConfig(min=1, max=10, unit="%"),
            constraints=[
                Constraint(
                    type=ConstraintType.MIN_MAX,
                    rule="value >= 1 && value <= 10",
                    message="止损必须在 1%-10% 之间",
                    severity="error"
                )
            ]
        )

        assert len(param.constraints) == 1
        assert param.constraints[0].message == "止损必须在 1%-10% 之间"

    def test_insight_param_old_value(self):
        """测试带旧值的参数（用于修改操作）"""
        param = InsightParam(
            key="rsi_period",
            label="RSI 周期",
            type=ParamType.SLIDER,
            value=21,
            old_value=14,
            level=1,
            config=ParamConfig(min=7, max=21)
        )

        assert param.value == 21
        assert param.old_value == 14


class TestChartModels:
    """测试图表相关模型"""

    def test_candle(self):
        """测试 Candle"""
        candle = Candle(
            timestamp=1640000000,
            open=50000,
            high=51000,
            low=49000,
            close=50500,
            volume=1000
        )

        assert candle.timestamp == 1640000000
        assert candle.open == 50000
        assert candle.high == 51000
        assert candle.low == 49000
        assert candle.close == 50500

    def test_chart_signal(self):
        """测试 ChartSignal"""
        signal = ChartSignal(
            timestamp=1640000000,
            type="buy",
            price=50000,
            label="RSI 超卖"
        )

        assert signal.type == "buy"
        assert signal.price == 50000
        assert signal.label == "RSI 超卖"

    def test_chart_overlay(self):
        """测试 ChartOverlay"""
        overlay = ChartOverlay(
            name="EMA 20",
            color="#ff6b00",
            data=[
                {"timestamp": 1640000000, "value": 50000},
                {"timestamp": 1640003600, "value": 50100},
            ]
        )

        assert overlay.name == "EMA 20"
        assert len(overlay.data) == 2

    def test_chart_data(self):
        """测试 ChartData"""
        chart = ChartData(
            symbol="BTC/USDT",
            timeframe="1h",
            candles=[
                Candle(
                    timestamp=1640000000,
                    open=50000,
                    high=51000,
                    low=49000,
                    close=50500,
                    volume=1000
                )
            ],
            signals=[
                ChartSignal(timestamp=1640000000, type="buy", price=49500)
            ]
        )

        assert chart.symbol == "BTC/USDT"
        assert len(chart.candles) == 1
        assert len(chart.signals) == 1

    def test_equity_curve_point(self):
        """测试 EquityCurvePoint"""
        point = EquityCurvePoint(
            timestamp=1640000000,
            value=105.5
        )

        assert point.timestamp == 1640000000
        assert point.value == 105.5

    def test_comparison_data(self):
        """测试 ComparisonData"""
        comparison = ComparisonData(
            original=[
                EquityCurvePoint(timestamp=1640000000, value=100),
                EquityCurvePoint(timestamp=1640003600, value=102),
            ],
            modified=[
                EquityCurvePoint(timestamp=1640000000, value=100),
                EquityCurvePoint(timestamp=1640003600, value=105),
            ]
        )

        assert len(comparison.original) == 2
        assert len(comparison.modified) == 2
        assert comparison.baseline is None


class TestImpactModels:
    """测试影响评估模型"""

    def test_impact_metric(self):
        """测试 ImpactMetric"""
        metric = ImpactMetric(
            key=ImpactMetricKey.EXPECTED_RETURN,
            label="预期收益",
            value=15.5,
            old_value=10.0,
            unit="%",
            trend="up"
        )

        assert metric.key == ImpactMetricKey.EXPECTED_RETURN
        assert metric.value == 15.5
        assert metric.old_value == 10.0
        assert metric.trend == "up"

    def test_insight_impact(self):
        """测试 InsightImpact"""
        impact = InsightImpact(
            metrics=[
                ImpactMetric(
                    key=ImpactMetricKey.WIN_RATE,
                    label="胜率",
                    value=65,
                    unit="%",
                    trend="up"
                )
            ],
            confidence=0.85,
            sample_size=100
        )

        assert len(impact.metrics) == 1
        assert impact.confidence == 0.85
        assert impact.sample_size == 100

        # 测试置信度边界
        with pytest.raises(ValidationError):
            InsightImpact(
                metrics=[],
                confidence=1.5,  # 超出范围
                sample_size=100
            )


class TestInsightData:
    """测试主 InsightData 结构"""

    def test_insight_data_basic(self):
        """测试基本 InsightData"""
        insight = InsightData(
            id=create_insight_id(),
            type=InsightType.STRATEGY_CREATE,
            params=[
                InsightParam(
                    key="symbol",
                    label="交易对",
                    type=ParamType.SELECT,
                    value="BTC/USDT",
                    level=1,
                    config=ParamConfig()
                )
            ],
            explanation="这是一个测试策略",
            created_at=datetime.now().isoformat()
        )

        assert insight.type == InsightType.STRATEGY_CREATE
        assert len(insight.params) == 1
        assert insight.explanation != ""
        assert insight.target is None
        assert insight.evidence is None
        assert insight.impact is None

    def test_insight_data_with_evidence(self):
        """测试带证据的 InsightData"""
        insight = InsightData(
            id=create_insight_id(),
            type=InsightType.STRATEGY_CREATE,
            params=[],
            evidence=InsightEvidence(
                chart=ChartData(
                    symbol="BTC/USDT",
                    timeframe="1h",
                    candles=[
                        Candle(
                            timestamp=1640000000,
                            open=50000,
                            high=51000,
                            low=49000,
                            close=50500,
                            volume=1000
                        )
                    ]
                )
            ),
            explanation="测试",
            created_at=datetime.now().isoformat()
        )

        assert insight.evidence is not None
        assert insight.evidence.chart is not None
        assert insight.evidence.chart.symbol == "BTC/USDT"

    def test_insight_data_with_impact(self):
        """测试带影响评估的 InsightData"""
        insight = InsightData(
            id=create_insight_id(),
            type=InsightType.STRATEGY_MODIFY,
            params=[],
            impact=InsightImpact(
                metrics=[
                    ImpactMetric(
                        key=ImpactMetricKey.EXPECTED_RETURN,
                        label="预期收益",
                        value=15.5,
                        unit="%",
                        trend="up"
                    )
                ],
                confidence=0.85,
                sample_size=100
            ),
            explanation="测试",
            created_at=datetime.now().isoformat()
        )

        assert insight.impact is not None
        assert len(insight.impact.metrics) == 1

    def test_insight_data_with_target(self):
        """测试带目标的 InsightData（修改操作）"""
        insight = InsightData(
            id=create_insight_id(),
            type=InsightType.STRATEGY_MODIFY,
            target=InsightTarget(
                strategy_id="strat_123",
                name="BTC 网格策略",
                symbol="BTC/USDT"
            ),
            params=[],
            explanation="测试",
            created_at=datetime.now().isoformat()
        )

        assert insight.target is not None
        assert insight.target.strategy_id == "strat_123"
        assert insight.target.name == "BTC 网格策略"


class TestRiskAlertInsight:
    """测试风险告警 Insight"""

    def test_risk_alert_insight(self):
        """测试 RiskAlertInsight"""
        alert = RiskAlertInsight(
            id=create_insight_id(),
            type=InsightType.RISK_ALERT,
            severity=RiskAlertSeverity.WARNING,
            alert_type=RiskAlertType.HIGH_VOLATILITY,
            params=[],
            suggested_action=[
                InsightParam(
                    key="action",
                    label="建议操作",
                    type=ParamType.TOGGLE,
                    value=True,
                    level=1,
                    config=ParamConfig()
                )
            ],
            explanation="检测到高波动率",
            created_at=datetime.now().isoformat()
        )

        assert alert.severity == RiskAlertSeverity.WARNING
        assert alert.alert_type == RiskAlertType.HIGH_VOLATILITY
        assert len(alert.suggested_action) == 1

    def test_risk_alert_with_timeout(self):
        """测试带超时的风险告警"""
        alert = RiskAlertInsight(
            id=create_insight_id(),
            type=InsightType.RISK_ALERT,
            severity=RiskAlertSeverity.CRITICAL,
            alert_type=RiskAlertType.LIQUIDATION_RISK,
            params=[],
            suggested_action=[],
            timeout_action=TimeoutAction.AUTO_EXECUTE,
            timeout_seconds=30,
            affected_strategies=["strat_1", "strat_2"],
            explanation="清算风险",
            created_at=datetime.now().isoformat()
        )

        assert alert.timeout_action == TimeoutAction.AUTO_EXECUTE
        assert alert.timeout_seconds == 30
        assert len(alert.affected_strategies) == 2


class TestClarificationInsight:
    """测试澄清 Insight"""

    def test_clarification_insight(self):
        """测试 ClarificationInsight"""
        insight = ClarificationInsight(
            id=create_insight_id(),
            type=InsightType.CLARIFICATION,
            params=[],
            question="您希望交易什么币种?",
            category=ClarificationCategory.TRADING_PAIR,
            option_type=ClarificationOptionType.SINGLE,
            options=[
                ClarificationOption(
                    id="btc",
                    label="BTC/USDT",
                    description="比特币",
                    recommended=True
                ),
                ClarificationOption(
                    id="eth",
                    label="ETH/USDT",
                    description="以太坊"
                )
            ],
            allow_custom_input=True,
            custom_input_placeholder="或输入其他交易对...",
            context_hint="选择交易对是创建策略的第一步",
            collected_params={"timeframe": "1h"},
            remaining_questions=2,
            explanation="让我们从选择交易对开始",
            created_at=datetime.now().isoformat()
        )

        assert insight.type == InsightType.CLARIFICATION
        assert insight.category == ClarificationCategory.TRADING_PAIR
        assert len(insight.options) == 2
        assert insight.allow_custom_input is True
        assert insight.remaining_questions == 2
        assert "timeframe" in insight.collected_params


class TestFactoryFunctions:
    """测试工厂函数"""

    def test_create_insight_id(self):
        """测试创建 insight ID"""
        id1 = create_insight_id()
        id2 = create_insight_id()

        assert id1.startswith("insight_")
        assert id2.startswith("insight_")
        assert id1 != id2

    def test_create_strategy_insight(self):
        """测试创建策略 insight"""
        insight = create_strategy_insight(
            params=[
                InsightParam(
                    key="test",
                    label="测试",
                    type=ParamType.NUMBER,
                    value=10,
                    level=1,
                    config=ParamConfig()
                )
            ],
            explanation="测试策略"
        )

        assert insight.type == InsightType.STRATEGY_CREATE
        assert len(insight.params) == 1
        assert insight.explanation == "测试策略"

    def test_create_risk_alert(self):
        """测试创建风险告警"""
        alert = create_risk_alert(
            alert_type=RiskAlertType.HIGH_VOLATILITY,
            severity=RiskAlertSeverity.WARNING,
            explanation="高波动率告警",
            suggested_action=[]
        )

        assert alert.type == InsightType.RISK_ALERT
        assert alert.alert_type == RiskAlertType.HIGH_VOLATILITY
        assert alert.severity == RiskAlertSeverity.WARNING

    def test_create_clarification_insight(self):
        """测试创建澄清 insight"""
        insight = create_clarification_insight(
            question="选择交易对",
            category=ClarificationCategory.TRADING_PAIR,
            options=[
                ClarificationOption(id="btc", label="BTC/USDT", recommended=True)
            ],
            explanation="请选择"
        )

        assert insight.type == InsightType.CLARIFICATION
        assert insight.question == "选择交易对"
        assert len(insight.options) == 1
