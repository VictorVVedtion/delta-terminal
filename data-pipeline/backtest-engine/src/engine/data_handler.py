"""数据处理器 - 管理历史数据加载与迭代"""
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Iterator
import pandas as pd
import numpy as np
import logging

from src.engine.event_engine import EventEngine, MarketEvent

logger = logging.getLogger(__name__)


class DataHandler:
    """
    数据处理器

    职责:
    1. 加载历史OHLCV数据
    2. 按时间顺序迭代数据
    3. 生成MarketEvent事件
    4. 提供数据查询接口
    """

    def __init__(
        self,
        symbols: List[str],
        start_date: datetime,
        end_date: datetime,
        event_engine: EventEngine
    ):
        self.symbols = symbols
        self.start_date = start_date
        self.end_date = end_date
        self.event_engine = event_engine

        # 数据存储: {symbol: DataFrame}
        self.data: Dict[str, pd.DataFrame] = {}

        # 当前数据索引
        self.current_index: Dict[str, int] = {symbol: 0 for symbol in symbols}

        # 最新数据缓存
        self.latest_data: Dict[str, Dict[str, float]] = {}

        self._is_loaded = False

    def load_data(self, data_source: str = "mock") -> None:
        """
        加载历史数据

        Args:
            data_source: 数据源 ("mock", "timescaledb", "csv")
        """
        logger.info(f"开始加载数据 | 品种: {self.symbols} | 数据源: {data_source}")

        if data_source == "mock":
            self._load_mock_data()
        elif data_source == "timescaledb":
            self._load_from_timescaledb()
        elif data_source == "csv":
            self._load_from_csv()
        else:
            raise ValueError(f"不支持的数据源: {data_source}")

        self._is_loaded = True
        logger.info(f"数据加载完成 | 总记录数: {sum(len(df) for df in self.data.values())}")

    def _load_mock_data(self) -> None:
        """生成模拟数据 (用于测试)"""
        for symbol in self.symbols:
            dates = pd.date_range(start=self.start_date, end=self.end_date, freq='1h')
            n = len(dates)

            # 生成随机价格数据
            np.random.seed(hash(symbol) % 2**32)
            base_price = 100.0
            returns = np.random.normal(0.0001, 0.02, n)
            prices = base_price * np.exp(np.cumsum(returns))

            df = pd.DataFrame({
                'timestamp': dates,
                'symbol': symbol,
                'open': prices * (1 + np.random.uniform(-0.005, 0.005, n)),
                'high': prices * (1 + np.random.uniform(0.001, 0.01, n)),
                'low': prices * (1 + np.random.uniform(-0.01, -0.001, n)),
                'close': prices,
                'volume': np.random.uniform(1000, 10000, n)
            })

            df = df.sort_values('timestamp').reset_index(drop=True)
            self.data[symbol] = df

            logger.debug(f"生成模拟数据: {symbol} | 记录数: {len(df)}")

    def _load_from_timescaledb(self) -> None:
        """从TimescaleDB加载数据"""
        # TODO: 实现数据库连接与查询
        logger.warning("TimescaleDB加载未实现,使用模拟数据")
        self._load_mock_data()

    def _load_from_csv(self) -> None:
        """从CSV文件加载数据"""
        # TODO: 实现CSV加载
        logger.warning("CSV加载未实现,使用模拟数据")
        self._load_mock_data()

    def get_latest_data(self, symbol: str, n: int = 1) -> Optional[pd.DataFrame]:
        """
        获取最新N条数据

        Args:
            symbol: 交易品种
            n: 数据条数

        Returns:
            DataFrame或None
        """
        if symbol not in self.data:
            return None

        idx = self.current_index[symbol]
        if idx == 0:
            return None

        start_idx = max(0, idx - n)
        return self.data[symbol].iloc[start_idx:idx].copy()

    def get_current_price(self, symbol: str) -> Optional[float]:
        """获取当前收盘价"""
        latest = self.latest_data.get(symbol)
        return latest.get('close') if latest else None

    def continue_backtest(self) -> bool:
        """
        检查是否还有数据未处理

        Returns:
            True if more data available
        """
        if not self._is_loaded:
            return False

        for symbol in self.symbols:
            if self.current_index[symbol] < len(self.data[symbol]):
                return True
        return False

    def update_bars(self) -> None:
        """
        更新下一根K线数据,生成MarketEvent

        按时间顺序从所有品种中取出下一条数据
        """
        if not self._is_loaded:
            raise RuntimeError("数据未加载,请先调用load_data()")

        # 找到所有品种中最早的下一个时间戳
        next_timestamps = {}
        for symbol in self.symbols:
            idx = self.current_index[symbol]
            if idx < len(self.data[symbol]):
                next_timestamps[symbol] = self.data[symbol].iloc[idx]['timestamp']

        if not next_timestamps:
            logger.debug("所有数据已处理完毕")
            return

        # 找到最早的时间戳
        earliest_symbol = min(next_timestamps, key=next_timestamps.get)
        earliest_time = next_timestamps[earliest_symbol]

        # 处理该时间戳的所有品种数据
        market_data = {}
        for symbol in self.symbols:
            idx = self.current_index[symbol]
            if idx < len(self.data[symbol]):
                row = self.data[symbol].iloc[idx]
                if row['timestamp'] == earliest_time:
                    bar_data = {
                        'timestamp': row['timestamp'],
                        'open': row['open'],
                        'high': row['high'],
                        'low': row['low'],
                        'close': row['close'],
                        'volume': row['volume']
                    }
                    market_data[symbol] = bar_data
                    self.latest_data[symbol] = bar_data
                    self.current_index[symbol] += 1

        # 生成MarketEvent
        if market_data:
            event = MarketEvent(
                timestamp=earliest_time,
                market_data=market_data
            )
            self.event_engine.put_event(event)

    def get_all_timestamps(self) -> List[datetime]:
        """获取所有唯一时间戳(已排序)"""
        all_timestamps = set()
        for df in self.data.values():
            all_timestamps.update(df['timestamp'].tolist())
        return sorted(list(all_timestamps))

    def reset(self) -> None:
        """重置数据索引"""
        self.current_index = {symbol: 0 for symbol in self.symbols}
        self.latest_data.clear()
        logger.info("数据处理器已重置")

    def get_stats(self) -> Dict[str, any]:
        """获取统计信息"""
        return {
            'symbols': self.symbols,
            'start_date': self.start_date.isoformat(),
            'end_date': self.end_date.isoformat(),
            'is_loaded': self._is_loaded,
            'data_points': {
                symbol: len(df) for symbol, df in self.data.items()
            },
            'current_progress': {
                symbol: f"{idx}/{len(self.data[symbol])}"
                for symbol, idx in self.current_index.items()
            }
        }
