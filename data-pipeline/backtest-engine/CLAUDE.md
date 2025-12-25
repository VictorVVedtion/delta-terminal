# Backtest Engine - 回测引擎模块

> Delta Terminal 数据管道 - 高性能量化回测引擎

## 模块信息

- **路径**: `data-pipeline/backtest-engine`
- **技术栈**: Python 3.11, FastAPI, Pandas, NumPy, Numba
- **端口**: 8003
- **状态**: ✅ 已实现

## 模块职责

回测引擎负责执行量化交易策略的历史数据回测,提供性能评估和风险分析。

### 核心功能

1. **事件驱动回测框架**
   - 高性能事件循环引擎
   - MarketEvent, SignalEvent, OrderEvent, FillEvent
   - 按时间顺序精确回放历史数据

2. **多品种同时回测**
   - 支持多个交易品种并行回测
   - 统一的投资组合管理
   - 品种间相关性分析

3. **交易成本模拟**
   - 可配置手续费率
   - 滑点模拟 (买入高于市价,卖出低于市价)
   - 真实市场条件还原

4. **性能指标计算**
   - 收益指标: 总收益率、年化收益、累计收益
   - 风险指标: 波动率、最大回撤、VaR/CVaR
   - 风险调整收益: 夏普、索提诺、卡玛比率
   - 交易统计: 胜率、盈亏比、平均盈亏

5. **可视化报告生成**
   - HTML交互式报告 (带图表)
   - Excel详细数据表
   - PDF报告 (待实现)

6. **参数优化支持** (待实现)
   - 网格搜索
   - 遗传算法
   - 贝叶斯优化

7. **并行回测** (待实现)
   - 多进程加速
   - 分布式回测

## 架构设计

### 事件驱动架构

```
┌─────────────┐
│ Data Handler│───> MarketEvent ───┐
└─────────────┘                    │
                                   ▼
                            ┌──────────────┐
                            │ Event Engine │
                            └──────────────┘
                                   │
                 ┌─────────────────┼─────────────────┐
                 ▼                 ▼                 ▼
           ┌──────────┐      ┌─────────┐      ┌──────────┐
           │ Strategy │      │Portfolio│      │Execution │
           └──────────┘      └─────────┘      └──────────┘
                 │                 │                 │
                 ▼                 ▼                 ▼
           SignalEvent       UpdatePortfolio    FillEvent
```

### 核心组件

1. **EventEngine** - 事件引擎
   - 优先级队列 (按时间排序)
   - 事件处理器注册
   - 事件循环执行

2. **DataHandler** - 数据处理器
   - 历史数据加载 (TimescaleDB/CSV/Mock)
   - 数据迭代器
   - 实时数据缓存

3. **Portfolio** - 投资组合
   - 持仓管理 (开仓/平仓/更新)
   - 资金管理
   - PnL计算 (已实现/未实现)
   - 权益曲线追踪

4. **ExecutionHandler** - 执行引擎
   - 模拟订单成交
   - 滑点计算
   - 手续费计算

5. **BacktestEngine** - 回测引擎
   - 整合所有组件
   - 驱动回测流程
   - 结果收集与输出

6. **Metrics** - 指标计算
   - PerformanceCalculator: 性能指标
   - RiskCalculator: 风险指标

7. **ReportGenerator** - 报告生成
   - HTML报告 (可视化)
   - Excel报告 (数据表)
   - PDF报告 (待实现)

## API接口

### 回测端点

#### POST /api/v1/backtest/run

运行回测

**请求体**:
```json
{
  "config": {
    "strategy_id": "simple_ma",
    "strategy_code": "def strategy(event, data_handler, portfolio): ...",
    "symbols": ["BTCUSDT", "ETHUSDT"],
    "start_date": "2024-01-01T00:00:00",
    "end_date": "2024-12-01T00:00:00",
    "initial_capital": 100000,
    "commission": 0.001,
    "slippage": 0.0005,
    "parameters": {}
  },
  "data_source": "mock"
}
```

**响应**: BacktestResult

#### GET /api/v1/backtest/result/{backtest_id}

获取回测结果

#### GET /api/v1/backtest/list

列出所有回测

#### DELETE /api/v1/backtest/result/{backtest_id}

删除回测结果

### 报告端点

#### POST /api/v1/reports/generate

生成报告

**请求体**:
```json
{
  "backtest_id": "xxx-xxx-xxx",
  "format": "html",
  "include_charts": true,
  "include_trades": true
}
```

#### GET /api/v1/reports/download/{filename}

下载报告文件

#### GET /api/v1/reports/preview/{backtest_id}

预览HTML报告

## 数据模型

### BacktestConfig

```python
{
  "strategy_id": str,
  "strategy_code": Optional[str],
  "symbols": List[str],
  "start_date": datetime,
  "end_date": datetime,
  "initial_capital": float,
  "commission": float,
  "slippage": float,
  "benchmark_symbol": Optional[str],
  "parameters": Dict[str, Any]
}
```

### BacktestResult

```python
{
  "backtest_id": str,
  "config": BacktestConfig,
  "start_time": datetime,
  "end_time": datetime,
  "duration_seconds": float,
  "metrics": PerformanceMetrics,
  "equity_curve": List[Dict],
  "trades": List[Fill],
  "position_history": List[Dict],
  "status": str,
  "error_message": Optional[str]
}
```

### PerformanceMetrics

```python
{
  # 收益指标
  "total_return": float,
  "annual_return": float,
  "cumulative_return": float,

  # 风险指标
  "volatility": float,
  "sharpe_ratio": float,
  "sortino_ratio": float,
  "calmar_ratio": float,
  "max_drawdown": float,
  "max_drawdown_duration": int,

  # 交易指标
  "total_trades": int,
  "win_rate": float,
  "profit_factor": float,
  "average_win": float,
  "average_loss": float,
  "largest_win": float,
  "largest_loss": float
}
```

