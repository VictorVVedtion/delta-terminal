# Delta Terminal - 非功能需求 (Non-Functional Requirements)

> 版本：1.0
> 更新日期：2025-12-24
> 负责人：产品团队 & 技术团队

---

## 文档说明

本文档定义 Delta Terminal 的非功能需求（NFR），包括性能、安全、可用性、可扩展性、合规性等关键质量属性。这些需求对产品的成功至关重要，必须在架构设计和开发过程中严格遵守。

**需求级别**：
- **MUST**：强制要求，不满足则产品不可发布
- **SHOULD**：高优先级，应尽力满足
- **MAY**：可选，资源允许时实现

---

## 1. 性能要求 (Performance Requirements)

### 1.1 响应时间

| 操作 | 目标 (P95) | 最大 (P99) | 级别 |
|-----|-----------|-----------|------|
| **页面首次加载** | < 2 秒 | < 3 秒 | MUST |
| **页面切换** | < 500 毫秒 | < 1 秒 | MUST |
| **API 请求** | < 200 毫秒 | < 500 毫秒 | MUST |
| **AI 对话响应** | < 3 秒 | < 5 秒 | MUST |
| **策略生成** | < 5 秒 | < 10 秒 | MUST |
| **回测执行** (1 年 1h 数据) | < 5 秒 | < 10 秒 | SHOULD |
| **实时数据刷新** | < 1 秒 | < 2 秒 | MUST |
| **订单执行延迟** | < 100 毫秒 | < 300 毫秒 | MUST |

#### 1.1.1 页面加载性能 (MUST)

**要求**：
- **LCP (Largest Contentful Paint)**: < 2.5 秒
- **FID (First Input Delay)**: < 100 毫秒
- **CLS (Cumulative Layout Shift)**: < 0.1
- **TTI (Time to Interactive)**: < 3 秒

**实现策略**：
- 使用 Next.js SSR/SSG 预渲染关键页面
- 代码分割和懒加载
- 图片优化（WebP/AVIF、懒加载、响应式）
- CDN 加速静态资源
- 预加载关键资源 (`<link rel="preload">`)
- 使用 Turbopack 加快构建速度

**测试方法**：
- 使用 Lighthouse CI 自动化测试
- 每次部署前必须通过性能测试
- 监控真实用户指标 (RUM)

---

#### 1.1.2 AI 对话性能 (MUST)

**要求**：
- 简单查询响应时间 < 2 秒
- 复杂策略生成 < 5 秒
- 流式响应：首个 token < 500 毫秒

**实现策略**：
- 使用 Claude API 的流式输出
- 客户端显示打字效果（提升感知速度）
- 预加载常见查询的响应
- 缓存策略模板和历史对话

**降级方案**：
- Claude API 超时 (> 10 秒)：显示友好提示，建议使用模板
- API 失败：提供离线模板创建功能

---

#### 1.1.3 订单执行性能 (MUST)

**要求**：
- 从触发条件满足到订单提交 < 100 毫秒
- 订单状态更新延迟 < 1 秒
- WebSocket 连接延迟 < 50 毫秒

**实现策略**：
- 使用 WebSocket 实时接收价格数据
- 订单执行引擎独立部署（微服务）
- 在交易所服务器附近部署（AWS/GCP 同区域）
- 连接池复用，减少 API 握手时间

**监控告警**：
- 订单延迟 > 500 毫秒：警告
- 订单延迟 > 1 秒：严重告警，自动暂停策略

---

### 1.2 吞吐量

| 指标 | MVP 目标 | 6 个月目标 | 1 年目标 | 级别 |
|-----|---------|-----------|---------|------|
| **并发用户数** | 1,000 | 10,000 | 50,000 | MUST |
| **每秒 API 请求** | 500 QPS | 2,000 QPS | 10,000 QPS | MUST |
| **每秒订单执行** | 50 TPS | 200 TPS | 1,000 TPS | MUST |
| **WebSocket 连接数** | 1,000 | 10,000 | 50,000 | MUST |
| **每日处理交易量** | 10 万笔 | 100 万笔 | 500 万笔 | SHOULD |

