"""
Response Ontology Classifier Tests

测试本体论分类器的各种场景:
1. 肯定词识别 (确认词、热情确认、条件确认、隐含确认)
2. 否定词识别 (直接拒绝、犹豫、替代方案)
3. 否定优先规则 ("不太好" 应识别为否定)
4. Emoji 识别
5. 方言支持
6. 意图继承规则
"""

import pytest
from src.models.response_ontology import (
    ResponseOntologyClassifier,
    ResponseCategory,
    AffirmativeType,
    NegativeType,
    InquiryType,
    ActionType,
    get_response_classifier,
    get_inherited_intent,
)


class TestAffirmativeClassification:
    """测试肯定类分类"""

    @pytest.fixture
    def classifier(self):
        return ResponseOntologyClassifier()

    # =========================================================================
    # 直接确认词测试
    # =========================================================================

    @pytest.mark.parametrize("text", [
        "好",
        "好的",
        "行",
        "可以",
        "是的",
        "对",
        "嗯",
        "OK",
        "ok",
        "yes",
        "sure",
    ])
    def test_direct_affirmative(self, classifier, text):
        """测试直接确认词"""
        result = classifier.classify(text)
        assert result.category == ResponseCategory.AFFIRMATIVE
        assert result.sub_type == AffirmativeType.DIRECT.value
        assert result.is_confirmation is True
        assert result.confidence >= 0.7

    # =========================================================================
    # 带语气词的确认测试
    # =========================================================================

    @pytest.mark.parametrize("text", [
        "好啊",
        "行啊",
        "好的呢",
        "可以的",
        "好吧",
        "行吧",
    ])
    def test_affirmative_with_particles(self, classifier, text):
        """测试带语气词的确认"""
        result = classifier.classify(text)
        assert result.category == ResponseCategory.AFFIRMATIVE
        assert result.is_confirmation is True

    # =========================================================================
    # 热情确认词测试
    # =========================================================================

    @pytest.mark.parametrize("text", [
        "太好了",
        "完美",
        "非常好",
        "没问题",
        "就这样",
        "就这么定了",
    ])
    def test_enthusiastic_affirmative(self, classifier, text):
        """测试热情确认词"""
        result = classifier.classify(text)
        assert result.category == ResponseCategory.AFFIRMATIVE
        assert result.sub_type == AffirmativeType.ENTHUSIASTIC.value

    # =========================================================================
    # 条件确认词测试 (关键测试 - 用户问题场景)
    # =========================================================================

    @pytest.mark.parametrize("text", [
        "都可以",
        "都可以啊",  # 这是用户报告的问题场景
        "都行",
        "都行啊",
        "随便",
        "你决定",
        "听你的",
    ])
    def test_conditional_affirmative(self, classifier, text):
        """测试条件确认词 - 用户说'都可以啊'应该被识别为确认"""
        result = classifier.classify(text)
        assert result.category == ResponseCategory.AFFIRMATIVE, \
            f"'{text}' should be AFFIRMATIVE, got {result.category}"
        assert result.sub_type == AffirmativeType.CONDITIONAL.value
        assert result.is_confirmation is True

    # =========================================================================
    # 隐含确认词测试
    # =========================================================================

    @pytest.mark.parametrize("text", [
        "那就开始吧",
        "做吧",
        "搞吧",
        "那制定这个策略吧",
        "创建吧",
        "走起",
    ])
    def test_implicit_affirmative(self, classifier, text):
        """测试隐含确认词"""
        result = classifier.classify(text)
        assert result.category == ResponseCategory.AFFIRMATIVE
        assert result.sub_type == AffirmativeType.IMPLICIT.value

    # =========================================================================
    # 方言确认词测试
    # =========================================================================

    @pytest.mark.parametrize("text", [
        "中",      # 北方方言
        "成",      # 北方方言
        "得",      # 北方方言
        "要得",    # 四川方言
        "巴适",    # 四川方言
    ])
    def test_dialect_affirmative(self, classifier, text):
        """测试方言确认词"""
        result = classifier.classify(text)
        assert result.category == ResponseCategory.AFFIRMATIVE, \
            f"Dialect '{text}' should be AFFIRMATIVE"

    # =========================================================================
    # Emoji 确认测试
    # =========================================================================

    @pytest.mark.parametrize("text", [
        "👍",
        "✅",
        "👌",
        "🔥",
        "💯",
    ])
    def test_emoji_affirmative(self, classifier, text):
        """测试 Emoji 确认"""
        result = classifier.classify(text)
        assert result.category == ResponseCategory.AFFIRMATIVE, \
            f"Emoji '{text}' should be AFFIRMATIVE"
        assert result.is_confirmation is True


