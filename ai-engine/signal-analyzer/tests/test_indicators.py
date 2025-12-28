"""技术指标测试"""

import numpy as np
import pandas as pd
import pytest

from src.indicators import (
    calculate_adx,
    calculate_bollinger_bands,
    calculate_ema,
    calculate_macd,
    calculate_obv,
    calculate_rsi,
    calculate_sma,
    calculate_stochastic,
    calculate_vwap,
)


@pytest.fixture
def sample_price_data() -> pd.Series:
    """生成样本价格数据"""
    np.random.seed(42)
    prices = 100 + np.cumsum(np.random.randn(100))
    return pd.Series(prices)


@pytest.fixture
def sample_ohlcv_data() -> pd.DataFrame:
    """生成样本 OHLCV 数据"""
    np.random.seed(42)
    size = 100
    close = 100 + np.cumsum(np.random.randn(size))
    high = close + np.abs(np.random.randn(size))
    low = close - np.abs(np.random.randn(size))
    open_price = close + np.random.randn(size) * 0.5
    volume = np.abs(np.random.randn(size)) * 1000000

    return pd.DataFrame(
        {
            "open": open_price,
            "high": high,
            "low": low,
            "close": close,
            "volume": volume,
        }
    )


class TestMomentumIndicators:
    """动量指标测试"""

    def test_calculate_rsi(self, sample_price_data: pd.Series) -> None:
        """测试 RSI 计算"""
        rsi = calculate_rsi(sample_price_data, period=14)

        assert isinstance(rsi, pd.Series)
        assert len(rsi) == len(sample_price_data)
        # RSI 值应在 0-100 之间（忽略 NaN）
        assert rsi.dropna().min() >= 0
        assert rsi.dropna().max() <= 100

    def test_calculate_stochastic(self, sample_ohlcv_data: pd.DataFrame) -> None:
        """测试 Stochastic 计算"""
        k, d = calculate_stochastic(
            sample_ohlcv_data["high"],
            sample_ohlcv_data["low"],
            sample_ohlcv_data["close"],
            k_period=14,
            d_period=3,
        )

        assert isinstance(k, pd.Series)
        assert isinstance(d, pd.Series)
        assert len(k) == len(sample_ohlcv_data)
        assert len(d) == len(sample_ohlcv_data)
        # %K 和 %D 值应在 0-100 之间
        assert k.dropna().min() >= 0
        assert k.dropna().max() <= 100


class TestTrendIndicators:
    """趋势指标测试"""

    def test_calculate_sma(self, sample_price_data: pd.Series) -> None:
        """测试 SMA 计算"""
        sma = calculate_sma(sample_price_data, period=20)

        assert isinstance(sma, pd.Series)
        assert len(sma) == len(sample_price_data)
        # SMA 应平滑价格波动
        assert sma.std() < sample_price_data.std()

    def test_calculate_ema(self, sample_price_data: pd.Series) -> None:
        """测试 EMA 计算"""
        ema = calculate_ema(sample_price_data, period=20)

        assert isinstance(ema, pd.Series)
        assert len(ema) == len(sample_price_data)
        # EMA 应比 SMA 更贴近当前价格
        sma = calculate_sma(sample_price_data, period=20)
        # 最后一个值的差异
        assert abs(ema.iloc[-1] - sample_price_data.iloc[-1]) <= abs(
            sma.iloc[-1] - sample_price_data.iloc[-1]
        )

    def test_calculate_macd(self, sample_price_data: pd.Series) -> None:
        """测试 MACD 计算"""
        macd_line, signal_line, histogram = calculate_macd(
            sample_price_data, fast_period=12, slow_period=26, signal_period=9
        )

        assert isinstance(macd_line, pd.Series)
        assert isinstance(signal_line, pd.Series)
        assert isinstance(histogram, pd.Series)
        assert len(macd_line) == len(sample_price_data)
        # Histogram = MACD - Signal
        np.testing.assert_array_almost_equal(
            histogram.dropna().values,
            (macd_line - signal_line).dropna().values,
            decimal=10,
        )

    def test_calculate_bollinger_bands(self, sample_price_data: pd.Series) -> None:
        """测试布林带计算"""
        upper, middle, lower = calculate_bollinger_bands(sample_price_data, period=20, num_std=2.0)

        assert isinstance(upper, pd.Series)
        assert isinstance(middle, pd.Series)
        assert isinstance(lower, pd.Series)
        # 上轨 > 中轨 > 下轨
        assert (upper.dropna() > middle.dropna()).all()
        assert (middle.dropna() > lower.dropna()).all()

    def test_calculate_adx(self, sample_ohlcv_data: pd.DataFrame) -> None:
        """测试 ADX 计算"""
        adx = calculate_adx(
            sample_ohlcv_data["high"],
            sample_ohlcv_data["low"],
            sample_ohlcv_data["close"],
            period=14,
        )

        assert isinstance(adx, pd.Series)
        assert len(adx) == len(sample_ohlcv_data)
        # ADX 值应在 0-100 之间
        assert adx.dropna().min() >= 0
        assert adx.dropna().max() <= 100


class TestVolumeIndicators:
    """成交量指标测试"""

    def test_calculate_obv(self, sample_ohlcv_data: pd.DataFrame) -> None:
        """测试 OBV 计算"""
        obv = calculate_obv(sample_ohlcv_data["close"], sample_ohlcv_data["volume"])

        assert isinstance(obv, pd.Series)
        assert len(obv) == len(sample_ohlcv_data)
        # OBV 应该是累积值
        assert not obv.isna().all()

    def test_calculate_vwap(self, sample_ohlcv_data: pd.DataFrame) -> None:
        """测试 VWAP 计算"""
        vwap = calculate_vwap(
            sample_ohlcv_data["high"],
            sample_ohlcv_data["low"],
            sample_ohlcv_data["close"],
            sample_ohlcv_data["volume"],
        )

        assert isinstance(vwap, pd.Series)
        assert len(vwap) == len(sample_ohlcv_data)
        # VWAP 应该在价格范围内
        assert vwap.dropna().min() >= sample_ohlcv_data["low"].min()
        assert vwap.dropna().max() <= sample_ohlcv_data["high"].max()


@pytest.mark.parametrize("period", [10, 14, 20, 50])
def test_rsi_with_different_periods(sample_price_data: pd.Series, period: int) -> None:
    """测试不同周期的 RSI"""
    rsi = calculate_rsi(sample_price_data, period=period)

    assert isinstance(rsi, pd.Series)
    # 前 period 个值应该是 NaN
    assert rsi.iloc[:period].isna().sum() > 0
    # 后续值应该有效
    assert rsi.iloc[period:].notna().sum() > 0
