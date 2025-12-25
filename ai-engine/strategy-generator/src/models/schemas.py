"""
数据模型定义
"""

from datetime import datetime
from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, Field, validator


class StrategyType(str, Enum):
    """策略类型"""

    GRID = "grid"  # 网格策略
    DCA = "dca"  # 定投策略
    MOMENTUM = "momentum"  # 动量策略
    MEAN_REVERSION = "mean_reversion"  # 均值回归
    ARBITRAGE = "arbitrage"  # 套利策略
    CUSTOM = "custom"  # 自定义策略


class StrategyComplexity(str, Enum):
    """策略复杂度"""

    SIMPLE = "simple"  # 简单策略 (1-3个条件)
    MEDIUM = "medium"  # 中等策略 (4-7个条件)
    COMPLEX = "complex"  # 复杂策略 (8+个条件)


class CodeFormat(str, Enum):
    """代码输出格式"""

    JSON = "json"  # JSON 配置
    PYTHON = "python"  # Python 代码
    BOTH = "both"  # 两者都输出


class TradingSignal(str, Enum):
    """交易信号"""

    BUY = "buy"
    SELL = "sell"
    HOLD = "hold"


# ============= 请求模型 =============


class StrategyGenerateRequest(BaseModel):
    """策略生成请求"""

    description: str = Field(
        ..., min_length=10, description="策略描述 (自然语言)", examples=["当BTC价格跌破10日均线时买入"]
    )
    strategy_type: Optional[StrategyType] = Field(
        default=None, description="策略类型 (可选, AI会自动推断)"
    )
    trading_pair: str = Field(default="BTC/USDT", description="交易对", examples=["BTC/USDT"])
    timeframe: str = Field(default="1h", description="时间框架", examples=["1m", "5m", "1h", "1d"])
    initial_capital: float = Field(default=10000.0, gt=0, description="初始资金")
    risk_per_trade: float = Field(
        default=0.02, gt=0, le=0.1, description="每笔交易风险比例 (最大10%)"
    )
    max_positions: int = Field(default=1, ge=1, le=10, description="最大持仓数量")
    code_format: CodeFormat = Field(default=CodeFormat.JSON, description="输出代码格式")
    include_risk_management: bool = Field(default=True, description="是否包含风险管理")
    include_comments: bool = Field(default=True, description="是否包含代码注释")

    @validator("timeframe")
    def validate_timeframe(cls, v: str) -> str:
        """验证时间框架格式"""
        valid_timeframes = ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w"]
        if v not in valid_timeframes:
            raise ValueError(f"时间框架必须是以下之一: {', '.join(valid_timeframes)}")
        return v


class StrategyOptimizeRequest(BaseModel):
    """策略优化请求"""

    strategy_code: str = Field(..., description="策略代码 (JSON或Python)")
    optimization_goal: str = Field(
        default="maximize_sharpe_ratio",
        description="优化目标",
        examples=["maximize_sharpe_ratio", "minimize_drawdown", "maximize_profit"],
    )
    constraints: dict[str, Any] = Field(
        default_factory=dict,
        description="约束条件",
        examples=[{"max_drawdown": 0.2, "min_win_rate": 0.5}],
    )
    suggest_parameters: bool = Field(default=True, description="是否建议参数优化")


class StrategyValidateRequest(BaseModel):
    """策略验证请求"""

    strategy_code: str = Field(..., description="策略代码 (JSON或Python)")
    check_syntax: bool = Field(default=True, description="检查语法错误")
    check_logic: bool = Field(default=True, description="检查逻辑错误")
    check_risk: bool = Field(default=True, description="检查风险控制")
    check_performance: bool = Field(default=False, description="估算性能指标")


# ============= 响应模型 =============


class StrategyIndicator(BaseModel):
    """策略指标"""

    name: str = Field(..., description="指标名称", examples=["SMA", "RSI", "MACD"])
    parameters: dict[str, Any] = Field(
        default_factory=dict, description="指标参数", examples=[{"period": 14}]
    )
    description: str = Field(default="", description="指标说明")


class StrategyCondition(BaseModel):
    """策略条件"""

    condition_type: str = Field(..., description="条件类型", examples=["entry", "exit", "risk"])
    expression: str = Field(..., description="条件表达式", examples=["close > sma_20"])
    description: str = Field(..., description="条件说明")


