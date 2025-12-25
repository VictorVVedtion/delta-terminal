# Exchange Connector 快速启动指南

## 5分钟快速开始

### 步骤 1: 环境准备

确保已安装以下工具：

- Python 3.11+
- Poetry 1.7+
- Redis 7.0+ (或使用 Docker)

### 步骤 2: 克隆并安装

```bash
# 进入项目目录
cd /path/to/delta-terminal/trading-engine/exchange-connector

# 安装依赖
poetry install

# 或使用 make
make install
```

### 步骤 3: 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 生成加密密钥
make generate-key
# 将输出的 ENCRYPTION_KEY=xxx 添加到 .env 文件

# 编辑 .env，填入基本配置
nano .env
```

最小配置示例：

```env
# .env
DEBUG=true
LOG_LEVEL=DEBUG

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# 加密密钥（使用 make generate-key 生成）
ENCRYPTION_KEY=your_generated_key_here
```

### 步骤 4: 启动 Redis（如果没有）

```bash
# 使用 Docker 启动 Redis
docker run -d --name redis -p 6379:6379 redis:7-alpine

# 或使用 docker-compose
make docker-up
```

### 步骤 5: 启动服务

```bash
# 开发模式
make dev

# 或直接使用 poetry
poetry run uvicorn src.main:app --reload --host 0.0.0.0 --port 8003
```

服务启动后访问：

- API 文档: http://localhost:8003/docs
- 健康检查: http://localhost:8003/health

## 测试 API

### 1. 查看支持的交易所

```bash
curl http://localhost:8003/api/v1/exchanges/supported
```

### 2. 连接到币安测试网

```bash
curl -X POST "http://localhost:8003/api/v1/exchanges/connect?exchange_id=binance" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "your_testnet_api_key",
    "api_secret": "your_testnet_secret",
    "testnet": true
  }'
```

### 3. 获取市场列表

```bash
curl http://localhost:8003/api/v1/markets/binance/markets
```

### 4. 获取 BTC/USDT 行情

```bash
curl http://localhost:8003/api/v1/markets/binance/ticker/BTC/USDT
```

### 5. 创建测试订单

```bash
curl -X POST "http://localhost:8003/api/v1/account/binance/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTC/USDT",
    "type": "limit",
    "side": "buy",
    "amount": 0.001,
    "price": 30000.0
  }'
```

## Python 客户端示例

```python
import httpx
import asyncio

async def main():
    base_url = "http://localhost:8003/api/v1"

    async with httpx.AsyncClient() as client:
        # 1. 连接交易所
        response = await client.post(
            f"{base_url}/exchanges/connect",
            params={"exchange_id": "binance"},
            json={
                "api_key": "your_api_key",
                "api_secret": "your_secret",
                "testnet": True
            }
        )
        print("连接结果:", response.json())

        # 2. 获取行情
        response = await client.get(
            f"{base_url}/markets/binance/ticker/BTC/USDT"
        )
        ticker = response.json()["data"]
        print(f"BTC/USDT 价格: {ticker['last']}")

        # 3. 获取账户余额
        response = await client.get(
            f"{base_url}/account/binance/balance"
        )
        balances = response.json()["data"]
        print("账户余额:", balances[:5])  # 显示前5个

if __name__ == "__main__":
    asyncio.run(main())
```

## WebSocket 使用示例

```python
import asyncio
from src.websocket.manager import get_ws_manager

async def on_ticker_update(data):
    """行情更新回调"""
    print(f"价格: {data['close']}, 成交量: {data['volume']}")

async def main():
    # 获取 WebSocket 管理器
    ws_manager = get_ws_manager()

    # 订阅币安 BTC/USDT 行情
    await ws_manager.subscribe(
        exchange_id="binance",
        channel="ticker",
        symbol="BTCUSDT",
        callback=on_ticker_update,
        testnet=False
    )

    # 保持运行
    await asyncio.sleep(60)  # 运行60秒

    # 取消订阅
    await ws_manager.unsubscribe(
        exchange_id="binance",
        channel="ticker",
        symbol="BTCUSDT"
    )

    # 断开连接
    await ws_manager.disconnect_all()

if __name__ == "__main__":
    asyncio.run(main())
```

## Docker 快速启动

### 使用 Docker Compose（推荐）

```bash
# 启动所有服务（Redis + Exchange Connector）
make docker-up

# 查看日志
make docker-logs

# 停止服务
make docker-down
```

### 仅使用 Docker

```bash
# 构建镜像
make docker-build

# 运行容器
docker run -d \
  --name exchange-connector \
  -p 8003:8003 \
  -e REDIS_HOST=your-redis-host \
  -e ENCRYPTION_KEY=your-key \
  exchange-connector:latest
```

## 常用命令

```bash
# 开发
make dev              # 启动开发服务器
make test             # 运行测试
make lint             # 代码检查
make format           # 格式化代码

# Docker
make docker-up        # 启动容器
make docker-down      # 停止容器
make docker-logs      # 查看日志
make docker-restart   # 重启容器

# 工具
make generate-key     # 生成加密密钥
make shell            # Python shell
make clean            # 清理临时文件
```

## 开发工作流

### 1. 创建功能分支

```bash
git checkout -b feature/new-exchange-support
```

### 2. 编写代码

```bash
# 添加新功能
vim src/connectors/newexchange.py

# 添加测试
vim tests/test_newexchange.py
```

### 3. 运行检查

```bash
# 代码格式化
make format

# 代码检查
make lint

# 运行测试
make test

# 或一次性运行所有检查
make check
```

### 4. 提交代码

```bash
git add .
git commit -m "feat: 添加新交易所支持"
git push origin feature/new-exchange-support
```

## 故障排查

### 问题：服务启动失败

```bash
# 检查 Redis 是否运行
redis-cli ping

# 检查端口是否被占用
lsof -i :8003

# 查看日志
tail -f logs/app.log
```

### 问题：Redis 连接失败

```bash
# 检查 Redis 服务
docker ps | grep redis

# 测试 Redis 连接
redis-cli -h localhost -p 6379 ping
```

### 问题：测试失败

```bash
# 运行详细测试
poetry run pytest -vv

# 运行特定测试
poetry run pytest tests/test_connectors.py -k test_create_connector
```

## 下一步

1. **阅读完整文档**: `README.md`
2. **查看 API 文档**: http://localhost:8003/docs
3. **查看项目结构**: `PROJECT_STRUCTURE.md`
4. **查看模块文档**: `CLAUDE.md`

## 获取帮助

- 查看 Makefile: `make help`
- API 文档: http://localhost:8003/docs
- 健康检查: http://localhost:8003/health
- 查看日志: `make docker-logs`

## 生产部署清单

- [ ] 设置强密码的 Redis
- [ ] 配置 HTTPS
- [ ] 设置防火墙规则
- [ ] 配置日志收集
- [ ] 设置监控告警
- [ ] 备份加密密钥
- [ ] 使用环境变量管理敏感信息
- [ ] 启用速率限制
- [ ] 配置健康检查
- [ ] 设置自动重启策略

祝您使用愉快！
