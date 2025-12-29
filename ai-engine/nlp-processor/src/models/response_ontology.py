"""
用户回复本体论 (Response Ontology)

使用本体论方法组织用户回复的语义分类，
而不是简单枚举关键词，实现更精准的意图识别。

本体结构:
UserResponse (顶层)
├── Affirmative (肯定类) → 触发确认行为
├── Negative (否定类) → 触发拒绝/重新开始
├── Inquiry (询问类) → 保持当前意图，补充信息
├── Action (行动类) → 触发具体操作
└── Compound (混合类) → 包含多个意图

设计原则:
1. 否定优先: "不太好" 优先识别为否定，即使包含"好"
2. 长模式优先: "非常好" 优先于 "好"，精确匹配更高分
3. 语气词剥离: "好啊" → "好"，支持各种语气词
4. 方言兼容: 支持北方/四川/粤语等常见地方表达
5. Emoji 感知: 支持 👍✅👎❌ 等常用表情符号
6. 上下文继承: 根据前一意图推断确认行为的目标

应用场景:
- 用户说"都可以啊"后 AI 分析市场 → 识别为确认 → 继承为 create_strategy
- 用户说"不太好，换一个" → 识别为否定 + 替代方案
- 用户说"👍" → 识别为肯定确认
"""

from enum import Enum
from typing import Dict, List, Optional, Tuple, Set
from dataclasses import dataclass, field
import re


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
        # 方言 - 北方
        "中", "成", "得", "得嘞", "妥", "妥了", "靠谱",
        # 方言 - 四川/西南
        "要得", "巴适", "可以撒",
        # 方言 - 粤语
        "得", "冇问题", "ok啦",
        # 双字确认
        "好的", "行的", "可以", "可行", "好啊", "行啊", "是的", "对的",
        "没错", "正确", "同意", "认可", "确认", "确定",
        # 英文
        "ok", "OK", "Ok", "yes", "Yes", "yeah", "yep", "sure", "alright",
        # Emoji
        "👍", "✅", "👌", "🙆", "💪", "🎉",
    ],
    AffirmativeType.ENTHUSIASTIC: [
        "太好了", "太棒了", "完美", "非常好", "很好", "不错",
        "就这样", "就这个", "就这么定了", "没问题", "没毛病",
        "支持", "赞成", "可以的", "绝了", "牛", "厉害", "nice",
        # Emoji 热情确认
        "🔥", "💯", "🚀",
    ],
    AffirmativeType.CONDITIONAL: [
        "都可以", "都行", "都好", "随便", "随意", "怎样都行",
        "都可以啊", "都行啊", "无所谓", "你决定", "你说了算",
        "听你的", "按你说的", "你定", "你来定", "随你",
        "都ok", "都OK", "啥都行", "咋都行",
    ],
    AffirmativeType.IMPLICIT: [
        "那就开始吧", "开始吧", "做吧", "干吧", "搞吧",
        "那就这样", "那就这样吧", "就这样吧",
        "那制定这个策略吧", "制定吧", "创建吧", "建吧",
        "那就创建", "去创建", "帮我创建",
        "走起", "来吧", "搞起来", "弄吧", "整吧",
    ],
}