## 预定义策略

### simple_ma - 移动平均线策略

双均线策略,MA5上穿MA20买入,下穿卖出。

### buy_and_hold - 买入持有策略

基准策略,第一根K线买入并持有。

### rsi_reversal - RSI反转策略 (TODO)

基于RSI超买超卖的反转策略。

### breakout - 突破策略 (TODO)

价格突破通道的趋势跟踪策略。

## 自定义策略开发

### 策略函数签名

```python
def strategy(
    event: MarketEvent,
    data_handler: DataHandler,
    portfolio: Portfolio
) -> List[SignalEvent]:
    """
    策略函数

    Args:
        event: 市场数据事件
        data_handler: 数据处理器 (获取历史数据)
        portfolio: 投资组合 (查询持仓)

    Returns:
        信号列表
    """
    signals = []

    # 你的策略逻辑
    for symbol in event.data.keys():
        # 获取历史数据
        recent_data = data_handler.get_latest_data(symbol, n=20)

        # 计算指标
        # ...

        # 生成信号
        if buy_condition:
            signals.append(
                SignalEvent(
                    timestamp=event.timestamp,
                    symbol=symbol,
                    signal_type='buy',
                    strength=1.0
                )
            )

    return signals
```

### 使用示例

```python
from src.models.schemas import BacktestConfig
from src.engine.backtest_engine import BacktestEngine
from src.engine.event_engine import SignalEvent

# 定义策略
def my_strategy(event, data_handler, portfolio):
    # 策略代码
    return []

# 配置回测
config = BacktestConfig(
    strategy_id="my_strategy",
    symbols=["BTCUSDT"],
    start_date=datetime(2024, 1, 1),
    end_date=datetime(2024, 12, 1),
    initial_capital=100000.0
)

# 运行回测
engine = BacktestEngine(config)
engine.set_strategy(my_strategy)
result = engine.run(data_source="mock")

# 查看结果
print(f"总收益率: {result.metrics.total_return*100:.2f}%")
print(f"夏普比率: {result.metrics.sharpe_ratio:.2f}")
```

## 性能优化

### 数据加载优化

- **HDF5/Parquet**: 列式存储,快速读取
- **Redis缓存**: 缓存热数据,减少数据库查询
- **分块加载**: 大数据集分块处理

### 计算优化

- **Numba JIT**: 编译关键计算函数
- **NumPy向量化**: 避免Python循环
- **并行计算**: 多进程加速参数优化

### 内存优化

- **迭代器**: 使用迭代器而非加载全部数据
- **及时释放**: 处理完的数据立即释放
- **数据类型**: 使用合适的数据类型 (float32 vs float64)

## 配置说明

### 环境变量

```bash
# 回测引擎配置
DEFAULT_INITIAL_CAPITAL=100000.0
DEFAULT_COMMISSION=0.001
DEFAULT_SLIPPAGE=0.0005
MAX_CONCURRENT_BACKTESTS=4
BACKTEST_TIMEOUT_SECONDS=300

# 性能优化
ENABLE_NUMBA=true
PARALLEL_PROCESSING=true
CHUNK_SIZE=10000

# 报告配置
REPORT_OUTPUT_DIR=./reports
ENABLE_HTML_REPORT=true
ENABLE_EXCEL_REPORT=true
```

## 运行与部署

### 本地开发

```bash
# 安装依赖
poetry install

# 启动服务
poetry run python -m src.main

# 运行示例
python example_backtest.py
```

### Docker部署

```bash
# 构建镜像
docker build -t delta-backtest-engine .

# 运行容器
docker run -d \
  -p 8003:8003 \
  -v $(pwd)/reports:/app/reports \
  --name backtest-engine \
  delta-backtest-engine
```

### 生产部署

```bash
# 使用Gunicorn
gunicorn src.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8003
```

## 测试

```bash
# 运行测试
poetry run pytest

# 测试覆盖率
poetry run pytest --cov=src --cov-report=html

# 运行特定测试
poetry run pytest tests/test_backtest_engine.py -v
```

## 依赖模块

### 上游依赖

- **market-data-collector**: 市场数据来源
- **TimescaleDB**: 历史数据存储

### 下游消费者

- **analytics-service**: 分析服务
- **frontend/web-app**: Web界面展示
- **strategy-service**: 策略管理服务

## 待实现功能

- [ ] PDF报告生成
- [ ] 参数优化框架
- [ ] 遗传算法优化
- [ ] Walk-forward分析
- [ ] 蒙特卡洛模拟
- [ ] 实时数据回测
- [ ] 多策略组合回测
- [ ] 策略模板库

## 性能指标

- **回测速度**: ~10,000 bars/秒 (单品种)
- **内存占用**: ~500MB (100万数据点)
- **并发回测**: 支持4个并发任务

## 故障排查

### 常见问题

1. **回测速度慢**
   - 检查 `ENABLE_NUMBA` 是否开启
   - 减少数据点数量
   - 使用更少的品种

2. **内存溢出**
   - 减小 `MAX_DATA_POINTS`
   - 使用分块加载
   - 增加 `CHUNK_SIZE`

3. **报告生成失败**
   - 检查 `REPORT_OUTPUT_DIR` 权限
   - 确保磁盘空间充足

## 相关文档

- [回测引擎README](./README.md)
- [API文档](http://localhost:8003/docs)
- [性能优化指南](待创建)
- [策略开发指南](待创建)

---

**最后更新**: 2025-12-24
**维护者**: Delta Terminal Team
