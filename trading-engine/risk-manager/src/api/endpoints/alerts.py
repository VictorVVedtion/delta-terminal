"""
风险告警 API 端点
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Annotated, Optional
import structlog

from src.models.schemas import (
    RiskAlert,
    AlertCreateRequest,
    AlertListResponse
)
from src.services.alert_service import AlertService
from src.main import get_alert_service

logger = structlog.get_logger()

router = APIRouter()


@router.post("/", response_model=RiskAlert, status_code=status.HTTP_201_CREATED)
async def create_alert(
    request: AlertCreateRequest,
    alert_service: Annotated[AlertService, Depends(get_alert_service)]
) -> RiskAlert:
    """
    创建风险告警

    - **user_id**: 用户ID
    - **alert_type**: 告警类型
    - **risk_level**: 风险等级
    - **message**: 告警消息
    - **details**: 详细信息 (可选)
    """
    try:
        return await alert_service.create_alert(
            user_id=request.user_id,
            alert_type=request.alert_type,
            risk_level=request.risk_level,
            message=request.message,
            details=request.details
        )
    except Exception as e:
        logger.error("create_alert_api_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create alert: {str(e)}"
        )


@router.get("/{user_id}", response_model=AlertListResponse)
async def list_alerts(
    user_id: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    acknowledged: Optional[bool] = Query(default=None),
    alert_service: Annotated[AlertService, Depends(get_alert_service)]
) -> AlertListResponse:
    """
    获取用户告警列表

    - **user_id**: 用户ID
    - **page**: 页码 (默认: 1)
    - **page_size**: 每页数量 (默认: 20, 最大: 100)
    - **acknowledged**: 筛选已确认/未确认 (可选)
    """
    try:
        return await alert_service.list_alerts(
            user_id=user_id,
            page=page,
            page_size=page_size,
            acknowledged=acknowledged
        )
    except Exception as e:
        logger.error("list_alerts_api_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list alerts: {str(e)}"
        )


@router.get("/{user_id}/{alert_id}", response_model=RiskAlert)
async def get_alert(
    user_id: str,
    alert_id: str,
    alert_service: Annotated[AlertService, Depends(get_alert_service)]
) -> RiskAlert:
    """
    获取告警详情

    - **user_id**: 用户ID
    - **alert_id**: 告警ID
    """
    try:
        alert = await alert_service.get_alert(user_id, alert_id)
        if not alert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Alert {alert_id} not found"
            )
        return alert
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_alert_api_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get alert: {str(e)}"
        )


@router.post("/{user_id}/{alert_id}/acknowledge")
async def acknowledge_alert(
    user_id: str,
    alert_id: str,
    alert_service: Annotated[AlertService, Depends(get_alert_service)]
) -> dict:
    """
    确认告警

    - **user_id**: 用户ID
    - **alert_id**: 告警ID
    """
    try:
        success = await alert_service.acknowledge_alert(user_id, alert_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Alert {alert_id} not found"
            )
        return {"message": "Alert acknowledged successfully", "alert_id": alert_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("acknowledge_alert_api_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to acknowledge alert: {str(e)}"
        )


@router.get("/{user_id}/stats/count")
async def get_active_alerts_count(
    user_id: str,
    alert_service: Annotated[AlertService, Depends(get_alert_service)]
) -> dict:
    """
    获取活跃告警数量

    - **user_id**: 用户ID
    """
    try:
        count = await alert_service.get_active_alerts_count(user_id)
        return {"user_id": user_id, "active_alerts": count}
    except Exception as e:
        logger.error("get_active_alerts_count_api_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get active alerts count: {str(e)}"
        )


@router.delete("/{user_id}/cleanup")
async def cleanup_old_alerts(
    user_id: str,
    days: int = Query(default=7, ge=1, le=30),
    alert_service: Annotated[AlertService, Depends(get_alert_service)]
) -> dict:
    """
    清理旧告警

    - **user_id**: 用户ID
    - **days**: 保留天数 (默认: 7天)
    """
    try:
        removed = await alert_service.clear_old_alerts(user_id, days)
        return {
            "message": "Old alerts cleaned up successfully",
            "removed_count": removed,
            "retention_days": days
        }
    except Exception as e:
        logger.error("cleanup_old_alerts_api_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cleanup old alerts: {str(e)}"
        )
