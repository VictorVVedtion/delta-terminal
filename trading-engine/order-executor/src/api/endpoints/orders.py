"""
订单管理 API 端点
"""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Depends
import structlog

from ...models.schemas import (
    OrderCreateRequest,
    OrderCancelRequest,
    OrderQueryRequest,
    OrderResponse,
    OrderStatistics,
    OrderStatus,
    TWAPProgress,
    IcebergProgress,
    QueueStatus,
)
from ...services.order_service import OrderService

logger = structlog.get_logger()
router = APIRouter(prefix="/orders", tags=["orders"])


# 依赖注入 (实际应通过依赖容器管理)
def get_order_service() -> OrderService:
    """获取订单服务实例"""
    from ...main import app

    return app.state.order_service


@router.post("", response_model=OrderResponse, status_code=201)
async def create_order(
    order_request: OrderCreateRequest,
    priority: int = Query(0, ge=0, le=10, description="订单优先级 0-10"),
    service: OrderService = Depends(get_order_service),
) -> OrderResponse:
    """
    创建新订单

    支持的订单类型:
    - market: 市价单
    - limit: 限价单
    - twap: TWAP 订单 (时间加权平均价格)
    - iceberg: 冰山单 (隐藏订单规模)

    Args:
        order_request: 订单创建请求
        priority: 订单优先级 (0-10, 数值越大优先级越高)

    Returns:
        创建的订单信息
    """
    try:
        logger.info(
            "api_create_order",
            strategy_id=order_request.strategy_id,
            symbol=order_request.symbol,
            order_type=order_request.order_type.value,
        )
        return await service.create_order(order_request, priority)
    except ValueError as e:
        logger.warning("invalid_order_request", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("create_order_failed", error=str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create order: {e}")


@router.post("/{order_id}/cancel", response_model=OrderResponse)
async def cancel_order(
    order_id: str,
    reason: Optional[str] = Query(None, description="取消原因"),
    service: OrderService = Depends(get_order_service),
) -> OrderResponse:
    """
    取消订单

    Args:
        order_id: 订单ID
        reason: 取消原因 (可选)

    Returns:
        更新后的订单信息
    """
    try:
        cancel_request = OrderCancelRequest(order_id=order_id, reason=reason)
        logger.info("api_cancel_order", order_id=order_id, reason=reason)
        return await service.cancel_order(cancel_request)
    except ValueError as e:
        logger.warning("order_not_found", order_id=order_id)
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error("cancel_order_failed", order_id=order_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to cancel order: {e}")


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: str, service: OrderService = Depends(get_order_service)
) -> OrderResponse:
    """
    查询单个订单

    Args:
        order_id: 订单ID

    Returns:
        订单详情
    """
    order = await service.get_order(order_id)
    if not order:
        raise HTTPException(status_code=404, detail=f"Order not found: {order_id}")
    return order


@router.get("", response_model=List[OrderResponse])
async def query_orders(
    strategy_id: Optional[str] = Query(None, description="策略ID"),
    exchange: Optional[str] = Query(None, description="交易所"),
    symbol: Optional[str] = Query(None, description="交易对"),
    status: Optional[OrderStatus] = Query(None, description="订单状态"),
    limit: int = Query(100, ge=1, le=1000, description="返回数量限制"),
    offset: int = Query(0, ge=0, description="偏移量"),
    service: OrderService = Depends(get_order_service),
) -> List[OrderResponse]:
    """
    查询订单列表

    支持多种过滤条件:
    - strategy_id: 按策略ID过滤
    - exchange: 按交易所过滤
    - symbol: 按交易对过滤
    - status: 按订单状态过滤

    分页参数:
    - limit: 每页数量 (1-1000)
    - offset: 偏移量

    Returns:
        订单列表
    """
    query = OrderQueryRequest(
        strategy_id=strategy_id,
        exchange=exchange,
        symbol=symbol,
        status=status,
        limit=limit,
        offset=offset,
    )
    return await service.query_orders(query)


@router.get("/statistics", response_model=OrderStatistics)
async def get_order_statistics(
    strategy_id: Optional[str] = Query(None, description="策略ID"),
    service: OrderService = Depends(get_order_service),
) -> OrderStatistics:
    """
    获取订单统计信息

    Args:
        strategy_id: 策略ID (可选, 为空则统计所有订单)

    Returns:
        订单统计数据
    """
    return await service.get_order_statistics(strategy_id)


@router.get("/{order_id}/twap-progress", response_model=TWAPProgress)
async def get_twap_progress(
    order_id: str, service: OrderService = Depends(get_order_service)
) -> TWAPProgress:
    """
    获取 TWAP 订单执行进度

    仅适用于 TWAP 类型订单

    Args:
        order_id: 订单ID

    Returns:
        TWAP 执行进度
    """
    progress = await service.get_twap_progress(order_id)
    if not progress:
        raise HTTPException(
            status_code=404, detail=f"TWAP order not found: {order_id}"
        )
    return progress


@router.get("/{order_id}/iceberg-progress", response_model=IcebergProgress)
async def get_iceberg_progress(
    order_id: str, service: OrderService = Depends(get_order_service)
) -> IcebergProgress:
    """
    获取冰山单执行进度

    仅适用于冰山单类型订单

    Args:
        order_id: 订单ID

    Returns:
        冰山单执行进度
    """
    progress = await service.get_iceberg_progress(order_id)
    if not progress:
        raise HTTPException(
            status_code=404, detail=f"Iceberg order not found: {order_id}"
        )
    return progress


@router.get("/queue/status", response_model=QueueStatus)
async def get_queue_status(
    service: OrderService = Depends(get_order_service),
) -> QueueStatus:
    """
    获取订单队列状态

    Returns:
        队列状态信息
    """
    return await service.order_queue.get_queue_status()
