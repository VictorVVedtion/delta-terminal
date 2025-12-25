"""
订单大小限制规则
"""
from typing import Any, Optional
import structlog

from src.rules.base import RiskRuleBase
from src.models.schemas import RiskLevel
from src.config import settings

logger = structlog.get_logger()


class OrderSizeLimitRule(RiskRuleBase):
    """订单大小限制规则"""

    def __init__(
        self,
        rule_id: str = "order_size_limit",
        max_order_size_usdt: Optional[float] = None,
        min_order_size_usdt: Optional[float] = None,
        enabled: bool = True,
        priority: int = 2
    ):
        super().__init__(rule_id, enabled, priority)
        self.max_order_size_usdt = max_order_size_usdt or settings.max_order_size_usdt
        self.min_order_size_usdt = min_order_size_usdt or settings.min_order_size_usdt

    def get_rule_type(self) -> str:
        return "order_size_limit"

    async def check(self, context: dict[str, Any]) -> tuple[bool, Optional[str], RiskLevel]:
        """
        检查订单大小限制

        Context 应包含:
        - order_value_usdt: 订单价值 (USDT)
        - symbol: 交易对
        - side: 订单方向
        """
        try:
            order_value_usdt = context.get("order_value_usdt", 0.0)
            symbol = context.get("symbol", "UNKNOWN")
            side = context.get("side", "UNKNOWN")

            # 检查最小订单金额
            if order_value_usdt < self.min_order_size_usdt:
                return (
                    False,
                    f"Order size too small for {symbol}. "
                    f"Size: {order_value_usdt:.2f} USDT, "
                    f"Min: {self.min_order_size_usdt:.2f} USDT",
                    RiskLevel.LOW
                )

            # 检查最大订单金额
            if order_value_usdt > self.max_order_size_usdt:
                return (
                    False,
                    f"Order size too large for {symbol}. "
                    f"Size: {order_value_usdt:.2f} USDT, "
                    f"Max: {self.max_order_size_usdt:.2f} USDT",
                    RiskLevel.HIGH
                )

            # 评估风险等级
            risk_level = self._evaluate_risk_level(order_value_usdt)

            return True, None, risk_level

        except Exception as e:
            logger.error("order_size_limit_check_error", error=str(e), context=context)
            return False, f"Order size limit check error: {str(e)}", RiskLevel.HIGH

    def _evaluate_risk_level(self, order_value_usdt: float) -> RiskLevel:
        """评估风险等级"""
        utilization = order_value_usdt / self.max_order_size_usdt

        if utilization >= 0.8:
            return RiskLevel.HIGH
        elif utilization >= 0.5:
            return RiskLevel.MEDIUM
        else:
            return RiskLevel.LOW

    async def pre_check(self, context: dict[str, Any]) -> bool:
        """验证上下文数据"""
        if "order_value_usdt" not in context:
            logger.error("missing_context_field", field="order_value_usdt")
            return False
        return True
