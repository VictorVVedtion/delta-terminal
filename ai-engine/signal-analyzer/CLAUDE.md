# Signal Analyzer 模块

> AI 引擎 - 技术指标计算与交易信号生成

## 模块概述

Signal Analyzer 是 Delta Terminal 的交易信号分析模块，负责：

- **技术指标计算**：RSI, MACD, MA, Bollinger Bands, Stochastic 等
- **交易信号生成**：基于技术指标生成买入/卖出信号
- **多信号聚合**：组合多个指标生成综合交易信号
- **信号评分**：为每个信号提供置信度评分
- **实时分析**：支持实时市场数据分析

## 技术栈

- **框架**：FastAPI (异步高性能)
- **Python 版本**：3.11+
- **依赖管理**：Poetry
- **技术分析库**：TA-Lib, Pandas-TA
- **数据处理**：Pandas, NumPy
- **缓存**：Redis
- **容器化**：Docker

## 项目结构

```
ai-engine/signal-analyzer/
├── pyproject.toml          # Poetry 配置
├── Dockerfile              # Docker 配置
├── Makefile               # 常用命令
├── CLAUDE.md              # 本文档
├── .env.example           # 环境变量示例
├── src/
│   ├── __init__.py
│   ├── main.py            # FastAPI 应用入口
│   ├── config.py          # 配置管理
│   ├── api/
│   │   ├── __init__.py
│   │   └── endpoints/
│   │       ├── __init__.py
│   │       ├── health.py      # 健康检查端点
│   │       └── signals.py     # 信号分析端点
│   ├── models/
│   │   ├── __init__.py
│   │   └── signal_schemas.py  # Pydantic 数据模型
│   ├── services/
│   │   ├── __init__.py
│   │   ├── signal_service.py      # 信号生成服务
│   │   ├── indicator_service.py   # 技术指标计算服务
│   │   └── aggregator_service.py  # 信号聚合服务
│   └── indicators/
│       ├── __init__.py
│       ├── momentum.py     # 动量指标 (RSI, Stochastic)
│       ├── trend.py        # 趋势指标 (MA, EMA, BB)
│       └── volume.py       # 成交量指标 (OBV, VWAP)
└── tests/
    ├── __init__.py
    └── test_indicators.py
```

## API 端点

### 健康检查

```
GET /health
```

### 技术指标计算

```
POST /api/v1/indicators/calculate
```

请求体：
```json
{
  "symbol": "BTCUSDT",
  "timeframe": "1h",
  "indicators": ["rsi", "macd", "bb"],
  "ohlcv_data": [
    {
      "timestamp": 1703001600000,
      "open": 42000.0,
      "high": 42500.0,
      "low": 41800.0,
      "close": 42200.0,
      "volume": 1234.56
    }
  ]
}
```

响应：
```json
{
  "symbol": "BTCUSDT",
  "timeframe": "1h",
  "indicators": {
    "rsi": {
      "value": 65.5,
      "period": 14,
      "timestamp": 1703001600000
    },
    "macd": {
      "macd": 120.5,
      "signal": 115.2,
      "histogram": 5.3,
      "timestamp": 1703001600000
    }
  }
}
```

### 交易信号生成

```
POST /api/v1/signals/generate
```

请求体：
```json
{
  "symbol": "BTCUSDT",
  "timeframe": "1h",
  "ohlcv_data": [...],
  "strategy": "momentum"
}
```

响应：
```json
{
  "symbol": "BTCUSDT",
  "signal": "buy",
  "confidence": 0.75,
  "timestamp": 1703001600000,
  "indicators": {
    "rsi": 35.2,
    "macd_signal": "bullish"
  },
  "reasoning": "RSI 超卖，MACD 金叉"
}
```

### 多信号聚合

```
POST /api/v1/signals/aggregate
```

请求体：
```json
{
  "symbol": "BTCUSDT",
  "timeframe": "1h",
  "ohlcv_data": [...],
  "strategies": ["momentum", "trend", "volume"]
}
```

响应：
```json
{
  "symbol": "BTCUSDT",
  "aggregated_signal": "buy",
  "confidence": 0.82,
  "timestamp": 1703001600000,
  "individual_signals": [
    {
      "strategy": "momentum",
      "signal": "buy",
      "confidence": 0.75
    },
    {
      "strategy": "trend",
      "signal": "buy",
      "confidence": 0.85
    },
    {
      "strategy": "volume",
      "signal": "neutral",
      "confidence": 0.60
    }
  ]
}
```

## 支持的技术指标

### 动量指标 (Momentum)

- **RSI** (Relative Strength Index)：相对强弱指标
- **Stochastic** (KDJ)：随机指标
- **CCI** (Commodity Channel Index)：商品通道指标
- **Williams %R**：威廉指标

### 趋势指标 (Trend)

- **SMA** (Simple Moving Average)：简单移动平均线
- **EMA** (Exponential Moving Average)：指数移动平均线
- **MACD** (Moving Average Convergence Divergence)：MACD 指标
- **Bollinger Bands**：布林带
- **ADX** (Average Directional Index)：平均趋向指标

### 成交量指标 (Volume)

- **OBV** (On Balance Volume)：能量潮
- **VWAP** (Volume Weighted Average Price)：成交量加权平均价
- **CMF** (Chaikin Money Flow)：蔡金资金流量
- **MFI** (Money Flow Index)：资金流量指标

