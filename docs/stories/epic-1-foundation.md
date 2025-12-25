# Epic 1: 基础设施与认证系统

**Epic ID**: DELTA-EPIC-001
**创建时间**: 2025-12-24
**状态**: 规划中
**优先级**: P0 (最高)
**预计周期**: 2-3 Sprint

---

## Epic 概述

建立 Delta Terminal 的核心基础设施，包括用户认证、授权系统和 API 网关。这是整个平台的基石，必须确保安全性、可扩展性和高可用性。

### 业务价值

- 用户可以安全地注册和登录平台
- 建立统一的 API 入口，便于后续功能扩展
- 为后续的交易所集成和 AI 功能提供身份验证基础

### 成功指标

- [ ] 用户注册转化率 > 80%
- [ ] 登录响应时间 < 500ms (P95)
- [ ] API Gateway 吞吐量 > 1000 req/s
- [ ] 零安全漏洞（通过安全审计）

---

## Story 1.1: 用户注册与登录

**Story ID**: DELTA-001
**优先级**: P0
**复杂度**: 5 points (中等)
**依赖**: 无

### 用户故事

**作为** 新用户
**我想要** 通过邮箱和密码注册账号
**以便** 开始使用 Delta Terminal 的交易功能

### 验收标准

#### 注册功能
- [ ] 用户可以通过邮箱、密码、确认密码完成注册
- [ ] 密码强度要求：至少 8 位，包含大小写字母、数字和特殊字符
- [ ] 邮箱格式验证（前端 + 后端双重验证）
- [ ] 邮箱唯一性检查（已注册邮箱显示友好提示）
- [ ] 注册成功后发送验证邮件
- [ ] 邮箱验证链接 24 小时内有效
- [ ] 未验证邮箱的用户可登录但功能受限（显示验证提示）

#### 登录功能
- [ ] 用户可以通过邮箱 + 密码登录
- [ ] 密码错误 5 次后账号锁定 15 分钟
- [ ] 登录成功返回 JWT Token (Access Token + Refresh Token)
- [ ] Access Token 有效期 1 小时
- [ ] Refresh Token 有效期 7 天
- [ ] 记住我选项（Refresh Token 延长至 30 天）

#### 安全要求
- [ ] 密码使用 bcrypt 加密存储（cost factor = 12）
- [ ] 防止暴力破解（Rate Limiting: 5 次/分钟）
- [ ] HTTPS 强制加密传输
- [ ] 敏感操作记录审计日志

#### UI/UX 要求
- [ ] 响应式设计（支持移动端和桌面端）
- [ ] 表单实时验证反馈
- [ ] 加载状态明确（按钮 Loading 状态）
- [ ] 错误提示友好且具体

### 技术任务分解

#### 后端任务 (backend/auth-service)
1. **数据库设计** (1h)
   - 创建 `users` 表（id, email, password_hash, email_verified, created_at, updated_at）
   - 创建 `email_verifications` 表（id, user_id, token, expires_at）
   - 创建 `login_attempts` 表（id, user_id, ip_address, success, attempted_at）

2. **注册 API** (3h)
   ```typescript
   POST /api/v1/auth/register
   Body: { email: string, password: string, confirmPassword: string }
   Response: { userId: string, message: "验证邮件已发送" }
   ```
   - 输入验证（Zod schema）
   - 邮箱重复检查
   - 密码强度验证
   - 密码加密存储
   - 生成验证 Token
   - 发送验证邮件（队列异步处理）

3. **邮箱验证 API** (2h)
   ```typescript
   GET /api/v1/auth/verify-email/:token
   Response: { success: boolean, message: string }
   ```
   - Token 有效性验证
   - 更新用户验证状态
   - 重定向到登录页

4. **登录 API** (4h)
   ```typescript
   POST /api/v1/auth/login
   Body: { email: string, password: string, rememberMe?: boolean }
   Response: {
     accessToken: string,
     refreshToken: string,
     user: { id, email, emailVerified }
   }
   ```
   - 用户凭证验证
   - 登录失败次数记录
   - JWT Token 生成（包含 user_id, email, role）
   - Refresh Token 存储到 Redis

5. **Token 刷新 API** (2h)
   ```typescript
   POST /api/v1/auth/refresh
   Body: { refreshToken: string }
   Response: { accessToken: string }
   ```
   - Refresh Token 验证
   - 生成新的 Access Token

6. **邮件服务集成** (2h)
   - 使用 Resend/SendGrid
   - 邮件模板设计
   - 队列处理（BullMQ）

