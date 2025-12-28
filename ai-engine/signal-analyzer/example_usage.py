"""Signal Analyzer 使用示例"""

import asyncio
import time

from src.models import IndicatorType, OHLCVData, StrategyType
from src.services import AggregatorService, IndicatorService, SignalService


def generate_sample_ohlcv_data(num_candles: int = 100) -> list[OHLCVData]:
    """生成示例 OHLCV 数据"""
    import random

    base_price = 42000.0
    base_volume = 1000.0
    data = []

    for i in range(num_candles):
        timestamp = int(time.time() * 1000) - (num_candles - i) * 3600000  # 1小时K线
        open_price = base_price + random.uniform(-500, 500)
        high = open_price + random.uniform(0, 300)
        low = open_price - random.uniform(0, 300)
        close = open_price + random.uniform(-200, 200)
        volume = base_volume + random.uniform(-200, 200)

        data.append(
            OHLCVData(
                timestamp=timestamp,
                open=open_price,
                high=high,
                low=low,
                close=close,
                volume=volume,
            )
        )

        # 随机趋势
        base_price = close

    return data


async def test_indicator_calculation() -> None:
    """测试指标计算"""
    print("=== 测试技术指标计算 ===")

    indicator_service = IndicatorService()
    ohlcv_data = generate_sample_ohlcv_data(100)

    # 计算多个指标
    indicators = indicator_service.calculate_indicators(
        ohlcv_data,
        [
            IndicatorType.RSI,
            IndicatorType.MACD,
            IndicatorType.BOLLINGER_BANDS,
            IndicatorType.EMA,
        ],
    )

    print(f"RSI: {indicators.get('rsi', {})}")
    print(f"MACD: {indicators.get('macd', {})}")
    print(f"Bollinger Bands: {indicators.get('bb', {})}")
    print(f"EMA: {indicators.get('ema', {})}")
    print()


async def test_signal_generation() -> None:
    """测试信号生成"""
    print("=== 测试交易信号生成 ===")

    signal_service = SignalService()
    ohlcv_data = generate_sample_ohlcv_data(100)

    # 测试不同策略
    for strategy in [StrategyType.MOMENTUM, StrategyType.TREND, StrategyType.VOLUME]:
        signal_data = signal_service.generate_signal(ohlcv_data, strategy)

        print(f"\n策略: {strategy.value}")
        print(f"信号: {signal_data['signal'].value}")
        print(f"置信度: {signal_data['confidence']:.2%}")
        print(f"原因: {signal_data['reasoning']}")


async def test_signal_aggregation() -> None:
    """测试信号聚合"""
    print("\n=== 测试信号聚合 ===")

    aggregator_service = AggregatorService()
    ohlcv_data = generate_sample_ohlcv_data(100)

    # 聚合三种策略
    aggregated = aggregator_service.aggregate_signals(
        ohlcv_data,
        [StrategyType.MOMENTUM, StrategyType.TREND, StrategyType.VOLUME],
        weights={
            "momentum": 0.4,
            "trend": 0.4,
            "volume": 0.2,
        },
    )

    print(f"聚合信号: {aggregated['aggregated_signal'].value}")
    print(f"聚合置信度: {aggregated['confidence']:.2%}")
    print(f"原因: {aggregated['reasoning']}")
    print("\n单个信号:")
    for signal in aggregated["individual_signals"]:
        print(
            f"  - {signal.strategy.value}: {signal.signal.value} ({signal.confidence:.2%})"
        )


async def main() -> None:
    """主函数"""
    print("Signal Analyzer 使用示例\n")

    await test_indicator_calculation()
    await test_signal_generation()
    await test_signal_aggregation()

    print("\n✅ 所有测试完成!")


if __name__ == "__main__":
    asyncio.run(main())
