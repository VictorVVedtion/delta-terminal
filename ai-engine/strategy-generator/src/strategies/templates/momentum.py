"""
动量策略模板
"""

from typing import Optional
import statistics
from ...models.schemas import StrategyType, TradingSignal
from ..base import BaseStrategy, MarketData, StrategyFactory


@StrategyFactory.register(StrategyType.MOMENTUM)
class MomentumStrategy(BaseStrategy):
    """
    动量策略

    基于价格动量和趋势指标进行交易
    使用移动平均线和RSI等技术指标
    """

    def __init__(
        self,
        name: str,
        strategy_type: StrategyType,
        parameters: dict,
        description: str = "动量策略",
    ):
        super().__init__(name, strategy_type, parameters, description)

        # 动量参数
        self.fast_ma_period = parameters.get("fast_ma_period", 10)  # 快速移动平均线周期
        self.slow_ma_period = parameters.get("slow_ma_period", 20)  # 慢速移动平均线周期
        self.rsi_period = parameters.get("rsi_period", 14)  # RSI周期
        self.rsi_overbought = parameters.get("rsi_overbought", 70)  # RSI超买阈值
        self.rsi_oversold = parameters.get("rsi_oversold", 30)  # RSI超卖阈值
        self.momentum_threshold = parameters.get("momentum_threshold", 0.02)  # 动量阈值

        # 风险管理
        self.max_position_size = parameters.get("max_position_size", 0.1)
        self.stop_loss_percent = parameters.get("stop_loss_percent", 0.03)
        self.take_profit_percent = parameters.get("take_profit_percent", 0.06)

    def initialize(self) -> None:
        """初始化策略"""
        self.initialized = True

    def on_data(self, data: MarketData, historical_data: list[MarketData]) -> TradingSignal:
        """
        处理市场数据并生成交易信号

        Args:
            data: 最新市场数据
            historical_data: 历史数据

        Returns:
            交易信号
        """
        if not self.initialized:
            self.initialize()

        # 需要足够的历史数据
        min_data_points = max(self.slow_ma_period, self.rsi_period) + 1
        if len(historical_data) < min_data_points:
            return TradingSignal.HOLD

        # 计算技术指标
        fast_ma = self._calculate_sma(historical_data, self.fast_ma_period)
        slow_ma = self._calculate_sma(historical_data, self.slow_ma_period)
        rsi = self._calculate_rsi(historical_data, self.rsi_period)

        current_price = data.close

        # 生成交易信号
        signal = TradingSignal.HOLD

        # 买入条件: 快线上穿慢线 且 RSI不在超买区
        if fast_ma > slow_ma and rsi < self.rsi_overbought:
            # 检查动量是否足够强
            momentum = (fast_ma - slow_ma) / slow_ma
            if momentum > self.momentum_threshold:
                signal = TradingSignal.BUY

        # 卖出条件: 快线下穿慢线 或 RSI超买
        elif fast_ma < slow_ma or rsi > self.rsi_overbought:
            signal = TradingSignal.SELL

        return signal

    def calculate_position_size(
        self, signal: TradingSignal, current_price: float, account_balance: float
    ) -> float:
        """计算仓位大小"""
        if signal == TradingSignal.HOLD:
            return 0.0

        return account_balance * self.max_position_size

    def calculate_stop_loss(
        self, signal: TradingSignal, entry_price: float
    ) -> Optional[float]:
        """计算止损价格"""
        if signal == TradingSignal.BUY:
            return entry_price * (1 - self.stop_loss_percent)
        elif signal == TradingSignal.SELL:
            return entry_price * (1 + self.stop_loss_percent)
        return None

    def calculate_take_profit(
        self, signal: TradingSignal, entry_price: float
    ) -> Optional[float]:
        """计算止盈价格"""
        if signal == TradingSignal.BUY:
            return entry_price * (1 + self.take_profit_percent)
        elif signal == TradingSignal.SELL:
            return entry_price * (1 - self.take_profit_percent)
        return None

    @staticmethod
    def _calculate_sma(data: list[MarketData], period: int) -> float:
        """计算简单移动平均线"""
        if len(data) < period:
            return 0.0

        prices = [candle.close for candle in data[-period:]]
        return statistics.mean(prices)

    @staticmethod
    def _calculate_rsi(data: list[MarketData], period: int) -> float:
        """计算相对强弱指标 (RSI)"""
        if len(data) < period + 1:
            return 50.0  # 默认中性值

        # 计算价格变化
        price_changes = []
        for i in range(len(data) - period, len(data)):
            change = data[i].close - data[i - 1].close
            price_changes.append(change)

        # 分离涨跌
        gains = [max(change, 0) for change in price_changes]
        losses = [abs(min(change, 0)) for change in price_changes]

        # 计算平均涨跌
        avg_gain = statistics.mean(gains) if gains else 0.0
        avg_loss = statistics.mean(losses) if losses else 0.0

        if avg_loss == 0:
            return 100.0

        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))

        return rsi

    def to_python_code(self) -> str:
        """生成动量策略 Python 代码"""
        return f'''"""
动量策略
快速MA: {self.fast_ma_period}
慢速MA: {self.slow_ma_period}
RSI周期: {self.rsi_period}
"""

from typing import Optional
import statistics


class MomentumTradingStrategy:
    """动量策略实现"""

    def __init__(self):
        """初始化策略"""
        self.name = "{self.name}"
        self.fast_ma_period = {self.fast_ma_period}
        self.slow_ma_period = {self.slow_ma_period}
        self.rsi_period = {self.rsi_period}
        self.rsi_overbought = {self.rsi_overbought}
        self.rsi_oversold = {self.rsi_oversold}
        self.momentum_threshold = {self.momentum_threshold}

        # 风险管理
        self.max_position_size = {self.max_position_size}
        self.stop_loss_percent = {self.stop_loss_percent}
        self.take_profit_percent = {self.take_profit_percent}

    def on_data(self, data: dict, historical_data: list[dict]) -> str:
        """
        处理市场数据

        Args:
            data: 最新市场数据
            historical_data: 历史数据列表

        Returns:
            交易信号: "buy", "sell", "hold"
        """
        # 检查数据充足性
        min_data_points = max(self.slow_ma_period, self.rsi_period) + 1
        if len(historical_data) < min_data_points:
            return "hold"

        # 计算技术指标
        fast_ma = self._calculate_sma(historical_data, self.fast_ma_period)
        slow_ma = self._calculate_sma(historical_data, self.slow_ma_period)
        rsi = self._calculate_rsi(historical_data, self.rsi_period)

        # 生成信号
        if fast_ma > slow_ma and rsi < self.rsi_overbought:
            momentum = (fast_ma - slow_ma) / slow_ma
            if momentum > self.momentum_threshold:
                return "buy"
        elif fast_ma < slow_ma or rsi > self.rsi_overbought:
            return "sell"

        return "hold"

    def _calculate_sma(self, data: list[dict], period: int) -> float:
        """计算简单移动平均线"""
        if len(data) < period:
            return 0.0
        prices = [candle["close"] for candle in data[-period:]]
        return statistics.mean(prices)

    def _calculate_rsi(self, data: list[dict], period: int) -> float:
        """计算RSI"""
        if len(data) < period + 1:
            return 50.0

        price_changes = []
        for i in range(len(data) - period, len(data)):
            change = data[i]["close"] - data[i - 1]["close"]
            price_changes.append(change)

        gains = [max(change, 0) for change in price_changes]
        losses = [abs(min(change, 0)) for change in price_changes]

        avg_gain = statistics.mean(gains) if gains else 0.0
        avg_loss = statistics.mean(losses) if losses else 0.0

        if avg_loss == 0:
            return 100.0

        rs = avg_gain / avg_loss
        return 100 - (100 / (1 + rs))

    def calculate_position_size(
        self, signal: str, current_price: float, account_balance: float
    ) -> float:
        """计算仓位大小"""
        if signal == "hold":
            return 0.0
        return account_balance * self.max_position_size

    def calculate_stop_loss(self, signal: str, entry_price: float) -> Optional[float]:
        """计算止损价格"""
        if signal == "buy":
            return entry_price * (1 - self.stop_loss_percent)
        elif signal == "sell":
            return entry_price * (1 + self.stop_loss_percent)
        return None

    def calculate_take_profit(self, signal: str, entry_price: float) -> Optional[float]:
        """计算止盈价格"""
        if signal == "buy":
            return entry_price * (1 + self.take_profit_percent)
        elif signal == "sell":
            return entry_price * (1 - self.take_profit_percent)
        return None
'''
