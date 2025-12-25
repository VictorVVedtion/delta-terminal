# Risk Manager - 风险管理服务

Delta Terminal 的风险管理系统，提供实时风险监控、风控规则检查和紧急止损功能。

## 功能特性

### 核心功能

- **订单验证**: 多维度风控规则检查
- **持仓监控**: 实时持仓风险评估
- **盈亏监控**: 日损失和回撤监控
- **告警系统**: 多级别风险告警
- **紧急止损**: 自动触发紧急止损机制
- **风险报告**: 综合风险分析报告

### 风控规则

1. **持仓限制**
   - 单币种持仓上限
   - 总持仓价值上限
   - 持仓集中度限制

2. **订单限制**
   - 单笔订单金额上限
   - 最小订单金额
   - 订单频率限制

3. **亏损限制**
   - 日最大亏损金额
   - 日最大亏损百分比
   - 连续亏损次数限制

4. **回撤限制**
   - 最大回撤百分比
   - 动态峰值追踪

5. **杠杆限制**
   - 最大杠杆倍数
   - 币种特定杠杆限制

## 技术架构

```
risk-manager/
├── src/
│   ├── api/
│   │   ├── router.py          # 路由汇总
│   │   └── endpoints/
│   │       ├── limits.py      # 风控限制端点
│   │       ├── alerts.py      # 告警端点
│   │       └── reports.py     # 风控报告端点
│   ├── services/
│   │   ├── risk_service.py    # 风险服务
│   │   └── alert_service.py   # 告警服务
│   ├── rules/
│   │   ├── base.py            # 规则基类
│   │   ├── position_limit.py  # 持仓限制
│   │   ├── order_size_limit.py # 订单限制
│   │   ├── daily_loss_limit.py # 日损失限制
│   │   └── drawdown_limit.py  # 回撤限制
│   ├── monitors/
│   │   ├── position_monitor.py # 持仓监控器
│   │   └── pnl_monitor.py     # 盈亏监控器
│   ├── models/
│   │   └── schemas.py         # 数据模型
│   ├── config.py              # 配置管理
│   └── main.py                # 应用入口
├── tests/                     # 测试文件
├── Dockerfile                 # Docker 配置
├── pyproject.toml            # 项目配置
└── README.md                 # 项目文档
```

## 快速开始

### 环境要求

- Python 3.11+
- Poetry 1.7+
- Redis 7.0+

### 安装依赖

```bash
# 使用 Poetry 安装
poetry install

# 或使用 pip
pip install -r requirements.txt
```

### 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，配置必要参数
vim .env
```

### 启动服务

```bash
# 开发模式
poetry run python src/main.py

# 或使用 uvicorn
poetry run uvicorn src.main:app --reload --host 0.0.0.0 --port 8004
```

### Docker 部署

```bash
# 构建镜像
docker build -t risk-manager:latest .

# 运行容器
docker run -d \
  --name risk-manager \
  -p 8004:8004 \
  --env-file .env \
  risk-manager:latest
```

## API 文档

启动服务后访问:
- Swagger UI: http://localhost:8004/docs
- ReDoc: http://localhost:8004/redoc

### 主要端点

#### 风控限制

```bash
# 验证订单
POST /api/v1/limits/validate-order
{
  "user_id": "user123",
  "symbol": "BTCUSDT",
  "side": "buy",
  "quantity": 0.1,
  "price": 50000
}

# 检查持仓
POST /api/v1/limits/check-position
{
  "user_id": "user123",
  "symbol": "BTCUSDT"  # 可选
}

# 紧急止损
POST /api/v1/limits/emergency-stop
{
  "user_id": "user123",
  "reason": "Maximum drawdown exceeded",
  "force": false
}

# 获取风控配置
GET /api/v1/limits/config
```

#### 风险告警

```bash
# 获取告警列表
GET /api/v1/alerts/{user_id}?page=1&page_size=20&acknowledged=false

# 获取告警详情
GET /api/v1/alerts/{user_id}/{alert_id}

# 确认告警
POST /api/v1/alerts/{user_id}/{alert_id}/acknowledge

# 获取活跃告警数量
GET /api/v1/alerts/{user_id}/stats/count

# 清理旧告警
DELETE /api/v1/alerts/{user_id}/cleanup?days=7
```

#### 风险报告

```bash
# 生成风险报告
GET /api/v1/reports/{user_id}

