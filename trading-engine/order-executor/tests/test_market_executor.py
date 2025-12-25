"""
市价单执行器测试
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime

from src.executor.market_executor import MarketOrderExecutor
from src.models.schemas import OrderCreateRequest, OrderSide, OrderType, TimeInForce


@pytest.fixture
async def executor():
    """创建执行器实例"""
    executor = MarketOrderExecutor("binance")
    executor.exchange = MagicMock()
    return executor


@pytest.mark.asyncio
async def test_market_order_execution(executor):
    """测试市价单执行"""
    # 准备测试数据
    order_request = OrderCreateRequest(
        strategy_id="test_strategy",
        exchange="binance",
        symbol="BTC/USDT",
        side=OrderSide.BUY,
        order_type=OrderType.MARKET,
        quantity=0.1,
        time_in_force=TimeInForce.GTC,
    )

    # Mock 交易所响应
    executor.exchange.create_market_order = AsyncMock(
        return_value={
            "id": "12345",
            "symbol": "BTC/USDT",
            "side": "buy",
            "type": "market",
            "amount": 0.1,
            "filled": 0.1,
            "average": 50000.0,
            "status": "closed",
            "timestamp": datetime.utcnow().timestamp() * 1000,
        }
    )

    executor._fetch_ticker = AsyncMock(return_value={"last": 50000.0})
    executor._fetch_order = AsyncMock(
        return_value={
            "id": "12345",
            "status": "closed",
            "filled": 0.1,
            "average": 50000.0,
        }
    )

    # 执行订单
    result = await executor.execute(order_request)

    # 验证结果
    assert result.status.value in ["filled", "submitted"]
    assert result.symbol == "BTC/USDT"
    assert result.quantity == 0.1


@pytest.mark.asyncio
async def test_slippage_calculation(executor):
    """测试滑点计算"""
    # 买入滑点 (实际价格高于期望)
    slippage_buy = executor._calculate_slippage(
        expected_price=50000.0, actual_price=50100.0, side="buy"
    )
    assert slippage_buy > 0  # 正滑点(不利)

    # 卖出滑点 (实际价格低于期望)
    slippage_sell = executor._calculate_slippage(
        expected_price=50000.0, actual_price=49900.0, side="sell"
    )
    assert slippage_sell > 0  # 正滑点(不利)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
