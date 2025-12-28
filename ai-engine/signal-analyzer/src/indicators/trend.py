"""趋势指标计算"""

import pandas as pd


def calculate_sma(data: pd.Series, period: int) -> pd.Series:
    """
    计算 SMA（简单移动平均线）

    Args:
        data: 价格序列
        period: SMA 周期

    Returns:
        SMA 序列
    """
    return data.rolling(window=period).mean()


def calculate_ema(data: pd.Series, period: int) -> pd.Series:
    """
    计算 EMA（指数移动平均线）

    Args:
        data: 价格序列
        period: EMA 周期

    Returns:
        EMA 序列
    """
    return data.ewm(span=period, adjust=False).mean()


def calculate_macd(
    data: pd.Series, fast_period: int = 12, slow_period: int = 26, signal_period: int = 9
) -> tuple[pd.Series, pd.Series, pd.Series]:
    """
    计算 MACD（指数平滑异同移动平均线）

    Args:
        data: 收盘价序列
        fast_period: 快线周期
        slow_period: 慢线周期
        signal_period: 信号线周期

    Returns:
        MACD 线、信号线、柱状图
    """
    ema_fast = calculate_ema(data, fast_period)
    ema_slow = calculate_ema(data, slow_period)

    macd_line = ema_fast - ema_slow
    signal_line = calculate_ema(macd_line, signal_period)
    histogram = macd_line - signal_line

    return macd_line, signal_line, histogram


def calculate_bollinger_bands(
    data: pd.Series, period: int = 20, num_std: float = 2.0
) -> tuple[pd.Series, pd.Series, pd.Series]:
    """
    计算布林带

    Args:
        data: 收盘价序列
        period: 周期
        num_std: 标准差倍数

    Returns:
        上轨、中轨、下轨
    """
    middle_band = calculate_sma(data, period)
    std = data.rolling(window=period).std()

    upper_band = middle_band + (std * num_std)
    lower_band = middle_band - (std * num_std)

    return upper_band, middle_band, lower_band


def calculate_adx(
    high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14
) -> pd.Series:
    """
    计算 ADX（平均趋向指标）

    Args:
        high: 最高价序列
        low: 最低价序列
        close: 收盘价序列
        period: ADX 周期

    Returns:
        ADX 序列
    """
    # 计算 +DM 和 -DM
    high_diff = high.diff()
    low_diff = -low.diff()

    plus_dm = high_diff.where((high_diff > low_diff) & (high_diff > 0), 0)
    minus_dm = low_diff.where((low_diff > high_diff) & (low_diff > 0), 0)

    # 计算 TR（真实范围）
    tr1 = high - low
    tr2 = (high - close.shift(1)).abs()
    tr3 = (low - close.shift(1)).abs()
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)

    # 平滑化
    atr = tr.rolling(window=period).mean()
    plus_di = 100 * (plus_dm.rolling(window=period).mean() / atr)
    minus_di = 100 * (minus_dm.rolling(window=period).mean() / atr)

    # 计算 DX 和 ADX
    dx = 100 * ((plus_di - minus_di).abs() / (plus_di + minus_di))
    adx = dx.rolling(window=period).mean()

    return adx


def calculate_ichimoku(
    high: pd.Series, low: pd.Series, close: pd.Series
) -> dict[str, pd.Series]:
    """
    计算一目均衡表

    Args:
        high: 最高价序列
        low: 最低价序列
        close: 收盘价序列

    Returns:
        包含各条线的字典
    """
    # 转换线（Tenkan-sen）：9 期最高最低均值
    tenkan_sen = (high.rolling(window=9).max() + low.rolling(window=9).min()) / 2

    # 基准线（Kijun-sen）：26 期最高最低均值
    kijun_sen = (high.rolling(window=26).max() + low.rolling(window=26).min()) / 2

    # 先行带 A（Senkou Span A）：转换线和基准线的均值，向前移 26 期
    senkou_span_a = ((tenkan_sen + kijun_sen) / 2).shift(26)

    # 先行带 B（Senkou Span B）：52 期最高最低均值，向前移 26 期
    senkou_span_b = ((high.rolling(window=52).max() + low.rolling(window=52).min()) / 2).shift(26)

    # 迟行线（Chikou Span）：收盘价向后移 26 期
    chikou_span = close.shift(-26)

    return {
        "tenkan_sen": tenkan_sen,
        "kijun_sen": kijun_sen,
        "senkou_span_a": senkou_span_a,
        "senkou_span_b": senkou_span_b,
        "chikou_span": chikou_span,
    }