NEGATIVE_PATTERNS: Dict[NegativeType, List[str]] = {
    NegativeType.DIRECT: [
        # 直接拒绝
        "不", "不要", "不行", "不可以", "不用", "不了", "算了",
        "拒绝", "取消", "放弃", "停止", "别", "免了", "罢了",
        # 否定短语（否定优先规则）
        "不太好", "不太行", "不咋样", "不怎么样", "不理想",
        "不合适", "不靠谱", "不满意", "不喜欢",
        # 英文
        "no", "No", "NO", "nope", "nah", "never",
        # Emoji
        "👎", "❌", "🙅", "🚫",
        # 方言
        "不中", "不成", "算球了", "得了吧",
    ],
    NegativeType.HESITATION: [
        "再想想", "考虑一下", "等等", "等一下", "稍等",
        "让我想想", "我想想", "再看看", "观望", "暂时不",
        "再说", "以后再说", "下次吧", "先不", "先别",
        "容我想想", "让我考虑", "不着急",
        # Emoji
        "🤔", "😕",
    ],
    NegativeType.ALTERNATIVE: [
        "换一个", "换个", "其他的", "别的", "有没有别的",
        "还有其他", "其他方案", "另一种", "不同的",
        "换个思路", "换种方式", "重新来", "再来一个",
        "有没有更好的", "能不能换",
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

        分类优先级:
        1. 否定优先: 如果检测到否定词，优先识别为否定类
        2. 精确匹配: 完全匹配模式库
        3. 长模式优先: 较长的匹配模式得分更高
        4. 短文本启发: 对简短回复进行特殊处理
        """
        # 清理文本
        cleaned = text.strip().lower()

        # 移除常见语气词进行匹配
        normalized = self._normalize(cleaned)

        # ========================================
        # 0. 否定优先检测 (关键改进)
        # ========================================
        # "不太好"、"不咋样" 即使包含肯定词也应识别为否定
        negative_result = self._check_negative_priority(cleaned)
        if negative_result:
            return negative_result

        # ========================================
        # 1. 精确匹配
        # ========================================
        if normalized in self._pattern_index:
            category, sub_type = self._pattern_index[normalized]
            return ClassificationResult(
                category=category,
                sub_type=sub_type,
                confidence=1.0,
                matched_pattern=normalized,
                is_confirmation=category == ResponseCategory.AFFIRMATIVE,
            )

        # ========================================
        # 2. 包含匹配 (长模式优先)
        # ========================================
        best_match = self._find_best_match(cleaned)
        if best_match:
            return best_match

        # ========================================
        # 3. 短文本启发式判断
        # ========================================
        if len(cleaned) <= 5:
            # 非常短的回复，检查是否是肯定语气
            if self._is_short_affirmative(cleaned):
                return ClassificationResult(
                    category=ResponseCategory.AFFIRMATIVE,
                    sub_type=AffirmativeType.DIRECT.value,
                    confidence=0.7,
                    is_confirmation=True,
                )

        # ========================================
        # 4. Emoji 检测
        # ========================================
        emoji_result = self._check_emoji(cleaned)
        if emoji_result:
            return emoji_result

        # ========================================
        # 5. 无法分类
        # ========================================
        return ClassificationResult(
            category=ResponseCategory.AMBIGUOUS,
            confidence=0.0,
            is_confirmation=False,
        )

    def _check_negative_priority(self, text: str) -> Optional[ClassificationResult]:
        """
        否定优先检测

        当文本包含否定前缀（不、没、无）+ 肯定词时，
        应优先识别为否定类。

        例如：
        - "不太好" → NEGATIVE (不是 "好" → AFFIRMATIVE)
        - "不咋样" → NEGATIVE
        - "没问题" → AFFIRMATIVE (这是例外，"没问题"本身是肯定)

        例外情况：
        - "非常好" → AFFIRMATIVE (非常是程度副词，不是否定)
        - "不错" → AFFIRMATIVE (习惯用语)
        """
        # 例外：这些"否定+肯定"组合实际是肯定意思
        positive_exceptions = {
            # 程度副词 "非常" 不是否定
            "非常好", "非常棒", "非常不错", "非常可以",
            # 习惯用语
            "没问题", "没毛病", "没事", "没关系",
            "不错", "不差", "无妨", "无所谓",
        }

        # 检查是否是肯定例外
        for exception in positive_exceptions:
            if exception in text:
                # 这是肯定表达
                return None

        # 否定前缀 - 注意："非" 需要特殊处理
        # "非常" 是程度副词，不是否定
        if "非常" in text:
            # 跳过，不作为否定处理
            pass
        elif "非" in text:
            # 检查是否是否定用法
            affirmative_words = ["好", "行", "可以", "对", "是", "成", "中", "靠谱"]
            for word in affirmative_words:
                if f"非{word}" in text:
                    return ClassificationResult(
                        category=ResponseCategory.NEGATIVE,
                        sub_type=NegativeType.DIRECT.value,
                        confidence=0.95,
                        matched_pattern=f"非{word}",
                        is_confirmation=False,
                    )

        # 其他否定前缀
        other_negative_prefixes = ["不", "没", "无", "别", "莫"]

        for prefix in other_negative_prefixes:
            if prefix in text:
                # 再次检查是否是例外
                is_exception = False
                for exception in positive_exceptions:
                    if exception in text:
                        is_exception = True
                        break

                if is_exception:
                    continue

                # 检查是否跟着肯定词
                affirmative_words = ["好", "行", "可以", "对", "是", "成", "中", "靠谱"]
                for word in affirmative_words:
                    # 检查 "不好"、"不行" 等模式
                    pattern = prefix + word
                    if pattern in text:
                        return ClassificationResult(
                            category=ResponseCategory.NEGATIVE,
                            sub_type=NegativeType.DIRECT.value,
                            confidence=0.95,
                            matched_pattern=pattern,
                            is_confirmation=False,
                        )

        return None

    def _check_emoji(self, text: str) -> Optional[ClassificationResult]:
        """检测 Emoji 表情"""
        # 肯定 Emoji
        positive_emojis = {"👍", "✅", "👌", "🙆", "💪", "🎉", "🔥", "💯", "🚀", "❤️", "😊", "😄"}
        # 否定 Emoji
        negative_emojis = {"👎", "❌", "🙅", "🚫", "😔", "😢", "😞"}
        # 犹豫 Emoji
        hesitation_emojis = {"🤔", "😕", "🤷"}

        for emoji in positive_emojis:
            if emoji in text:
                return ClassificationResult(
                    category=ResponseCategory.AFFIRMATIVE,
                    sub_type=AffirmativeType.DIRECT.value,
                    confidence=0.9,
                    matched_pattern=emoji,
                    is_confirmation=True,
                )

        for emoji in negative_emojis:
            if emoji in text:
                return ClassificationResult(
                    category=ResponseCategory.NEGATIVE,
                    sub_type=NegativeType.DIRECT.value,
                    confidence=0.9,
                    matched_pattern=emoji,
                    is_confirmation=False,
                )

        for emoji in hesitation_emojis:
            if emoji in text:
                return ClassificationResult(
                    category=ResponseCategory.NEGATIVE,
                    sub_type=NegativeType.HESITATION.value,
                    confidence=0.8,
                    matched_pattern=emoji,
                    is_confirmation=False,
                )

        return None

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
        """
        在文本中查找最佳匹配模式

        评分规则 (长模式优先):
        1. 基础分 = 模式长度 / 文本长度
        2. 否定类别加权 +0.1 (否定优先原则)
        3. 精确匹配（模式=文本）额外加权 +0.2

        例如：
        - "非常好" 比 "好" 得分高 (长模式优先)
        - "不行" 比 "行" 得分高 (否定优先 + 长模式)
        """
        best_result = None
        best_score = 0

        for pattern, (category, sub_type) in self._pattern_index.items():
            if pattern in text:
                # 基础分: 模式长度占文本比例
                base_score = len(pattern) / len(text) if len(text) > 0 else 0

                # 长模式奖励: 模式越长，额外加分
                length_bonus = len(pattern) * 0.05

                # 否定优先: 否定类别加权
                negative_bonus = 0.1 if category == ResponseCategory.NEGATIVE else 0

                # 精确匹配奖励
                exact_bonus = 0.2 if pattern == text else 0

                # 总分
                score = base_score + length_bonus + negative_bonus + exact_bonus

                if score > best_score:
                    best_score = score
                    best_result = ClassificationResult(
                        category=category,
                        sub_type=sub_type,
                        confidence=min(0.95, base_score + 0.3),
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
