"""信号数据模型"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class SignalType(str, Enum):
    """信号类型"""

    BUY = "buy"
    SELL = "sell"
    NEUTRAL = "neutral"


class StrategyType(str, Enum):
    """策略类型"""

    MOMENTUM = "momentum"
    TREND = "trend"
    VOLUME = "volume"
    COMBINED = "combined"


class IndicatorType(str, Enum):
    """指标类型"""

    RSI = "rsi"
    MACD = "macd"
    STOCHASTIC = "stochastic"
    SMA = "sma"
    EMA = "ema"
    BOLLINGER_BANDS = "bb"
    ADX = "adx"
    OBV = "obv"
    VWAP = "vwap"


class OHLCVData(BaseModel):
    """OHLCV 数据模型"""

    timestamp: int = Field(..., description="时间戳（毫秒）")
    open: float = Field(..., gt=0, description="开盘价")
    high: float = Field(..., gt=0, description="最高价")
    low: float = Field(..., gt=0, description="最低价")
    close: float = Field(..., gt=0, description="收盘价")
    volume: float = Field(..., ge=0, description="成交量")


class RSIIndicator(BaseModel):
    """RSI 指标"""

    value: float = Field(..., ge=0, le=100, description="RSI 值")
    period: int = Field(default=14, description="周期")
    timestamp: int = Field(..., description="时间戳")
    signal: Optional[SignalType] = Field(None, description="信号")


class MACDIndicator(BaseModel):
    """MACD 指标"""

    macd: float = Field(..., description="MACD 值")
    signal: float = Field(..., description="信号线")
    histogram: float = Field(..., description="柱状图")
    timestamp: int = Field(..., description="时间戳")
    trend: Optional[str] = Field(None, description="趋势（bullish/bearish）")


class BollingerBandsIndicator(BaseModel):
    """布林带指标"""

    upper: float = Field(..., description="上轨")
    middle: float = Field(..., description="中轨")
    lower: float = Field(..., description="下轨")
    timestamp: int = Field(..., description="时间戳")
    position: Optional[str] = Field(None, description="价格位置")


class IndicatorCalculateRequest(BaseModel):
    """指标计算请求"""

    symbol: str = Field(..., description="交易对")
    timeframe: str = Field(..., description="时间周期")
    indicators: List[IndicatorType] = Field(..., description="指标列表")
    ohlcv_data: List[OHLCVData] = Field(..., min_length=1, description="OHLCV 数据")
    params: Optional[Dict[str, Any]] = Field(None, description="自定义参数")


class IndicatorCalculateResponse(BaseModel):
    """指标计算响应"""

    symbol: str = Field(..., description="交易对")
    timeframe: str = Field(..., description="时间周期")
    indicators: Dict[str, Any] = Field(..., description="指标数据")
    timestamp: int = Field(..., description="计算时间戳")


class SignalGenerateRequest(BaseModel):
    """信号生成请求"""

    symbol: str = Field(..., description="交易对")
    timeframe: str = Field(..., description="时间周期")
    ohlcv_data: List[OHLCVData] = Field(..., min_length=20, description="OHLCV 数据")
    strategy: StrategyType = Field(default=StrategyType.MOMENTUM, description="策略类型")
    params: Optional[Dict[str, Any]] = Field(None, description="自定义参数")


class SignalResponse(BaseModel):
    """信号响应"""

    symbol: str = Field(..., description="交易对")
    signal: SignalType = Field(..., description="信号类型")
    confidence: float = Field(..., ge=0, le=1, description="置信度")
    timestamp: int = Field(..., description="时间戳")
    indicators: Dict[str, Any] = Field(..., description="支持指标")
    reasoning: str = Field(..., description="信号原因")
    entry_price: Optional[float] = Field(None, description="建议入场价")
    stop_loss: Optional[float] = Field(None, description="止损价")
    take_profit: Optional[float] = Field(None, description="止盈价")


class AggregateSignalRequest(BaseModel):
    """聚合信号请求"""

    symbol: str = Field(..., description="交易对")
    timeframe: str = Field(..., description="时间周期")
    ohlcv_data: List[OHLCVData] = Field(..., min_length=50, description="OHLCV 数据")
    strategies: List[StrategyType] = Field(..., min_length=1, description="策略列表")
    weights: Optional[Dict[str, float]] = Field(None, description="策略权重")


class IndividualSignal(BaseModel):
    """单个信号"""

    strategy: StrategyType = Field(..., description="策略类型")
    signal: SignalType = Field(..., description="信号类型")
    confidence: float = Field(..., ge=0, le=1, description="置信度")


class AggregateSignalResponse(BaseModel):
    """聚合信号响应"""

    symbol: str = Field(..., description="交易对")
    aggregated_signal: SignalType = Field(..., description="聚合信号")
    confidence: float = Field(..., ge=0, le=1, description="聚合置信度")
    timestamp: int = Field(..., description="时间戳")
    individual_signals: List[IndividualSignal] = Field(..., description="单个信号列表")
    reasoning: str = Field(..., description="聚合原因")


class HealthResponse(BaseModel):
    """健康检查响应"""

    status: str = Field(..., description="服务状态")
    service: str = Field(..., description="服务名称")
    version: str = Field(..., description="服务版本")
    timestamp: datetime = Field(..., description="时间戳")
    redis_connected: bool = Field(..., description="Redis 连接状态")
