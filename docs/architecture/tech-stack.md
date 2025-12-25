# Delta Terminal 技术栈详解

> **版本**: 1.0.0
> **更新日期**: 2025-12-24

---

## 目录

1. [技术选型原则](#技术选型原则)
2. [前端技术栈](#前端技术栈)
3. [后端技术栈](#后端技术栈)
4. [AI 与机器学习](#ai-与机器学习)
5. [数据存储](#数据存储)
6. [基础设施](#基础设施)
7. [开发工具](#开发工具)
8. [版本要求](#版本要求)

---

## 技术选型原则

### 1. 成熟稳定优先

- 选择经过生产环境验证的技术
- 社区活跃，文档完善
- 长期支持 (LTS) 版本

### 2. 性能至上

- 低延迟响应 (<100ms)
- 高并发处理能力
- 资源利用率高

### 3. 开发效率

- 类型安全 (TypeScript, Python Type Hints)
- 热重载开发体验
- 丰富的生态系统

### 4. 云原生

- 容器化友好
- 易于水平扩展
- 支持微服务架构

---

## 前端技术栈

### 核心框架

#### Next.js 15 (App Router)

**选型理由**:
- ✅ React 服务端组件 (RSC) 优化性能
- ✅ 内置 Turbopack 构建速度提升 5 倍
- ✅ 文件系统路由简化开发
- ✅ 自动代码分割与优化
- ✅ SEO 友好 (SSR/SSG)

**版本要求**: `^15.0.0`

**关键特性**:
```typescript
// app/dashboard/page.tsx - 服务端组件
export default async function DashboardPage() {
  const data = await fetchUserData(); // 服务端数据获取
  return <DashboardClient data={data} />;
}

// app/api/strategies/route.ts - API Routes
export async function POST(request: Request) {
  const body = await request.json();
  return Response.json({ success: true });
}
```

#### React 19 RC

**选型理由**:
- ✅ Server Components 原生支持
- ✅ Actions 简化表单处理
- ✅ Suspense 改进
- ✅ useOptimistic 乐观更新

**版本要求**: `^19.0.0-rc`

**新特性示例**:
```typescript
'use client';
import { useOptimistic } from 'react';

export function StrategyList({ strategies }) {
  const [optimisticStrategies, addOptimistic] = useOptimistic(
    strategies,
    (state, newStrategy) => [...state, newStrategy]
  );

  async function createStrategy(formData: FormData) {
    const newStrategy = { name: formData.get('name') };
    addOptimistic(newStrategy); // 立即更新 UI
    await saveStrategy(newStrategy); // 后台保存
  }

  return <form action={createStrategy}>...</form>;
}
```

### 类型系统

#### TypeScript 5.3+

**选型理由**:
- ✅ 静态类型检查减少 bug
- ✅ 优秀的 IDE 支持
- ✅ 大型项目可维护性强

**版本要求**: `^5.3.0`

**配置**:
```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "incremental": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### UI 框架

#### TailwindCSS 3.4+

**选型理由**:
- ✅ 原子化 CSS，开发效率高
- ✅ 按需生成，体积小
- ✅ 响应式设计简单
- ✅ 深色模式支持

**版本要求**: `^3.4.0`

**配置示例**:
```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          500: '#0ea5e9',
          900: '#0c4a6e',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    }
  }
}
```

#### Shadcn/ui

**选型理由**:
- ✅ 基于 Radix UI，无障碍访问优秀
- ✅ 可定制组件
- ✅ 无运行时依赖
- ✅ 美观的设计系统

**版本要求**: `latest`

**组件示例**:
```bash
npx shadcn-ui@latest add button card dialog
```

```typescript
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function StrategyCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>BTC 趋势策略</CardTitle>
      </CardHeader>
      <CardContent>
        <Button>激活策略</Button>
      </CardContent>
    </Card>
  );
}
```

### 状态管理

#### Zustand 4.4+

**选型理由**:
- ✅ 极简 API，学习成本低
- ✅ TypeScript 支持优秀
- ✅ 无需 Provider 包裹
- ✅ 支持中间件 (persist, devtools)

**版本要求**: `^4.4.0`

**示例**:
```typescript
// stores/useStrategyStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface StrategyStore {
  strategies: Strategy[];
  addStrategy: (strategy: Strategy) => void;
}

export const useStrategyStore = create<StrategyStore>()(
  persist(
    (set) => ({
      strategies: [],
      addStrategy: (strategy) =>
        set((state) => ({ strategies: [...state.strategies, strategy] })),
    }),
    { name: 'strategy-storage' }
  )
);
```

### 数据请求

#### TanStack Query (React Query) 5.0+

**选型理由**:
- ✅ 自动缓存管理
- ✅ 后台数据同步
- ✅ 乐观更新
- ✅ 分页、无限滚动支持

**版本要求**: `^5.0.0`

**示例**:
```typescript
import { useQuery, useMutation } from '@tanstack/react-query';

export function useStrategies() {
  return useQuery({
    queryKey: ['strategies'],
    queryFn: async () => {
      const res = await fetch('/api/strategies');
      return res.json();
    },
    refetchInterval: 30000, // 30秒自动刷新
  });
}

export function useCreateStrategy() {
  return useMutation({
    mutationFn: async (data: CreateStrategyDto) => {
      const res = await fetch('/api/strategies', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return res.json();
    },
  });
}
```

### 实时通信

#### Socket.io Client 4.6+

**选型理由**:
- ✅ WebSocket 封装，自动降级
- ✅ 房间/命名空间管理
- ✅ 自动重连
- ✅ 消息确认机制

**版本要求**: `^4.6.0`

**示例**:
```typescript
// hooks/useMarketData.ts
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export function useMarketData(symbols: string[]) {
  const [data, setData] = useState<MarketTick[]>([]);

  useEffect(() => {
    const socket = io('ws://localhost:3000');

    socket.emit('subscribe', { channel: 'market', symbols });

    socket.on('market.tick', (tick: MarketTick) => {
      setData((prev) => [...prev, tick]);
    });

    return () => {
      socket.disconnect();
    };
  }, [symbols]);

  return data;
}
```

### 图表可视化

#### TradingView Lightweight Charts 4.1+

**选型理由**:
- ✅ 专业金融图表库
- ✅ 性能优秀，支持大数据量
- ✅ 可定制指标
- ✅ 响应式设计

**版本要求**: `^4.1.0`

**示例**:
```typescript
import { createChart } from 'lightweight-charts';

export function KLineChart({ data }) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = createChart(chartRef.current, {
      width: 800,
      height: 400,
    });

    const candlestickSeries = chart.addCandlestickSeries();
    candlestickSeries.setData(data);

    return () => {
      chart.remove();
    };
  }, [data]);

  return <div ref={chartRef} />;
}
```

---

## 后端技术栈

### Node.js 服务

#### Fastify 4.25+

**选型理由**:
- ✅ 性能是 Express 的 2 倍
- ✅ 内置 JSON Schema 验证
- ✅ 异步/等待支持优秀
- ✅ 插件系统强大

**版本要求**: `^4.25.0`

**示例**:
```typescript
// api-gateway/server.ts
import Fastify from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';

