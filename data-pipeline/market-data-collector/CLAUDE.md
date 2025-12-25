# Market Data Collector 模块文档

> Delta Terminal 数据管道 - 市场数据采集服务

## 模块概述

**职责**：实时采集加密货币市场数据并存储到时序数据库

**技术栈**：
- Python 3.11+
- FastAPI (Web 框架)
- CCXT (交易所统一接口)
- Redis (实时缓存)
- TimescaleDB (时序数据存储)
- WebSocket (实时数据推送)

**状态**：✅ 已实现

---

## 架构设计

### 核心组件

```
MarketDataCollector/
├── Collectors (采集器层)
│   ├── TickerCollector      - Ticker 数据采集
│   ├── OrderBookCollector   - 订单簿采集
│   ├── TradeCollector       - 成交数据采集
│   └── KlineCollector       - K线数据采集
│
├── Storage (存储层)
│   ├── RedisCache           - 实时缓存
│   └── TimescaleStorage     - 时序数据存储
│
├── Services (服务层)
│   └── DataService          - 数据服务管理
│
└── API (接口层)
    ├── DataEndpoints        - 数据查询端点
    └── SubscriptionEndpoints - 订阅管理端点
```

### 数据流

```
交易所 WebSocket/REST API
         │
         ▼
    ┌─────────┐
    │ Collector│ ──► 实时数据
    └─────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌──────┐  ┌──────────┐
│Redis │  │TimescaleDB│
│Cache │  │  Storage  │
└──────┘  └──────────┘
    │         │
    └────┬────┘
         ▼
    ┌──────────┐
    │ REST API │
    └──────────┘
         │
         ▼
    外部服务/客户端
```

---

## 功能特性

### 1. 多数据类型支持

#### Ticker 数据
- 实时价格
- 24h 涨跌幅
- 成交量
- 买卖价

#### 订单簿数据
- 买卖盘深度
- 20档价格
- 实时更新

#### 成交数据
- 历史成交记录
- 成交价格、数量
- 买卖方向

#### K线数据
- 多时间周期（1m, 5m, 15m, 1h, 4h, 1d）
- OHLCV 数据
- 批量获取

### 2. 多交易所支持

当前支持：
- ✅ Binance (币安)
- ✅ OKX
- ✅ Bybit

扩展新交易所只需：
1. 在 `settings.supported_exchanges` 添加交易所名称
2. CCXT 自动处理 API 差异

### 3. 智能采集策略

#### WebSocket 优先
```python
# 优先使用 WebSocket 实时推送
if hasattr(exchange, "watch_ticker"):
    await exchange.watch_ticker(symbol)
else:
    # 降级为轮询模式
    await exchange.fetch_ticker(symbol)
```

#### 批量写入优化
```python
# 累积到批量大小后一次性写入
if len(self.batch) >= settings.ticker_batch_size:
    await timescale_storage.save_tickers_batch(self.batch)
```

#### 自动重连机制
```python
# 网络错误自动重试
async def _retry_on_error(func, max_retries=3):
    for attempt in range(max_retries):
        try:
            return await func()
        except NetworkError:
            await asyncio.sleep(retry_delay)
```

### 4. 高性能存储

#### Redis 缓存层
- 实时数据毫秒级访问
- Pub/Sub 推送更新
- TTL 自动过期

#### TimescaleDB 时序存储
- Hypertable 分片存储
- 自动压缩（节省70%+空间）
- 连续聚合（快速查询）
- 数据保留策略

---

## API 接口

### 订阅管理

#### POST /api/v1/subscriptions
创建数据订阅

**请求**：
```json
{
  "exchange": "binance",
  "symbols": ["BTC/USDT", "ETH/USDT"],
  "data_types": ["ticker", "orderbook", "trade"],
  "intervals": ["1m", "5m"]
}
```

