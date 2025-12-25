"""账户信息端点"""
from fastapi import APIRouter, HTTPException, Query, status
from typing import List, Optional

from ...models.schemas import (
    Balance,
    Position,
    Order,
    OrderRequest,
    SuccessResponse,
)
from ...services.exchange_service import get_exchange_service

router = APIRouter(prefix="/account", tags=["account"])


@router.get("/{exchange_id}/balance", response_model=SuccessResponse)
async def get_balance(exchange_id: str) -> SuccessResponse:
    """
    获取账户余额

    Args:
        exchange_id: 交易所ID

    Returns:
        余额列表
    """
    try:
        service = get_exchange_service()
        balances = await service.fetch_balance(exchange_id)

        return SuccessResponse(data=[b.model_dump() for b in balances])

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取余额失败: {str(e)}",
        )


@router.get("/{exchange_id}/positions", response_model=SuccessResponse)
async def get_positions(
    exchange_id: str,
    symbols: Optional[List[str]] = Query(None, description="交易对列表")
) -> SuccessResponse:
    """
    获取持仓信息（合约）

    Args:
        exchange_id: 交易所ID
        symbols: 交易对列表

    Returns:
        持仓列表
    """
    try:
        service = get_exchange_service()
        positions = await service.fetch_positions(exchange_id, symbols)

        return SuccessResponse(data=[p.model_dump() for p in positions])

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取持仓失败: {str(e)}",
        )


@router.post("/{exchange_id}/orders", response_model=SuccessResponse)
async def create_order(
    exchange_id: str,
    order: OrderRequest
) -> SuccessResponse:
    """
    创建订单

    Args:
        exchange_id: 交易所ID
        order: 订单请求

    Returns:
        订单信息
    """
    try:
        service = get_exchange_service()
        result = await service.create_order(exchange_id, order)

        return SuccessResponse(data=result.model_dump())

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建订单失败: {str(e)}",
        )


@router.delete("/{exchange_id}/orders/{order_id}", response_model=SuccessResponse)
async def cancel_order(
    exchange_id: str,
    order_id: str,
    symbol: str = Query(..., description="交易对")
) -> SuccessResponse:
    """
    取消订单

    Args:
        exchange_id: 交易所ID
        order_id: 订单ID
        symbol: 交易对

    Returns:
        订单信息
    """
    try:
        service = get_exchange_service()
        result = await service.cancel_order(exchange_id, order_id, symbol)

        return SuccessResponse(data=result.model_dump())

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"取消订单失败: {str(e)}",
        )


@router.get("/{exchange_id}/orders/{order_id}", response_model=SuccessResponse)
async def get_order(
    exchange_id: str,
    order_id: str,
    symbol: str = Query(..., description="交易对")
) -> SuccessResponse:
    """
    查询订单

    Args:
        exchange_id: 交易所ID
        order_id: 订单ID
        symbol: 交易对

    Returns:
        订单信息
    """
    try:
        service = get_exchange_service()
        order = await service.fetch_order(exchange_id, order_id, symbol)

        return SuccessResponse(data=order.model_dump())

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"查询订单失败: {str(e)}",
        )


@router.get("/{exchange_id}/orders/open", response_model=SuccessResponse)
async def get_open_orders(
    exchange_id: str,
    symbol: Optional[str] = Query(None, description="交易对")
) -> SuccessResponse:
    """
    查询未完成订单

    Args:
        exchange_id: 交易所ID
        symbol: 交易对（可选）

    Returns:
        订单列表
    """
    try:
        service = get_exchange_service()
        orders = await service.fetch_open_orders(exchange_id, symbol)

        return SuccessResponse(data=[o.model_dump() for o in orders])

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"查询未完成订单失败: {str(e)}",
        )


@router.get("/{exchange_id}/orders/closed", response_model=SuccessResponse)
async def get_closed_orders(
    exchange_id: str,
    symbol: Optional[str] = Query(None, description="交易对"),
    since: Optional[int] = Query(None, description="起始时间戳（毫秒）"),
    limit: Optional[int] = Query(100, description="数量限制")
) -> SuccessResponse:
    """
    查询已完成订单

    Args:
        exchange_id: 交易所ID
        symbol: 交易对（可选）
        since: 起始时间戳
        limit: 数量限制

    Returns:
        订单列表
    """
    try:
        service = get_exchange_service()
        orders = await service.fetch_closed_orders(exchange_id, symbol, since, limit)

        return SuccessResponse(data=[o.model_dump() for o in orders])

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"查询已完成订单失败: {str(e)}",
        )