const fastify = Fastify({
  logger: true,
}).withTypeProvider<TypeBoxTypeProvider>();

// 路由定义
fastify.post('/api/v1/strategies', {
  schema: {
    body: Type.Object({
      name: Type.String(),
      type: Type.Enum(['trend', 'grid', 'arbitrage']),
    }),
    response: {
      201: Type.Object({
        id: Type.String(),
        name: Type.String(),
      }),
    },
  },
  handler: async (request, reply) => {
    const strategy = await createStrategy(request.body);
    return reply.code(201).send(strategy);
  },
});

await fastify.listen({ port: 3000 });
```

#### Prisma 5.8+ (ORM)

**选型理由**:
- ✅ 类型安全的数据库访问
- ✅ 自动生成迁移脚本
- ✅ 查询性能优秀
- ✅ 支持多数据库

**版本要求**: `^5.8.0`

**Schema 示例**:
```prisma
// schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id         String      @id @default(cuid())
  email      String      @unique
  name       String
  strategies Strategy[]
  createdAt  DateTime    @default(now())
  updatedAt  DateTime    @updatedAt
}

model Strategy {
  id          String   @id @default(cuid())
  name        String
  type        String
  config      Json
  isActive    Boolean  @default(false)
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  createdAt   DateTime @default(now())
}
```

**使用示例**:
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 类型安全的查询
const strategies = await prisma.strategy.findMany({
  where: { userId: '123', isActive: true },
  include: { user: true },
});
```