**响应**：
```json
{
  "subscription_id": "uuid",
  "exchange": "binance",
  "symbols": ["BTC/USDT", "ETH/USDT"],
  "data_types": ["ticker", "orderbook", "trade"],
  "status": "active",
  "created_at": "2025-12-24T10:00:00Z"
}
```

#### GET /api/v1/subscriptions/{id}
获取订阅详情

#### DELETE /api/v1/subscriptions/{id}
取消订阅

### 数据查询

#### GET /api/v1/data/ticker
查询 Ticker 数据

**参数**：
- `exchange`: 交易所
- `symbol`: 交易对
- `start_time`: 起始时间（可选）
- `end_time`: 结束时间（可选）
- `limit`: 返回数量

#### GET /api/v1/data/orderbook
查询订单簿数据（实时）

#### GET /api/v1/data/trades
查询成交数据

#### GET /api/v1/data/klines
查询K线数据

**参数**：
- `interval`: K线周期（1m, 5m, 15m, 1h, 4h, 1d）

---

## 配置说明

### 环境变量

#### Redis 配置
```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_TTL=3600  # 缓存过期时间（秒）
```

#### TimescaleDB 配置
```bash
TIMESCALE_HOST=localhost
TIMESCALE_PORT=5432
TIMESCALE_USER=postgres
TIMESCALE_PASSWORD=postgres
TIMESCALE_DATABASE=market_data
```

#### 采集配置
```bash
# Ticker 配置
TICKER_UPDATE_INTERVAL=1  # 更新间隔（秒）
TICKER_BATCH_SIZE=100     # 批量大小

# 订单簿配置
ORDERBOOK_DEPTH=20        # 深度档位
ORDERBOOK_UPDATE_INTERVAL=1

# 成交数据配置
TRADE_BATCH_SIZE=100
TRADE_FETCH_INTERVAL=5

# K线配置
KLINE_INTERVALS=1m,5m,15m,1h,4h,1d
KLINE_BATCH_SIZE=500
```

---

## 使用示例

### Python 客户端

```python
import httpx
from datetime import datetime

# 创建订阅
async with httpx.AsyncClient() as client:
    response = await client.post(
        "http://localhost:8003/api/v1/subscriptions",
        json={
            "exchange": "binance",
            "symbols": ["BTC/USDT"],
            "data_types": ["ticker", "kline"],
            "intervals": ["1h"]
        }
    )
    subscription = response.json()
    print(f"订阅ID: {subscription['subscription_id']}")

# 查询 Ticker
response = await client.get(
    "http://localhost:8003/api/v1/data/ticker",
    params={"exchange": "binance", "symbol": "BTC/USDT"}
)
ticker_data = response.json()

# 查询K线
response = await client.get(
    "http://localhost:8003/api/v1/data/klines",
    params={
        "exchange": "binance",
        "symbol": "BTC/USDT",
        "interval": "1h",
        "limit": 100
    }
)
klines = response.json()
```

### JavaScript 客户端

```javascript
// 创建订阅
const response = await fetch('http://localhost:8003/api/v1/subscriptions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    exchange: 'binance',
    symbols: ['BTC/USDT'],
    data_types: ['ticker']
  })
});
const subscription = await response.json();

// 查询实时数据
const ticker = await fetch(
  'http://localhost:8003/api/v1/data/ticker?exchange=binance&symbol=BTC/USDT'
).then(r => r.json());
```

---

## 部署指南

### Docker 部署

```bash
# 1. 构建镜像
docker build -t market-data-collector .

# 2. 使用 Docker Compose
docker-compose up -d

# 3. 查看日志
docker-compose logs -f market-data-collector

# 4. 健康检查
curl http://localhost:8003/health
```

### Kubernetes 部署

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: market-data-collector
spec:
  replicas: 2
  selector:
    matchLabels:
      app: market-data-collector
  template:
    metadata:
      labels:
        app: market-data-collector
    spec:
      containers:
      - name: collector
        image: market-data-collector:latest
        ports:
        - containerPort: 8003
        - containerPort: 9003
        env:
        - name: REDIS_HOST
          value: redis-service
        - name: TIMESCALE_HOST
          value: timescale-service