#### 前端任务 (frontend/web-app)
1. **注册页面** (4h)
   - 表单组件（使用 Shadcn/ui Form）
   - 实时验证（react-hook-form + zod）
   - 密码强度指示器
   - 错误处理与提示

2. **登录页面** (3h)
   - 表单组件
   - 记住我复选框
   - 忘记密码链接（占位）
   - 跳转到注册页

3. **邮箱验证页面** (2h)
   - 验证中状态显示
   - 验证成功/失败反馈
   - 重新发送验证邮件功能

4. **认证状态管理** (3h)
   - 使用 Zustand/Redux 管理认证状态
   - Token 存储（localStorage/sessionStorage）
   - Axios 拦截器自动附加 Token
   - Token 过期自动刷新

#### 测试任务
1. **单元测试** (4h)
   - 密码验证逻辑测试
   - JWT 生成与验证测试
   - 邮箱格式验证测试

2. **集成测试** (3h)
   - 注册流程端到端测试
   - 登录流程测试
   - Token 刷新测试

3. **E2E 测试** (2h)
   - Playwright 测试注册登录流程

### 依赖项

- PostgreSQL 数据库已部署
- Redis 缓存已部署
- 邮件服务 API Key（Resend/SendGrid）
- 前端 UI 组件库已配置（Shadcn/ui）

### 技术风险

- **邮件送达率**：可能被标记为垃圾邮件 → 使用认证域名 + SPF/DKIM 配置
- **并发注册冲突**：邮箱唯一性检查竞态条件 → 数据库唯一索引 + 事务处理
- **Token 泄露风险**：XSS 攻击窃取 Token → httpOnly Cookie 存储 Refresh Token

---

## Story 1.2: JWT 认证中间件与权限系统

**Story ID**: DELTA-002
**优先级**: P0
**复杂度**: 3 points (简单)
**依赖**: DELTA-001

### 用户故事

**作为** 系统架构师
**我想要** 统一的 JWT 认证中间件
**以便** 所有受保护的 API 都能验证用户身份

### 验收标准

#### 认证中间件
- [ ] Express/Fastify 中间件验证 JWT Token
- [ ] 无效 Token 返回 401 Unauthorized
- [ ] 过期 Token 返回 401 且提示刷新
- [ ] 从请求头 `Authorization: Bearer <token>` 提取 Token
- [ ] 解析后的用户信息注入到 `req.user`

#### 权限系统
- [ ] 支持角色定义（admin, user）
- [ ] 权限装饰器/中间件（如 `@RequireRole('admin')`）
- [ ] 未授权访问返回 403 Forbidden

#### 审计日志
- [ ] 记录所有认证失败尝试（IP、时间、原因）
- [ ] 记录敏感操作（角色变更、权限修改）

### 技术任务分解

#### 后端任务 (backend/auth-service)
1. **JWT 中间件** (2h)
   ```typescript
   // src/middleware/auth.middleware.ts
   export const authenticateJWT = async (req, res, next) => {
     // 提取并验证 Token
     // 查询用户信息（缓存优化）
     // 注入 req.user
   }
   ```

2. **权限中间件** (2h)
   ```typescript
   export const requireRole = (...roles: string[]) => {
     return (req, res, next) => {
       if (!roles.includes(req.user.role)) {
         return res.status(403).json({ error: 'Forbidden' });
       }
       next();
     };
   };
   ```

3. **审计日志服务** (2h)
   - 创建 `audit_logs` 表
   - 日志记录函数
   - 定时归档策略

#### 测试任务
1. **单元测试** (2h)
   - 中间件逻辑测试
   - 权限检查测试

2. **集成测试** (2h)
   - 受保护路由访问测试
   - 不同角色权限测试

### 依赖项

- DELTA-001 完成（JWT 生成逻辑）

---

## Story 1.3: API Gateway 基础架构

**Story ID**: DELTA-003
**优先级**: P0
**复杂度**: 8 points (复杂)
**依赖**: DELTA-002

### 用户故事

**作为** 后端开发者
**我想要** 统一的 API 网关
**以便** 集中处理路由、认证、限流和监控

### 验收标准

#### 核心功能
- [ ] 反向代理到各个微服务（auth-service, user-service 等）
- [ ] 统一路由前缀 `/api/v1`
- [ ] 集成认证中间件（公开路由 vs 受保护路由）
- [ ] 全局错误处理（统一错误格式）
- [ ] CORS 配置（开发环境允许 localhost，生产环境限制域名）

#### 限流保护
- [ ] IP 级别限流：100 req/min（滑动窗口算法）
- [ ] 用户级别限流：1000 req/hour
- [ ] 敏感端点特殊限制（如登录 5 req/min）
- [ ] 超限返回 429 Too Many Requests + Retry-After header

#### 监控与日志
- [ ] 请求日志记录（请求方法、路径、耗时、状态码）
- [ ] Prometheus metrics 导出（请求数、错误率、延迟分布）
- [ ] 健康检查端点 `GET /health`
- [ ] 服务状态端点 `GET /api/v1/status`（返回各服务健康状态）

#### 性能要求
- [ ] P95 延迟 < 100ms（网关层面）
- [ ] 支持 1000+ 并发连接
- [ ] 优雅关闭（等待现有请求完成）

### 技术任务分解

#### 后端任务 (backend/api-gateway)
1. **项目初始化** (1h)
   - 选择框架（Fastify 推荐，性能优于 Express）
   - 配置 TypeScript
   - 目录结构设计

2. **反向代理配置** (3h)
   ```typescript
   // src/routes/index.ts
   app.register(proxy, {
     upstream: 'http://auth-service:3001',
     prefix: '/api/v1/auth',
   });

   app.register(proxy, {
     upstream: 'http://user-service:3002',
     prefix: '/api/v1/users',
   });
   ```

3. **限流中间件** (4h)
   - 使用 Redis 存储请求计数
   - 实现滑动窗口算法
   - 可配置化限流规则

4. **全局错误处理** (2h)
   ```typescript
   app.setErrorHandler((error, req, reply) => {
     const statusCode = error.statusCode || 500;
     reply.status(statusCode).send({
       error: {
         message: error.message,
         code: error.code,
         timestamp: new Date().toISOString(),
       },
     });
   });
   ```

5. **监控集成** (3h)
   - 集成 `prom-client`
   - 自定义 metrics（http_requests_total, http_request_duration_seconds）
   - Grafana Dashboard 配置

6. **健康检查** (1h)
   ```typescript
   GET /health
   Response: { status: 'ok', uptime: 12345, timestamp: '...' }

   GET /api/v1/status
   Response: {
     gateway: 'ok',
     services: {
       auth: 'ok',
       user: 'degraded',
       trading: 'down'
     }
   }
   ```

7. **Docker 配置** (2h)
   - Dockerfile（多阶段构建）
   - docker-compose.yml（包含 Gateway + Redis + PostgreSQL）

#### 基础设施任务
1. **Redis 部署** (1h)
   - Docker 容器配置
   - 持久化配置

2. **Nginx 配置**（可选，用于生产环境）(2h)
   - SSL 终止
   - 负载均衡

#### 测试任务
1. **性能测试** (3h)
   - 使用 k6/Artillery 压力测试
   - 验证限流机制
   - 延迟与吞吐量基准测试

2. **集成测试** (3h)
   - 路由转发测试
   - 错误处理测试
   - 健康检查测试

### 依赖项

- Docker 环境已配置
- Redis 可用
- 微服务框架约定（统一健康检查端点等）

### 技术风险

- **单点故障**：API Gateway 宕机导致全站不可用 → 多实例部署 + 负载均衡
- **性能瓶颈**：高流量下 Gateway 成为瓶颈 → 水平扩展 + Nginx 前置
- **服务发现**：微服务地址硬编码 → 后续引入服务发现（Consul/Kubernetes Service）

---

## Epic 级别的 DoD (Definition of Done)

- [ ] 所有 Story 验收标准通过
- [ ] 单元测试覆盖率 > 80%
- [ ] 集成测试全部通过
- [ ] 代码审查完成（至少 1 人批准）
- [ ] API 文档更新（Swagger/OpenAPI）
- [ ] 安全审计通过（OWASP Top 10 检查）
- [ ] 性能基准测试达标
- [ ] 部署到 Staging 环境验证
- [ ] 监控告警配置完成

---

## 技术栈确认

### 后端
- **框架**: Fastify (API Gateway), Express (Auth Service)
- **语言**: TypeScript
- **数据库**: PostgreSQL 15
- **缓存**: Redis 7
- **队列**: BullMQ
- **邮件**: Resend/SendGrid

### 前端
- **框架**: Next.js 15 (App Router)
- **UI 库**: Shadcn/ui + TailwindCSS
- **表单**: react-hook-form + zod
- **状态管理**: Zustand

### DevOps
- **容器化**: Docker
- **监控**: Prometheus + Grafana
- **日志**: Winston + Loki（可选）

---

## 参考资料

- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Fastify Documentation](https://www.fastify.io/)
- [Rate Limiting Strategies](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)

---

**最后更新**: 2025-12-24
**负责人**: 后端团队 Lead + 前端团队 Lead
**审核人**: Tech Lead + Product Owner
