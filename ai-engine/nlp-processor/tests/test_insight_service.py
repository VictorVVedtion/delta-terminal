"""InsightData 生成服务测试"""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

from src.models.schemas import IntentType, Message, MessageRole
from src.models.insight_schemas import (
    InsightData,
    InsightType,
    ParamType,
    ClarificationInsight,
    ClarificationCategory,
    create_insight_id,
)
from src.services.insight_service import InsightGeneratorService, get_insight_service


class TestInsightGeneratorService:
    """测试 InsightGeneratorService 类"""

    @pytest.fixture
    def mock_llm_service(self):
        """创建 LLM 服务模拟对象"""
        mock = AsyncMock()
        mock.generate_json_response = AsyncMock(
            return_value={
                "type": "strategy_create",
                "params": [
                    {
                        "key": "symbol",
                        "label": "交易对",
                        "type": "select",
                        "value": "BTC/USDT",
                        "level": 1,
                        "config": {
                            "options": [
                                {"value": "BTC/USDT", "label": "BTC/USDT"}
                            ]
                        }
                    }
                ],
                "explanation": "这是一个 BTC/USDT 网格策略"
            }
        )
        mock.generate_response = AsyncMock(
            return_value="这是一个测试响应"
        )
        return mock

    @pytest.fixture
    def mock_llm_router(self):
        """创建 LLM 路由模拟对象"""
        mock = AsyncMock()
        mock.generate_json = AsyncMock(
            return_value={
                "type": "strategy_create",
                "params": [
                    {
                        "key": "symbol",
                        "label": "交易对",
                        "type": "select",
                        "value": "BTC/USDT",
                        "level": 1,
                        "config": {
                            "options": [
                                {"value": "BTC/USDT", "label": "BTC/USDT"}
                            ]
                        }
                    }
                ],
                "explanation": "这是一个 BTC/USDT 网格策略"
            }
        )
        mock.generate = AsyncMock(
            return_value="这是一个测试响应"
        )
        return mock

    @pytest.fixture
    def insight_service(self, mock_llm_service, mock_llm_router):
        """创建 InsightGeneratorService 实例"""
        return InsightGeneratorService(
            llm_service=mock_llm_service,
            llm_router=mock_llm_router,
            user_id="test_user"
        )

    @pytest.fixture
    def sample_chat_history(self):
        """创建示例对话历史"""
        return [
            Message(role=MessageRole.USER, content="你好"),
            Message(role=MessageRole.ASSISTANT, content="你好!有什么可以帮你的吗?"),
        ]

    @pytest.mark.asyncio
    async def test_generate_insight_strategy_create(
        self,
        insight_service,
        sample_chat_history
    ):
        """测试生成策略创建 InsightData"""
        insight = await insight_service.generate_insight(
            user_input="创建一个 BTC/USDT 网格策略",
            intent=IntentType.CREATE_STRATEGY,
            chat_history=sample_chat_history,
            user_id="test_user",
            include_reasoning=False  # 禁用推理链以简化测试
        )

        assert isinstance(insight, InsightData)
        assert insight.type == InsightType.STRATEGY_CREATE
        assert len(insight.params) > 0
        assert insight.explanation != ""
        assert "insight_" in insight.id

    @pytest.mark.asyncio
    async def test_generate_insight_general_chat(
        self,
        insight_service,
        sample_chat_history
    ):
        """测试生成普通对话 InsightData"""
        insight = await insight_service.generate_insight(
            user_input="你好",
            intent=IntentType.GENERAL_CHAT,
            chat_history=sample_chat_history,
            user_id="test_user",
            include_reasoning=False
        )

        assert isinstance(insight, InsightData)
        assert insight.type == InsightType.STRATEGY_CREATE  # 默认类型
        assert insight.params == []
        assert insight.explanation != ""

    @pytest.mark.asyncio
    async def test_generate_insight_with_error(
        self,
        insight_service,
        sample_chat_history
    ):
        """测试 InsightData 生成错误处理"""
        # 模拟 LLM 调用失败
        insight_service.llm_router.generate_json = AsyncMock(
            side_effect=Exception("API Error")
        )

        insight = await insight_service.generate_insight(
            user_input="测试",
            intent=IntentType.CREATE_STRATEGY,
            chat_history=sample_chat_history,
            user_id="test_user",
            include_reasoning=False
        )

        # 应该返回错误 InsightData
        assert isinstance(insight, InsightData)
        assert "错误" in insight.explanation or "问题" in insight.explanation

    def test_assess_intent_completeness_complete(self, insight_service):
        """测试意图完整性评估 - 完整请求"""
        is_complete, missing, has_abstract = insight_service._assess_intent_completeness(
            user_input="创建一个 BTC/USDT 的 RSI 策略，使用 1 小时周期",
            intent=IntentType.CREATE_STRATEGY,
            entities={"symbol": "BTC/USDT", "strategy_type": "rsi"},
        )

        assert is_complete is True
        assert len(missing) < 2
        assert has_abstract is False

    def test_assess_intent_completeness_incomplete(self, insight_service):
        """测试意图完整性评估 - 不完整请求"""
        is_complete, missing, has_abstract = insight_service._assess_intent_completeness(
            user_input="我想做一个稳定的策略",
            intent=IntentType.CREATE_STRATEGY,
            entities={},
        )

        assert is_complete is False
        assert len(missing) >= 2 or has_abstract is True

    def test_assess_intent_completeness_with_collected_params(self, insight_service):
        """测试意图完整性评估 - 带已收集参数"""
        is_complete, missing, has_abstract = insight_service._assess_intent_completeness(
            user_input="创建策略",
            intent=IntentType.CREATE_STRATEGY,
            entities={},
            collected_params={
                "trading_pair": "BTC/USDT",
                "timeframe": "1h"
            }
        )

        # 已收集参数应该被考虑在内
        assert len(missing) <= 1

    def test_assess_intent_completeness_non_strategy(self, insight_service):
        """测试意图完整性评估 - 非策略意图"""
        is_complete, missing, has_abstract = insight_service._assess_intent_completeness(
            user_input="分析 BTC",
            intent=IntentType.ANALYZE_MARKET,
            entities={},
        )

        # 非策略意图总是被认为完整
        assert is_complete is True
        assert missing == []
        assert has_abstract is False

    @pytest.mark.asyncio
    async def test_generate_clarification_insight(
        self,
        insight_service,
        sample_chat_history
    ):
        """测试生成澄清 InsightData"""
        # 模拟 LLM 返回澄清响应
        insight_service.llm_router.generate_json = AsyncMock(
            return_value={
                "question": "您希望交易什么币种?",
                "category": "trading_pair",
                "option_type": "single",
                "options": [
                    {"id": "btc", "label": "BTC/USDT", "recommended": True},
                    {"id": "eth", "label": "ETH/USDT", "recommended": False},
                ],
                "allow_custom_input": True,
                "explanation": "请选择交易对"
            }
        )

        insight = await insight_service._generate_clarification_insight(
            user_input="创建策略",
            chat_history=sample_chat_history,
            context={},
            missing_params=["symbol", "timeframe"],
            has_abstract=False
        )

        assert isinstance(insight, ClarificationInsight)
        assert insight.type == InsightType.CLARIFICATION
        assert insight.question != ""
        assert len(insight.options) > 0
        assert insight.category == ClarificationCategory.TRADING_PAIR

    def test_parse_params(self, insight_service):
        """测试参数解析"""
        params_data = [
            {
                "key": "rsi_period",
                "label": "RSI 周期",
                "type": "slider",
                "value": 14,
                "level": 1,
                "config": {
                    "min": 7,
                    "max": 21,
                    "step": 1,
                    "unit": "天"
                }
            },
            {
                "key": "symbol",
                "label": "交易对",
                "type": "select",
                "value": "BTC/USDT",
                "level": 1,
                "config": {
                    "options": [
                        {"value": "BTC/USDT", "label": "BTC/USDT"}
                    ]
                }
            }
        ]

        params = insight_service._parse_params(params_data)

        assert len(params) == 2
        assert params[0].key == "rsi_period"
        assert params[0].type == ParamType.SLIDER
        assert params[0].value == 14
        assert params[0].config.min == 7
        assert params[0].config.max == 21

        assert params[1].key == "symbol"
        assert params[1].type == ParamType.SELECT
        assert len(params[1].config.options) == 1

    def test_parse_params_with_constraints(self, insight_service):
        """测试带约束的参数解析"""
        params_data = [
            {
                "key": "stop_loss",
                "label": "止损",
                "type": "number",
                "value": 3.0,
                "level": 1,
                "config": {"min": 1, "max": 10, "unit": "%"},
                "constraints": [
                    {
                        "type": "min_max",
                        "rule": "value >= 1 && value <= 10",
                        "message": "止损必须在 1%-10% 之间",
                        "severity": "error"
                    }
                ]
            }
        ]

        params = insight_service._parse_params(params_data)

        assert len(params) == 1
        assert params[0].constraints is not None
        assert len(params[0].constraints) == 1
        assert params[0].constraints[0].message == "止损必须在 1%-10% 之间"

    def test_parse_params_invalid_data(self, insight_service):
        """测试解析无效参数数据"""
        params_data = [
            {
                "key": "invalid",
                # 缺少必需字段
            }
        ]

        # 应该跳过无效参数并继续
        params = insight_service._parse_params(params_data)
        assert len(params) == 0

    def test_check_perspective_needed(self, insight_service):
        """测试检查是否需要策略角度推荐"""
        # 需要推荐
        needs, concept = insight_service._check_perspective_needed(
            user_input="我想在 BTC 跌到低点时抄底",
            entities={}
        )
        assert needs is True
        assert concept is not None

        # 不需要推荐：已有技术指标
        needs, concept = insight_service._check_perspective_needed(
            user_input="当 RSI 低于 30 时抄底",
            entities={}
        )
        assert needs is False

        # 不需要推荐：无交易概念
        needs, concept = insight_service._check_perspective_needed(
            user_input="创建一个策略",
            entities={}
        )
        assert needs is False
        assert concept is None

    def test_format_chat_history(self, insight_service, sample_chat_history):
        """测试对话历史格式化"""
        formatted = insight_service._format_chat_history(sample_chat_history)

        assert len(formatted) == 2
        assert formatted[0][0] == "human"
        assert formatted[0][1] == "你好"
        assert formatted[1][0] == "assistant"
        assert formatted[1][1] == "你好!有什么可以帮你的吗?"

    def test_format_chat_history_limit(self, insight_service):
        """测试对话历史格式化限制"""
        # 创建超过 10 条的消息
        messages = [
            Message(role=MessageRole.USER, content=f"消息 {i}")
            for i in range(15)
        ]

        formatted = insight_service._format_chat_history(messages)

        # 应该只保留最后 10 条
        assert len(formatted) == 10