**实现策略**：
- 水平扩展：Kubernetes 自动扩缩容
- 数据库读写分离：PostgreSQL 主从复制
- Redis 集群缓存热数据
- 消息队列异步处理（BullMQ/Kafka）
- 负载均衡：Nginx/AWS ALB

**性能测试**：
- 每次发布前进行压力测试（Apache JMeter）
- 模拟 2x 峰值流量
- 监控关键指标：CPU、内存、数据库连接数

---

### 1.3 数据处理

| 指标 | 要求 | 级别 |
|-----|------|------|
| **历史数据查询** (1 年) | < 2 秒 | MUST |
| **回测速度** (1 年 1h K 线) | < 5 秒 | SHOULD |
| **实时数据延迟** | < 500 毫秒 | MUST |
| **数据准确率** | 99.99% | MUST |
| **数据完整性** (无丢失) | 100% | MUST |

**实现策略**：
- 使用 TimescaleDB 存储时序数据
- 预计算常用指标（RSI、MACD 等）
- 数据分层存储：热数据 Redis、温数据 PostgreSQL、冷数据 S3
- 数据校验：定期与交易所数据对账

---

## 2. 安全要求 (Security Requirements)

### 2.1 认证与授权 (MUST)

#### 2.1.1 用户认证

**要求**：
- ✅ 支持邮箱 + 密码登录
- ✅ 支持 OAuth2（Google、Apple、Twitter）
- ✅ 强制密码复杂度：至少 8 位，包含字母、数字
- ✅ 密码哈希：使用 bcrypt (cost factor ≥ 12)
- ✅ Session 过期时间：7 天（记住我）/ 24 小时（普通）
- ✅ 异地登录提醒
- ✅ 支持两步验证 (2FA)：TOTP、短信、邮箱

**实现**：
- JWT (JSON Web Token) 管理会话
- Refresh Token 机制（降低 Access Token 有效期）
- HttpOnly Cookie 存储 Token（防止 XSS）

---

#### 2.1.2 API 密钥管理

**要求（关键！）**：
- 🔒 **MUST**: API Secret 加密存储（AES-256-GCM）
- 🔒 **MUST**: 每用户独立加密密钥（基于用户密码 KDF）
- 🔒 **MUST**: API Key 永不明文显示（仅显示最后 4 位）
- 🔒 **MUST**: 禁止提现权限（系统自动检测）
- 🔒 **MUST**: 支持 IP 白名单
- 🔒 **SHOULD**: 定期（90 天）提醒轮换密钥
- 🔒 **MAY**: 硬件安全模块 (HSM) 存储（企业版）

**实现**：
```typescript
// 示例：API 密钥加密流程
import crypto from 'crypto';

// 1. 从用户密码派生加密密钥
const derivedKey = crypto.pbkdf2Sync(
  userPassword,
  userSalt,
  100000,
  32,
  'sha256'
);

// 2. 加密 API Secret
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);
const encryptedSecret = Buffer.concat([
  cipher.update(apiSecret, 'utf8'),
  cipher.final()
]);
const authTag = cipher.getAuthTag();

// 3. 存储到数据库
await db.apiKeys.create({
  userId,
  exchange: 'binance',
  apiKey,
  encryptedSecret: encryptedSecret.toString('base64'),
  iv: iv.toString('base64'),
  authTag: authTag.toString('base64')
});
```

**审计**：
- 记录所有 API 密钥的创建、使用、删除
- 异常 API 调用（失败率高、异地 IP）自动告警

---

### 2.2 数据安全 (MUST)

#### 2.2.1 传输安全

**要求**：
- ✅ 全站 HTTPS (TLS 1.3)
- ✅ HSTS (HTTP Strict Transport Security) 启用
- ✅ Certificate Pinning（移动端）
- ✅ WebSocket 使用 WSS (TLS)

**配置**：
```nginx
# Nginx 配置示例
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
ssl_protocols TLSv1.3;
ssl_ciphers 'ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256';
```

---

#### 2.2.2 数据存储安全

