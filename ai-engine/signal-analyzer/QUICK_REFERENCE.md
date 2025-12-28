# Signal Analyzer - 快速参考指南

## 🚀 快速启动

```bash
# 进入目录
cd ai-engine/signal-analyzer

# 安装依赖
make install

# 启动开发服务器
make dev

# 访问 API 文档
open http://localhost:8007/docs
```

## 📡 API 端点速查

### 健康检查
```bash
curl http://localhost:8007/health
```

### 计算技术指标
```bash
curl -X POST http://localhost:8007/api/v1/indicators/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTCUSDT",
    "timeframe": "1h",
    "indicators": ["rsi", "macd", "bb"],
    "ohlcv_data": [...]
  }'
```

### 生成交易信号
```bash
curl -X POST http://localhost:8007/api/v1/signals/generate \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTCUSDT",
    "timeframe": "1h",
    "strategy": "momentum",
    "ohlcv_data": [...]
  }'
```

### 聚合多个信号
```bash
curl -X POST http://localhost:8007/api/v1/signals/aggregate \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTCUSDT",
    "timeframe": "1h",
    "strategies": ["momentum", "trend", "volume"],
    "ohlcv_data": [...]
  }'
```

## 🔧 常用命令

```bash
make install      # 安装依赖
make dev          # 启动开发服务器
make test         # 运行测试
make lint         # 代码检查
make format       # 格式化代码
make clean        # 清理缓存
make docker-build # 构建 Docker 镜像
make docker-run   # 运行 Docker 容器
```

## 📊 支持的技术指标

### 动量指标
- `rsi` - RSI（相对强弱指标）
- `stochastic` - Stochastic（随机指标）
- `cci` - CCI（商品通道指标）
- `williams_r` - Williams %R
- `mfi` - MFI（资金流量指标）

### 趋势指标
- `sma` - SMA（简单移动平均线）
- `ema` - EMA（指数移动平均线）
- `macd` - MACD
- `bb` - Bollinger Bands（布林带）
- `adx` - ADX（平均趋向指标）

### 成交量指标
- `obv` - OBV（能量潮）
- `vwap` - VWAP（成交量加权平均价）
- `cmf` - CMF（蔡金资金流量）

## 🎯 策略类型

- `momentum` - 动量策略（基于 RSI, MACD, Stochastic）
- `trend` - 趋势策略（基于 EMA, BB, ADX）
- `volume` - 成交量策略（基于 OBV, VWAP）
- `combined` - 组合策略（聚合多个策略）

## 📝 数据格式

### OHLCV 数据格式
```json
{
  "timestamp": 1703001600000,
  "open": 42000.0,
  "high": 42500.0,
  "low": 41800.0,
  "close": 42200.0,
  "volume": 1234.56
}
```

### 信号响应格式
```json
{
  "symbol": "BTCUSDT",
  "signal": "buy",
  "confidence": 0.75,
  "timestamp": 1703001600000,
  "indicators": {...},
  "reasoning": "RSI 超卖，MACD 金叉",
  "entry_price": 42200.0,
  "stop_loss": 41356.0,
  "take_profit": 44310.0
}
```

## 🐍 Python 使用示例

```python
from src.services import SignalService
from src.models import StrategyType, OHLCVData

# 创建服务实例
signal_service = SignalService()

# 准备数据
ohlcv_data = [
    OHLCVData(
        timestamp=1703001600000,
        open=42000.0,
        high=42500.0,
        low=41800.0,
        close=42200.0,
        volume=1234.56
    ),
    # ... 更多数据
]

# 生成信号
signal = signal_service.generate_signal(
    ohlcv_data,
    StrategyType.MOMENTUM
)

print(f"信号: {signal['signal'].value}")
print(f"置信度: {signal['confidence']:.2%}")
```

## 🔍 测试

```bash
# 运行所有测试
make test

# 运行特定测试
poetry run pytest tests/test_indicators.py -v

# 查看测试覆盖率
poetry run pytest --cov=src --cov-report=html
open htmlcov/index.html
```

## 🐳 Docker 部署

```bash
# 构建镜像
docker build -t delta-terminal/signal-analyzer:latest .

# 运行容器
docker run -p 8007:8007 \
  -e JWT_SECRET_KEY=your-secret-key \
  -e REDIS_HOST=redis \
  delta-terminal/signal-analyzer:latest

# 使用 docker-compose
docker-compose up signal-analyzer
```

## ⚙️ 环境变量

```bash
# 服务配置
PORT=8007
LOG_LEVEL=INFO

# JWT 配置
JWT_SECRET_KEY=your-secret-key

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379

# 指标参数
RSI_PERIOD=14
MACD_FAST=12
MACD_SLOW=26
MA_SHORT=20
MA_LONG=50

# 信号阈值
RSI_OVERSOLD=30
RSI_OVERBOUGHT=70
```

## 🔗 相关资源

- **API 文档**: http://localhost:8007/docs
- **ReDoc**: http://localhost:8007/redoc
- **详细文档**: [CLAUDE.md](./CLAUDE.md)
- **项目总结**: [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)
- **使用示例**: [example_usage.py](./example_usage.py)

## 📞 集成示例

### 从 NLP Processor 调用
```python
import httpx

async with httpx.AsyncClient() as client:
    response = await client.post(
        "http://localhost:8007/api/v1/signals/generate",
        json={
            "symbol": "BTCUSDT",
            "timeframe": "1h",
            "strategy": "momentum",
            "ohlcv_data": ohlcv_list
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    signal = response.json()
```

### 从 Frontend 调用
```typescript
const response = await fetch(
  'http://localhost:8007/api/v1/signals/generate',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      symbol: 'BTCUSDT',
      timeframe: '1h',
      strategy: 'momentum',
      ohlcv_data: ohlcvList
    })
  }
);
const signal = await response.json();
```

## 🐛 故障排查

### TA-Lib 安装失败
```bash
# macOS
brew install ta-lib

# Ubuntu/Debian
sudo apt-get install ta-lib

# 然后重新安装 Python 包
poetry install
```

### Redis 连接失败
```bash
# 检查 Redis 是否运行
redis-cli ping

# 启动 Redis
redis-server
```

### 端口已被占用
```bash
# 修改 .env 文件中的 PORT
PORT=8008

# 或者杀掉占用端口的进程
lsof -ti:8007 | xargs kill -9
```

## 📈 性能优化

- 使用 Redis 缓存指标计算结果
- 批量计算多个交易对
- 异步处理长时间任务
- 限制 OHLCV 数据长度（建议 100-500 根K线）

---

**提示**: 更多详细信息请查看 [CLAUDE.md](./CLAUDE.md) 文档
