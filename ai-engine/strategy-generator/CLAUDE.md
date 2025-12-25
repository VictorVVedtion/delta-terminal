# Strategy Generator Module

> AI驱动的交易策略生成服务

---

## 模块概述

**路径**: `ai-engine/strategy-generator`
**类型**: Python微服务 (FastAPI)
**端口**: 8002
**状态**: ✅ 已创建

### 核心功能

1. **策略生成** - 基于自然语言描述自动生成交易策略代码
2. **策略优化** - AI辅助的参数优化建议
3. **策略验证** - 代码语法、逻辑和风险检查
4. **策略模板** - 内置多种常见交易策略模板

---

## 技术栈

- **框架**: FastAPI 0.109+
- **Python**: 3.11+
- **AI**: LangChain + Anthropic Claude
- **验证**: Pydantic 2.5+
- **服务器**: Uvicorn
- **包管理**: Poetry

---

## 项目结构

```
strategy-generator/
├── src/
│   ├── api/                    # API层
│   │   ├── endpoints/
│   │   │   ├── generate.py     # 策略生成端点
│   │   │   ├── optimize.py     # 策略优化端点
│   │   │   └── validate.py     # 策略验证端点
│   │   └── router.py           # 路由聚合
│   ├── models/
│   │   └── schemas.py          # Pydantic数据模型
│   ├── services/               # 业务逻辑层
│   │   ├── generator_service.py    # 生成服务
│   │   ├── optimizer_service.py    # 优化服务
│   │   └── validator_service.py    # 验证服务
│   ├── strategies/             # 策略层
│   │   ├── base.py             # 策略基类
│   │   └── templates/          # 策略模板
│   │       ├── grid.py         # 网格策略
│   │       ├── dca.py          # 定投策略
│   │       └── momentum.py     # 动量策略
│   ├── config.py               # 配置管理
│   └── main.py                 # 应用入口
├── tests/                      # 测试文件
├── Dockerfile                  # Docker配置
├── docker-compose.yml          # Docker Compose
├── pyproject.toml              # Poetry配置
├── Makefile                    # 构建工具
└── README.md                   # 文档
```

---

## API端点

### 策略生成

#### POST `/api/v1/generate`

生成交易策略（完整参数）

**请求体**:
```json
{
  "description": "当BTC价格跌破20日移动平均线时买入，上穿时卖出",
  "trading_pair": "BTC/USDT",
  "timeframe": "1h",
  "initial_capital": 10000,
  "risk_per_trade": 0.02,
  "max_positions": 1,
  "code_format": "both",
  "include_risk_management": true,
  "include_comments": true
}
```

**响应**:
```json
{
  "success": true,
  "strategy": {
    "name": "动量_BTC_USDT_20251224_123456",
    "description": "...",
    "strategy_type": "momentum",
    "complexity": "medium",
    "indicators": [...],
    "rules": [...],
    "risk_management": {...},
    "code_json": {...},
    "code_python": "..."
  },
  "warnings": [],
  "suggestions": [...]
}
```

#### POST `/api/v1/generate/quick`

快速生成（使用默认参数）

**参数**:
- `description`: 策略描述
- `trading_pair`: 交易对（默认BTC/USDT）

---

### 策略优化

#### POST `/api/v1/optimize`

优化策略参数

**请求体**:
```json
{
  "strategy_code": "{...}",
  "optimization_goal": "maximize_sharpe_ratio",
  "constraints": {
    "max_drawdown": 0.2,
    "min_win_rate": 0.5
  },
  "suggest_parameters": true
}
```

**优化目标**:
- `maximize_sharpe_ratio`: 最大化夏普比率
- `minimize_drawdown`: 最小化最大回撤
- `maximize_profit`: 最大化收益
- `maximize_win_rate`: 最大化胜率

---

### 策略验证

#### POST `/api/v1/validate`

完整验证策略代码

**请求体**:
```json
{
  "strategy_code": "{...}",
  "check_syntax": true,
  "check_logic": true,
  "check_risk": true,
  "check_performance": false
}
```

**响应**:
```json
{
  "success": true,
  "is_valid": true,
  "issues": [
    {
      "severity": "warning",
      "category": "risk",
      "message": "...",
      "suggestion": "..."
    }
  ],
  "score": 85.0,
  "recommendations": [...]
}
```

#### POST `/api/v1/validate/quick`

快速验证（语法+风险）

---

### 健康检查

#### GET `/api/v1/health`

服务健康状态

```json
{
  "status": "healthy",
  "version": "0.1.0",
  "ai_model": "claude-3-5-sonnet-20241022",
  "timestamp": "2025-12-24T12:00:00"
}
```

---

## 策略模板

### 1. 网格策略 (Grid)

在价格区间内设置买卖网格，自动高抛低吸。

**参数**:
- `lower_price`: 网格下界
- `upper_price`: 网格上界
- `grid_count`: 网格数量
- `position_per_grid`: 每网格仓位

**适用场景**: 震荡市场

---

### 2. 定投策略 (DCA)

