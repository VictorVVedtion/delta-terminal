"""
策略模板测试
"""

import pytest
from datetime import datetime
from src.strategies.templates import GridStrategy, DCAStrategy, MomentumStrategy
from src.strategies.base import MarketData
from src.models.schemas import StrategyType, TradingSignal


@pytest.fixture
def sample_market_data():
    """示例市场数据"""
    return [
        MarketData(
            timestamp=datetime.now(),
            open=40000.0,
            high=41000.0,
            low=39000.0,
            close=40500.0,
            volume=100.0,
        )
        for _ in range(50)
    ]


class TestGridStrategy:
    """网格策略测试"""

    def test_initialization(self):
        """测试初始化"""
        strategy = GridStrategy(
            name="测试网格策略",
            strategy_type=StrategyType.GRID,
            parameters={
                "lower_price": 30000.0,
                "upper_price": 50000.0,
                "grid_count": 10,
                "position_per_grid": 0.01,
            },
        )

        strategy.initialize()

        assert strategy.initialized is True
        assert len(strategy.buy_grids) == 11
        assert len(strategy.sell_grids) == 10

    def test_signal_generation(self, sample_market_data):
        """测试信号生成"""
        strategy = GridStrategy(
            name="网格策略",
            strategy_type=StrategyType.GRID,
            parameters={
                "lower_price": 30000.0,
                "upper_price": 50000.0,
                "grid_count": 10,
            },
        )

        signal = strategy.on_data(sample_market_data[-1], sample_market_data)
        assert signal in [TradingSignal.BUY, TradingSignal.SELL, TradingSignal.HOLD]

    def test_position_sizing(self):
        """测试仓位计算"""
        strategy = GridStrategy(
            name="网格策略",
            strategy_type=StrategyType.GRID,
            parameters={"position_per_grid": 0.01},
        )

        position_size = strategy.calculate_position_size(
            TradingSignal.BUY, 40000.0, 10000.0
        )

        assert position_size == 100.0  # 10000 * 0.01


class TestDCAStrategy:
    """定投策略测试"""

    def test_initialization(self):
        """测试初始化"""
        strategy = DCAStrategy(
            name="定投策略",
            strategy_type=StrategyType.DCA,
            parameters={
                "investment_amount": 100.0,
                "interval_hours": 24,
                "buy_on_dip": True,
            },
        )

        strategy.initialize()
        assert strategy.initialized is True

    def test_first_signal(self, sample_market_data):
        """测试首次信号"""
        strategy = DCAStrategy(
            name="定投策略",
            strategy_type=StrategyType.DCA,
            parameters={"investment_amount": 100.0},
        )

        # 首次运行应该返回买入信号
        signal = strategy.on_data(sample_market_data[0], [])
        assert signal == TradingSignal.BUY


class TestMomentumStrategy:
    """动量策略测试"""

    def test_initialization(self):
        """测试初始化"""
        strategy = MomentumStrategy(
            name="动量策略",
            strategy_type=StrategyType.MOMENTUM,
            parameters={
                "fast_ma_period": 10,
                "slow_ma_period": 20,
                "rsi_period": 14,
            },
        )

        strategy.initialize()
        assert strategy.initialized is True

    def test_insufficient_data(self):
        """测试数据不足的情况"""
        strategy = MomentumStrategy(
            name="动量策略",
            strategy_type=StrategyType.MOMENTUM,
            parameters={"slow_ma_period": 20},
        )

        # 数据不足应返回HOLD
        few_data = [
            MarketData(
                timestamp=datetime.now(),
                open=40000.0,
                high=41000.0,
                low=39000.0,
                close=40000.0,
                volume=100.0,
            )
            for _ in range(5)
        ]

        signal = strategy.on_data(few_data[-1], few_data)
        assert signal == TradingSignal.HOLD

    def test_stop_loss_calculation(self):
        """测试止损计算"""
        strategy = MomentumStrategy(
            name="动量策略",
            strategy_type=StrategyType.MOMENTUM,
            parameters={"stop_loss_percent": 0.03},
        )

        stop_loss = strategy.calculate_stop_loss(TradingSignal.BUY, 40000.0)
        assert stop_loss == 38800.0  # 40000 * (1 - 0.03)

    def test_take_profit_calculation(self):
        """测试止盈计算"""
        strategy = MomentumStrategy(
            name="动量策略",
            strategy_type=StrategyType.MOMENTUM,
            parameters={"take_profit_percent": 0.06},
        )

        take_profit = strategy.calculate_take_profit(TradingSignal.BUY, 40000.0)
        assert take_profit == 42400.0  # 40000 * (1 + 0.06)
