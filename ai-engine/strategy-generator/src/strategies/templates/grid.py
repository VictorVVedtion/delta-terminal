"""
网格交易策略模板
"""

from typing import Optional
from ...models.schemas import StrategyType, TradingSignal
from ..base import BaseStrategy, MarketData, StrategyFactory


@StrategyFactory.register(StrategyType.GRID)
class GridStrategy(BaseStrategy):
    """
    网格交易策略

    在价格范围内设置多个买入和卖出网格
    当价格触及买入网格时买入，触及卖出网格时卖出
    """

    def __init__(
        self,
        name: str,
        strategy_type: StrategyType,
        parameters: dict,
        description: str = "网格交易策略",
    ):
        super().__init__(name, strategy_type, parameters, description)

        # 网格参数
        self.lower_price = parameters.get("lower_price", 30000.0)
        self.upper_price = parameters.get("upper_price", 50000.0)
        self.grid_count = parameters.get("grid_count", 10)
        self.position_per_grid = parameters.get("position_per_grid", 0.01)

        # 内部状态
        self.buy_grids: list[float] = []
        self.sell_grids: list[float] = []
        self.current_grid_positions: dict[float, bool] = {}

    def initialize(self) -> None:
        """初始化网格"""
        if self.initialized:
            return

        # 计算网格间距
        grid_step = (self.upper_price - self.lower_price) / self.grid_count

        # 生成买入和卖出网格
        for i in range(self.grid_count + 1):
            grid_price = self.lower_price + (i * grid_step)
            self.buy_grids.append(grid_price)

            if i > 0:  # 卖出网格从第二个开始
                self.sell_grids.append(grid_price)

            self.current_grid_positions[grid_price] = False

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

        current_price = data.close

        # 检查价格是否在网格范围内
        if current_price < self.lower_price or current_price > self.upper_price:
            return TradingSignal.HOLD

        # 查找最近的买入网格
        for buy_grid in self.buy_grids:
            if (
                abs(current_price - buy_grid) < (self.upper_price - self.lower_price) * 0.005
            ):  # 0.5%容差
                if not self.current_grid_positions.get(buy_grid, False):
                    self.current_grid_positions[buy_grid] = True
                    return TradingSignal.BUY

        # 查找最近的卖出网格
        for sell_grid in self.sell_grids:
            if (
                abs(current_price - sell_grid) < (self.upper_price - self.lower_price) * 0.005
            ):  # 0.5%容差
                if self.current_grid_positions.get(sell_grid - (self.upper_price - self.lower_price) / self.grid_count, False):
                    return TradingSignal.SELL

        return TradingSignal.HOLD

    def calculate_position_size(
        self, signal: TradingSignal, current_price: float, account_balance: float
    ) -> float:
        """计算仓位大小"""
        if signal == TradingSignal.HOLD:
            return 0.0

        # 每个网格使用固定比例的资金
        return account_balance * self.position_per_grid

    def calculate_stop_loss(
        self, signal: TradingSignal, entry_price: float
    ) -> Optional[float]:
        """计算止损价格"""
        # 网格策略通常不使用止损，而是依赖网格范围
        if signal == TradingSignal.BUY:
            # 可选: 设置在下边界以下作为紧急止损
            stop_loss_percent = self.parameters.get("emergency_stop_loss_percent", 0.1)
            return self.lower_price * (1 - stop_loss_percent)
        return None

    def calculate_take_profit(
        self, signal: TradingSignal, entry_price: float
    ) -> Optional[float]:
        """计算止盈价格"""
        # 网格策略的止盈由下一个卖出网格决定
        if signal == TradingSignal.BUY:
            grid_step = (self.upper_price - self.lower_price) / self.grid_count
            return entry_price + grid_step
        return None

    def to_python_code(self) -> str:
        """生成网格策略 Python 代码"""
        return f'''"""
网格交易策略
价格范围: {self.lower_price} - {self.upper_price}
网格数量: {self.grid_count}
"""

from typing import Optional


class GridTradingStrategy:
    """网格交易策略实现"""

    def __init__(self):
        """初始化策略"""
        self.name = "{self.name}"
        self.lower_price = {self.lower_price}
        self.upper_price = {self.upper_price}
        self.grid_count = {self.grid_count}
        self.position_per_grid = {self.position_per_grid}

        # 初始化网格
        self.buy_grids = []
        self.sell_grids = []
        self.current_positions = {{}}

        grid_step = (self.upper_price - self.lower_price) / self.grid_count
        for i in range(self.grid_count + 1):
            grid_price = self.lower_price + (i * grid_step)
            self.buy_grids.append(grid_price)
            if i > 0:
                self.sell_grids.append(grid_price)
            self.current_positions[grid_price] = False

    def on_data(self, data: dict, historical_data: list[dict]) -> str:
        """
        处理市场数据

        Args:
            data: 最新市场数据
            historical_data: 历史数据列表

        Returns:
            交易信号: "buy", "sell", "hold"
        """
        current_price = data["close"]

        # 检查价格范围
        if current_price < self.lower_price or current_price > self.upper_price:
            return "hold"

        tolerance = (self.upper_price - self.lower_price) * 0.005

        # 检查买入网格
        for buy_grid in self.buy_grids:
            if abs(current_price - buy_grid) < tolerance:
                if not self.current_positions.get(buy_grid, False):
                    self.current_positions[buy_grid] = True
                    return "buy"

        # 检查卖出网格
        grid_step = (self.upper_price - self.lower_price) / self.grid_count
        for sell_grid in self.sell_grids:
            if abs(current_price - sell_grid) < tolerance:
                lower_grid = sell_grid - grid_step
                if self.current_positions.get(lower_grid, False):
                    return "sell"

        return "hold"

    def calculate_position_size(
        self, signal: str, current_price: float, account_balance: float
    ) -> float:
        """计算仓位大小"""
        if signal == "hold":
            return 0.0
        return account_balance * self.position_per_grid

    def calculate_stop_loss(self, signal: str, entry_price: float) -> Optional[float]:
        """计算止损价格"""
        if signal == "buy":
            # 紧急止损设置在下边界以下10%
            return self.lower_price * 0.9
        return None

    def calculate_take_profit(self, signal: str, entry_price: float) -> Optional[float]:
        """计算止盈价格"""
        if signal == "buy":
            grid_step = (self.upper_price - self.lower_price) / self.grid_count
            return entry_price + grid_step
        return None
'''
