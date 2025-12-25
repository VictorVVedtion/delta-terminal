"""
盈亏监控器
"""
import asyncio
from typing import Optional
import structlog
import redis.asyncio as redis
from datetime import datetime, timedelta
import json

from src.config import settings
from src.models.schemas import PnLSnapshot, RiskLevel, AlertType
from src.services.alert_service import AlertService

logger = structlog.get_logger()


class PnLMonitor:
    """盈亏监控器"""

    def __init__(self, redis_client: redis.Redis, alert_service: AlertService):
        self.redis = redis_client
        self.alert_service = alert_service
        self.running = False
        self.check_interval = settings.pnl_check_interval_seconds
        self.logger = logger.bind(monitor="pnl")

    async def start(self) -> None:
        """启动监控"""
        if self.running:
            self.logger.warning("pnl_monitor_already_running")
            return

        self.running = True
        self.logger.info("pnl_monitor_started", interval=self.check_interval)

        # 启动监控循环
        asyncio.create_task(self._monitor_loop())

    async def stop(self) -> None:
        """停止监控"""
        self.running = False
        self.logger.info("pnl_monitor_stopped")

    async def _monitor_loop(self) -> None:
        """监控循环"""
        while self.running:
            try:
                await self._check_all_pnl()
                await asyncio.sleep(self.check_interval)
            except Exception as e:
                self.logger.error("pnl_monitor_error", error=str(e))
                await asyncio.sleep(self.check_interval)

    async def _check_all_pnl(self) -> None:
        """检查所有用户盈亏"""
        try:
            # 获取所有用户列表
            users_key = f"{settings.redis_prefix}users:*"
            user_keys = []

            async for key in self.redis.scan_iter(match=users_key):
                user_keys.append(key)

            # 检查每个用户的盈亏
            for user_key in user_keys:
                user_id = user_key.decode().split(":")[-1]
                await self._check_user_pnl(user_id)

        except Exception as e:
            self.logger.error("check_all_pnl_error", error=str(e))

    async def _check_user_pnl(self, user_id: str) -> None:
        """检查用户盈亏"""
        try:
            # 获取用户盈亏数据
            pnl_key = f"{settings.redis_prefix}pnl:{user_id}"
            pnl_data = await self.redis.get(pnl_key)

            if not pnl_data:
                return

            pnl_info = json.loads(pnl_data)

            # 提取关键指标
            daily_pnl = pnl_info.get("realized_pnl_today", 0.0)
            current_equity = pnl_info.get("equity", 0.0)
            peak_equity = pnl_info.get("peak_equity", current_equity)
            initial_equity = pnl_info.get("initial_equity", current_equity)

            # 计算回撤
            drawdown = peak_equity - current_equity if peak_equity > current_equity else 0.0
            drawdown_percentage = drawdown / peak_equity if peak_equity > 0 else 0.0

            # 检查日损失限制
            await self._check_daily_loss(user_id, daily_pnl, initial_equity)

            # 检查回撤限制
            await self._check_drawdown(user_id, drawdown, drawdown_percentage, peak_equity)

            # 检查连续亏损
            consecutive_losses = pnl_info.get("consecutive_losses", 0)
            await self._check_consecutive_losses(user_id, consecutive_losses)

            # 触发紧急止损检查
            if settings.emergency_stop_enabled:
                await self._check_emergency_stop(
                    user_id,
                    daily_pnl,
                    drawdown_percentage,
                    initial_equity
                )

            # 保存监控快照
            await self._save_snapshot(user_id, pnl_info, drawdown_percentage)

        except Exception as e:
            self.logger.error("check_user_pnl_error", user_id=user_id, error=str(e))

    async def _check_daily_loss(
        self,
        user_id: str,
        daily_pnl: float,
        initial_equity: float
    ) -> None:
        """检查日损失限制"""
        if daily_pnl >= 0:
            return

        daily_loss = abs(daily_pnl)
        daily_loss_percentage = daily_loss / initial_equity if initial_equity > 0 else 0.0

        # 检查绝对损失
        if daily_loss >= settings.max_daily_loss_usdt * 0.8:
            risk_level = RiskLevel.CRITICAL if daily_loss >= settings.max_daily_loss_usdt * 0.95 else RiskLevel.HIGH
            await self.alert_service.create_alert(
                user_id=user_id,
                alert_type=AlertType.DAILY_LOSS_LIMIT,
                risk_level=risk_level,
                message="Daily loss limit warning",
                details={
                    "daily_loss": daily_loss,
                    "limit": settings.max_daily_loss_usdt,
                    "utilization": daily_loss / settings.max_daily_loss_usdt
                }
            )

        # 检查百分比损失
        if daily_loss_percentage >= settings.max_daily_loss_percentage * 0.8:
            risk_level = RiskLevel.CRITICAL if daily_loss_percentage >= settings.max_daily_loss_percentage * 0.95 else RiskLevel.HIGH
            await self.alert_service.create_alert(
                user_id=user_id,
                alert_type=AlertType.DAILY_LOSS_LIMIT,
                risk_level=risk_level,
                message="Daily loss percentage warning",
                details={
                    "daily_loss_percentage": daily_loss_percentage,
                    "limit": settings.max_daily_loss_percentage,
                    "utilization": daily_loss_percentage / settings.max_daily_loss_percentage
                }
            )

    async def _check_drawdown(
        self,
        user_id: str,
        drawdown: float,
        drawdown_percentage: float,
        peak_equity: float
    ) -> None:
        """检查回撤限制"""
        if drawdown_percentage >= settings.max_drawdown_percentage * 0.7:
            risk_level = RiskLevel.CRITICAL if drawdown_percentage >= settings.max_drawdown_percentage * 0.9 else RiskLevel.HIGH
            await self.alert_service.create_alert(
                user_id=user_id,
                alert_type=AlertType.DRAWDOWN_LIMIT,
                risk_level=risk_level,
                message="Maximum drawdown warning",
                details={
                    "drawdown": drawdown,
                    "drawdown_percentage": drawdown_percentage,
                    "peak_equity": peak_equity,
                    "limit": settings.max_drawdown_percentage,
                    "utilization": drawdown_percentage / settings.max_drawdown_percentage
                }
            )

    async def _check_consecutive_losses(self, user_id: str, consecutive_losses: int) -> None:
        """检查连续亏损"""
        if consecutive_losses >= settings.max_consecutive_losses * 0.8:
            risk_level = RiskLevel.HIGH if consecutive_losses >= settings.max_consecutive_losses else RiskLevel.MEDIUM
            await self.alert_service.create_alert(
                user_id=user_id,
                alert_type=AlertType.CONSECUTIVE_LOSSES,
                risk_level=risk_level,
                message="Consecutive losses warning",
                details={
                    "consecutive_losses": consecutive_losses,
                    "limit": settings.max_consecutive_losses
                }
            )

    async def _check_emergency_stop(
        self,
        user_id: str,
        daily_pnl: float,
        drawdown_percentage: float,
        initial_equity: float
    ) -> None:
        """检查紧急止损条件"""
        should_stop = False
        reason = ""

        # 检查回撤阈值
        if drawdown_percentage >= settings.emergency_stop_drawdown:
            should_stop = True
            reason = f"Drawdown {drawdown_percentage:.2%} exceeded emergency threshold {settings.emergency_stop_drawdown:.2%}"

        # 检查日损失阈值
        if daily_pnl < 0 and abs(daily_pnl) >= settings.emergency_stop_daily_loss:
            should_stop = True
            reason = f"Daily loss {abs(daily_pnl):.2f} exceeded emergency threshold {settings.emergency_stop_daily_loss:.2f}"

        if should_stop:
            await self.alert_service.create_alert(
                user_id=user_id,
                alert_type=AlertType.EMERGENCY_STOP,
                risk_level=RiskLevel.CRITICAL,
                message="Emergency stop triggered",
                details={
                    "reason": reason,
                    "daily_pnl": daily_pnl,
                    "drawdown_percentage": drawdown_percentage,
                    "action_required": "immediate_position_closure"
                }
            )

            # 标记紧急止损状态
            emergency_key = f"{settings.redis_prefix}emergency_stop:{user_id}"
            await self.redis.setex(
                emergency_key,
                86400,  # 24小时
                json.dumps({
                    "timestamp": datetime.utcnow().isoformat(),
                    "reason": reason,
                    "daily_pnl": daily_pnl,
                    "drawdown_percentage": drawdown_percentage
                })
            )

    async def _save_snapshot(self, user_id: str, pnl_info: dict, drawdown_percentage: float) -> None:
        """保存盈亏快照"""
        try:
            snapshot_key = f"{settings.redis_prefix}snapshots:pnl:{user_id}"
            snapshot_data = {
                "timestamp": datetime.utcnow().isoformat(),
                "pnl_info": pnl_info,
                "drawdown_percentage": drawdown_percentage
            }
            await self.redis.setex(
                snapshot_key,
                3600,  # 1小时过期
                json.dumps(snapshot_data)
            )
        except Exception as e:
            self.logger.error("save_snapshot_error", user_id=user_id, error=str(e))

    async def get_current_pnl(self, user_id: str) -> Optional[dict]:
        """获取当前盈亏"""
        try:
            pnl_key = f"{settings.redis_prefix}pnl:{user_id}"
            pnl_data = await self.redis.get(pnl_key)

            if not pnl_data:
                return None

            return json.loads(pnl_data)

        except Exception as e:
            self.logger.error("get_current_pnl_error", user_id=user_id, error=str(e))
            return None