**要求**：
- 🔒 敏感字段加密：API Secret、个人信息（手机号、地址）
- 🔒 数据库连接加密 (SSL)
- 🔒 备份文件加密
- 🔒 日志脱敏：不记录敏感信息

**数据分类**：

| 数据类型 | 安全级别 | 加密方式 | 保留期限 |
|---------|---------|---------|---------|
| API Secret | 机密 | AES-256-GCM | 永久（直到删除） |
| 密码 | 机密 | bcrypt | 永久 |
| 交易记录 | 敏感 | 无需加密（数据库已加密） | 7 年 |
| 用户邮箱 | 敏感 | 无需加密 | 永久 |
| 策略配置 | 普通 | 无需加密 | 永久 |
| 日志 | 普通 | 脱敏 | 30 天 |

---

### 2.3 应用安全 (MUST)

#### 2.3.1 常见漏洞防护

**OWASP Top 10 防护**：

| 漏洞类型 | 防护措施 | 级别 |
|---------|---------|------|
| **SQL 注入** | 使用 ORM (TypeORM/Prisma)，参数化查询 | MUST |
| **XSS** | 输入验证、输出编码、CSP 策略 | MUST |
| **CSRF** | CSRF Token、SameSite Cookie | MUST |
| **未授权访问** | 严格权限检查、RBAC | MUST |
| **敏感数据泄露** | 加密、脱敏、最小化存储 | MUST |
| **XML 外部实体 (XXE)** | 禁用 XML 外部实体 | MUST |
| **安全配置错误** | 安全审计、默认拒绝策略 | MUST |
| **反序列化** | 避免不可信数据反序列化 | MUST |
| **组件漏洞** | 定期更新依赖、Dependabot | MUST |
| **日志监控不足** | 集中式日志、异常告警 | MUST |

**Content Security Policy (CSP)**：
```html
<meta http-equiv="Content-Security-Policy"
      content="
        default-src 'self';
        script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
        style-src 'self' 'unsafe-inline';
        img-src 'self' data: https:;
        connect-src 'self' https://api.anthropic.com wss://stream.binance.com;
      ">
```

---

#### 2.3.2 API 安全

**要求**：
- ✅ Rate Limiting：防止 DDoS 和滥用
  - 登录接口：5 次/分钟/IP
  - API 调用：100 次/分钟/用户
  - AI 对话：20 次/分钟/用户
- ✅ API Key 验证（内部 API）
- ✅ 请求签名验证（关键操作）
- ✅ IP 白名单（企业版）

**实现**：
```typescript
// Rate Limiting 示例 (Express)
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 分钟
  max: 5, // 最多 5 次
  message: '登录尝试过多，请 1 分钟后重试',
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/api/auth/login', loginLimiter, loginHandler);
```

---

### 2.4 合规要求 (SHOULD)

#### 2.4.1 数据隐私

**GDPR / CCPA 合规**：
- ✅ 用户数据导出功能（7 天内响应）
- ✅ 用户数据删除功能（30 天内完成）
- ✅ 隐私政策明确告知数据使用
- ✅ Cookie 同意横幅
- ✅ 数据处理协议（DPA）

**实现**：
- 提供"下载我的数据"功能
- 提供"删除我的账户"功能（软删除 30 天后硬删除）
- 数据存储位置：欧盟用户数据存储在欧盟（AWS eu-west-1）

---

#### 2.4.2 金融合规

**AML/KYC（反洗钱/了解你的客户）**：
- 🔍 **MAY**: 监测异常交易模式（大额、频繁）
- 🔍 **MAY**: 高风险用户 KYC 验证
- 🔍 **MAY**: 交易记录保留 7 年

**风险声明**：
- ✅ **MUST**: 首次使用前显示风险提示
- ✅ **MUST**: 策略创建时显示风险评估
- ✅ **MUST**: 定期提醒投资风险

---

### 2.5 安全测试与审计 (MUST)

**测试要求**：

