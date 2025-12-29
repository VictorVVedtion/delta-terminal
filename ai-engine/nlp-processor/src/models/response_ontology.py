"""
用户回复本体论 (Response Ontology)

使用本体论方法组织用户回复的语义分类，
而不是简单枚举关键词，实现更精准的意图识别。

本体结构:
UserResponse (顶层)
├── Affirmative (肯定类) → 触发确认行为
├── Negative (否定类) → 触发拒绝/重新开始
├── Inquiry (询问类) → 保持当前意图，补充信息
└── Action (行动类) → 触发具体操作
"""

from enum import Enum
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass


# =============================================================================
# 本体类别定义
# =============================================================================

class ResponseCategory(str, Enum):
    """回复大类"""
    AFFIRMATIVE = "affirmative"      # 肯定类
    NEGATIVE = "negative"            # 否定类
    INQUIRY = "inquiry"              # 询问类
    ACTION = "action"                # 行动类
    AMBIGUOUS = "ambiguous"          # 模糊类


class AffirmativeType(str, Enum):
    """肯定类细分"""
    DIRECT = "direct"                # 直接确认: 好的、可以、行、是的
    ENTHUSIASTIC = "enthusiastic"    # 热情确认: 太好了、完美、就这样
    CONDITIONAL = "conditional"      # 条件确认: 都可以、都行、随便
    IMPLICIT = "implicit"            # 隐含确认: 那就开始吧、做吧


class NegativeType(str, Enum):
    """否定类细分"""
    DIRECT = "direct"                # 直接拒绝: 不要、不行、算了
    HESITATION = "hesitation"        # 犹豫: 再想想、考虑一下
    ALTERNATIVE = "alternative"      # 要替代方案: 换一个、有没有别的


class InquiryType(str, Enum):
    """询问类细分"""
    CLARIFICATION = "clarification"  # 澄清: 什么意思、具体说说
    OPINION = "opinion"              # 意见: 你觉得呢、有什么建议
    CONTINUATION = "continuation"    # 继续: 然后呢、接下来


class ActionType(str, Enum):
    """行动类细分"""
    EXECUTE = "execute"              # 执行: 启动、运行、开始
    TEST = "test"                    # 测试: 回测、测试一下
    MODIFY = "modify"                # 修改: 调整一下、改一下


# =============================================================================
# 本体知识库 - 词汇到类别的映射
# =============================================================================

AFFIRMATIVE_PATTERNS: Dict[AffirmativeType, List[str]] = {
    AffirmativeType.DIRECT: [
        # 单字确认
        "好", "行", "是", "对", "嗯", "恩", "哦", "噢",
        # 双字确认
        "好的", "行的", "可以", "可行", "好啊", "行啊", "是的", "对的",
        "没错", "正确", "同意", "认可", "确认", "确定",
        # 英文
        "ok", "OK", "Ok", "yes", "Yes", "yeah", "yep", "sure",
    ],
    AffirmativeType.ENTHUSIASTIC: [
        "太好了", "太棒了", "完美", "非常好", "很好", "不错",
        "就这样", "就这个", "就这么定了", "没问题", "没毛病",
        "支持", "赞成", "可以的",
    ],
    AffirmativeType.CONDITIONAL: [
        "都可以", "都行", "都好", "随便", "随意", "怎样都行",
        "都可以啊", "都行啊", "无所谓", "你决定", "你说了算",
        "听你的", "按你说的", "你定",
    ],
    AffirmativeType.IMPLICIT: [
        "那就开始吧", "开始吧", "做吧", "干吧", "搞吧",
        "那就这样", "那就这样吧", "就这样吧",
        "那制定这个策略吧", "制定吧", "创建吧", "建吧",
        "那就创建", "去创建", "帮我创建",
    ],
}

NEGATIVE_PATTERNS: Dict[NegativeType, List[str]] = {
    NegativeType.DIRECT: [
        "不", "不要", "不行", "不可以", "不用", "不了", "算了",
        "拒绝", "取消", "放弃", "停止", "别", "no", "No", "NO",
    ],
    NegativeType.HESITATION: [
        "再想想", "考虑一下", "等等", "等一下", "稍等",
        "让我想想", "我想想", "再看看", "观望", "暂时不",
    ],
    NegativeType.ALTERNATIVE: [
        "换一个", "换个", "其他的", "别的", "有没有别的",
        "还有其他", "其他方案", "另一种", "不同的",
    ],
}

