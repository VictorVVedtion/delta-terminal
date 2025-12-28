"""交易信号生成服务"""

import time
from typing import Any, Dict, List

import pandas as pd
from loguru import logger

from ..config import get_settings
from ..models import OHLCVData, SignalType, StrategyType
from .indicator_service import IndicatorService

settings = get_settings()


class SignalService:
    """交易信号生成服务"""

    def __init__(self) -> None:
        self.settings = settings
        self.indicator_service = IndicatorService()

    def generate_momentum_signal(self, ohlcv_data: List[OHLCVData]) -> Dict[str, Any]:
        """
        基于动量指标生成信号

        Args:
            ohlcv_data: OHLCV 数据

        Returns:
            信号数据
        """
        from ..models import IndicatorType

        # 计算动量指标
        indicators = self.indicator_service.calculate_indicators(
            ohlcv_data, [IndicatorType.RSI, IndicatorType.MACD, IndicatorType.STOCHASTIC]
        )

        rsi_data = indicators.get("rsi", {})
        macd_data = indicators.get("macd", {})
        stoch_data = indicators.get("stochastic", {})

        # 评分系统
        buy_score = 0.0
        sell_score = 0.0

        # RSI 评分
        if "value" in rsi_data:
            rsi_value = rsi_data["value"]
            if rsi_value < 30:
                buy_score += 0.4
            elif rsi_value > 70:
                sell_score += 0.4

        # MACD 评分
        if "trend" in macd_data:
            trend = macd_data["trend"]
            if trend == "bullish_crossover":
                buy_score += 0.4
            elif trend == "bearish_crossover":
                sell_score += 0.4
            elif trend == "bullish":
                buy_score += 0.2
            elif trend == "bearish":
                sell_score += 0.2

        # Stochastic 评分
        if "k" in stoch_data and "d" in stoch_data:
            k_value = stoch_data["k"]
            d_value = stoch_data["d"]
            if k_value < 20 and d_value < 20:
                buy_score += 0.3
            elif k_value > 80 and d_value > 80:
                sell_score += 0.3

        # 归一化分数
        total_score = buy_score + sell_score
        if total_score > 0:
            buy_confidence = buy_score / total_score
            sell_confidence = sell_score / total_score
        else:
            buy_confidence = 0.5
            sell_confidence = 0.5

        # 确定信号
        if buy_confidence > 0.6:
            signal = SignalType.BUY
            confidence = buy_confidence
            reasoning = self._build_reasoning(indicators, "buy")
        elif sell_confidence > 0.6:
            signal = SignalType.SELL
            confidence = sell_confidence
            reasoning = self._build_reasoning(indicators, "sell")
        else:
            signal = SignalType.NEUTRAL
            confidence = max(buy_confidence, sell_confidence)
            reasoning = "动量指标信号不明确"

        return {
            "signal": signal,
            "confidence": confidence,
            "indicators": indicators,
            "reasoning": reasoning,
        }

    def generate_trend_signal(self, ohlcv_data: List[OHLCVData]) -> Dict[str, Any]:
        """
        基于趋势指标生成信号

        Args:
            ohlcv_data: OHLCV 数据

        Returns:
            信号数据
        """
        from ..models import IndicatorType

        # 计算趋势指标
        indicators = self.indicator_service.calculate_indicators(
            ohlcv_data,
            [IndicatorType.EMA, IndicatorType.BOLLINGER_BANDS, IndicatorType.ADX],
        )

        ema_data = indicators.get("ema", {})
        bb_data = indicators.get("bb", {})
        adx_data = indicators.get("adx", {})

        buy_score = 0.0
        sell_score = 0.0

        # EMA 金叉/死叉
        if "ema_20" in ema_data and "ema_50" in ema_data:
            ema_20 = ema_data["ema_20"]
            ema_50 = ema_data["ema_50"]
            if ema_20 > ema_50:
                buy_score += 0.3
            else:
                sell_score += 0.3

        # 布林带位置
        if "position" in bb_data:
            position = bb_data["position"]
            if position == "below_lower":
                buy_score += 0.4
            elif position == "above_upper":
                sell_score += 0.4

        # ADX 趋势强度
        if "value" in adx_data:
            adx_value = adx_data["value"]
            if adx_value > 25:
                # 强趋势，增加权重
                if buy_score > sell_score:
                    buy_score += 0.3
                else:
                    sell_score += 0.3

        total_score = buy_score + sell_score
        if total_score > 0:
            buy_confidence = buy_score / total_score
            sell_confidence = sell_score / total_score
        else:
            buy_confidence = 0.5
            sell_confidence = 0.5

        if buy_confidence > 0.6:
            signal = SignalType.BUY
            confidence = buy_confidence
            reasoning = self._build_reasoning(indicators, "buy")
        elif sell_confidence > 0.6:
            signal = SignalType.SELL
            confidence = sell_confidence
            reasoning = self._build_reasoning(indicators, "sell")
        else:
            signal = SignalType.NEUTRAL
            confidence = max(buy_confidence, sell_confidence)
            reasoning = "趋势信号不明确"

        return {
            "signal": signal,
            "confidence": confidence,
            "indicators": indicators,
            "reasoning": reasoning,
        }

    def generate_volume_signal(self, ohlcv_data: List[OHLCVData]) -> Dict[str, Any]:
        """
        基于成交量指标生成信号

        Args:
            ohlcv_data: OHLCV 数据

        Returns:
            信号数据
        """
        from ..models import IndicatorType

        # 计算成交量指标
        indicators = self.indicator_service.calculate_indicators(
            ohlcv_data, [IndicatorType.OBV, IndicatorType.VWAP]
        )

        obv_data = indicators.get("obv", {})
        vwap_data = indicators.get("vwap", {})

        buy_score = 0.0
        sell_score = 0.0

        # OBV 趋势（简化版，需要历史数据对比）
        if "value" in obv_data:
            # 这里简化处理，实际需要比较 OBV 趋势
            buy_score += 0.3

        # VWAP 位置
        if "value" in vwap_data:
            df = self.indicator_service._ohlcv_to_dataframe(ohlcv_data)
            current_price = float(df["close"].iloc[-1])
            vwap_value = vwap_data["value"]

            if current_price < vwap_value:
                buy_score += 0.4
            else:
                sell_score += 0.4

        total_score = buy_score + sell_score
        if total_score > 0:
            buy_confidence = buy_score / total_score
            sell_confidence = sell_score / total_score
        else:
            buy_confidence = 0.5
            sell_confidence = 0.5

        if buy_confidence > 0.6:
            signal = SignalType.BUY
            confidence = buy_confidence
            reasoning = self._build_reasoning(indicators, "buy")
        elif sell_confidence > 0.6:
            signal = SignalType.SELL
            confidence = sell_confidence
            reasoning = self._build_reasoning(indicators, "sell")
        else:
            signal = SignalType.NEUTRAL
            confidence = max(buy_confidence, sell_confidence)
            reasoning = "成交量信号不明确"

        return {
            "signal": signal,
            "confidence": confidence,
            "indicators": indicators,
            "reasoning": reasoning,
        }

    def generate_signal(
        self, ohlcv_data: List[OHLCVData], strategy: StrategyType
    ) -> Dict[str, Any]:
        """
        生成交易信号

        Args:
            ohlcv_data: OHLCV 数据
            strategy: 策略类型

        Returns:
            信号数据
        """
        start_time = time.time()
        logger.info(f"开始生成 {strategy.value} 策略信号")

        try:
            if strategy == StrategyType.MOMENTUM:
                result = self.generate_momentum_signal(ohlcv_data)
            elif strategy == StrategyType.TREND:
                result = self.generate_trend_signal(ohlcv_data)
            elif strategy == StrategyType.VOLUME:
                result = self.generate_volume_signal(ohlcv_data)
            else:
                raise ValueError(f"不支持的策略类型: {strategy}")

            elapsed = time.time() - start_time
            logger.info(
                f"信号生成完成: {result['signal'].value}, "
                f"置信度: {result['confidence']:.2f}, 耗时: {elapsed:.3f}s"
            )

            return result

        except Exception as e:
            logger.error(f"生成信号时出错: {str(e)}")
            raise

    def _build_reasoning(self, indicators: Dict[str, Any], signal_type: str) -> str:
        """
        构建信号原因说明

        Args:
            indicators: 指标数据
            signal_type: 信号类型（buy/sell）

        Returns:
            原因说明
        """
        reasons = []

        # RSI
        if "rsi" in indicators and "value" in indicators["rsi"]:
            rsi_value = indicators["rsi"]["value"]
            if signal_type == "buy" and rsi_value < 30:
                reasons.append(f"RSI 超卖 ({rsi_value:.1f})")
            elif signal_type == "sell" and rsi_value > 70:
                reasons.append(f"RSI 超买 ({rsi_value:.1f})")

        # MACD
        if "macd" in indicators and "trend" in indicators["macd"]:
            trend = indicators["macd"]["trend"]
            if signal_type == "buy" and "bullish" in trend:
                reasons.append(f"MACD {trend}")
            elif signal_type == "sell" and "bearish" in trend:
                reasons.append(f"MACD {trend}")

        # 布林带
        if "bb" in indicators and "position" in indicators["bb"]:
            position = indicators["bb"]["position"]
            if signal_type == "buy" and position == "below_lower":
                reasons.append("价格触及布林带下轨")
            elif signal_type == "sell" and position == "above_upper":
                reasons.append("价格触及布林带上轨")

        # EMA
        if "ema" in indicators:
            ema_data = indicators["ema"]
            if "ema_20" in ema_data and "ema_50" in ema_data:
                if signal_type == "buy" and ema_data["ema_20"] > ema_data["ema_50"]:
                    reasons.append("EMA 金叉")
                elif signal_type == "sell" and ema_data["ema_20"] < ema_data["ema_50"]:
                    reasons.append("EMA 死叉")

        if not reasons:
            return f"{signal_type} 信号"

        return ", ".join(reasons)