class TestNegativeClassification:
    """测试否定类分类"""

    @pytest.fixture
    def classifier(self):
        return ResponseOntologyClassifier()

    # =========================================================================
    # 直接拒绝词测试
    # =========================================================================

    @pytest.mark.parametrize("text", [
        "不",
        "不要",
        "不行",
        "不可以",
        "算了",
        "no",
        "nope",
    ])
    def test_direct_negative(self, classifier, text):
        """测试直接拒绝词"""
        result = classifier.classify(text)
        assert result.category == ResponseCategory.NEGATIVE
        assert result.sub_type == NegativeType.DIRECT.value
        assert result.is_confirmation is False

    # =========================================================================
    # 否定优先规则测试 (关键测试)
    # =========================================================================

    @pytest.mark.parametrize("text", [
        "不太好",
        "不太行",
        "不咋样",
        "不怎么样",
        "不理想",
        "不合适",
        "不靠谱",
    ])
    def test_negative_priority_rule(self, classifier, text):
        """测试否定优先规则 - '不太好'应该识别为否定，而非肯定"""
        result = classifier.classify(text)
        assert result.category == ResponseCategory.NEGATIVE, \
            f"'{text}' should be NEGATIVE (negative priority rule), got {result.category}"
        assert result.is_confirmation is False

    # =========================================================================
    # 肯定例外测试 (否定词+肯定词=肯定)
    # =========================================================================

    @pytest.mark.parametrize("text", [
        "没问题",
        "没毛病",
        "不错",
    ])
    def test_positive_exceptions(self, classifier, text):
        """测试肯定例外 - '没问题'、'不错'应该识别为肯定"""
        result = classifier.classify(text)
        assert result.category == ResponseCategory.AFFIRMATIVE, \
            f"'{text}' should be AFFIRMATIVE (positive exception), got {result.category}"

    # =========================================================================
    # 犹豫词测试
    # =========================================================================

    @pytest.mark.parametrize("text", [
        "再想想",
        "考虑一下",
        "让我想想",
        "再看看",
        "下次吧",
    ])
    def test_hesitation_negative(self, classifier, text):
        """测试犹豫词"""
        result = classifier.classify(text)
        assert result.category == ResponseCategory.NEGATIVE
        assert result.sub_type == NegativeType.HESITATION.value

    # =========================================================================
    # 替代方案词测试
    # =========================================================================

    @pytest.mark.parametrize("text", [
        "换一个",
        "有没有别的",
        "其他方案",
        "重新来",
    ])
    def test_alternative_negative(self, classifier, text):
        """测试替代方案词"""
        result = classifier.classify(text)
        assert result.category == ResponseCategory.NEGATIVE
        assert result.sub_type == NegativeType.ALTERNATIVE.value

    # =========================================================================
    # Emoji 否定测试
    # =========================================================================

    @pytest.mark.parametrize("text", [
        "👎",
        "❌",
        "🚫",
    ])
    def test_emoji_negative(self, classifier, text):
        """测试 Emoji 否定"""
        result = classifier.classify(text)
        assert result.category == ResponseCategory.NEGATIVE, \
            f"Emoji '{text}' should be NEGATIVE"

    @pytest.mark.parametrize("text", [
        "🤔",
        "😕",
    ])
    def test_emoji_hesitation(self, classifier, text):
        """测试 Emoji 犹豫"""
        result = classifier.classify(text)
        assert result.category == ResponseCategory.NEGATIVE
        assert result.sub_type == NegativeType.HESITATION.value


class TestInquiryClassification:
    """测试询问类分类"""

    @pytest.fixture
    def classifier(self):
        return ResponseOntologyClassifier()

    @pytest.mark.parametrize("text", [
        "什么意思",
        "具体说说",
        "解释一下",
        "为什么",
    ])
    def test_clarification_inquiry(self, classifier, text):
        """测试澄清类询问"""
        result = classifier.classify(text)
        assert result.category == ResponseCategory.INQUIRY
        assert result.sub_type == InquiryType.CLARIFICATION.value

    @pytest.mark.parametrize("text", [
        "你觉得呢",
        "有什么建议",
        "你怎么看",
    ])
    def test_opinion_inquiry(self, classifier, text):
        """测试意见类询问"""
        result = classifier.classify(text)
        assert result.category == ResponseCategory.INQUIRY
        assert result.sub_type == InquiryType.OPINION.value

    @pytest.mark.parametrize("text", [
        "然后呢",
        "接下来",
        "继续",
        "下一步",
    ])
    def test_continuation_inquiry(self, classifier, text):
        """测试继续类询问"""
        result = classifier.classify(text)
        assert result.category == ResponseCategory.INQUIRY
        assert result.sub_type == InquiryType.CONTINUATION.value


