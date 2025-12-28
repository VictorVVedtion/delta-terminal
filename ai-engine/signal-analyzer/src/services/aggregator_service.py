"""信号聚合服务"""

import time
from typing import Any, Dict, List

from loguru import logger

from ..models import IndividualSignal, OHLCVData, SignalType, StrategyType
from .signal_service import SignalService


class AggregatorService:
    """信号聚合服务"""

    def __init__(self) -> None:
        self.signal_service = SignalService()

    def aggregate_signals(
        self,
        ohlcv_data: List[OHLCVData],
        strategies: List[StrategyType],
        weights: Dict[str, float] | None = None,
    ) -> Dict[str, Any]:
        """
        聚合多个策略信号

        Args:
            ohlcv_data: OHLCV 数据
            strategies: 策略列表
            weights: 策略权重

        Returns:
            聚合信号数据
        """
        start_time = time.time()
        logger.info(f"开始聚合 {len(strategies)} 个策略信号")

        # 默认权重
        if weights is None:
            weights = {strategy.value: 1.0 / len(strategies) for strategy in strategies}

        # 归一化权重
        total_weight = sum(weights.values())
        normalized_weights = {k: v / total_weight for k, v in weights.items()}

        # 生成各策略信号
        individual_signals: List[IndividualSignal] = []
        buy_score = 0.0
        sell_score = 0.0

        for strategy in strategies:
            try:
                signal_data = self.signal_service.generate_signal(ohlcv_data, strategy)
                signal = signal_data["signal"]
                confidence = signal_data["confidence"]
                weight = normalized_weights.get(strategy.value, 0.0)

                # 记录单个信号
                individual_signals.append(
                    IndividualSignal(
                        strategy=strategy, signal=signal, confidence=confidence
                    )
                )

                # 加权累积分数
                if signal == SignalType.BUY:
                    buy_score += confidence * weight
                elif signal == SignalType.SELL:
                    sell_score += confidence * weight
                else:
                    # NEUTRAL 信号不计入分数
                    pass

                logger.debug(
                    f"策略 {strategy.value}: {signal.value}, "
                    f"置信度: {confidence:.2f}, 权重: {weight:.2f}"
                )

            except Exception as e:
                logger.error(f"生成 {strategy.value} 策略信号时出错: {str(e)}")
                continue

        # 确定聚合信号
        if buy_score > sell_score and buy_score > 0.5:
            aggregated_signal = SignalType.BUY
            aggregated_confidence = buy_score
        elif sell_score > buy_score and sell_score > 0.5:
            aggregated_signal = SignalType.SELL
            aggregated_confidence = sell_score
        else:
            aggregated_signal = SignalType.NEUTRAL
            aggregated_confidence = max(buy_score, sell_score)

        # 构建聚合原因
        reasoning = self._build_aggregated_reasoning(individual_signals, aggregated_signal)

        elapsed = time.time() - start_time
        logger.info(
            f"信号聚合完成: {aggregated_signal.value}, "
            f"置信度: {aggregated_confidence:.2f}, 耗时: {elapsed:.3f}s"
        )

        return {
            "aggregated_signal": aggregated_signal,
            "confidence": aggregated_confidence,
            "individual_signals": individual_signals,
            "reasoning": reasoning,
            "weights": normalized_weights,
        }

    def _build_aggregated_reasoning(
        self, individual_signals: List[IndividualSignal], aggregated_signal: SignalType
    ) -> str:
        """
        构建聚合信号原因说明

        Args:
            individual_signals: 单个信号列表
            aggregated_signal: 聚合信号

        Returns:
            原因说明
        """
        buy_strategies = []
        sell_strategies = []
        neutral_strategies = []

        for signal in individual_signals:
            if signal.signal == SignalType.BUY:
                buy_strategies.append(f"{signal.strategy.value}({signal.confidence:.2f})")
            elif signal.signal == SignalType.SELL:
                sell_strategies.append(f"{signal.strategy.value}({signal.confidence:.2f})")
            else:
                neutral_strategies.append(f"{signal.strategy.value}({signal.confidence:.2f})")

        parts = []

        if aggregated_signal == SignalType.BUY:
            if buy_strategies:
                parts.append(f"看涨策略: {', '.join(buy_strategies)}")
            if sell_strategies:
                parts.append(f"看跌策略: {', '.join(sell_strategies)}")
        elif aggregated_signal == SignalType.SELL:
            if sell_strategies:
                parts.append(f"看跌策略: {', '.join(sell_strategies)}")
            if buy_strategies:
                parts.append(f"看涨策略: {', '.join(buy_strategies)}")
        else:
            parts.append("各策略信号分歧较大")
            if buy_strategies:
                parts.append(f"看涨: {', '.join(buy_strategies)}")
            if sell_strategies:
                parts.append(f"看跌: {', '.join(sell_strategies)}")

        return "; ".join(parts)
