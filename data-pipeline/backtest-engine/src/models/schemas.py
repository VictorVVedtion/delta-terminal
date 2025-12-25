"""数据模型与模式定义"""
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional, Dict, List, Any
from pydantic import BaseModel, Field, field_validator


class OrderType(str, Enum):
    """订单类型"""
    MARKET = "market"
    LIMIT = "limit"
    STOP = "stop"
    STOP_LIMIT = "stop_limit"


class OrderSide(str, Enum):
    """订单方向"""
    BUY = "buy"
    SELL = "sell"


class OrderStatus(str, Enum):
    """订单状态"""
    PENDING = "pending"
    FILLED = "filled"
    PARTIALLY_FILLED = "partially_filled"
    CANCELLED = "cancelled"
    REJECTED = "rejected"


class PositionSide(str, Enum):
    """持仓方向"""
    LONG = "long"
    SHORT = "short"
    FLAT = "flat"


class EventType(str, Enum):
    """事件类型"""
    MARKET = "market"
    SIGNAL = "signal"
    ORDER = "order"
    FILL = "fill"


# ========== 市场数据模型 ==========

class OHLCV(BaseModel):
    """OHLCV K线数据"""
    timestamp: datetime
    symbol: str
    open: float
    high: float
    low: float
    close: float
    volume: float


class MarketData(BaseModel):
    """市场数据"""
    timestamp: datetime
    symbol: str
    data: Dict[str, float]  # 可包含OHLCV及其他指标


# ========== 订单与成交模型 ==========

class Order(BaseModel):
    """订单模型"""
    order_id: str
    timestamp: datetime
    symbol: str
    order_type: OrderType
    side: OrderSide
    quantity: float
    price: Optional[float] = None
    stop_price: Optional[float] = None
    status: OrderStatus = OrderStatus.PENDING
    filled_quantity: float = 0.0
    average_price: float = 0.0


class Fill(BaseModel):
    """成交模型"""
    fill_id: str
    order_id: str
    timestamp: datetime
    symbol: str
    side: OrderSide
    quantity: float
    price: float
    commission: float
    slippage: float


class Position(BaseModel):
    """持仓模型"""
    symbol: str
    side: PositionSide
    quantity: float
    average_price: float
    current_price: float
    unrealized_pnl: float
    realized_pnl: float


# ========== 投资组合模型 ==========

class Portfolio(BaseModel):
    """投资组合快照"""
    timestamp: datetime
    cash: float
    equity: float
    positions: Dict[str, Position]
    total_value: float
    unrealized_pnl: float
    realized_pnl: float


# ========== 策略信号模型 ==========

class Signal(BaseModel):
    """交易信号"""
    timestamp: datetime
    symbol: str
    signal_type: str  # "buy", "sell", "hold"
    strength: float = Field(ge=0.0, le=1.0)  # 信号强度 0-1
    metadata: Dict[str, Any] = Field(default_factory=dict)


# ========== 回测请求与结果模型 ==========

class BacktestConfig(BaseModel):
    """回测配置"""
    strategy_id: str
    strategy_code: Optional[str] = None  # Python策略代码
    symbols: List[str]
    start_date: datetime
    end_date: datetime
    initial_capital: float = 100000.0
    commission: float = 0.001
    slippage: float = 0.0005
    benchmark_symbol: Optional[str] = None
    parameters: Dict[str, Any] = Field(default_factory=dict)

    @field_validator('symbols')
    @classmethod
    def validate_symbols(cls, v: List[str]) -> List[str]:
        if not v:
            raise ValueError("至少需要一个交易品种")
        return v

    @field_validator('initial_capital')
    @classmethod
    def validate_capital(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("初始资金必须大于0")
        return v


class BacktestRequest(BaseModel):
    """回测请求"""
    config: BacktestConfig
    data_source: str = "timescaledb"  # 数据源
    enable_optimization: bool = False
    optimization_params: Optional[Dict[str, List[Any]]] = None


class PerformanceMetrics(BaseModel):
    """性能指标"""
    # 收益指标
    total_return: float
    annual_return: float
    cumulative_return: float

    # 风险指标
    volatility: float
    sharpe_ratio: float
    sortino_ratio: float
    calmar_ratio: float
    max_drawdown: float
    max_drawdown_duration: int  # 天数

    # 交易指标
    total_trades: int
    win_rate: float
    profit_factor: float
    average_win: float
    average_loss: float
    largest_win: float
    largest_loss: float

    # 其他指标
    alpha: Optional[float] = None
    beta: Optional[float] = None
    information_ratio: Optional[float] = None


class BacktestResult(BaseModel):
    """回测结果"""
    backtest_id: str
    config: BacktestConfig
    start_time: datetime
    end_time: datetime
    duration_seconds: float

    # 性能指标
    metrics: PerformanceMetrics

    # 时间序列数据
    equity_curve: List[Dict[str, Any]]  # [{timestamp, equity, drawdown}]
    trades: List[Fill]

    # 持仓历史
    position_history: List[Dict[str, Any]]

    # 统计信息
    status: str  # "completed", "failed", "timeout"
    error_message: Optional[str] = None


class OptimizationResult(BaseModel):
    """参数优化结果"""
    optimization_id: str
    best_params: Dict[str, Any]
    best_metrics: PerformanceMetrics
    all_results: List[Dict[str, Any]]  # 所有参数组合的结果
    total_combinations: int
    completed_at: datetime


# ========== 报告模型 ==========

class ReportRequest(BaseModel):
    """报告生成请求"""
    backtest_id: str
    format: str = "html"  # html, pdf, excel
    include_charts: bool = True
    include_trades: bool = True


class ReportResponse(BaseModel):
    """报告响应"""
    report_id: str
    backtest_id: str
    format: str
    file_path: str
    download_url: str
    created_at: datetime


# ========== 响应模型 ==========

class HealthResponse(BaseModel):
    """健康检查响应"""
    status: str
    service: str
    version: str
    timestamp: datetime


class ErrorResponse(BaseModel):
    """错误响应"""
    error: str
    message: str
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime
