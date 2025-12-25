# Auth Service - 认证服务模块

## 模块概述

认证服务是 Delta Terminal 的核心安全模块,负责用户身份验证、授权管理和 Token 生命周期管理。

**路径**: `backend/auth-service`
**状态**: ✅ 已完成核心功能
**负责人**: Backend Team

---

## 技术架构

### 技术栈

- **框架**: Fastify 5 (高性能 Node.js 框架)
- **语言**: TypeScript 5.7
- **数据库**: PostgreSQL 15
- **缓存**: Redis 7 (Token 黑名单)
- **认证**: JWT (@fastify/jwt)
- **密码加密**: bcrypt
- **验证**: Zod
- **日志**: Pino

### 核心依赖

```json
{
  "@fastify/cors": "^9.0.1",
  "@fastify/helmet": "^12.0.1",
  "@fastify/jwt": "^8.0.2",
  "@fastify/rate-limit": "^10.1.1",
  "bcrypt": "^5.1.1",
  "fastify": "^5.2.0",
  "ioredis": "^5.4.2",
  "pg": "^8.13.1",
  "zod": "^3.24.1"
}
```

---

## 功能模块

### 1. 用户认证 (`src/routes/auth.ts`)

**已实现**:
- ✅ `POST /auth/register` - 用户注册
- ✅ `POST /auth/login` - 用户登录
- ✅ `POST /auth/refresh` - 刷新 Token
- ✅ `POST /auth/logout` - 用户登出
- ✅ `GET /auth/me` - 获取当前用户信息
- ✅ `GET /auth/health` - 健康检查

**待实现**:
- ⏳ 邮箱验证
- ⏳ 密码重置
- ⏳ 多因素认证 (MFA)

### 2. OAuth 集成 (`src/routes/oauth.ts`)

**已预留接口**:
- ⏳ `GET /auth/oauth/google` - Google OAuth 入口
- ⏳ `GET /auth/oauth/google/callback` - Google 回调
- ⏳ `GET /auth/oauth/github` - GitHub OAuth 入口
- ⏳ `GET /auth/oauth/github/callback` - GitHub 回调

### 3. Token 管理 (`src/services/token.service.ts`)

**功能**:
- Access Token 生成 (15分钟有效期)
- Refresh Token 生成 (7天有效期)
- Token 验证与解码
- Token 黑名单机制 (Redis)
- Token 撤销

### 4. 密码服务 (`src/services/password.service.ts`)

**功能**:
- bcrypt 密码哈希 (12轮)
- 密码验证
- 密码强度检测

### 5. 验证 (`src/schemas/auth.schema.ts`)

使用 Zod 进行输入验证:
- 邮箱格式验证
- 用户名规则 (3-30字符, 字母数字下划线)
- 密码强度要求 (至少8字符, 包含大小写、数字、特殊字符)

---

## 数据库模型

### `users` 表

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(30) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_email_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE
);
```

### `oauth_accounts` 表

```sql
CREATE TABLE oauth_accounts (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    provider VARCHAR(50) NOT NULL,
    provider_id VARCHAR(255) NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);
```

---

## API 使用示例

### 注册用户

```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "testuser",
    "password": "SecurePass123!"
  }'
```

**响应**:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "testuser",
    "isEmailVerified": false
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### 登录

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

### 使用 Access Token 访问受保护端点

```bash
curl http://localhost:3001/auth/me \
  -H "Authorization: Bearer <access_token>"
```

### 刷新 Token

```bash
curl -X POST http://localhost:3001/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<refresh_token>"
  }'
```

---

## 安全机制

### 1. 密码安全

- bcrypt 哈希 (12轮, 可配置)
- 密码强度验证
- 防止常见密码模式

### 2. Token 安全

- JWT HS256 签名
- Access Token 短期有效 (15分钟)
- Refresh Token 长期有效 (7天)
- Token 黑名单 (登出时撤销)
- Token 防重放攻击

### 3. API 安全

- Helmet 安全头
- CORS 配置
- 速率限制 (100次/15分钟)
- 输入验证 (Zod)

### 4. 数据库安全

- 密码哈希存储
- 唯一约束 (email, username)
- 级联删除 (OAuth 账户)

---

## 环境配置

### 必需环境变量

```env
JWT_SECRET=your-secret-key
DB_HOST=localhost
DB_PORT=5432
DB_NAME=delta_terminal
DB_USER=postgres
DB_PASSWORD=your-password
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 可选环境变量

