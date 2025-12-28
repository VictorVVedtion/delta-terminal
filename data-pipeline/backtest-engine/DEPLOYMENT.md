# Backtest Engine 部署指南

## Railway 部署

### 前置要求

1. 注册 [Railway](https://railway.app) 账户
2. 安装 Railway CLI（可选）: `npm install -g @railway/cli`

### 部署步骤

#### 方法一：通过 Railway Dashboard

1. 登录 Railway Dashboard
2. 点击 "New Project" → "Deploy from GitHub repo"
3. 选择你的仓库，设置 Root Directory 为 `data-pipeline/backtest-engine`
4. Railway 会自动检测 Dockerfile 并构建

#### 方法二：通过 Railway CLI

```bash
cd data-pipeline/backtest-engine

# 登录
railway login

# 创建项目
railway init

# 部署
railway up
```

### 环境变量配置

在 Railway Dashboard → Variables 中设置以下环境变量：

```bash
# 必需配置
PORT=8003                    # Railway 会自动注入，通常不需要设置
DEBUG=false

# 可选配置（使用默认值即可）
LOG_LEVEL=INFO
DEFAULT_INITIAL_CAPITAL=100000.0
DEFAULT_COMMISSION=0.001
DEFAULT_SLIPPAGE=0.0005

# 如需使用 Redis（可选）
# REDIS_HOST=your-redis-host
# REDIS_PORT=6379
# REDIS_PASSWORD=your-password

# 如需使用 PostgreSQL（可选）
# DATABASE_URL=postgresql://user:pass@host:5432/db
```

### 健康检查

服务部署后，访问以下端点验证：

- 根路径: `https://your-app.railway.app/`
- 健康检查: `https://your-app.railway.app/health`
- API 文档: `https://your-app.railway.app/api/v1/docs`

### 域名配置

1. 在 Railway Dashboard → Settings → Domains
2. 添加自定义域名或使用 Railway 提供的 `*.railway.app` 域名

### 前端连接配置

在 Vercel 前端项目中设置环境变量：

```bash
NEXT_PUBLIC_BACKTEST_API_URL=https://your-backtest-engine.railway.app
```

---

## Docker 本地部署

### 构建镜像

```bash
docker build -t delta-backtest-engine .
```

### 运行容器

```bash
docker run -d \
  -p 8003:8003 \
  -v $(pwd)/reports:/app/reports \
  -e DEBUG=false \
  -e LOG_LEVEL=INFO \
  --name backtest-engine \
  delta-backtest-engine
```

### Docker Compose

```bash
docker-compose up -d
```

---

## 生产环境建议

### 性能优化

1. **启用 Numba JIT**: 确保 `ENABLE_NUMBA=true`
2. **调整并发数**: 根据 Railway 实例大小设置 `MAX_CONCURRENT_BACKTESTS`
3. **内存限制**: 监控内存使用，调整 `MAX_DATA_POINTS`

### 安全配置

1. **CORS**: 生产环境限制 `CORS_ORIGINS` 为前端域名
2. **HTTPS**: Railway 自动提供 HTTPS
3. **日志**: 设置 `LOG_LEVEL=WARNING` 减少日志量

### 监控

1. Railway 提供内置监控面板
2. 可通过 `/health` 端点集成外部监控
3. 建议设置 Uptime 监控服务

---

## 故障排查

### 构建失败

1. 检查 `requirements.txt` 依赖版本
2. 确认 Python 版本为 3.11

### 健康检查失败

1. 确认 `/health` 端点返回 200
2. 检查 Railway logs 查看错误

### 内存溢出

1. 减小 `MAX_DATA_POINTS`
2. 升级 Railway 实例规格

---

**最后更新**: 2025-12-28
