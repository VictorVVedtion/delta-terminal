# Market Data Collector

> Delta Terminal 市场数据采集服务 - 实时采集和存储加密货币市场数据

## 概述

Market Data Collector 是 Delta Terminal 数据管道的核心组件，负责从多个加密货币交易所实时采集市场数据，包括：

- **Ticker 数据**：实时价格、24h 涨跌幅、成交量等
- **订单簿数据**：买卖盘深度数据
- **成交数据**：历史成交记录
- **K线数据**：多时间周期的 OHLCV 数据

## 特性

✅ **多交易所支持**
- 币安 (Binance)
- OKX
- Bybit
- 易于扩展支持更多交易所

✅ **实时数据采集**
- WebSocket 实时推送（优先）
- REST API 轮询（降级）
- 自动重连机制

✅ **高性能存储**
- Redis 实时缓存（毫秒级访问）
- TimescaleDB 时序存储（历史数据）
- 批量写入优化

✅ **灵活订阅机制**
- 动态订阅/取消
- 多数据类型支持
- 订阅状态管理

✅ **生产就绪**
- Docker 容器化
- Prometheus 监控
- 健康检查
- 结构化日志

## 架构

```
┌─────────────────────────────────────────────────────────┐
│                   Market Data Collector                  │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Ticker    │  │  OrderBook  │  │    Trade    │     │
│  │  Collector  │  │  Collector  │  │  Collector  │ ... │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │
│         │                 │                 │            │
│         └─────────────────┴─────────────────┘            │
│                           │                              │
│                  ┌────────▼────────┐                     │
│                  │  Data Service   │                     │
│                  └────────┬────────┘                     │
│                           │                              │
│         ┌─────────────────┴─────────────────┐            │
│         │                                   │            │
│  ┌──────▼──────┐                   ┌───────▼──────┐     │
│  │    Redis    │                   │ TimescaleDB  │     │
│  │   (Cache)   │                   │  (Storage)   │     │
│  └─────────────┘                   └──────────────┘     │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## 快速开始

### 前置要求

- Python 3.11+
- Redis 7.0+
- PostgreSQL 15+ (带 TimescaleDB 扩展)

### 安装依赖

```bash
# 使用 Poetry
poetry install

# 或使用 pip
pip install -r requirements.txt
```

### 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，填入必要配置
```

### 初始化数据库

```sql
-- 连接到 PostgreSQL
psql -U postgres

-- 创建数据库
CREATE DATABASE market_data;

-- 连接到数据库
\c market_data

-- 启用 TimescaleDB 扩展
CREATE EXTENSION IF NOT EXISTS timescaledb;
```

### 启动服务

```bash
# 开发模式
poetry run python src/main.py

# 或使用 uvicorn
poetry run uvicorn src.main:app --reload --host 0.0.0.0 --port 8003
```

### 使用 Docker

```bash
# 构建镜像
docker build -t market-data-collector .

# 运行容器
docker run -d \
  --name market-data-collector \
  -p 8003:8003 \
  -p 9003:9003 \
  --env-file .env \
  market-data-collector
```

## API 使用

### 创建订阅

```bash
curl -X POST http://localhost:8003/api/v1/subscriptions \
  -H "Content-Type: application/json" \
  -d '{
    "exchange": "binance",
    "symbols": ["BTC/USDT", "ETH/USDT"],
    "data_types": ["ticker", "orderbook", "trade"],
    "intervals": ["1m", "5m"]
  }'
```

响应：
```json
{
  "subscription_id": "550e8400-e29b-41d4-a716-446655440000",
  "exchange": "binance",
  "symbols": ["BTC/USDT", "ETH/USDT"],
  "data_types": ["ticker", "orderbook", "trade"],
  "status": "active",
  "created_at": "2025-12-24T10:00:00Z"
}
```

### 查询 Ticker 数据

```bash
# 获取最新数据
curl "http://localhost:8003/api/v1/data/ticker?exchange=binance&symbol=BTC/USDT"

# 获取历史数据
curl "http://localhost:8003/api/v1/data/ticker?exchange=binance&symbol=BTC/USDT&start_time=2025-12-24T00:00:00Z&limit=100"
```

### 查询订单簿

```bash
curl "http://localhost:8003/api/v1/data/orderbook?exchange=binance&symbol=BTC/USDT"
```

