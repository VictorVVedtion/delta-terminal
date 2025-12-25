"""
持仓监控器
"""
import asyncio
from typing import Optional
import structlog
import redis.asyncio as redis
from datetime import datetime
import json

from src.config import settings
from src.models.schemas import PositionSnapshot, RiskLevel, AlertType
from src.services.alert_service import AlertService

logger = structlog.get_logger()


class PositionMonitor:
    """持仓监控器"""

    def __init__(self, redis_client: redis.Redis, alert_service: AlertService):
        self.redis = redis_client
        self.alert_service = alert_service
        self.running = False
        self.check_interval = settings.position_check_interval_seconds
        self.logger = logger.bind(monitor="position")

    async def start(self) -> None:
        """启动监控"""
        if self.running:
            self.logger.warning("position_monitor_already_running")
            return

        self.running = True
        self.logger.info("position_monitor_started", interval=self.check_interval)

        # 启动监控循环
        asyncio.create_task(self._monitor_loop())

    async def stop(self) -> None:
        """停止监控"""
        self.running = False
        self.logger.info("position_monitor_stopped")

    async def _monitor_loop(self) -> None:
        """监控循环"""
        while self.running:
            try:
                await self._check_all_positions()
                await asyncio.sleep(self.check_interval)
            except Exception as e:
                self.logger.error("position_monitor_error", error=str(e))
                await asyncio.sleep(self.check_interval)

    async def _check_all_positions(self) -> None:
        """检查所有持仓"""
        try:
            # 获取所有用户列表
            users_key = f"{settings.redis_prefix}users:*"
            user_keys = []

            async for key in self.redis.scan_iter(match=users_key):
                user_keys.append(key)

            # 检查每个用户的持仓
            for user_key in user_keys:
                user_id = user_key.decode().split(":")[-1]
                await self._check_user_positions(user_id)

        except Exception as e:
            self.logger.error("check_all_positions_error", error=str(e))

    async def _check_user_positions(self, user_id: str) -> None:
        """检查用户持仓"""
        try:
            # 获取用户持仓数据
            positions_key = f"{settings.redis_prefix}positions:{user_id}"
            positions_data = await self.redis.get(positions_key)

            if not positions_data:
                return

            positions = json.loads(positions_data)

            # 计算总持仓价值
            total_position_usdt = 0.0
            max_position_symbol = None
            max_position_value = 0.0

            for symbol, position in positions.items():
                position_value = position.get("position_value_usdt", 0.0)
                total_position_usdt += position_value

                if position_value > max_position_value:
                    max_position_value = position_value
                    max_position_symbol = symbol

            # 检查持仓限制
            await self._check_position_limits(
                user_id,
                total_position_usdt,
                max_position_symbol,
                max_position_value
            )

            # 检查持仓集中度
            if total_position_usdt > 0:
                concentration = max_position_value / total_position_usdt
                await self._check_concentration(
                    user_id,
                    max_position_symbol,
                    concentration
                )

            # 保存监控快照
            await self._save_snapshot(user_id, positions)

        except Exception as e:
            self.logger.error("check_user_positions_error", user_id=user_id, error=str(e))

    async def _check_position_limits(
        self,
        user_id: str,
        total_position_usdt: float,
        max_position_symbol: Optional[str],
        max_position_value: float
    ) -> None:
        """检查持仓限制"""
        # 检查单币种持仓限制
        if max_position_value > settings.max_position_size_usdt * 0.9:
            await self.alert_service.create_alert(
                user_id=user_id,
                alert_type=AlertType.POSITION_LIMIT,
                risk_level=RiskLevel.HIGH,
                message=f"Position size warning for {max_position_symbol}",
                details={
                    "symbol": max_position_symbol,
                    "position_value": max_position_value,
                    "limit": settings.max_position_size_usdt,
                    "utilization": max_position_value / settings.max_position_size_usdt
                }
            )

        # 检查总持仓限制
        if total_position_usdt > settings.max_total_position_usdt * 0.9:
            await self.alert_service.create_alert(
                user_id=user_id,
                alert_type=AlertType.POSITION_LIMIT,
                risk_level=RiskLevel.CRITICAL,
                message="Total position limit warning",
                details={
                    "total_position": total_position_usdt,
                    "limit": settings.max_total_position_usdt,
                    "utilization": total_position_usdt / settings.max_total_position_usdt
                }
            )

    async def _check_concentration(
        self,
        user_id: str,
        symbol: Optional[str],
        concentration: float
    ) -> None:
        """检查持仓集中度"""
        if concentration > settings.max_position_concentration * 0.9:
            await self.alert_service.create_alert(
                user_id=user_id,
                alert_type=AlertType.POSITION_LIMIT,
                risk_level=RiskLevel.MEDIUM,
                message=f"Position concentration warning for {symbol}",
                details={
                    "symbol": symbol,
                    "concentration": concentration,
                    "max_concentration": settings.max_position_concentration
                }
            )

    async def _save_snapshot(self, user_id: str, positions: dict) -> None:
        """保存持仓快照"""
        try:
            snapshot_key = f"{settings.redis_prefix}snapshots:position:{user_id}"
            snapshot_data = {
                "timestamp": datetime.utcnow().isoformat(),
                "positions": positions
            }
            await self.redis.setex(
                snapshot_key,
                3600,  # 1小时过期
                json.dumps(snapshot_data)
            )
        except Exception as e:
            self.logger.error("save_snapshot_error", user_id=user_id, error=str(e))

    async def get_current_positions(self, user_id: str) -> dict:
        """获取当前持仓"""
        try:
            positions_key = f"{settings.redis_prefix}positions:{user_id}"
            positions_data = await self.redis.get(positions_key)

            if not positions_data:
                return {}

            return json.loads(positions_data)

        except Exception as e:
            self.logger.error("get_current_positions_error", user_id=user_id, error=str(e))
            return {}
