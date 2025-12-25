"""
API 路由器
"""
from fastapi import APIRouter

from src.api.endpoints import limits, alerts, reports

api_router = APIRouter()

# 注册子路由
api_router.include_router(
    limits.router,
    prefix="/limits",
    tags=["Risk Limits"]
)

api_router.include_router(
    alerts.router,
    prefix="/alerts",
    tags=["Risk Alerts"]
)

api_router.include_router(
    reports.router,
    prefix="/reports",
    tags=["Risk Reports"]
)
