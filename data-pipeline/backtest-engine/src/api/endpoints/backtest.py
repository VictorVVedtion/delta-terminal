"""回测API端点"""
from datetime import datetime
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, BackgroundTasks
import logging
import uuid

from src.models.schemas import (
    BacktestRequest,
    BacktestResult,
    BacktestConfig,
    HealthResponse
)
from src.engine.backtest_engine import BacktestEngine
from src.engine.event_engine import SignalEvent

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/backtest", tags=["回测"])

# 存储运行中的回测任务
running_backtests: Dict[str, BacktestResult] = {}


@router.post("/run", response_model=BacktestResult)
async def run_backtest(request: BacktestRequest) -> BacktestResult:
    """
    运行回测

    支持自定义策略代码或预定义策略
    """
    try:
        logger.info(f"收到回测请求 | 策略: {request.config.strategy_id}")

        # 创建回测引擎
        engine = BacktestEngine(config=request.config)

        # 设置策略
        if request.config.strategy_code:
            # 自定义策略代码
            strategy_func = _compile_strategy(request.config.strategy_code)
        else:
            # 使用预定义策略
            strategy_func = _get_predefined_strategy(request.config.strategy_id)

        engine.set_strategy(strategy_func)

        # 运行回测
        result = engine.run(data_source=request.data_source)

        # 缓存结果
        running_backtests[result.backtest_id] = result

        return result

    except Exception as e:
        logger.error(f"回测执行失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"回测执行失败: {str(e)}")


@router.get("/result/{backtest_id}", response_model=BacktestResult)
async def get_backtest_result(backtest_id: str) -> BacktestResult:
    """获取回测结果"""
    if backtest_id not in running_backtests:
        raise HTTPException(status_code=404, detail=f"回测结果不存在: {backtest_id}")

    return running_backtests[backtest_id]


@router.delete("/result/{backtest_id}")
async def delete_backtest_result(backtest_id: str) -> Dict[str, str]:
    """删除回测结果"""
    if backtest_id not in running_backtests:
        raise HTTPException(status_code=404, detail=f"回测结果不存在: {backtest_id}")

    del running_backtests[backtest_id]
    return {"message": f"已删除回测结果: {backtest_id}"}


@router.get("/list")
async def list_backtests() -> Dict[str, Any]:
    """列出所有回测结果"""
    return {
        "total": len(running_backtests),
        "backtests": [
            {
                "backtest_id": bt_id,
                "strategy_id": result.config.strategy_id,
                "symbols": result.config.symbols,
                "status": result.status,
                "total_return": result.metrics.total_return,
                "sharpe_ratio": result.metrics.sharpe_ratio,
                "created_at": result.start_time
            }
            for bt_id, result in running_backtests.items()
        ]
    }


# ========== 辅助函数 ==========

def _compile_strategy(strategy_code: str):
    """
    编译用户自定义策略代码

    策略函数签名:
    def strategy(event, data_handler, portfolio):
        # 返回信号列表
        return [SignalEvent(...)]
    """
    try:
        # 创建命名空间
        namespace = {
            'SignalEvent': SignalEvent,
            'logger': logger
        }

        # 执行代码
        exec(strategy_code, namespace)

        # 获取策略函数 (假设函数名为 'strategy')
        if 'strategy' not in namespace:
            raise ValueError("策略代码必须定义 'strategy' 函数")

        return namespace['strategy']

    except Exception as e:
        logger.error(f"策略编译失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"策略代码错误: {str(e)}")


def _get_predefined_strategy(strategy_id: str):
    """
    获取预定义策略

    策略库:
    - simple_ma: 简单移动平均线策略
    - rsi_reversal: RSI反转策略
    - breakout: 突破策略
    """
    strategies = {
        "simple_ma": _simple_ma_strategy,
        "rsi_reversal": _rsi_reversal_strategy,
        "breakout": _breakout_strategy,
        "buy_and_hold": _buy_and_hold_strategy
    }

    if strategy_id not in strategies:
        raise HTTPException(
            status_code=400,
            detail=f"未知策略: {strategy_id}. 可用策略: {list(strategies.keys())}"
        )

    return strategies[strategy_id]


# ========== 预定义策略 ==========

def _simple_ma_strategy(event, data_handler, portfolio):
    """
    简单移动平均线策略

    规则:
    - 短期均线上穿长期均线: 买入
    - 短期均线下穿长期均线: 卖出
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
                        strength=1.0
                    )
                )

        # 死叉: 卖出信号
        elif prev_ma5 >= prev_ma20 and ma5 < ma20:
            if portfolio.has_position(symbol):
                signals.append(
                    SignalEvent(
                        timestamp=event.timestamp,
                        symbol=symbol,
                        signal_type='sell',
                        strength=1.0
                    )
                )

    return signals


def _rsi_reversal_strategy(event, data_handler, portfolio):
    """RSI反转策略 (示例)"""
    # TODO: 实现RSI策略
    return []


def _breakout_strategy(event, data_handler, portfolio):
    """突破策略 (示例)"""
    # TODO: 实现突破策略
    return []


def _buy_and_hold_strategy(event, data_handler, portfolio):
    """
    买入持有策略 (基准)

    第一根K线买入,持有到结束
    """
    signals = []
    market_data = event.data

    for symbol in market_data.keys():
        # 检查是否是第一根K线
        recent_data = data_handler.get_latest_data(symbol, n=2)
        if recent_data is not None and len(recent_data) == 1:
            # 第一根K线,买入
            signals.append(
                SignalEvent(
                    timestamp=event.timestamp,
                    symbol=symbol,
                    signal_type='buy',
                    strength=1.0
                )
            )

    return signals
