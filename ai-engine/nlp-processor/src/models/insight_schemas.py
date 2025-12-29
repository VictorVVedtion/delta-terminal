"""
A2UI InsightData Type Definitions for Python

A2UI (Agent-to-UI) is the core innovation of Delta Terminal 2.0.
Instead of returning plain text, AI returns structured InsightData
that can be rendered as interactive UI controls.

Core Philosophy: "AI Proposer, Human Approver"
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Literal, Optional, Union

from pydantic import BaseModel, Field


# =============================================================================
# Insight Types
# =============================================================================


class InsightType(str, Enum):
    """Type of insight returned by AI"""

    STRATEGY_CREATE = "strategy_create"  # Create a new strategy
    STRATEGY_MODIFY = "strategy_modify"  # Modify an existing strategy
    BATCH_ADJUST = "batch_adjust"  # Batch adjust multiple strategies
    RISK_ALERT = "risk_alert"  # Risk alert notification
    STRATEGY_OPTIMIZE = "strategy_optimize"  # Strategy optimization suggestions
    BACKTEST_SUGGEST = "backtest_suggest"  # Backtest suggestions and results
    RISK_ANALYSIS = "risk_analysis"  # Portfolio risk analysis
    CLARIFICATION = "clarification"  # Request clarification from user (A2UI core)
    GENERAL_CHAT = "general_chat"  # General chat response (A2UI 2.0)


# =============================================================================
# Parameter Types
# =============================================================================


class ParamType(str, Enum):
    """Supported parameter control types"""

    SLIDER = "slider"  # Numeric range slider
    NUMBER = "number"  # Number input
    SELECT = "select"  # Dropdown select
    TOGGLE = "toggle"  # Boolean toggle
    BUTTON_GROUP = "button_group"  # Radio button group
    LOGIC_BUILDER = "logic_builder"  # Multi-condition logic builder
    HEATMAP_SLIDER = "heatmap_slider"  # Risk level heatmap slider


ParamLevel = Literal[1, 2]  # 1 = core, 2 = advanced


class ParamOption(BaseModel):
    """Option for select/button_group"""

    value: Union[str, int, float] = Field(description="Option value")
    label: str = Field(description="Display label")
    description: Optional[str] = Field(default=None, description="Optional description")


class HeatmapZone(BaseModel):
    """Heatmap zone for risk level slider"""

    start: float = Field(description="Start value (percentage 0-100)", ge=0, le=100)
    end: float = Field(description="End value (percentage 0-100)", ge=0, le=100)
    color: Literal["green", "gray", "red", "yellow", "blue"] = Field(
        description="Zone color"
    )
    label: str = Field(description="Zone label")


class ParamConfig(BaseModel):
    """Parameter configuration (type-specific)"""

    min: Optional[float] = Field(default=None, description="Minimum value (for slider/number)")
    max: Optional[float] = Field(default=None, description="Maximum value (for slider/number)")
    step: Optional[float] = Field(default=None, description="Step increment (for slider/number)")
    options: Optional[List[ParamOption]] = Field(
        default=None, description="Options (for select/button_group)"
    )
    unit: Optional[str] = Field(default=None, description="Unit suffix (e.g., '%', 'hours')")
    heatmap_zones: Optional[List[HeatmapZone]] = Field(
        default=None, description="Heatmap zones (for heatmap_slider)"
    )
    precision: Optional[int] = Field(default=None, description="Decimal precision")


# =============================================================================
# Constraint Types
# =============================================================================


class ConstraintType(str, Enum):
    """Constraint type"""

    MIN_MAX = "min_max"  # Value must be within min/max
    DEPENDENCY = "dependency"  # Depends on another parameter
    MUTUAL_EXCLUSIVE = "mutual_exclusive"  # Mutually exclusive with another param
    CONDITIONAL = "conditional"  # Conditional constraint


class Constraint(BaseModel):
    """Constraint rule for parameter validation"""

    type: ConstraintType = Field(description="Constraint type")
    related_param: Optional[str] = Field(
        default=None, description="Related parameter key (for dependency constraints)"
    )
    rule: str = Field(description="Constraint rule expression")
    message: str = Field(description="Error message when constraint is violated")
    severity: Literal["error", "warning"] = Field(
        default="error", description="Severity level"
    )


# =============================================================================
# Logic Builder Types
# =============================================================================


class LogicConnector(str, Enum):
    """Logical connector for condition groups"""

    AND = "AND"
    OR = "OR"


class ComparisonOperator(str, Enum):
    """Comparison operator for conditions"""

    GT = ">"
    LT = "<"
    GTE = ">="
    LTE = "<="
    EQ = "=="
    NE = "!="
    CROSSES_ABOVE = "crosses_above"
    CROSSES_BELOW = "crosses_below"


class LogicCondition(BaseModel):
    """Single condition in logic builder"""

    id: str = Field(description="Condition ID")
    indicator: str = Field(description="Indicator name (e.g., 'RSI', 'MACD')")
    operator: ComparisonOperator = Field(description="Comparison operator")
    value: Union[float, str] = Field(description="Comparison value")
    indicator_params: Optional[Dict[str, float]] = Field(
        default=None, description="Indicator parameters (e.g., { period: 14 })"
    )


# =============================================================================
# InsightParam
# =============================================================================


ParamValue = Union[float, str, bool, List[str], List[LogicCondition]]


class InsightParam(BaseModel):
    """
    InsightParam - The polymorphic parameter control

    Each parameter specifies its type and the frontend renders
    the corresponding UI control based on the type.
    """

    key: str = Field(description="Unique key for this parameter")
    label: str = Field(description="Display label")
    type: ParamType = Field(description="Control type")
    value: ParamValue = Field(description="Current value")
    old_value: Optional[ParamValue] = Field(
        default=None, description="Previous value (for modify operations, shows diff)"
    )
    level: ParamLevel = Field(description="Display level: 1 = core, 2 = advanced")
    constraints: Optional[List[Constraint]] = Field(
        default=None, description="Constraint rules"
    )
    config: ParamConfig = Field(description="Type-specific configuration")
    description: Optional[str] = Field(
        default=None, description="Optional description/tooltip"
    )
    disabled: Optional[bool] = Field(
        default=None, description="Whether this param is disabled"
    )


# =============================================================================
# Evidence Types
# =============================================================================


class Candle(BaseModel):
    """Single candle data"""

    timestamp: int = Field(description="Timestamp")
    open: float = Field(description="Open price")
    high: float = Field(description="High price")
    low: float = Field(description="Low price")
    close: float = Field(description="Close price")
    volume: float = Field(description="Volume")


class ChartSignal(BaseModel):
    """Signal marker on chart"""

    timestamp: int = Field(description="Timestamp")
    type: Literal["buy", "sell", "close"] = Field(description="Signal type")
    price: float = Field(description="Price level")
    label: Optional[str] = Field(default=None, description="Signal label")


class ChartOverlay(BaseModel):
    """Chart overlay (e.g., moving average)"""

    name: str = Field(description="Overlay name")
    color: str = Field(description="Overlay color")
    data: List[Dict[str, Union[int, float]]] = Field(description="Data points")


class ChartData(BaseModel):
    """Chart data for visualization"""

    symbol: str = Field(description="Trading symbol")
    timeframe: str = Field(description="Timeframe (e.g., '1h', '4h', '1d')")
    candles: List[Candle] = Field(description="OHLCV candles")
    signals: Optional[List[ChartSignal]] = Field(
        default=None, description="Signal markers on chart"
    )
    overlays: Optional[List[ChartOverlay]] = Field(
        default=None, description="Overlay indicators"
    )


class EquityCurvePoint(BaseModel):
    """Point on equity curve"""

    timestamp: int = Field(description="Timestamp")
    value: float = Field(description="Equity value (starting from 100)")


class ComparisonData(BaseModel):
    """Before/after comparison data"""

    original: List[EquityCurvePoint] = Field(description="Original equity curve")
    modified: List[EquityCurvePoint] = Field(
        description="New equity curve (after modification)"
    )
    baseline: Optional[List[EquityCurvePoint]] = Field(
        default=None, description="Baseline comparison (e.g., buy and hold)"
    )


class InsightEvidence(BaseModel):
    """Visual evidence for the insight"""

    chart: Optional[ChartData] = Field(default=None, description="K-line chart with signals")
    comparison: Optional[ComparisonData] = Field(
        default=None, description="Before/after comparison"
    )


# =============================================================================
# Impact Types
# =============================================================================


class ImpactMetricKey(str, Enum):
    """Standard impact metric keys"""

    # 策略相关指标
    EXPECTED_RETURN = "expectedReturn"
    ANNUALIZED_RETURN = "annualizedReturn"
    WIN_RATE = "winRate"
    MAX_DRAWDOWN = "maxDrawdown"
    SHARPE_RATIO = "sharpeRatio"
    PROFIT_FACTOR = "profitFactor"
    TOTAL_TRADES = "totalTrades"
    AVG_TRADE_DURATION = "avgTradeDuration"
    AVG_PROFIT = "avgProfit"
    AVG_LOSS = "avgLoss"

    # 市场分析指标
    TREND_STRENGTH = "trendStrength"
    TREND = "trend"  # LLM 常用的简写形式
    VOLATILITY = "volatility"
    SUPPORT_LEVEL = "supportLevel"
    RESISTANCE_LEVEL = "resistanceLevel"
    RSI = "rsi"
    MACD = "macd"
    VOLUME = "volume"
    PRICE_CHANGE = "priceChange"
    MARKET_CAP = "marketCap"
    MOMENTUM = "momentum"

    # 信号与情绪指标
    SIGNAL = "signal"
    SENTIMENT = "sentiment"
    STRENGTH = "strength"
    DIRECTION = "direction"

    # 网格交易指标
    GRID_SPACING = "gridSpacing"
    GRID_PROFIT_PERCENT = "gridProfitPercent"
    GRID_COUNT = "gridCount"
    AMOUNT_PER_GRID = "amountPerGrid"
    ESTIMATED_DAILY_TRADES = "estimatedDailyTrades"
    TRADING_FREQUENCY = "tradingFrequency"
    PRICE_RANGE = "priceRange"
    UPPER_PRICE = "upperPrice"
    LOWER_PRICE = "lowerPrice"
    GRID_PROFIT = "gridProfit"
    TOTAL_INVESTMENT = "totalInvestment"

    # 附加市场指标
    RSI_LEVEL = "rsi_level"
    MACD_SIGNAL = "macd_signal"
    BOLLINGER_POSITION = "bollingerPosition"
    ATR = "atr"
    VOLUME_RATIO = "volumeRatio"

    # 风险指标
    RISK_LEVEL = "riskLevel"
    POSITION_SIZE = "positionSize"
    LEVERAGE = "leverage"
    LIQUIDATION_PRICE = "liquidationPrice"
    MARGIN_RATIO = "marginRatio"

    # 成本与收益指标
    AVERAGE_COST = "averageCost"
    TOTAL_COST = "totalCost"
    BREAK_EVEN_PRICE = "breakEvenPrice"
    REALIZED_PNL = "realizedPnl"
    UNREALIZED_PNL = "unrealizedPnl"
    ROI = "roi"
    COST_BASIS = "costBasis"

    # 定投/抄底策略指标
    ESTIMATED_PURCHASES = "estimatedPurchases"
    AVG_COST_REDUCTION = "avgCostReduction"
    DIP_OPPORTUNITIES = "dipOpportunities"
    CAPITAL_UTILIZATION = "capitalUtilization"
    AVERAGE_ENTRY_PRICE = "averageEntryPrice"


class ImpactMetric(BaseModel):
    """Single impact metric"""

    key: ImpactMetricKey = Field(
        description="Metric key (e.g., 'expectedReturn', 'winRate')"
    )
    label: str = Field(description="Display label")
    value: Union[float, str] = Field(description="Current/new value (numeric or descriptive)")
    old_value: Optional[Union[float, str]] = Field(
        default=None, description="Previous value (for comparison)"
    )
    unit: Optional[str] = Field(default="", description="Unit (e.g., '%', 'x')")
    trend: Literal["up", "down", "neutral"] = Field(description="Trend direction")


class InsightImpact(BaseModel):
    """Impact estimation for the strategy"""

    metrics: List[ImpactMetric] = Field(description="Key performance metrics")
    confidence: float = Field(
        description="AI's confidence in the estimation (0-1)", ge=0, le=1
    )
    sample_size: int = Field(description="Sample size (number of days used)")


# =============================================================================
# Target Types
# =============================================================================


class InsightTarget(BaseModel):
    """Target strategy for modify/batch operations"""

    strategy_id: str = Field(description="Strategy ID")
    name: str = Field(description="Strategy name")
    symbol: str = Field(description="Trading symbol (e.g., 'BTC/USDT')")


# =============================================================================
# Risk Alert Types
# =============================================================================


class RiskAlertSeverity(str, Enum):
    """Risk alert severity levels"""

    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class RiskAlertType(str, Enum):
    """Risk alert types"""

    HIGH_VOLATILITY = "high_volatility"  # High market volatility
    MARGIN_WARNING = "margin_warning"  # Margin level warning
    LIQUIDATION_RISK = "liquidation_risk"  # Liquidation risk
    DRAWDOWN_LIMIT = "drawdown_limit"  # Drawdown limit reached
    MARKET_CRASH = "market_crash"  # Market crash detected
    STRATEGY_ANOMALY = "strategy_anomaly"  # Strategy behavior anomaly


class TimeoutAction(str, Enum):
    """Timeout action for risk alerts"""

    AUTO_EXECUTE = "auto_execute"  # Automatically execute suggested action
    PAUSE = "pause"  # Pause affected strategies
    NOTIFY = "notify"  # Just notify, no action


# =============================================================================
# Canvas Types
# =============================================================================


class CanvasMode(str, Enum):
    """Canvas display modes"""

    PROPOSAL = "proposal"  # Strategy creation/modification proposal
    BACKTEST = "backtest"  # Backtest report
    EXPLORER = "explorer"  # Parameter sensitivity analysis
    MONITOR = "monitor"  # Real-time strategy monitoring
    CONFIG = "config"  # Full strategy configuration
    DETAIL = "detail"  # Trade/order detail view


# =============================================================================
# Main InsightData Structure
# =============================================================================


class InsightData(BaseModel):
    """
    The main InsightData structure returned by AI

    This is the core of A2UI - AI returns structured data
    that can be rendered as interactive UI controls.
    """

    id: str = Field(description="Unique identifier for this insight")
    type: InsightType = Field(description="Type of insight")
    target: Optional[InsightTarget] = Field(
        default=None, description="Target strategy (for modify/batch operations)"
    )
    params: List[InsightParam] = Field(description="Parameter list - the core of A2UI")
    evidence: Optional[InsightEvidence] = Field(
        default=None, description="Visual evidence (charts, comparisons)"
    )
    impact: Optional[InsightImpact] = Field(
        default=None, description="Impact estimation (metrics, confidence)"
    )
    explanation: str = Field(description="AI's natural language explanation")
    created_at: str = Field(description="Timestamp when this insight was created")

    # === 推理链支持 (A2UI 2.0) ===
    reasoning_chain: Optional[Any] = Field(
        default=None,
        description="AI reasoning chain - shows the thought process (ReasoningChain type)"
    )
    show_reasoning: bool = Field(
        default=False,
        description="Whether to show reasoning chain by default"
    )
    reasoning_display_mode: Literal["collapsed", "expanded", "highlight_only"] = Field(
        default="collapsed",
        description="How to display reasoning chain"
    )


class RiskAlertInsight(InsightData):
    """Risk alert insight (extends InsightData)"""

    type: Literal[InsightType.RISK_ALERT] = InsightType.RISK_ALERT
    severity: RiskAlertSeverity = Field(description="Alert severity")
    alert_type: RiskAlertType = Field(description="Alert type")
    suggested_action: List[InsightParam] = Field(
        description="Suggested action (as InsightParams for approval)"
    )
    timeout_action: Optional[TimeoutAction] = Field(
        default=None, description="Action to take on timeout"
    )
    timeout_seconds: Optional[int] = Field(
        default=None, description="Timeout in seconds"
    )
    affected_strategies: Optional[List[str]] = Field(
        default=None, description="Affected strategies"
    )


# =============================================================================
# Clarification Types (A2UI Core Feature)
# =============================================================================


class ClarificationCategory(str, Enum):
    """Categories for clarification questions"""

    TRADING_PAIR = "trading_pair"  # Which trading pair?
    STRATEGY_TYPE = "strategy_type"  # What type of strategy?
    STRATEGY_PERSPECTIVE = "strategy_perspective"  # Strategy angle/perspective (抄底/追涨的判断角度)
    RISK_PREFERENCE = "risk_preference"  # Risk tolerance level
    TIMEFRAME = "timeframe"  # Trading timeframe
    ENTRY_CONDITION = "entry_condition"  # Entry logic clarification
    EXIT_CONDITION = "exit_condition"  # Exit logic clarification
    POSITION_SIZE = "position_size"  # Position sizing preference
    MARKET_CONTEXT = "market_context"  # Market conditions preference
    GENERAL = "general"  # General clarification


class ClarificationOptionType(str, Enum):
    """How user can respond to clarification"""

    SINGLE = "single"  # Single selection
    MULTI = "multi"  # Multiple selection
    TEXT = "text"  # Free text input
    HYBRID = "hybrid"  # Options + custom input


class ClarificationOption(BaseModel):
    """Single option for clarification question"""

    id: str = Field(description="Option identifier")
    label: str = Field(description="Display label")
    description: Optional[str] = Field(default=None, description="Detailed description")
    icon: Optional[str] = Field(default=None, description="Optional icon name")
    recommended: bool = Field(default=False, description="Whether this is the recommended option")


class ClarificationInsight(InsightData):
    """
    Clarification insight - asks user for more information

    This is the core A2UI mechanism for handling vague/incomplete requests.
    Instead of guessing, AI asks structured questions with options.
    """

    type: Literal[InsightType.CLARIFICATION] = InsightType.CLARIFICATION
    question: str = Field(description="The clarification question to ask")
    category: ClarificationCategory = Field(description="Category of clarification")
    option_type: ClarificationOptionType = Field(
        default=ClarificationOptionType.SINGLE,
        description="How user can respond"
    )
    options: List[ClarificationOption] = Field(
        default_factory=list,
        description="Available options for user to choose from"
    )
    allow_custom_input: bool = Field(
        default=True,
        description="Whether user can provide custom text input"
    )
    custom_input_placeholder: Optional[str] = Field(
        default=None,
        description="Placeholder for custom input field"
    )
    context_hint: Optional[str] = Field(
        default=None,
        description="Additional context about why this clarification is needed"
    )
    collected_params: Dict[str, Any] = Field(
        default_factory=dict,
        description="Parameters already collected in this multi-step flow"
    )
    remaining_questions: int = Field(
        default=0,
        description="Estimated remaining questions in this flow"
    )


# =============================================================================
# Helper Types
# =============================================================================


class InsightActionResult(BaseModel):
    """Insight action result"""

    success: bool = Field(description="Whether the action was successful")
    message: str = Field(description="Result message")
    entity_id: Optional[str] = Field(
        default=None, description="Created/updated entity ID"
    )
    status: Optional[str] = Field(default=None, description="New entity status")
    errors: Optional[List[Dict[str, str]]] = Field(
        default=None, description="Errors if any"
    )


class ParamValidationResult(BaseModel):
    """Validation result for insight params"""

    valid: bool = Field(description="Whether all params are valid")
    errors: Dict[str, str] = Field(description="Errors by param key")
    warnings: Dict[str, str] = Field(description="Warnings by param key")


# =============================================================================
# Factory Functions
# =============================================================================


def create_insight_id() -> str:
    """Generate a unique insight ID"""
    import uuid

    return f"insight_{int(datetime.now().timestamp() * 1000)}_{uuid.uuid4().hex[:9]}"


def create_strategy_insight(
    params: List[InsightParam],
    explanation: str,
    evidence: Optional[InsightEvidence] = None,
    impact: Optional[InsightImpact] = None,
) -> InsightData:
    """Creates a new strategy creation insight"""
    return InsightData(
        id=create_insight_id(),
        type=InsightType.STRATEGY_CREATE,
        params=params,
        explanation=explanation,
        evidence=evidence,
        impact=impact,
        created_at=datetime.now().isoformat(),
    )


def create_risk_alert(
    alert_type: RiskAlertType,
    severity: RiskAlertSeverity,
    explanation: str,
    suggested_action: List[InsightParam],
    timeout_action: Optional[TimeoutAction] = None,
    timeout_seconds: Optional[int] = None,
    affected_strategies: Optional[List[str]] = None,
) -> RiskAlertInsight:
    """Creates a risk alert insight"""
    alert = RiskAlertInsight(
        id=f"alert_{int(datetime.now().timestamp() * 1000)}_{__import__('uuid').uuid4().hex[:9]}",
        type=InsightType.RISK_ALERT,
        alert_type=alert_type,
        severity=severity,
        params=[],
        suggested_action=suggested_action,
        explanation=explanation,
        created_at=datetime.now().isoformat(),
    )

    if timeout_action:
        alert.timeout_action = timeout_action

    if timeout_seconds is not None:
        alert.timeout_seconds = timeout_seconds

    if affected_strategies:
        alert.affected_strategies = affected_strategies

    return alert


def create_clarification_insight(
    question: str,
    category: "ClarificationCategory",
    options: List["ClarificationOption"],
    explanation: str,
    option_type: "ClarificationOptionType" = None,
    allow_custom_input: bool = True,
    custom_input_placeholder: Optional[str] = None,
    context_hint: Optional[str] = None,
    collected_params: Optional[Dict[str, Any]] = None,
    remaining_questions: int = 0,
) -> "ClarificationInsight":
    """
    Creates a clarification insight for A2UI

    This is the core mechanism for handling vague/incomplete user requests.
    Instead of guessing, AI asks structured questions with options.

    Args:
        question: The clarification question to ask
        category: Category of clarification (trading_pair, strategy_type, etc.)
        options: List of options for user to choose from
        explanation: Natural language explanation of why this clarification is needed
        option_type: How user can respond (single, multi, text, hybrid)
        allow_custom_input: Whether to allow free text input
        custom_input_placeholder: Placeholder for custom input field
        context_hint: Additional context hint
        collected_params: Parameters already collected in multi-step flow
        remaining_questions: Estimated remaining questions

    Returns:
        ClarificationInsight
    """
    # Import here to avoid circular imports
    from .insight_schemas import (
        ClarificationCategory,
        ClarificationInsight,
        ClarificationOption,
        ClarificationOptionType,
    )

    if option_type is None:
        option_type = ClarificationOptionType.SINGLE

    return ClarificationInsight(
        id=create_insight_id(),
        type=InsightType.CLARIFICATION,
        params=[],  # Clarification doesn't have params, it has options
        question=question,
        category=category,
        option_type=option_type,
        options=options,
        allow_custom_input=allow_custom_input,
        custom_input_placeholder=custom_input_placeholder,
        context_hint=context_hint,
        collected_params=collected_params or {},
        remaining_questions=remaining_questions,
        explanation=explanation,
        created_at=datetime.now().isoformat(),
    )
