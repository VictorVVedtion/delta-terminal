"""回测引擎核心 - 整合所有组件"""
from datetime import datetime
from typing import Dict, List, Optional, Callable
import logging
import time
import uuid

from src.models.schemas import (
    BacktestConfig,
    BacktestResult,
    PerformanceMetrics,
    Fill
)
from src.engine.event_engine import (
    EventEngine,
    Event,
    EventType,
    MarketEvent,
    SignalEvent,
    OrderEvent,
    FillEvent
)
from src.engine.data_handler import DataHandler
from src.engine.portfolio import Portfolio
from src.engine.execution import SimulatedExecutionHandler
from src.metrics.performance import PerformanceCalculator
from src.metrics.risk import RiskCalculator

logger = logging.getLogger(__name__)


class BacktestEngine:
    """
    回测引擎

    整合所有组件,驱动回测流程

    核心流程:
    1. 初始化组件 (事件引擎/数据处理/组合/执行)
    2. 注册事件处理器
    3. 加载历史数据
    4. 循环: 更新数据 -> 生成信号 -> 下单 -> 成交 -> 更新组合
    5. 计算性能指标
    6. 生成回测报告
    """

    def __init__(self, config: BacktestConfig):
        """
        Args:
            config: 回测配置
        """
        self.config = config
        self.backtest_id = str(uuid.uuid4())

        # 核心组件
        self.event_engine = EventEngine()
        self.data_handler = DataHandler(
            symbols=config.symbols,
            start_date=config.start_date,
            end_date=config.end_date,
            event_engine=self.event_engine
        )
        self.portfolio = Portfolio(initial_capital=config.initial_capital)
        self.execution_handler = SimulatedExecutionHandler(
            data_handler=self.data_handler,
            commission=config.commission,
            slippage=config.slippage
        )

        # 策略函数 (用户自定义)
        self.strategy_func: Optional[Callable] = None

        # 回测状态
        self.start_time: Optional[datetime] = None
        self.end_time: Optional[datetime] = None
        self.is_running = False

        # 注册事件处理器
        self._register_handlers()

    def set_strategy(self, strategy_func: Callable) -> None:
        """
        设置策略函数

        策略函数签名:
        def strategy(event: MarketEvent, data_handler: DataHandler) -> List[SignalEvent]
        """
        self.strategy_func = strategy_func
        logger.info(f"策略已设置: {strategy_func.__name__}")

    def _register_handlers(self) -> None:
        """注册事件处理器"""
        self.event_engine.register_handler(EventType.MARKET, self._on_market)
        self.event_engine.register_handler(EventType.SIGNAL, self._on_signal)
        self.event_engine.register_handler(EventType.ORDER, self._on_order)
        self.event_engine.register_handler(EventType.FILL, self._on_fill)

    def _on_market(self, event: MarketEvent) -> None:
        """
        处理市场数据事件

        1. 更新组合市值
        2. 调用策略生成信号
        """
        market_data = event.data

        # 更新持仓市值
        current_prices = {
            symbol: data['close']
            for symbol, data in market_data.items()
        }
        self.portfolio.update_market_value(current_prices)

        # 记录权益
        self.portfolio.record_equity(event.timestamp)

        # 调用策略
        if self.strategy_func:
            try:
                signals = self.strategy_func(event, self.data_handler, self.portfolio)
                if signals:
                    for signal in signals:
                        self.event_engine.put_event(signal)
            except Exception as e:
                logger.error(f"策略执行失败: {str(e)}", exc_info=True)

    def _on_signal(self, event: SignalEvent) -> None:
        """
        处理交易信号事件

        将信号转换为订单
        """
        data = event.data
        symbol = data['symbol']
        signal_type = data['signal_type']
        strength = data['strength']

        # 简单的资金管理: 每次使用10%资金
        available_cash = self.portfolio.get_available_cash()
        position_size = available_cash * 0.1

        current_price = self.data_handler.get_current_price(symbol)
        if not current_price:
            return

        quantity = position_size / current_price

        # 生成订单
        if signal_type == 'buy':
            order = OrderEvent(
                timestamp=event.timestamp,
                symbol=symbol,
                order_type='market',
                side='buy',
                quantity=quantity
            )
            self.event_engine.put_event(order)

        elif signal_type == 'sell':
            # 检查是否有持仓
            if self.portfolio.has_position(symbol):
                pos = self.portfolio.get_position(symbol)
                order = OrderEvent(
                    timestamp=event.timestamp,
                    symbol=symbol,
                    order_type='market',
                    side='sell',
                    quantity=pos.quantity  # 全部卖出
                )
                self.event_engine.put_event(order)

    def _on_order(self, event: OrderEvent) -> None:
        """
        处理订单事件

        通过执行器模拟成交
        """
        fill_event = self.execution_handler.execute_order(event)
        if fill_event:
            self.event_engine.put_event(fill_event)

    def _on_fill(self, event: FillEvent) -> None:
        """
        处理成交事件

        更新投资组合
        """
        self.portfolio.update_fill(event)

    def run(self, data_source: str = "mock") -> BacktestResult:
        """
        运行回测

        Args:
            data_source: 数据源

        Returns:
            BacktestResult
        """
        logger.info(f"======== 回测开始 ======== | ID: {self.backtest_id}")
        self.start_time = datetime.now()
        self.is_running = True

        try:
            # 1. 加载数据
            self.data_handler.load_data(data_source=data_source)

            # 2. 主循环: 迭代历史数据
            while self.data_handler.continue_backtest():
                # 更新下一根K线
                self.data_handler.update_bars()

                # 处理事件队列
                self.event_engine.run()

            # 3. 计算性能指标
            metrics = self._calculate_metrics()

            # 4. 生成结果
            self.end_time = datetime.now()
            duration = (self.end_time - self.start_time).total_seconds()

            result = BacktestResult(
                backtest_id=self.backtest_id,
                config=self.config,
                start_time=self.start_time,
                end_time=self.end_time,
                duration_seconds=duration,
                metrics=metrics,
                equity_curve=self.portfolio.equity_curve,
                trades=self._format_trades(),
                position_history=[],
                status="completed"
            )

            logger.info(f"======== 回测完成 ======== | 耗时: {duration:.2f}s")
            self._log_summary(result)

            return result

        except Exception as e:
            logger.error(f"回测失败: {str(e)}", exc_info=True)
            self.end_time = datetime.now()
            duration = (self.end_time - self.start_time).total_seconds()

            return BacktestResult(
                backtest_id=self.backtest_id,
                config=self.config,
                start_time=self.start_time,
                end_time=self.end_time,
                duration_seconds=duration,
                metrics=self._get_empty_metrics(),
                equity_curve=[],
                trades=[],
                position_history=[],
                status="failed",
                error_message=str(e)
            )
        finally:
            self.is_running = False

    def _calculate_metrics(self) -> PerformanceMetrics:
        """计算性能指标"""
        equity_df = self.portfolio.get_equity_curve_df()
        fills = self.execution_handler.get_fills()

        perf_calc = PerformanceCalculator(equity_df, fills, self.config.initial_capital)
        risk_calc = RiskCalculator(equity_df)

        return PerformanceMetrics(
            # 收益指标
            total_return=perf_calc.total_return(),
            annual_return=perf_calc.annual_return(),
            cumulative_return=perf_calc.cumulative_return(),

            # 风险指标
            volatility=risk_calc.volatility(),
            sharpe_ratio=risk_calc.sharpe_ratio(),
            sortino_ratio=risk_calc.sortino_ratio(),
            calmar_ratio=risk_calc.calmar_ratio(),
            max_drawdown=risk_calc.max_drawdown(),
            max_drawdown_duration=risk_calc.max_drawdown_duration(),

            # 交易指标
            total_trades=perf_calc.total_trades(),
            win_rate=perf_calc.win_rate(),
            profit_factor=perf_calc.profit_factor(),
            average_win=perf_calc.average_win(),
            average_loss=perf_calc.average_loss(),
            largest_win=perf_calc.largest_win(),
            largest_loss=perf_calc.largest_loss()
        )

    def _get_empty_metrics(self) -> PerformanceMetrics:
        """获取空指标 (用于失败情况)"""
        return PerformanceMetrics(
            total_return=0.0,
            annual_return=0.0,
            cumulative_return=0.0,
            volatility=0.0,
            sharpe_ratio=0.0,
            sortino_ratio=0.0,
            calmar_ratio=0.0,
            max_drawdown=0.0,
            max_drawdown_duration=0,
            total_trades=0,
            win_rate=0.0,
            profit_factor=0.0,
            average_win=0.0,
            average_loss=0.0,
            largest_win=0.0,
            largest_loss=0.0
        )

    def _format_trades(self) -> List[Fill]:
        """格式化成交记录"""
        fills = self.execution_handler.get_fills()
        return [
            Fill(
                fill_id=f['fill_id'],
                order_id=f['order_id'],
                timestamp=f['timestamp'],
                symbol=f['symbol'],
                side=f['side'],
                quantity=f['quantity'],
                price=f['price'],
                commission=f['commission'],
                slippage=f['slippage']
            )
            for f in fills
        ]

    def _log_summary(self, result: BacktestResult) -> None:
        """打印回测摘要"""
        m = result.metrics
        logger.info("========================================")
        logger.info("回测摘要:")
        logger.info(f"  总收益率: {m.total_return*100:.2f}%")
        logger.info(f"  年化收益: {m.annual_return*100:.2f}%")
        logger.info(f"  最大回撤: {m.max_drawdown*100:.2f}%")
        logger.info(f"  夏普比率: {m.sharpe_ratio:.2f}")
        logger.info(f"  总交易数: {m.total_trades}")
        logger.info(f"  胜率: {m.win_rate*100:.2f}%")
        logger.info("========================================")
