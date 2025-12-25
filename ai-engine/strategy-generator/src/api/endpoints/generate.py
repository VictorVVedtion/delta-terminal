"""
策略生成端点
"""

from fastapi import APIRouter, HTTPException
from loguru import logger

from ...models.schemas import StrategyGenerateRequest, StrategyGenerateResponse
from ...services.generator_service import StrategyGeneratorService

router = APIRouter(prefix="/generate", tags=["策略生成"])

# 初始化服务
generator_service = StrategyGeneratorService()


@router.post(
    "",
    response_model=StrategyGenerateResponse,
    summary="生成交易策略",
    description="基于自然语言描述生成交易策略代码",
)
async def generate_strategy(request: StrategyGenerateRequest) -> StrategyGenerateResponse:
    """
    生成交易策略

    Args:
        request: 策略生成请求

    Returns:
        策略生成响应

    Raises:
        HTTPException: 当生成失败时
    """
    try:
        logger.info(f"收到策略生成请求: {request.description[:50]}...")
        response = await generator_service.generate_strategy(request)

        if not response.success:
            raise HTTPException(
                status_code=400,
                detail={"message": "策略生成失败", "warnings": response.warnings},
            )

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"策略生成异常: {str(e)}")
        raise HTTPException(status_code=500, detail=f"内部服务错误: {str(e)}")


@router.post(
    "/quick",
    response_model=StrategyGenerateResponse,
    summary="快速生成策略",
    description="使用默认参数快速生成策略",
)
async def quick_generate(description: str, trading_pair: str = "BTC/USDT") -> StrategyGenerateResponse:
    """
    快速生成策略（使用默认参数）

    Args:
        description: 策略描述
        trading_pair: 交易对

    Returns:
        策略生成响应
    """
    request = StrategyGenerateRequest(
        description=description,
        trading_pair=trading_pair,
        timeframe="1h",
        initial_capital=10000.0,
        risk_per_trade=0.02,
        max_positions=1,
    )

    return await generate_strategy(request)
