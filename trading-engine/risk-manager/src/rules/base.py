"""
风控规则基类
"""
from abc import ABC, abstractmethod
from typing import Any, Optional
import structlog

from src.models.schemas import RiskLevel

logger = structlog.get_logger()


class RiskRuleBase(ABC):
    """风控规则基类"""

    def __init__(self, rule_id: str, enabled: bool = True, priority: int = 1):
        self.rule_id = rule_id
        self.enabled = enabled
        self.priority = priority
        self.logger = logger.bind(rule_id=rule_id)

    @abstractmethod
    async def check(self, context: dict[str, Any]) -> tuple[bool, Optional[str], RiskLevel]:
        """
        检查规则

        Args:
            context: 检查上下文

        Returns:
            tuple: (是否通过, 拒绝原因, 风险等级)
        """
        pass

    @abstractmethod
    def get_rule_type(self) -> str:
        """获取规则类型"""
        pass

    async def pre_check(self, context: dict[str, Any]) -> bool:
        """预检查，验证上下文数据"""
        return True

    async def post_check(self, passed: bool, reason: Optional[str], context: dict[str, Any]) -> None:
        """检查后处理"""
        if not passed:
            self.logger.warning(
                "rule_check_failed",
                rule_type=self.get_rule_type(),
                reason=reason,
                context=context
            )

    async def execute_check(self, context: dict[str, Any]) -> tuple[bool, Optional[str], RiskLevel]:
        """
        执行完整检查流程

        Args:
            context: 检查上下文

        Returns:
            tuple: (是否通过, 拒绝原因, 风险等级)
        """
        if not self.enabled:
            return True, None, RiskLevel.LOW

        # 预检查
        if not await self.pre_check(context):
            return False, "Pre-check failed", RiskLevel.HIGH

        # 执行规则检查
        passed, reason, risk_level = await self.check(context)

        # 后处理
        await self.post_check(passed, reason, context)

        return passed, reason, risk_level

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(rule_id={self.rule_id}, enabled={self.enabled})"
