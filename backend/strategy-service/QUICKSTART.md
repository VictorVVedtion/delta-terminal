# Strategy Service - 快速开始指南

## 🚀 5分钟快速启动

### 第一步：安装依赖

```bash
pnpm install
```

### 第二步：配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，至少配置以下内容：
# DATABASE_URL=postgresql://用户名:密码@localhost:5432/delta_strategy
# JWT_SECRET=你的密钥
```

### 第三步：初始化数据库

```bash
# 方式1：使用初始化脚本（推荐）
./scripts/init-db.sh

# 方式2：手动执行
pnpm prisma:generate
pnpm db:push
```

### 第四步：启动开发服务器

```bash
pnpm dev
```

服务将在 `http://localhost:3002` 启动。

## ✅ 验证服务

访问健康检查接口：

```bash
curl http://localhost:3002/health
```

预期响应：
```json
{
  "status": "ok",
  "service": "strategy-service",
  "version": "1.0.0"
}
```

## 📝 测试 API

### 1. 获取 JWT Token

首先需要从认证服务获取 token（假设认证服务运行在 3001 端口）：

```bash
# 登录获取 token
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```

### 2. 创建策略

```bash
curl -X POST http://localhost:3002/api/v1/strategies \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "我的第一个策略",
    "type": "GRID",
    "exchange": "binance",
    "symbol": "BTC/USDT",
    "initialCapital": 10000,
    "config": {
      "gridLevels": 10,
      "gridSpacing": 0.5,
      "upperPrice": 50000,
      "lowerPrice": 40000
    }
  }'
```

### 3. 获取策略列表

```bash
curl http://localhost:3002/api/v1/strategies \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. 启动策略

```bash
curl -X POST http://localhost:3002/api/v1/strategies/{策略ID}/start \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🔧 常见问题

### Q: 数据库连接失败

**A**: 检查以下内容：
1. PostgreSQL 是否正在运行
2. `.env` 文件中的 `DATABASE_URL` 是否正确
3. 数据库用户是否有足够的权限

### Q: JWT 认证失败

**A**: 
1. 确保请求头包含 `Authorization: Bearer <token>`
2. 检查 token 是否过期
3. 确认 JWT_SECRET 与认证服务一致

### Q: Prisma Client 未生成

**A**: 运行 `pnpm prisma:generate` 生成客户端

## 📚 下一步

- 阅读 [README.md](./README.md) 了解完整功能
- 查看 [CLAUDE.md](./CLAUDE.md) 了解架构设计
- 查看 [API 文档](./README.md#api-文档)

## 🛠️ 开发工具

```bash
# 查看数据库（图形界面）
pnpm prisma:studio

# 运行测试
pnpm test

# 代码格式化
pnpm format

# 代码检查
pnpm lint
```

---

遇到问题？查看 [故障排除](./TROUBLESHOOTING.md) 或联系开发团队。
