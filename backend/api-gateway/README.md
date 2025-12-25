# Delta Terminal API Gateway

Delta Terminal API 网关服务 - 统一请求路由、认证与限流

## 功能特性

- ✅ **统一路由**: 所有微服务的统一入口
- ✅ **JWT 认证**: 基于 JWT 的用户认证
- ✅ **请求限流**: 防止 API 滥用
- ✅ **CORS 处理**: 跨域请求支持
- ✅ **请求日志**: 完整的请求日志记录
- ✅ **健康检查**: 微服务健康状态监控
- ✅ **API 文档**: Swagger/OpenAPI 文档
- ✅ **优雅关闭**: 安全的服务关闭处理
- ✅ **错误处理**: 统一的错误响应格式

## 技术栈

- **框架**: Fastify 4.x
- **语言**: TypeScript 5.x
- **认证**: @fastify/jwt
- **文档**: @fastify/swagger
- **代理**: http-proxy
- **验证**: Zod
- **日志**: Pino

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 环境配置

复制环境变量示例文件并配置:

```bash
cp .env.example .env
```

必需配置项:

```env
# JWT 密钥 (生产环境必须修改)
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long

# 微服务地址
AUTH_SERVICE_URL=http://localhost:3001
USER_SERVICE_URL=http://localhost:3002
STRATEGY_SERVICE_URL=http://localhost:3003
TRADING_ENGINE_URL=http://localhost:3004
DATA_PIPELINE_URL=http://localhost:3005
```

### 运行服务

```bash
# 开发模式 (热重载)
pnpm dev

# 生产构建
pnpm build

# 生产运行
pnpm start
```

### 访问服务

- **API 网关**: http://localhost:3000
- **API 文档**: http://localhost:3000/docs
- **健康检查**: http://localhost:3000/health

## API 路由

### 公开路由 (无需认证)

| 路径 | 方法 | 描述 |
|------|------|------|
| `/` | GET | 欢迎页面 |
| `/health` | GET | 简单健康检查 |
| `/health/detailed` | GET | 详细健康检查 |
| `/ready` | GET | 就绪检查 (K8s) |
| `/live` | GET | 存活检查 (K8s) |
| `/docs` | GET | API 文档 |
| `/api/auth/*` | ALL | 认证服务代理 |

### 受保护路由 (需要 JWT)

| 路径 | 方法 | 描述 | 代理目标 |
|------|------|------|----------|
| `/api/users/*` | ALL | 用户管理 | User Service |
| `/api/strategies/*` | ALL | 策略管理 | Strategy Service |
| `/api/trading/*` | ALL | 交易执行 | Trading Engine |
| `/api/data/*` | ALL | 数据分析 | Data Pipeline |

## 认证

### 获取 Token

```bash
# 登录获取 JWT token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'
```

响应:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "24h"
}
```

### 使用 Token

在请求头中添加 `Authorization`:

```bash
curl http://localhost:3000/api/users/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 限流配置

默认限流规则:

- **全局限流**: 100 次/分钟 (每 IP)
- **可配置**: 通过环境变量调整

```env
RATE_LIMIT_MAX=100
RATE_LIMIT_TIME_WINDOW=60000
```

## 健康检查

### 简单检查

```bash
curl http://localhost:3000/health
```

响应:

```json
{
  "status": "healthy",
  "timestamp": "2025-12-24T00:00:00.000Z"
}
```

### 详细检查

```bash
curl http://localhost:3000/health/detailed
```

响应:

```json
{
  "status": "healthy",
  "timestamp": "2025-12-24T00:00:00.000Z",
  "uptime": 123.456,
  "services": {
    "auth": { "status": "up", "responseTime": 12 },
    "user": { "status": "up", "responseTime": 15 },
    "strategy": { "status": "up", "responseTime": 18 },
    "trading": { "status": "up", "responseTime": 20 },
    "data": { "status": "up", "responseTime": 25 }
  }
}
```

## 开发指南

### 项目结构

```
backend/api-gateway/
├── src/
│   ├── config/           # 配置管理
│   │   └── index.ts
│   ├── middleware/       # 中间件
│   │   ├── auth.ts       # JWT 认证
│   │   ├── cors.ts       # CORS 处理
│   │   ├── logger.ts     # 日志记录
│   │   └── rateLimit.ts  # 限流
│   ├── plugins/          # Fastify 插件
│   │   └── swagger.ts    # API 文档
│   ├── routes/           # 路由
│   │   ├── health.ts     # 健康检查
│   │   ├── proxy.ts      # 代理路由
│   │   └── index.ts      # 路由注册
│   ├── types/            # 类型定义
│   │   └── index.ts
│   ├── app.ts            # 应用配置
│   └── index.ts          # 入口文件
├── .env.example          # 环境变量示例
├── .eslintrc.json        # ESLint 配置
├── .prettierrc.json      # Prettier 配置
├── package.json
├── tsconfig.json
└── README.md
```

### 添加新的代理路由

编辑 `src/routes/proxy.ts`:

```typescript
app.all(
  '/api/new-service/*',
  {
    preHandler: authenticateJWT,
    schema: {
      tags: ['NewService'],
      security: [{ bearerAuth: [] }],
    },
  },
  async (request, reply) => {
    await proxyRequest(
      request,
      reply,
      'http://new-service:3000',
      '/api/new-service'
    );
  }
);
```

### 自定义限流规则

```typescript
import { createCustomRateLimit } from '../middleware/rateLimit.js';

app.post('/api/heavy-operation', {
  ...createCustomRateLimit(10, 60000), // 10次/分钟
}, async (request, reply) => {
  // 处理逻辑
});
```

## 测试

```bash
# 运行测试
pnpm test

# 测试覆盖率
pnpm test:coverage

# 类型检查
pnpm type-check

# 代码检查
pnpm lint
```

## 部署

### Docker 部署

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY dist ./dist

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

### Kubernetes 部署

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
      - name: api-gateway
        image: delta-terminal/api-gateway:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        livenessProbe:
          httpGet:
            path: /live
            port: 3000
          initialDelaySeconds: 30
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 10
```

## 监控

### Prometheus Metrics

添加 Prometheus 监控:

```bash
pnpm add @fastify/metrics
```

### 日志聚合

- **开发**: 使用 Pino Pretty
- **生产**: 输出 JSON 日志,配合 ELK/Grafana Loki

## 故障排除

### 常见问题

1. **端口被占用**
   ```bash
   # 修改 .env 中的 PORT
   PORT=3001
   ```

2. **JWT 验证失败**
   - 确保 JWT_SECRET 一致
   - 检查 token 是否过期

3. **代理超时**
   - 检查微服务是否运行
   - 调整超时配置

### 调试模式

```bash
# 启用详细日志
LOG_LEVEL=debug pnpm dev
```

## 安全建议

- ✅ 生产环境使用强 JWT 密钥
- ✅ 启用 HTTPS
- ✅ 配置适当的 CORS 策略
- ✅ 使用 Redis 存储限流数据
- ✅ 定期更新依赖
- ✅ 启用 Helmet 安全头

## 许可证

MIT License

## 相关链接

- [Fastify 文档](https://fastify.dev/)
- [Delta Terminal 主项目](../../README.md)
