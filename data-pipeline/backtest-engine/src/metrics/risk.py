"""风险指标计算"""
import pandas as pd
import numpy as np
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class RiskCalculator:
    """
    风险指标计算器

    计算波动率、夏普比率、最大回撤等风险相关指标
    """

    def __init__(self, equity_curve: pd.DataFrame, risk_free_rate: float = 0.02):
        """
        Args:
            equity_curve: 权益曲线 DataFrame
            risk_free_rate: 无风险利率 (默认2%)
        """
        self.equity_curve = equity_curve
        self.risk_free_rate = risk_free_rate

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

    # ========== 波动率指标 ==========

    def volatility(self, annualized: bool = True) -> float:
        """
        波动率 (标准差)

        Args:
            annualized: 是否年化

        Returns:
            波动率
        """
        if self.returns.empty:
            return 0.0

        vol = self.returns.std()

        if annualized:
            # 假设每小时数据,年化因子 = sqrt(24*365)
            # 如果是日数据,使用 sqrt(252)
            vol = vol * np.sqrt(252)  # 假设日数据

        return vol

    def downside_volatility(self, target_return: float = 0.0) -> float:
        """
        下行波动率 (只计算低于目标收益的波动)

        Args:
            target_return: 目标收益率

        Returns:
            下行波动率
        """
        if self.returns.empty:
            return 0.0

        downside_returns = self.returns[self.returns < target_return]
        if downside_returns.empty:
            return 0.0

        downside_vol = downside_returns.std()
        return downside_vol * np.sqrt(252)

    # ========== 风险调整收益指标 ==========

    def sharpe_ratio(self) -> float:
        """
        夏普比率 = (年化收益 - 无风险利率) / 年化波动率

        衡量单位风险的超额收益
        """
        if self.returns.empty:
            return 0.0

        # 计算年化收益
        mean_return = self.returns.mean()
        annual_return = mean_return * 252  # 假设日数据

        # 计算年化波动率
        vol = self.volatility(annualized=True)

        if vol == 0:
            return 0.0

        sharpe = (annual_return - self.risk_free_rate) / vol
        return sharpe

    def sortino_ratio(self, target_return: float = 0.0) -> float:
        """
        索提诺比率 = (年化收益 - 目标收益) / 下行波动率

        类似夏普比率,但只考虑下行风险
        """
        if self.returns.empty:
            return 0.0

        mean_return = self.returns.mean()
        annual_return = mean_return * 252

        downside_vol = self.downside_volatility(target_return)

        if downside_vol == 0:
            return 0.0

        sortino = (annual_return - target_return) / downside_vol
        return sortino

    def calmar_ratio(self) -> float:
        """
        卡玛比率 = 年化收益 / 最大回撤

        衡量收益与最大回撤的比率
        """
        if self.returns.empty:
            return 0.0

        mean_return = self.returns.mean()
        annual_return = mean_return * 252

        max_dd = self.max_drawdown()

        if max_dd == 0:
            return 0.0

        calmar = annual_return / abs(max_dd)
        return calmar

    # ========== 回撤指标 ==========

    def max_drawdown(self) -> float:
        """
        最大回撤 (MDD)

        Returns:
            最大回撤比例 (负数)
        """
        if self.equity_curve.empty:
            return 0.0

        equity_series = self.equity_curve['equity']

        # 计算累计最大值
        cummax = equity_series.cummax()

        # 计算回撤
        drawdown = (equity_series - cummax) / cummax

        # 最大回撤
        max_dd = drawdown.min()
        return max_dd

    def max_drawdown_duration(self) -> int:
        """
        最大回撤持续时间 (天数)

        Returns:
            持续天数
        """
        if self.equity_curve.empty:
            return 0

        equity_series = self.equity_curve['equity']
        cummax = equity_series.cummax()
        drawdown = (equity_series - cummax) / cummax

        # 找到所有回撤期
        in_drawdown = drawdown < 0
        drawdown_periods = []
        start = None

        for i, is_dd in enumerate(in_drawdown):
            if is_dd and start is None:
                start = i
            elif not is_dd and start is not None:
                drawdown_periods.append((start, i - 1))
                start = None

        # 最后一个回撤期
        if start is not None:
            drawdown_periods.append((start, len(in_drawdown) - 1))

        if not drawdown_periods:
            return 0

        # 计算最长回撤期
        max_duration = max(end - start + 1 for start, end in drawdown_periods)

        # 转换为天数 (假设每条记录1小时)
        # 这里简化处理,直接返回记录数
        return max_duration

    def drawdown_series(self) -> pd.Series:
        """
        获取回撤序列

        Returns:
            回撤序列 (负值表示回撤)
        """
        if self.equity_curve.empty:
            return pd.Series(dtype=float)

        equity_series = self.equity_curve['equity']
        cummax = equity_series.cummax()
        drawdown = (equity_series - cummax) / cummax

        return drawdown

    # ========== 其他风险指标 ==========

    def value_at_risk(self, confidence: float = 0.95) -> float:
        """
        VaR (Value at Risk)

        Args:
            confidence: 置信水平 (0.95 = 95%)

        Returns:
            VaR值 (损失)
        """
        if self.returns.empty:
            return 0.0

        var = self.returns.quantile(1 - confidence)
        return var

    def conditional_var(self, confidence: float = 0.95) -> float:
        """
        CVaR (Conditional VaR) / Expected Shortfall

        超过VaR的平均损失

        Args:
            confidence: 置信水平

        Returns:
            CVaR值
        """
        if self.returns.empty:
            return 0.0

        var = self.value_at_risk(confidence)
        cvar = self.returns[self.returns <= var].mean()
        return cvar

    def beta(self, benchmark_returns: Optional[pd.Series] = None) -> float:
        """
        Beta系数 (相对基准的系统风险)

        Args:
            benchmark_returns: 基准收益率序列

        Returns:
            Beta值
        """
        if benchmark_returns is None or self.returns.empty:
            return 0.0

        # 确保索引对齐
        aligned_returns, aligned_benchmark = self.returns.align(
            benchmark_returns, join='inner'
        )

        if len(aligned_returns) < 2:
            return 0.0

        # 计算协方差和方差
        covariance = aligned_returns.cov(aligned_benchmark)
        benchmark_variance = aligned_benchmark.var()

        if benchmark_variance == 0:
            return 0.0

        beta = covariance / benchmark_variance
        return beta

    def alpha(
        self,
        benchmark_returns: Optional[pd.Series] = None,
        beta: Optional[float] = None
    ) -> float:
        """
        Alpha (超额收益)

        Args:
            benchmark_returns: 基准收益率序列
            beta: Beta值 (如已计算)

        Returns:
            Alpha值
        """
        if benchmark_returns is None or self.returns.empty:
            return 0.0

        if beta is None:
            beta = self.beta(benchmark_returns)

        # 年化收益
        portfolio_return = self.returns.mean() * 252
        benchmark_return = benchmark_returns.mean() * 252

        # Alpha = 组合收益 - (无风险利率 + Beta * (基准收益 - 无风险利率))
        alpha = portfolio_return - (
            self.risk_free_rate + beta * (benchmark_return - self.risk_free_rate)
        )

        return alpha

    def get_statistics(self) -> dict:
        """获取所有风险指标"""
        return {
            'volatility': self.volatility(),
            'sharpe_ratio': self.sharpe_ratio(),
            'sortino_ratio': self.sortino_ratio(),
            'calmar_ratio': self.calmar_ratio(),
            'max_drawdown': self.max_drawdown(),
            'max_drawdown_duration': self.max_drawdown_duration(),
            'var_95': self.value_at_risk(0.95),
            'cvar_95': self.conditional_var(0.95)
        }
