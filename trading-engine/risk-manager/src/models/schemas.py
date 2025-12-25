"""
数据模型定义
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal
from datetime import datetime
from enum import Enum


# ==================== 枚举类型 ====================

class RiskLevel(str, Enum):
    """风险等级"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AlertType(str, Enum):
    """告警类型"""
    POSITION_LIMIT = "position_limit"
    ORDER_SIZE_LIMIT = "order_size_limit"
    DAILY_LOSS_LIMIT = "daily_loss_limit"
    DRAWDOWN_LIMIT = "drawdown_limit"
    CONSECUTIVE_LOSSES = "consecutive_losses"
    LEVERAGE_LIMIT = "leverage_limit"
    ORDER_FREQUENCY = "order_frequency"
    EMERGENCY_STOP = "emergency_stop"


class RuleType(str, Enum):
    """规则类型"""
    POSITION_LIMIT = "position_limit"
    ORDER_SIZE_LIMIT = "order_size_limit"
    DAILY_LOSS_LIMIT = "daily_loss_limit"
    DRAWDOWN_LIMIT = "drawdown_limit"
    LEVERAGE_LIMIT = "leverage_limit"


class OrderSide(str, Enum):
    """订单方向"""
    BUY = "buy"
    SELL = "sell"


# ==================== 风控检查 ====================

class OrderValidationRequest(BaseModel):
    """订单验证请求"""
    user_id: str
    symbol: str
    side: OrderSide
    quantity: float = Field(..., gt=0)
    price: float = Field(..., gt=0)
    order_type: Literal["limit", "market"] = "limit"
    leverage: Optional[float] = Field(None, ge=1, le=125)

    @field_validator("symbol")
    @classmethod
    def validate_symbol(cls, v: str) -> str:
        return v.upper()


class OrderValidationResponse(BaseModel):
    """订单验证响应"""
    valid: bool
    order_id: Optional[str] = None
    rejected_reason: Optional[str] = None
    risk_level: RiskLevel
    warnings: list[str] = []
    metadata: dict = {}


class PositionCheckRequest(BaseModel):
    """持仓检查请求"""
    user_id: str
    symbol: Optional[str] = None


class PositionCheckResponse(BaseModel):
    """持仓检查响应"""
    safe: bool
    risk_level: RiskLevel
    total_position_usdt: float
    max_position_usdt: float
    position_utilization: float  # 持仓使用率 0-1
    violations: list[str] = []
    warnings: list[str] = []


# ==================== 风控规则 ====================

class RiskRule(BaseModel):
    """风控规则基础模型"""
    rule_id: str
    rule_type: RuleType
    enabled: bool = True
    priority: int = Field(default=1, ge=1, le=10)
    description: Optional[str] = None


class PositionLimitRule(RiskRule):
    """持仓限制规则"""
    rule_type: RuleType = RuleType.POSITION_LIMIT
    max_position_size_usdt: float = Field(..., gt=0)
    max_total_position_usdt: float = Field(..., gt=0)
    max_concentration: float = Field(default=0.3, ge=0, le=1)


class OrderSizeLimitRule(RiskRule):
    """订单大小限制规则"""
    rule_type: RuleType = RuleType.ORDER_SIZE_LIMIT
    max_order_size_usdt: float = Field(..., gt=0)
    min_order_size_usdt: float = Field(default=10.0, gt=0)


class DailyLossLimitRule(RiskRule):
    """日损失限制规则"""
    rule_type: RuleType = RuleType.DAILY_LOSS_LIMIT
    max_daily_loss_usdt: float = Field(..., gt=0)
    max_daily_loss_percentage: float = Field(..., gt=0, le=1)


class DrawdownLimitRule(RiskRule):
    """回撤限制规则"""
    rule_type: RuleType = RuleType.DRAWDOWN_LIMIT
    max_drawdown_percentage: float = Field(..., gt=0, le=1)
    lookback_period_days: int = Field(default=30, ge=1)


# ==================== 风险告警 ====================

class RiskAlert(BaseModel):
    """风险告警"""
    alert_id: str
    user_id: str
    alert_type: AlertType
    risk_level: RiskLevel
    message: str
    details: dict = {}
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    acknowledged: bool = False
    acknowledged_at: Optional[datetime] = None


class AlertCreateRequest(BaseModel):
    """创建告警请求"""
    user_id: str
    alert_type: AlertType
    risk_level: RiskLevel
    message: str
    details: dict = {}


class AlertListResponse(BaseModel):
    """告警列表响应"""
    alerts: list[RiskAlert]
    total: int
    page: int
    page_size: int


# ==================== 风险报告 ====================

class PositionRiskMetrics(BaseModel):
    """持仓风险指标"""
    total_position_usdt: float
    max_position_usdt: float
    position_utilization: float
    largest_position_symbol: Optional[str] = None
    largest_position_size: float = 0.0
    concentration_ratio: float = 0.0


class PnLRiskMetrics(BaseModel):
    """盈亏风险指标"""
    daily_pnl: float
    daily_pnl_percentage: float
    max_drawdown: float
    max_drawdown_percentage: float
    consecutive_losses: int
    win_rate: float


class RiskReport(BaseModel):
    """风险报告"""
    report_id: str
    user_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    risk_level: RiskLevel
    position_metrics: PositionRiskMetrics
    pnl_metrics: PnLRiskMetrics
    active_alerts: int
    violations: list[str] = []
    recommendations: list[str] = []


# ==================== 监控数据 ====================

class PositionSnapshot(BaseModel):
    """持仓快照"""
    user_id: str
    symbol: str
    quantity: float
    entry_price: float
    current_price: float
    unrealized_pnl: float
    position_value_usdt: float
    leverage: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class PnLSnapshot(BaseModel):
    """盈亏快照"""
    user_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    realized_pnl_today: float
    unrealized_pnl: float
    total_pnl: float
    equity: float
    initial_equity: float
    peak_equity: float
    drawdown: float
    drawdown_percentage: float


# ==================== 紧急止损 ====================

class EmergencyStopRequest(BaseModel):
    """紧急止损请求"""
    user_id: str
    reason: str
    force: bool = False


class EmergencyStopResponse(BaseModel):
    """紧急止损响应"""
    success: bool
    message: str
    closed_positions: list[str] = []
    cancelled_orders: list[str] = []
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ==================== 系统配置 ====================

class RiskLimitsConfig(BaseModel):
    """风控限制配置"""
    max_position_size_usdt: float
    max_total_position_usdt: float
    max_order_size_usdt: float
    max_daily_loss_usdt: float
    max_drawdown_percentage: float
    max_leverage: float


class RiskLimitsUpdateRequest(BaseModel):
    """风控限制更新请求"""
    max_position_size_usdt: Optional[float] = None
    max_total_position_usdt: Optional[float] = None
    max_order_size_usdt: Optional[float] = None
    max_daily_loss_usdt: Optional[float] = None
    max_drawdown_percentage: Optional[float] = None
    max_leverage: Optional[float] = None


# ==================== 通用响应 ====================

class HealthResponse(BaseModel):
    """健康检查响应"""
    status: str
    version: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    redis_connected: bool
    active_monitors: int


class ErrorResponse(BaseModel):
    """错误响应"""
    error: str
    detail: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
