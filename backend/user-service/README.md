# Delta Terminal - User Service

用户管理服务，负责用户认证、资料管理、设置管理和交易所 API 密钥管理。

## 功能特性

- **用户管理**: CRUD 操作、分页查询、角色管理
- **用户资料**: 个人信息、交易经验、社交媒体
- **用户设置**: 通知偏好、交易默认值、UI 配置
- **API 密钥管理**: 交易所密钥加密存储、权限管理
- **安全特性**: 密码哈希、API 密钥加密、Rate Limiting

## 技术栈

- **框架**: Fastify 4.x
- **语言**: TypeScript 5.x
- **ORM**: Prisma 5.x
- **数据库**: PostgreSQL 15+
- **验证**: Zod
- **加密**: bcryptjs, crypto (AES-256-GCM)
- **文档**: Swagger/OpenAPI

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，填入必要配置
```

### 3. 数据库迁移

```bash
# 生成 Prisma Client
pnpm db:generate

# 运行数据库迁移
pnpm db:migrate

# （可选）填充种子数据
pnpm db:seed
```

### 4. 启动服务

```bash
# 开发模式
pnpm dev

# 生产模式
pnpm build
pnpm start
```

### 5. 访问 API 文档

打开浏览器访问: http://localhost:3002/docs

## API 端点

### 用户管理

- `POST /api/v1/users` - 创建用户
- `GET /api/v1/users` - 获取用户列表（分页）
- `GET /api/v1/users/:id` - 获取用户详情
- `PATCH /api/v1/users/:id` - 更新用户信息
- `DELETE /api/v1/users/:id` - 删除用户
- `POST /api/v1/users/:id/password` - 更新密码

### 用户资料

- `GET /api/v1/users/:userId/profile` - 获取用户资料
- `PATCH /api/v1/users/:userId/profile` - 更新用户资料

### 用户设置

- `GET /api/v1/users/:userId/settings` - 获取用户设置
- `PATCH /api/v1/users/:userId/settings` - 更新用户设置

### API 密钥管理

- `POST /api/v1/users/:userId/api-keys` - 创建 API 密钥
- `GET /api/v1/users/:userId/api-keys` - 获取 API 密钥列表
- `GET /api/v1/users/:userId/api-keys/:keyId` - 获取 API 密钥详情
- `PATCH /api/v1/users/:userId/api-keys/:keyId` - 更新 API 密钥
- `DELETE /api/v1/users/:userId/api-keys/:keyId` - 删除 API 密钥

## 数据模型

### User（用户）

```typescript
{
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role: 'USER' | 'PREMIUM' | 'ADMIN' | 'SUPER_ADMIN';
  isActive: boolean;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### UserProfile（用户资料）

```typescript
{
  id: string;
  userId: string;
  bio?: string;
  phoneNumber?: string;
  country?: string;
  city?: string;
  riskTolerance?: 'low' | 'medium' | 'high';
  experience?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  twitter?: string;
  telegram?: string;
  discord?: string;
}
```

### UserSettings（用户设置）

```typescript
{
  id: string;
  userId: string;
  emailNotifications: boolean;
  tradeNotifications: boolean;
  marketAlerts: boolean;
  defaultExchange?: string;
  defaultTradingPair?: string;
  theme: 'light' | 'dark';
  currency: string;
}
```

### ApiKey（API 密钥）

```typescript
{
  id: string;
  userId: string;
  exchange: string;
  name: string;
  apiKey: string; // 加密存储
  apiSecret: string; // 加密存储
  passphrase?: string; // 加密存储
  permissions?: string[];
  isActive: boolean;
  lastUsedAt?: Date;
}
```

## 安全特性

### 密码安全

- 使用 bcrypt 进行密码哈希（10 轮 salt）
- 密码最小长度 8 字符
- 密码更新需要验证当前密码

### API 密钥加密

- 使用 AES-256-GCM 加密算法
- 密钥、密码、Passphrase 全部加密存储
- 读取时动态解密，从不明文存储
- 每个密钥使用随机 IV（初始化向量）

### Rate Limiting

- 默认限制: 100 请求/分钟
- 可通过环境变量配置

## 开发指南

### 目录结构

```
src/
├── config/          # 配置文件
├── routes/          # API 路由
├── services/        # 业务逻辑层
├── repositories/    # 数据访问层
├── types/           # TypeScript 类型定义
├── utils/           # 工具函数
├── middleware/      # 中间件
├── app.ts           # Fastify 应用
└── index.ts         # 服务入口
```

### 运行测试

```bash
# 单元测试
pnpm test

# 监听模式
pnpm test:watch

# 测试覆盖率
pnpm test:coverage
```

### 代码格式化

```bash
# 检查代码风格
pnpm lint

# 格式化代码
pnpm format

# 类型检查
pnpm type-check
```

## 环境变量

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| `NODE_ENV` | 运行环境 | `development` |
| `PORT` | 服务端口 | `3002` |
| `HOST` | 监听地址 | `0.0.0.0` |
| `DATABASE_URL` | PostgreSQL 连接字符串 | - |
| `JWT_SECRET` | JWT 签名密钥 | - |
| `ENCRYPTION_KEY` | API 密钥加密密钥（32字符） | - |
| `LOG_LEVEL` | 日志级别 | `info` |
| `CORS_ORIGIN` | CORS 允许的源 | `http://localhost:3000` |

## 部署

### Docker 部署

```bash
# 构建镜像
docker build -t delta-terminal-user-service .

# 运行容器
docker run -p 3002:3002 --env-file .env delta-terminal-user-service
```

### 生产环境建议

1. **环境变量**: 使用强随机密钥，不要使用示例值
2. **数据库**: 启用 SSL 连接，定期备份
3. **监控**: 集成 Prometheus 和 Grafana
4. **日志**: 使用集中式日志收集（如 ELK）
5. **限流**: 根据实际负载调整 Rate Limiting 参数

## 故障排查

### 数据库连接失败

检查 `DATABASE_URL` 格式:
```
postgresql://username:password@host:port/database?schema=public
```

### 加密/解密失败

确保 `ENCRYPTION_KEY` 长度正好为 32 字符。

### Prisma Client 未生成

运行:
```bash
pnpm db:generate
```

## 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 许可证

MIT License

---

**维护者**: Delta Terminal 开发团队  
**最后更新**: 2025-12-24
