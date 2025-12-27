"""API 路由聚合"""

from fastapi import APIRouter

from .endpoints import chat, insight, parse

# 创建主路由
api_router = APIRouter(prefix="/api/v1")

# 注册子路由
api_router.include_router(chat.router)
api_router.include_router(parse.router)
api_router.include_router(insight.router)