| 测试类型 | 频率 | 工具 | 级别 |
|---------|------|------|------|
| **静态代码分析** | 每次提交 | ESLint, SonarQube | MUST |
| **依赖漏洞扫描** | 每周 | Snyk, Dependabot | MUST |
| **渗透测试** | 每季度 | 第三方安全公司 | MUST |
| **安全审计** | 每半年 | 内部 + 外部 | SHOULD |
| **Bug Bounty** | 持续 | HackerOne | MAY |

**安全响应**：
- 关键漏洞 (CVSS ≥ 9.0)：24 小时内修复
- 高危漏洞 (CVSS 7.0-8.9)：7 天内修复
- 中危漏洞 (CVSS 4.0-6.9)：30 天内修复

---

## 3. 可用性要求 (Availability & Reliability)

### 3.1 系统可用性 (MUST)

**SLA (Service Level Agreement)**：

| 服务级别 | 可用性目标 | 年度停机时间 | 适用用户 |
|---------|-----------|-------------|---------|
| **标准版** | 99.5% | 43.8 小时 | 免费用户 |
| **专业版** | 99.9% | 8.76 小时 | 付费用户 |
| **企业版** | 99.95% | 4.38 小时 | 企业客户 |

**计算示例**：
- 99.9% = 365 天 × 24 小时 × 0.1% = 8.76 小时/年
- 月度停机 < 43.2 分钟

**排除条件**（不计入停机时间）：
- 计划内维护（提前 7 天通知，非交易高峰期）
- 第三方服务故障（交易所 API 中断）
- 不可抗力（自然灾害、战争等）

---

### 3.2 容灾与恢复 (MUST)

#### 3.2.1 备份策略

**数据库备份**：
- 全量备份：每日 (保留 30 天)
- 增量备份：每小时 (保留 7 天)
- 异地备份：每日同步到备用区域
- 备份加密：AES-256
- 恢复测试：每月演练

**RTO/RPO 目标**：
- **RTO (Recovery Time Objective)**: < 1 小时
- **RPO (Recovery Point Objective)**: < 15 分钟

**实现**：
```yaml
# PostgreSQL 备份脚本示例
backup:
  schedule: "0 2 * * *"  # 每天凌晨 2 点
  retention: 30d
  encryption: true
  destinations:
    - s3://delta-backup-us-east-1
    - s3://delta-backup-eu-west-1
```

---

#### 3.2.2 故障转移

**高可用架构**：
- 应用服务：多实例 + 负载均衡（至少 3 个 AZ）
- 数据库：主从复制 + 自动故障转移（PostgreSQL HA）
- Redis：Sentinel 模式（主从 + 哨兵）
- 消息队列：集群模式

**故障检测**：
- 健康检查：每 10 秒
- 故障转移：< 30 秒
- 自动告警：Slack、PagerDuty

---

### 3.3 降级策略 (MUST)

**服务降级场景**：

| 场景 | 降级措施 | 影响 |
|-----|---------|------|
| **Claude API 超时** | 使用缓存响应/模板 | 无法创建复杂策略 |
| **交易所 API 故障** | 暂停策略执行 | 暂时无法交易 |
| **数据库高负载** | 限制查询、返回缓存 | 数据可能延迟 |
| **AI 服务过载** | 队列排队、限流 | 响应变慢 |

**熔断机制**：
- API 错误率 > 50%：熔断 30 秒
- 连续失败 5 次：熔断 1 分钟
- 熔断后自动重试（指数退避）

---

### 3.4 监控与告警 (MUST)

**监控指标**：

| 类别 | 关键指标 | 告警阈值 | 级别 |
|-----|---------|---------|------|
| **系统** | CPU 使用率 | > 80% | 警告 |
|  | 内存使用率 | > 85% | 警告 |
|  | 磁盘使用率 | > 90% | 严重 |
| **应用** | API 响应时间 | P95 > 1s | 警告 |
|  | 错误率 | > 1% | 警告 |
|  | 5xx 错误率 | > 0.5% | 严重 |
| **业务** | 订单失败率 | > 1% | 严重 |
|  | 策略执行延迟 | > 1s | 警告 |
|  | 用户登录失败率 | > 5% | 警告 |

