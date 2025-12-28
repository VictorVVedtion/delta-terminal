"""技术指标计算服务"""

import time
from typing import Any, Dict, List

import pandas as pd
from loguru import logger

from ..config import get_settings
from ..indicators import (
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
from ..models import IndicatorType, OHLCVData

settings = get_settings()


class IndicatorService:
    """技术指标计算服务"""

    def __init__(self) -> None:
        self.settings = settings

    def _ohlcv_to_dataframe(self, ohlcv_data: List[OHLCVData]) -> pd.DataFrame:
        """
        将 OHLCV 数据转换为 DataFrame

        Args:
            ohlcv_data: OHLCV 数据列表

        Returns:
            DataFrame
        """
        data = {
            "timestamp": [item.timestamp for item in ohlcv_data],
            "open": [item.open for item in ohlcv_data],
            "high": [item.high for item in ohlcv_data],
            "low": [item.low for item in ohlcv_data],
            "close": [item.close for item in ohlcv_data],
            "volume": [item.volume for item in ohlcv_data],
        }
        df = pd.DataFrame(data)
        df.set_index("timestamp", inplace=True)
        return df

    def calculate_rsi_indicator(
        self, df: pd.DataFrame, period: int | None = None
    ) -> Dict[str, Any]:
        """
        计算 RSI 指标

        Args:
            df: OHLCV DataFrame
            period: RSI 周期

        Returns:
            RSI 指标数据
        """
        period = period or self.settings.rsi_period
        rsi = calculate_rsi(df["close"], period)
        current_rsi = float(rsi.iloc[-1])

        # 判断信号
        signal = "neutral"
        if current_rsi < self.settings.rsi_oversold:
            signal = "buy"
        elif current_rsi > self.settings.rsi_overbought:
            signal = "sell"

        return {
            "value": current_rsi,
            "period": period,
            "timestamp": int(df.index[-1]),
            "signal": signal,
            "oversold_threshold": self.settings.rsi_oversold,
            "overbought_threshold": self.settings.rsi_overbought,
        }

    def calculate_macd_indicator(
        self,
        df: pd.DataFrame,
        fast: int | None = None,
        slow: int | None = None,
        signal_period: int | None = None,
    ) -> Dict[str, Any]:
        """
        计算 MACD 指标

        Args:
            df: OHLCV DataFrame
            fast: 快线周期
            slow: 慢线周期
            signal_period: 信号线周期

        Returns:
            MACD 指标数据
        """
        fast = fast or self.settings.macd_fast
        slow = slow or self.settings.macd_slow
        signal_period = signal_period or self.settings.macd_signal

        macd_line, signal_line, histogram = calculate_macd(df["close"], fast, slow, signal_period)

        current_macd = float(macd_line.iloc[-1])
        current_signal = float(signal_line.iloc[-1])
        current_histogram = float(histogram.iloc[-1])
        prev_histogram = float(histogram.iloc[-2])

        # 判断趋势
        trend = "neutral"
        if current_histogram > 0 and prev_histogram <= 0:
            trend = "bullish_crossover"
        elif current_histogram < 0 and prev_histogram >= 0:
            trend = "bearish_crossover"
        elif current_histogram > 0:
            trend = "bullish"
        elif current_histogram < 0:
            trend = "bearish"

        return {
            "macd": current_macd,
            "signal": current_signal,
            "histogram": current_histogram,
            "timestamp": int(df.index[-1]),
            "trend": trend,
        }

    def calculate_bb_indicator(
        self, df: pd.DataFrame, period: int | None = None, num_std: float | None = None
    ) -> Dict[str, Any]:
        """
        计算布林带指标

        Args:
            df: OHLCV DataFrame
            period: 周期
            num_std: 标准差倍数

        Returns:
            布林带指标数据
        """
        period = period or self.settings.bb_period
        num_std = num_std or self.settings.bb_std

        upper, middle, lower = calculate_bollinger_bands(df["close"], period, num_std)

        current_price = float(df["close"].iloc[-1])
        current_upper = float(upper.iloc[-1])
        current_middle = float(middle.iloc[-1])
        current_lower = float(lower.iloc[-1])

        # 判断价格位置
        position = "middle"
        if current_price >= current_upper:
            position = "above_upper"
        elif current_price <= current_lower:
            position = "below_lower"
        elif current_price > current_middle:
            position = "upper_half"
        else:
            position = "lower_half"

        return {
            "upper": current_upper,
            "middle": current_middle,
            "lower": current_lower,
            "current_price": current_price,
            "timestamp": int(df.index[-1]),
            "position": position,
        }

    def calculate_sma_indicator(
        self, df: pd.DataFrame, periods: List[int] | None = None
    ) -> Dict[str, Any]:
        """
        计算 SMA 指标

        Args:
            df: OHLCV DataFrame
            periods: SMA 周期列表

        Returns:
            SMA 指标数据
        """
        periods = periods or [self.settings.ma_short, self.settings.ma_long]

        smas = {}
        for period in periods:
            sma = calculate_sma(df["close"], period)
            smas[f"sma_{period}"] = float(sma.iloc[-1])

        return {
            **smas,
            "timestamp": int(df.index[-1]),
        }

    def calculate_ema_indicator(
        self, df: pd.DataFrame, periods: List[int] | None = None
    ) -> Dict[str, Any]:
        """
        计算 EMA 指标

        Args:
            df: OHLCV DataFrame
            periods: EMA 周期列表

        Returns:
            EMA 指标数据
        """
        periods = periods or [self.settings.ma_short, self.settings.ma_long]

        emas = {}
        for period in periods:
            ema = calculate_ema(df["close"], period)
            emas[f"ema_{period}"] = float(ema.iloc[-1])

        return {
            **emas,
            "timestamp": int(df.index[-1]),
        }

    def calculate_stochastic_indicator(
        self, df: pd.DataFrame, k_period: int = 14, d_period: int = 3
    ) -> Dict[str, Any]:
        """
        计算 Stochastic 指标

        Args:
            df: OHLCV DataFrame
            k_period: %K 周期
            d_period: %D 周期

        Returns:
            Stochastic 指标数据
        """
        k, d = calculate_stochastic(df["high"], df["low"], df["close"], k_period, d_period)

        return {
            "k": float(k.iloc[-1]),
            "d": float(d.iloc[-1]),
            "timestamp": int(df.index[-1]),
        }

    def calculate_adx_indicator(self, df: pd.DataFrame, period: int = 14) -> Dict[str, Any]:
        """
        计算 ADX 指标

        Args:
            df: OHLCV DataFrame
            period: ADX 周期

        Returns:
            ADX 指标数据
        """
        adx = calculate_adx(df["high"], df["low"], df["close"], period)

        return {
            "value": float(adx.iloc[-1]),
            "period": period,
            "timestamp": int(df.index[-1]),
        }

    def calculate_obv_indicator(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        计算 OBV 指标

        Args:
            df: OHLCV DataFrame

        Returns:
            OBV 指标数据
        """
        obv = calculate_obv(df["close"], df["volume"])

        return {
            "value": float(obv.iloc[-1]),
            "timestamp": int(df.index[-1]),
        }

    def calculate_vwap_indicator(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        计算 VWAP 指标

        Args:
            df: OHLCV DataFrame

        Returns:
            VWAP 指标数据
        """
        vwap = calculate_vwap(df["high"], df["low"], df["close"], df["volume"])

        return {
            "value": float(vwap.iloc[-1]),
            "timestamp": int(df.index[-1]),
        }

    def calculate_indicators(
        self, ohlcv_data: List[OHLCVData], indicators: List[IndicatorType], params: Dict[str, Any] | None = None
    ) -> Dict[str, Any]:
        """
        批量计算技术指标

        Args:
            ohlcv_data: OHLCV 数据
            indicators: 指标类型列表
            params: 自定义参数

        Returns:
            指标数据字典
        """
        params = params or {}
        df = self._ohlcv_to_dataframe(ohlcv_data)
        results: Dict[str, Any] = {}

        start_time = time.time()
        logger.info(f"开始计算 {len(indicators)} 个指标")

        for indicator in indicators:
            try:
                if indicator == IndicatorType.RSI:
                    results["rsi"] = self.calculate_rsi_indicator(
                        df, params.get("rsi_period")
                    )
                elif indicator == IndicatorType.MACD:
                    results["macd"] = self.calculate_macd_indicator(
                        df,
                        params.get("macd_fast"),
                        params.get("macd_slow"),
                        params.get("macd_signal"),
                    )
                elif indicator == IndicatorType.BOLLINGER_BANDS:
                    results["bb"] = self.calculate_bb_indicator(
                        df, params.get("bb_period"), params.get("bb_std")
                    )
                elif indicator == IndicatorType.SMA:
                    results["sma"] = self.calculate_sma_indicator(
                        df, params.get("sma_periods")
                    )
                elif indicator == IndicatorType.EMA:
                    results["ema"] = self.calculate_ema_indicator(
                        df, params.get("ema_periods")
                    )
                elif indicator == IndicatorType.STOCHASTIC:
                    results["stochastic"] = self.calculate_stochastic_indicator(df)
                elif indicator == IndicatorType.ADX:
                    results["adx"] = self.calculate_adx_indicator(df)
                elif indicator == IndicatorType.OBV:
                    results["obv"] = self.calculate_obv_indicator(df)
                elif indicator == IndicatorType.VWAP:
                    results["vwap"] = self.calculate_vwap_indicator(df)

                logger.debug(f"成功计算指标: {indicator.value}")

            except Exception as e:
                logger.error(f"计算指标 {indicator.value} 时出错: {str(e)}")
                results[indicator.value] = {"error": str(e)}

        elapsed = time.time() - start_time
        logger.info(f"指标计算完成，耗时: {elapsed:.3f}s")

        return results
