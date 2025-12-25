"""
回撤限制规则
"""
from typing import Any, Optional
import structlog

from src.rules.base import RiskRuleBase
from src.models.schemas import RiskLevel
from src.config import settings

logger = structlog.get_logger()


class DrawdownLimitRule(RiskRuleBase):
    """回撤限制规则"""

    def __init__(
        self,
        rule_id: str = "drawdown_limit",
        max_drawdown_percentage: Optional[float] = None,
        enabled: bool = True,
        priority: int = 1
    ):
        super().__init__(rule_id, enabled, priority)
        self.max_drawdown_percentage = max_drawdown_percentage or settings.max_drawdown_percentage

    def get_rule_type(self) -> str:
        return "drawdown_limit"

    async def check(self, context: dict[str, Any]) -> tuple[bool, Optional[str], RiskLevel]:
        """
        检查回撤限制

        Context 应包含:
        - current_equity: 当前权益 (USDT)
        - peak_equity: 峰值权益 (USDT)
        - user_id: 用户ID
        """
        try:
            current_equity = context.get("current_equity", 0.0)
            peak_equity = context.get("peak_equity", 0.0)
            user_id = context.get("user_id", "UNKNOWN")

            # 如果当前权益大于等于峰值，没有回撤
            if current_equity >= peak_equity:
                return True, None, RiskLevel.LOW

            # 计算回撤
            drawdown = peak_equity - current_equity
            drawdown_percentage = drawdown / peak_equity if peak_equity > 0 else 0.0

            # 检查回撤限制
            if drawdown_percentage >= self.max_drawdown_percentage:
                return (
                    False,
                    f"Maximum drawdown exceeded for user {user_id}. "
                    f"Drawdown: {drawdown_percentage:.2%}, "
                    f"Max: {self.max_drawdown_percentage:.2%}",
                    RiskLevel.CRITICAL
                )

            # 评估风险等级
            risk_level = self._evaluate_risk_level(drawdown_percentage)

            return True, None, risk_level

        except Exception as e:
            logger.error("drawdown_limit_check_error", error=str(e), context=context)
            return False, f"Drawdown limit check error: {str(e)}", RiskLevel.HIGH

    def _evaluate_risk_level(self, drawdown_percentage: float) -> RiskLevel:
        """评估风险等级"""
        utilization = drawdown_percentage / self.max_drawdown_percentage

        if utilization >= 0.9:
            return RiskLevel.CRITICAL
        elif utilization >= 0.7:
            return RiskLevel.HIGH
        elif utilization >= 0.5:
            return RiskLevel.MEDIUM
        else:
            return RiskLevel.LOW

    async def pre_check(self, context: dict[str, Any]) -> bool:
        """验证上下文数据"""
        required_fields = ["current_equity", "peak_equity"]
        for field in required_fields:
            if field not in context:
                logger.error(f"missing_context_field", field=field)
                return False
        return True
