"""
FastAPI 应用主入口
"""

from contextlib import asynccontextmanager
from datetime import datetime
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger

from .config import settings
from .models.schemas import HealthResponse
from .api.router import api_router


# 生命周期管理
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """应用生命周期管理"""
    # 启动时
    logger.info("=" * 60)
    logger.info(f"{settings.app_name} v{settings.app_version} 正在启动...")
    logger.info(f"使用AI模型: {settings.ai_model}")
    logger.info(f"API前缀: {settings.api_prefix}")
    logger.info(f"调试模式: {settings.debug}")
    logger.info("=" * 60)

    yield

    # 关闭时
    logger.info(f"{settings.app_name} 正在关闭...")


# 创建FastAPI应用
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Delta Terminal AI策略生成服务 - 基于自然语言生成交易策略",
    lifespan=lifespan,
    docs_url=f"{settings.api_prefix}/docs",
    redoc_url=f"{settings.api_prefix}/redoc",
    openapi_url=f"{settings.api_prefix}/openapi.json",
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 全局异常处理
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """全局异常处理器"""
    logger.error(f"未处理的异常: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "内部服务错误",
            "detail": str(exc) if settings.debug else "请联系管理员",
        },
    )


# 注册API路由
app.include_router(api_router, prefix=settings.api_prefix)


# 根路径
@app.get("/", include_in_schema=False)
async def root():
    """根路径"""
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "status": "running",
        "docs": f"{settings.api_prefix}/docs",
    }


# 健康检查
@app.get(
    f"{settings.api_prefix}/health",
    response_model=HealthResponse,
    tags=["系统"],
    summary="健康检查",
)
async def health_check() -> HealthResponse:
    """
    健康检查端点

    Returns:
        服务健康状态
    """
    # 检查AI服务可用性
    ai_available = bool(settings.anthropic_api_key)

    status = "healthy" if ai_available else "degraded"

    return HealthResponse(
        status=status,
        version=settings.app_version,
        ai_model=settings.ai_model,
        timestamp=datetime.now(),
        details={
            "ai_service": "available" if ai_available else "unavailable",
            "debug_mode": settings.debug,
        },
    )


# 配置日志
logger.remove()  # 移除默认处理器
logger.add(
    lambda msg: print(msg, end=""),
    format=settings.log_format,
    level=settings.log_level,
    colorize=True,
)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.lower(),
    )
