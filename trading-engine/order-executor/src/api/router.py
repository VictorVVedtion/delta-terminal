"""
API 路由聚合
"""
from fastapi import APIRouter

from .endpoints import orders, positions

api_router = APIRouter()

# 注册子路由
api_router.include_router(orders.router)
api_router.include_router(positions.router)
