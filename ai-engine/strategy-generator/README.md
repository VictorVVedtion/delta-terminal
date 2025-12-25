# Strategy Generator - AI 策略生成服务

Delta Terminal 的 AI 策略生成微服务，基于自然语言生成、优化和验证交易策略。

## 功能特性

- 🤖 **AI驱动生成**: 基于自然语言描述自动生成交易策略
- 📊 **多种策略模板**: 内置网格、定投、动量等常见策略模板
- 🔧 **智能优化**: AI辅助的参数优化建议
- ✅ **代码验证**: 语法、逻辑和风险检查
- 📝 **多格式输出**: 支持JSON配置和Python代码格式
- 🛡️ **风险管理**: 内置风险控制参数验证

## 技术栈

- **Python 3.11+**
- **FastAPI** - 现代化的Web框架
- **LangChain** - AI应用框架
- **Anthropic Claude** - 大语言模型
- **Pydantic** - 数据验证
- **Uvicorn** - ASGI服务器

## 快速开始

### 环境要求

```bash
# Python版本
python >= 3.11

# Poetry包管理器
curl -sSL https://install.python-poetry.org | python3 -
```

### 安装依赖

```bash
# 进入项目目录
cd ai-engine/strategy-generator

# 安装依赖
poetry install

# 或使用pip
pip install -r requirements.txt
```

### 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑.env文件，填入必要配置
# 至少需要配置 ANTHROPIC_API_KEY
```

### 启动服务

```bash
# 开发模式
poetry run python -m src.main

# 或使用uvicorn
poetry run uvicorn src.main:app --reload --host 0.0.0.0 --port 8002

# 生产模式
poetry run uvicorn src.main:app --host 0.0.0.0 --port 8002 --workers 4
```

### Docker部署

```bash
# 构建镜像
docker build -t strategy-generator:latest .

# 运行容器
docker run -d \
  --name strategy-generator \
  -p 8002:8002 \
  -e ANTHROPIC_API_KEY=your-api-key \
  strategy-generator:latest
```

## API 文档

启动服务后访问:

- **Swagger UI**: http://localhost:8002/api/v1/docs
- **ReDoc**: http://localhost:8002/api/v1/redoc

## API 端点

### 策略生成

**POST** `/api/v1/generate`

基于自然语言生成交易策略。

```bash
curl -X POST "http://localhost:8002/api/v1/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "当BTC价格跌破20日移动平均线时买入，上穿时卖出",
    "trading_pair": "BTC/USDT",
    "timeframe": "1h",
    "initial_capital": 10000,
    "risk_per_trade": 0.02,
    "code_format": "both"
  }'
```

**POST** `/api/v1/generate/quick`

快速生成策略（使用默认参数）。

```bash
curl -X POST "http://localhost:8002/api/v1/generate/quick?description=网格策略&trading_pair=BTC/USDT"
```

### 策略优化

**POST** `/api/v1/optimize`

优化现有策略的参数。

```bash
curl -X POST "http://localhost:8002/api/v1/optimize" \
  -H "Content-Type: application/json" \
  -d '{
    "strategy_code": "{\"strategy\": {...}}",
    "optimization_goal": "maximize_sharpe_ratio",
    "suggest_parameters": true
  }'
```

### 策略验证

**POST** `/api/v1/validate`

验证策略代码的正确性。

```bash
curl -X POST "http://localhost:8002/api/v1/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "strategy_code": "{\"strategy\": {...}}",
    "check_syntax": true,
    "check_logic": true,
    "check_risk": true
  }'
```

**POST** `/api/v1/validate/quick`

快速验证（只检查语法和风险）。

```bash
curl -X POST "http://localhost:8002/api/v1/validate/quick?strategy_code=..."
```

### 健康检查

**GET** `/api/v1/health`

检查服务健康状态。

```bash
curl "http://localhost:8002/api/v1/health"
```

## 策略模板

### 支持的策略类型

1. **网格策略 (Grid)**: 在价格区间内设置买卖网格
2. **定投策略 (DCA)**: 定期买入，可选逢低加仓
3. **动量策略 (Momentum)**: 基于技术指标的趋势跟踪
4. **均值回归 (Mean Reversion)**: 价格偏离均值时反向交易
5. **套利策略 (Arbitrage)**: 跨市场/交易对套利
6. **自定义策略 (Custom)**: 完全自定义的策略逻辑

### 示例：生成网格策略

```python
import requests