class TestInsightDataValidation:
    """测试 InsightData 数据验证"""

    def test_create_insight_id(self):
        """测试创建 insight ID"""
        id1 = create_insight_id()
        id2 = create_insight_id()

        assert id1.startswith("insight_")
        assert id2.startswith("insight_")
        assert id1 != id2  # 应该是唯一的

    def test_insight_data_validation(self):
        """测试 InsightData 验证"""
        from src.models.insight_schemas import InsightParam, ParamConfig

        # 创建有效的 InsightData
        insight = InsightData(
            id=create_insight_id(),
            type=InsightType.STRATEGY_CREATE,
            params=[
                InsightParam(
                    key="test",
                    label="测试",
                    type=ParamType.NUMBER,
                    value=10,
                    level=1,
                    config=ParamConfig()
                )
            ],
            explanation="测试说明",
            created_at=datetime.now().isoformat()
        )

        assert insight.type == InsightType.STRATEGY_CREATE
        assert len(insight.params) == 1
        assert insight.params[0].key == "test"


@pytest.mark.asyncio
async def test_get_insight_service():
    """测试获取 InsightGeneratorService 实例"""
    with patch('src.services.insight_service.get_llm_service') as mock_get_llm, \
         patch('src.services.insight_service.get_llm_router') as mock_get_router, \
         patch('src.services.insight_service.get_reasoning_service') as mock_get_reasoning, \
         patch('src.services.insight_service.get_market_data_service') as mock_get_market:

        mock_get_llm.return_value = MagicMock()
        mock_get_router.return_value = MagicMock()
        mock_get_reasoning.return_value = AsyncMock(return_value=MagicMock())
        mock_get_market.return_value = AsyncMock(return_value=MagicMock())

        service = await get_insight_service(
            include_reasoning=True,
            use_router=True,
            user_id="test_user",
            include_market_data=True
        )

        assert isinstance(service, InsightGeneratorService)
        assert service.user_id == "test_user"
        mock_get_llm.assert_called_once()
        mock_get_router.assert_called_once()
