"""聊天 API 端点测试"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient

from src.main import app
from src.models.schemas import IntentType
from src.models.insight_schemas import (
    InsightData,
    InsightType,
    InsightParam,
    ParamType,
    ParamConfig,
    create_insight_id,
)


@pytest.fixture
def client():
    """创建测试客户端"""
    return TestClient(app)


@pytest.fixture
def mock_insight_service():
    """创建 InsightGeneratorService 模拟对象"""
    mock = AsyncMock()
    mock.generate_insight = AsyncMock(
        return_value=InsightData(
            id=create_insight_id(),
            type=InsightType.STRATEGY_CREATE,
            params=[
                InsightParam(
                    key="symbol",
                    label="交易对",
                    type=ParamType.SELECT,
                    value="BTC/USDT",
                    level=1,
                    config=ParamConfig()
                )
            ],
            explanation="这是一个测试策略",
            created_at="2025-12-28T00:00:00"
        )
    )
    return mock


@pytest.fixture
def mock_intent_service():
    """创建 IntentService 模拟对象"""
    from src.models.schemas import IntentRecognitionResponse

    mock = AsyncMock()
    mock.recognize_intent = AsyncMock(
        return_value=IntentRecognitionResponse(
            intent=IntentType.CREATE_STRATEGY,
            confidence=0.95,
            entities={"symbol": "BTC/USDT"},
            reasoning="用户想创建策略"
        )
    )
    return mock


@pytest.fixture
def mock_strategy_chain():
    """创建 StrategyChain 模拟对象"""
    mock = AsyncMock()
    mock.process_conversation = AsyncMock(
        return_value="这是一个测试响应"
    )
    return mock


class TestChatEndpoint:
    """测试聊天端点"""

    def test_send_message_basic(
        self,
        client,
        mock_insight_service,
        mock_intent_service,
        mock_strategy_chain
    ):
        """测试基本消息发送"""
        with patch('src.api.endpoints.chat.get_insight_service', return_value=mock_insight_service), \
             patch('src.api.endpoints.chat.get_intent_service', return_value=mock_intent_service), \
             patch('src.api.endpoints.chat.get_strategy_chain', return_value=mock_strategy_chain), \
             patch('src.api.endpoints.chat.store_insight', new_callable=AsyncMock):

            response = client.post(
                "/api/v1/chat/message",
                json={
                    "message": "帮我创建一个 BTC 策略",
                    "user_id": "test_user"
                }
            )

            assert response.status_code == 200
            data = response.json()

            assert "message" in data
            assert "conversation_id" in data
            assert "intent" in data
            assert data["intent"] == "CREATE_STRATEGY"
            assert "insight" in data
            assert data["insight"] is not None

    def test_send_message_with_conversation_id(
        self,
        client,
        mock_insight_service,
        mock_intent_service,
        mock_strategy_chain
    ):
        """测试带对话 ID 的消息发送"""
        with patch('src.api.endpoints.chat.get_insight_service', return_value=mock_insight_service), \
             patch('src.api.endpoints.chat.get_intent_service', return_value=mock_intent_service), \
             patch('src.api.endpoints.chat.get_strategy_chain', return_value=mock_strategy_chain), \
             patch('src.api.endpoints.chat.store_insight', new_callable=AsyncMock):

            # 第一条消息
            response1 = client.post(
                "/api/v1/chat/message",
                json={
                    "message": "你好",
                    "user_id": "test_user"
                }
            )

            assert response1.status_code == 200
            conv_id = response1.json()["conversation_id"]

            # 第二条消息使用相同的对话 ID
            response2 = client.post(
                "/api/v1/chat/message",
                json={
                    "message": "创建策略",
                    "user_id": "test_user",
                    "conversation_id": conv_id
                }
            )

            assert response2.status_code == 200
            assert response2.json()["conversation_id"] == conv_id

    def test_send_message_follow_up(
        self,
        client,
        mock_insight_service,
        mock_intent_service,
        mock_strategy_chain
    ):
        """测试跟进消息（澄清回答）"""
        with patch('src.api.endpoints.chat.get_insight_service', return_value=mock_insight_service), \
             patch('src.api.endpoints.chat.get_intent_service', return_value=mock_intent_service), \
             patch('src.api.endpoints.chat.get_strategy_chain', return_value=mock_strategy_chain), \
             patch('src.api.endpoints.chat.store_insight', new_callable=AsyncMock):

            response = client.post(
                "/api/v1/chat/message",
                json={
                    "message": "BTC/USDT",
                    "user_id": "test_user",
                    "context": {
                        "isFollowUp": True,
                        "collectedParams": {"timeframe": "1h"},
                        "category": "trading_pair",
                        "previousQuestion": "选择交易对"
                    }
                }
            )

            assert response.status_code == 200
            data = response.json()

            assert "insight" in data
            # 验证 InsightGeneratorService 被调用
            mock_insight_service.generate_insight.assert_called()

    def test_send_message_general_chat(
        self,
        client,
        mock_insight_service,
        mock_intent_service,
        mock_strategy_chain
    ):
        """测试普通对话"""
        from src.models.schemas import IntentRecognitionResponse

        # 修改 mock 返回普通对话意图
        mock_intent_service.recognize_intent = AsyncMock(
            return_value=IntentRecognitionResponse(
                intent=IntentType.GENERAL_CHAT,
                confidence=0.9,
                entities={},
                reasoning="普通对话"
            )
        )

        with patch('src.api.endpoints.chat.get_insight_service', return_value=mock_insight_service), \
             patch('src.api.endpoints.chat.get_intent_service', return_value=mock_intent_service), \
             patch('src.api.endpoints.chat.get_strategy_chain', return_value=mock_strategy_chain), \
             patch('src.api.endpoints.chat.store_insight', new_callable=AsyncMock):

            response = client.post(
                "/api/v1/chat/message",
                json={
                    "message": "今天天气怎么样?",
                    "user_id": "test_user"
                }
            )

            assert response.status_code == 200
            data = response.json()

            assert data["intent"] == "GENERAL_CHAT"
            # 普通对话使用 strategy_chain
            mock_strategy_chain.process_conversation.assert_called()

    def test_send_message_invalid_request(self, client):
        """测试无效请求"""
        # 缺少必需字段
        response = client.post(
            "/api/v1/chat/message",
            json={
                "user_id": "test_user"
                # 缺少 message 字段
            }
        )

        assert response.status_code == 422  # Validation error

    def test_send_message_error_handling(
        self,
        client,
        mock_insight_service,
        mock_intent_service,
        mock_strategy_chain
    ):
        """测试错误处理"""
        # 模拟意图识别失败
        mock_intent_service.recognize_intent = AsyncMock(
            side_effect=Exception("Service error")
        )

        with patch('src.api.endpoints.chat.get_insight_service', return_value=mock_insight_service), \
             patch('src.api.endpoints.chat.get_intent_service', return_value=mock_intent_service), \
             patch('src.api.endpoints.chat.get_strategy_chain', return_value=mock_strategy_chain):

            response = client.post(
                "/api/v1/chat/message",
                json={
                    "message": "测试",
                    "user_id": "test_user"
                }
            )

            assert response.status_code == 500
            assert "detail" in response.json()

    def test_get_conversation(self, client):
        """测试获取对话历史"""
        with patch('src.api.endpoints.chat.get_insight_service', new_callable=AsyncMock), \
             patch('src.api.endpoints.chat.get_intent_service', new_callable=AsyncMock), \
             patch('src.api.endpoints.chat.get_strategy_chain', new_callable=AsyncMock), \
             patch('src.api.endpoints.chat.store_insight', new_callable=AsyncMock):

            # 先发送一条消息创建对话
            response1 = client.post(
                "/api/v1/chat/message",
                json={
                    "message": "你好",
                    "user_id": "test_user"
                }
            )

            conv_id = response1.json()["conversation_id"]

            # 获取对话历史
            response2 = client.get(f"/api/v1/chat/conversation/{conv_id}")

            assert response2.status_code == 200
            data = response2.json()

            assert "conversation_id" in data
            assert data["conversation_id"] == conv_id
            assert "messages" in data

    def test_get_conversation_not_found(self, client):
        """测试获取不存在的对话"""
        response = client.get("/api/v1/chat/conversation/non_existent_id")

        assert response.status_code == 404

    def test_delete_conversation(self, client):
        """测试删除对话"""
        with patch('src.api.endpoints.chat.get_insight_service', new_callable=AsyncMock), \
             patch('src.api.endpoints.chat.get_intent_service', new_callable=AsyncMock), \
             patch('src.api.endpoints.chat.get_strategy_chain', new_callable=AsyncMock), \
             patch('src.api.endpoints.chat.store_insight', new_callable=AsyncMock):

            # 先创建对话
            response1 = client.post(
                "/api/v1/chat/message",
                json={
                    "message": "你好",
                    "user_id": "test_user"
                }
            )

            conv_id = response1.json()["conversation_id"]

            # 删除对话
            response2 = client.delete(f"/api/v1/chat/conversation/{conv_id}")

            assert response2.status_code == 200
            assert "message" in response2.json()

            # 验证对话已删除
            response3 = client.get(f"/api/v1/chat/conversation/{conv_id}")
            assert response3.status_code == 404

    def test_delete_conversation_not_found(self, client):
        """测试删除不存在的对话"""
        response = client.delete("/api/v1/chat/conversation/non_existent_id")

        assert response.status_code == 404

    def test_clear_conversation(self, client):
        """测试清空对话历史"""
        with patch('src.api.endpoints.chat.get_insight_service', new_callable=AsyncMock), \
             patch('src.api.endpoints.chat.get_intent_service', new_callable=AsyncMock), \
             patch('src.api.endpoints.chat.get_strategy_chain', new_callable=AsyncMock), \
             patch('src.api.endpoints.chat.store_insight', new_callable=AsyncMock):

            # 先创建对话并发送消息
            response1 = client.post(
                "/api/v1/chat/message",
                json={
                    "message": "你好",
                    "user_id": "test_user"
                }
            )

            conv_id = response1.json()["conversation_id"]

            # 清空对话历史
            response2 = client.post(f"/api/v1/chat/conversation/{conv_id}/clear")

            assert response2.status_code == 200
            assert "message" in response2.json()

            # 验证对话仍存在但消息已清空
            response3 = client.get(f"/api/v1/chat/conversation/{conv_id}")
            assert response3.status_code == 200
            assert len(response3.json()["messages"]) == 0

    def test_clear_conversation_not_found(self, client):
        """测试清空不存在的对话"""
        response = client.post("/api/v1/chat/conversation/non_existent_id/clear")

        assert response.status_code == 404


class TestChatHelperFunctions:
    """测试聊天端点辅助函数"""

    def test_reconstruct_original_request(self):
        """测试重建原始请求"""
        from src.api.endpoints.chat import _reconstruct_original_request
        from src.models.schemas import Message, MessageRole

        messages = [
            Message(role=MessageRole.USER, content="我想创建一个 BTC 策略"),
            Message(role=MessageRole.ASSISTANT, content="好的，请选择时间周期"),
            Message(role=MessageRole.USER, content="1h"),
        ]

        collected_params = {
            "trading_pair": "BTC/USDT",
            "timeframe": "1h"
        }

        result = _reconstruct_original_request(messages, collected_params)

        assert "BTC" in result or "创建" in result
        assert "交易对" in result or "BTC/USDT" in result
        assert "时间周期" in result or "1h" in result

    def test_reconstruct_original_request_empty(self):
        """测试重建原始请求 - 空消息"""
        from src.api.endpoints.chat import _reconstruct_original_request

        result = _reconstruct_original_request([], {})

        assert result == "创建交易策略"

    @pytest.mark.asyncio
    async def test_generate_suggested_actions_create_strategy(self):
        """测试生成建议操作 - 创建策略"""
        from src.api.endpoints.chat import _generate_suggested_actions

        actions = await _generate_suggested_actions(
            IntentType.CREATE_STRATEGY,
            {"symbol": "BTC/USDT"}
        )

        assert isinstance(actions, list)
        assert len(actions) > 0
        assert any("策略" in action for action in actions)

    @pytest.mark.asyncio
    async def test_generate_suggested_actions_analyze_market(self):
        """测试生成建议操作 - 市场分析"""
        from src.api.endpoints.chat import _generate_suggested_actions

        actions = await _generate_suggested_actions(
            IntentType.ANALYZE_MARKET,
            {}
        )

        assert isinstance(actions, list)
        assert len(actions) > 0
        assert any("分析" in action or "指标" in action for action in actions)

    @pytest.mark.asyncio
    async def test_generate_suggested_actions_query_strategy(self):
        """测试生成建议操作 - 查询策略"""
        from src.api.endpoints.chat import _generate_suggested_actions

        actions = await _generate_suggested_actions(
            IntentType.QUERY_STRATEGY,
            {}
        )

        assert isinstance(actions, list)
        assert len(actions) > 0