### Python 服务

#### FastAPI 0.109+

**选型理由**:
- ✅ 高性能 (基于 Starlette 和 Pydantic)
- ✅ 自动生成 OpenAPI 文档
- ✅ 异步支持
- ✅ 类型验证

**版本要求**: `^0.109.0`

**示例**:
```python
# ai-engine/nlp-processor/main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="NLP Processor", version="1.0.0")

class StrategyRequest(BaseModel):
    prompt: str
    user_id: str

class StrategyResponse(BaseModel):
    strategy_code: str
    explanation: str

@app.post("/api/v1/generate-strategy", response_model=StrategyResponse)
async def generate_strategy(request: StrategyRequest):
    """使用 AI 生成交易策略"""
    try:
        result = await claude_generate_strategy(request.prompt)
        return StrategyResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 自动生成文档: http://localhost:8001/docs
```

#### CCXT 4.2+ (交易所连接)

**选型理由**:
- ✅ 支持 100+ 交易所
- ✅ 统一 API 接口
- ✅ WebSocket 支持
- ✅ 活跃维护

**版本要求**: `^4.2.0`

**示例**:
```python
# trading-engine/exchange-connector/binance.py
import ccxt.async_support as ccxt

class BinanceConnector:
    def __init__(self, api_key: str, secret: str):
        self.exchange = ccxt.binance({
            'apiKey': api_key,
            'secret': secret,
            'enableRateLimit': True,
        })

    async def create_limit_order(self, symbol: str, side: str, amount: float, price: float):
        """创建限价单"""
        try:
            order = await self.exchange.create_limit_order(
                symbol=symbol,
                side=side,
                amount=amount,
                price=price
            )
            return order
        except ccxt.NetworkError as e:
            raise Exception(f"Network error: {e}")
        except ccxt.ExchangeError as e:
            raise Exception(f"Exchange error: {e}")

    async def fetch_ticker(self, symbol: str):
        """获取实时行情"""
        return await self.exchange.fetch_ticker(symbol)
```

---

## AI 与机器学习

### LangChain 0.1.0+

**选型理由**:
- ✅ LLM 应用开发框架
- ✅ 链式调用管理
- ✅ 向量数据库集成
- ✅ Agent 支持

**版本要求**: `^0.1.0`

**示例**:
```python
# ai-engine/strategy-generator/langchain_service.py
from langchain.chat_models import ChatAnthropic
from langchain.prompts import ChatPromptTemplate
from langchain.output_parsers import PydanticOutputParser

class StrategyGenerator:
    def __init__(self):
        self.llm = ChatAnthropic(
            model="claude-3-opus-20240229",
            temperature=0.7
        )

    async def generate_strategy(self, user_prompt: str):
        """生成交易策略"""
        template = ChatPromptTemplate.from_messages([
            ("system", "你是专业的量化交易策略专家"),
            ("user", "{prompt}")
        ])

        chain = template | self.llm
        response = await chain.ainvoke({"prompt": user_prompt})

        return response.content
```

### Anthropic Claude API

**选型理由**:
- ✅ 长上下文支持 (200K tokens)
- ✅ 代码生成能力强
- ✅ 安全性高
- ✅ 响应速度快

**版本要求**: `anthropic ^0.12.0`

**示例**:
```python
import anthropic

client = anthropic.Anthropic(api_key="sk-ant-...")

async def analyze_strategy(strategy_code: str, market_data: dict):
    """分析策略可行性"""
    message = await client.messages.create(
        model="claude-3-opus-20240229",
        max_tokens=4096,
        messages=[{
            "role": "user",
            "content": f"""
            分析以下交易策略:
            {strategy_code}

            当前市场数据:
            {market_data}

            请评估策略的风险和预期收益。
            """
        }]
    )

    return message.content[0].text
```

