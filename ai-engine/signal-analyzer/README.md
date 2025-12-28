# Signal Analyzer

Delta Terminal 的交易信号分析模块 - 技术指标计算与交易信号生成

## 快速开始

### 安装依赖

```bash
make install
# 或
poetry install
```

### 启动服务

```bash
make dev
# 或
poetry run uvicorn src.main:app --host 0.0.0.0 --port 8007 --reload
```

服务将在 http://localhost:8007 启动

### API 文档

启动服务后访问：
- Swagger UI: http://localhost:8007/docs
- ReDoc: http://localhost:8007/redoc

## 功能特性

- ✅ 技术指标计算（RSI, MACD, MA, Bollinger Bands 等）
- ✅ 交易信号生成（买入/卖出信号）
- ✅ 多策略信号聚合
- ✅ 信号置信度评分
- ⏳ 实时数据分析
- ⏳ Redis 缓存优化
- ⏳ WebSocket 推送

## 技术栈

- FastAPI 0.109+
- Python 3.11+
- Pandas & NumPy
- TA-Lib
- Redis

## 开发指南

详细文档请参考 [CLAUDE.md](./CLAUDE.md)

## 测试

```bash
make test
# 或
poetry run pytest
```

## License

MIT
