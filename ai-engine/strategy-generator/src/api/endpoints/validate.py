"""
策略验证端点
"""

from fastapi import APIRouter, HTTPException
from loguru import logger

from ...models.schemas import StrategyValidateRequest, StrategyValidateResponse
from ...services.validator_service import StrategyValidatorService

router = APIRouter(prefix="/validate", tags=["策略验证"])

# 初始化服务
validator_service = StrategyValidatorService()


@router.post(
    "",
    response_model=StrategyValidateResponse,
    summary="验证交易策略",
    description="检查策略代码的语法、逻辑和风险控制",
)
async def validate_strategy(request: StrategyValidateRequest) -> StrategyValidateResponse:
    """
    验证交易策略

    Args:
        request: 策略验证请求

    Returns:
        策略验证响应

    Raises:
        HTTPException: 当验证过程失败时
    """
    try:
        logger.info("收到策略验证请求")
        response = await validator_service.validate_strategy(request)

        if not response.success:
            raise HTTPException(
                status_code=400,
                detail={"message": "策略验证失败", "issues": response.issues},
            )

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"策略验证异常: {str(e)}")
        raise HTTPException(status_code=500, detail=f"内部服务错误: {str(e)}")


@router.post(
    "/quick",
    response_model=StrategyValidateResponse,
    summary="快速验证",
    description="只进行基础的语法和风险检查",
)
async def quick_validate(strategy_code: str) -> StrategyValidateResponse:
    """
    快速验证策略（只检查语法和风险）

    Args:
        strategy_code: 策略代码

    Returns:
        策略验证响应
    """
    request = StrategyValidateRequest(
        strategy_code=strategy_code,
        check_syntax=True,
        check_logic=False,
        check_risk=True,
        check_performance=False,
    )

    return await validate_strategy(request)
