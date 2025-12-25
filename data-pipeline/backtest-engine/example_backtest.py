"""回测引擎使用示例

演示如何使用回测引擎进行策略测试
"""
from datetime import datetime
import logging

from src.models.schemas import BacktestConfig
from src.engine.backtest_engine import BacktestEngine
from src.engine.event_engine import SignalEvent
from src.reports.generator import ReportGenerator

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)


def simple_ma_strategy(event, data_handler, portfolio):
    """
    简单移动平均线策略

    规则:
    - MA5 > MA20: 买入信号
    - MA5 < MA20: 卖出信号
    """
    signals = []
    market_data = event.data

    for symbol in market_data.keys():
        # 获取最近20条数据
        recent_data = data_handler.get_latest_data(symbol, n=20)

        if recent_data is None or len(recent_data) < 20:
            continue

        # 计算移动平均线
        ma5 = recent_data['close'].tail(5).mean()
        ma20 = recent_data['close'].tail(20).mean()

        # 前一周期的均线
        prev_ma5 = recent_data['close'].iloc[-6:-1].mean()
        prev_ma20 = recent_data['close'].tail(20).iloc[:-1].mean()

        # 金叉: 买入信号
        if prev_ma5 <= prev_ma20 and ma5 > ma20:
            if not portfolio.has_position(symbol):
                signals.append(
                    SignalEvent(
                        timestamp=event.timestamp,
                        symbol=symbol,
                        signal_type='buy',
                        strength=1.0,
                        metadata={'ma5': ma5, 'ma20': ma20}
                    )
                )
                logging.info(f"[{symbol}] 金叉买入信号 | MA5: {ma5:.2f}, MA20: {ma20:.2f}")

        # 死叉: 卖出信号
        elif prev_ma5 >= prev_ma20 and ma5 < ma20:
            if portfolio.has_position(symbol):
                signals.append(
                    SignalEvent(
                        timestamp=event.timestamp,
                        symbol=symbol,
                        signal_type='sell',
                        strength=1.0,
                        metadata={'ma5': ma5, 'ma20': ma20}
                    )
                )
                logging.info(f"[{symbol}] 死叉卖出信号 | MA5: {ma5:.2f}, MA20: {ma20:.2f}")

    return signals


def main():
    """主函数"""
    print("=" * 60)
    print("Delta Terminal - 回测引擎示例")
    print("=" * 60)

    # 1. 创建回测配置
    config = BacktestConfig(
        strategy_id="simple_ma_demo",
        symbols=["BTCUSDT", "ETHUSDT"],
        start_date=datetime(2024, 1, 1),
        end_date=datetime(2024, 6, 30),
        initial_capital=100000.0,
        commission=0.001,  # 0.1%
        slippage=0.0005   # 0.05%
    )

    print("\n回测配置:")
    print(f"  策略: {config.strategy_id}")
    print(f"  品种: {', '.join(config.symbols)}")
    print(f"  时间: {config.start_date.date()} ~ {config.end_date.date()}")
    print(f"  初始资金: ${config.initial_capital:,.2f}")
    print(f"  手续费: {config.commission*100:.2f}%")
    print(f"  滑点: {config.slippage*100:.2f}%")

    # 2. 创建回测引擎
    engine = BacktestEngine(config)

    # 3. 设置策略
    engine.set_strategy(simple_ma_strategy)

    # 4. 运行回测
    print("\n开始回测...")
    result = engine.run(data_source="mock")

    # 5. 打印结果
    print("\n" + "=" * 60)
    print("回测结果")
    print("=" * 60)

    m = result.metrics

    print(f"\n回测ID: {result.backtest_id}")
    print(f"执行状态: {result.status}")
    print(f"执行耗时: {result.duration_seconds:.2f}秒")

    print("\n📊 收益指标:")
    print(f"  总收益率: {m.total_return*100:+.2f}%")
    print(f"  年化收益: {m.annual_return*100:+.2f}%")
    print(f"  累计收益: {m.cumulative_return*100:+.2f}%")

    print("\n📉 风险指标:")
    print(f"  波动率: {m.volatility*100:.2f}%")
    print(f"  最大回撤: {m.max_drawdown*100:.2f}%")
    print(f"  回撤时长: {m.max_drawdown_duration}天")

    print("\n📈 风险调整收益:")
    print(f"  夏普比率: {m.sharpe_ratio:.2f}")
    print(f"  索提诺比率: {m.sortino_ratio:.2f}")
    print(f"  卡玛比率: {m.calmar_ratio:.2f}")

    print("\n💼 交易统计:")
    print(f"  总交易数: {m.total_trades}")
    print(f"  胜率: {m.win_rate*100:.2f}%")
    print(f"  盈亏比: {m.profit_factor:.2f}")
    print(f"  平均盈利: ${m.average_win:.2f}")
    print(f"  平均亏损: ${m.average_loss:.2f}")
    print(f"  最大盈利: ${m.largest_win:.2f}")
    print(f"  最大亏损: ${m.largest_loss:.2f}")

    # 6. 生成报告
    print("\n生成回测报告...")
    report_gen = ReportGenerator()

    # HTML报告
    html_path = report_gen.generate_html(result)
    print(f"  HTML报告: {html_path}")

    # Excel报告
    excel_path = report_gen.generate_excel(result)
    print(f"  Excel报告: {excel_path}")

    print("\n" + "=" * 60)
    print("回测完成!")
    print("=" * 60)

    # 7. 显示权益曲线统计
    equity_df = engine.portfolio.get_equity_curve_df()
    if not equity_df.empty:
        print(f"\n权益曲线数据点: {len(equity_df)}")
        print(f"起始权益: ${equity_df['equity'].iloc[0]:,.2f}")
        print(f"最终权益: ${equity_df['equity'].iloc[-1]:,.2f}")
        print(f"最高权益: ${equity_df['equity'].max():,.2f}")
        print(f"最低权益: ${equity_df['equity'].min():,.2f}")


if __name__ == "__main__":
    main()
