"""FastAPI 主应用入口"""

# 首先加载环境变量 (如果文件存在)
from pathlib import Path
from dotenv import load_dotenv

# 加载 .env.local 和 .env (如果存在)
env_dir = Path(__file__).parent.parent
env_local = env_dir / ".env.local"
env_file = env_dir / ".env"

if env_local.exists():
    load_dotenv(env_local)
if env_file.exists():
    load_dotenv(env_file)

import logging
import sys
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .api.router import api_router
from .config import settings
from .models.schemas import HealthResponse

# 配置日志 - Railway 环境只用 stdout
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
    ]
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """应用生命周期管理"""
    # 启动时
    logger.info("========================================")
    logger.info(f"{settings.app_name} v{settings.app_version}")
    logger.info(f"监听端口: {settings.port}")
    logger.info(f"环境: {settings.environment}")
    logger.info(f"LLM 模型: {settings.llm_model}")
    logger.info("NLP Processor 启动中...")
    logger.info("========================================")

    # 验证 API 密钥 (仅在配置了密钥时)
    if settings.openrouter_api_key:
        try:
            from .services.llm_service import get_llm_service

            llm_service = get_llm_service()
            is_valid = await llm_service.validate_api_key()
            if is_valid:
                logger.info("OpenRouter API key validated successfully")
            else:
                logger.warning("OpenRouter API key validation failed")
        except Exception as e:
            logger.warning(f"Error validating API key: {e}")
    else:
        logger.warning("No OpenRouter API key configured")

    yield

    # 关闭时
    logger.info("NLP Processor 关闭")


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
            "openrouter": "ok",
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
