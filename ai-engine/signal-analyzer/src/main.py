"""Signal Analyzer 主应用"""

import sys
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from .api.endpoints import health, signals
from .config import get_settings

settings = get_settings()


# 配置日志
logger.remove()
logger.add(
    sys.stderr,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level=settings.log_level,
)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """应用生命周期管理"""
    # 启动时执行
    logger.info(f"启动 {settings.service_name} v{settings.service_version}")
    logger.info(f"服务端口: {settings.port}")
    logger.info(f"日志级别: {settings.log_level}")

    # TODO: 初始化 Redis 连接
    # TODO: 预加载模型/数据

    yield

    # 关闭时执行
    logger.info(f"关闭 {settings.service_name}")
    # TODO: 清理资源


# 创建 FastAPI 应用
app = FastAPI(
    title="Signal Analyzer API",
    description="Delta Terminal - 技术指标计算与交易信号生成",
    version=settings.service_version,
    lifespan=lifespan,
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应限制具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(health.router)
app.include_router(signals.router)


@app.get("/")
async def root() -> dict[str, str]:
    """根路径"""
    return {
        "service": settings.service_name,
        "version": settings.service_version,
        "status": "running",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=True,
        log_level=settings.log_level.lower(),
    )
