"""
API 路由聚合
"""

from fastapi import APIRouter

from .endpoints import generate, optimize, validate

# 创建主路由
api_router = APIRouter()

# 注册子路由
api_router.include_router(generate.router)
api_router.include_router(optimize.router)
api_router.include_router(validate.router)
