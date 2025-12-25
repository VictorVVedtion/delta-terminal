"""
策略基类定义
"""

from abc import ABC, abstractmethod
from typing import Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field

from ..models.schemas import StrategyType, TradingSignal


class StrategyParameter(BaseModel):
    """策略参数"""

    name: str = Field(..., description="参数名称")
    value: Any = Field(..., description="参数值")
    min_value: Optional[float] = Field(default=None, description="最小值")
    max_value: Optional[float] = Field(default=None, description="最大值")
    step: Optional[float] = Field(default=None, description="步长")
    description: str = Field(default="", description="参数说明")


class MarketData(BaseModel):
    """市场数据"""

    timestamp: datetime = Field(..., description="时间戳")
    open: float = Field(..., description="开盘价")
    high: float = Field(..., description="最高价")
    low: float = Field(..., description="最低价")
    close: float = Field(..., description="收盘价")
    volume: float = Field(..., description="成交量")


class Position(BaseModel):
    """持仓信息"""

    symbol: str = Field(..., description="交易对")
    side: str = Field(..., description="方向", examples=["long", "short"])
    quantity: float = Field(..., description="数量")
    entry_price: float = Field(..., description="入场价格")
    current_price: float = Field(..., description="当前价格")
    unrealized_pnl: float = Field(..., description="未实现盈亏")
    stop_loss: Optional[float] = Field(default=None, description="止损价格")
    take_profit: Optional[float] = Field(default=None, description="止盈价格")