class StrategyRule(BaseModel):
    """策略规则"""

    signal: TradingSignal = Field(..., description="交易信号")
    conditions: list[StrategyCondition] = Field(..., description="触发条件列表")
    position_size: Optional[float] = Field(default=None, description="仓位大小 (0-1)")
    stop_loss: Optional[float] = Field(default=None, description="止损百分比")
    take_profit: Optional[float] = Field(default=None, description="止盈百分比")


class GeneratedStrategy(BaseModel):
    """生成的策略"""

    name: str = Field(..., description="策略名称")
    description: str = Field(..., description="策略描述")
    strategy_type: StrategyType = Field(..., description="策略类型")
    complexity: StrategyComplexity = Field(..., description="策略复杂度")
    indicators: list[StrategyIndicator] = Field(default_factory=list, description="使用的指标")
    rules: list[StrategyRule] = Field(..., description="策略规则")
    risk_management: dict[str, Any] = Field(default_factory=dict, description="风险管理配置")
    code_json: Optional[dict[str, Any]] = Field(default=None, description="JSON格式代码")
    code_python: Optional[str] = Field(default=None, description="Python格式代码")


class StrategyGenerateResponse(BaseModel):
    """策略生成响应"""

    success: bool = Field(..., description="是否成功")
    strategy: Optional[GeneratedStrategy] = Field(default=None, description="生成的策略")
    warnings: list[str] = Field(default_factory=list, description="警告信息")
    suggestions: list[str] = Field(default_factory=list, description="优化建议")
    generated_at: datetime = Field(default_factory=datetime.now, description="生成时间")


class OptimizationSuggestion(BaseModel):
    """优化建议"""

    parameter: str = Field(..., description="参数名称")
    current_value: Any = Field(..., description="当前值")
    suggested_value: Any = Field(..., description="建议值")
    reason: str = Field(..., description="建议原因")
    expected_improvement: Optional[str] = Field(default=None, description="预期改进")


class StrategyOptimizeResponse(BaseModel):
    """策略优化响应"""

    success: bool = Field(..., description="是否成功")
    original_strategy: dict[str, Any] = Field(..., description="原始策略")
    optimized_strategy: Optional[dict[str, Any]] = Field(default=None, description="优化后的策略")
    suggestions: list[OptimizationSuggestion] = Field(
        default_factory=list, description="优化建议"
    )
    performance_comparison: Optional[dict[str, Any]] = Field(
        default=None, description="性能对比"
    )


class ValidationIssue(BaseModel):
    """验证问题"""

    severity: str = Field(..., description="严重程度", examples=["error", "warning", "info"])
    category: str = Field(
        ..., description="问题类别", examples=["syntax", "logic", "risk", "performance"]
    )
    message: str = Field(..., description="问题描述")
    location: Optional[str] = Field(default=None, description="问题位置")
    suggestion: Optional[str] = Field(default=None, description="修复建议")


class StrategyValidateResponse(BaseModel):
    """策略验证响应"""

    success: bool = Field(..., description="验证是否通过")
    is_valid: bool = Field(..., description="策略是否有效")
    issues: list[ValidationIssue] = Field(default_factory=list, description="发现的问题")
    score: float = Field(default=0.0, ge=0, le=100, description="策略评分 (0-100)")
    recommendations: list[str] = Field(default_factory=list, description="改进建议")


# ============= 内部模型 =============


class StrategyTemplate(BaseModel):
    """策略模板"""

    template_id: str = Field(..., description="模板ID")
    name: str = Field(..., description="模板名称")
    description: str = Field(..., description="模板描述")
    strategy_type: StrategyType = Field(..., description="策略类型")
    default_parameters: dict[str, Any] = Field(..., description="默认参数")
    required_indicators: list[str] = Field(..., description="需要的指标")
    template_code: str = Field(..., description="模板代码")


class HealthResponse(BaseModel):
    """健康检查响应"""

    status: str = Field(..., description="服务状态", examples=["healthy", "degraded", "unhealthy"])
    version: str = Field(..., description="服务版本")
    ai_model: str = Field(..., description="使用的AI模型")
    timestamp: datetime = Field(default_factory=datetime.now, description="检查时间")
    details: dict[str, Any] = Field(default_factory=dict, description="详细信息")
