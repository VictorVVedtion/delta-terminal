# Risk Manager - 风险管理服务模块

> Delta Terminal 交易引擎 - 风险管理子模块

## 模块概述

**路径**: `trading-engine/risk-manager`
**职责**: 实时风险监控、风控规则检查、告警管理和紧急止损
**技术栈**: Python 3.11, FastAPI, Redis, Pydantic
**端口**: 8004
**状态**: ✅ 已实现

---

## 核心功能

### 1. 风控规则引擎

基于规则的风险检查系统，支持多维度风控：

- **持仓限制**: 单币种/总持仓价值上限、持仓集中度控制
- **订单限制**: 订单金额上下限、订单频率控制
- **亏损限制**: 日最大亏损、连续亏损次数限制
- **回撤限制**: 动态峰值追踪、最大回撤控制
- **杠杆限制**: 全局/币种特定杠杆限制

### 2. 实时监控系统

两个核心监控器持续运行：

- **PositionMonitor**: 持仓监控 (间隔: 5秒)
  - 监控所有用户持仓
  - 检查持仓限制违规
  - 评估持仓集中度风险

- **PnLMonitor**: 盈亏监控 (间隔: 10秒)
  - 跟踪日盈亏和回撤
  - 检测连续亏损模式
  - 触发紧急止损条件

### 3. 告警管理

多级别风险告警系统：

- **告警级别**: LOW → MEDIUM → HIGH → CRITICAL
- **告警类型**: 8种告警类型覆盖所有风险场景
- **通知渠道**: Webhook / Email / SMS (可扩展)
- **告警生命周期**: 创建 → 确认 → 自动清理

### 4. 紧急止损

自动化紧急止损机制：

- **触发条件**:
  - 回撤超过 20% (可配置)
  - 日亏损超过 15000 USDT (可配置)

- **执行动作**:
  - 关闭所有持仓
  - 取消所有挂单
  - 暂停交易 24 小时

---

## 架构设计

### 数据流

```
订单请求 → RiskService.validate_order()
           ↓
    规则引擎 (多规则并行检查)
           ↓
    通过/拒绝 + 风险等级
           ↓
    返回验证结果
```

### 规则检查流程

```python
async def execute_check(context):
    if not enabled:
        return pass

    # 1. 预检查 (验证上下文)
    pre_check(context)

    # 2. 执行规则逻辑
    passed, reason, risk_level = check(context)

    # 3. 后处理 (日志记录)
    post_check(passed, reason, context)

    return passed, reason, risk_level
```

### 监控流程

```
监控循环 (每 N 秒)
    ↓
获取所有用户数据
    ↓
遍历用户 → 检查规则
    ↓
发现违规 → 创建告警
    ↓
保存快照 (Redis)
```

---

## API 端点

### 风控限制 (`/api/v1/limits`)

| 端点 | 方法 | 功能 |
|------|------|------|
| `/validate-order` | POST | 验证订单 |
| `/check-position` | POST | 检查持仓 |
| `/emergency-stop` | POST | 紧急止损 |
| `/config` | GET | 获取风控配置 |
| `/config` | PATCH | 更新风控配置 |

### 风险告警 (`/api/v1/alerts`)

| 端点 | 方法 | 功能 |
|------|------|------|
| `/` | POST | 创建告警 |
| `/{user_id}` | GET | 获取告警列表 |
| `/{user_id}/{alert_id}` | GET | 获取告警详情 |
| `/{user_id}/{alert_id}/acknowledge` | POST | 确认告警 |
| `/{user_id}/stats/count` | GET | 活跃告警数 |
| `/{user_id}/cleanup` | DELETE | 清理旧告警 |

### 风险报告 (`/api/v1/reports`)

| 端点 | 方法 | 功能 |
|------|------|------|
| `/{user_id}` | GET | 生成风险报告 |
| `/{user_id}/summary` | GET | 风险摘要 |

---

## 数据模型

### 核心模型

```python
# 订单验证请求
OrderValidationRequest {
    user_id: str
    symbol: str
    side: "buy" | "sell"
    quantity: float
    price: float
    leverage?: float
}

# 订单验证响应
OrderValidationResponse {
    valid: bool
    rejected_reason?: str
    risk_level: RiskLevel
    warnings: list[str]
}

# 风险告警
RiskAlert {
    alert_id: str
    user_id: str
    alert_type: AlertType
    risk_level: RiskLevel
    message: str
    details: dict
    timestamp: datetime
    acknowledged: bool
}

# 风险报告
RiskReport {
    report_id: str
    user_id: str
    risk_level: RiskLevel
    position_metrics: PositionRiskMetrics
    pnl_metrics: PnLRiskMetrics
    active_alerts: int
    violations: list[str]
    recommendations: list[str]
}
```

---

## Redis 数据结构

### 键命名规范

前缀: `risk:`

