"""
定投策略模板 (Dollar Cost Averaging)
"""

from typing import Optional
from datetime import datetime, timedelta
from ...models.schemas import StrategyType, TradingSignal
from ..base import BaseStrategy, MarketData, StrategyFactory


@StrategyFactory.register(StrategyType.DCA)
class DCAStrategy(BaseStrategy):
    """
    定投策略 (Dollar Cost Averaging)

    定期以固定金额购买资产，不考虑价格波动
    可选择在价格下跌时增加投资额度
    """

    def __init__(
        self,
        name: str,
        strategy_type: StrategyType,
        parameters: dict,
        description: str = "定投策略",
    ):
        super().__init__(name, strategy_type, parameters, description)

        # 定投参数
        self.investment_amount = parameters.get("investment_amount", 100.0)  # 每次投资金额
        self.interval_hours = parameters.get("interval_hours", 24)  # 投资间隔(小时)
        self.buy_on_dip = parameters.get("buy_on_dip", False)  # 是否在下跌时加倍
        self.dip_threshold = parameters.get("dip_threshold", -0.05)  # 下跌阈值 (-5%)
        self.dip_multiplier = parameters.get("dip_multiplier", 2.0)  # 下跌时的倍数

        # 内部状态
        self.last_investment_time: Optional[datetime] = None
        self.last_price: Optional[float] = None

    def initialize(self) -> None:
        """初始化策略"""
        self.initialized = True
        self.last_investment_time = None
        self.last_price = None

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

        current_time = data.timestamp
        current_price = data.close

        # 首次运行，直接买入
        if self.last_investment_time is None:
            self.last_investment_time = current_time
            self.last_price = current_price
            return TradingSignal.BUY

        # 检查是否到了定投时间
        time_since_last_investment = current_time - self.last_investment_time
        interval_delta = timedelta(hours=self.interval_hours)

        if time_since_last_investment >= interval_delta:
            self.last_investment_time = current_time
            self.last_price = current_price
            return TradingSignal.BUY

        # 如果启用了逢低加仓
        if self.buy_on_dip and self.last_price is not None:
            price_change = (current_price - self.last_price) / self.last_price

            if price_change <= self.dip_threshold:
                # 价格下跌超过阈值，触发加仓
                self.last_price = current_price
                return TradingSignal.BUY

        return TradingSignal.HOLD

    def calculate_position_size(
        self, signal: TradingSignal, current_price: float, account_balance: float
    ) -> float:
        """计算仓位大小"""
        if signal == TradingSignal.HOLD:
            return 0.0

        # 基础投资金额
        investment = min(self.investment_amount, account_balance * 0.1)  # 最多使用10%余额

        # 检查是否是逢低加仓
        if self.buy_on_dip and self.last_price is not None:
            price_change = (current_price - self.last_price) / self.last_price
            if price_change <= self.dip_threshold:
                investment *= self.dip_multiplier
                investment = min(investment, account_balance * 0.2)  # 加仓最多20%

        return investment / current_price  # 转换为数量

    def calculate_stop_loss(
        self, signal: TradingSignal, entry_price: float
    ) -> Optional[float]:
        """计算止损价格"""
        # 定投策略通常不使用止损
        # 但可以设置一个极端情况的保护性止损
        emergency_stop_loss = self.parameters.get("emergency_stop_loss_percent", 0.5)
        if emergency_stop_loss > 0:
            return entry_price * (1 - emergency_stop_loss)
        return None

    def calculate_take_profit(
        self, signal: TradingSignal, entry_price: float
    ) -> Optional[float]:
        """计算止盈价格"""
        # 定投策略通常不设置止盈，而是长期持有
        return None

    def to_python_code(self) -> str:
        """生成定投策略 Python 代码"""
        return f'''"""
定投策略 (Dollar Cost Averaging)
投资金额: ${self.investment_amount}
投资间隔: {self.interval_hours} 小时
逢低加仓: {"启用" if self.buy_on_dip else "禁用"}
"""

from typing import Optional
from datetime import datetime, timedelta


class DCAStrategy:
    """定投策略实现"""

    def __init__(self):
        """初始化策略"""
        self.name = "{self.name}"
        self.investment_amount = {self.investment_amount}
        self.interval_hours = {self.interval_hours}
        self.buy_on_dip = {self.buy_on_dip}
        self.dip_threshold = {self.dip_threshold}
        self.dip_multiplier = {self.dip_multiplier}

        # 状态跟踪
        self.last_investment_time = None
        self.last_price = None

    def on_data(self, data: dict, historical_data: list[dict]) -> str:
        """
        处理市场数据

        Args:
            data: 最新市场数据 {{"timestamp": ..., "close": ...}}
            historical_data: 历史数据列表

        Returns:
            交易信号: "buy", "sell", "hold"
        """
        current_time = datetime.fromisoformat(data["timestamp"])
        current_price = data["close"]

        # 首次运行
        if self.last_investment_time is None:
            self.last_investment_time = current_time
            self.last_price = current_price
            return "buy"

        # 检查定投间隔
        time_since_last = current_time - self.last_investment_time
        if time_since_last >= timedelta(hours=self.interval_hours):
            self.last_investment_time = current_time
            self.last_price = current_price
            return "buy"

        # 逢低加仓检查
        if self.buy_on_dip and self.last_price is not None:
            price_change = (current_price - self.last_price) / self.last_price
            if price_change <= self.dip_threshold:
                self.last_price = current_price
                return "buy"

        return "hold"

    def calculate_position_size(
        self, signal: str, current_price: float, account_balance: float
    ) -> float:
        """计算仓位大小"""
        if signal == "hold":
            return 0.0

        # 基础投资金额
        investment = min(self.investment_amount, account_balance * 0.1)

        # 逢低加仓倍数
        if self.buy_on_dip and self.last_price is not None:
            price_change = (current_price - self.last_price) / self.last_price
            if price_change <= self.dip_threshold:
                investment *= self.dip_multiplier
                investment = min(investment, account_balance * 0.2)

        return investment / current_price

    def calculate_stop_loss(self, signal: str, entry_price: float) -> Optional[float]:
        """计算止损价格"""
        # 定投策略通常不设置止损
        return None

    def calculate_take_profit(self, signal: str, entry_price: float) -> Optional[float]:
        """计算止盈价格"""
        # 定投策略长期持有，不设置止盈
        return None
'''