## 环境配置

复制 `.env.example` 到 `.env` 并修改：

```bash
cp .env.example .env
```

关键配置：

- `PORT=8007`：服务端口
- `JWT_SECRET_KEY`：JWT 密钥（生产环境必须修改）
- `REDIS_HOST`：Redis 地址
- `RSI_PERIOD`, `MACD_FAST` 等：指标默认参数

## 开发指南

### 安装依赖

```bash
make install
# 或
poetry install
```

### 启动开发服务器

```bash
make dev
# 或
poetry run uvicorn src.main:app --host 0.0.0.0 --port 8007 --reload
```

### 运行测试

```bash
make test
# 或
poetry run pytest
```

### 代码格式化

```bash
make format
# 或
poetry run black src tests
poetry run ruff check --fix src tests
```

### 代码检查

```bash
make lint
# 或
poetry run ruff check src tests
poetry run mypy src
```

## Docker 部署

### 构建镜像

```bash
make docker-build
# 或
docker build -t delta-terminal/signal-analyzer:latest .
```

### 运行容器

```bash
make docker-run
# 或
docker run -p 8007:8007 --env-file .env delta-terminal/signal-analyzer:latest
```

## 与其他模块交互

### 上游依赖

- **Market Data Collector** (`data-pipeline/market-data-collector`)：获取 OHLCV 数据
- **Strategy Service** (`backend/strategy-service`)：获取策略配置

### 下游消费者

- **NLP Processor** (`ai-engine/nlp-processor`)：为 AI 提供技术分析结果
- **Strategy Generator** (`ai-engine/strategy-generator`)：策略生成参考
- **Order Executor** (`trading-engine/order-executor`)：基于信号执行交易

### 调用示例

```python
import httpx

async with httpx.AsyncClient() as client:
    response = await client.post(
        "http://localhost:8007/api/v1/signals/generate",
        json={
            "symbol": "BTCUSDT",
            "timeframe": "1h",
            "ohlcv_data": ohlcv_list,
            "strategy": "momentum"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    signal = response.json()
    print(signal["signal"], signal["confidence"])
```

## 性能优化

### 缓存策略

- **Redis 缓存**：技术指标计算结果缓存
- **TTL 配置**：
  - 指标缓存：10 分钟
  - 信号缓存：5 分钟

### 批量计算

支持批量计算多个周期的指标：

```python
POST /api/v1/indicators/calculate-batch
{
  "symbols": ["BTCUSDT", "ETHUSDT"],
  "timeframes": ["1h", "4h"],
  "indicators": ["rsi", "macd"]
}
```

## 故障排查

### 常见问题

1. **TA-Lib 安装失败**
   - 确保已安装 TA-Lib C 库
   - Linux: `apt-get install ta-lib`
   - macOS: `brew install ta-lib`

2. **指标计算返回 NaN**
   - 检查数据长度是否足够（如 RSI 需要至少 14 根 K 线）
   - 检查数据完整性（无缺失值）

3. **Redis 连接失败**
   - 检查 Redis 服务是否启动
   - 验证 `.env` 中的 Redis 配置

### 日志查看

```bash
# 开发环境
tail -f logs/signal-analyzer.log

# Docker 环境
docker logs -f signal-analyzer
```

## 测试策略

### 单元测试

```bash
poetry run pytest tests/test_indicators.py -v
```

### 集成测试

```bash
poetry run pytest tests/test_api.py -v
```

### 测试覆盖率

```bash
poetry run pytest --cov=src --cov-report=html
open htmlcov/index.html
```

## 扩展开发

### 添加新指标

1. 在 `src/indicators/` 目录创建新文件
2. 实现指标计算函数
3. 在 `src/services/indicator_service.py` 注册

示例：

```python
# src/indicators/custom.py
import pandas as pd

def calculate_custom_indicator(
    df: pd.DataFrame,
    period: int = 20
) -> pd.Series:
    """自定义指标计算"""
    # 实现逻辑
    return result
```

### 添加新信号策略

1. 在 `src/services/signal_service.py` 添加策略
2. 定义信号生成规则
3. 更新 API 文档

## 监控指标

- **请求延迟**：P50, P95, P99
- **计算耗时**：各指标平均计算时间
- **缓存命中率**：Redis 缓存效率
- **错误率**：API 错误率

## 安全注意事项

- JWT Token 验证（所有端点需认证）
- 速率限制（防止滥用）
- 输入验证（防止注入攻击）
- 敏感数据不记录日志

## 贡献指南

1. 遵循 Python PEP 8 规范
2. 添加类型标注
3. 编写单元测试
4. 更新 API 文档
5. 提交前运行 `make lint` 和 `make test`

## 路线图

- [ ] 支持更多技术指标（Ichimoku, Fibonacci 等）
- [ ] 机器学习信号预测
- [ ] 实时 WebSocket 推送
- [ ] 多时间周期信号聚合
- [ ] 信号回测与验证

## 相关文档

- [NLP Processor 模块](../nlp-processor/CLAUDE.md)
- [Strategy Generator 模块](../strategy-generator/CLAUDE.md)
- [Market Data Collector](../../data-pipeline/market-data-collector/CLAUDE.md)

---

**模块负责人**：Delta Terminal AI 团队
**最后更新**：2025-12-28
**服务端口**：8007
