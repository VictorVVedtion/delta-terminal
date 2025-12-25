# Exchange Connector - 交易所连接器模块

## 模块概述

Exchange Connector 是 Delta Terminal 的交易所连接器服务，提供统一的多交易所接口，支持市场数据获取、账户管理、订单执行等功能。

## 技术栈

- **语言**: Python 3.11+
- **框架**: FastAPI
- **交易所库**: CCXT
- **WebSocket**: websockets
- **缓存**: Redis
- **加密**: cryptography (Fernet)

## 核心功能

### 1. 交易所连接管理

- 支持币安、OKX、Bybit 等主流交易所
- 统一的连接器接口（基于 CCXT）
- API 密钥加密存储
- 自动连接保持和重连

### 2. 市场数据服务

- 市场列表查询
- 实时行情数据
- 订单簿（Order Book）
- 最近成交记录
- K线数据（OHLCV）

### 3. 账户管理

- 账户余额查询
- 持仓信息（合约）
- 账户流水

### 4. 订单管理

- 创建订单（市价、限价、止损等）
- 取消订单
- 订单查询
- 订单历史

### 5. WebSocket 实时数据

- 实时行情推送
- 深度数据推送
- 成交数据推送
- K线数据推送
- 自动重连机制

## 架构设计

### 分层架构

```
┌─────────────────────────────────────┐
│         FastAPI API Layer           │  ← REST API 端点
├─────────────────────────────────────┤
│       Exchange Service Layer        │  ← 业务逻辑层
├─────────────────────────────────────┤
│      Connector Factory Layer        │  ← 连接器工厂
├─────────────────────────────────────┤
│   Exchange Connectors (CCXT)        │  ← 交易所适配器
│  ┌──────────┬──────────┬──────────┐ │
│  │ Binance  │   OKX    │  Bybit   │ │
│  └──────────┴──────────┴──────────┘ │
└─────────────────────────────────────┘
         ↓              ↓
    ┌─────────┐    ┌──────────┐
    │  Redis  │    │ WebSocket│
    │  Cache  │    │ Manager  │
    └─────────┘    └──────────┘
```

### 核心组件

1. **BaseConnector** (`connectors/base.py`)
   - 抽象基类，定义统一接口
   - 所有交易所连接器的基础

2. **Exchange Connectors** (`connectors/`)
   - `binance.py`: 币安特定实现
   - `okx.py`: OKX 特定实现
   - `bybit.py`: Bybit 特定实现

3. **ConnectorFactory** (`connectors/factory.py`)
   - 创建和管理连接器实例
   - 单例模式，避免重复连接

4. **ExchangeService** (`services/exchange_service.py`)
   - 业务逻辑封装
   - Redis 缓存管理
   - API 密钥加密/解密

5. **WebSocket Manager** (`websocket/manager.py`)
   - 管理所有 WebSocket 连接
   - 订阅管理
   - 自动重连

## 数据模型

### 核心模型 (`models/schemas.py`)

- **Market**: 市场信息
- **Ticker**: 行情数据
- **OrderBook**: 订单簿
- **Trade**: 成交记录
- **OHLCV**: K线数据
- **Balance**: 余额信息
- **Position**: 持仓信息
- **Order**: 订单信息

## API 设计

### REST API 端点

#### 交易所管理
- `GET /api/v1/exchanges/supported` - 支持的交易所
- `POST /api/v1/exchanges/connect` - 连接交易所
- `DELETE /api/v1/exchanges/{id}` - 断开连接
- `GET /api/v1/exchanges/{id}/ping` - 测试连接

#### 市场数据
- `GET /api/v1/markets/{exchange}/markets` - 市场列表
- `GET /api/v1/markets/{exchange}/ticker/{symbol}` - 行情
- `GET /api/v1/markets/{exchange}/orderbook/{symbol}` - 订单簿
- `GET /api/v1/markets/{exchange}/trades/{symbol}` - 成交
- `GET /api/v1/markets/{exchange}/ohlcv/{symbol}` - K线

#### 账户订单
- `GET /api/v1/account/{exchange}/balance` - 余额
- `GET /api/v1/account/{exchange}/positions` - 持仓
- `POST /api/v1/account/{exchange}/orders` - 创建订单
- `DELETE /api/v1/account/{exchange}/orders/{id}` - 取消订单

