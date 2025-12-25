"""API路由聚合"""
from fastapi import APIRouter

from src.api.endpoints import backtest, reports

api_router = APIRouter()

# 注册子路由
api_router.include_router(backtest.router)
api_router.include_router(reports.router)
