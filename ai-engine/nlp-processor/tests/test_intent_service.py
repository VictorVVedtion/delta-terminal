"""意图识别服务测试"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from src.models.schemas import IntentRecognitionRequest, IntentRecognitionResponse, IntentType
from src.models.strategy_perspectives import TradingConcept
from src.services.intent_service import IntentService, get_intent_service


class TestIntentService:
    """测试 IntentService 类"""

    @pytest.fixture
    def mock_llm_service(self):
        """创建 LLM 服务模拟对象"""
        mock = AsyncMock()
        mock.generate_json_response = AsyncMock(
            return_value={
                "intent": "CREATE_STRATEGY",
                "confidence": 0.95,
                "entities": {"symbol": "BTC/USDT", "strategy_type": "grid"},
                "reasoning": "用户明确表达了创建网格策略的意图"
            }
        )
        return mock

    @pytest.fixture
    def mock_llm_router(self):
        """创建 LLM 路由模拟对象"""
        mock = AsyncMock()
        mock.generate_json = AsyncMock(
            return_value={
                "intent": "CREATE_STRATEGY",
                "confidence": 0.95,
                "entities": {"symbol": "BTC/USDT", "strategy_type": "grid"},
                "reasoning": "用户明确表达了创建网格策略的意图"
            }
        )
        return mock

    @pytest.fixture
    def intent_service(self, mock_llm_service, mock_llm_router):
        """创建 IntentService 实例"""
        return IntentService(
            llm_service=mock_llm_service,
            llm_router=mock_llm_router,
            user_id="test_user"
        )

    @pytest.mark.asyncio
    async def test_recognize_intent_success(self, intent_service):
        """测试成功识别意图"""
        request = IntentRecognitionRequest(
            text="帮我创建一个 BTC/USDT 的网格策略",
            context={}
        )

        response = await intent_service.recognize_intent(request)

        assert isinstance(response, IntentRecognitionResponse)
        assert response.intent == IntentType.CREATE_STRATEGY
        assert response.confidence == 0.95
        assert "symbol" in response.entities
        assert response.entities["symbol"] == "BTC/USDT"

    @pytest.mark.asyncio
    async def test_recognize_intent_with_user_id(self, intent_service):
        """测试带用户 ID 的意图识别"""
        request = IntentRecognitionRequest(
            text="创建策略",
            context={}
        )

        response = await intent_service.recognize_intent(
            request,
            user_id="custom_user"
        )

        assert isinstance(response, IntentRecognitionResponse)
        # 验证使用了 LLM Router
        intent_service.llm_router.generate_json.assert_called_once()

    @pytest.mark.asyncio
    async def test_recognize_intent_error_handling(self, intent_service):
        """测试意图识别错误处理"""
        # 模拟 LLM 调用失败
        intent_service.llm_router.generate_json = AsyncMock(
            side_effect=Exception("API Error")
        )

        request = IntentRecognitionRequest(
            text="测试",
            context={}
        )

        response = await intent_service.recognize_intent(request)

        # 应该返回 UNKNOWN 意图而不是抛出异常
        assert response.intent == IntentType.UNKNOWN
        assert response.confidence == 0.0
        assert "Error" in response.reasoning

    @pytest.mark.asyncio
    async def test_extract_entities_strategy(self, intent_service):
        """测试策略实体提取"""
        text = "创建一个 BTC/USDT 的网格策略，使用 1 小时周期"

        entities = await intent_service.extract_entities(
            text,
            IntentType.CREATE_STRATEGY
        )

        assert "symbol" in entities
        assert entities["symbol"] == "BTC/USDT"
        assert "strategy_type" in entities
        assert entities["strategy_type"] == "grid"
        assert "timeframe" in entities
        assert entities["timeframe"] == "1h"

    @pytest.mark.asyncio
    async def test_extract_entities_market(self, intent_service):
        """测试市场分析实体提取"""
        text = "分析 ETH/USDT 的趋势"

        entities = await intent_service.extract_entities(
            text,
            IntentType.ANALYZE_MARKET
        )

        assert "symbol" in entities
        assert entities["symbol"] == "ETH/USDT"
        assert "analysis_type" in entities
        assert entities["analysis_type"] == "trend"

    @pytest.mark.asyncio
    async def test_extract_entities_query(self, intent_service):
        """测试查询实体提取"""
        text = "显示所有活跃的策略"

        entities = await intent_service.extract_entities(
            text,
            IntentType.QUERY_STRATEGY
        )

        assert "query_type" in entities
        assert entities["query_type"] == "active"

    @pytest.mark.asyncio
    async def test_extract_entities_unknown_intent(self, intent_service):
        """测试未知意图的实体提取"""
        entities = await intent_service.extract_entities(
            "随便说点什么",
            IntentType.UNKNOWN
        )

        assert entities == {}

    def test_detect_trading_concept_from_text(self, intent_service):
        """测试从文本检测交易概念"""
        # 测试抄底概念
        text = "我想在 BTC 跌到低点时抄底"
        concept = intent_service.detect_trading_concept_from_text(text)
        assert concept == TradingConcept.BOTTOM_FISHING

        # 测试突破概念
        text = "等待价格突破阻力位"
        concept = intent_service.detect_trading_concept_from_text(text)
        assert concept == TradingConcept.BREAKOUT

        # 测试无概念
        text = "今天天气不错"
        concept = intent_service.detect_trading_concept_from_text(text)
        assert concept is None

    def test_has_specific_indicator(self, intent_service):
        """测试检测具体技术指标"""
        # 有技术指标
        assert intent_service.has_specific_indicator("当 RSI 低于 30 时买入") is True
        assert intent_service.has_specific_indicator("MACD 金叉") is True
        assert intent_service.has_specific_indicator("突破布林带上轨") is True

        # 无技术指标
        assert intent_service.has_specific_indicator("我想抄底") is False
        assert intent_service.has_specific_indicator("趋势向上时买入") is False

    def test_needs_perspective_recommendation(self, intent_service):
        """测试是否需要策略角度推荐"""
        # 需要推荐：有概念但无技术指标
        needs, concept = intent_service.needs_perspective_recommendation(
            text="我想在 BTC 跌到低点时抄底",
            intent=IntentType.CREATE_STRATEGY,
            entities={}
        )
        assert needs is True
        assert concept == TradingConcept.BOTTOM_FISHING

        # 不需要推荐：已有技术指标
        needs, concept = intent_service.needs_perspective_recommendation(
            text="当 RSI 低于 30 时抄底",
            intent=IntentType.CREATE_STRATEGY,
            entities={}
        )
        assert needs is False
        assert concept == TradingConcept.BOTTOM_FISHING

        # 不需要推荐：意图不是创建策略
        needs, concept = intent_service.needs_perspective_recommendation(
            text="我想抄底",
            intent=IntentType.ANALYZE_MARKET,
            entities={}
        )
        assert needs is False
        assert concept is None

        # 不需要推荐：无交易概念
        needs, concept = intent_service.needs_perspective_recommendation(
            text="创建一个策略",
            intent=IntentType.CREATE_STRATEGY,
            entities={}
        )
        assert needs is False
        assert concept is None

        # 不需要推荐：已有入场条件
        needs, concept = intent_service.needs_perspective_recommendation(
            text="我想抄底",
            intent=IntentType.CREATE_STRATEGY,
            entities={"entry_conditions": [{"indicator": "RSI"}]}
        )
        assert needs is False
        assert concept == TradingConcept.BOTTOM_FISHING


@pytest.mark.asyncio
async def test_get_intent_service():
    """测试获取意图服务实例"""
    with patch('src.services.intent_service.get_llm_service') as mock_get_llm, \
         patch('src.services.intent_service.get_llm_router') as mock_get_router:

        mock_get_llm.return_value = MagicMock()
        mock_get_router.return_value = MagicMock()

        service = await get_intent_service(user_id="test_user")

        assert isinstance(service, IntentService)
        assert service.user_id == "test_user"
        mock_get_llm.assert_called_once()
        mock_get_router.assert_called_once()
