"""
数据查询端点
"""
from fastapi import APIRouter, HTTPException, Query, status
from datetime import datetime
from typing import Optional

from src.models.schemas import (
    Exchange,
    Interval,
    DataQueryRequest,
    TickerResponse,
    OrderBookResponse,
    TradeResponse,
    KlineResponse,
)
from src.services.data_service import data_service

router = APIRouter(prefix="/data", tags=["数据查询"])


@router.get(
    "/ticker",
    response_model=TickerResponse,
    summary="查询 Ticker 数据",
    description="查询指定交易对的 Ticker 数据（实时或历史）",
)
async def get_ticker(
    exchange: Exchange = Query(..., description="交易所"),
    symbol: str = Query(..., description="交易对，如 BTC/USDT"),
    start_time: Optional[datetime] = Query(None, description="起始时间"),
    end_time: Optional[datetime] = Query(None, description="结束时间"),
    limit: int = Query(100, ge=1, le=1000, description="返回数量限制"),
) -> TickerResponse:
    """
    查询 Ticker 数据

    - 不提供时间范围：返回最新缓存数据
    - 提供时间范围：返回历史数据

    参数:
    - exchange: 交易所名称
    - symbol: 交易对
    - start_time: 起始时间（可选）
    - end_time: 结束时间（可选）
    - limit: 返回数量限制（默认100）
    """
    try:
        request = DataQueryRequest(
            exchange=exchange,
            symbol=symbol,
            data_type="ticker",
            start_time=start_time,
            end_time=end_time,
            limit=limit,
        )

        return await data_service.query_ticker_data(request)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"查询 Ticker 失败: {str(e)}",
        )


@router.get(
    "/orderbook",
    response_model=OrderBookResponse,
    summary="查询订单簿数据",
    description="查询指定交易对的实时订单簿数据",
)
async def get_orderbook(
    exchange: Exchange = Query(..., description="交易所"),
    symbol: str = Query(..., description="交易对，如 BTC/USDT"),
) -> OrderBookResponse:
    """
    查询订单簿数据（实时数据，从缓存获取）

    参数:
    - exchange: 交易所名称
    - symbol: 交易对
    """
    try:
        request = DataQueryRequest(
            exchange=exchange,
            symbol=symbol,
            data_type="orderbook",
        )

        return await data_service.query_orderbook_data(request)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"查询订单簿失败: {str(e)}",
        )


@router.get(
    "/trades",
    response_model=TradeResponse,
    summary="查询成交数据",
    description="查询指定交易对的历史成交数据",
)
async def get_trades(
    exchange: Exchange = Query(..., description="交易所"),
    symbol: str = Query(..., description="交易对，如 BTC/USDT"),
    start_time: Optional[datetime] = Query(None, description="起始时间"),
    end_time: Optional[datetime] = Query(None, description="结束时间"),
    limit: int = Query(100, ge=1, le=1000, description="返回数量限制"),
) -> TradeResponse:
    """
    查询成交数据

    参数:
    - exchange: 交易所名称
    - symbol: 交易对
    - start_time: 起始时间（可选）
    - end_time: 结束时间（可选）
    - limit: 返回数量限制（默认100）
    """
    try:
        request = DataQueryRequest(
            exchange=exchange,
            symbol=symbol,
            data_type="trade",
            start_time=start_time,
            end_time=end_time,
            limit=limit,
        )

        return await data_service.query_trade_data(request)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"查询成交数据失败: {str(e)}",
        )


@router.get(
    "/klines",
    response_model=KlineResponse,
    summary="查询K线数据",
    description="查询指定交易对的K线数据",
)
async def get_klines(
    exchange: Exchange = Query(..., description="交易所"),
    symbol: str = Query(..., description="交易对，如 BTC/USDT"),
    interval: Interval = Query(..., description="K线间隔"),
    start_time: Optional[datetime] = Query(None, description="起始时间"),
    end_time: Optional[datetime] = Query(None, description="结束时间"),
    limit: int = Query(100, ge=1, le=1000, description="返回数量限制"),
) -> KlineResponse:
    """
    查询K线数据

    参数:
    - exchange: 交易所名称
    - symbol: 交易对
    - interval: K线间隔（1m, 5m, 15m, 1h, 4h, 1d）
    - start_time: 起始时间（可选）
    - end_time: 结束时间（可选）
    - limit: 返回数量限制（默认100）
    """
    try:
        request = DataQueryRequest(
            exchange=exchange,
            symbol=symbol,
            data_type="kline",
            interval=interval,
            start_time=start_time,
            end_time=end_time,
            limit=limit,
        )

        return await data_service.query_kline_data(request)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"查询K线数据失败: {str(e)}",
        )