# 获取风险摘要
GET /api/v1/reports/{user_id}/summary
```

## 监控指标

### 持仓监控

- 实时检查间隔: 5秒
- 监控指标:
  - 单币种持仓价值
  - 总持仓价值
  - 持仓集中度
  - 持仓使用率

### 盈亏监控

- 实时检查间隔: 10秒
- 监控指标:
  - 日盈亏金额
  - 日盈亏百分比
  - 最大回撤
  - 连续亏损次数
  - 胜率

## 告警类型

- `POSITION_LIMIT`: 持仓限制告警
- `ORDER_SIZE_LIMIT`: 订单大小限制告警
- `DAILY_LOSS_LIMIT`: 日损失限制告警
- `DRAWDOWN_LIMIT`: 回撤限制告警
- `CONSECUTIVE_LOSSES`: 连续亏损告警
- `LEVERAGE_LIMIT`: 杠杆限制告警
- `ORDER_FREQUENCY`: 订单频率告警
- `EMERGENCY_STOP`: 紧急止损告警

## 风险等级

- `LOW`: 低风险 (绿色)
- `MEDIUM`: 中等风险 (黄色)
- `HIGH`: 高风险 (橙色)
- `CRITICAL`: 紧急风险 (红色)

## 开发指南

### 添加新规则

1. 在 `src/rules/` 创建新规则文件
2. 继承 `RiskRuleBase` 基类
3. 实现 `check()` 和 `get_rule_type()` 方法
4. 在 `RiskService` 中注册规则

示例:

```python
from src.rules.base import RiskRuleBase
from src.models.schemas import RiskLevel

class MyCustomRule(RiskRuleBase):
    def get_rule_type(self) -> str:
        return "my_custom_rule"

    async def check(self, context: dict) -> tuple[bool, Optional[str], RiskLevel]:
        # 实现检查逻辑
        passed = True
        reason = None
        risk_level = RiskLevel.LOW
        return passed, reason, risk_level
```

### 运行测试

```bash
# 运行所有测试
poetry run pytest

# 运行特定测试
poetry run pytest tests/unit/test_rules.py

# 生成覆盖率报告
poetry run pytest --cov=src --cov-report=html
```

### 代码质量

```bash
# 格式化代码
poetry run black src/

# 代码检查
poetry run ruff check src/

# 类型检查
poetry run mypy src/
```

## 配置说明

### 风控参数调整

在 `.env` 文件中调整以下参数:

```env
# 持仓限制
MAX_POSITION_SIZE_USDT=100000.0      # 单币种最大持仓
MAX_TOTAL_POSITION_USDT=500000.0     # 总持仓上限
MAX_POSITION_CONCENTRATION=0.3       # 持仓集中度上限

# 订单限制
MAX_ORDER_SIZE_USDT=50000.0          # 单笔订单上限
MIN_ORDER_SIZE_USDT=10.0             # 单笔订单下限

# 亏损限制
MAX_DAILY_LOSS_USDT=10000.0          # 日最大亏损
MAX_DAILY_LOSS_PERCENTAGE=0.05       # 日最大亏损比例
MAX_DRAWDOWN_PERCENTAGE=0.15         # 最大回撤比例

# 紧急止损
EMERGENCY_STOP_DRAWDOWN=0.20         # 紧急止损回撤阈值
EMERGENCY_STOP_DAILY_LOSS=15000.0    # 紧急止损日亏损阈值
```

## 故障排查

### 常见问题

1. **Redis 连接失败**
   - 检查 Redis 服务是否启动
   - 验证 `REDIS_HOST` 和 `REDIS_PORT` 配置

2. **监控器未启动**
   - 查看日志确认启动状态
   - 检查 Redis 连接

3. **告警未触发**
   - 验证告警配置
   - 检查 Webhook URL 是否正确

### 日志查看

```bash
# Docker 容器日志
docker logs -f risk-manager

# 本地日志
tail -f logs/risk-manager.log
```

## 性能优化

- Redis 连接池优化
- 规则检查并行化
- 监控间隔动态调整
- 告警批量处理

## 安全建议

- 使用强密码保护 Redis
- 定期更新 JWT 密钥
- 限制 API 访问权限
- 启用 HTTPS
- 监控异常访问

## 路线图

- [ ] 机器学习风险预测
- [ ] 自定义规则引擎
- [ ] 实时风险仪表板
- [ ] 多账户聚合风控
- [ ] 风险压力测试

## 贡献指南

1. Fork 项目
2. 创建特性分支
3. 提交变更
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License

## 联系方式

- 项目主页: https://github.com/delta-terminal/risk-manager
- 问题反馈: https://github.com/delta-terminal/risk-manager/issues
