# Exchange Connector - 交易所连接器

Delta Terminal 的交易所连接器服务，提供统一的多交易所接口。

## 功能特性

### 核心功能

- **多交易所支持**：统一接口连接币安、OKX、Bybit 等主流交易所
- **REST API 封装**：完整的市场数据、账户信息、订单管理接口
- **WebSocket 实时数据**：实时行情、深度、成交数据推送
- **连接池管理**：高效的连接复用和管理
- **自动重连机制**：网络断开自动重连，保证服务稳定性
- **API 密钥加密存储**：使用 Fernet 加密保护 API 密钥

### 支持的交易所

- ✅ 币安（Binance）- 现货、合约
- ✅ OKX - 现货、永续、交割、期权
- ✅ Bybit - 现货、永续、反向合约

### API 功能

- **市场数据**
  - 获取市场列表
  - 实时行情（Ticker）
  - 订单簿（Order Book）
  - 最近成交
  - K线数据（OHLCV）

- **账户管理**
  - 账户余额
  - 持仓信息（合约）

- **订单管理**
  - 创建订单（市价、限价、止损等）
  - 取消订单
  - 查询订单
  - 未完成订单列表
  - 已完成订单历史

## 快速开始

### 前置要求

- Python 3.11+
- Poetry 1.7+
- Redis 7.0+

### 安装

```bash
# 安装依赖
poetry install

# 复制环境变量配置
cp .env.example .env

# 编辑 .env 文件，填入必要配置
```

### 生成加密密钥

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

将生成的密钥填入 `.env` 文件的 `ENCRYPTION_KEY` 字段。

### 启动服务

```bash
# 开发模式
poetry run python -m src.main

# 或使用 uvicorn
poetry run uvicorn src.main:app --reload --host 0.0.0.0 --port 8003
```

### Docker 部署

```bash
# 构建镜像
docker build -t exchange-connector:latest .

# 运行容器
docker run -d \
  --name exchange-connector \
  -p 8003:8003 \
  -e REDIS_HOST=redis \
  -e ENCRYPTION_KEY=your_encryption_key \
  exchange-connector:latest
```

## API 文档

启动服务后访问：

- Swagger UI: `http://localhost:8003/docs`
- ReDoc: `http://localhost:8003/redoc`

### API 端点概览

#### 交易所管理

- `GET /api/v1/exchanges/supported` - 获取支持的交易所列表
- `POST /api/v1/exchanges/connect` - 连接到交易所
- `DELETE /api/v1/exchanges/{exchange_id}` - 断开连接
- `GET /api/v1/exchanges/{exchange_id}/ping` - 测试连接

#### 市场数据

- `GET /api/v1/markets/{exchange_id}/markets` - 获取市场列表
- `GET /api/v1/markets/{exchange_id}/ticker/{symbol}` - 获取行情
- `GET /api/v1/markets/{exchange_id}/orderbook/{symbol}` - 获取订单簿
- `GET /api/v1/markets/{exchange_id}/trades/{symbol}` - 获取成交记录
- `GET /api/v1/markets/{exchange_id}/ohlcv/{symbol}` - 获取K线数据

#### 账户管理

- `GET /api/v1/account/{exchange_id}/balance` - 获取余额
- `GET /api/v1/account/{exchange_id}/positions` - 获取持仓

#### 订单管理

- `POST /api/v1/account/{exchange_id}/orders` - 创建订单
- `DELETE /api/v1/account/{exchange_id}/orders/{order_id}` - 取消订单
- `GET /api/v1/account/{exchange_id}/orders/{order_id}` - 查询订单
- `GET /api/v1/account/{exchange_id}/orders/open` - 未完成订单
- `GET /api/v1/account/{exchange_id}/orders/closed` - 已完成订单

## 使用示例

### 连接到交易所

```python
import httpx

# 连接到币安
response = httpx.post(
    "http://localhost:8003/api/v1/exchanges/connect",
    params={"exchange_id": "binance"},
    json={
        "api_key": "your_api_key",
        "api_secret": "your_api_secret",
        "testnet": False
    }
)

print(response.json())
```

### 获取行情数据

```python
# 获取 BTC/USDT 行情
response = httpx.get(
    "http://localhost:8003/api/v1/markets/binance/ticker/BTC/USDT"
)

ticker = response.json()["data"]
print(f"BTC/USDT 价格: {ticker['last']}")
```

