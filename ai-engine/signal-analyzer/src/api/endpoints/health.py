"""健康检查端点"""

from datetime import datetime

from fastapi import APIRouter, Depends
from loguru import logger

from ...config import Settings, get_settings
from ...models import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["health"])
async def health_check(settings: Settings = Depends(get_settings)) -> HealthResponse:
    """
    健康检查端点

    Returns:
        服务健康状态
    """
    logger.debug("健康检查请求")

    # 检查 Redis 连接（简化版，实际应测试连接）
    redis_connected = True  # TODO: 实际连接测试

    return HealthResponse(
        status="healthy",
        service=settings.service_name,
        version=settings.service_version,
        timestamp=datetime.now(),
        redis_connected=redis_connected,
    )
