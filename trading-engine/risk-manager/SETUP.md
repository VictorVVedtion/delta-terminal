# Risk Manager 项目设置指南

## 📋 项目概述

Risk Manager 是 Delta Terminal 的核心风险管理服务，提供：

- ✅ 多维度风控规则检查
- ✅ 实时持仓和盈亏监控
- ✅ 智能风险告警系统
- ✅ 自动化紧急止损机制
- ✅ 综合风险分析报告

## 🚀 快速开始

### 1. 环境准备

**必需软件**:
- Python 3.11+
- Poetry 1.7+
- Redis 7.0+

**可选软件**:
- Docker & Docker Compose
- PostgreSQL (未来用于持久化)

### 2. 安装依赖

```bash
# 方式一: 使用 Poetry (推荐)
poetry install

# 方式二: 使用 pip
pip install -r requirements.txt
```

### 3. 配置环境

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置文件
vim .env
```

**关键配置项**:
```env
# Redis 连接
REDIS_HOST=localhost
REDIS_PORT=6379

# 风控限制
MAX_POSITION_SIZE_USDT=100000.0
MAX_DAILY_LOSS_USDT=10000.0
MAX_DRAWDOWN_PERCENTAGE=0.15

# 紧急止损
EMERGENCY_STOP_ENABLED=true
EMERGENCY_STOP_DRAWDOWN=0.20
```

### 4. 启动 Redis

```bash
# macOS (Homebrew)
brew services start redis

# Linux (systemd)
sudo systemctl start redis

# Docker
docker run -d -p 6379:6379 --name redis redis:7-alpine
```

### 5. 启动服务

```bash
# 方式一: 使用启动脚本 (推荐)
./run.sh

# 方式二: 直接运行
poetry run python src/main.py

# 方式三: 使用 uvicorn
poetry run uvicorn src.main:app --reload --host 0.0.0.0 --port 8004
```

服务启动后访问:
- 🌐 API 文档: http://localhost:8004/docs
- 📖 ReDoc: http://localhost:8004/redoc
- 💓 健康检查: http://localhost:8004/health

## 🧪 测试

### 运行单元测试

```bash
# 所有测试
poetry run pytest

# 详细输出
poetry run pytest -v

# 测试覆盖率
poetry run pytest --cov=src --cov-report=html

# 查看覆盖率报告
open htmlcov/index.html
```

### API 集成测试

```bash
# 确保服务已启动，然后运行:
./test_api.sh
```

### 手动测试示例

```bash
# 1. 健康检查
curl http://localhost:8004/health

# 2. 验证订单
curl -X POST http://localhost:8004/api/v1/limits/validate-order \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "symbol": "BTCUSDT",
    "side": "buy",
    "quantity": 0.1,
    "price": 50000,
    "leverage": 3
  }'

# 3. 检查持仓
curl -X POST http://localhost:8004/api/v1/limits/check-position \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123"
  }'

# 4. 生成风险报告
curl http://localhost:8004/api/v1/reports/user123
```

## 🐳 Docker 部署

### 构建镜像

```bash
docker build -t risk-manager:latest .
```

### 运行容器

```bash
# 单独运行
docker run -d \
  --name risk-manager \
  -p 8004:8004 \
  --env-file .env \
  -e REDIS_HOST=host.docker.internal \
  risk-manager:latest

# 使用 Docker Compose (推荐)
# 在项目根目录的 docker-compose.yml 中已包含配置
docker-compose up -d risk-manager
```

### 查看日志

```bash
docker logs -f risk-manager
```

## 📁 项目结构

```
risk-manager/
├── src/
│   ├── api/                    # API 层
│   │   ├── router.py          # 路由汇总
│   │   └── endpoints/         # API 端点
│   │       ├── limits.py      # 风控限制
│   │       ├── alerts.py      # 告警管理
│   │       └── reports.py     # 风险报告
│   ├── services/              # 业务逻辑层
│   │   ├── risk_service.py   # 风险服务
│   │   └── alert_service.py  # 告警服务
│   ├── rules/                 # 风控规则
│   │   ├── base.py           # 规则基类
│   │   ├── position_limit.py # 持仓限制
│   │   ├── order_size_limit.py
│   │   ├── daily_loss_limit.py
│   │   └── drawdown_limit.py
│   ├── monitors/              # 监控器
│   │   ├── position_monitor.py
│   │   └── pnl_monitor.py
│   ├── models/                # 数据模型
│   │   └── schemas.py
│   ├── config.py             # 配置管理
│   └── main.py               # 应用入口
├── tests/                     # 测试文件
│   ├── unit/                 # 单元测试
│   └── integration/          # 集成测试
├── Dockerfile                # Docker 配置
├── pyproject.toml           # 项目配置
├── .env.example             # 环境变量模板
├── run.sh                   # 启动脚本
├── test_api.sh              # API 测试脚本
├── README.md                # 项目文档
├── CLAUDE.md                # AI 助手文档
└── SETUP.md                 # 本文件
```

## 🔧 开发工作流

### 1. 代码格式化

```bash
# 使用 Black 格式化代码
poetry run black src/