class BaseStrategy(ABC):
    """策略基类"""

    def __init__(
        self,
        name: str,
        strategy_type: StrategyType,
        parameters: dict[str, Any],
        description: str = "",
    ):
        """
        初始化策略

        Args:
            name: 策略名称
            strategy_type: 策略类型
            parameters: 策略参数
            description: 策略描述
        """
        self.name = name
        self.strategy_type = strategy_type
        self.parameters = parameters
        self.description = description
        self.initialized = False

    @abstractmethod
    def initialize(self) -> None:
        """
        初始化策略
        在策略开始运行前调用一次
        """
        pass

    @abstractmethod
    def on_data(self, data: MarketData, historical_data: list[MarketData]) -> TradingSignal:
        """
        处理新的市场数据

        Args:
            data: 最新的市场数据
            historical_data: 历史数据列表

        Returns:
            交易信号 (BUY/SELL/HOLD)
        """
        pass

    @abstractmethod
    def calculate_position_size(
        self, signal: TradingSignal, current_price: float, account_balance: float
    ) -> float:
        """
        计算仓位大小

        Args:
            signal: 交易信号
            current_price: 当前价格
            account_balance: 账户余额

        Returns:
            仓位大小 (单位: 基础货币)
        """
        pass

    @abstractmethod
    def calculate_stop_loss(
        self, signal: TradingSignal, entry_price: float
    ) -> Optional[float]:
        """
        计算止损价格

        Args:
            signal: 交易信号
            entry_price: 入场价格

        Returns:
            止损价格 (None表示不设置止损)
        """
        pass

    @abstractmethod
    def calculate_take_profit(
        self, signal: TradingSignal, entry_price: float
    ) -> Optional[float]:
        """
        计算止盈价格

        Args:
            signal: 交易信号
            entry_price: 入场价格

        Returns:
            止盈价格 (None表示不设置止盈)
        """
        pass

    def validate_parameters(self) -> tuple[bool, list[str]]:
        """
        验证策略参数

        Returns:
            (是否有效, 错误信息列表)
        """
        errors: list[str] = []

        # 基础验证逻辑
        if not self.name:
            errors.append("策略名称不能为空")

        if not self.parameters:
            errors.append("策略参数不能为空")

        return len(errors) == 0, errors

    def to_dict(self) -> dict[str, Any]:
        """
        转换为字典

        Returns:
            策略配置字典
        """
        return {
            "name": self.name,
            "strategy_type": self.strategy_type.value,
            "description": self.description,
            "parameters": self.parameters,
        }

    def to_json_config(self) -> dict[str, Any]:
        """
        生成 JSON 配置

        Returns:
            JSON格式的策略配置
        """
        return {
            "strategy": {
                "name": self.name,
                "type": self.strategy_type.value,
                "description": self.description,
                "version": "1.0.0",
                "parameters": self.parameters,
            },
            "risk_management": {
                "max_position_size": self.parameters.get("max_position_size", 0.1),
                "stop_loss_percent": self.parameters.get("stop_loss_percent", 0.02),
                "take_profit_percent": self.parameters.get("take_profit_percent", 0.04),
            },
        }

    def to_python_code(self) -> str:
        """
        生成 Python 代码

        Returns:
            Python格式的策略代码
        """
        template = f'''"""
{self.name}
{self.description}
"""

from typing import Optional
from datetime import datetime


class {self._to_class_name(self.name)}:
    """
    策略类型: {self.strategy_type.value}
    """

    def __init__(self):
        """初始化策略"""
        self.name = "{self.name}"
        self.parameters = {self.parameters}

    def on_data(self, data: dict, historical_data: list[dict]) -> str:
        """
        处理市场数据并生成交易信号

        Args:
            data: 最新的市场数据
            historical_data: 历史数据列表

        Returns:
            交易信号: "buy", "sell", "hold"
        """
        # TODO: 实现策略逻辑
        signal = "hold"
        return signal

    def calculate_position_size(
        self, signal: str, current_price: float, account_balance: float
    ) -> float:
        """计算仓位大小"""
        if signal == "hold":
            return 0.0

        max_position = self.parameters.get("max_position_size", 0.1)
        return account_balance * max_position

    def calculate_stop_loss(self, signal: str, entry_price: float) -> Optional[float]:
        """计算止损价格"""
        if signal == "buy":
            stop_loss_percent = self.parameters.get("stop_loss_percent", 0.02)
            return entry_price * (1 - stop_loss_percent)
        elif signal == "sell":
            stop_loss_percent = self.parameters.get("stop_loss_percent", 0.02)
            return entry_price * (1 + stop_loss_percent)
        return None

    def calculate_take_profit(self, signal: str, entry_price: float) -> Optional[float]:
        """计算止盈价格"""
        if signal == "buy":
            take_profit_percent = self.parameters.get("take_profit_percent", 0.04)
            return entry_price * (1 + take_profit_percent)
        elif signal == "sell":
            take_profit_percent = self.parameters.get("take_profit_percent", 0.04)
            return entry_price * (1 - take_profit_percent)
        return None
'''
        return template

    @staticmethod
    def _to_class_name(name: str) -> str:
        """转换为类名"""
        # 移除特殊字符，转为驼峰命名
        words = name.replace("-", " ").replace("_", " ").split()
        return "".join(word.capitalize() for word in words) + "Strategy"


class StrategyFactory:
    """策略工厂类"""

    _strategies: dict[str, type[BaseStrategy]] = {}

    @classmethod
    def register(cls, strategy_type: StrategyType) -> Any:
        """
        注册策略类装饰器

        Args:
            strategy_type: 策略类型

        Returns:
            装饰器函数
        """

        def decorator(strategy_class: type[BaseStrategy]) -> type[BaseStrategy]:
            cls._strategies[strategy_type.value] = strategy_class
            return strategy_class

        return decorator

    @classmethod
    def create(
        cls, strategy_type: StrategyType, name: str, parameters: dict[str, Any]
    ) -> BaseStrategy:
        """
        创建策略实例

        Args:
            strategy_type: 策略类型
            name: 策略名称
            parameters: 策略参数

        Returns:
            策略实例

        Raises:
            ValueError: 未注册的策略类型
        """
        strategy_class = cls._strategies.get(strategy_type.value)
        if not strategy_class:
            raise ValueError(f"未注册的策略类型: {strategy_type.value}")

        return strategy_class(name=name, strategy_type=strategy_type, parameters=parameters)

    @classmethod
    def list_strategies(cls) -> list[str]:
        """
        获取所有已注册的策略类型

        Returns:
            策略类型列表
        """
        return list(cls._strategies.keys())
