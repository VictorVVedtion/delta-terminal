# 快速开始指南

## 前置要求

确保已安装以下软件:

- **Node.js** >= 18
- **pnpm** >= 8
- **PostgreSQL** >= 15
- **Redis** >= 7

## 快速启动步骤

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件
nano .env
```

**最小配置**:
```env
JWT_SECRET=your-super-secret-jwt-key-change-this
DB_PASSWORD=your-database-password
```

### 3. 启动 PostgreSQL 和 Redis

#### 使用 Docker (推荐)

```bash
# 仅启动数据库服务
docker-compose up -d postgres redis
```

#### 或使用本地安装

```bash
# macOS (使用 Homebrew)
brew services start postgresql@15
brew services start redis

# Ubuntu/Debian
sudo systemctl start postgresql
sudo systemctl start redis
```

### 4. 初始化数据库

```bash
# 运行初始化脚本
./scripts/init-db.sh
```

或手动执行:

```bash
# 创建数据库
createdb delta_terminal

# 运行迁移
psql -d delta_terminal -f migrations/001_create_users_table.sql
psql -d delta_terminal -f migrations/002_create_oauth_accounts_table.sql
```

### 5. 启动服务

```bash
# 开发模式 (支持热重载)
pnpm dev
```

服务将在 `http://localhost:3001` 启动。

### 6. 测试 API

#### 健康检查

```bash
curl http://localhost:3001/auth/health
```

#### 注册用户

```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "SecurePass123!"
  }'
```

#### 登录

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

保存返回的 `accessToken`，用于后续请求。

#### 获取用户信息

```bash
curl http://localhost:3001/auth/me \
  -H "Authorization: Bearer <your-access-token>"
```

## Docker 方式启动

如果你想一键启动所有服务:

```bash
# 构建并启动所有服务 (auth-service, postgres, redis)
docker-compose up -d

# 查看日志
docker-compose logs -f auth-service

# 停止服务
docker-compose down
```

## 常见问题

### Q: 数据库连接失败

**A**: 检查 PostgreSQL 是否运行:
```bash
pg_isready -h localhost -p 5432
```

### Q: Redis 连接错误

**A**: 检查 Redis 是否运行:
```bash
redis-cli ping
# 应该返回: PONG
```

### Q: JWT_SECRET 未配置

**A**: 确保在 `.env` 文件中设置了 `JWT_SECRET`:
```env
JWT_SECRET=a-random-secure-string-at-least-32-characters-long
```

### Q: 端口 3001 已被占用

**A**: 修改 `.env` 中的端口:
```env
PORT=3002
```

## 开发工具

### 查看日志

```bash
# 开发模式自动显示美化日志
pnpm dev
```

### 运行测试

```bash
# 运行所有测试
pnpm test

# 监听模式
pnpm test:watch

# 生成覆盖率报告
pnpm test:coverage
```

### 代码检查

```bash
# TypeScript 类型检查
pnpm type-check

# ESLint 检查
pnpm lint

# Prettier 格式化
pnpm format
```

## 生产部署

### 构建

```bash
pnpm build
```

### 启动生产服务

```bash
NODE_ENV=production pnpm start
```

## 下一步

- 阅读完整的 [README.md](./README.md)
- 查看 [CLAUDE.md](./CLAUDE.md) 了解模块详情
- 探索 API 文档
- 集成前端应用

## 需要帮助?

- 查看 [API 文档](./README.md#api-文档)
- 查看 [故障排查](./README.md#常见问题)
- 提交 Issue
