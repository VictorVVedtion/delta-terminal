# Delta Terminal - Backtest Engine

> 高性能量化回测引擎 - 事件驱动架构,支持多品种、参数优化、风险管理

## 功能特性

### 核心功能

- **事件驱动架构** - 高性能事件循环,支持大规模历史数据回测
- **多品种回测** - 同时回测多个交易品种,统一管理
- **滑点/手续费模拟** - 真实模拟交易成本
- **性能指标计算** - 夏普比率、最大回撤、胜率等30+指标
- **可视化报告** - HTML/Excel/PDF多格式报告
- **参数优化** - 网格搜索、遗传算法等优化方法
- **并行回测** - 多进程加速参数优化

### 技术架构

```
├── 事件引擎 (Event Engine)
│   ├── MarketEvent - 市场数据事件
│   ├── SignalEvent - 交易信号事件
│   ├── OrderEvent - 订单事件
│   └── FillEvent - 成交事件
│
├── 数据处理器 (Data Handler)
│   ├── 历史数据加载
│   ├── 数据迭代器
│   └── 实时数据缓存
│
├── 投资组合 (Portfolio)
│   ├── 持仓管理
│   ├── 资金管理
│   ├── PnL计算
│   └── 权益曲线追踪
│
├── 执行引擎 (Execution)
│   ├── 模拟成交
│   ├── 滑点计算
│   └── 手续费计算
│
└── 指标计算 (Metrics)
    ├── 性能指标
    ├── 风险指标
    └── 交易统计
```

## 快速开始

### 安装依赖

```bash
# 使用Poetry
poetry install

# 或使用pip
pip install -r requirements.txt
```

### 配置环境

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置
vim .env
```

### 启动服务

```bash
# 开发模式
poetry run python -m src.main

# 或使用uvicorn
uvicorn src.main:app --reload --port 8003
```

### 使用Docker

```bash
# 构建镜像
docker build -t delta-backtest-engine .

# 运行容器
docker run -p 8003:8003 -v $(pwd)/reports:/app/reports delta-backtest-engine
```

## API使用示例

### 1. 运行回测

```bash
curl -X POST "http://localhost:8003/api/v1/backtest/run" \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "strategy_id": "simple_ma",
      "symbols": ["BTCUSDT", "ETHUSDT"],
      "start_date": "2024-01-01T00:00:00",
      "end_date": "2024-12-01T00:00:00",
      "initial_capital": 100000,
      "commission": 0.001,
      "slippage": 0.0005
    },
    "data_source": "mock"
  }'
```

### 2. 获取回测结果

```bash
curl "http://localhost:8003/api/v1/backtest/result/{backtest_id}"
```

### 3. 生成报告

```bash
curl -X POST "http://localhost:8003/api/v1/reports/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "backtest_id": "xxx-xxx-xxx",
    "format": "html",
    "include_charts": true
  }'
```

### 4. 下载报告

```bash
curl "http://localhost:8003/api/v1/reports/download/{filename}" -O
```

## 自定义策略

### 策略代码示例

```python
# 简单移动平均线策略
def strategy(event, data_handler, portfolio):
    signals = []
    market_data = event.data

    for symbol in market_data.keys():
        # 获取历史数据
        recent_data = data_handler.get_latest_data(symbol, n=20)

        if recent_data is None or len(recent_data) < 20:
            continue

        # 计算移动平均线
        ma5 = recent_data['close'].tail(5).mean()
        ma20 = recent_data['close'].tail(20).mean()

        # 金叉买入
        if ma5 > ma20 and not portfolio.has_position(symbol):
            signals.append(
                SignalEvent(
                    timestamp=event.timestamp,
                    symbol=symbol,
                    signal_type='buy',
                    strength=1.0
                )
            )

        # 死叉卖出
        elif ma5 < ma20 and portfolio.has_position(symbol):
            signals.append(
                SignalEvent(
                    timestamp=event.timestamp,
                    symbol=symbol,
                    signal_type='sell',
                    strength=1.0
                )
            )

    return signals
```

### 通过API提交自定义策略

```python
import requests

strategy_code = """
def strategy(event, data_handler, portfolio):
    # 你的策略代码
    return []
"""

response = requests.post(
    "http://localhost:8003/api/v1/backtest/run",
    json={
        "config": {
            "strategy_id": "my_custom_strategy",
            "strategy_code": strategy_code,
            "symbols": ["BTCUSDT"],
            "start_date": "2024-01-01T00:00:00",
            "end_date": "2024-12-01T00:00:00",
            "initial_capital": 100000
        }
    }
)