### Pinecone (向量数据库)

**选型理由**:
- ✅ 托管服务，运维简单
- ✅ 毫秒级查询速度
- ✅ 自动扩展
- ✅ 支持混合搜索

**版本要求**: `pinecone-client ^3.0.0`

**示例**:
```python
# ai-engine/nlp-processor/vector_store.py
from pinecone import Pinecone, ServerlessSpec

pc = Pinecone(api_key="your-api-key")

# 创建索引
index = pc.Index("strategy-embeddings")

# 存储策略向量
index.upsert(vectors=[
    {
        "id": "strategy-001",
        "values": [0.1, 0.2, ...],  # 768维向量
        "metadata": {
            "name": "BTC 趋势策略",
            "type": "trend",
            "performance": 0.15
        }
    }
])

# 相似策略搜索
results = index.query(
    vector=[0.1, 0.2, ...],
    top_k=5,
    include_metadata=True
)
```

---

## 数据存储

### PostgreSQL 15+

**选型理由**:
- ✅ ACID 事务支持
- ✅ 丰富的数据类型 (JSON, Array)
- ✅ 全文搜索
- ✅ 成熟稳定

**版本要求**: `^15.0`

**优化配置**:
```sql
-- postgresql.conf
max_connections = 200
shared_buffers = 4GB
effective_cache_size = 12GB
maintenance_work_mem = 1GB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 20MB
```

### Redis 7.2+

**选型理由**:
- ✅ 内存数据库，极快
- ✅ 丰富的数据结构
- ✅ 发布/订阅
- ✅ 持久化支持

**版本要求**: `^7.2.0`

**使用场景**:
```typescript
import { createClient } from 'redis';

const redis = createClient({
  url: 'redis://localhost:6379'
});

await redis.connect();

// 1. 会话存储
await redis.set(`session:${userId}`, JSON.stringify(sessionData), {
  EX: 3600 // 1小时过期
});

// 2. API 响应缓存
const cached = await redis.get(`api:strategies:${userId}`);
if (cached) return JSON.parse(cached);

// 3. 实时计数器
await redis.incr(`orders:count:${today}`);

// 4. 排行榜
await redis.zAdd('strategy:performance', {
  score: 0.15,
  value: 'strategy-001'
});
```

### TimescaleDB 2.13+

**选型理由**:
- ✅ PostgreSQL 扩展，兼容 SQL
- ✅ 时序数据优化
- ✅ 自动分区
- ✅ 压缩存储

**版本要求**: `^2.13.0`

**示例**:
```sql
-- 创建时序表
CREATE TABLE market_ticks (
  time        TIMESTAMPTZ NOT NULL,
  symbol      TEXT NOT NULL,
  price       NUMERIC NOT NULL,
  volume      NUMERIC NOT NULL
);

-- 转换为超表
SELECT create_hypertable('market_ticks', 'time');

-- 创建压缩策略 (7天后压缩)
ALTER TABLE market_ticks SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'symbol'
);

SELECT add_compression_policy('market_ticks', INTERVAL '7 days');

-- 高效查询
SELECT
  time_bucket('1 minute', time) AS bucket,
  symbol,
  first(price, time) AS open,
  max(price) AS high,
  min(price) AS low,
  last(price, time) AS close,
  sum(volume) AS volume
FROM market_ticks
WHERE time > NOW() - INTERVAL '1 day'
GROUP BY bucket, symbol
ORDER BY bucket DESC;
```

---

## 基础设施

### Docker

**版本要求**: `^24.0.0`

**示例 Dockerfile**:
```dockerfile
# frontend/web-app/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

### Kubernetes

**版本要求**: `^1.28.0`

**部署示例**:
```yaml
# k8s/api-gateway-deployment.yaml
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
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
          limits:
            cpu: "1000m"
            memory: "1Gi"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
```

### RabbitMQ 3.12+

**版本要求**: `^3.12.0`

**示例**:
```typescript
// shared/utils/rabbitmq.ts
import amqp from 'amqplib';

