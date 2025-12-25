# User Service - 快速启动指南

## 前置要求

- Node.js >= 18.x
- pnpm >= 8.x
- PostgreSQL >= 15

## 方式一：本地开发（推荐用于开发）

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，修改以下配置：

```bash
DATABASE_URL="postgresql://postgres:your-password@localhost:5432/delta_terminal_users?schema=public"
JWT_SECRET="your-random-jwt-secret-at-least-32-characters-long"
ENCRYPTION_KEY="your-exactly-32-character-key!"  # 必须正好 32 字符
```

### 3. 设置数据库

```bash
# 生成 Prisma Client
pnpm db:generate

# 运行数据库迁移（创建表结构）
pnpm db:migrate

# 填充种子数据（可选）
pnpm db:seed
```

### 4. 启动服务

```bash
pnpm dev
```

服务将在 `http://localhost:3002` 启动

### 5. 访问 API 文档

打开浏览器访问: http://localhost:3002/docs

### 6. 测试 API

```bash
# 健康检查
curl http://localhost:3002/health

# 创建用户
curl -X POST http://localhost:3002/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "Test@123456",
    "firstName": "Test",
    "lastName": "User"
  }'
```

## 方式二：使用 Docker Compose（推荐用于测试）

### 1. 启动所有服务（含数据库）

```bash
docker-compose up -d
```

这会自动：
- 启动 PostgreSQL 数据库
- 启动 User Service
- 创建必要的数据库表

### 2. 查看日志

```bash
docker-compose logs -f user-service
```

### 3. 停止服务

```bash
docker-compose down
```

### 4. 完全清理（包括数据）

```bash
docker-compose down -v
```

## 默认账户

运行 `pnpm db:seed` 后，会创建以下测试账户：

### 管理员账户
- **Email**: admin@delta-terminal.com
- **Password**: Admin@123456
- **Role**: ADMIN

### 测试用户
- **Email**: test@delta-terminal.com
- **Password**: Test@123456
- **Role**: USER

## 常用命令

```bash
# 开发模式（热重载）
pnpm dev

# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start

# 运行测试
pnpm test

# 类型检查
pnpm type-check

# 代码检查
pnpm lint

# 代码格式化
pnpm format

# 查看数据库（Prisma Studio）
pnpm db:studio
```

## 故障排查

### 问题：数据库连接失败

**解决方案**：
1. 确保 PostgreSQL 正在运行
2. 检查 `DATABASE_URL` 配置是否正确
3. 测试数据库连接：
   ```bash
   psql "postgresql://postgres:password@localhost:5432/postgres"
   ```

### 问题：Prisma Client 未找到

**解决方案**：
```bash
pnpm db:generate
```

### 问题：端口 3002 已被占用

**解决方案**：
修改 `.env` 中的 `PORT` 配置为其他端口，如 `3003`

### 问题：加密/解密失败

**解决方案**：
确保 `ENCRYPTION_KEY` 正好为 32 字符。可以使用以下命令生成：
```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

## 生产部署

### 使用 Docker

```bash
# 1. 构建镜像
docker build -t delta-terminal-user-service:latest .

# 2. 运行容器
docker run -d \
  --name user-service \
  -p 3002:3002 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="..." \
  -e ENCRYPTION_KEY="..." \
  -e NODE_ENV=production \
  delta-terminal-user-service:latest
```

### 环境变量检查清单

部署到生产环境前，确保：

- [ ] `NODE_ENV=production`
- [ ] 使用强随机的 `JWT_SECRET`（至少 32 字符）
- [ ] 使用强随机的 `ENCRYPTION_KEY`（正好 32 字符）
- [ ] `DATABASE_URL` 使用生产数据库（启用 SSL）
- [ ] 配置合适的 `CORS_ORIGIN`
- [ ] 根据负载调整 `RATE_LIMIT_MAX`

## 下一步

- 查看 [README.md](./README.md) 了解完整功能
- 查看 [CLAUDE.md](./CLAUDE.md) 了解架构设计
- 访问 http://localhost:3002/docs 浏览 API 文档

---

有问题？请查看项目的 GitHub Issues 或联系开发团队。