```
# 用户数据
risk:users:{user_id}                          # 用户基本信息
risk:positions:{user_id}                      # 用户持仓 (JSON)
risk:pnl:{user_id}                           # 用户盈亏 (JSON)

# 告警数据
risk:alerts:{user_id}:{alert_id}             # 告警详情 (JSON)
risk:alerts:list:{user_id}                   # 用户告警列表 (ZSET, score=timestamp)

# 快照数据
risk:snapshots:position:{user_id}            # 持仓快照 (TTL: 1h)
risk:snapshots:pnl:{user_id}                 # 盈亏快照 (TTL: 1h)

# 紧急止损
risk:emergency_stop:{user_id}                # 紧急止损标记 (TTL: 24h)
```

### 数据示例

```json
// risk:positions:user123
{
  "BTCUSDT": {
    "quantity": 0.5,
    "entry_price": 50000.0,
    "current_price": 51000.0,
    "unrealized_pnl": 500.0,
    "position_value_usdt": 25500.0,
    "leverage": 3.0
  },
  "ETHUSDT": {
    "quantity": 10.0,
    "entry_price": 3000.0,
    "current_price": 3100.0,
    "unrealized_pnl": 1000.0,
    "position_value_usdt": 31000.0,
    "leverage": 2.0
  }
}

// risk:pnl:user123
{
  "realized_pnl_today": -1500.0,
  "unrealized_pnl": 1500.0,
  "total_pnl": 0.0,
  "equity": 100000.0,
  "initial_equity": 100000.0,
  "peak_equity": 105000.0,
  "consecutive_losses": 2,
  "total_trades": 50,
  "winning_trades": 28
}
```

---

## 配置参数

### 风控限制

```python
# 持仓限制
MAX_POSITION_SIZE_USDT = 100000.0          # 单币种上限
MAX_TOTAL_POSITION_USDT = 500000.0         # 总持仓上限
MAX_POSITION_CONCENTRATION = 0.3           # 集中度 30%

# 订单限制
MAX_ORDER_SIZE_USDT = 50000.0              # 单笔订单上限
MIN_ORDER_SIZE_USDT = 10.0                 # 单笔订单下限

# 亏损限制
MAX_DAILY_LOSS_USDT = 10000.0              # 日最大亏损
MAX_DAILY_LOSS_PERCENTAGE = 0.05           # 日最大亏损 5%
MAX_DRAWDOWN_PERCENTAGE = 0.15             # 最大回撤 15%

# 紧急止损
EMERGENCY_STOP_DRAWDOWN = 0.20             # 触发回撤 20%
EMERGENCY_STOP_DAILY_LOSS = 15000.0        # 触发亏损 15000
```

### 监控间隔

```python
POSITION_CHECK_INTERVAL_SECONDS = 5        # 持仓检查 5秒
PNL_CHECK_INTERVAL_SECONDS = 10            # 盈亏检查 10秒
RISK_REPORT_INTERVAL_SECONDS = 60          # 报告生成 60秒
```

---

## 使用示例

### 1. 验证订单

```python
import httpx

async def validate_order():
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8004/api/v1/limits/validate-order",
            json={
                "user_id": "user123",
                "symbol": "BTCUSDT",
                "side": "buy",
                "quantity": 0.1,
                "price": 50000,
                "leverage": 3
            }
        )
        result = response.json()

        if result["valid"]:
            print("订单通过验证")
            print(f"风险等级: {result['risk_level']}")
        else:
            print(f"订单被拒绝: {result['rejected_reason']}")
```

### 2. 检查持仓风险

```python
async def check_position_risk(user_id: str):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8004/api/v1/limits/check-position",
            json={"user_id": user_id}
        )
        result = response.json()

        print(f"持仓安全: {result['safe']}")
        print(f"总持仓: {result['total_position_usdt']} USDT")
        print(f"使用率: {result['position_utilization']:.2%}")
        print(f"风险等级: {result['risk_level']}")
```

### 3. 生成风险报告

```python
async def generate_report(user_id: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"http://localhost:8004/api/v1/reports/{user_id}"
        )
        report = response.json()

        print(f"风险等级: {report['risk_level']}")
        print(f"日盈亏: {report['pnl_metrics']['daily_pnl']}")
        print(f"最大回撤: {report['pnl_metrics']['max_drawdown_percentage']:.2%}")
        print(f"活跃告警: {report['active_alerts']}")

        if report['violations']:
            print("违规项:")
            for v in report['violations']:
                print(f"  - {v}")
```

### 4. 获取告警列表

```python
async def get_alerts(user_id: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"http://localhost:8004/api/v1/alerts/{user_id}",
            params={"acknowledged": False}
        )
        alerts = response.json()

        print(f"未确认告警: {alerts['total']}")
        for alert in alerts['alerts']:
            print(f"[{alert['risk_level']}] {alert['message']}")
```

