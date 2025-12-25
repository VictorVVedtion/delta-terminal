# User Service - 用户管理服务

> Delta Terminal 后端核心服务 - 用户数据管理

## 模块概述

User Service 是 Delta Terminal 的核心后端服务之一，负责：

- 用户注册、登录、认证
- 用户资料管理（个人信息、交易经验等）
- 用户设置管理（通知、UI偏好、默认配置）
- 交易所 API 密钥的安全存储与管理

## 技术架构

### 技术栈

- **框架**: Fastify 4.x（高性能 Node.js Web 框架）
- **语言**: TypeScript 5.x
- **ORM**: Prisma 5.x（类型安全的数据库访问）
- **数据库**: PostgreSQL 15+
- **数据验证**: Zod（Schema 验证）
- **加密**: 
  - bcryptjs（密码哈希）
  - crypto（AES-256-GCM API 密钥加密）

### 架构分层

```
┌─────────────────────────────────────┐
│         API Routes Layer            │  ← HTTP 端点定义
│  (users, profile, settings, api-keys)│
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│       Service Layer (业务逻辑)       │  ← 核心业务逻辑
│  (userService, apiKeyService)        │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│    Repository Layer (数据访问)       │  ← Prisma ORM 调用
│      (userRepository)                │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Database (PostgreSQL)           │  ← 持久化存储
└──────────────────────────────────────┘
```

## 核心功能

### 1. 用户管理（CRUD）

- **创建用户**: POST `/api/v1/users`
  - 自动密码哈希（bcrypt）
  - 邮箱和用户名唯一性校验
  - 自动创建默认资料和设置

- **查询用户**: GET `/api/v1/users`
  - 支持分页（page, limit）
  - 支持搜索（email, username, firstName, lastName）
  - 支持过滤（role, isActive, isVerified）
  - 支持排序（sortBy, sortOrder）

- **获取单个用户**: GET `/api/v1/users/:id`
  - 可选包含关联数据（profile, settings, apiKeys）

- **更新用户**: PATCH `/api/v1/users/:id`
  - 邮箱和用户名唯一性校验（排除自身）

- **删除用户**: DELETE `/api/v1/users/:id`
  - 级联删除关联数据（Prisma onDelete: Cascade）

### 2. 密码管理

- **更新密码**: POST `/api/v1/users/:id/password`
  - 验证当前密码
  - 哈希新密码
  - 安全策略：最小长度 8 字符

### 3. 用户资料管理

- **获取资料**: GET `/api/v1/users/:userId/profile`
- **更新资料**: PATCH `/api/v1/users/:userId/profile`
  - 个人信息：bio, phoneNumber, country, city
  - 交易信息：riskTolerance, experience
  - 社交媒体：twitter, telegram, discord

### 4. 用户设置管理

- **获取设置**: GET `/api/v1/users/:userId/settings`
- **更新设置**: PATCH `/api/v1/users/:userId/settings`
  - 通知偏好：emailNotifications, tradeNotifications, marketAlerts
  - 交易默认值：defaultExchange, defaultTradingPair, defaultOrderType
  - UI 配置：theme, currency

### 5. API 密钥管理

- **创建密钥**: POST `/api/v1/users/:userId/api-keys`
  - 使用 AES-256-GCM 加密存储
  - 支持多种交易所（Binance, OKX, Bybit 等）
  - 权限控制（permissions 数组）

- **查询密钥**: GET `/api/v1/users/:userId/api-keys`
  - 可按交易所过滤
  - **安全措施**：返回数据不包含解密的密钥

- **更新密钥**: PATCH `/api/v1/users/:userId/api-keys/:keyId`
  - 仅允许更新非敏感字段（name, isActive, permissions）

- **删除密钥**: DELETE `/api/v1/users/:userId/api-keys/:keyId`

## 数据模型

### User（核心用户表）

```prisma
model User {
  id              String         @id @default(uuid())
  email           String         @unique
  username        String         @unique
  password        String         // bcrypt 哈希
  firstName       String?
  lastName        String?
  avatar          String?
  role            UserRole       @default(USER)
  isActive        Boolean        @default(true)
  isVerified      Boolean        @default(false)
  emailVerified   Boolean        @default(false)
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  lastLoginAt     DateTime?
  
  profile         UserProfile?
  settings        UserSettings?
  apiKeys         ApiKey[]
  sessions        UserSession[]
}
```

