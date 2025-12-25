"""回测引擎测试"""
import pytest
from datetime import datetime, timedelta
import pandas as pd

from src.models.schemas import BacktestConfig
from src.engine.backtest_engine import BacktestEngine
from src.engine.event_engine import SignalEvent


def test_backtest_engine_initialization():
    """测试回测引擎初始化"""
    config = BacktestConfig(
        strategy_id="test_strategy",
        symbols=["BTCUSDT"],
        start_date=datetime(2024, 1, 1),
        end_date=datetime(2024, 1, 31),
        initial_capital=100000.0
    )

    engine = BacktestEngine(config)

    assert engine.config == config
    assert engine.portfolio.initial_capital == 100000.0
    assert engine.backtest_id is not None


def test_simple_buy_hold_strategy():
    """测试简单买入持有策略"""

    def buy_hold_strategy(event, data_handler, portfolio):
        """第一根K线买入"""
        signals = []
        for symbol in event.data.keys():
            recent_data = data_handler.get_latest_data(symbol, n=2)
            if recent_data is not None and len(recent_data) == 1:
                signals.append(
                    SignalEvent(
                        timestamp=event.timestamp,
                        symbol=symbol,
                        signal_type='buy',
                        strength=1.0
                    )
                )
        return signals

    config = BacktestConfig(
        strategy_id="buy_hold",
        symbols=["BTCUSDT"],
        start_date=datetime(2024, 1, 1),
        end_date=datetime(2024, 1, 10),
        initial_capital=100000.0
    )

    engine = BacktestEngine(config)
    engine.set_strategy(buy_hold_strategy)

    result = engine.run(data_source="mock")

    assert result.status == "completed"
    assert result.metrics.total_trades >= 0
    assert len(result.equity_curve) > 0


def test_performance_metrics():
    """测试性能指标计算"""

    def simple_strategy(event, data_handler, portfolio):
        return []

    config = BacktestConfig(
        strategy_id="test",
        symbols=["BTCUSDT"],
        start_date=datetime(2024, 1, 1),
        end_date=datetime(2024, 1, 31),
        initial_capital=100000.0
    )

    engine = BacktestEngine(config)
    engine.set_strategy(simple_strategy)

    result = engine.run(data_source="mock")

    # 验证指标存在
    assert hasattr(result.metrics, 'total_return')
    assert hasattr(result.metrics, 'sharpe_ratio')
    assert hasattr(result.metrics, 'max_drawdown')
    assert hasattr(result.metrics, 'win_rate')


def test_multi_symbol_backtest():
    """测试多品种回测"""

    def dummy_strategy(event, data_handler, portfolio):
        return []

    config = BacktestConfig(
        strategy_id="multi_symbol",
        symbols=["BTCUSDT", "ETHUSDT", "BNBUSDT"],
        start_date=datetime(2024, 1, 1),
        end_date=datetime(2024, 1, 10),
        initial_capital=100000.0
    )

    engine = BacktestEngine(config)
    engine.set_strategy(dummy_strategy)

    result = engine.run(data_source="mock")

    assert result.status == "completed"
    assert len(engine.data_handler.symbols) == 3


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
