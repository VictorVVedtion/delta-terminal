"""
风险服务
"""
from typing import List, Optional
import structlog
import redis.asyncio as redis
from datetime import datetime
import json
import httpx

from src.config import settings
from src.models.schemas import (
    OrderValidationRequest,
    OrderValidationResponse,
    PositionCheckRequest,
    PositionCheckResponse,
    RiskLevel,
    RiskReport,
    PositionRiskMetrics,
    PnLRiskMetrics,
    EmergencyStopRequest,
    EmergencyStopResponse,
    RiskLimitsConfig
)
from src.rules.position_limit import PositionLimitRule
from src.rules.order_size_limit import OrderSizeLimitRule
from src.rules.daily_loss_limit import DailyLossLimitRule
from src.rules.drawdown_limit import DrawdownLimitRule
from src.services.alert_service import AlertService

logger = structlog.get_logger()


class RiskService:
    """风险服务"""

    def __init__(self, redis_client: redis.Redis, alert_service: AlertService):
        self.redis = redis_client
        self.alert_service = alert_service
        self.logger = logger.bind(service="risk")

        # 初始化风控规则
        self.rules = [
            PositionLimitRule(),
            OrderSizeLimitRule(),
            DailyLossLimitRule(),
            DrawdownLimitRule()
        ]

    async def validate_order(self, request: OrderValidationRequest) -> OrderValidationResponse:
        """
        验证订单

        Args:
            request: 订单验证请求

        Returns:
            OrderValidationResponse: 验证结果
        """
        try:
            # 检查紧急止损状态
            emergency_key = f"{settings.redis_prefix}emergency_stop:{request.user_id}"
            if await self.redis.exists(emergency_key):
                return OrderValidationResponse(
                    valid=False,
                    rejected_reason="Trading suspended due to emergency stop",
                    risk_level=RiskLevel.CRITICAL,
                    warnings=["Account under emergency stop"]
                )

            # 获取用户数据
            positions = await self._get_user_positions(request.user_id)
            pnl_data = await self._get_user_pnl(request.user_id)

            # 计算订单价值
            order_value_usdt = request.quantity * request.price

            # 构建检查上下文
            context = await self._build_validation_context(
                request,
                order_value_usdt,
                positions,
                pnl_data
            )

            # 执行所有规则检查
            warnings: List[str] = []
            max_risk_level = RiskLevel.LOW

            for rule in self.rules:
                passed, reason, risk_level = await rule.execute_check(context)

                if not passed:
                    return OrderValidationResponse(
                        valid=False,
                        rejected_reason=reason,
                        risk_level=risk_level,
                        warnings=warnings
                    )

                # 记录警告
                if risk_level in [RiskLevel.MEDIUM, RiskLevel.HIGH]:
                    warnings.append(f"{rule.get_rule_type()}: {risk_level.value} risk")

                # 更新最大风险等级
                if risk_level.value in ["high", "critical"]:
                    max_risk_level = RiskLevel.HIGH
                elif risk_level == RiskLevel.MEDIUM and max_risk_level == RiskLevel.LOW:
                    max_risk_level = RiskLevel.MEDIUM

            return OrderValidationResponse(
                valid=True,
                risk_level=max_risk_level,
                warnings=warnings,
                metadata={
                    "order_value_usdt": order_value_usdt,
                    "checked_rules": len(self.rules)
                }
            )

        except Exception as e:
            self.logger.error("validate_order_error", error=str(e), user_id=request.user_id)
            return OrderValidationResponse(
                valid=False,
                rejected_reason=f"Validation error: {str(e)}",
                risk_level=RiskLevel.HIGH
            )

    async def check_position(self, request: PositionCheckRequest) -> PositionCheckResponse:
        """
        检查持仓风险

        Args:
            request: 持仓检查请求

        Returns:
            PositionCheckResponse: 检查结果
        """
        try:
            positions = await self._get_user_positions(request.user_id)

            # 计算总持仓价值
            total_position_usdt = 0.0
            for symbol, position in positions.items():
                if request.symbol and symbol != request.symbol:
                    continue
                total_position_usdt += position.get("position_value_usdt", 0.0)

            # 检查持仓限制
            violations: List[str] = []
            warnings: List[str] = []
            risk_level = RiskLevel.LOW

            # 检查总持仓
            position_utilization = total_position_usdt / settings.max_total_position_usdt

            if position_utilization >= 1.0:
                violations.append("Total position limit exceeded")
                risk_level = RiskLevel.CRITICAL
            elif position_utilization >= 0.9:
                warnings.append("Total position near limit (>90%)")
                risk_level = RiskLevel.HIGH
            elif position_utilization >= 0.7:
                warnings.append("Total position moderate (>70%)")
                risk_level = RiskLevel.MEDIUM

            return PositionCheckResponse(
                safe=len(violations) == 0,
                risk_level=risk_level,
                total_position_usdt=total_position_usdt,
                max_position_usdt=settings.max_total_position_usdt,
                position_utilization=position_utilization,
                violations=violations,
                warnings=warnings
            )

        except Exception as e:
            self.logger.error("check_position_error", error=str(e), user_id=request.user_id)
            return PositionCheckResponse(
                safe=False,
                risk_level=RiskLevel.HIGH,
                total_position_usdt=0.0,
                max_position_usdt=settings.max_total_position_usdt,
                position_utilization=0.0,
                violations=[f"Check error: {str(e)}"]
            )

    async def generate_risk_report(self, user_id: str) -> RiskReport:
        """
        生成风险报告

        Args:
            user_id: 用户ID

        Returns:
            RiskReport: 风险报告
        """
        try:
            # 获取数据
            positions = await self._get_user_positions(user_id)
            pnl_data = await self._get_user_pnl(user_id)

            # 计算持仓指标
            position_metrics = await self._calculate_position_metrics(positions)

            # 计算盈亏指标
            pnl_metrics = await self._calculate_pnl_metrics(pnl_data)

            # 获取活跃告警数
            active_alerts = await self.alert_service.get_active_alerts_count(user_id)

            # 检查违规
            violations: List[str] = []
            recommendations: List[str] = []
            risk_level = RiskLevel.LOW

            # 评估总体风险
            if position_metrics.position_utilization >= 0.9:
                violations.append("Position utilization critical")
                risk_level = RiskLevel.CRITICAL
            elif pnl_metrics.max_drawdown_percentage >= settings.max_drawdown_percentage * 0.9:
                violations.append("Drawdown near limit")
                risk_level = RiskLevel.HIGH

            # 生成建议
            if position_metrics.concentration_ratio > 0.5:
                recommendations.append("Consider diversifying positions")
            if pnl_metrics.win_rate < 0.4:
                recommendations.append("Review trading strategy - low win rate")

            report_id = f"report_{user_id}_{int(datetime.utcnow().timestamp())}"

            return RiskReport(
                report_id=report_id,
                user_id=user_id,
                timestamp=datetime.utcnow(),
                risk_level=risk_level,
                position_metrics=position_metrics,
                pnl_metrics=pnl_metrics,
                active_alerts=active_alerts,
                violations=violations,
                recommendations=recommendations
            )

        except Exception as e:
            self.logger.error("generate_risk_report_error", error=str(e), user_id=user_id)
            raise

    async def emergency_stop(self, request: EmergencyStopRequest) -> EmergencyStopResponse:
        """
        紧急止损

        Args:
            request: 紧急止损请求

        Returns:
            EmergencyStopResponse: 执行结果
        """
        try:
            self.logger.warning(
                "emergency_stop_triggered",
                user_id=request.user_id,
                reason=request.reason,
                force=request.force
            )

            # 设置紧急止损标记
            emergency_key = f"{settings.redis_prefix}emergency_stop:{request.user_id}"
            await self.redis.setex(
                emergency_key,
                86400,  # 24小时
                json.dumps({
                    "timestamp": datetime.utcnow().isoformat(),
                    "reason": request.reason,
                    "force": request.force
                })
            )

            # 调用 order-executor 关闭所有持仓
            closed_positions = await self._close_all_positions(request.user_id)

            # 调用 order-executor 取消所有挂单
            cancelled_orders = await self._cancel_all_orders(request.user_id)

            return EmergencyStopResponse(
                success=True,
                message=f"Emergency stop executed: {request.reason}",
                closed_positions=closed_positions,
                cancelled_orders=cancelled_orders,
                timestamp=datetime.utcnow()
            )

        except Exception as e:
            self.logger.error("emergency_stop_error", error=str(e), user_id=request.user_id)
            return EmergencyStopResponse(
                success=False,
                message=f"Emergency stop failed: {str(e)}",
                timestamp=datetime.utcnow()
            )

    async def get_risk_limits(self) -> RiskLimitsConfig:
        """获取风控限制配置"""
        return RiskLimitsConfig(
            max_position_size_usdt=settings.max_position_size_usdt,
            max_total_position_usdt=settings.max_total_position_usdt,
            max_order_size_usdt=settings.max_order_size_usdt,
            max_daily_loss_usdt=settings.max_daily_loss_usdt,
            max_drawdown_percentage=settings.max_drawdown_percentage,
            max_leverage=settings.max_leverage
        )

    async def _get_user_positions(self, user_id: str) -> dict:
        """获取用户持仓"""
        positions_key = f"{settings.redis_prefix}positions:{user_id}"
        positions_data = await self.redis.get(positions_key)
        return json.loads(positions_data) if positions_data else {}

    async def _get_user_pnl(self, user_id: str) -> dict:
        """获取用户盈亏"""
        pnl_key = f"{settings.redis_prefix}pnl:{user_id}"
        pnl_data = await self.redis.get(pnl_key)
        return json.loads(pnl_data) if pnl_data else {}

    async def _build_validation_context(
        self,
        request: OrderValidationRequest,
        order_value_usdt: float,
        positions: dict,
        pnl_data: dict
    ) -> dict:
        """构建验证上下文"""
        # 计算当前持仓
        current_position_usdt = positions.get(request.symbol, {}).get("position_value_usdt", 0.0)
        total_position_usdt = sum(p.get("position_value_usdt", 0.0) for p in positions.values())

        return {
            # 订单信息
            "symbol": request.symbol,
            "side": request.side.value,
            "order_value_usdt": order_value_usdt,
            "user_id": request.user_id,
            # 持仓信息
            "current_position_usdt": current_position_usdt,
            "total_position_usdt": total_position_usdt,
            "new_order_value_usdt": order_value_usdt,
            # 盈亏信息
            "daily_pnl": pnl_data.get("realized_pnl_today", 0.0),
            "initial_equity": pnl_data.get("initial_equity", 0.0),
            "current_equity": pnl_data.get("equity", 0.0),
            "peak_equity": pnl_data.get("peak_equity", 0.0)
        }

    async def _calculate_position_metrics(self, positions: dict) -> PositionRiskMetrics:
        """计算持仓风险指标"""
        total_position_usdt = 0.0
        max_position_symbol = None
        max_position_size = 0.0

        for symbol, position in positions.items():
            position_value = position.get("position_value_usdt", 0.0)
            total_position_usdt += position_value

            if position_value > max_position_size:
                max_position_size = position_value
                max_position_symbol = symbol

        concentration_ratio = max_position_size / total_position_usdt if total_position_usdt > 0 else 0.0

        return PositionRiskMetrics(
            total_position_usdt=total_position_usdt,
            max_position_usdt=settings.max_total_position_usdt,
            position_utilization=total_position_usdt / settings.max_total_position_usdt,
            largest_position_symbol=max_position_symbol,
            largest_position_size=max_position_size,
            concentration_ratio=concentration_ratio
        )

    async def _calculate_pnl_metrics(self, pnl_data: dict) -> PnLRiskMetrics:
        """计算盈亏风险指标"""
        daily_pnl = pnl_data.get("realized_pnl_today", 0.0)
        initial_equity = pnl_data.get("initial_equity", 0.0)
        current_equity = pnl_data.get("equity", 0.0)
        peak_equity = pnl_data.get("peak_equity", current_equity)

        daily_pnl_percentage = daily_pnl / initial_equity if initial_equity > 0 else 0.0

        max_drawdown = peak_equity - current_equity if peak_equity > current_equity else 0.0
        max_drawdown_percentage = max_drawdown / peak_equity if peak_equity > 0 else 0.0

        consecutive_losses = pnl_data.get("consecutive_losses", 0)
        total_trades = pnl_data.get("total_trades", 0)
        winning_trades = pnl_data.get("winning_trades", 0)
        win_rate = winning_trades / total_trades if total_trades > 0 else 0.0

        return PnLRiskMetrics(
            daily_pnl=daily_pnl,
            daily_pnl_percentage=daily_pnl_percentage,
            max_drawdown=max_drawdown,
            max_drawdown_percentage=max_drawdown_percentage,
            consecutive_losses=consecutive_losses,
            win_rate=win_rate
        )

    async def _close_all_positions(self, user_id: str) -> List[str]:
        """关闭所有持仓"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{settings.order_executor_url}/api/v1/positions/close-all",
                    json={"user_id": user_id},
                    timeout=30.0
                )
                response.raise_for_status()
                result = response.json()
                return result.get("closed_positions", [])
        except Exception as e:
            self.logger.error("close_all_positions_error", error=str(e), user_id=user_id)
            return []

    async def _cancel_all_orders(self, user_id: str) -> List[str]:
        """取消所有挂单"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{settings.order_executor_url}/api/v1/orders/cancel-all",
                    json={"user_id": user_id},
                    timeout=30.0
                )
                response.raise_for_status()
                result = response.json()
                return result.get("cancelled_orders", [])
        except Exception as e:
            self.logger.error("cancel_all_orders_error", error=str(e), user_id=user_id)
            return []