# 使用 Ruff 检查代码质量
poetry run ruff check src/

# 自动修复问题
poetry run ruff check --fix src/
```

### 2. 类型检查

```bash
poetry run mypy src/
```

### 3. 添加新规则

1. 在 `src/rules/` 创建新规则文件
2. 继承 `RiskRuleBase`
3. 实现必需方法
4. 在 `RiskService` 中注册

示例:
```python
# src/rules/leverage_limit.py
from src.rules.base import RiskRuleBase

class LeverageLimitRule(RiskRuleBase):
    async def check(self, context: dict) -> tuple[bool, Optional[str], RiskLevel]:
        # 实现检查逻辑
        pass
```

### 4. 提交代码

```bash
# 运行所有检查
poetry run black src/
poetry run ruff check src/
poetry run mypy src/
poetry run pytest

# 提交
git add .
git commit -m "feat: add leverage limit rule"
```

## 📊 监控和调试

### 查看实时日志

```bash
# 本地开发
tail -f logs/risk-manager.log

# Docker
docker logs -f risk-manager

# 只看错误
docker logs risk-manager 2>&1 | grep ERROR
```

### Redis 数据检查

```bash
# 连接 Redis
redis-cli

# 查看所有风控相关键
KEYS risk:*

# 查看用户持仓
GET risk:positions:user123

# 查看用户盈亏
GET risk:pnl:user123

# 查看告警列表
ZRANGE risk:alerts:list:user123 0 -1
```

### 性能分析

```bash
# 使用 py-spy 进行性能分析
pip install py-spy
py-spy top --pid <process_id>

# 火焰图
py-spy record -o profile.svg --pid <process_id>
```

## 🔐 安全最佳实践

1. **生产环境必做**:
   - ✅ 修改 `JWT_SECRET_KEY`
   - ✅ 启用 Redis 密码认证
   - ✅ 使用 HTTPS
   - ✅ 限制 CORS 来源
   - ✅ 启用 API 限流

2. **环境变量**:
   - 不要提交 `.env` 到版本控制
   - 使用密钥管理服务 (AWS Secrets Manager, Vault)

3. **Redis 安全**:
   ```bash
   # 设置 Redis 密码
   redis-cli CONFIG SET requirepass "your-strong-password"

   # 在 .env 中配置
   REDIS_PASSWORD=your-strong-password
   ```

## 🐛 故障排查

### 问题: Redis 连接失败

**症状**:
```
redis.exceptions.ConnectionError: Error 111 connecting to localhost:6379
```

**解决**:
```bash
# 检查 Redis 是否运行
redis-cli ping

# 如果未运行，启动 Redis
brew services start redis  # macOS
sudo systemctl start redis # Linux
```

### 问题: 监控器未启动

**症状**: 无告警生成

**解决**:
1. 检查日志查看监控器状态
2. 确认 Redis 连接正常
3. 重启服务

### 问题: 订单验证总是失败

**症状**: 所有订单返回 `valid: false`

**解决**:
1. 检查 Redis 中是否有用户数据
2. 确认风控限制配置合理
3. 查看具体的 `rejected_reason`

### 问题: 端口已被占用

**症状**:
```
OSError: [Errno 48] Address already in use
```

**解决**:
```bash
# 查找占用 8004 端口的进程
lsof -i :8004

# 杀死进程
kill -9 <PID>

# 或使用其他端口
PORT=8005 poetry run python src/main.py
```

## 📈 性能优化建议

1. **Redis 优化**:
   - 使用连接池
   - 启用 Redis 持久化
   - 考虑 Redis Cluster (大规模)

2. **监控优化**:
   - 根据负载调整检查间隔
   - 使用批量操作减少 Redis 调用
   - 异步处理告警通知

3. **规则优化**:
   - 规则并行执行
   - 缓存计算结果
   - 早期退出策略

## 🚧 已知限制

- 暂不支持自定义规则 DSL
- 告警仅支持 Webhook (邮件/短信待实现)
- 无内置可视化仪表板
- 单机部署 (集群部署待实现)

## 🗺️ 未来计划

- [ ] 机器学习风险预测
- [ ] WebSocket 实时推送
- [ ] 风险仪表板前端
- [ ] PostgreSQL 数据持久化
- [ ] 多账户聚合风控
- [ ] 自定义规则引擎
- [ ] Prometheus 指标导出

## 📞 获取帮助

- 📖 查看 [README.md](./README.md) 详细文档
- 🤖 查看 [CLAUDE.md](./CLAUDE.md) AI 助手指南
- 📚 访问 API 文档: http://localhost:8004/docs
- 🐛 提交问题: GitHub Issues

## 📄 许可证

MIT License

---

**最后更新**: 2025-12-24
**维护者**: Delta Terminal 团队
