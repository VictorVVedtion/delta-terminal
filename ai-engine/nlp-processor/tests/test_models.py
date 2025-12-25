"""数据模型测试"""

import pytest
from pydantic import ValidationError

from src.models.schemas import (
    ChatRequest,
    IntentType,
    OrderType,
    StrategyAction,
    StrategyCondition,
    StrategyConfig,
    StrategyType,
    TimeFrame,
)


def test_chat_request_validation():
    """测试聊天请求验证"""
    # 有效请求
    request = ChatRequest(
        message="帮我创建一个策略",
        user_id="user123",
    )
    assert request.message == "帮我创建一个策略"
    assert request.user_id == "user123"
    assert request.conversation_id is None

    # 消息过长
    with pytest.raises(ValidationError):
        ChatRequest(message="a" * 3000, user_id="user123")

    # 消息为空
    with pytest.raises(ValidationError):
        ChatRequest(message="", user_id="user123")


def test_strategy_condition():
    """测试策略条件"""
    condition = StrategyCondition(
        indicator="RSI",
        operator=">",
        value=70,
        params={"period": 14},
    )
    assert condition.indicator == "RSI"
    assert condition.operator == ">"
    assert condition.value == 70


def test_strategy_action():
    """测试策略动作"""
    action = StrategyAction(
        action_type="buy",
        order_type=OrderType.MARKET,
        amount_percent=10.0,
    )
    assert action.action_type == "buy"
    assert action.order_type == OrderType.MARKET
    assert action.amount_percent == 10.0

    # 不能同时指定 amount 和 amount_percent
    with pytest.raises(ValidationError):
        StrategyAction(
            action_type="buy",
            order_type=OrderType.MARKET,
            amount=100.0,
            amount_percent=10.0,
        )


def test_strategy_config():
    """测试策略配置"""
    config = StrategyConfig(
        name="测试策略",
        strategy_type=StrategyType.GRID,
        symbol="BTC/USDT",
        timeframe=TimeFrame.H1,
        entry_conditions=[
            StrategyCondition(indicator="RSI", operator="<", value=30)
        ],
        entry_action=StrategyAction(
            action_type="buy",
            order_type=OrderType.MARKET,
            amount_percent=10.0,
        ),
    )

    assert config.name == "测试策略"
    assert config.strategy_type == StrategyType.GRID
    assert config.symbol == "BTC/USDT"
    assert len(config.entry_conditions) == 1

    # 交易对格式验证
    config2 = StrategyConfig(
        name="测试策略2",
        strategy_type=StrategyType.DCA,
        symbol="eth/usdt",  # 小写会被转换为大写
        timeframe=TimeFrame.M15,
        entry_conditions=[
            StrategyCondition(indicator="MACD", operator=">", value=0)
        ],
        entry_action=StrategyAction(
            action_type="buy",
            order_type=OrderType.LIMIT,
            amount=1.0,
            price=2000.0,
        ),
    )
    assert config2.symbol == "ETH/USDT"


def test_intent_type():
    """测试意图类型"""
    assert IntentType.CREATE_STRATEGY.value == "create_strategy"
    assert IntentType.ANALYZE_MARKET.value == "analyze_market"
    assert IntentType.UNKNOWN.value == "unknown"
