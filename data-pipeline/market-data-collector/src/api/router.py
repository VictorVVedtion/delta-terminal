"""
API 路由汇总
"""
from fastapi import APIRouter

from src.api.endpoints import data, subscriptions

# 创建主路由
api_router = APIRouter()

# 注册子路由
api_router.include_router(data.router)
api_router.include_router(subscriptions.router)
