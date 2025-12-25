# API Gateway 快速启动指南

## 5 分钟快速上手

### 1. 安装依赖

```bash
cd /Users/victor/delta\ terminal/backend/api-gateway
pnpm install
```

### 2. 配置环境变量

```bash
# 复制示例配置
cp .env.example .env

# 编辑 .env 文件,修改 JWT_SECRET
# 生成 32 位随机密钥:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

将生成的密钥粘贴到 `.env` 文件:

```env
JWT_SECRET=你生成的64位十六进制字符串
```

### 3. 启动服务

```bash
pnpm dev
```

看到以下输出表示启动成功:

```
╔════════════════════════════════════════════════════════╗
║                                                        ║
║  Delta Terminal API Gateway                            ║
║  AI 交易终端 API 网关服务                                ║
║                                                        ║
║  环境: development                                     ║
║  地址: http://0.0.0.0:3000                             ║
║  文档: http://0.0.0.0:3000/docs                        ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
```

### 4. 测试服务

```bash
# 健康检查
curl http://localhost:3000/health

# 访问 API 文档
open http://localhost:3000/docs
```

## 常见问题

### Q: 端口被占用怎么办?

修改 `.env` 中的 `PORT`:

```env
PORT=3001
```

### Q: 微服务未启动如何测试?

API Gateway 可以独立运行,但代理功能需要对应的微服务:

- `/api/auth/*` → Auth Service (http://localhost:3001)
- `/api/users/*` → User Service (http://localhost:3002)

在微服务未启动时,代理请求会返回 502 错误,但不影响网关本身运行。

### Q: 如何查看详细日志?

```bash
LOG_LEVEL=debug pnpm dev
```

## 下一步

- 阅读 [README.md](./README.md) 了解详细功能
- 阅读 [CLAUDE.md](./CLAUDE.md) 了解架构设计
- 开始开发其他微服务 (Auth Service, User Service 等)

## 开发工作流

```bash
# 代码检查
pnpm lint

# 类型检查
pnpm type-check

# 运行测试
pnpm test

# 构建生产版本
pnpm build

# 运行生产版本
pnpm start
```

## 验证功能

### 1. 健康检查

```bash
# 简单检查
curl http://localhost:3000/health

# 详细检查
curl http://localhost:3000/health/detailed

# K8s 探针
curl http://localhost:3000/ready
curl http://localhost:3000/live
```

### 2. 限流测试

```bash
# 快速发送 150 个请求,触发限流
for i in {1..150}; do curl -s http://localhost:3000/health > /dev/null && echo "请求 $i"; done
```

### 3. CORS 测试

```bash
curl -H "Origin: http://localhost:3100" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     http://localhost:3000/api/auth/login -v
```

## 生产部署检查清单

- [ ] 修改 `JWT_SECRET` 为强密钥
- [ ] 设置 `NODE_ENV=production`
- [ ] 配置正确的微服务 URL
- [ ] 配置 CORS 白名单
- [ ] 启用 HTTPS
- [ ] 配置 Redis 限流存储
- [ ] 设置监控与日志收集
- [ ] 配置健康检查探针

---

**快速开始时遇到问题?** 查看 [故障排查](./CLAUDE.md#故障排查) 或提交 Issue