```

---

## 监控与告警

### Prometheus 指标

访问 `http://localhost:9003/metrics`

关键指标：
- `collector_data_points_total` - 采集数据点总数
- `collector_errors_total` - 采集错误总数
- `storage_write_duration_seconds` - 存储写入延迟
- `cache_hit_ratio` - 缓存命中率

### 日志

结构化 JSON 日志：
```json
{
  "timestamp": "2025-12-24T10:00:00Z",
  "level": "INFO",
  "message": "保存 100 条 Ticker 数据",
  "exchange": "binance",
  "symbol": "BTC/USDT"
}
```

---

## 性能优化

### 1. 批量写入
```python
# 不要单条写入
await storage.save_ticker(ticker)  # ❌

# 批量写入
batch.append(ticker)
if len(batch) >= 100:
    await storage.save_tickers_batch(batch)  # ✅
```

### 2. 缓存策略
```python
# 实时数据从缓存读取
ticker = await redis_cache.get_ticker(exchange, symbol)

# 历史数据从数据库查询
tickers = await timescale_storage.query_tickers(...)
```

### 3. 连接池
```python
# 配置数据库连接池
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=20
```

---

## 故障排查

### 问题 1: 数据采集延迟

**症状**：数据更新不及时

**排查**：
```bash
# 检查采集器状态
curl http://localhost:8003/api/v1/subscriptions

# 查看日志
docker logs market-data-collector | grep ERROR

# 检查网络延迟
ping api.binance.com
```

**解决**：
- 增加采集器并发数
- 检查交易所 API 限流
- 优化网络连接

### 问题 2: Redis 内存不足

**症状**：缓存失效频繁

**排查**：
```bash
# 检查 Redis 内存使用
redis-cli INFO memory

# 查看缓存键数量
redis-cli DBSIZE
```

**解决**：
- 减少 TTL 时间
- 增加 Redis 内存
- 启用 LRU 淘汰策略

### 问题 3: TimescaleDB 写入慢

**症状**：批量写入延迟高

**排查**：
```sql
-- 检查表大小
SELECT hypertable_size('tickers');

-- 查看压缩状态
SELECT * FROM timescaledb_information.compression_settings;
```

**解决**：
- 增加批量大小
- 启用压缩
- 优化索引

---

## 扩展开发

### 添加新的采集器

```python
# 1. 创建采集器类
class CustomCollector(WebSocketCollector):
    async def start(self, symbols: List[str]):
        # 实现采集逻辑
        pass

# 2. 在 DataService 中注册
async def _start_collector(self, data_type: str):
    if data_type == "custom":
        collector = CustomCollector(exchange)
        # ...
```

### 添加新的数据类型

```python
# 1. 定义数据模型
class CustomData(BaseModel):
    exchange: str
    symbol: str
    # ...

# 2. 创建数据库表
CREATE TABLE custom_data (...);

# 3. 添加存储方法
async def save_custom_data(self, data: CustomData):
    # ...
```

---

## 相关文档

- [CCXT 文档](https://docs.ccxt.com/)
- [TimescaleDB 文档](https://docs.timescale.com/)
- [FastAPI 文档](https://fastapi.tiangolo.com/)
- [Redis 文档](https://redis.io/docs/)

---

## 变更记录

- **2025-12-24** - 初始版本实现
  - ✅ Ticker 采集
  - ✅ 订单簿采集
  - ✅ 成交数据采集
  - ✅ K线数据采集
  - ✅ Redis 缓存
  - ✅ TimescaleDB 存储
  - ✅ REST API
  - ✅ Docker 部署

---

**维护者**: Delta Terminal 开发团队
**最后更新**: 2025-12-24
