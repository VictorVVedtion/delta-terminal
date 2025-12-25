"""
Order Executor - FastAPI 应用主入口
"""
import asyncio
from contextlib import asynccontextmanager
from typing import AsyncIterator

import structlog
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import make_asgi_app

from .config import settings
from .api.router import api_router
from .queue.order_queue import OrderQueue
from .services.order_service import OrderService
from .services.position_service import PositionService

# 配置结构化日志
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer() if settings.LOG_FORMAT == "json" else structlog.dev.ConsoleRenderer(),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """
    应用生命周期管理

    启动时初始化资源,关闭时清理资源
    """
    logger.info(
        "starting_order_executor",
        version=settings.APP_VERSION,
        environment="production" if not settings.DEBUG else "development",
    )

    # 初始化订单队列
    order_queue = OrderQueue(
        max_concurrent_orders=10,
        retry_delay=settings.RETRY_DELAY,
    )
    await order_queue.initialize()

    # 初始化服务
    order_service = OrderService(order_queue)
    position_service = PositionService(order_queue.executors)

    # 存储到应用状态
    app.state.order_queue = order_queue
    app.state.order_service = order_service
    app.state.position_service = position_service

    # 启动订单处理工作线程
    worker_task = asyncio.create_task(order_queue.start_workers(worker_count=3))

    logger.info("order_executor_started", workers=3)

    yield

    # 应用关闭时清理资源
    logger.info("shutting_down_order_executor")
    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        pass

    await order_queue.close()
    logger.info("order_executor_shutdown_complete")


# 创建 FastAPI 应用
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Delta Terminal 订单执行引擎 - 智能交易订单执行系统",
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.DEBUG else ["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册 API 路由
app.include_router(api_router, prefix="/api/v1")

# Prometheus 监控端点
if settings.METRICS_ENABLED:
    metrics_app = make_asgi_app()
    app.mount("/metrics", metrics_app)


@app.get("/")
async def root():
    """根端点"""
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
    }


@app.get("/health")
async def health_check():
    """健康检查端点"""
    try:
        # 检查队列状态
        queue_status = await app.state.order_queue.get_queue_status()

        return {
            "status": "healthy",
            "queue_health": queue_status.queue_health,
            "queue_stats": {
                "pending": queue_status.pending_count,
                "processing": queue_status.processing_count,
                "failed": queue_status.failed_count,
            },
        }
    except Exception as e:
        logger.error("health_check_failed", error=str(e))
        return {
            "status": "unhealthy",
            "error": str(e),
        }


def main() -> None:
    """主函数"""
    uvicorn.run(
        "src.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
        access_log=True,
    )


if __name__ == "__main__":
    main()
