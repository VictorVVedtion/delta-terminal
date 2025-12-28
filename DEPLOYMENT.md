# Delta Terminal 部署指南

## 快速部署清单

### 1. 部署 Python 后端到 Railway

#### NLP Processor (AI 服务)
```bash
cd ai-engine/nlp-processor

# 确保有 Railway CLI
npm install -g railway

# 登录 Railway
railway login

# 创建项目并部署
railway init
railway up
```

**需要配置的环境变量 (Railway Dashboard):**
- `OPENROUTER_API_KEY`: OpenRouter API 密钥
- `LLM_MODEL`: `anthropic/claude-sonnet-4.5`
- `ENVIRONMENT`: `production`
- `CORS_ORIGINS`: `["https://your-vercel-app.vercel.app"]`
- `SECRET_KEY`: 随机生成的 JWT 密钥

#### Backtest Engine (回测服务)
```bash
cd data-pipeline/backtest-engine

railway init
railway up
```

**需要配置的环境变量:**
- `ENVIRONMENT`: `production`
- `CORS_ORIGINS`: `["https://your-vercel-app.vercel.app"]`

### 2. 配置 Vercel 环境变量

部署 Python 服务后，在 Vercel Dashboard 添加环境变量:

```
NLP_PROCESSOR_URL=https://your-nlp-processor.railway.app
BACKTEST_ENGINE_URL=https://your-backtest-engine.railway.app
```

### 3. 重新部署 Vercel

```bash
cd frontend/web-app
vercel --prod
```

## 本地开发

1. 启动 NLP Processor:
```bash
cd ai-engine/nlp-processor
make dev  # 或 uvicorn src.main:app --reload --port 8001
```

2. 启动前端:
```bash
cd frontend/web-app
# 创建 .env.local 并设置 NLP_PROCESSOR_URL=http://localhost:8001
pnpm dev
```

## 服务端口

| 服务 | 本地端口 | 说明 |
|------|----------|------|
| Frontend | 3000 | Next.js Web App |
| NLP Processor | 8001 | AI 服务 |
| Backtest Engine | 8003 | 回测服务 |

## 健康检查

- NLP: `GET /health`
- Backtest: `GET /health`
