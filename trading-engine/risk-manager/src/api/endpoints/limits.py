"""
风控限制 API 端点
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Annotated
import structlog

from src.models.schemas import (
    OrderValidationRequest,
    OrderValidationResponse,
    PositionCheckRequest,
    PositionCheckResponse,
    EmergencyStopRequest,
    EmergencyStopResponse,
    RiskLimitsConfig,
    RiskLimitsUpdateRequest
)
from src.services.risk_service import RiskService
from src.main import get_risk_service

logger = structlog.get_logger()

router = APIRouter()


@router.post("/validate-order", response_model=OrderValidationResponse)
async def validate_order(
    request: OrderValidationRequest,
    risk_service: Annotated[RiskService, Depends(get_risk_service)]
) -> OrderValidationResponse:
    """
    验证订单是否符合风控规则

    - **user_id**: 用户ID
    - **symbol**: 交易对
    - **side**: 买/卖方向
    - **quantity**: 数量
    - **price**: 价格
    - **order_type**: 订单类型 (limit/market)
    - **leverage**: 杠杆倍数 (可选)
    """
    try:
        return await risk_service.validate_order(request)
    except Exception as e:
        logger.error("validate_order_api_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Order validation failed: {str(e)}"
        )


@router.post("/check-position", response_model=PositionCheckResponse)
async def check_position(
    request: PositionCheckRequest,
    risk_service: Annotated[RiskService, Depends(get_risk_service)]
) -> PositionCheckResponse:
    """
    检查持仓风险状态

    - **user_id**: 用户ID
    - **symbol**: 交易对 (可选，不指定则检查所有持仓)
    """
    try:
        return await risk_service.check_position(request)
    except Exception as e:
        logger.error("check_position_api_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Position check failed: {str(e)}"
        )


@router.post("/emergency-stop", response_model=EmergencyStopResponse)
async def emergency_stop(
    request: EmergencyStopRequest,
    risk_service: Annotated[RiskService, Depends(get_risk_service)]
) -> EmergencyStopResponse:
    """
    触发紧急止损

    关闭所有持仓并取消所有挂单

    - **user_id**: 用户ID
    - **reason**: 止损原因
    - **force**: 是否强制执行 (跳过二次确认)
    """
    try:
        return await risk_service.emergency_stop(request)
    except Exception as e:
        logger.error("emergency_stop_api_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Emergency stop failed: {str(e)}"
        )


@router.get("/config", response_model=RiskLimitsConfig)
async def get_risk_limits(
    risk_service: Annotated[RiskService, Depends(get_risk_service)]
) -> RiskLimitsConfig:
    """
    获取当前风控限制配置

    返回所有风控参数的当前值
    """
    try:
        return await risk_service.get_risk_limits()
    except Exception as e:
        logger.error("get_risk_limits_api_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get risk limits: {str(e)}"
        )


@router.patch("/config", response_model=RiskLimitsConfig)
async def update_risk_limits(
    request: RiskLimitsUpdateRequest,
    risk_service: Annotated[RiskService, Depends(get_risk_service)]
) -> RiskLimitsConfig:
    """
    更新风控限制配置

    只更新提供的参数，未提供的参数保持不变

    **注意**: 此操作需要管理员权限
    """
    try:
        # TODO: 实现配置更新逻辑
        # 目前返回当前配置
        return await risk_service.get_risk_limits()
    except Exception as e:
        logger.error("update_risk_limits_api_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update risk limits: {str(e)}"
        )