## 安全机制

### 1. API 密钥加密

使用 Fernet 对称加密：

```python
from cryptography.fernet import Fernet

# 生成密钥
key = Fernet.generate_key()

# 加密
cipher = Fernet(key)
encrypted = cipher.encrypt(api_key.encode())

# 解密
decrypted = cipher.decrypt(encrypted).decode()
```

### 2. Redis 安全存储

- API 密钥加密后存储
- 支持 Redis 密码认证
- 连接池管理

### 3. 环境变量管理

- 敏感信息使用环境变量
- `.env` 文件不提交到版本控制

## 性能优化

### 1. 连接池

```python
# 单例模式，复用连接器
connector = ConnectorFactory.create_connector(
    exchange_id="binance",
    singleton=True  # 使用单例
)
```

### 2. Redis 缓存

```python
# 市场数据缓存
cache_key = f"ticker:{exchange_id}:{symbol}"
await redis.setex(cache_key, ttl=5, value=data)
```

### 3. 异步处理

```python
# 全异步 API
async def fetch_ticker(symbol: str) -> Ticker:
    return await connector.fetch_ticker(symbol)
```

## 错误处理

### 1. 交易所错误

```python
try:
    await connector.create_order(...)
except ccxt.InsufficientFunds:
    raise HTTPException(400, "余额不足")
except ccxt.InvalidOrder:
    raise HTTPException(400, "订单参数错误")
except ccxt.NetworkError:
    raise HTTPException(503, "网络错误")
```

### 2. WebSocket 重连

```python
@backoff.on_exception(
    backoff.expo,
    websockets.exceptions.WebSocketException,
    max_tries=10,
)
async def connect():
    # 自动重连逻辑
    pass
```

## 测试策略

### 1. 单元测试

```bash
pytest tests/unit -v
```

### 2. 集成测试

```bash
pytest tests/integration -v
```

### 3. Mock 测试

使用 `pytest-mock` 模拟交易所响应。

## 部署指南

### Docker 部署

```bash
# 构建
docker build -t exchange-connector .

# 运行
docker run -d \
  -p 8003:8003 \
  -e REDIS_HOST=redis \
  -e ENCRYPTION_KEY=xxx \
  exchange-connector
```

### Kubernetes 部署

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: exchange-connector
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: app
        image: exchange-connector:latest
        ports:
        - containerPort: 8003
        env:
        - name: REDIS_HOST
          value: redis-service
```

## 监控与日志

### 1. 健康检查

```bash
curl http://localhost:8003/health
```

### 2. 日志

```python
logger.info(f"订单创建成功: {order_id}")
logger.error(f"连接失败: {error}")
```

### 3. 指标

- 请求数
- 响应时间
- 错误率
- 连接状态

## 扩展开发

### 添加新交易所

1. 创建连接器类：

```python
# src/connectors/newexchange.py
from .base import BaseConnector

class NewExchangeConnector(BaseConnector):
    def _create_exchange(self, ...):
        return ccxt.newexchange({...})
```

2. 注册到工厂：

```python
ConnectorFactory.register_connector(
    'newexchange',
    NewExchangeConnector
)
```

### 添加新功能

1. 在 `BaseConnector` 添加抽象方法
2. 在各交易所连接器实现
3. 在服务层封装
4. 添加 API 端点

## 常见问题

### Q: 如何处理速率限制？

A: CCXT 自动处理，开启 `enableRateLimit: true`

### Q: 如何支持多账户？

A: 创建多个连接器实例，使用不同的 API 密钥

### Q: WebSocket 断开怎么办？

A: 自动重连机制，最多重试 10 次

## 下一步计划

- [ ] 添加更多交易所支持
- [ ] WebSocket 完整实现（OKX, Bybit）
- [ ] 订单批量操作
- [ ] 交易信号推送
- [ ] 性能监控集成

## 相关模块

- `order-executor`: 订单执行引擎
- `risk-manager`: 风险管理系统
- `market-data-collector`: 市场数据采集

## 联系与支持

- 技术文档: `/docs`
- API 文档: `http://localhost:8003/docs`
