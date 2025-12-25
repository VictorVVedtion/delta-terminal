"""性能指标计算"""
import pandas as pd
import numpy as np
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)


class PerformanceCalculator:
    """
    性能指标计算器

    计算收益、交易相关指标
    """

    def __init__(
        self,
        equity_curve: pd.DataFrame,
        trades: List[Dict],
        initial_capital: float
    ):
        """
        Args:
            equity_curve: 权益曲线 DataFrame (columns: timestamp, equity, ...)
            trades: 交易记录列表
            initial_capital: 初始资金
        """
        self.equity_curve = equity_curve
        self.trades = trades
        self.initial_capital = initial_capital

        # 预处理
        if not equity_curve.empty:
            self.equity_curve = equity_curve.sort_values('timestamp').reset_index(drop=True)
            self.returns = self._calculate_returns()
        else:
            self.returns = pd.Series(dtype=float)

    def _calculate_returns(self) -> pd.Series:
        """计算收益率序列"""
        if len(self.equity_curve) < 2:
            return pd.Series(dtype=float)

        equity_series = self.equity_curve['equity']
        returns = equity_series.pct_change().dropna()
        return returns

    # ========== 收益指标 ==========

    def total_return(self) -> float:
        """总收益率"""
        if self.equity_curve.empty:
            return 0.0

        final_equity = self.equity_curve['equity'].iloc[-1]
        return (final_equity - self.initial_capital) / self.initial_capital

    def cumulative_return(self) -> float:
        """累计收益率 (同total_return)"""
        return self.total_return()

    def annual_return(self) -> float:
        """年化收益率"""
        if self.equity_curve.empty or len(self.equity_curve) < 2:
            return 0.0

        # 计算交易天数
        start_date = self.equity_curve['timestamp'].iloc[0]
        end_date = self.equity_curve['timestamp'].iloc[-1]
        days = (end_date - start_date).days

        if days == 0:
            return 0.0

        total_ret = self.total_return()
        years = days / 365.25

        # 年化公式: (1 + total_return) ^ (1/years) - 1
        if years == 0:
            return 0.0

        annual_ret = (1 + total_ret) ** (1 / years) - 1
        return annual_ret

    # ========== 交易指标 ==========

    def total_trades(self) -> int:
        """总交易数"""
        return len(self.trades)

    def win_rate(self) -> float:
        """胜率"""
        if not self.trades:
            return 0.0

        # 计算每笔交易的盈亏
        trade_pnls = self._calculate_trade_pnls()
        if not trade_pnls:
            return 0.0

        wins = sum(1 for pnl in trade_pnls if pnl > 0)
        return wins / len(trade_pnls)

    def profit_factor(self) -> float:
        """盈亏比 (总盈利/总亏损)"""
        trade_pnls = self._calculate_trade_pnls()
        if not trade_pnls:
            return 0.0

        total_profit = sum(pnl for pnl in trade_pnls if pnl > 0)
        total_loss = abs(sum(pnl for pnl in trade_pnls if pnl < 0))

        if total_loss == 0:
            return float('inf') if total_profit > 0 else 0.0

        return total_profit / total_loss

    def average_win(self) -> float:
        """平均盈利"""
        trade_pnls = self._calculate_trade_pnls()
        wins = [pnl for pnl in trade_pnls if pnl > 0]
        return np.mean(wins) if wins else 0.0

    def average_loss(self) -> float:
        """平均亏损"""
        trade_pnls = self._calculate_trade_pnls()
        losses = [pnl for pnl in trade_pnls if pnl < 0]
        return np.mean(losses) if losses else 0.0

    def largest_win(self) -> float:
        """最大单笔盈利"""
        trade_pnls = self._calculate_trade_pnls()
        wins = [pnl for pnl in trade_pnls if pnl > 0]
        return max(wins) if wins else 0.0

    def largest_loss(self) -> float:
        """最大单笔亏损"""
        trade_pnls = self._calculate_trade_pnls()
        losses = [pnl for pnl in trade_pnls if pnl < 0]
        return min(losses) if losses else 0.0

    def _calculate_trade_pnls(self) -> List[float]:
        """
        计算每笔交易的盈亏

        简化处理: 将买卖配对计算盈亏
        """
        if not self.trades:
            return []

        # 按品种分组
        trades_by_symbol: Dict[str, List[Dict]] = {}
        for trade in self.trades:
            symbol = trade['symbol']
            if symbol not in trades_by_symbol:
                trades_by_symbol[symbol] = []
            trades_by_symbol[symbol].append(trade)

        pnls = []
        for symbol, trades in trades_by_symbol.items():
            # 按时间排序
            trades = sorted(trades, key=lambda x: x['timestamp'])

            # 配对买卖
            position = 0.0
            avg_price = 0.0

            for trade in trades:
                if trade['side'] == 'buy':
                    # 买入
                    new_position = position + trade['quantity']
                    if new_position != 0:
                        avg_price = (
                            (position * avg_price + trade['quantity'] * trade['price'])
                            / new_position
                        )
                    position = new_position

                elif trade['side'] == 'sell':
                    # 卖出 - 计算盈亏
                    if position > 0:
                        pnl = (trade['price'] - avg_price) * trade['quantity']
                        pnl -= trade['commission'] + trade['slippage']
                        pnls.append(pnl)

                    position -= trade['quantity']
                    if position <= 0:
                        position = 0.0
                        avg_price = 0.0

        return pnls

    def get_monthly_returns(self) -> pd.Series:
        """获取月度收益率"""
        if self.equity_curve.empty:
            return pd.Series(dtype=float)

        df = self.equity_curve.copy()
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        df = df.set_index('timestamp')

        # 按月重采样
        monthly = df['equity'].resample('M').last()
        monthly_returns = monthly.pct_change().dropna()

        return monthly_returns

    def get_statistics(self) -> Dict[str, float]:
        """获取所有统计指标"""
        return {
            'total_return': self.total_return(),
            'annual_return': self.annual_return(),
            'cumulative_return': self.cumulative_return(),
            'total_trades': self.total_trades(),
            'win_rate': self.win_rate(),
            'profit_factor': self.profit_factor(),
            'average_win': self.average_win(),
            'average_loss': self.average_loss(),
            'largest_win': self.largest_win(),
            'largest_loss': self.largest_loss()
        }
