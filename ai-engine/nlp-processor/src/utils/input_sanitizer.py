"""输入清理和验证工具

防御 Prompt Injection 攻击和其他安全威胁
"""

import re
import logging
from typing import Tuple, List, Optional

logger = logging.getLogger(__name__)


# ============================================================================
# Prompt Injection 检测模式
# ============================================================================

# 常见的 Prompt Injection 攻击模式
PROMPT_INJECTION_PATTERNS = [
    # 角色劫持
    r"(?i)(ignore|disregard|forget)\s+(previous|all|above|prior)\s+(instructions|prompts|rules|directives)",
    r"(?i)you\s+are\s+(now|no\s+longer|not)\s+",
    r"(?i)act\s+as\s+(a\s+)?(developer|admin|system|god|sudo)",
    r"(?i)from\s+now\s+on",

    # 系统提示词泄露
    r"(?i)(show|reveal|display|print|output)\s+(your\s+)?(system\s+)?(prompt|instructions|rules|directives)",
    r"(?i)what\s+(are|is)\s+your\s+(initial|original|system)\s+(prompt|instructions)",

    # 越权命令
    r"(?i)(execute|run|eval)\s+(this|following|code|command|script)",
    r"(?i)(sudo|admin|root)\s+(mode|access|privileges)",
    r"(?i)\<\s*(script|iframe|img|svg|object|embed)",  # HTML 注入

    # 对话重置/覆盖
    r"(?i)(reset|clear|delete|override)\s+(conversation|context|memory|history)",
    r"(?i)start\s+(new|fresh)\s+(conversation|session)",

    # 信息泄露
    r"(?i)(tell|show|give)\s+me\s+(your\s+)?(api\s+key|secret|password|token|credentials)",
    r"(?i)bypass\s+(security|validation|check|filter)",
]

# 可疑的特殊字符序列
SUSPICIOUS_CHAR_PATTERNS = [
    r"[{}\[\]]{5,}",  # 过多的大括号/方括号
    r"[<>]{3,}",      # 过多的尖括号
    r"[\|\&\;]{3,}",  # 过多的管道符/分号
    r"[\$\@\#]{5,}",  # 过多的特殊符号
]

# 编码混淆检测
ENCODING_OBFUSCATION_PATTERNS = [
    r"\\x[0-9a-fA-F]{2}",     # 十六进制编码
    r"\\u[0-9a-fA-F]{4}",     # Unicode 编码
    r"%[0-9a-fA-F]{2}",       # URL 编码
    r"&#\d{2,4};",            # HTML 实体编码
]


# ============================================================================
# 输入验证规则
# ============================================================================

class InputValidationError(Exception):
    """输入验证失败异常"""
    pass


def sanitize_user_input(
    text: str,
    max_length: int = 2000,
    allow_special_chars: bool = True,
    strict_mode: bool = False,
) -> Tuple[str, List[str]]:
    """
    清理和验证用户输入

    Args:
        text: 用户输入文本
        max_length: 最大长度限制
        allow_special_chars: 是否允许特殊字符
        strict_mode: 严格模式（更严格的检测）

    Returns:
        (cleaned_text, warnings) - 清理后的文本和警告列表

    Raises:
        InputValidationError: 如果输入包含危险内容
    """
    warnings: List[str] = []

    # 基本验证
    if not text or not isinstance(text, str):
        raise InputValidationError("输入不能为空")

    # 长度检查
    if len(text) > max_length:
        raise InputValidationError(f"输入长度超过限制 ({max_length} 字符)")

    # 去除首尾空白
    cleaned = text.strip()

    # ========================================================================
    # Prompt Injection 检测
    # ========================================================================
    for pattern in PROMPT_INJECTION_PATTERNS:
        if re.search(pattern, cleaned, re.IGNORECASE | re.MULTILINE):
            logger.warning(f"检测到可疑的 Prompt Injection 模式: {pattern}")
            if strict_mode:
                raise InputValidationError("输入包含不允许的内容")
            warnings.append("输入包含可疑模式，已记录")

    # ========================================================================
    # 特殊字符检测
    # ========================================================================
    for pattern in SUSPICIOUS_CHAR_PATTERNS:
        if re.search(pattern, cleaned):
            logger.warning(f"检测到可疑的字符序列: {pattern}")
            if strict_mode:
                raise InputValidationError("输入包含异常字符序列")
            warnings.append("输入包含异常字符")

    # ========================================================================
    # 编码混淆检测
    # ========================================================================
    obfuscation_count = 0
    for pattern in ENCODING_OBFUSCATION_PATTERNS:
        matches = re.findall(pattern, cleaned)
        obfuscation_count += len(matches)

    if obfuscation_count > 5:  # 允许少量编码字符
        logger.warning(f"检测到过多的编码字符: {obfuscation_count} 个")
        if strict_mode:
            raise InputValidationError("输入包含可疑的编码混淆")
        warnings.append("输入包含编码字符")

    # ========================================================================
    # 清理处理
    # ========================================================================
    if not allow_special_chars:
        # 移除非字母数字和常见标点符号以外的字符
        cleaned = re.sub(r'[^\w\s\-_.,!?()/@:;\'\"]+', '', cleaned, flags=re.UNICODE)

    # 标准化空白字符
    cleaned = re.sub(r'\s+', ' ', cleaned)

    # 移除控制字符
    cleaned = re.sub(r'[\x00-\x1F\x7F-\x9F]', '', cleaned)

    return cleaned, warnings