INQUIRY_PATTERNS: Dict[InquiryType, List[str]] = {
    InquiryType.CLARIFICATION: [
        "什么意思", "啥意思", "怎么理解", "具体说说", "详细说说",
        "解释一下", "说明一下", "为什么", "是什么",
    ],
    InquiryType.OPINION: [
        "你觉得呢", "你怎么看", "你的建议", "有什么建议",
        "推荐什么", "建议怎么", "你认为",
    ],
    InquiryType.CONTINUATION: [
        "然后呢", "接下来", "继续", "下一步", "后面呢",
        "还有吗", "还有呢", "之后",
    ],
}

ACTION_PATTERNS: Dict[ActionType, List[str]] = {
    ActionType.EXECUTE: [
        "启动", "运行", "执行", "开始", "部署", "上线",
        "跑起来", "让它运行",
    ],
    ActionType.TEST: [
        "回测", "测试", "试试", "试一下", "验证", "检验",
        "跑个回测", "测试一下",
    ],
    ActionType.MODIFY: [
        "调整", "修改", "改一下", "改改", "优化", "调一下",
        "微调", "改进",
    ],
}


# =============================================================================
# 本体分类器
# =============================================================================

@dataclass
class ClassificationResult:
    """分类结果"""
    category: ResponseCategory
    sub_type: Optional[str] = None
    confidence: float = 0.0
    matched_pattern: Optional[str] = None
    is_confirmation: bool = False


class ResponseOntologyClassifier:
    """
    基于本体论的用户回复分类器

    使用语义类别而非简单关键词匹配，
    支持模糊匹配和上下文感知。
    """

    def __init__(self):
        # 构建反向索引: pattern -> (category, sub_type)
        self._pattern_index: Dict[str, Tuple[ResponseCategory, str]] = {}
        self._build_index()

    def _build_index(self):
        """构建模式索引"""
        for sub_type, patterns in AFFIRMATIVE_PATTERNS.items():
            for pattern in patterns:
                self._pattern_index[pattern.lower()] = (
                    ResponseCategory.AFFIRMATIVE,
                    sub_type.value
                )

        for sub_type, patterns in NEGATIVE_PATTERNS.items():
            for pattern in patterns:
                self._pattern_index[pattern.lower()] = (
                    ResponseCategory.NEGATIVE,
                    sub_type.value
                )

        for sub_type, patterns in INQUIRY_PATTERNS.items():
            for pattern in patterns:
                self._pattern_index[pattern.lower()] = (
                    ResponseCategory.INQUIRY,
                    sub_type.value
                )

        for sub_type, patterns in ACTION_PATTERNS.items():
            for pattern in patterns:
                self._pattern_index[pattern.lower()] = (
                    ResponseCategory.ACTION,
                    sub_type.value
                )

    def classify(self, text: str) -> ClassificationResult:
        """
        分类用户回复

        Args:
            text: 用户输入文本

        Returns:
            ClassificationResult 包含类别、子类型、置信度
        """
        # 清理文本
        cleaned = text.strip().lower()

        # 移除常见语气词进行匹配
        normalized = self._normalize(cleaned)

        # 1. 精确匹配
        if normalized in self._pattern_index:
            category, sub_type = self._pattern_index[normalized]
            return ClassificationResult(
                category=category,
                sub_type=sub_type,
                confidence=1.0,
                matched_pattern=normalized,
                is_confirmation=category == ResponseCategory.AFFIRMATIVE,
            )

        # 2. 包含匹配 (检查文本是否包含任何模式)
        best_match = self._find_best_match(cleaned)
        if best_match:
            return best_match

        # 3. 短文本启发式判断
        if len(cleaned) <= 5:
            # 非常短的回复，检查是否是肯定语气
            if self._is_short_affirmative(cleaned):
                return ClassificationResult(
                    category=ResponseCategory.AFFIRMATIVE,
                    sub_type=AffirmativeType.DIRECT.value,
                    confidence=0.7,
                    is_confirmation=True,
                )

        # 4. 无法分类
        return ClassificationResult(
            category=ResponseCategory.AMBIGUOUS,
            confidence=0.0,
            is_confirmation=False,
        )

    def _normalize(self, text: str) -> str:
        """规范化文本，移除语气词"""
        # 移除末尾语气词
        suffixes = ["啊", "呀", "吧", "呢", "哦", "哈", "嘛", "了", "的"]
        result = text
        for suffix in suffixes:
            if result.endswith(suffix) and len(result) > len(suffix):
                result = result[:-len(suffix)]
        return result.strip()

    def _find_best_match(self, text: str) -> Optional[ClassificationResult]:
        """在文本中查找最佳匹配模式"""
        best_result = None
        best_score = 0

        for pattern, (category, sub_type) in self._pattern_index.items():
            if pattern in text:
                # 计算匹配分数 (模式长度占文本比例)
                score = len(pattern) / len(text) if len(text) > 0 else 0
                if score > best_score:
                    best_score = score
                    best_result = ClassificationResult(
                        category=category,
                        sub_type=sub_type,
                        confidence=min(0.9, score + 0.3),
                        matched_pattern=pattern,
                        is_confirmation=category == ResponseCategory.AFFIRMATIVE,
                    )

        return best_result

    def _is_short_affirmative(self, text: str) -> bool:
        """判断短文本是否是肯定回复"""
        # 肯定性单字/双字
        affirmative_chars = {"好", "行", "是", "对", "嗯", "恩", "可", "成", "中"}

        # 检查是否包含肯定字符且不包含否定字符
        negative_chars = {"不", "没", "无", "非", "否"}

        has_affirmative = any(c in text for c in affirmative_chars)
        has_negative = any(c in text for c in negative_chars)

        return has_affirmative and not has_negative

    def is_confirmation(self, text: str) -> bool:
        """
        快速判断是否是确认性回复

        Args:
            text: 用户输入文本

        Returns:
            bool: 是否是确认
        """
        result = self.classify(text)
        return result.is_confirmation


