"""
告警服务
"""
from typing import Optional, List
import structlog
import redis.asyncio as redis
from datetime import datetime
import json
import uuid
import httpx

from src.config import settings
from src.models.schemas import (
    RiskAlert,
    AlertType,
    RiskLevel,
    AlertCreateRequest,
    AlertListResponse
)

logger = structlog.get_logger()


class AlertService:
    """告警服务"""

    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.logger = logger.bind(service="alert")

    async def create_alert(
        self,
        user_id: str,
        alert_type: AlertType,
        risk_level: RiskLevel,
        message: str,
        details: dict = {}
    ) -> RiskAlert:
        """
        创建风险告警

        Args:
            user_id: 用户ID
            alert_type: 告警类型
            risk_level: 风险等级
            message: 告警消息
            details: 详细信息

        Returns:
            RiskAlert: 告警对象
        """
        try:
            alert_id = str(uuid.uuid4())
            alert = RiskAlert(
                alert_id=alert_id,
                user_id=user_id,
                alert_type=alert_type,
                risk_level=risk_level,
                message=message,
                details=details,
                timestamp=datetime.utcnow(),
                acknowledged=False
            )

            # 保存到 Redis
            alert_key = f"{settings.redis_prefix}alerts:{user_id}:{alert_id}"
            await self.redis.setex(
                alert_key,
                86400 * 7,  # 7天过期
                alert.model_dump_json()
            )

            # 添加到用户告警列表
            alerts_list_key = f"{settings.redis_prefix}alerts:list:{user_id}"
            await self.redis.zadd(
                alerts_list_key,
                {alert_id: datetime.utcnow().timestamp()}
            )
            await self.redis.expire(alerts_list_key, 86400 * 7)

            # 记录日志
            self.logger.info(
                "alert_created",
                alert_id=alert_id,
                user_id=user_id,
                alert_type=alert_type.value,
                risk_level=risk_level.value
            )

            # 发送告警通知
            await self._send_alert_notification(alert)

            return alert

        except Exception as e:
            self.logger.error("create_alert_error", error=str(e), user_id=user_id)
            raise

    async def get_alert(self, user_id: str, alert_id: str) -> Optional[RiskAlert]:
        """获取告警详情"""
        try:
            alert_key = f"{settings.redis_prefix}alerts:{user_id}:{alert_id}"
            alert_data = await self.redis.get(alert_key)

            if not alert_data:
                return None

            return RiskAlert.model_validate_json(alert_data)

        except Exception as e:
            self.logger.error("get_alert_error", error=str(e), user_id=user_id, alert_id=alert_id)
            return None

    async def list_alerts(
        self,
        user_id: str,
        page: int = 1,
        page_size: int = 20,
        acknowledged: Optional[bool] = None
    ) -> AlertListResponse:
        """
        获取告警列表

        Args:
            user_id: 用户ID
            page: 页码
            page_size: 每页数量
            acknowledged: 是否已确认 (None=全部)

        Returns:
            AlertListResponse: 告警列表
        """
        try:
            alerts_list_key = f"{settings.redis_prefix}alerts:list:{user_id}"

            # 获取总数
            total = await self.redis.zcard(alerts_list_key)

            # 计算分页
            start = (page - 1) * page_size
            end = start + page_size - 1

            # 获取告警ID列表（按时间倒序）
            alert_ids = await self.redis.zrevrange(alerts_list_key, start, end)

            # 获取告警详情
            alerts: List[RiskAlert] = []
            for alert_id in alert_ids:
                alert_id_str = alert_id.decode() if isinstance(alert_id, bytes) else alert_id
                alert = await self.get_alert(user_id, alert_id_str)

                if alert:
                    # 根据确认状态过滤
                    if acknowledged is None or alert.acknowledged == acknowledged:
                        alerts.append(alert)

            return AlertListResponse(
                alerts=alerts,
                total=total,
                page=page,
                page_size=page_size
            )

        except Exception as e:
            self.logger.error("list_alerts_error", error=str(e), user_id=user_id)
            return AlertListResponse(alerts=[], total=0, page=page, page_size=page_size)

    async def acknowledge_alert(self, user_id: str, alert_id: str) -> bool:
        """确认告警"""
        try:
            alert = await self.get_alert(user_id, alert_id)
            if not alert:
                return False

            alert.acknowledged = True
            alert.acknowledged_at = datetime.utcnow()

            # 更新 Redis
            alert_key = f"{settings.redis_prefix}alerts:{user_id}:{alert_id}"
            await self.redis.setex(
                alert_key,
                86400 * 7,
                alert.model_dump_json()
            )

            self.logger.info("alert_acknowledged", alert_id=alert_id, user_id=user_id)
            return True

        except Exception as e:
            self.logger.error("acknowledge_alert_error", error=str(e), user_id=user_id, alert_id=alert_id)
            return False

    async def get_active_alerts_count(self, user_id: str) -> int:
        """获取未确认告警数量"""
        try:
            alerts = await self.list_alerts(user_id, page_size=1000, acknowledged=False)
            return len(alerts.alerts)
        except Exception as e:
            self.logger.error("get_active_alerts_count_error", error=str(e), user_id=user_id)
            return 0

    async def _send_alert_notification(self, alert: RiskAlert) -> None:
        """发送告警通知"""
        try:
            # Webhook 通知
            if settings.alert_webhook_url:
                await self._send_webhook_notification(alert)

            # 其他通知方式可以在这里添加
            # - 邮件通知
            # - 短信通知
            # - 推送通知

        except Exception as e:
            self.logger.error("send_alert_notification_error", error=str(e), alert_id=alert.alert_id)

    async def _send_webhook_notification(self, alert: RiskAlert) -> None:
        """发送 Webhook 通知"""
        try:
            payload = {
                "alert_id": alert.alert_id,
                "user_id": alert.user_id,
                "alert_type": alert.alert_type.value,
                "risk_level": alert.risk_level.value,
                "message": alert.message,
                "details": alert.details,
                "timestamp": alert.timestamp.isoformat()
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    settings.alert_webhook_url,
                    json=payload,
                    timeout=5.0
                )
                response.raise_for_status()

            self.logger.info("webhook_notification_sent", alert_id=alert.alert_id)

        except Exception as e:
            self.logger.error("send_webhook_notification_error", error=str(e), alert_id=alert.alert_id)

    async def clear_old_alerts(self, user_id: str, days: int = 7) -> int:
        """清理旧告警"""
        try:
            cutoff_timestamp = (datetime.utcnow().timestamp()) - (days * 86400)
            alerts_list_key = f"{settings.redis_prefix}alerts:list:{user_id}"

            # 删除旧告警
            removed = await self.redis.zremrangebyscore(
                alerts_list_key,
                "-inf",
                cutoff_timestamp
            )

            self.logger.info("old_alerts_cleared", user_id=user_id, removed=removed)
            return removed

        except Exception as e:
            self.logger.error("clear_old_alerts_error", error=str(e), user_id=user_id)
            return 0
