"""数据模型定义"""
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field, validator


# ==================== 交易所管理 ====================

class ExchangeCredentials(BaseModel):
    """交易所凭证"""
    api_key: str
    api_secret: str
    password: Optional[str] = None
    testnet: bool = False


class ExchangeConnection(BaseModel):
    """交易所连接信息"""
    exchange_id: str
    connected: bool
    testnet: bool
    rate_limit: Optional[Dict[str, Any]] = None
    last_ping: Optional[datetime] = None


class SupportedExchange(BaseModel):
    """支持的交易所"""
    id: str
    name: str
    countries: List[str]
    has: Dict[str, bool]
    timeframes: List[str]
    urls: Dict[str, str]


# ==================== 市场数据 ====================

class Market(BaseModel):
    """市场信息"""
    id: str
    symbol: str
    base: str
    quote: str
    settle: Optional[str] = None
    base_id: str
    quote_id: str
    settle_id: Optional[str] = None
    type: Literal["spot", "swap", "future", "option"]
    spot: bool
    margin: bool
    swap: bool
    future: bool
    option: bool
    active: bool
    contract: bool
    linear: Optional[bool] = None
    inverse: Optional[bool] = None
    taker: float
    maker: float
    contract_size: Optional[float] = None
    expiry: Optional[datetime] = None
    expiry_datetime: Optional[datetime] = None
    strike: Optional[float] = None
    option_type: Optional[Literal["call", "put"]] = None
    precision: Dict[str, Any]
    limits: Dict[str, Any]
    info: Dict[str, Any]


class Ticker(BaseModel):
    """行情数据"""
    symbol: str
    timestamp: int
    datetime: str
    high: Optional[float] = None
    low: Optional[float] = None
    bid: Optional[float] = None
    bid_volume: Optional[float] = None
    ask: Optional[float] = None
    ask_volume: Optional[float] = None
    vwap: Optional[float] = None
    open: Optional[float] = None
    close: Optional[float] = None
    last: Optional[float] = None
    previous_close: Optional[float] = None
    change: Optional[float] = None
    percentage: Optional[float] = None
    average: Optional[float] = None
    base_volume: Optional[float] = None
    quote_volume: Optional[float] = None
    info: Dict[str, Any]


class OrderBook(BaseModel):
    """订单簿"""
    symbol: str
    timestamp: int
    datetime: str
    nonce: Optional[int] = None
    bids: List[List[float]]
    asks: List[List[float]]


class Trade(BaseModel):
    """交易记录"""
    id: str
    timestamp: int
    datetime: str
    symbol: str
    order: Optional[str] = None
    type: Optional[Literal["limit", "market"]] = None
    side: Literal["buy", "sell"]
    taker_or_maker: Literal["taker", "maker"]
    price: float
    amount: float
    cost: float
    fee: Optional[Dict[str, Any]] = None
    info: Dict[str, Any]


class OHLCV(BaseModel):
    """K线数据"""
    timestamp: int
    open: float
    high: float
    low: float
    close: float
    volume: float


# ==================== 账户管理 ====================

class Balance(BaseModel):
    """余额信息"""
    currency: str
    free: float
    used: float
    total: float


class AccountBalance(BaseModel):
    """账户余额"""
    exchange_id: str
    timestamp: int
    datetime: str
    balances: List[Balance]
    info: Dict[str, Any]


class Position(BaseModel):
    """持仓信息"""
    symbol: str
    timestamp: int
    datetime: str
    isolated: bool
    hedge_mode: bool
    side: Literal["long", "short"]
    contracts: float
    contract_size: float
    entry_price: float
    mark_price: Optional[float] = None
    notional: float
    leverage: float
    collateral: float
    initial_margin: float
    maintenance_margin: float
    unrealized_pnl: float
    liquidation_price: Optional[float] = None
    margin_mode: Literal["cross", "isolated"]
    percentage: Optional[float] = None
    info: Dict[str, Any]


# ==================== 订单管理 ====================

class OrderRequest(BaseModel):
    """下单请求"""
    symbol: str
    type: Literal["limit", "market", "stop_loss", "stop_loss_limit", "take_profit", "take_profit_limit"]
    side: Literal["buy", "sell"]
    amount: float
    price: Optional[float] = None
    stop_price: Optional[float] = None
    params: Dict[str, Any] = Field(default_factory=dict)

    @validator('price')
    def validate_price(cls, v: Optional[float], values: Dict[str, Any]) -> Optional[float]:
        """验证价格"""
        order_type = values.get('type')
        if order_type == 'limit' and v is None:
            raise ValueError('限价单必须指定价格')
        return v


class Order(BaseModel):
    """订单信息"""
    id: str
    client_order_id: Optional[str] = None
    timestamp: int
    datetime: str
    last_trade_timestamp: Optional[int] = None
    status: Literal["open", "closed", "canceled", "expired", "rejected"]
    symbol: str
    type: str
    time_in_force: Optional[str] = None
    side: Literal["buy", "sell"]
    price: Optional[float] = None
    average: Optional[float] = None
    amount: float
    filled: float
    remaining: float
    cost: float
    trades: List[Trade] = Field(default_factory=list)
    fee: Optional[Dict[str, Any]] = None
    info: Dict[str, Any]


# ==================== WebSocket ====================

class WebSocketSubscription(BaseModel):
    """WebSocket 订阅"""
    exchange_id: str
    channel: Literal["ticker", "orderbook", "trades", "ohlcv"]
    symbols: List[str]
    params: Dict[str, Any] = Field(default_factory=dict)


class WebSocketMessage(BaseModel):
    """WebSocket 消息"""
    exchange_id: str
    channel: str
    symbol: str
    timestamp: int
    data: Dict[str, Any]


# ==================== 响应模型 ====================

class SuccessResponse(BaseModel):
    """成功响应"""
    success: bool = True
    data: Any
    timestamp: int = Field(default_factory=lambda: int(datetime.utcnow().timestamp() * 1000))


class ErrorResponse(BaseModel):
    """错误响应"""
    success: bool = False
    error: str
    code: str
    timestamp: int = Field(default_factory=lambda: int(datetime.utcnow().timestamp() * 1000))


# ==================== 健康检查 ====================

class HealthCheck(BaseModel):
    """健康检查"""
    status: Literal["healthy", "degraded", "unhealthy"]
    version: str
    timestamp: int
    exchanges: Dict[str, bool]
    redis: bool