### 创建订单

```python
# 创建限价买单
response = httpx.post(
    "http://localhost:8003/api/v1/account/binance/orders",
    json={
        "symbol": "BTC/USDT",
        "type": "limit",
        "side": "buy",
        "amount": 0.001,
        "price": 50000.0
    }
)

order = response.json()["data"]
print(f"订单ID: {order['id']}")
```

### WebSocket 使用

```python
from src.websocket.manager import get_ws_manager

async def on_ticker(data):
    print(f"收到行情: {data}")

# 获取 WebSocket 管理器
ws_manager = get_ws_manager()

# 订阅行情
await ws_manager.subscribe(
    exchange_id="binance",
    channel="ticker",
    symbol="BTCUSDT",
    callback=on_ticker,
    testnet=False
)
```

## 配置说明

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `HOST` | 服务监听地址 | `0.0.0.0` |
| `PORT` | 服务端口 | `8003` |
| `DEBUG` | 调试模式 | `false` |
| `REDIS_HOST` | Redis 主机 | `localhost` |
| `REDIS_PORT` | Redis 端口 | `6379` |
| `ENCRYPTION_KEY` | API密钥加密密钥 | - |
| `LOG_LEVEL` | 日志级别 | `INFO` |

### 缓存配置

- `MARKET_CACHE_TTL`: 市场列表缓存时间（秒），默认 60
- `TICKER_CACHE_TTL`: 行情缓存时间（秒），默认 5
- `ORDERBOOK_CACHE_TTL`: 订单簿缓存时间（秒），默认 1

## 测试

```bash
# 运行所有测试
poetry run pytest

# 运行单元测试
poetry run pytest tests/unit

# 生成覆盖率报告
poetry run pytest --cov=src --cov-report=html
```

## 架构设计

### 目录结构

```
exchange-connector/
├── src/
│   ├── api/                  # API 端点
│   │   └── endpoints/
│   │       ├── exchanges.py  # 交易所管理
│   │       ├── markets.py    # 市场数据
│   │       └── account.py    # 账户订单
│   ├── connectors/           # 交易所连接器
│   │   ├── base.py          # 基类
│   │   ├── binance.py       # 币安
│   │   ├── okx.py           # OKX
│   │   ├── bybit.py         # Bybit
│   │   └── factory.py       # 工厂
│   ├── websocket/           # WebSocket
│   │   ├── base.py          # 基类
│   │   ├── binance_ws.py    # 币安 WS
│   │   └── manager.py       # 管理器
│   ├── services/            # 业务逻辑
│   │   └── exchange_service.py
│   ├── models/              # 数据模型
│   │   └── schemas.py
│   ├── config.py            # 配置
│   └── main.py              # 主应用
├── tests/                   # 测试
├── Dockerfile               # Docker 配置
└── pyproject.toml          # 项目配置
```

### 技术栈

- **Web 框架**: FastAPI
- **CCXT**: 交易所统一接口库
- **WebSocket**: websockets
- **缓存**: Redis
- **加密**: cryptography (Fernet)
- **异步**: asyncio, aiohttp

## 安全注意事项

1. **API 密钥加密**：所有 API 密钥使用 Fernet 对称加密存储在 Redis
2. **环境变量**：敏感信息不要硬编码，使用环境变量
3. **HTTPS**：生产环境建议使用 HTTPS
4. **权限控制**：建议添加认证中间件

## 性能优化

1. **连接池**：复用 CCXT 连接器实例
2. **Redis 缓存**：市场数据缓存减少 API 调用
3. **异步处理**：全异步架构提高并发性能
4. **速率限制**：自动处理交易所速率限制

## 故障排查

### 连接失败

- 检查 API 密钥是否正确
- 检查网络连接
- 查看交易所 API 状态

### Redis 连接失败

- 检查 Redis 是否运行
- 检查 Redis 连接配置

### WebSocket 断开

- 检查网络稳定性
- 查看自动重连日志
- 调整重连参数

## 贡献指南

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

## 相关链接

- [CCXT 文档](https://docs.ccxt.com/)
- [FastAPI 文档](https://fastapi.tiangolo.com/)
- [币安 API 文档](https://binance-docs.github.io/apidocs/)
- [OKX API 文档](https://www.okx.com/docs-v5/en/)
- [Bybit API 文档](https://bybit-exchange.github.io/docs/)
