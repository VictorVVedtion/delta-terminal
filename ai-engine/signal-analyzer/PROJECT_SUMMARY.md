# Signal Analyzer 模块 - 项目总结

## 创建时间
2025-12-28

## 模块概述

Signal Analyzer 是 Delta Terminal AI 引擎的核心组件之一，负责技术指标计算与交易信号生成。

## 技术架构

### 核心技术栈
- **框架**: FastAPI (异步高性能 Web 框架)
- **Python 版本**: 3.11+
- **依赖管理**: Poetry
- **技术分析**: TA-Lib, Pandas-TA
- **数据处理**: Pandas, NumPy
- **缓存**: Redis
- **容器化**: Docker

### 端口分配
- **服务端口**: 8007

## 目录结构

```
ai-engine/signal-analyzer/
├── pyproject.toml              # Poetry 配置
├── Dockerfile                  # Docker 配置
├── Makefile                    # 常用命令
├── CLAUDE.md                   # 详细模块文档
├── README.md                   # 快速开始指南
├── .env.example                # 环境变量示例
├── example_usage.py            # 使用示例
├── src/
│   ├── __init__.py
│   ├── main.py                 # FastAPI 应用入口
│   ├── config.py               # 配置管理
│   ├── api/
│   │   ├── __init__.py
│   │   └── endpoints/
│   │       ├── health.py       # 健康检查端点
│   │       └── signals.py      # 信号分析端点
│   ├── models/
│   │   ├── __init__.py
│   │   └── signal_schemas.py   # Pydantic 数据模型
│   ├── services/
│   │   ├── __init__.py
│   │   ├── signal_service.py   # 信号生成服务
│   │   ├── indicator_service.py # 技术指标计算服务
│   │   └── aggregator_service.py # 信号聚合服务
│   └── indicators/
│       ├── __init__.py
│       ├── momentum.py         # 动量指标 (RSI, Stochastic, MFI)
│       ├── trend.py            # 趋势指标 (MA, MACD, BB, ADX)
│       └── volume.py           # 成交量指标 (OBV, VWAP, CMF)
└── tests/
    ├── __init__.py
    └── test_indicators.py      # 指标测试
```

## 核心功能

### 1. 技术指标计算

#### 动量指标 (Momentum)
- ✅ **RSI** (Relative Strength Index) - 相对强弱指标
- ✅ **Stochastic** (KDJ) - 随机指标
- ✅ **CCI** (Commodity Channel Index) - 商品通道指标
- ✅ **Williams %R** - 威廉指标
- ✅ **MFI** (Money Flow Index) - 资金流量指标

#### 趋势指标 (Trend)
- ✅ **SMA** (Simple Moving Average) - 简单移动平均线
- ✅ **EMA** (Exponential Moving Average) - 指数移动平均线
- ✅ **MACD** - MACD 指标
- ✅ **Bollinger Bands** - 布林带
- ✅ **ADX** (Average Directional Index) - 平均趋向指标
- ✅ **Ichimoku** - 一目均衡表

#### 成交量指标 (Volume)
- ✅ **OBV** (On Balance Volume) - 能量潮
- ✅ **VWAP** (Volume Weighted Average Price) - 成交量加权平均价
- ✅ **CMF** (Chaikin Money Flow) - 蔡金资金流量
- ✅ **A/D Line** - 累积/派发线
- ✅ **Volume Ratio** - 成交量比率

### 2. 交易信号生成

#### 策略类型
- **Momentum 策略**: 基于 RSI, MACD, Stochastic 等动量指标
- **Trend 策略**: 基于 EMA, Bollinger Bands, ADX 等趋势指标
- **Volume 策略**: 基于 OBV, VWAP 等成交量指标

#### 信号评分系统
- 多指标加权评分
- 置信度计算（0-1）
- 信号原因说明
- 建议入场价/止损/止盈

### 3. 多信号聚合

- 支持多策略组合
- 可自定义策略权重
- 综合信号评估
- 单个信号追踪

## API 端点

### 健康检查
```
GET /health
```

### 技术指标计算
```
POST /api/v1/indicators/calculate
```

### 交易信号生成
```
POST /api/v1/signals/generate
```

