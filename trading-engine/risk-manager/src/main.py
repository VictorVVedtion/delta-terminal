"""
Risk Manager 主应用
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import redis.asyncio as redis
import structlog
from datetime import datetime

from src.config import settings
from src.api.router import api_router
from src.models.schemas import HealthResponse
from src.services.risk_service import RiskService
from src.services.alert_service import AlertService
from src.monitors.position_monitor import PositionMonitor
from src.monitors.pnl_monitor import PnLMonitor

# 配置结构化日志
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ]
)

logger = structlog.get_logger()

# 全局变量
redis_client: redis.Redis = None
risk_service: RiskService = None
alert_service: AlertService = None
position_monitor: PositionMonitor = None
pnl_monitor: PnLMonitor = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动
    logger.info("risk_manager_starting", version=settings.app_version)

    # 初始化 Redis
    global redis_client, risk_service, alert_service, position_monitor, pnl_monitor

    redis_client = await redis.from_url(
        f"redis://{settings.redis_host}:{settings.redis_port}/{settings.redis_db}",
        password=settings.redis_password,
        encoding="utf-8",
        decode_responses=False
    )
    logger.info("redis_connected", host=settings.redis_host, port=settings.redis_port)

    # 初始化服务
    alert_service = AlertService(redis_client)
    risk_service = RiskService(redis_client, alert_service)
    logger.info("services_initialized")

    # 启动监控器
    position_monitor = PositionMonitor(redis_client, alert_service)
    pnl_monitor = PnLMonitor(redis_client, alert_service)

    await position_monitor.start()
    await pnl_monitor.start()
    logger.info("monitors_started")

    yield

    # 关闭
    logger.info("risk_manager_shutting_down")

    # 停止监控器
    if position_monitor:
        await position_monitor.stop()
    if pnl_monitor:
        await pnl_monitor.stop()

    # 关闭 Redis
    if redis_client:
        await redis_client.close()

    logger.info("risk_manager_shutdown_complete")


# 创建 FastAPI 应用
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Delta Terminal Risk Management Service",
    lifespan=lifespan
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=settings.cors_allow_methods,
    allow_headers=settings.cors_allow_headers,
)

# 注册路由
app.include_router(api_router, prefix=settings.api_prefix)


# 依赖注入
def get_redis_client() -> redis.Redis:
    """获取 Redis 客户端"""
    return redis_client


def get_risk_service() -> RiskService:
    """获取风险服务"""
    return risk_service


def get_alert_service() -> AlertService:
    """获取告警服务"""
    return alert_service


# 健康检查
@app.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """健康检查"""
    redis_connected = False
    try:
        await redis_client.ping()
        redis_connected = True
    except Exception:
        pass

    active_monitors = 0
    if position_monitor and position_monitor.running:
        active_monitors += 1
    if pnl_monitor and pnl_monitor.running:
        active_monitors += 1

    return HealthResponse(
        status="healthy" if redis_connected else "degraded",
        version=settings.app_version,
        timestamp=datetime.utcnow(),
        redis_connected=redis_connected,
        active_monitors=active_monitors
    )


@app.get("/")
async def root() -> dict:
    """根路径"""
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "status": "running",
        "docs_url": "/docs"
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.lower()
    )