result = response.json()
print(f"回测ID: {result['backtest_id']}")
print(f"总收益率: {result['metrics']['total_return']*100:.2f}%")
print(f"夏普比率: {result['metrics']['sharpe_ratio']:.2f}")
```

## 性能指标说明

### 收益指标

- **总收益率** - 回测期间总收益百分比
- **年化收益率** - 按年计算的收益率
- **累计收益率** - 复利累计收益

### 风险指标

- **波动率** - 收益率标准差(年化)
- **夏普比率** - (年化收益 - 无风险利率) / 波动率
- **索提诺比率** - 考虑下行风险的夏普比率
- **卡玛比率** - 年化收益 / 最大回撤
- **最大回撤** - 历史最大资产回撤比例
- **最大回撤持续时间** - 最长回撤恢复天数

### 交易指标

- **总交易数** - 完成的交易次数
- **胜率** - 盈利交易占比
- **盈亏比** - 总盈利 / 总亏损
- **平均盈利** - 盈利交易平均值
- **平均亏损** - 亏损交易平均值
- **最大单笔盈利/亏损**

## 预定义策略

### simple_ma - 移动平均线策略

经典的双均线策略,金叉买入,死叉卖出。

```json
{
  "strategy_id": "simple_ma"
}
```

### buy_and_hold - 买入持有策略

基准策略,第一根K线买入并持有到结束。

```json
{
  "strategy_id": "buy_and_hold"
}
```

### rsi_reversal - RSI反转策略 (TODO)

基于RSI超买超卖的反转策略。

### breakout - 突破策略 (TODO)

价格突破通道的趋势跟踪策略。

## 开发指南

### 项目结构

```
backtest-engine/
├── src/
│   ├── api/
│   │   └── endpoints/
│   │       ├── backtest.py    # 回测API
│   │       └── reports.py     # 报告API
│   ├── engine/
│   │   ├── event_engine.py    # 事件引擎
│   │   ├── data_handler.py    # 数据处理
│   │   ├── portfolio.py       # 投资组合
│   │   ├── execution.py       # 执行引擎
│   │   └── backtest_engine.py # 回测引擎
│   ├── metrics/
│   │   ├── performance.py     # 性能指标
│   │   └── risk.py           # 风险指标
│   ├── reports/
│   │   └── generator.py      # 报告生成
│   ├── models/
│   │   └── schemas.py        # 数据模型
│   ├── config.py             # 配置管理
│   └── main.py              # 应用入口
├── tests/                    # 测试
├── Dockerfile
├── pyproject.toml
└── README.md
```

### 运行测试

```bash
# 运行所有测试
poetry run pytest

# 测试覆盖率
poetry run pytest --cov=src --cov-report=html
```

### 代码格式化

```bash
# Black格式化
poetry run black src/

# Ruff检查
poetry run ruff check src/
```

## 性能优化

### 数据加载优化

- 使用Pandas高效数据结构
- HDF5/Parquet列式存储
- Redis缓存热数据

### 计算优化

- Numba JIT编译关键计算
- NumPy向量化操作
- 多进程并行回测

### 内存优化

- 分块加载大数据集
- 及时释放不用的数据
- 使用迭代器而非加载全部

## 部署建议

### 生产环境

```bash
# 使用Gunicorn + Uvicorn
gunicorn src.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8003
```

### 监控

- Prometheus指标导出
- Grafana可视化仪表板
- 日志聚合 (ELK Stack)

## 常见问题

### Q: 如何加载自己的历史数据?

A: 修改 `data_handler.py` 中的 `_load_from_csv()` 或 `_load_from_timescaledb()` 方法。

### Q: 如何添加自定义指标?

A: 在 `metrics/` 目录下创建新的计算类,继承基类并实现计算逻辑。

### Q: 回测速度慢怎么办?

A:
1. 开启Numba加速 (`ENABLE_NUMBA=true`)
2. 使用更少的数据点
3. 减少指标计算频率
4. 使用并行回测

## 路线图

- [x] 事件驱动回测框架
- [x] 基础性能指标计算
- [x] HTML/Excel报告生成
- [ ] PDF报告生成
- [ ] 参数优化框架
- [ ] 遗传算法优化
- [ ] 实时数据对接
- [ ] 策略模板库
- [ ] Web界面

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request!

---

**Delta Terminal Team** - AI驱动的智能交易终端