### 多信号聚合
```
POST /api/v1/signals/aggregate
```

### 批量计算
```
POST /api/v1/indicators/calculate-batch
```

## 快速开始

### 1. 安装依赖
```bash
cd ai-engine/signal-analyzer
make install
```

### 2. 配置环境
```bash
cp .env.example .env
# 编辑 .env 配置必要参数
```

### 3. 启动服务
```bash
make dev
```

服务将在 http://localhost:8007 启动

### 4. 查看 API 文档
- Swagger UI: http://localhost:8007/docs
- ReDoc: http://localhost:8007/redoc

### 5. 运行示例
```bash
poetry run python example_usage.py
```

## 与其他模块集成

### 上游依赖
- **Market Data Collector** (`data-pipeline/market-data-collector`)
  - 提供实时/历史 OHLCV 数据

### 下游消费者
- **NLP Processor** (`ai-engine/nlp-processor`)
  - 获取技术分析结果用于 AI 对话

- **Strategy Generator** (`ai-engine/strategy-generator`)
  - 策略生成时参考技术指标

- **Order Executor** (`trading-engine/order-executor`)
  - 基于信号执行交易

### 调用示例
```python
import httpx

async with httpx.AsyncClient() as client:
    response = await client.post(
        "http://localhost:8007/api/v1/signals/generate",
        json={
            "symbol": "BTCUSDT",
            "timeframe": "1h",
            "ohlcv_data": [...],
            "strategy": "momentum"
        }
    )
    signal = response.json()
```

## 开发工具

### 代码质量
- **Black**: 代码格式化
- **Ruff**: 代码检查
- **MyPy**: 类型检查

### 测试
- **Pytest**: 单元测试
- **Pytest-cov**: 测试覆盖率

### 命令
```bash
make format    # 格式化代码
make lint      # 代码检查
make test      # 运行测试
```

## Docker 部署

### 构建镜像
```bash
make docker-build
```

### 运行容器
```bash
make docker-run
```

## 配置说明

### 环境变量
- `PORT`: 服务端口（默认 8007）
- `JWT_SECRET_KEY`: JWT 密钥
- `REDIS_HOST`: Redis 地址
- `RSI_PERIOD`: RSI 周期（默认 14）
- `MACD_FAST`: MACD 快线周期（默认 12）
- `RSI_OVERSOLD`: RSI 超卖阈值（默认 30）
- `RSI_OVERBOUGHT`: RSI 超买阈值（默认 70）

## 性能优化

### 缓存策略
- Redis 缓存技术指标计算结果
- 指标缓存 TTL: 10 分钟
- 信号缓存 TTL: 5 分钟

### 批量计算
- 支持多交易对并行计算
- 支持多时间周期批量分析

## 测试覆盖

### 单元测试
- ✅ 动量指标计算测试
- ✅ 趋势指标计算测试
- ✅ 成交量指标计算测试
- ✅ 参数化测试

### 集成测试
- ⏳ API 端点测试
- ⏳ 服务集成测试

## 待开发功能

- [ ] Redis 缓存实现
- [ ] WebSocket 实时推送
- [ ] 更多技术指标（Fibonacci, Ichimoku 等）
- [ ] 机器学习信号预测
- [ ] 多时间周期信号聚合
- [ ] 信号回测与验证
- [ ] 性能监控与告警

## 已知问题

1. TA-Lib 需要系统级安装（已在 Dockerfile 处理）
2. Redis 连接测试待实现
3. JWT 认证中间件待添加

## 维护建议

1. 定期更新技术指标参数
2. 监控信号准确率
3. 收集用户反馈优化算法
4. 定期备份配置与模型

## 相关文档

- [详细模块文档](./CLAUDE.md)
- [快速开始指南](./README.md)
- [使用示例](./example_usage.py)
- [NLP Processor 模块](../nlp-processor/CLAUDE.md)
- [项目总览](../../CLAUDE.md)

## 联系方式

如有问题请联系 Delta Terminal 开发团队。

---

**创建日期**: 2025-12-28
**最后更新**: 2025-12-28
**维护者**: Delta Terminal AI 团队
**模块版本**: 0.1.0
