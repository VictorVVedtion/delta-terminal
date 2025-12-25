"""
风控规则单元测试
"""
import pytest
from src.rules.position_limit import PositionLimitRule
from src.rules.order_size_limit import OrderSizeLimitRule
from src.rules.daily_loss_limit import DailyLossLimitRule
from src.rules.drawdown_limit import DrawdownLimitRule
from src.models.schemas import RiskLevel


class TestPositionLimitRule:
    """持仓限制规则测试"""

    @pytest.mark.asyncio
    async def test_position_within_limit(self):
        """测试持仓在限制内"""
        rule = PositionLimitRule(
            max_position_size_usdt=100000.0,
            max_total_position_usdt=500000.0,
            max_concentration=0.3
        )

        context = {
            "current_position_usdt": 50000.0,
            "total_position_usdt": 200000.0,
            "new_order_value_usdt": 10000.0,
            "symbol": "BTCUSDT"
        }

        passed, reason, risk_level = await rule.execute_check(context)
        assert passed is True
        assert reason is None

    @pytest.mark.asyncio
    async def test_position_exceeds_limit(self):
        """测试持仓超过限制"""
        rule = PositionLimitRule(
            max_position_size_usdt=100000.0,
            max_total_position_usdt=500000.0
        )

        context = {
            "current_position_usdt": 95000.0,
            "total_position_usdt": 200000.0,
            "new_order_value_usdt": 10000.0,
            "symbol": "BTCUSDT"
        }

        passed, reason, risk_level = await rule.execute_check(context)
        assert passed is False
        assert "Position size limit exceeded" in reason
        assert risk_level == RiskLevel.HIGH

    @pytest.mark.asyncio
    async def test_concentration_exceeds_limit(self):
        """测试持仓集中度超限"""
        rule = PositionLimitRule(
            max_position_size_usdt=100000.0,
            max_total_position_usdt=500000.0,
            max_concentration=0.3
        )

        context = {
            "current_position_usdt": 80000.0,
            "total_position_usdt": 200000.0,
            "new_order_value_usdt": 10000.0,
            "symbol": "BTCUSDT"
        }

        passed, reason, risk_level = await rule.execute_check(context)
        assert passed is False
        assert "concentration" in reason.lower()


class TestOrderSizeLimitRule:
    """订单大小限制规则测试"""

    @pytest.mark.asyncio
    async def test_order_within_limit(self):
        """测试订单在限制内"""
        rule = OrderSizeLimitRule(
            max_order_size_usdt=50000.0,
            min_order_size_usdt=10.0
        )

        context = {
            "order_value_usdt": 25000.0,
            "symbol": "BTCUSDT",
            "side": "buy"
        }

        passed, reason, risk_level = await rule.execute_check(context)
        assert passed is True
        assert reason is None

    @pytest.mark.asyncio
    async def test_order_too_large(self):
        """测试订单过大"""
        rule = OrderSizeLimitRule(max_order_size_usdt=50000.0)

        context = {
            "order_value_usdt": 60000.0,
            "symbol": "BTCUSDT",
            "side": "buy"
        }

        passed, reason, risk_level = await rule.execute_check(context)
        assert passed is False
        assert "too large" in reason.lower()

    @pytest.mark.asyncio
    async def test_order_too_small(self):
        """测试订单过小"""
        rule = OrderSizeLimitRule(min_order_size_usdt=10.0)

        context = {
            "order_value_usdt": 5.0,
            "symbol": "BTCUSDT",
            "side": "buy"
        }

        passed, reason, risk_level = await rule.execute_check(context)
        assert passed is False
        assert "too small" in reason.lower()


class TestDailyLossLimitRule:
    """日损失限制规则测试"""

    @pytest.mark.asyncio
    async def test_profitable_day(self):
        """测试盈利日"""
        rule = DailyLossLimitRule(
            max_daily_loss_usdt=10000.0,
            max_daily_loss_percentage=0.05
        )

        context = {
            "daily_pnl": 5000.0,  # 盈利
            "initial_equity": 100000.0,
            "user_id": "user123"
        }

        passed, reason, risk_level = await rule.execute_check(context)
        assert passed is True
        assert risk_level == RiskLevel.LOW

    @pytest.mark.asyncio
    async def test_loss_within_limit(self):
        """测试亏损在限制内"""
        rule = DailyLossLimitRule(
            max_daily_loss_usdt=10000.0,
            max_daily_loss_percentage=0.05
        )

        context = {
            "daily_pnl": -3000.0,
            "initial_equity": 100000.0,
            "user_id": "user123"
        }

        passed, reason, risk_level = await rule.execute_check(context)
        assert passed is True

    @pytest.mark.asyncio
    async def test_loss_exceeds_absolute_limit(self):
        """测试亏损超过绝对限制"""
        rule = DailyLossLimitRule(
            max_daily_loss_usdt=10000.0,
            max_daily_loss_percentage=0.05
        )

        context = {
            "daily_pnl": -12000.0,
            "initial_equity": 100000.0,
            "user_id": "user123"
        }

        passed, reason, risk_level = await rule.execute_check(context)
        assert passed is False
        assert risk_level == RiskLevel.CRITICAL

    @pytest.mark.asyncio
    async def test_loss_exceeds_percentage_limit(self):
        """测试亏损超过百分比限制"""
        rule = DailyLossLimitRule(
            max_daily_loss_usdt=10000.0,
            max_daily_loss_percentage=0.05
        )

        context = {
            "daily_pnl": -6000.0,
            "initial_equity": 100000.0,
            "user_id": "user123"
        }

        passed, reason, risk_level = await rule.execute_check(context)
        assert passed is False
        assert risk_level == RiskLevel.CRITICAL


class TestDrawdownLimitRule:
    """回撤限制规则测试"""

    @pytest.mark.asyncio
    async def test_no_drawdown(self):
        """测试无回撤"""
        rule = DrawdownLimitRule(max_drawdown_percentage=0.15)

        context = {
            "current_equity": 110000.0,
            "peak_equity": 100000.0,
            "user_id": "user123"
        }

        passed, reason, risk_level = await rule.execute_check(context)
        assert passed is True
        assert risk_level == RiskLevel.LOW

    @pytest.mark.asyncio
    async def test_drawdown_within_limit(self):
        """测试回撤在限制内"""
        rule = DrawdownLimitRule(max_drawdown_percentage=0.15)

        context = {
            "current_equity": 92000.0,
            "peak_equity": 100000.0,
            "user_id": "user123"
        }

        passed, reason, risk_level = await rule.execute_check(context)
        assert passed is True

    @pytest.mark.asyncio
    async def test_drawdown_exceeds_limit(self):
        """测试回撤超过限制"""
        rule = DrawdownLimitRule(max_drawdown_percentage=0.15)

        context = {
            "current_equity": 80000.0,
            "peak_equity": 100000.0,
            "user_id": "user123"
        }

        passed, reason, risk_level = await rule.execute_check(context)
        assert passed is False
        assert "drawdown exceeded" in reason.lower()
        assert risk_level == RiskLevel.CRITICAL