# =============================================================================
# 意图继承规则
# =============================================================================

# 根据前一意图和回复类别，决定继承什么意图
INTENT_INHERITANCE_RULES: Dict[str, Dict[ResponseCategory, str]] = {
    "analyze_market": {
        ResponseCategory.AFFIRMATIVE: "create_strategy",
        ResponseCategory.NEGATIVE: "analyze_market",  # 重新分析
        ResponseCategory.INQUIRY: "analyze_market",   # 继续回答
        ResponseCategory.ACTION: "create_strategy",   # 执行相关 -> 创建策略
    },
    "create_strategy": {
        ResponseCategory.AFFIRMATIVE: "confirm_strategy",
        ResponseCategory.NEGATIVE: "create_strategy",
        ResponseCategory.INQUIRY: "create_strategy",
        ResponseCategory.ACTION: "execute_strategy",
    },
    "backtest": {
        ResponseCategory.AFFIRMATIVE: "deploy_strategy",
        ResponseCategory.NEGATIVE: "modify_strategy",
        ResponseCategory.INQUIRY: "backtest",
        ResponseCategory.ACTION: "deploy_strategy",
    },
}


def get_inherited_intent(
    previous_intent: str,
    response_category: ResponseCategory
) -> Optional[str]:
    """
    根据前一意图和回复类别获取继承的意图

    Args:
        previous_intent: 前一个意图
        response_category: 回复类别

    Returns:
        继承的意图，如果没有规则则返回 None
    """
    rules = INTENT_INHERITANCE_RULES.get(previous_intent)
    if rules:
        return rules.get(response_category)
    return None


# =============================================================================
# 单例实例
# =============================================================================

_classifier_instance: Optional[ResponseOntologyClassifier] = None


def get_response_classifier() -> ResponseOntologyClassifier:
    """获取分类器单例"""
    global _classifier_instance
    if _classifier_instance is None:
        _classifier_instance = ResponseOntologyClassifier()
    return _classifier_instance