### UserProfile（用户资料）

```prisma
model UserProfile {
  id              String   @id @default(uuid())
  userId          String   @unique
  bio             String?
  phoneNumber     String?
  country         String?
  city            String?
  riskTolerance   String?  @default("medium")
  experience      String?  @default("beginner")
  twitter         String?
  telegram        String?
  discord         String?
}
```

### UserSettings（用户设置）

```prisma
model UserSettings {
  id                    String   @id @default(uuid())
  userId                String   @unique
  emailNotifications    Boolean  @default(true)
  tradeNotifications    Boolean  @default(true)
  marketAlerts          Boolean  @default(true)
  defaultExchange       String?
  defaultTradingPair    String?
  theme                 String   @default("dark")
  currency              String   @default("USD")
}
```

### ApiKey（交易所 API 密钥）

```prisma
model ApiKey {
  id          String    @id @default(uuid())
  userId      String
  exchange    String    // binance, okx, bybit, etc.
  name        String    // 用户自定义名称
  apiKey      String    // 加密存储
  apiSecret   String    // 加密存储
  passphrase  String?   // 加密存储（某些交易所需要）
  permissions Json?     // ["spot_trade", "futures_trade", "read_only"]
  isActive    Boolean   @default(true)
  lastUsedAt  DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

## 安全特性

### 1. 密码安全

- **哈希算法**: bcrypt
- **Salt 轮数**: 10
- **最小长度**: 8 字符
- **更新验证**: 需要提供当前密码

### 2. API 密钥加密

```typescript
// 加密流程
encrypt(plaintext) → AES-256-GCM → iv:authTag:ciphertext

// 解密流程
decrypt(encryptedData) → 验证 authTag → AES-256-GCM → plaintext
```

- **算法**: AES-256-GCM（提供认证加密）
- **密钥长度**: 256 位（32 字节）
- **随机 IV**: 每次加密使用新的初始化向量
- **认证标签**: 确保数据完整性和真实性

### 3. Rate Limiting

- **默认限制**: 100 请求/分钟
- **作用范围**: 全局（可按 IP/用户细化）
- **配置方式**: 环境变量 `RATE_LIMIT_MAX` 和 `RATE_LIMIT_TIME_WINDOW`

### 4. CORS 配置

- **允许来源**: 通过 `CORS_ORIGIN` 环境变量配置
- **凭证支持**: 启用（credentials: true）

### 5. Helmet 安全头

- 自动设置安全 HTTP 头部
- 防止 XSS、点击劫持等攻击

## API 文档

### Swagger/OpenAPI

- **访问地址**: http://localhost:3002/docs
- **仅开发环境**: 生产环境自动禁用
- **特性**:
  - 交互式 API 测试
  - Schema 验证
  - 请求/响应示例

### 健康检查

- **端点**: GET `/health`
- **响应**:
  ```json
  {
    "status": "ok",
    "timestamp": "2025-12-24T10:00:00.000Z",
    "service": "user-service",
    "version": "1.0.0"
  }
  ```

## 环境配置

### 必需环境变量

```bash
# 数据库
DATABASE_URL="postgresql://user:password@localhost:5432/delta_terminal_users?schema=public"

# JWT（如果集成认证服务）
JWT_SECRET="your-super-secret-jwt-key"

# 加密密钥（32 字符）
ENCRYPTION_KEY="your-32-character-encryption-key!!"
```

### 可选环境变量

```bash
NODE_ENV=development
PORT=3002
HOST=0.0.0.0
LOG_LEVEL=info
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_MAX=100
RATE_LIMIT_TIME_WINDOW=60000
```

## 开发工作流

### 1. 安装依赖

```bash
pnpm install
```

### 2. 数据库设置

```bash
# 生成 Prisma Client
pnpm db:generate

# 创建数据库迁移
pnpm db:migrate