class TestActionClassification:
    """测试行动类分类"""

    @pytest.fixture
    def classifier(self):
        return ResponseOntologyClassifier()

    @pytest.mark.parametrize("text", [
        "启动",
        "运行",
        "执行",
        "开始",
    ])
    def test_execute_action(self, classifier, text):
        """测试执行类行动"""
        result = classifier.classify(text)
        assert result.category == ResponseCategory.ACTION
        assert result.sub_type == ActionType.EXECUTE.value

    @pytest.mark.parametrize("text", [
        "回测",
        "测试",
        "试试",
        "验证",
    ])
    def test_test_action(self, classifier, text):
        """测试测试类行动"""
        result = classifier.classify(text)
        assert result.category == ResponseCategory.ACTION
        assert result.sub_type == ActionType.TEST.value


class TestIntentInheritance:
    """测试意图继承规则"""

    def test_analyze_market_to_create_strategy_on_affirmative(self):
        """测试: 分析市场 + 肯定 → 创建策略"""
        result = get_inherited_intent("analyze_market", ResponseCategory.AFFIRMATIVE)
        assert result == "create_strategy"

    def test_analyze_market_stays_on_inquiry(self):
        """测试: 分析市场 + 询问 → 继续分析"""
        result = get_inherited_intent("analyze_market", ResponseCategory.INQUIRY)
        assert result == "analyze_market"

    def test_analyze_market_restarts_on_negative(self):
        """测试: 分析市场 + 否定 → 重新分析"""
        result = get_inherited_intent("analyze_market", ResponseCategory.NEGATIVE)
        assert result == "analyze_market"

    def test_create_strategy_to_confirm_on_affirmative(self):
        """测试: 创建策略 + 肯定 → 确认策略"""
        result = get_inherited_intent("create_strategy", ResponseCategory.AFFIRMATIVE)
        assert result == "confirm_strategy"

    def test_backtest_to_deploy_on_affirmative(self):
        """测试: 回测 + 肯定 → 部署策略"""
        result = get_inherited_intent("backtest", ResponseCategory.AFFIRMATIVE)
        assert result == "deploy_strategy"

    def test_unknown_intent_returns_none(self):
        """测试: 未知意图返回 None"""
        result = get_inherited_intent("unknown_intent", ResponseCategory.AFFIRMATIVE)
        assert result is None


class TestSingletonInstance:
    """测试单例实例"""

    def test_singleton_returns_same_instance(self):
        """测试: get_response_classifier 返回相同实例"""
        classifier1 = get_response_classifier()
        classifier2 = get_response_classifier()
        assert classifier1 is classifier2


class TestEdgeCases:
    """测试边界情况"""

    @pytest.fixture
    def classifier(self):
        return ResponseOntologyClassifier()

    def test_empty_string(self, classifier):
        """测试空字符串"""
        result = classifier.classify("")
        assert result.category == ResponseCategory.AMBIGUOUS

    def test_whitespace_only(self, classifier):
        """测试纯空白字符"""
        result = classifier.classify("   ")
        assert result.category == ResponseCategory.AMBIGUOUS

    def test_long_text_with_affirmative(self, classifier):
        """测试包含肯定词的长文本"""
        result = classifier.classify("我觉得这个方案非常好，可以采用")
        assert result.category == ResponseCategory.AFFIRMATIVE

    def test_mixed_case(self, classifier):
        """测试大小写混合"""
        result = classifier.classify("OK")
        assert result.category == ResponseCategory.AFFIRMATIVE
        result = classifier.classify("Yes")
        assert result.category == ResponseCategory.AFFIRMATIVE

    def test_is_confirmation_shortcut(self, classifier):
        """测试 is_confirmation 快捷方法"""
        assert classifier.is_confirmation("好的") is True
        assert classifier.is_confirmation("不行") is False
        assert classifier.is_confirmation("都可以啊") is True
