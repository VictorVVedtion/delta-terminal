"""API 路由"""
from fastapi import APIRouter
from .endpoints import exchanges, markets, account

api_router = APIRouter()

# 注册所有端点
api_router.include_router(exchanges.router)
api_router.include_router(markets.router)
api_router.include_router(account.router)