### 查询K线数据

```bash
curl "http://localhost:8003/api/v1/data/klines?exchange=binance&symbol=BTC/USDT&interval=1h&limit=100"
```

### 健康检查

```bash
curl http://localhost:8003/health
```

## 数据模型

### Ticker 数据

```python
{
  "exchange": "binance",
  "symbol": "BTC/USDT",
  "timestamp": "2025-12-24T10:00:00Z",
  "last_price": 45000.50,
  "bid_price": 44999.00,
  "ask_price": 45001.00,
  "high_24h": 46000.00,
  "low_24h": 44000.00,
  "volume_24h": 1234.56,
  "quote_volume_24h": 55000000.00,
  "price_change_24h": 500.00,
  "price_change_percent_24h": 1.12
}
```

### 订单簿数据

```python
{
  "exchange": "binance",
  "symbol": "BTC/USDT",
  "timestamp": "2025-12-24T10:00:00Z",
  "bids": [
    {"price": 44999.00, "quantity": 1.5},
    {"price": 44998.00, "quantity": 2.3}
  ],
  "asks": [
    {"price": 45001.00, "quantity": 1.2},
    {"price": 45002.00, "quantity": 1.8}
  ]
}
```

## 配置说明

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `REDIS_HOST` | Redis 主机地址 | localhost |
| `TIMESCALE_HOST` | TimescaleDB 主机地址 | localhost |
| `TICKER_UPDATE_INTERVAL` | Ticker 更新间隔（秒） | 1 |
| `ORDERBOOK_DEPTH` | 订单簿深度 | 20 |
| `TRADE_BATCH_SIZE` | 成交数据批量大小 | 100 |
| `KLINE_INTERVALS` | K线时间间隔 | 1m,5m,15m,1h,4h,1d |

完整配置见 `.env.example`

## 监控

### Prometheus 指标

访问 `http://localhost:9003/metrics` 获取 Prometheus 指标

### 日志

日志格式：JSON（生产）/ 文本（开发）

```bash
# 查看实时日志
tail -f logs/market-data-collector.log
```

## 开发

### 项目结构

```
market-data-collector/
├── src/
│   ├── api/
│   │   ├── endpoints/
│   │   │   ├── data.py           # 数据查询端点
│   │   │   └── subscriptions.py  # 订阅管理端点
│   │   └── router.py              # 路由汇总
│   ├── collectors/
│   │   ├── base.py                # 基础采集器
│   │   ├── ticker_collector.py    # Ticker 采集
│   │   ├── orderbook_collector.py # 订单簿采集
│   │   ├── trade_collector.py     # 成交采集
│   │   └── kline_collector.py     # K线采集
│   ├── storage/
│   │   ├── timescale.py           # TimescaleDB 存储
│   │   └── redis_cache.py         # Redis 缓存
│   ├── services/
│   │   └── data_service.py        # 数据服务
│   ├── models/
│   │   └── schemas.py             # 数据模型
│   ├── config.py                  # 配置管理
│   └── main.py                    # 主应用
├── tests/
├── pyproject.toml
├── Dockerfile
└── README.md
```

### 运行测试

```bash
poetry run pytest
```

### 代码格式化

```bash
poetry run black src/
poetry run ruff check src/
```

## 部署

### Docker Compose

```yaml
version: '3.8'

services:
  market-data-collector:
    build: .
    ports:
      - "8003:8003"
      - "9003:9003"
    environment:
      - REDIS_HOST=redis
      - TIMESCALE_HOST=timescale
    depends_on:
      - redis
      - timescale

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  timescale:
    image: timescale/timescaledb:latest-pg15
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=market_data
```

### Kubernetes

参考 `k8s/` 目录下的部署文件

## 故障排查

### 常见问题

1. **数据采集延迟**
   - 检查网络连接
   - 增加采集器并发数
   - 检查交易所 API 速率限制

2. **Redis 连接失败**
   - 验证 Redis 配置
   - 检查网络防火墙
   - 查看 Redis 日志

3. **TimescaleDB 写入慢**
   - 增加批量写入大小
   - 优化数据库索引
   - 检查磁盘 I/O

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

## 联系方式

- 项目主页：[Delta Terminal](https://github.com/your-org/delta-terminal)
- 问题反馈：[Issues](https://github.com/your-org/delta-terminal/issues)