```env
NODE_ENV=development
PORT=3001
JWT_ACCESS_TOKEN_EXPIRES_IN=15m
JWT_REFRESH_TOKEN_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
RATE_LIMIT_MAX=100
CORS_ORIGIN=http://localhost:3000
```

---

## 开发指南

### 启动服务

```bash
# 开发模式 (热重载)
pnpm dev

# 生产构建
pnpm build
pnpm start

# Docker 方式
docker-compose up -d
```

### 运行测试

```bash
pnpm test              # 运行所有测试
pnpm test:watch        # 监听模式
pnpm test:coverage     # 覆盖率报告
```

### 代码质量

```bash
pnpm type-check        # TypeScript 类型检查
pnpm lint              # ESLint 检查
pnpm format            # Prettier 格式化
```

---

## 错误处理

### 错误码

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| `EMAIL_ALREADY_EXISTS` | 400 | 邮箱已注册 |
| `USERNAME_ALREADY_EXISTS` | 400 | 用户名已存在 |
| `INVALID_CREDENTIALS` | 401 | 邮箱或密码错误 |
| `ACCOUNT_DISABLED` | 403 | 账户已禁用 |
| `INVALID_TOKEN` | 401 | 无效的令牌 |
| `TOKEN_REVOKED` | 401 | 令牌已撤销 |
| `RATE_LIMIT_EXCEEDED` | 429 | 请求过于频繁 |

### 错误响应格式

```json
{
  "error": "ERROR_CODE",
  "message": "错误描述",
  "details": []  // 可选, 用于验证错误
}
```

---

## 性能优化

### 已实现优化

1. **连接池**
   - PostgreSQL 连接池 (最大20个连接)
   - Redis 连接复用

2. **缓存策略**
   - Redis 存储 Token 黑名单
   - Token 验证缓存

3. **异步操作**
   - 并行生成 Access/Refresh Token
   - 非阻塞数据库查询

### 性能指标

- 注册/登录: ~200ms (包含密码哈希)
- Token 刷新: ~50ms
- Token 验证: ~10ms

---

## 监控与日志

### 日志级别

- `debug`: 开发调试信息
- `info`: 一般信息 (启动, 关闭)
- `warn`: 警告信息
- `error`: 错误信息

### 健康检查

```bash
curl http://localhost:3001/auth/health
```

响应:
```json
{
  "status": "ok",
  "timestamp": "2024-12-24T09:00:00.000Z"
}
```

---

## 部署

### Docker 部署

```bash
# 构建镜像
docker build -t delta-auth-service .

# 运行容器
docker run -d \
  -p 3001:3001 \
  --env-file .env \
  delta-auth-service
```

### Docker Compose

```bash
docker-compose up -d
```

### Kubernetes (待实现)

计划支持 Kubernetes 部署配置。

---

## 待办事项

### 高优先级

- [ ] 实现邮箱验证流程
- [ ] 实现密码重置功能
- [ ] Google OAuth 集成
- [ ] GitHub OAuth 集成

### 中优先级

- [ ] 多因素认证 (MFA)
- [ ] 登录日志记录
- [ ] 异常登录检测
- [ ] IP 白名单/黑名单

### 低优先级

- [ ] 社交账号绑定
- [ ] 账户管理 API
- [ ] 用户资料管理
- [ ] Session 管理

---

## AI 协作建议

### 提问模板

**1. 添加新功能**
```
"帮我在 auth-service 中实现邮箱验证功能,
需要发送验证邮件并提供验证端点"
```

**2. 调试问题**
```
"auth-service 的 Token 刷新接口返回 401 错误,
错误信息是 'TOKEN_REVOKED', 如何排查?"
```

**3. 优化性能**
```
"auth-service 的登录接口响应时间较长,
如何优化密码哈希的性能?"
```

**4. 安全审计**
```
"审查 auth-service 的安全机制,
特别是 Token 管理部分, 是否有潜在风险?"
```

### 提供上下文信息

与 AI 协作时请提供:
- 相关文件路径 (如 `src/services/auth.service.ts`)
- 错误日志或堆栈追踪
- 预期行为 vs 实际行为
- 已尝试的解决方案

---

## 相关模块

- **API Gateway** (`backend/api-gateway`) - 路由与统一入口
- **User Service** (`backend/user-service`) - 用户管理
- **Frontend** (`frontend/web-app`) - Web 应用

---

**最后更新**: 2024-12-24
**文档版本**: 1.0.0
