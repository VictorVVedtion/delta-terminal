# Spirit 生产部署指南 (Supabase + Vercel)

本指南介绍如何将 Spirit Daemon 系统部署到生产环境。

## 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                      Production Architecture                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Vercel (Frontend + API Routes)                                │
│       │                                                         │
│       ├── /api/spirit/event   ← Vercel Cron (每5分钟)           │
│       ├── /api/spirit/analyze ← LLM 分析端点                    │
│       │                                                         │
│       └── SpiritStore ◄── Supabase Realtime 订阅                │
│                               │                                 │
│   Supabase                    │                                 │
│       ├── spirit_events 表   ─┘                                 │
│       └── Realtime 广播                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 部署步骤

### 1. Supabase 配置

#### 1.1 创建 spirit_events 表

在 Supabase Dashboard 的 SQL Editor 中执行：

```sql
-- 位置: supabase/migrations/20241228_create_spirit_events.sql
-- 复制该文件内容并执行
```

#### 1.2 启用 Realtime

确保 `spirit_events` 表已添加到 Realtime 发布：

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE spirit_events;
```

#### 1.3 获取密钥

从 Supabase Dashboard > Settings > API 获取：
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (用于服务端操作)

### 2. Vercel 配置

#### 2.1 环境变量

在 Vercel Dashboard > Settings > Environment Variables 添加：

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs... (仅用于服务端)
```

#### 2.2 Cron Jobs (自动心跳)

`vercel.json` 已配置每 5 分钟触发一次心跳：

```json
{
  "crons": [
    {
      "path": "/api/spirit/event",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

> **注意**: Vercel Cron 需要 Pro 计划。免费计划可使用外部 Cron 服务如 [cron-job.org](https://cron-job.org)。

### 3. 本地开发

#### 3.1 环境变量

创建 `frontend/web-app/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
```

#### 3.2 启动开发服务器

```bash
cd frontend/web-app
pnpm dev
```

#### 3.3 手动触发事件 (测试)

```bash
# 触发心跳
curl http://localhost:3000/api/spirit/event

# 触发信号
curl -X POST http://localhost:3000/api/spirit/event \
  -H "Content-Type: application/json" \
  -d '{
    "type": "signal_detected",
    "priority": "p1",
    "spirit_state": "executing",
    "title": "Signal: BUY BTC/USDT",
    "content": "RSI indicates oversold conditions"
  }'

# 触发 LLM 分析
curl -X POST http://localhost:3000/api/spirit/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "signal": {
      "symbol": "BTC/USDT",
      "price": 95000,
      "indicators": { "rsi": 28, "change24h": -5.2 }
    }
  }'
```

## 数据流

1. **心跳**: Vercel Cron → `/api/spirit/event` → Supabase INSERT → Realtime → Frontend Store
2. **信号**: External Trigger → `/api/spirit/event` → Supabase INSERT → Realtime → Frontend Store
3. **AI 分析**: `/api/spirit/analyze` → LLM → Supabase INSERT → Realtime → Frontend Store

## 监控

- **Supabase Dashboard**: Table Editor > spirit_events 查看事件历史
- **Vercel Dashboard**: Logs 查看 API 调用日志
- **前端**: `/spirit` 页面查看实时活动日志

## 成本估算

| 服务 | 免费额度 | 预估月费 (小规模) |
|------|----------|-------------------|
| Vercel | 100GB 带宽 | $0 |
| Supabase | 500MB 数据库, 2GB 带宽 | $0 |
| **总计** | | **$0** |

> 对于大多数个人项目，免费额度完全足够。


