"""
策略优化端点
"""

from fastapi import APIRouter, HTTPException
from loguru import logger

from ...models.schemas import StrategyOptimizeRequest, StrategyOptimizeResponse
from ...services.optimizer_service import StrategyOptimizerService

router = APIRouter(prefix="/optimize", tags=["策略优化"])

# 初始化服务
optimizer_service = StrategyOptimizerService()


@router.post(
    "",
    response_model=StrategyOptimizeResponse,
    summary="优化交易策略",
    description="分析并优化现有交易策略的参数",
)
async def optimize_strategy(request: StrategyOptimizeRequest) -> StrategyOptimizeResponse:
    """
    优化交易策略

    Args:
        request: 策略优化请求

    Returns:
        策略优化响应

    Raises:
        HTTPException: 当优化失败时
    """
    try:
        logger.info(f"收到策略优化请求，目标: {request.optimization_goal}")
        response = await optimizer_service.optimize_strategy(request)

        if not response.success:
            raise HTTPException(
                status_code=400,
                detail={"message": "策略优化失败"},
            )

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"策略优化异常: {str(e)}")
        raise HTTPException(status_code=500, detail=f"内部服务错误: {str(e)}")
