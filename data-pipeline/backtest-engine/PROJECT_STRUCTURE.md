# Backtest Engine - 项目结构

```
backtest-engine/
├── src/                          # 源代码
│   ├── __init__.py
│   ├── main.py                   # FastAPI应用入口
│   ├── config.py                 # 配置管理
│   │
│   ├── api/                      # API层
│   │   ├── __init__.py
│   │   ├── router.py             # 路由聚合
│   │   └── endpoints/            # API端点
│   │       ├── __init__.py
│   │       ├── backtest.py       # 回测API
│   │       └── reports.py        # 报告API
│   │
│   ├── engine/                   # 回测引擎核心
│   │   ├── __init__.py
│   │   ├── event_engine.py       # 事件驱动引擎 ⭐
│   │   ├── data_handler.py       # 数据处理器
│   │   ├── portfolio.py          # 投资组合管理
│   │   ├── execution.py          # 模拟执行引擎
│   │   └── backtest_engine.py    # 回测引擎整合 ⭐
│   │
│   ├── metrics/                  # 指标计算
│   │   ├── __init__.py
│   │   ├── performance.py        # 性能指标计算
│   │   └── risk.py              # 风险指标计算
│   │
│   ├── reports/                  # 报告生成
│   │   ├── __init__.py
│   │   ├── generator.py          # 报告生成器
│   │   └── templates/            # 报告模板 (待扩展)
│   │
│   └── models/                   # 数据模型
│       └── schemas.py            # Pydantic模型定义
│
├── tests/                        # 测试
│   ├── __init__.py
│   └── test_backtest_engine.py   # 回测引擎测试
│
├── logs/                         # 日志目录 (gitignore)
├── reports/                      # 报告输出目录 (gitignore)
│
├── example_backtest.py           # 使用示例 ⭐
├── pyproject.toml                # Poetry依赖管理
├── Dockerfile                    # Docker镜像
├── docker-compose.yml            # Docker Compose配置
├── run.sh                        # 快速启动脚本
├── .env.example                  # 环境变量模板
├── .gitignore                    # Git忽略配置
├── README.md                     # 项目文档
├── CLAUDE.md                     # AI上下文文档
└── PROJECT_STRUCTURE.md          # 本文件

```

## 核心文件说明

### 事件引擎层

- **event_engine.py** - 事件驱动核心
  - EventEngine: 事件循环引擎
  - Event类型: MarketEvent, SignalEvent, OrderEvent, FillEvent
  - 优先级队列: 按时间排序处理事件

### 数据层

- **data_handler.py** - 数据管理
  - 历史数据加载 (TimescaleDB/CSV/Mock)
  - 数据迭代器 (按时间顺序)
  - 实时数据缓存

### 交易层

- **portfolio.py** - 投资组合
  - 持仓管理
  - 资金管理
  - PnL计算
  - 权益曲线追踪

- **execution.py** - 执行引擎
  - 模拟订单成交
  - 滑点计算
  - 手续费计算

### 整合层

- **backtest_engine.py** - 回测引擎
  - 整合所有组件
  - 驱动回测流程
  - 策略执行
  - 结果输出

### 分析层

- **performance.py** - 性能指标
  - 总收益率、年化收益
  - 交易统计: 胜率、盈亏比
  - 平均盈亏

- **risk.py** - 风险指标
  - 波动率、最大回撤
  - 夏普/索提诺/卡玛比率
  - VaR/CVaR

### 报告层

- **generator.py** - 报告生成
  - HTML交互式报告
  - Excel数据表
  - PDF报告 (待实现)

## API层次

```
FastAPI Application (main.py)
    │
    ├── /api/v1/backtest/*
    │   ├── POST /run               - 运行回测
    │   ├── GET /result/{id}        - 获取结果
    │   ├── GET /list               - 列出回测
    │   └── DELETE /result/{id}     - 删除结果
    │
    └── /api/v1/reports/*
        ├── POST /generate          - 生成报告
        ├── GET /download/{file}    - 下载报告
        └── GET /preview/{id}       - 预览报告
```

## 数据流

```
1. API请求 (BacktestRequest)
    ↓
2. BacktestEngine初始化
    ↓
3. DataHandler加载历史数据
    ↓
4. 事件循环开始
    │
    ├─→ DataHandler.update_bars()
    │       ↓
    ├─→ MarketEvent → EventEngine
    │       ↓
    ├─→ Strategy处理 → SignalEvent
    │       ↓
    ├─→ OrderEvent → ExecutionHandler
    │       ↓
    ├─→ FillEvent → Portfolio更新
    │       ↓
    └─→ 重复直到数据结束
    │
5. 计算性能指标 (Metrics)
    ↓
6. 生成BacktestResult
    ↓
7. (可选) 生成报告 (ReportGenerator)
```

## 依赖关系

```
main.py
  └─ api/router.py
      ├─ api/endpoints/backtest.py
      │   └─ engine/backtest_engine.py
      │       ├─ engine/event_engine.py
      │       ├─ engine/data_handler.py
      │       ├─ engine/portfolio.py
      │       ├─ engine/execution.py
      │       ├─ metrics/performance.py
      │       └─ metrics/risk.py
      │
      └─ api/endpoints/reports.py
          └─ reports/generator.py
```

## 扩展点

### 1. 添加新策略

在 `api/endpoints/backtest.py` 的 `_get_predefined_strategy()` 中添加:

```python
def _my_new_strategy(event, data_handler, portfolio):
    # 策略逻辑
    return signals
```

### 2. 添加新数据源

在 `engine/data_handler.py` 中实现:

```python
def _load_from_new_source(self):
    # 数据加载逻辑
    pass
```

### 3. 添加新指标

在 `metrics/` 下创建新文件或扩展现有类:

```python
class CustomMetrics:
    def calculate_custom_metric(self):
        # 指标计算
        pass
```

### 4. 自定义报告格式

在 `reports/generator.py` 中添加新方法:

```python
def generate_custom_format(self, result):
    # 报告生成逻辑
    pass
```

## 测试覆盖

- [x] 事件引擎单元测试
- [x] 回测引擎集成测试
- [x] 策略执行测试
- [ ] 性能指标测试
- [ ] 风险指标测试
- [ ] API端到端测试

## 性能考虑

- **数据加载**: 使用Pandas高效数据结构
- **事件处理**: 优先级队列,O(log n)复杂度
- **指标计算**: NumPy向量化,Numba JIT加速
- **并发**: 多进程支持参数优化

## 安全考虑

- **代码执行**: 自定义策略代码在受限命名空间执行
- **资源限制**: 回测超时保护
- **输入验证**: Pydantic模型验证所有输入

---

**创建日期**: 2025-12-24
**版本**: 0.1.0
