"""
风控报告 API 端点
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Annotated
import structlog

from src.models.schemas import RiskReport
from src.services.risk_service import RiskService
from src.main import get_risk_service

logger = structlog.get_logger()

router = APIRouter()


@router.get("/{user_id}", response_model=RiskReport)
async def generate_risk_report(
    user_id: str,
    risk_service: Annotated[RiskService, Depends(get_risk_service)]
) -> RiskReport:
    """
    生成用户风险报告

    包含以下内容:
    - 持仓风险指标
    - 盈亏风险指标
    - 活跃告警数量
    - 风险违规项
    - 优化建议

    - **user_id**: 用户ID
    """
    try:
        return await risk_service.generate_risk_report(user_id)
    except Exception as e:
        logger.error("generate_risk_report_api_error", error=str(e), user_id=user_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate risk report: {str(e)}"
        )


@router.get("/{user_id}/summary")
async def get_risk_summary(
    user_id: str,
    risk_service: Annotated[RiskService, Depends(get_risk_service)]
) -> dict:
    """
    获取风险摘要

    快速概览用户的风险状态

    - **user_id**: 用户ID
    """
    try:
        report = await risk_service.generate_risk_report(user_id)

        return {
            "user_id": user_id,
            "risk_level": report.risk_level.value,
            "position_utilization": report.position_metrics.position_utilization,
            "daily_pnl": report.pnl_metrics.daily_pnl,
            "drawdown_percentage": report.pnl_metrics.max_drawdown_percentage,
            "active_alerts": report.active_alerts,
            "violations_count": len(report.violations),
            "timestamp": report.timestamp.isoformat()
        }
    except Exception as e:
        logger.error("get_risk_summary_api_error", error=str(e), user_id=user_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get risk summary: {str(e)}"
        )
