"""Prompt Guard Service

防止 Prompt 注入攻击的安全服务

检测模式:
- "Ignore previous instructions"
- "You are now..."
- "System prompt:"
- 角色扮演攻击
- 超长输入 (DoS)
"""

import logging
import re
from enum import Enum
from typing import Optional

from pydantic import BaseModel

logger = logging.getLogger(__name__)


class RiskLevel(str, Enum):
    """风险等级"""

    SAFE = "safe"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class PromptGuardResult(BaseModel):
    """Prompt Guard 检测结果"""

    is_safe: bool
    risk_level: RiskLevel
    matched_patterns: list[str] = []
    reason: Optional[str] = None
    sanitized_input: Optional[str] = None


class PromptGuard:
    """Prompt 注入检测器"""

    # 最大输入长度 (字符)
    MAX_INPUT_LENGTH = 4000

    # 高风险注入模式 (CRITICAL)
    CRITICAL_PATTERNS = [
        # 直接指令覆盖
        r"ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)",
        r"disregard\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)",
        r"forget\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)",
        # 系统提示词泄露
        r"(show|display|reveal|print)\s+(the\s+)?(system\s+)?(prompt|instructions?|rules?)",
        r"what\s+(is|are)\s+(your|the)\s+(system\s+)?(prompt|instructions?|rules?)",
        # 角色劫持
        r"you\s+are\s+now\s+(a|an)\s+\w+",
        r"act\s+as\s+(a|an)\s+\w+",
        r"pretend\s+to\s+be\s+(a|an)\s+\w+",
        r"simulate\s+(a|an)\s+\w+",
        # 开发者模式
        r"(enable|activate|turn\s+on)\s+(dev|developer|debug)\s+mode",
        r"sudo\s+(mode|access|command)",
        # 绕过安全检查
        r"(disable|turn\s+off|bypass)\s+(safety|security|filters?)",
        r"without\s+(safety|security|ethical)\s+(checks?|filters?|guidelines?)",
    ]

    # 中等风险模式 (HIGH)
    HIGH_PATTERNS = [
        # 重复指令 (强制执行)
        r"(repeat|say|echo|output)\s+exactly\s*:",
        r"always\s+(respond|reply|answer)\s+with",
        # 角色混淆
        r"as\s+(an?\s+)?(admin|administrator|developer|engineer|operator)",
        r"with\s+(admin|root|superuser|elevated)\s+(access|privileges?|permissions?)",
        # 输出控制
        r"(only|just)\s+(output|print|say|respond|reply)\s+\w+",
        r"do\s+not\s+(include|add|mention|say)\s+anything\s+else",
        # 格式化注入
        r"<\s*(script|iframe|object|embed)",
        r"javascript\s*:",
        r"on(click|load|error|mouse)\s*=",
        # SQL/命令注入片段
        r"(\bOR\b|\bAND\b)\s+\d+\s*[=<>]",
        r";\s*(DROP|DELETE|UPDATE|INSERT)\s+",
        r"(exec|execute)\s*\(",
    ]

    # 低风险模式 (MEDIUM)
    MEDIUM_PATTERNS = [
        # 敏感请求
        r"(can\s+you|could\s+you|will\s+you)\s+(ignore|forget|disregard)",
        r"(don't|do\s+not)\s+(follow|obey|use)\s+(the|your)\s+(rules?|guidelines?)",
        # 元提示
        r"(tell|show)\s+me\s+(your|the)\s+(prompt|instructions?)",
        r"how\s+(are|were)\s+you\s+(programmed|trained|instructed)",
        # 假装场景
        r"let's\s+pretend",
        r"imagine\s+(you|that)",
        r"in\s+a\s+(hypothetical|fictional)\s+(scenario|situation|world)",
    ]

    def __init__(self):
        """初始化 Prompt Guard"""
        # 编译正则表达式以提高性能
        self.critical_re = [re.compile(p, re.IGNORECASE) for p in self.CRITICAL_PATTERNS]
        self.high_re = [re.compile(p, re.IGNORECASE) for p in self.HIGH_PATTERNS]
        self.medium_re = [re.compile(p, re.IGNORECASE) for p in self.MEDIUM_PATTERNS]

    def check(self, user_input: str) -> PromptGuardResult:
        """
        检查用户输入是否包含 Prompt 注入攻击

        Args:
            user_input: 用户输入文本

        Returns:
            PromptGuardResult: 检测结果
        """
        if not user_input or not isinstance(user_input, str):
            return PromptGuardResult(
                is_safe=False,
                risk_level=RiskLevel.HIGH,
                reason="输入为空或类型无效",
            )

        # 检查长度 (防止 DoS)
        if len(user_input) > self.MAX_INPUT_LENGTH:
            return PromptGuardResult(
                is_safe=False,
                risk_level=RiskLevel.HIGH,
                reason=f"输入长度超过限制 ({len(user_input)} > {self.MAX_INPUT_LENGTH})",
            )

        matched_patterns = []
        risk_level = RiskLevel.SAFE
        reason = None

        # 检查 CRITICAL 模式
        for pattern in self.critical_re:
            if pattern.search(user_input):
                matched_patterns.append(pattern.pattern)
                risk_level = RiskLevel.CRITICAL
                reason = "检测到严重的 Prompt 注入攻击模式"
                logger.warning(f"CRITICAL injection detected: {pattern.pattern}")
                break

        # 如果没有 CRITICAL，检查 HIGH 模式
        if risk_level == RiskLevel.SAFE:
            for pattern in self.high_re:
                if pattern.search(user_input):
                    matched_patterns.append(pattern.pattern)
                    risk_level = RiskLevel.HIGH
                    reason = "检测到高风险的注入模式"
                    logger.warning(f"HIGH risk pattern detected: {pattern.pattern}")
                    break

        # 如果没有 HIGH，检查 MEDIUM 模式
        if risk_level == RiskLevel.SAFE:
            for pattern in self.medium_re:
                if pattern.search(user_input):
                    matched_patterns.append(pattern.pattern)
                    risk_level = RiskLevel.MEDIUM
                    reason = "检测到可疑的输入模式"
                    logger.info(f"MEDIUM risk pattern detected: {pattern.pattern}")
                    break

        # 额外检查: 过多的特殊字符 (可能是混淆攻击)
        if risk_level == RiskLevel.SAFE:
            special_char_ratio = sum(1 for c in user_input if not c.isalnum() and c not in " \n\t.,!?") / max(
                len(user_input), 1
            )
            if special_char_ratio > 0.3:  # 超过 30% 是特殊字符
                matched_patterns.append("high_special_char_ratio")
                risk_level = RiskLevel.MEDIUM
                reason = f"特殊字符比例过高 ({special_char_ratio:.1%})"
                logger.info(f"High special character ratio: {special_char_ratio:.1%}")

        # 判定是否安全
        is_safe = risk_level in (RiskLevel.SAFE, RiskLevel.LOW)

        return PromptGuardResult(
            is_safe=is_safe,
            risk_level=risk_level,
            matched_patterns=matched_patterns,
            reason=reason,
            sanitized_input=self._sanitize_input(user_input) if not is_safe else None,
        )

    def _sanitize_input(self, user_input: str) -> str:
        """
        清理输入 (移除危险模式)

        Args:
            user_input: 原始输入

        Returns:
            清理后的输入
        """
        sanitized = user_input

        # 移除所有匹配的高危模式
        for pattern in self.critical_re + self.high_re:
            sanitized = pattern.sub("[已移除]", sanitized)

        # 移除多余空白
        sanitized = " ".join(sanitized.split())

        return sanitized


# 全局单例
_prompt_guard: Optional[PromptGuard] = None


def get_prompt_guard() -> PromptGuard:
    """
    获取 Prompt Guard 单例

    Returns:
        PromptGuard 实例
    """
    global _prompt_guard
    if _prompt_guard is None:
        _prompt_guard = PromptGuard()
    return _prompt_guard
