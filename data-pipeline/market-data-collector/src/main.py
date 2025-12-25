"""
Market Data Collector 主应用
"""
import logging
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_client import make_asgi_app

from src.config import settings
from src.api.router import api_router
from src.services.data_service import data_service
from src.models.schemas import HealthCheck

# 配置日志
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时
    logger.info("启动 Market Data Collector 服务")
    try:
        await data_service.initialize()
        logger.info("数据服务初始化完成")
    except Exception as e:
        logger.error(f"数据服务初始化失败: {e}")
        raise

    yield

    # 关闭时
    logger.info("关闭 Market Data Collector 服务")
    await data_service.shutdown()


# 创建 FastAPI 应用
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Delta Terminal 市场数据采集服务",
    lifespan=lifespan,
)

# CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应限制来源
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 异常处理
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """全局异常处理"""
    logger.error(f"未处理的异常: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": str(exc) if settings.debug else "服务器内部错误",
            "timestamp": datetime.utcnow().isoformat(),
        },
    )


# 健康检查
@app.get("/health", response_model=HealthCheck, tags=["健康检查"])
async def health_check() -> HealthCheck:
    """
    健康检查端点

    返回服务状态和各组件健康状态
    """
    # 检查各服务健康状态
    redis_healthy = await data_service.redis_cache.health_check()
    timescale_healthy = data_service.timescale_storage.engine is not None

    all_healthy = redis_healthy and timescale_healthy

    return HealthCheck(
        status="healthy" if all_healthy else "degraded",
        timestamp=datetime.utcnow(),
        services={
            "redis": redis_healthy,
            "timescale": timescale_healthy,
        },
        version=settings.app_version,
    )


# 根路径
@app.get("/", tags=["根路径"])
async def root():
    """根路径信息"""
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "status": "running",
        "docs": "/docs",
        "health": "/health",
    }


# 注册 API 路由
app.include_router(api_router, prefix="/api/v1")


# Prometheus 监控端点
if settings.enable_metrics:
    metrics_app = make_asgi_app()
    app.mount("/metrics", metrics_app)


# 开发环境运行
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.lower(),
    )
