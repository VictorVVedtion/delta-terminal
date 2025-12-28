"""成交量指标计算"""

import pandas as pd


def calculate_obv(close: pd.Series, volume: pd.Series) -> pd.Series:
    """
    计算 OBV（能量潮）

    Args:
        close: 收盘价序列
        volume: 成交量序列

    Returns:
        OBV 序列
    """
    obv = (volume * (~close.diff().le(0) * 2 - 1)).cumsum()
    return obv


def calculate_vwap(
    high: pd.Series, low: pd.Series, close: pd.Series, volume: pd.Series
) -> pd.Series:
    """
    计算 VWAP（成交量加权平均价）

    Args:
        high: 最高价序列
        low: 最低价序列
        close: 收盘价序列
        volume: 成交量序列

    Returns:
        VWAP 序列
    """
    typical_price = (high + low + close) / 3
    vwap = (typical_price * volume).cumsum() / volume.cumsum()
    return vwap


def calculate_cmf(
    high: pd.Series, low: pd.Series, close: pd.Series, volume: pd.Series, period: int = 20
) -> pd.Series:
    """
    计算 CMF（蔡金资金流量）

    Args:
        high: 最高价序列
        low: 最低价序列
        close: 收盘价序列
        volume: 成交量序列
        period: CMF 周期

    Returns:
        CMF 序列
    """
    mfm = ((close - low) - (high - close)) / (high - low)
    mfv = mfm * volume
    cmf = mfv.rolling(window=period).sum() / volume.rolling(window=period).sum()
    return cmf


def calculate_adl(high: pd.Series, low: pd.Series, close: pd.Series, volume: pd.Series) -> pd.Series:
    """
    计算 A/D Line（累积/派发线）

    Args:
        high: 最高价序列
        low: 最低价序列
        close: 收盘价序列
        volume: 成交量序列

    Returns:
        A/D Line 序列
    """
    clv = ((close - low) - (high - close)) / (high - low)
    adl = (clv * volume).cumsum()
    return adl


def calculate_volume_sma(volume: pd.Series, period: int = 20) -> pd.Series:
    """
    计算成交量的简单移动平均

    Args:
        volume: 成交量序列
        period: 周期

    Returns:
        成交量 SMA
    """
    return volume.rolling(window=period).mean()


def calculate_volume_ratio(volume: pd.Series, period: int = 20) -> pd.Series:
    """
    计算成交量比率（当前成交量 / 平均成交量）

    Args:
        volume: 成交量序列
        period: 周期

    Returns:
        成交量比率序列
    """
    volume_sma = calculate_volume_sma(volume, period)
    return volume / volume_sma