# 填充种子数据
pnpm db:seed
```

### 3. 启动开发服务器

```bash
pnpm dev
```

### 4. 查看 API 文档

打开浏览器访问: http://localhost:3002/docs

### 5. 运行测试

```bash
# 单元测试
pnpm test

# 监听模式
pnpm test:watch

# 测试覆盖率
pnpm test:coverage
```

### 6. 代码质量

```bash
# 类型检查
pnpm type-check

# 代码检查
pnpm lint

# 代码格式化
pnpm format
```

## 部署指南

### Docker 部署

```bash
# 构建镜像
docker build -t delta-terminal-user-service .

# 运行容器
docker run -p 3002:3002 --env-file .env delta-terminal-user-service
```

### Docker Compose（含数据库）

```bash
docker-compose up -d
```

### 生产环境检查清单

- [ ] 使用强随机 `JWT_SECRET`
- [ ] 使用强随机 `ENCRYPTION_KEY`（正好 32 字符）
- [ ] 配置生产数据库连接（启用 SSL）
- [ ] 设置 `NODE_ENV=production`
- [ ] 配置日志收集（推荐 ELK Stack）
- [ ] 设置监控告警（推荐 Prometheus + Grafana）
- [ ] 定期数据库备份
- [ ] 根据负载调整 Rate Limiting 参数

## 常见问题

### Q: 如何修改加密密钥？

A: **警告**：修改加密密钥会导致已存储的 API 密钥无法解密。建议：
1. 迁移前导出所有用户的 API 密钥
2. 更新 `ENCRYPTION_KEY`
3. 使用新密钥重新加密并存储

### Q: Prisma Client 未生成？

A: 运行 `pnpm db:generate`

### Q: 数据库连接失败？

A: 检查 `DATABASE_URL` 格式：
```
postgresql://username:password@host:port/database?schema=public
```

### Q: 如何添加新的交易所支持？

A: API 密钥服务已支持任意交易所，无需修改代码。只需在创建 API 密钥时提供交易所名称即可。

## 与其他服务的集成

### Auth Service（认证服务）

- User Service 提供用户数据
- Auth Service 负责 JWT 签发和验证
- 共享用户 ID 作为关联键

### Trading Engine（交易引擎）

- Trading Engine 从 User Service 获取解密的 API 密钥
- 使用 API 密钥连接交易所执行交易

### Strategy Service（策略服务）

- 读取用户设置（默认交易对、风险偏好）
- 根据用户经验级别推荐策略

## AI 使用建议

### 推荐提问

1. "帮我优化 userService 的查询性能"
2. "为 API 密钥服务添加密钥轮换功能"
3. "实现用户头像上传功能（云存储集成）"
4. "添加用户活动日志（审计跟踪）"
5. "实现双因素认证（2FA）"

### 上下文提供示例

```
我正在为 backend/user-service 添加双因素认证功能。
需要：
1. 在 UserSettings 模型中添加 twoFactorSecret 字段
2. 实现 TOTP 生成和验证（使用 speakeasy 库）
3. 添加启用/禁用 2FA 的 API 端点
4. 确保与现有密码验证流程兼容

请参考现有的 userService 和 settingsRoutes 结构。
```

## 下一步工作

### 优先级 1（核心功能）

- [ ] 实现 JWT 认证中间件
- [ ] 集成邮件服务（邮箱验证、密码重置）
- [ ] 实现用户会话管理（UserSession 表）

### 优先级 2（增强功能）

- [ ] 双因素认证（2FA）
- [ ] 用户活动日志
- [ ] 头像上传（云存储）
- [ ] 导出用户数据（GDPR 合规）

### 优先级 3（优化）

- [ ] 数据库查询优化（索引、N+1 问题）
- [ ] 缓存层（Redis）
- [ ] API 性能监控
- [ ] 完善单元测试覆盖率（目标 >80%）

## 相关资源

- **Fastify 文档**: https://fastify.dev/
- **Prisma 文档**: https://www.prisma.io/docs
- **Zod 文档**: https://zod.dev/
- **bcryptjs 文档**: https://github.com/dcodeIO/bcrypt.js

---

**最后更新**: 2025-12-24  
**维护者**: Delta Terminal 开发团队  
**模块版本**: 1.0.0