---

## 扩展开发

### 添加自定义规则

```python
# 1. 创建规则类
from src.rules.base import RiskRuleBase

class LeverageLimitRule(RiskRuleBase):
    def __init__(self, max_leverage: float = 10.0):
        super().__init__(rule_id="leverage_limit", priority=2)
        self.max_leverage = max_leverage

    def get_rule_type(self) -> str:
        return "leverage_limit"

    async def check(self, context: dict) -> tuple[bool, Optional[str], RiskLevel]:
        leverage = context.get("leverage", 1.0)

        if leverage > self.max_leverage:
            return (
                False,
                f"Leverage {leverage}x exceeds limit {self.max_leverage}x",
                RiskLevel.HIGH
            )

        return True, None, RiskLevel.LOW

# 2. 注册规则
# 在 src/services/risk_service.py 的 __init__ 中添加:
self.rules.append(LeverageLimitRule())
```

### 自定义告警通知

```python
# 在 src/services/alert_service.py 中扩展

async def _send_custom_notification(self, alert: RiskAlert) -> None:
    """发送自定义通知 (例如: 钉钉/飞书)"""
    if alert.risk_level == RiskLevel.CRITICAL:
        # 发送紧急通知
        await self._send_dingtalk_alert(alert)
    elif alert.risk_level == RiskLevel.HIGH:
        # 发送高优先级通知
        await self._send_email_alert(alert)
```

---

## 测试

### 运行测试

```bash
# 所有测试
poetry run pytest

# 规则测试
poetry run pytest tests/unit/test_rules.py -v

# 服务测试
poetry run pytest tests/unit/test_services.py -v

# 覆盖率报告
poetry run pytest --cov=src --cov-report=html
```

### 测试示例

```python
@pytest.mark.asyncio
async def test_order_validation():
    """测试订单验证流程"""
    # Mock Redis
    redis_client = MockRedis()
    alert_service = AlertService(redis_client)
    risk_service = RiskService(redis_client, alert_service)

    # 准备测试数据
    request = OrderValidationRequest(
        user_id="test_user",
        symbol="BTCUSDT",
        side="buy",
        quantity=1.0,
        price=50000
    )

    # 执行验证
    response = await risk_service.validate_order(request)

    # 断言
    assert response.valid is True
    assert response.risk_level in [RiskLevel.LOW, RiskLevel.MEDIUM]
```

---

## 监控指标

### Prometheus 指标 (计划)

```python
# 风控指标
risk_validations_total{status="passed|rejected"}    # 验证总数
risk_alerts_total{type="...", level="..."}          # 告警总数
risk_emergency_stops_total                           # 紧急止损次数

# 性能指标
risk_validation_duration_seconds                     # 验证耗时
risk_monitor_check_duration_seconds                  # 监控检查耗时
```

---

## 故障排查

### 常见问题

1. **规则检查失败**
   ```
   症状: 所有订单被拒绝
   原因: Redis 数据缺失
   解决: 检查 positions/pnl 数据是否存在
   ```

2. **监控器未运行**
   ```
   症状: 无告警生成
   原因: 监控循环异常退出
   解决: 查看日志，重启服务
   ```

3. **紧急止损未触发**
   ```
   症状: 回撤超限但未止损
   原因: emergency_stop_enabled=false
   解决: 检查配置文件
   ```

### 调试技巧

```python
# 启用调试日志
LOG_LEVEL=DEBUG

# 查看规则检查详情
logger.debug("rule_check",
    rule_type=self.get_rule_type(),
    context=context,
    result=(passed, reason, risk_level)
)
```

---

## 依赖关系

### 内部依赖

- **order-executor**: 紧急止损时调用
- **exchange-connector**: 获取实时价格 (可选)

### 外部依赖

- **Redis**: 数据存储和缓存
- **Webhook**: 告警通知 (可选)

---

## 性能考虑

### 优化点

1. **规则并行化**: 所有规则同时检查
2. **Redis 管道**: 批量读取用户数据
3. **告警去重**: 避免重复告警
4. **监控间隔**: 根据负载动态调整

### 性能指标

- 订单验证延迟: < 50ms (P99)
- 监控检查延迟: < 100ms (P99)
- Redis 操作延迟: < 10ms (P99)

---

## 安全考虑

- ✅ 输入验证 (Pydantic)
- ✅ Redis 密码保护
- ✅ API 限流 (计划)
- ✅ 敏感信息加密 (计划)
- ✅ 审计日志 (部分)

---

## 下一步计划

- [ ] 机器学习风险预测模型
- [ ] 自定义规则 DSL
- [ ] WebSocket 实时告警推送
- [ ] 风险仪表板前端
- [ ] 多账户聚合风控
- [ ] 策略级别风控

---

**最后更新**: 2025-12-24
**维护者**: Delta Terminal 团队
