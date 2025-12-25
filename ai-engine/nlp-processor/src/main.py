"""FastAPI 主应用入口"""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .api.router import api_router
from .config import settings
from .models.schemas import HealthResponse

# 配置日志
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """应用生命周期管理"""
    # 启动时
    logger.info("Starting NLP Processor Service...")
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"Claude Model: {settings.claude_model}")

    # 验证 API 密钥
    try:
        from .services.llm_service import llm_service

        is_valid = await llm_service.validate_api_key()
        if is_valid:
            logger.info("Anthropic API key validated successfully")
        else:
            logger.error("Anthropic API key validation failed")
    except Exception as e:
        logger.error(f"Error validating API key: {e}")

    yield

    # 关闭时
    logger.info("Shutting down NLP Processor Service...")


# 创建 FastAPI 应用
app = FastAPI(
    title="Delta Terminal NLP Processor",
    description="自然语言处理服务 - 策略解析与对话管理",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 健康检查端点
@app.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """健康检查"""
    return HealthResponse(
        status="healthy",
        version="0.1.0",
        dependencies={
            "anthropic": "ok",
            "langchain": "ok",
        },
    )


@app.get("/")
async def root() -> dict:
    """根路径"""
    return {
        "service": "Delta Terminal NLP Processor",
        "version": "0.1.0",
        "status": "running",
        "docs": "/docs",
    }


# 全局异常处理
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """全局异常处理器"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "内部服务器错误",
            "error": str(exc) if not settings.is_production else "服务器错误",
        },
    )


# 注册 API 路由
app.include_router(api_router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.api_reload,
        workers=settings.api_workers,
    )