定期定额买入，可选逢低加仓。

**参数**:
- `investment_amount`: 每次投资金额
- `interval_hours`: 投资间隔
- `buy_on_dip`: 是否逢低加仓
- `dip_threshold`: 下跌阈值
- `dip_multiplier`: 加仓倍数

**适用场景**: 长期投资

---

### 3. 动量策略 (Momentum)

基于移动平均线和RSI的趋势跟踪。

**参数**:
- `fast_ma_period`: 快速均线周期
- `slow_ma_period`: 慢速均线周期
- `rsi_period`: RSI周期
- `rsi_overbought`: RSI超买阈值
- `rsi_oversold`: RSI超卖阈值

**适用场景**: 趋势市场

---

## 开发指南

### 本地开发

```bash
# 1. 安装依赖
make install

# 2. 启动开发服务器
make dev

# 3. 运行测试
make test

# 4. 代码检查
make lint

# 5. 格式化代码
make format
```

### Docker部署

```bash
# 构建镜像
make docker-build

# 启动服务
make docker-run

# 查看日志
make docker-logs

# 停止服务
make docker-stop
```

---

## 环境变量

必需配置:
- `ANTHROPIC_API_KEY`: Claude API密钥

可选配置:
- `DEBUG`: 调试模式 (默认false)
- `PORT`: 监听端口 (默认8002)
- `AI_MODEL`: AI模型 (默认claude-3-5-sonnet-20241022)
- `AI_TEMPERATURE`: 生成温度 (默认0.2)
- `LOG_LEVEL`: 日志级别 (默认INFO)

---

## 添加新策略模板

### 步骤

1. **创建策略类**

在 `src/strategies/templates/` 创建新文件:

```python
from ..base import BaseStrategy, StrategyFactory
from ...models.schemas import StrategyType, TradingSignal

@StrategyFactory.register(StrategyType.YOUR_TYPE)
class YourStrategy(BaseStrategy):
    def initialize(self):
        # 初始化逻辑
        self.initialized = True

    def on_data(self, data, historical_data):
        # 生成交易信号
        return TradingSignal.HOLD

    def calculate_position_size(self, signal, price, balance):
        # 计算仓位
        return balance * 0.1

    def calculate_stop_loss(self, signal, entry_price):
        # 计算止损
        return entry_price * 0.98

    def calculate_take_profit(self, signal, entry_price):
        # 计算止盈
        return entry_price * 1.04
```

2. **注册策略类型**

在 `src/models/schemas.py` 添加:

```python
class StrategyType(str, Enum):
    # ...现有类型
    YOUR_TYPE = "your_type"
```

3. **更新工厂导入**

在 `src/strategies/templates/__init__.py`:

```python
from .your_strategy import YourStrategy

__all__ = [..., "YourStrategy"]
```

4. **编写测试**

在 `tests/test_strategies.py` 添加测试。

---

## 测试

### 运行测试

```bash
# 所有测试
poetry run pytest

# 特定文件
poetry run pytest tests/test_generator.py

# 覆盖率报告
poetry run pytest --cov=src --cov-report=html
```

### 测试覆盖

- 策略生成服务 ✅
- 策略优化服务 ✅
- 策略验证服务 ✅
- 策略模板 ✅
- API端点 ⏳

---

## 依赖服务

### 必需
- **Anthropic Claude API**: AI策略生成

### 可选
- **Redis**: 缓存策略生成结果
- **PostgreSQL**: 存储生成历史（未来）

---

## 性能优化

### 缓存策略

- 相同描述的策略生成结果缓存15分钟
- 使用Redis存储

### 并发控制

- 使用FastAPI异步处理
- 建议生产环境使用4个worker

---

## 监控指标

建议监控:
- 请求响应时间
- 生成成功率
- AI API调用次数
- 错误率
- 内存使用

---

## 常见问题

### Q: 生成失败怎么办？

A: 检查 `warnings` 字段，常见原因:
- 描述不够清晰
- 参数不合理
- AI API超时

### Q: 如何提高生成质量？

A:
1. 提供详细的策略描述
2. 明确交易规则和条件
3. 说明风险偏好

### Q: 支持自定义指标吗？

A: 目前支持常见技术指标，自定义指标需要在策略代码中实现。

---

## 相关模块

- **nlp-processor** (`../nlp-processor`): 自然语言处理
- **signal-analyzer** (`../signal-analyzer`): 交易信号分析
- **order-executor** (`../../trading-engine/order-executor`): 订单执行

---

## 待办事项

- [ ] 添加更多策略模板（均值回归、套利等）
- [ ] 实现策略回测集成
- [ ] 添加策略版本管理
- [ ] 支持策略组合生成
- [ ] 实现策略性能预测

---

## 更新日志

- **2025-12-24**: 初始版本创建
  - 实现基础策略生成功能
  - 添加网格、定投、动量三种模板
  - 完成验证和优化功能

---

**维护者**: Delta Terminal 开发团队
**最后更新**: 2025-12-24
