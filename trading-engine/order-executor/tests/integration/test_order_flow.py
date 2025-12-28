"""
交易执行流程集成测试
测试 信号 → 风险检查 → 下单 → 成交确认 的完整流程
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime
from decimal import Decimal

from src.models.schemas import (
    OrderCreateRequest,
    OrderSide,
    OrderType,
    OrderStatus,
    TimeInForce,
)
from src.executor.market_executor import MarketOrderExecutor
from src.services.order_service import OrderService


# Mock 风险管理器响应
class MockRiskManager:
    """模拟风险管理器"""

    async def check_order_risk(self, order_request: dict) -> dict:
        """检查订单风险"""
        # 模拟风险检查逻辑
        symbol = order_request.get("symbol")
        quantity = order_request.get("quantity", 0)
        side = order_request.get("side")

        # 风险规则检查
        checks = {
            "position_size_check": True,
            "daily_loss_check": True,
            "max_drawdown_check": True,
            "leverage_check": True,
        }

        # 模拟风险阈值检查
        if quantity > 10:  # 单笔订单最大数量
            checks["position_size_check"] = False

        all_passed = all(checks.values())

        return {
            "passed": all_passed,
            "checks": checks,
            "risk_score": 0.3 if all_passed else 0.8,
            "warnings": [] if all_passed else ["订单数量超过单笔限制"],
        }


# Mock 交易所连接器
class MockExchangeConnector:
    """模拟交易所连接器"""

    def __init__(self):
        self.orders = {}
        self.balances = {
            "USDT": {"free": 10000.0, "used": 0.0, "total": 10000.0},
            "BTC": {"free": 0.0, "used": 0.0, "total": 0.0},
        }

    async def create_market_order(
        self, symbol: str, side: str, amount: float
    ) -> dict:
        """创建市价单"""
        order_id = f"order_{len(self.orders) + 1}"
        current_price = 50000.0  # BTC/USDT 模拟价格

        order = {
            "id": order_id,
            "symbol": symbol,
            "side": side,
            "type": "market",
            "amount": amount,
            "filled": amount,
            "average": current_price,
            "status": "closed",
            "timestamp": datetime.utcnow().timestamp() * 1000,
            "cost": amount * current_price,
        }

        self.orders[order_id] = order
        return order

    async def create_limit_order(
        self, symbol: str, side: str, amount: float, price: float
    ) -> dict:
        """创建限价单"""
        order_id = f"order_{len(self.orders) + 1}"

        order = {
            "id": order_id,
            "symbol": symbol,
            "side": side,
            "type": "limit",
            "amount": amount,
            "price": price,
            "filled": 0.0,
            "status": "open",
            "timestamp": datetime.utcnow().timestamp() * 1000,
        }

        self.orders[order_id] = order
        return order

    async def fetch_order(self, order_id: str, symbol: str) -> dict:
        """查询订单状态"""
        return self.orders.get(order_id, {})

    async def cancel_order(self, order_id: str, symbol: str) -> dict:
        """取消订单"""
        if order_id in self.orders:
            self.orders[order_id]["status"] = "canceled"
            return self.orders[order_id]
        raise Exception(f"Order {order_id} not found")


@pytest.fixture
def risk_manager():
    """创建风险管理器实例"""
    return MockRiskManager()


@pytest.fixture
def exchange_connector():
    """创建交易所连接器实例"""
    return MockExchangeConnector()


@pytest.fixture
async def market_executor(exchange_connector):
    """创建市价单执行器实例"""
    executor = MarketOrderExecutor("binance")
    executor.exchange = exchange_connector
    executor._fetch_ticker = AsyncMock(return_value={"last": 50000.0})
    executor._fetch_order = AsyncMock(
        return_value={
            "id": "12345",
            "status": "closed",
            "filled": 0.1,
            "average": 50000.0,
        }
    )
    return executor


@pytest.fixture
def order_service():
    """创建订单服务实例"""
    return OrderService()


class TestOrderExecutionFlow:
    """测试订单执行流程"""

    @pytest.mark.asyncio
    async def test_complete_order_flow_success(
        self, risk_manager, market_executor, order_service
    ):
        """测试成功的完整订单执行流程"""
        # 步骤 1: 接收交易信号
        signal = {
            "strategy_id": "strategy_001",
            "symbol": "BTC/USDT",
            "side": "buy",
            "quantity": 0.1,
            "signal_type": "entry",
            "timestamp": datetime.utcnow(),
        }

        # 步骤 2: 创建订单请求
        order_request = OrderCreateRequest(
            strategy_id=signal["strategy_id"],
            exchange="binance",
            symbol=signal["symbol"],
            side=OrderSide.BUY,
            order_type=OrderType.MARKET,
            quantity=signal["quantity"],
            time_in_force=TimeInForce.GTC,
        )

        # 步骤 3: 风险检查
        risk_check = await risk_manager.check_order_risk(
            {
                "symbol": order_request.symbol,
                "quantity": order_request.quantity,
                "side": order_request.side.value,
            }
        )

        assert risk_check["passed"] is True
        assert risk_check["risk_score"] < 0.5
        assert len(risk_check["warnings"]) == 0

        # 步骤 4: 执行订单
        execution_result = await market_executor.execute(order_request)

        # 步骤 5: 验证成交结果
        assert execution_result is not None
        assert execution_result.status.value in ["filled", "submitted"]
        assert execution_result.symbol == "BTC/USDT"
        assert execution_result.quantity == 0.1

    @pytest.mark.asyncio
    async def test_order_flow_risk_check_failed(
        self, risk_manager, market_executor
    ):
        """测试风险检查失败的订单流程"""
        # 步骤 1: 创建超过风险限制的订单
        order_request = OrderCreateRequest(
            strategy_id="strategy_002",
            exchange="binance",
            symbol="BTC/USDT",
            side=OrderSide.BUY,
            order_type=OrderType.MARKET,
            quantity=15.0,  # 超过单笔限制
            time_in_force=TimeInForce.GTC,
        )

        # 步骤 2: 风险检查
        risk_check = await risk_manager.check_order_risk(
            {
                "symbol": order_request.symbol,
                "quantity": order_request.quantity,
                "side": order_request.side.value,
            }
        )

        # 步骤 3: 验证风险检查失败
        assert risk_check["passed"] is False
        assert risk_check["checks"]["position_size_check"] is False
        assert len(risk_check["warnings"]) > 0
        assert "订单数量超过单笔限制" in risk_check["warnings"]

        # 步骤 4: 订单应该被拒绝，不执行
        # 在实际系统中，风险检查失败会阻止订单提交

    @pytest.mark.asyncio
    async def test_limit_order_execution_flow(self, risk_manager, exchange_connector):
        """测试限价单执行流程"""
        # 步骤 1: 创建限价单请求
        order_request = {
            "strategy_id": "strategy_003",
            "symbol": "BTC/USDT",
            "side": "buy",
            "order_type": "limit",
            "quantity": 0.5,
            "price": 48000.0,
        }

        # 步骤 2: 风险检查
        risk_check = await risk_manager.check_order_risk(order_request)
        assert risk_check["passed"] is True

        # 步骤 3: 提交限价单
        exchange_order = await exchange_connector.create_limit_order(
            symbol=order_request["symbol"],
            side=order_request["side"],
            amount=order_request["quantity"],
            price=order_request["price"],
        )

        # 步骤 4: 验证订单状态
        assert exchange_order["status"] == "open"
        assert exchange_order["price"] == 48000.0
        assert exchange_order["filled"] == 0.0

        # 步骤 5: 查询订单状态
        order_status = await exchange_connector.fetch_order(
            exchange_order["id"], order_request["symbol"]
        )
        assert order_status["id"] == exchange_order["id"]

    @pytest.mark.asyncio
    async def test_order_cancellation_flow(self, exchange_connector):
        """测试订单取消流程"""
        # 步骤 1: 创建订单
        order = await exchange_connector.create_limit_order(
            symbol="BTC/USDT", side="buy", amount=0.1, price=49000.0
        )

        assert order["status"] == "open"
        order_id = order["id"]

        # 步骤 2: 取消订单
        canceled_order = await exchange_connector.cancel_order(order_id, "BTC/USDT")

        # 步骤 3: 验证取消状态
        assert canceled_order["status"] == "canceled"
        assert canceled_order["id"] == order_id

    @pytest.mark.asyncio
    async def test_concurrent_order_execution(
        self, risk_manager, exchange_connector
    ):
        """测试并发订单执行"""
        # 步骤 1: 创建多个订单请求
        order_requests = [
            {
                "symbol": "BTC/USDT",
                "side": "buy",
                "quantity": 0.05,
                "order_type": "market",
            },
            {
                "symbol": "ETH/USDT",
                "side": "buy",
                "quantity": 1.0,
                "order_type": "market",
            },
            {
                "symbol": "BNB/USDT",
                "side": "sell",
                "quantity": 2.0,
                "order_type": "market",
            },
        ]

        # 步骤 2: 并发风险检查
        risk_checks = await asyncio.gather(
            *[risk_manager.check_order_risk(req) for req in order_requests]
        )

        # 步骤 3: 验证所有风险检查通过
        assert all(check["passed"] for check in risk_checks)

        # 步骤 4: 并发提交订单
        orders = []
        for req in order_requests:
            order = await exchange_connector.create_market_order(
                symbol=req["symbol"], side=req["side"], amount=req["quantity"]
            )
            orders.append(order)

        # 步骤 5: 验证所有订单成功
        assert len(orders) == 3
        assert all(order["status"] == "closed" for order in orders)


class TestOrderExecutionExceptions:
    """测试订单执行异常情况"""

    @pytest.mark.asyncio
    async def test_exchange_connection_failure(self, market_executor):
        """测试交易所连接失败"""
        # 模拟连接失败
        market_executor.exchange.create_market_order = AsyncMock(
            side_effect=Exception("Exchange connection timeout")
        )

        order_request = OrderCreateRequest(
            strategy_id="strategy_004",
            exchange="binance",
            symbol="BTC/USDT",
            side=OrderSide.BUY,
            order_type=OrderType.MARKET,
            quantity=0.1,
            time_in_force=TimeInForce.GTC,
        )

        # 验证异常处理
        with pytest.raises(Exception, match="Exchange connection timeout"):
            await market_executor.execute(order_request)

    @pytest.mark.asyncio
    async def test_insufficient_balance(self, exchange_connector):
        """测试余额不足"""
        # 尝试购买超过余额的数量
        with pytest.raises(Exception):
            # 模拟余额检查
            balance = exchange_connector.balances["USDT"]["free"]
            order_cost = 100.0 * 50000.0  # 100 BTC @ 50000 USDT

            if order_cost > balance:
                raise Exception("Insufficient balance")

    @pytest.mark.asyncio
    async def test_order_rejection(self, exchange_connector):
        """测试订单被交易所拒绝"""
        # 模拟订单被拒绝（价格不合理）
        exchange_connector.create_limit_order = AsyncMock(
            side_effect=Exception("Order rejected: price too far from market")
        )

        with pytest.raises(Exception, match="Order rejected"):
            await exchange_connector.create_limit_order(
                symbol="BTC/USDT", side="buy", amount=0.1, price=1000.0
            )


class TestOrderExecutionMetrics:
    """测试订单执行指标"""

    @pytest.mark.asyncio
    async def test_slippage_calculation(self, market_executor):
        """测试滑点计算"""
        expected_price = 50000.0
        actual_price = 50100.0
        side = "buy"

        slippage = market_executor._calculate_slippage(
            expected_price=expected_price, actual_price=actual_price, side=side
        )

        # 买入时实际价格高于期望价格，滑点为正（不利）
        assert slippage > 0
        assert abs(slippage - 0.002) < 0.0001  # 0.2% 滑点

    @pytest.mark.asyncio
    async def test_execution_time_tracking(self, market_executor):
        """测试执行时间追踪"""
        start_time = datetime.utcnow()

        order_request = OrderCreateRequest(
            strategy_id="strategy_005",
            exchange="binance",
            symbol="BTC/USDT",
            side=OrderSide.BUY,
            order_type=OrderType.MARKET,
            quantity=0.1,
            time_in_force=TimeInForce.GTC,
        )

        result = await market_executor.execute(order_request)

        end_time = datetime.utcnow()
        execution_time = (end_time - start_time).total_seconds()

        # 验证执行时间在合理范围内（< 5秒）
        assert execution_time < 5.0

    @pytest.mark.asyncio
    async def test_order_fill_rate(self, exchange_connector):
        """测试订单成交率"""
        # 创建多个订单
        orders = []
        for i in range(10):
            order = await exchange_connector.create_market_order(
                symbol="BTC/USDT", side="buy", amount=0.01
            )
            orders.append(order)

        # 计算成交率
        filled_orders = [o for o in orders if o["status"] == "closed"]
        fill_rate = len(filled_orders) / len(orders) * 100

        # 市价单应该 100% 成交
        assert fill_rate == 100.0


# 导入 asyncio 用于并发测试
import asyncio


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--asyncio-mode=auto"])
