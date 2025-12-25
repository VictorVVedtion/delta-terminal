"""
持仓管理 API 端点
"""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Depends
import structlog

from ...models.schemas import PositionResponse
from ...services.position_service import PositionService

logger = structlog.get_logger()
router = APIRouter(prefix="/positions", tags=["positions"])


# 依赖注入
def get_position_service() -> PositionService:
    """获取持仓服务实例"""
    from ...main import app

    return app.state.position_service


@router.get("", response_model=List[PositionResponse])
async def get_positions(
    strategy_id: Optional[str] = Query(None, description="策略ID"),
    exchange: Optional[str] = Query(None, description="交易所"),
    symbol: Optional[str] = Query(None, description="交易对"),
    service: PositionService = Depends(get_position_service),
) -> List[PositionResponse]:
    """
    查询持仓列表

    支持多种过滤条件:
    - strategy_id: 按策略ID过滤
    - exchange: 按交易所过滤
    - symbol: 按交易对过滤

    Returns:
        持仓列表
    """
    try:
        return await service.get_positions(strategy_id, exchange, symbol)
    except Exception as e:
        logger.error("get_positions_failed", error=str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get positions: {e}")


@router.get("/{strategy_id}/{exchange}/{symbol}", response_model=PositionResponse)
async def get_position(
    strategy_id: str,
    exchange: str,
    symbol: str,
    service: PositionService = Depends(get_position_service),
) -> PositionResponse:
    """
    查询单个持仓

    Args:
        strategy_id: 策略ID
        exchange: 交易所
        symbol: 交易对

    Returns:
        持仓详情
    """
    position = await service.get_position(strategy_id, exchange, symbol)
    if not position:
        raise HTTPException(
            status_code=404,
            detail=f"Position not found: {strategy_id}/{exchange}/{symbol}",
        )
    return position


@router.post("/sync/{exchange}", response_model=List[PositionResponse])
async def sync_positions(
    exchange: str, service: PositionService = Depends(get_position_service)
) -> List[PositionResponse]:
    """
    从交易所同步持仓数据

    Args:
        exchange: 交易所名称

    Returns:
        同步后的持仓列表
    """
    try:
        logger.info("api_sync_positions", exchange=exchange)
        return await service.sync_positions_from_exchange(exchange)
    except Exception as e:
        logger.error("sync_positions_failed", exchange=exchange, error=str(e))
        raise HTTPException(
            status_code=500, detail=f"Failed to sync positions: {e}"
        )