export class MessageQueue {
  private connection: amqp.Connection;
  private channel: amqp.Channel;

  async connect() {
    this.connection = await amqp.connect('amqp://localhost');
    this.channel = await this.connection.createChannel();
  }

  async publish(exchange: string, routingKey: string, message: object) {
    await this.channel.assertExchange(exchange, 'topic', { durable: true });
    this.channel.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(message))
    );
  }

  async subscribe(queue: string, callback: (msg: any) => void) {
    await this.channel.assertQueue(queue, { durable: true });
    this.channel.consume(queue, (msg) => {
      if (msg) {
        const content = JSON.parse(msg.content.toString());
        callback(content);
        this.channel.ack(msg);
      }
    });
  }
}
```

### Prometheus + Grafana

**Prometheus 版本**: `^2.48.0`
**Grafana 版本**: `^10.2.0`

**指标示例**:
```typescript
// backend/api-gateway/metrics.ts
import client from 'prom-client';

// 默认指标
client.collectDefaultMetrics();

// 自定义指标
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
});

export const activeOrders = new client.Gauge({
  name: 'active_orders_total',
  help: 'Number of active orders',
});

// 在路由中使用
fastify.addHook('onResponse', (request, reply, done) => {
  httpRequestDuration
    .labels(request.method, request.routerPath, reply.statusCode.toString())
    .observe(reply.getResponseTime() / 1000);
  done();
});
```

---

## 开发工具

### 包管理

- **Node.js**: pnpm `^8.0.0` (性能优于 npm)
- **Python**: Poetry `^1.7.0` (依赖管理)

### 代码质量

- **ESLint**: `^8.56.0`
- **Prettier**: `^3.1.0`
- **Black** (Python): `^23.12.0`
- **Ruff** (Python Linter): `^0.1.0`

### 测试

- **Jest**: `^29.7.0` (Node.js 单元测试)
- **Playwright**: `^1.40.0` (E2E 测试)
- **Pytest**: `^7.4.0` (Python 单元测试)

### CI/CD

- **GitHub Actions** 或 **GitLab CI**
- **Docker Compose** (本地开发)

---

## 版本要求汇总

### Node.js 生态

| 包名 | 版本 | 用途 |
|-----|------|------|
| node | `^20.0.0` | 运行时 |
| pnpm | `^8.0.0` | 包管理器 |
| next | `^15.0.0` | 前端框架 |
| react | `^19.0.0-rc` | UI 库 |
| typescript | `^5.3.0` | 类型系统 |
| fastify | `^4.25.0` | Web 框架 |
| prisma | `^5.8.0` | ORM |
| socket.io | `^4.6.0` | WebSocket |
| zustand | `^4.4.0` | 状态管理 |
| @tanstack/react-query | `^5.0.0` | 数据请求 |

### Python 生态

| 包名 | 版本 | 用途 |
|-----|------|------|
| python | `^3.11.0` | 运行时 |
| poetry | `^1.7.0` | 包管理器 |
| fastapi | `^0.109.0` | Web 框架 |
| ccxt | `^4.2.0` | 交易所接口 |
| langchain | `^0.1.0` | LLM 框架 |
| anthropic | `^0.12.0` | Claude API |
| pandas | `^2.1.0` | 数据分析 |
| numpy | `^1.26.0` | 数值计算 |

### 数据库

| 名称 | 版本 | 用途 |
|-----|------|------|
| PostgreSQL | `^15.0` | 关系数据库 |
| Redis | `^7.2.0` | 缓存/队列 |
| TimescaleDB | `^2.13.0` | 时序数据 |

### 基础设施

| 名称 | 版本 | 用途 |
|-----|------|------|
| Docker | `^24.0.0` | 容器化 |
| Kubernetes | `^1.28.0` | 容器编排 |
| RabbitMQ | `^3.12.0` | 消息队列 |
| Prometheus | `^2.48.0` | 监控 |
| Grafana | `^10.2.0` | 可视化 |

---

## 下一步

- 查看 [架构概述](./overview.md)
- 了解 [数据流设计](./data-flow.md)
- 阅读 [编码规范](./coding-standards.md)

---

**文档维护**: 技术团队
