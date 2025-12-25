"""市场信息端点"""
from fastapi import APIRouter, HTTPException, Query, status
from typing import List, Optional

from ...models.schemas import (
    Market,
    Ticker,
    OrderBook,
    Trade,
    OHLCV,
    SuccessResponse,
)
from ...services.exchange_service import get_exchange_service

router = APIRouter(prefix="/markets", tags=["markets"])


@router.get("/{exchange_id}/markets", response_model=SuccessResponse)
async def get_markets(exchange_id: str) -> SuccessResponse:
    """
    获取市场列表

    Args:
        exchange_id: 交易所ID

    Returns:
        市场列表
    """
    try:
        service = get_exchange_service()
        markets = await service.fetch_markets(exchange_id)

        return SuccessResponse(data=[m.model_dump() for m in markets])

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取市场列表失败: {str(e)}",
        )


@router.get("/{exchange_id}/ticker/{symbol}", response_model=SuccessResponse)
async def get_ticker(exchange_id: str, symbol: str) -> SuccessResponse:
    """
    获取行情数据

    Args:
        exchange_id: 交易所ID
        symbol: 交易对（如 BTC/USDT）

    Returns:
        行情数据
    """
    try:
        service = get_exchange_service()
        ticker = await service.fetch_ticker(exchange_id, symbol)

        return SuccessResponse(data=ticker.model_dump())

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取行情失败: {str(e)}",
        )


@router.get("/{exchange_id}/orderbook/{symbol}", response_model=SuccessResponse)
async def get_orderbook(
    exchange_id: str,
    symbol: str,
    limit: Optional[int] = Query(None, description="深度限制")
) -> SuccessResponse:
    """
    获取订单簿

    Args:
        exchange_id: 交易所ID
        symbol: 交易对
        limit: 深度限制

    Returns:
        订单簿数据
    """
    try:
        service = get_exchange_service()
        orderbook = await service.fetch_order_book(exchange_id, symbol, limit)

        return SuccessResponse(data=orderbook.model_dump())

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取订单簿失败: {str(e)}",
        )


@router.get("/{exchange_id}/trades/{symbol}", response_model=SuccessResponse)
async def get_trades(
    exchange_id: str,
    symbol: str,
    since: Optional[int] = Query(None, description="起始时间戳（毫秒）"),
    limit: Optional[int] = Query(100, description="数量限制")
) -> SuccessResponse:
    """
    获取最近成交

    Args:
        exchange_id: 交易所ID
        symbol: 交易对
        since: 起始时间戳
        limit: 数量限制

    Returns:
        成交记录列表
    """
    try:
        service = get_exchange_service()
        trades = await service.fetch_trades(exchange_id, symbol, since, limit)

        return SuccessResponse(data=[t.model_dump() for t in trades])

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取成交记录失败: {str(e)}",
        )


@router.get("/{exchange_id}/ohlcv/{symbol}", response_model=SuccessResponse)
async def get_ohlcv(
    exchange_id: str,
    symbol: str,
    timeframe: str = Query("1m", description="时间周期（1m, 5m, 15m, 1h, 4h, 1d等）"),
    since: Optional[int] = Query(None, description="起始时间戳（毫秒）"),
    limit: Optional[int] = Query(100, description="数量限制")
) -> SuccessResponse:
    """
    获取K线数据

    Args:
        exchange_id: 交易所ID
        symbol: 交易对
        timeframe: 时间周期
        since: 起始时间戳
        limit: 数量限制

    Returns:
        K线数据列表
    """
    try:
        service = get_exchange_service()
        ohlcv = await service.fetch_ohlcv(exchange_id, symbol, timeframe, since, limit)

        return SuccessResponse(data=[k.model_dump() for k in ohlcv])

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取K线数据失败: {str(e)}",
        )
