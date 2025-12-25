"""FastAPI应用入口"""
from contextlib import asynccontextmanager
from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import sys

from src.config import settings
from src.api.router import api_router
from src.models.schemas import HealthResponse

# 配置日志
logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(settings.log_file)
    ]
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动
    logger.info("========================================")
    logger.info(f"{settings.app_name} v{settings.app_version}")
    logger.info("回测引擎启动中...")
    logger.info("========================================")

    # 创建必要的目录
    import os
    os.makedirs(settings.report_output_dir, exist_ok=True)
    os.makedirs(os.path.dirname(settings.log_file), exist_ok=True)

    yield

    # 关闭
    logger.info("回测引擎关闭")


# 创建FastAPI应用
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="高性能量化回测引擎 - 支持事件驱动、多品种、参数优化",
    lifespan=lifespan
)

# CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(api_router, prefix=settings.api_prefix)


# ========== 根路径 ==========

@app.get("/")
async def root():
    """根路径"""
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "status": "running",
        "timestamp": datetime.now().isoformat(),
        "docs": f"{settings.api_prefix}/docs"
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """健康检查"""
    return HealthResponse(
        status="healthy",
        service=settings.app_name,
        version=settings.app_version,
        timestamp=datetime.now()
    )


# ========== 启动函数 ==========

def start():
    """启动服务"""
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.lower()
    )


if __name__ == "__main__":
    start()
