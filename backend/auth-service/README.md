# Auth Service - 认证服务

Delta Terminal 的用户认证与授权服务模块。

## 功能特性

- ✅ 用户注册/登录
- ✅ JWT Access Token / Refresh Token
- ✅ 密码加密 (bcrypt)
- ✅ Token 黑名单机制
- ✅ 输入验证 (Zod)
- ✅ 速率限制
- ✅ CORS 支持
- ✅ 安全头 (Helmet)
- ⏳ OAuth 集成 (Google, GitHub)
- ⏳ 邮箱验证
- ⏳ 密码重置

## 技术栈

- **框架**: Fastify 5
- **语言**: TypeScript
- **数据库**: PostgreSQL
- **缓存**: Redis (Token 黑名单)
- **认证**: JWT (@fastify/jwt)
- **密码加密**: bcrypt
- **验证**: Zod
- **日志**: Pino

## 项目结构

```
auth-service/
├── src/
│   ├── config/              # 配置管理
│   │   └── index.ts
│   ├── middleware/          # 中间件
│   │   ├── auth.ts          # 认证中间件
│   │   └── validate.ts      # 验证中间件
│   ├── routes/              # 路由
│   │   ├── auth.ts          # 认证路由
│   │   └── oauth.ts         # OAuth 路由
│   ├── schemas/             # 验证模式
│   │   └── auth.schema.ts
│   ├── services/            # 服务层
│   │   ├── auth.service.ts  # 认证服务
│   │   ├── token.service.ts # Token 管理
│   │   └── password.service.ts # 密码服务
│   ├── types/               # 类型定义
│   │   └── index.ts
│   ├── app.ts               # Fastify 应用
│   └── index.ts             # 入口文件
├── migrations/              # 数据库迁移
│   ├── 001_create_users_table.sql
│   └── 002_create_oauth_accounts_table.sql
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## 快速开始

### 1. 环境准备

确保已安装:

- Node.js >= 18
- PostgreSQL >= 15
- Redis >= 7

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 填入数据库和 Redis 配置
```

### 4. 初始化数据库

```bash
# 连接到 PostgreSQL
psql -U postgres

# 创建数据库
CREATE DATABASE delta_terminal;

# 退出 psql
\q

# 运行迁移
psql -U postgres -d delta_terminal -f migrations/001_create_users_table.sql
psql -U postgres -d delta_terminal -f migrations/002_create_oauth_accounts_table.sql
```

### 5. 启动服务

```bash
# 开发模式
pnpm dev

# 生产模式
pnpm build
pnpm start
```

服务将在 `http://localhost:3001` 启动。

## API 文档

### 用户注册

```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "testuser",
  "password": "SecurePass123!"
}
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
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 用户登录

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

### 刷新 Token

```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 登出

```http
POST /auth/logout
Authorization: Bearer <access_token>
```

### 获取当前用户信息

```http
GET /auth/me
Authorization: Bearer <access_token>
```

### 健康检查

```http
GET /auth/health
```

## 安全机制

### 密码要求

- 至少 8 个字符
- 包含大写字母
- 包含小写字母
- 包含数字
- 包含特殊字符 (@$!%*?&)

### Token 机制

- **Access Token**: 短期有效 (默认 15 分钟)
- **Refresh Token**: 长期有效 (默认 7 天)
- Token 黑名单: 登出时将 Token 加入 Redis 黑名单

### 速率限制

- 默认: 100 请求 / 15 分钟
- 可通过环境变量配置

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `NODE_ENV` | 环境 | `development` |
| `PORT` | 端口 | `3001` |
| `HOST` | 主机 | `0.0.0.0` |
| `JWT_SECRET` | JWT 密钥 | 必填 |
| `JWT_ACCESS_TOKEN_EXPIRES_IN` | Access Token 过期时间 | `15m` |
| `JWT_REFRESH_TOKEN_EXPIRES_IN` | Refresh Token 过期时间 | `7d` |
| `DB_HOST` | 数据库主机 | `localhost` |
| `DB_PORT` | 数据库端口 | `5432` |
| `DB_NAME` | 数据库名 | `delta_terminal` |
| `DB_USER` | 数据库用户 | `postgres` |
| `DB_PASSWORD` | 数据库密码 | 必填 |
| `REDIS_HOST` | Redis 主机 | `localhost` |
| `REDIS_PORT` | Redis 端口 | `6379` |
| `BCRYPT_ROUNDS` | bcrypt 轮次 | `12` |
| `RATE_LIMIT_MAX` | 速率限制次数 | `100` |
| `RATE_LIMIT_TIME_WINDOW` | 速率限制时间窗口 | `15m` |
| `CORS_ORIGIN` | CORS 源 | `http://localhost:3000` |

## 测试

```bash
# 运行所有测试
pnpm test

# 监听模式
pnpm test:watch

# 覆盖率报告
pnpm test:coverage
```

## 开发

```bash
# 类型检查
pnpm type-check

# 代码检查
pnpm lint

# 代码格式化
pnpm format
```

## OAuth 集成 (待实现)

OAuth 路由已预留，需要实现具体的集成逻辑:

1. Google OAuth
2. GitHub OAuth

实现步骤:
1. 在对应平台注册应用获取 Client ID/Secret
2. 配置环境变量
3. 实现 OAuth 服务逻辑
4. 处理回调并创建/关联用户

## 许可证

MIT
