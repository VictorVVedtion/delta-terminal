"""
数据模型与 Schema 定义
"""
from datetime import datetime
from enum import Enum
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field, ConfigDict


class OrderSide(str, Enum):
    """订单方向"""

    BUY = "buy"
    SELL = "sell"


class OrderType(str, Enum):
    """订单类型"""

    MARKET = "market"
    LIMIT = "limit"
    TWAP = "twap"
    ICEBERG = "iceberg"
    STOP_LOSS = "stop_loss"
    TAKE_PROFIT = "take_profit"


class OrderStatus(str, Enum):
    """订单状态"""

    PENDING = "pending"  # 等待执行
    SUBMITTED = "submitted"  # 已提交
    PARTIAL = "partial"  # 部分成交
    FILLED = "filled"  # 完全成交
    CANCELED = "canceled"  # 已取消
    REJECTED = "rejected"  # 被拒绝
    EXPIRED = "expired"  # 已过期
    FAILED = "failed"  # 执行失败


class TimeInForce(str, Enum):
    """订单有效期"""

    GTC = "GTC"  # Good Till Cancel
    IOC = "IOC"  # Immediate or Cancel
    FOK = "FOK"  # Fill or Kill
    GTD = "GTD"  # Good Till Date


# ==================== 请求模型 ====================


class OrderCreateRequest(BaseModel):
    """创建订单请求"""

    model_config = ConfigDict(use_enum_values=True)

    strategy_id: str = Field(..., description="策略ID")
    exchange: str = Field(..., description="交易所")
    symbol: str = Field(..., description="交易对")
    side: OrderSide = Field(..., description="订单方向")
    order_type: OrderType = Field(..., description="订单类型")
    quantity: float = Field(..., gt=0, description="订单数量")
    price: Optional[float] = Field(None, gt=0, description="订单价格(限价单必填)")
    time_in_force: TimeInForce = Field(TimeInForce.GTC, description="订单有效期")

    # TWAP 参数
    twap_slices: Optional[int] = Field(None, gt=0, description="TWAP 分片数量")
    twap_interval: Optional[int] = Field(None, gt=0, description="TWAP 时间间隔(秒)")

    # 冰山单参数
    iceberg_visible_ratio: Optional[float] = Field(
        None, gt=0, le=1, description="冰山单可见比例"
    )

    # 止损止盈参数
    stop_price: Optional[float] = Field(None, gt=0, description="触发价格")
    trigger_condition: Optional[str] = Field(None, description="触发条件")

    # 客户端订单ID
    client_order_id: Optional[str] = Field(None, description="客户端订单ID")

    # 备注
    notes: Optional[str] = Field(None, description="订单备注")


class OrderCancelRequest(BaseModel):
    """取消订单请求"""

    order_id: str = Field(..., description="订单ID")
    reason: Optional[str] = Field(None, description="取消原因")


class OrderQueryRequest(BaseModel):
    """查询订单请求"""

    order_id: Optional[str] = Field(None, description="订单ID")
    strategy_id: Optional[str] = Field(None, description="策略ID")
    exchange: Optional[str] = Field(None, description="交易所")
    symbol: Optional[str] = Field(None, description="交易对")
    status: Optional[OrderStatus] = Field(None, description="订单状态")
    start_time: Optional[datetime] = Field(None, description="开始时间")
    end_time: Optional[datetime] = Field(None, description="结束时间")
    limit: int = Field(100, gt=0, le=1000, description="返回数量限制")
    offset: int = Field(0, ge=0, description="偏移量")


# ==================== 响应模型 ====================


class ExecutionReport(BaseModel):
    """成交回报"""

    model_config = ConfigDict(from_attributes=True)

    id: str
    order_id: str
    exchange_order_id: Optional[str] = None
    timestamp: datetime
    price: float
    quantity: float
    fee: float
    fee_currency: str
    trade_id: Optional[str] = None


class OrderResponse(BaseModel):
    """订单响应"""

    model_config = ConfigDict(from_attributes=True)

    id: str
    strategy_id: str
    exchange: str
    symbol: str
    side: OrderSide
    order_type: OrderType
    status: OrderStatus
    quantity: float
    price: Optional[float] = None
    filled_quantity: float = 0.0
    average_price: Optional[float] = None
    time_in_force: TimeInForce

    # 交易所信息
    exchange_order_id: Optional[str] = None
    client_order_id: Optional[str] = None

    # 高级订单参数
    twap_slices: Optional[int] = None
    twap_interval: Optional[int] = None
    iceberg_visible_ratio: Optional[float] = None
    stop_price: Optional[float] = None

    # 时间戳
    created_at: datetime
    updated_at: datetime
    submitted_at: Optional[datetime] = None
    filled_at: Optional[datetime] = None

    # 成交记录
    executions: List[ExecutionReport] = []

    # 错误信息
    error_message: Optional[str] = None
    notes: Optional[str] = None


class PositionResponse(BaseModel):
    """持仓响应"""

    model_config = ConfigDict(from_attributes=True)

    id: str
    strategy_id: str
    exchange: str
    symbol: str
    side: str  # long/short
    quantity: float
    entry_price: float
    current_price: float
    unrealized_pnl: float
    realized_pnl: float
    margin: Optional[float] = None
    leverage: Optional[float] = None
    liquidation_price: Optional[float] = None
    created_at: datetime
    updated_at: datetime


class OrderStatistics(BaseModel):
    """订单统计"""

    total_orders: int
    pending_orders: int
    filled_orders: int
    canceled_orders: int
    failed_orders: int
    total_volume: float
    total_value: float
    success_rate: float


# ==================== TWAP 特定模型 ====================


class TWAPSlice(BaseModel):
    """TWAP 分片"""

    slice_id: str
    parent_order_id: str
    sequence: int
    quantity: float
    status: OrderStatus
    exchange_order_id: Optional[str] = None
    filled_quantity: float = 0.0
    average_price: Optional[float] = None
    scheduled_time: datetime
    executed_at: Optional[datetime] = None


class TWAPProgress(BaseModel):
    """TWAP 执行进度"""

    order_id: str
    total_slices: int
    completed_slices: int
    total_quantity: float
    filled_quantity: float
    average_price: Optional[float] = None
    progress_percentage: float
    estimated_completion: Optional[datetime] = None
    slices: List[TWAPSlice] = []


# ==================== 冰山单特定模型 ====================


class IcebergSlice(BaseModel):
    """冰山单分片"""

    slice_id: str
    parent_order_id: str
    visible_quantity: float
    hidden_quantity: float
    status: OrderStatus
    exchange_order_id: Optional[str] = None
    filled_quantity: float = 0.0
    created_at: datetime


class IcebergProgress(BaseModel):
    """冰山单执行进度"""

    order_id: str
    total_quantity: float
    visible_quantity: float
    filled_quantity: float
    remaining_quantity: float
    current_slice: Optional[IcebergSlice] = None
    completed_slices: int


# ==================== 队列模型 ====================


class OrderQueueItem(BaseModel):
    """订单队列项"""

    order_id: str
    priority: int = 0
    retry_count: int = 0
    max_retries: int = 3
    created_at: datetime
    scheduled_at: Optional[datetime] = None


class QueueStatus(BaseModel):
    """队列状态"""

    pending_count: int
    processing_count: int
    failed_count: int
    completed_count: int
    queue_health: str  # healthy/degraded/critical
