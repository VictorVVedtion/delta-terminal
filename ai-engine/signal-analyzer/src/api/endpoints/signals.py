"""信号分析端点"""

import time
from typing import Any, Dict

from fastapi import APIRouter, HTTPException
from loguru import logger

from ...models import (
    AggregateSignalRequest,
    AggregateSignalResponse,
    IndicatorCalculateRequest,
    IndicatorCalculateResponse,
    SignalGenerateRequest,
    SignalResponse,
)
from ...services import AggregatorService, IndicatorService, SignalService

router = APIRouter(prefix="/api/v1", tags=["signals"])

# 服务实例
indicator_service = IndicatorService()
signal_service = SignalService()
aggregator_service = AggregatorService()


@router.post("/indicators/calculate", response_model=IndicatorCalculateResponse)
async def calculate_indicators(request: IndicatorCalculateRequest) -> IndicatorCalculateResponse:
    """
    计算技术指标

    Args:
        request: 指标计算请求

    Returns:
        指标计算结果
    """
    try:
        logger.info(
            f"收到指标计算请求: {request.symbol} {request.timeframe}, "
            f"指标: {[i.value for i in request.indicators]}"
        )

        indicators_data = indicator_service.calculate_indicators(
            request.ohlcv_data, request.indicators, request.params
        )

        return IndicatorCalculateResponse(
            symbol=request.symbol,
            timeframe=request.timeframe,
            indicators=indicators_data,
            timestamp=int(time.time() * 1000),
        )

    except Exception as e:
        logger.error(f"计算指标时出错: {str(e)}")
        raise HTTPException(status_code=500, detail=f"指标计算失败: {str(e)}")


@router.post("/signals/generate", response_model=SignalResponse)
async def generate_signal(request: SignalGenerateRequest) -> SignalResponse:
    """
    生成交易信号

    Args:
        request: 信号生成请求

    Returns:
        交易信号
    """
    try:
        logger.info(
            f"收到信号生成请求: {request.symbol} {request.timeframe}, "
            f"策略: {request.strategy.value}"
        )

        signal_data = signal_service.generate_signal(request.ohlcv_data, request.strategy)

        # 计算建议价格（简化版）
        df = indicator_service._ohlcv_to_dataframe(request.ohlcv_data)
        current_price = float(df["close"].iloc[-1])
        entry_price = current_price
        stop_loss = None
        take_profit = None

        if signal_data["signal"].value == "buy":
            stop_loss = current_price * 0.98  # 2% 止损
            take_profit = current_price * 1.05  # 5% 止盈
        elif signal_data["signal"].value == "sell":
            stop_loss = current_price * 1.02  # 2% 止损
            take_profit = current_price * 0.95  # 5% 止盈

        return SignalResponse(
            symbol=request.symbol,
            signal=signal_data["signal"],
            confidence=signal_data["confidence"],
            timestamp=int(time.time() * 1000),
            indicators=signal_data["indicators"],
            reasoning=signal_data["reasoning"],
            entry_price=entry_price,
            stop_loss=stop_loss,
            take_profit=take_profit,
        )

    except Exception as e:
        logger.error(f"生成信号时出错: {str(e)}")
        raise HTTPException(status_code=500, detail=f"信号生成失败: {str(e)}")


@router.post("/signals/aggregate", response_model=AggregateSignalResponse)
async def aggregate_signals(request: AggregateSignalRequest) -> AggregateSignalResponse:
    """
    聚合多个策略信号

    Args:
        request: 聚合信号请求

    Returns:
        聚合信号结果
    """
    try:
        logger.info(
            f"收到信号聚合请求: {request.symbol} {request.timeframe}, "
            f"策略: {[s.value for s in request.strategies]}"
        )

        aggregated_data = aggregator_service.aggregate_signals(
            request.ohlcv_data, request.strategies, request.weights
        )

        return AggregateSignalResponse(
            symbol=request.symbol,
            aggregated_signal=aggregated_data["aggregated_signal"],
            confidence=aggregated_data["confidence"],
            timestamp=int(time.time() * 1000),
            individual_signals=aggregated_data["individual_signals"],
            reasoning=aggregated_data["reasoning"],
        )

    except Exception as e:
        logger.error(f"聚合信号时出错: {str(e)}")
        raise HTTPException(status_code=500, detail=f"信号聚合失败: {str(e)}")


@router.post("/indicators/calculate-batch")
async def calculate_indicators_batch(
    symbols: list[str],
    timeframes: list[str],
    indicators: list[str],
) -> Dict[str, Any]:
    """
    批量计算多个交易对的指标

    Args:
        symbols: 交易对列表
        timeframes: 时间周期列表
        indicators: 指标列表

    Returns:
        批量计算结果
    """
    # TODO: 实现批量计算逻辑
    return {
        "message": "批量计算功能开发中",
        "symbols": symbols,
        "timeframes": timeframes,
        "indicators": indicators,
    }