**监控工具**：
- 指标收集：Prometheus
- 可视化：Grafana
- 日志聚合：ELK Stack (Elasticsearch, Logstash, Kibana)
- 链路追踪：Jaeger / OpenTelemetry
- 告警通知：PagerDuty、Slack

**告警响应时间**：
- 严重告警：15 分钟内响应
- 警告告警：1 小时内响应
- 信息告警：24 小时内处理

---

## 4. 可扩展性要求 (Scalability)

### 4.1 水平扩展能力 (MUST)

**要求**：
- 应用层：无状态设计，支持无限水平扩展
- 数据库：读写分离，支持分片
- 缓存：集群模式，支持 1000+ 节点
- 消息队列：分布式部署

**实现**：
```yaml
# Kubernetes HPA 配置示例
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: delta-api
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: delta-api
  minReplicas: 3
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

---

### 4.2 数据库扩展 (SHOULD)

**分片策略**（用户量 > 100 万时）：
- 按用户 ID 分片（Consistent Hashing）
- 交易数据按时间分区（TimescaleDB 自动）
- 读写分离：主库写入，从库查询

**预期容量**：
- 1 年：支持 10 万用户
- 3 年：支持 100 万用户
- 5 年：支持 500 万用户

---

### 4.3 存储扩展 (SHOULD)

**数据增长预估**：

| 数据类型 | 单用户/日 | 1 万用户/年 | 100 万用户/年 |
|---------|----------|------------|--------------|
| 用户数据 | 10 KB | 36 MB | 3.6 GB |
| 策略配置 | 5 KB | 18 MB | 1.8 GB |
| 交易记录 | 50 KB | 180 MB | 18 GB |
| K 线数据 (共享) | - | 500 GB | 5 TB |
| 日志 | 100 KB | 360 MB | 36 GB |
| **总计** | - | **~1 TB** | **~24 TB** |

**存储方案**：
- 热数据（30 天）：SSD (PostgreSQL)
- 温数据（1 年）：HDD (PostgreSQL)
- 冷数据（> 1 年）：对象存储 (S3 Glacier)

---

## 5. 兼容性要求 (Compatibility)

### 5.1 浏览器支持 (MUST)

**桌面浏览器**：

| 浏览器 | 最低版本 | 测试覆盖 |
|-------|---------|---------|
| Chrome | 最新 -2 | P0 |
| Firefox | 最新 -2 | P1 |
| Safari | 最新 -2 | P1 |
| Edge | 最新 -2 | P2 |

**移动浏览器**：

| 浏览器 | 最低版本 | 测试覆盖 |
|-------|---------|---------|
| Chrome Mobile | 最新 -2 | P0 |
| Safari iOS | iOS 15+ | P0 |
| Samsung Internet | 最新 -2 | P2 |

**不支持**：
- ❌ Internet Explorer（任何版本）
- ❌ Opera Mini

---

### 5.2 设备支持 (MUST)

**响应式设计断点**：
- 手机：< 768px
- 平板：768px - 1024px
- 桌面：> 1024px

**触控支持**：
- ✅ 触摸事件（移动端）
- ✅ 手势操作（缩放图表、滑动切换）

**屏幕分辨率**：
- 最低：360 × 640 (iPhone SE)
- 推荐：1920 × 1080
- 支持：4K (3840 × 2160)

---

### 5.3 API 版本管理 (MUST)

**版本策略**：
- URL 路径版本化：`/api/v1/strategies`
- 向后兼容：至少支持 2 个主版本
- 废弃通知：提前 6 个月公告
- 版本文档：每个版本独立文档

**示例**：
```
当前版本：v2 (2025-12)
支持版本：v1 (2025-06), v2
废弃版本：v1 将于 2026-06 停止支持
```

---

## 6. 可维护性要求 (Maintainability)

### 6.1 代码质量 (MUST)

**质量指标**：

| 指标 | 目标 | 工具 |
|-----|------|------|
| 测试覆盖率 | ≥ 80% | Jest, Pytest |
| 代码重复率 | < 3% | SonarQube |
| 圈复杂度 | < 10 | ESLint |
| 技术债务 | < 5% | SonarQube |

**代码审查**：
- 所有 PR 必须至少 1 人审查
- 关键模块（交易引擎、风控）需 2 人审查
- 自动化检查：Lint、格式化、类型检查

---

### 6.2 文档要求 (MUST)

**必需文档**：
- ✅ API 文档（OpenAPI/Swagger）
- ✅ 架构设计文档
- ✅ 运维手册（部署、监控、故障处理）
- ✅ 代码注释（复杂逻辑）
- ✅ 变更日志（CHANGELOG.md）

**文档更新**：
- API 变更：同步更新文档
- 架构变更：7 天内更新文档
- 每次发布：更新 CHANGELOG

---

### 6.3 日志规范 (MUST)

**日志级别**：
- **ERROR**: 系统错误，影响功能
- **WARN**: 异常但可恢复
- **INFO**: 关键业务事件（订单执行、用户登录）
- **DEBUG**: 调试信息（仅开发环境）

**日志内容**：
```json
{
  "timestamp": "2025-12-24T10:30:45.123Z",
  "level": "INFO",
  "service": "trading-engine",
  "traceId": "abc-123-xyz",
  "userId": "user_12345",
  "event": "order_executed",
  "details": {
    "strategyId": "strat_456",
    "symbol": "BTC/USDT",
    "side": "buy",
    "amount": 0.1,
    "price": 42350
  }
}
```

**敏感信息脱敏**：
- API Secret: `binance_***********1234`
- 密码：永不记录
- 邮箱：`u***r@example.com`

---

## 7. 国际化要求 (Internationalization)

### 7.1 多语言支持 (SHOULD)

**Phase 1 (MVP)**：
- ✅ 简体中文
- ✅ 英文

**Phase 2 (6 个月)**：
- 🔲 繁体中文
- 🔲 日语
- 🔲 韩语

**实现**：
- 使用 i18n 框架（next-i18next）
- 分离文案与代码
- 支持 RTL 布局（未来）

---

### 7.2 时区与货币 (MUST)

**时区**：
- 所有时间存储为 UTC
- 显示时自动转换为用户时区
- 支持用户手动选择时区

**货币**：
- 主要：USDT、USD
- 支持：BTC、ETH 等加密货币
- 汇率：实时获取（CoinGecko API）

---

## 8. 可访问性要求 (Accessibility)

### 8.1 WCAG 合规 (SHOULD)

**目标**：WCAG 2.1 Level AA

**关键要求**：
- ✅ 键盘导航支持
- ✅ 屏幕阅读器友好（ARIA 标签）
- ✅ 颜色对比度 ≥ 4.5:1
- ✅ 表单 Label 清晰
- ✅ 错误提示明确

**测试工具**：
- Lighthouse Accessibility Score ≥ 90
- axe DevTools

---

## 9. 合规性检查清单

### 9.1 发布前检查 (MUST)

**安全检查**：
- ☐ 渗透测试通过
- ☐ 依赖漏洞扫描通过
- ☐ API 密钥加密验证
- ☐ HTTPS 强制启用
- ☐ Rate Limiting 配置正确

**性能检查**：
- ☐ Lighthouse Score ≥ 90
- ☐ API 响应时间达标
- ☐ 负载测试通过（2x 峰值）

**功能检查**：
- ☐ 测试覆盖率 ≥ 80%
- ☐ E2E 测试通过
- ☐ 关键路径手动测试

**合规检查**：
- ☐ 隐私政策更新
- ☐ 风险声明显示
- ☐ Cookie 同意横幅

---

## 10. 度量与改进

### 10.1 关键指标监控

**每日监控**：
- 系统可用性
- API 响应时间
- 错误率
- 订单执行成功率

**每周回顾**：
- 性能趋势
- 安全事件
- 用户反馈

**每月优化**：
- 技术债务清理
- 性能优化
- 依赖更新

---

**文档版本历史**

| 版本 | 日期 | 修改内容 | 作者 |
|-----|------|---------|------|
| 1.0 | 2025-12-24 | 初始版本,完整非功能需求 | Product & Tech Team |