response = requests.post(
    "http://localhost:8002/api/v1/generate",
    json={
        "description": "BTC在30000-50000区间内运行网格策略，设置10个网格",
        "trading_pair": "BTC/USDT",
        "timeframe": "1h",
        "initial_capital": 10000,
        "risk_per_trade": 0.01,
        "code_format": "both"
    }
)

result = response.json()
print(result["strategy"]["code_python"])
```

## 开发指南

### 项目结构

```
strategy-generator/
├── src/
│   ├── api/
│   │   ├── endpoints/      # API端点
│   │   │   ├── generate.py
│   │   │   ├── optimize.py
│   │   │   └── validate.py
│   │   └── router.py       # 路由聚合
│   ├── models/
│   │   └── schemas.py      # 数据模型
│   ├── services/
│   │   ├── generator_service.py
│   │   ├── optimizer_service.py
│   │   └── validator_service.py
│   ├── strategies/
│   │   ├── base.py         # 策略基类
│   │   └── templates/      # 策略模板
│   │       ├── grid.py
│   │       ├── dca.py
│   │       └── momentum.py
│   ├── config.py           # 配置管理
│   └── main.py             # 应用入口
├── tests/                  # 测试文件
├── Dockerfile
├── pyproject.toml
└── README.md
```

### 添加新策略模板

1. 在 `src/strategies/templates/` 创建新文件
2. 继承 `BaseStrategy` 类
3. 实现必要方法：`initialize`, `on_data`, `calculate_position_size` 等
4. 使用 `@StrategyFactory.register()` 装饰器注册

示例：

```python
from ..base import BaseStrategy, StrategyFactory
from ...models.schemas import StrategyType, TradingSignal

@StrategyFactory.register(StrategyType.CUSTOM)
class MyCustomStrategy(BaseStrategy):
    def initialize(self):
        self.initialized = True

    def on_data(self, data, historical_data):
        # 实现交易逻辑
        return TradingSignal.HOLD
```

### 运行测试

```bash
# 运行所有测试
poetry run pytest

# 运行特定测试
poetry run pytest tests/test_generator.py

# 生成覆盖率报告
poetry run pytest --cov=src --cov-report=html
```

### 代码格式化

```bash
# 格式化代码
poetry run black src/

# 检查代码风格
poetry run ruff check src/

# 类型检查
poetry run mypy src/
```

## 环境变量说明

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `DEBUG` | 调试模式 | `false` |
| `HOST` | 监听地址 | `0.0.0.0` |
| `PORT` | 监听端口 | `8002` |
| `ANTHROPIC_API_KEY` | Claude API密钥 | - |
| `AI_MODEL` | AI模型名称 | `claude-3-5-sonnet-20241022` |
| `AI_TEMPERATURE` | 生成温度 | `0.2` |
| `AI_MAX_TOKENS` | 最大token数 | `4096` |
| `LOG_LEVEL` | 日志级别 | `INFO` |

## 常见问题

### Q: 如何提高生成质量？

A:
1. 提供更详细的策略描述
2. 明确指定交易规则和条件
3. 说明风险偏好和资金管理要求

### Q: 支持哪些时间框架？

A: 支持 `1m`, `5m`, `15m`, `30m`, `1h`, `4h`, `1d`, `1w`

### Q: 如何处理生成失败？

A: 检查返回的 `warnings` 字段，根据提示调整输入参数

## 许可证

本项目属于 Delta Terminal 的一部分，遵循项目整体许可证。

## 联系方式

- 项目主页: [Delta Terminal](https://github.com/yourusername/delta-terminal)
- 问题反馈: [Issues](https://github.com/yourusername/delta-terminal/issues)
