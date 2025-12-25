"""
日损失限制规则
"""
from typing import Any, Optional
import structlog

from src.rules.base import RiskRuleBase
from src.models.schemas import RiskLevel
from src.config import settings

logger = structlog.get_logger()


class DailyLossLimitRule(RiskRuleBase):
    """日损失限制规则"""

    def __init__(
        self,
        rule_id: str = "daily_loss_limit",
        max_daily_loss_usdt: Optional[float] = None,
        max_daily_loss_percentage: Optional[float] = None,
        enabled: bool = True,
        priority: int = 1
    ):
        super().__init__(rule_id, enabled, priority)
        self.max_daily_loss_usdt = max_daily_loss_usdt or settings.max_daily_loss_usdt
        self.max_daily_loss_percentage = max_daily_loss_percentage or settings.max_daily_loss_percentage

    def get_rule_type(self) -> str:
        return "daily_loss_limit"

    async def check(self, context: dict[str, Any]) -> tuple[bool, Optional[str], RiskLevel]:
        """
        检查日损失限制

        Context 应包含:
        - daily_pnl: 当日盈亏 (USDT)
        - initial_equity: 初始权益 (USDT)
        - user_id: 用户ID
        """
        try:
            daily_pnl = context.get("daily_pnl", 0.0)
            initial_equity = context.get("initial_equity", 0.0)
            user_id = context.get("user_id", "UNKNOWN")

            # 如果是盈利，直接通过
            if daily_pnl >= 0:
                return True, None, RiskLevel.LOW

            # 计算损失金额和百分比
            daily_loss = abs(daily_pnl)
            daily_loss_percentage = daily_loss / initial_equity if initial_equity > 0 else 0.0

            # 检查绝对损失限制
            if daily_loss >= self.max_daily_loss_usdt:
                return (
                    False,
                    f"Daily loss limit exceeded for user {user_id}. "
                    f"Loss: {daily_loss:.2f} USDT, "
                    f"Max: {self.max_daily_loss_usdt:.2f} USDT",
                    RiskLevel.CRITICAL
                )

            # 检查百分比损失限制
            if daily_loss_percentage >= self.max_daily_loss_percentage:
                return (
                    False,
                    f"Daily loss percentage limit exceeded for user {user_id}. "
                    f"Loss: {daily_loss_percentage:.2%}, "
                    f"Max: {self.max_daily_loss_percentage:.2%}",
                    RiskLevel.CRITICAL
                )

            # 评估风险等级
            risk_level = self._evaluate_risk_level(daily_loss, daily_loss_percentage)

            return True, None, risk_level

        except Exception as e:
            logger.error("daily_loss_limit_check_error", error=str(e), context=context)
            return False, f"Daily loss limit check error: {str(e)}", RiskLevel.HIGH

    def _evaluate_risk_level(self, daily_loss: float, daily_loss_percentage: float) -> RiskLevel:
        """评估风险等级"""
        # 计算损失使用率
        loss_utilization_absolute = daily_loss / self.max_daily_loss_usdt
        loss_utilization_percentage = daily_loss_percentage / self.max_daily_loss_percentage

        max_utilization = max(loss_utilization_absolute, loss_utilization_percentage)

        if max_utilization >= 0.9:
            return RiskLevel.CRITICAL
        elif max_utilization >= 0.7:
            return RiskLevel.HIGH
        elif max_utilization >= 0.5:
            return RiskLevel.MEDIUM
        else:
            return RiskLevel.LOW

    async def pre_check(self, context: dict[str, Any]) -> bool:
        """验证上下文数据"""
        required_fields = ["daily_pnl", "initial_equity"]
        for field in required_fields:
            if field not in context:
                logger.error(f"missing_context_field", field=field)
                return False
        return True