def validate_trading_pair(symbol: str) -> str:
    """
    验证交易对格式

    Args:
        symbol: 交易对字符串 (如 "BTC/USDT")

    Returns:
        标准化的交易对

    Raises:
        InputValidationError: 格式无效
    """
    # 标准化格式
    symbol = symbol.strip().upper()

    # 验证格式: BASE/QUOTE
    pattern = r'^[A-Z0-9]{2,10}/[A-Z]{3,10}$'
    if not re.match(pattern, symbol):
        raise InputValidationError(
            f"交易对格式无效: {symbol}. 期望格式: BTC/USDT"
        )

    return symbol


def validate_strategy_name(name: str) -> str:
    """
    验证策略名称

    Args:
        name: 策略名称

    Returns:
        清理后的策略名称

    Raises:
        InputValidationError: 名称无效
    """
    name = name.strip()

    if len(name) < 1:
        raise InputValidationError("策略名称不能为空")

    if len(name) > 100:
        raise InputValidationError("策略名称过长 (最多 100 字符)")

    # 移除危险字符
    cleaned = re.sub(r'[<>{}[\]\\]', '', name)

    return cleaned


def detect_prompt_injection_risk(text: str) -> Tuple[bool, Optional[str]]:
    """
    检测 Prompt Injection 风险

    Args:
        text: 待检测文本

    Returns:
        (is_risky, reason) - 是否有风险及原因
    """
    for pattern in PROMPT_INJECTION_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
        if match:
            return True, f"匹配到风险模式: {match.group(0)}"

    # 检查异常长度的单个词
    words = text.split()
    for word in words:
        if len(word) > 200:  # 单个词过长可能是混淆攻击
            return True, f"检测到异常长度的词: {word[:50]}..."

    return False, None


def sanitize_for_llm(text: str, context: str = "user_input") -> str:
    """
    为 LLM 调用准备安全的输入

    在发送给 LLM 之前进行最后的清理和包装

    Args:
        text: 用户输入
        context: 上下文标识

    Returns:
        清理后的安全输入
    """
    # 检测风险
    is_risky, reason = detect_prompt_injection_risk(text)
    if is_risky:
        logger.warning(f"[{context}] Prompt Injection 风险: {reason}")
        # 记录但不阻止（LLM 本身也有防御能力）

    # 转义特殊标记
    cleaned = text.replace("```", "'''")  # 防止代码块逃逸
    cleaned = cleaned.replace("<|", "")   # 防止特殊标记
    cleaned = cleaned.replace("|>", "")

    # 限制连续重复字符
    cleaned = re.sub(r'(.)\1{10,}', r'\1' * 5, cleaned)

    return cleaned


# ============================================================================
# 速率限制和滥用检测
# ============================================================================

class InputAbuseDetector:
    """输入滥用检测器"""

    def __init__(self):
        self.user_input_history: dict = {}  # user_id -> [inputs]
        self.max_history = 10

    def check_repetition(self, user_id: str, text: str) -> bool:
        """
        检查用户是否重复发送相同内容

        Args:
            user_id: 用户 ID
            text: 输入文本

        Returns:
            是否检测到滥用
        """
        if user_id not in self.user_input_history:
            self.user_input_history[user_id] = []

        history = self.user_input_history[user_id]

        # 检查是否与最近的输入重复
        if text in history[-3:]:  # 最近 3 条
            logger.warning(f"用户 {user_id} 重复发送相同内容")
            return True

        # 更新历史
        history.append(text)
        if len(history) > self.max_history:
            history.pop(0)

        return False


# 全局滥用检测器实例
_abuse_detector = InputAbuseDetector()


def check_input_abuse(user_id: str, text: str) -> bool:
    """检查输入滥用"""
    return _abuse_detector.check_repetition(user_id, text)
