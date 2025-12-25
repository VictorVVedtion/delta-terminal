"""投资组合管理 - 持仓、资金、PnL计算"""
from datetime import datetime
from typing import Dict, List, Optional
import logging

from src.models.schemas import Position, PositionSide
from src.engine.event_engine import Event, EventType, FillEvent

logger = logging.getLogger(__name__)


class Portfolio:
    """
    投资组合管理器

    职责:
    1. 持仓管理 (开仓/平仓/更新)
    2. 资金管理 (现金/权益)
    3. PnL计算 (已实现/未实现)
    4. 组合价值追踪
    """

    def __init__(self, initial_capital: float):
        self.initial_capital = initial_capital
        self.cash = initial_capital
        self.equity = initial_capital

        # 持仓: {symbol: Position}
        self.positions: Dict[str, Position] = {}

        # 历史权益曲线
        self.equity_curve: List[Dict[str, any]] = []

        # 已实现盈亏
        self.realized_pnl = 0.0

        # 统计
        self.total_commission = 0.0
        self.total_slippage = 0.0

    def update_fill(self, fill_event: FillEvent) -> None:
        """
        处理成交事件,更新持仓

        Args:
            fill_event: 成交事件
        """
        data = fill_event.data
        symbol = data['symbol']
        side = data['side']
        quantity = data['quantity']
        price = data['price']
        commission = data['commission']
        slippage = data['slippage']

        # 更新统计
        self.total_commission += commission
        self.total_slippage += slippage

        # 交易成本
        cost = quantity * price + commission + slippage

        if side == 'buy':
            # 买入
            self._update_position_buy(symbol, quantity, price)
            self.cash -= cost
        elif side == 'sell':
            # 卖出
            realized_pnl = self._update_position_sell(symbol, quantity, price)
            self.cash += (quantity * price - commission - slippage)
            self.realized_pnl += realized_pnl

        logger.debug(
            f"持仓更新: {symbol} {side.upper()} {quantity}@{price} "
            f"| 现金: {self.cash:.2f}"
        )

    def _update_position_buy(self, symbol: str, quantity: float, price: float) -> None:
        """更新买入持仓"""
        if symbol not in self.positions:
            # 新建持仓
            self.positions[symbol] = Position(
                symbol=symbol,
                side=PositionSide.LONG,
                quantity=quantity,
                average_price=price,
                current_price=price,
                unrealized_pnl=0.0,
                realized_pnl=0.0
            )
        else:
            # 加仓
            pos = self.positions[symbol]
            total_quantity = pos.quantity + quantity
            # 计算新的平均成本
            new_avg_price = (
                (pos.quantity * pos.average_price + quantity * price) / total_quantity
            )
            pos.quantity = total_quantity
            pos.average_price = new_avg_price
            pos.current_price = price

    def _update_position_sell(self, symbol: str, quantity: float, price: float) -> float:
        """
        更新卖出持仓

        Returns:
            realized_pnl: 已实现盈亏
        """
        if symbol not in self.positions:
            logger.warning(f"卖出失败: {symbol} 无持仓")
            return 0.0

        pos = self.positions[symbol]
        if quantity > pos.quantity:
            logger.warning(f"卖出数量 {quantity} 超过持仓 {pos.quantity}")
            quantity = pos.quantity

        # 计算已实现盈亏
        realized_pnl = (price - pos.average_price) * quantity

        # 更新持仓
        pos.quantity -= quantity
        pos.current_price = price

        # 清空持仓
        if pos.quantity <= 0:
            del self.positions[symbol]

        return realized_pnl

    def update_market_value(self, current_prices: Dict[str, float]) -> None:
        """
        更新持仓市值与未实现盈亏

        Args:
            current_prices: {symbol: current_price}
        """
        total_unrealized_pnl = 0.0

        for symbol, pos in self.positions.items():
            if symbol in current_prices:
                pos.current_price = current_prices[symbol]
                pos.unrealized_pnl = (pos.current_price - pos.average_price) * pos.quantity
                total_unrealized_pnl += pos.unrealized_pnl

        # 更新权益
        self.equity = self.cash + total_unrealized_pnl + self.realized_pnl

    def record_equity(self, timestamp: datetime) -> None:
        """记录权益曲线"""
        self.equity_curve.append({
            'timestamp': timestamp,
            'equity': self.equity,
            'cash': self.cash,
            'unrealized_pnl': sum(pos.unrealized_pnl for pos in self.positions.values()),
            'realized_pnl': self.realized_pnl
        })

    def get_total_value(self) -> float:
        """获取组合总价值"""
        position_value = sum(
            pos.quantity * pos.current_price
            for pos in self.positions.values()
        )
        return self.cash + position_value

    def get_position(self, symbol: str) -> Optional[Position]:
        """获取指定品种持仓"""
        return self.positions.get(symbol)

    def has_position(self, symbol: str) -> bool:
        """是否持有该品种"""
        return symbol in self.positions

    def get_available_cash(self) -> float:
        """获取可用资金"""
        return self.cash

    def get_position_value(self, symbol: str) -> float:
        """获取持仓市值"""
        pos = self.positions.get(symbol)
        if pos:
            return pos.quantity * pos.current_price
        return 0.0

    def get_equity_curve_df(self):
        """获取权益曲线DataFrame"""
        import pandas as pd
        if not self.equity_curve:
            return pd.DataFrame()
        return pd.DataFrame(self.equity_curve)

    def get_summary(self) -> Dict[str, any]:
        """获取组合摘要"""
        total_value = self.get_total_value()
        total_return = (total_value - self.initial_capital) / self.initial_capital

        return {
            'initial_capital': self.initial_capital,
            'cash': self.cash,
            'equity': self.equity,
            'total_value': total_value,
            'total_return': total_return,
            'total_return_pct': total_return * 100,
            'realized_pnl': self.realized_pnl,
            'unrealized_pnl': sum(pos.unrealized_pnl for pos in self.positions.values()),
            'total_commission': self.total_commission,
            'total_slippage': self.total_slippage,
            'positions_count': len(self.positions),
            'positions': [
                {
                    'symbol': pos.symbol,
                    'quantity': pos.quantity,
                    'avg_price': pos.average_price,
                    'current_price': pos.current_price,
                    'value': pos.quantity * pos.current_price,
                    'pnl': pos.unrealized_pnl
                }
                for pos in self.positions.values()
            ]
        }

    def reset(self) -> None:
        """重置组合"""
        self.cash = self.initial_capital
        self.equity = self.initial_capital
        self.positions.clear()
        self.equity_curve.clear()
        self.realized_pnl = 0.0
        self.total_commission = 0.0
        self.total_slippage = 0.0
        logger.info("投资组合已重置")
