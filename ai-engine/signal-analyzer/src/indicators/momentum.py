"""动量指标计算"""

import numpy as np
import pandas as pd


def calculate_rsi(data: pd.Series, period: int = 14) -> pd.Series:
    """
    计算 RSI（相对强弱指标）

    Args:
        data: 收盘价序列
        period: RSI 周期

    Returns:
        RSI 序列
    """
    delta = data.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()

    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))

    return rsi


def calculate_stochastic(
    high: pd.Series, low: pd.Series, close: pd.Series, k_period: int = 14, d_period: int = 3
) -> tuple[pd.Series, pd.Series]:
    """
    计算 Stochastic（随机指标）

    Args:
        high: 最高价序列
        low: 最低价序列
        close: 收盘价序列
        k_period: %K 周期
        d_period: %D 周期

    Returns:
        %K 和 %D 序列
    """
    lowest_low = low.rolling(window=k_period).min()
    highest_high = high.rolling(window=k_period).max()

    k = 100 * (close - lowest_low) / (highest_high - lowest_low)
    d = k.rolling(window=d_period).mean()

    return k, d


def calculate_cci(
    high: pd.Series, low: pd.Series, close: pd.Series, period: int = 20
) -> pd.Series:
    """
    计算 CCI（商品通道指标）

    Args:
        high: 最高价序列
        low: 最低价序列
        close: 收盘价序列
        period: CCI 周期

    Returns:
        CCI 序列
    """
    typical_price = (high + low + close) / 3
    sma_tp = typical_price.rolling(window=period).mean()
    mad = typical_price.rolling(window=period).apply(lambda x: np.abs(x - x.mean()).mean())

    cci = (typical_price - sma_tp) / (0.015 * mad)

    return cci


def calculate_williams_r(
    high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14
) -> pd.Series:
    """
    计算 Williams %R（威廉指标）

    Args:
        high: 最高价序列
        low: 最低价序列
        close: 收盘价序列
        period: 周期

    Returns:
        Williams %R 序列
    """
    highest_high = high.rolling(window=period).max()
    lowest_low = low.rolling(window=period).min()

    williams_r = -100 * (highest_high - close) / (highest_high - lowest_low)

    return williams_r


def calculate_mfi(
    high: pd.Series, low: pd.Series, close: pd.Series, volume: pd.Series, period: int = 14
) -> pd.Series:
    """
    计算 MFI（资金流量指标）

    Args:
        high: 最高价序列
        low: 最低价序列
        close: 收盘价序列
        volume: 成交量序列
        period: MFI 周期

    Returns:
        MFI 序列
    """
    typical_price = (high + low + close) / 3
    money_flow = typical_price * volume

    positive_flow = money_flow.where(typical_price > typical_price.shift(1), 0)
    negative_flow = money_flow.where(typical_price < typical_price.shift(1), 0)

    positive_mf = positive_flow.rolling(window=period).sum()
    negative_mf = negative_flow.rolling(window=period).sum()

    mfi = 100 - (100 / (1 + positive_mf / negative_mf))

    return mfi
