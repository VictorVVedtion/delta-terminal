"""Exchange Connector 主应用"""
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from .config import settings
from .api.router import api_router
from .services.exchange_service import get_exchange_service
from .models.schemas import HealthCheck

# 配置日志
logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """应用生命周期管理"""
    # 启动
    logger.info("正在启动 Exchange Connector 服务...")

    try:
        # 初始化服务
        service = get_exchange_service()
        await service.initialize()

        logger.info(f"Exchange Connector 服务已启动: {settings.host}:{settings.port}")
        yield

    finally:
        # 关闭
        logger.info("正在关闭 Exchange Connector 服务...")

        service = get_exchange_service()
        await service.cleanup()

        logger.info("Exchange Connector 服务已关闭")


# 创建 FastAPI 应用
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Delta Terminal 交易所连接器服务 - 提供统一的交易所接口",
    lifespan=lifespan,
)

# CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 健康检查端点
@app.get("/health", response_model=HealthCheck)
async def health_check() -> HealthCheck:
    """
    健康检查

    Returns:
        健康状态
    """
    try:
        service = get_exchange_service()

        # 检查 Redis 连接
        redis_ok = False
        if service.redis_client:
            try:
                await service.redis_client.ping()
                redis_ok = True
            except Exception:
                redis_ok = False

        # 检查交易所连接
        # exchanges_status = {}
        # 这里可以遍历已连接的交易所，但为了简化，暂时返回空

        return HealthCheck(
            status="healthy" if redis_ok else "degraded",
            version=settings.app_version,
            timestamp=int(__import__('time').time() * 1000),
            exchanges={},
            redis=redis_ok,
        )

    except Exception as e:
        logger.error(f"健康检查失败: {e}")
        return HealthCheck(
            status="unhealthy",
            version=settings.app_version,
            timestamp=int(__import__('time').time() * 1000),
            exchanges={},
            redis=False,
        )


@app.get("/")
async def root() -> JSONResponse:
    """根路径"""
    return JSONResponse(content={
        "name": settings.app_name,
        "version": settings.app_version,
        "status": "running",
        "docs": "/docs",
        "health": "/health",
    })


# 注册 API 路由
app.include_router(api_router, prefix="/api/v1")


# 异常处理
@app.exception_handler(Exception)
async def global_exception_handler(request, exc: Exception) -> JSONResponse:
    """全局异常处理"""
    logger.error(f"未处理的异常: {exc}", exc_info=True)

    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": str(exc),
            "code": "INTERNAL_SERVER_ERROR",
        }
    )


def main() -> None:
    """启动应用"""
    uvicorn.run(
        "src.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.lower(),
    )


if __name__ == "__main__":
    main()
