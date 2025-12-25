"""
持仓限制规则
"""
from typing import Any, Optional
import structlog

from src.rules.base import RiskRuleBase
from src.models.schemas import RiskLevel
from src.config import settings

logger = structlog.get_logger()


class PositionLimitRule(RiskRuleBase):
    """持仓限制规则"""

    def __init__(
        self,
        rule_id: str = "position_limit",
        max_position_size_usdt: Optional[float] = None,
        max_total_position_usdt: Optional[float] = None,
        max_concentration: Optional[float] = None,
        enabled: bool = True,
        priority: int = 1
    ):
        super().__init__(rule_id, enabled, priority)
        self.max_position_size_usdt = max_position_size_usdt or settings.max_position_size_usdt
        self.max_total_position_usdt = max_total_position_usdt or settings.max_total_position_usdt
        self.max_concentration = max_concentration or settings.max_position_concentration

    def get_rule_type(self) -> str:
        return "position_limit"

    async def check(self, context: dict[str, Any]) -> tuple[bool, Optional[str], RiskLevel]:
        """
        检查持仓限制

        Context 应包含:
        - current_position_usdt: 当前币种持仓价值
        - total_position_usdt: 总持仓价值
        - new_order_value_usdt: 新订单价值
        - symbol: 交易对
        """
        try:
            current_position_usdt = context.get("current_position_usdt", 0.0)
            total_position_usdt = context.get("total_position_usdt", 0.0)
            new_order_value_usdt = context.get("new_order_value_usdt", 0.0)
            symbol = context.get("symbol", "UNKNOWN")

            # 计算新订单后的持仓
            new_position_usdt = current_position_usdt + new_order_value_usdt
            new_total_position_usdt = total_position_usdt + new_order_value_usdt

            # 检查单币种持仓限制
            if new_position_usdt > self.max_position_size_usdt:
                return (
                    False,
                    f"Position size limit exceeded for {symbol}. "
                    f"New: {new_position_usdt:.2f} USDT, "
                    f"Max: {self.max_position_size_usdt:.2f} USDT",
                    RiskLevel.HIGH
                )

            # 检查总持仓限制
            if new_total_position_usdt > self.max_total_position_usdt:
                return (
                    False,
                    f"Total position limit exceeded. "
                    f"New: {new_total_position_usdt:.2f} USDT, "
                    f"Max: {self.max_total_position_usdt:.2f} USDT",
                    RiskLevel.CRITICAL
                )

            # 检查持仓集中度
            if new_total_position_usdt > 0:
                concentration = new_position_usdt / new_total_position_usdt
                if concentration > self.max_concentration:
                    return (
                        False,
                        f"Position concentration too high for {symbol}. "
                        f"Concentration: {concentration:.2%}, "
                        f"Max: {self.max_concentration:.2%}",
                        RiskLevel.MEDIUM
                    )

            # 评估风险等级
            risk_level = self._evaluate_risk_level(
                new_position_usdt,
                new_total_position_usdt
            )

            return True, None, risk_level

        except Exception as e:
            logger.error("position_limit_check_error", error=str(e), context=context)
            return False, f"Position limit check error: {str(e)}", RiskLevel.HIGH

    def _evaluate_risk_level(
        self,
        position_usdt: float,
        total_position_usdt: float
    ) -> RiskLevel:
        """评估风险等级"""
        # 单币种持仓使用率
        position_utilization = position_usdt / self.max_position_size_usdt
        # 总持仓使用率
        total_utilization = total_position_usdt / self.max_total_position_usdt

        max_utilization = max(position_utilization, total_utilization)

        if max_utilization >= 0.9:
            return RiskLevel.HIGH
        elif max_utilization >= 0.7:
            return RiskLevel.MEDIUM
        else:
            return RiskLevel.LOW

    async def pre_check(self, context: dict[str, Any]) -> bool:
        """验证上下文数据"""
        required_fields = ["current_position_usdt", "total_position_usdt", "new_order_value_usdt"]
        for field in required_fields:
            if field not in context:
                logger.error(f"missing_context_field", field=field)
                return False
        return True
