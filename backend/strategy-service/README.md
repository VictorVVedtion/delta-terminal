# Strategy Service - 策略管理服务

Delta Terminal 的核心策略管理服务，负责交易策略的创建、管理、执行和监控。

## 功能特性

- ✅ **策略 CRUD**: 完整的策略创建、读取、更新、删除功能
- ✅ **策略模板**: 预定义的策略模板，快速创建策略
- ✅ **策略执行**: 策略执行记录和状态管理
- ✅ **版本管理**: 策略版本控制和历史追溯
- ✅ **策略分享**: 生成分享码，分享策略给其他用户
- ✅ **性能统计**: 实时统计策略性能指标
- ✅ **风险管理**: 内置风险等级评估和限制

## 技术栈

- **运行时**: Node.js 18+
- **框架**: Fastify 5.x
- **语言**: TypeScript 5.x
- **ORM**: Prisma 6.x
- **数据库**: PostgreSQL 15+
- **验证**: Zod
- **认证**: JWT (@fastify/jwt)

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，填入数据库连接等配置
```

### 3. 初始化数据库

```bash
# 生成 Prisma Client
pnpm prisma:generate

# 推送数据库 Schema
pnpm db:push

# 或使用迁移
pnpm prisma:migrate
```

### 4. 启动开发服务器

```bash
pnpm dev
```

服务将在 `http://localhost:3002` 启动。

## API 文档

### 策略管理

#### 创建策略
```http
POST /api/v1/strategies
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "我的网格策略",
  "description": "BTC/USDT 网格交易",
  "type": "GRID",
  "exchange": "binance",
  "symbol": "BTC/USDT",
  "initialCapital": 10000,
  "riskLevel": "MEDIUM",
  "config": {
    "gridLevels": 10,
    "gridSpacing": 0.5,
    "upperPrice": 50000,
    "lowerPrice": 40000
  }
}
```

#### 获取策略列表
```http
GET /api/v1/strategies?page=1&pageSize=20&status=ACTIVE
Authorization: Bearer <token>
```

#### 获取策略详情
```http
GET /api/v1/strategies/:id
Authorization: Bearer <token>
```

#### 启动策略
```http
POST /api/v1/strategies/:id/start
Authorization: Bearer <token>
```

#### 暂停策略
```http
POST /api/v1/strategies/:id/pause
Authorization: Bearer <token>
```

#### 停止策略
```http
POST /api/v1/strategies/:id/stop
Authorization: Bearer <token>
```

#### 分享策略
```http
POST /api/v1/strategies/:id/share
Authorization: Bearer <token>

响应:
{
  "success": true,
  "data": {
    "shareCode": "ABC12345"
  }
}
```

### 策略模板

#### 获取模板列表
```http
GET /api/v1/templates?category=grid&type=SPOT
Authorization: Bearer <token>
```

#### 创建模板
```http
POST /api/v1/templates
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "经典网格策略",
  "category": "grid",
  "type": "GRID",
  "config": { ... }
}
```

### 策略执行

#### 获取执行记录
```http
GET /api/v1/executions?strategyId=xxx&page=1
Authorization: Bearer <token>
```

#### 创建执行记录
```http
POST /api/v1/executions
Authorization: Bearer <token>
Content-Type: application/json

{
  "strategyId": "xxx",
  "executionType": "BUY",
  "side": "BUY",
  "type": "LIMIT",
  "amount": 0.01,
  "price": 45000
}
```

## 数据模型

### Strategy (策略)
- `id`: 策略 ID
- `userId`: 用户 ID
- `name`: 策略名称
- `type`: 策略类型 (SPOT/FUTURES/GRID/DCA/ARBITRAGE/CUSTOM)
- `status`: 状态 (DRAFT/ACTIVE/PAUSED/STOPPED/ARCHIVED/ERROR)
- `config`: 策略配置 (JSON)
- `initialCapital`: 初始资金
- `currentCapital`: 当前资金
- `totalProfit`: 总盈亏
- `profitRate`: 收益率
- `totalTrades`: 总交易次数
- `winRate`: 胜率

### StrategyTemplate (策略模板)
- `id`: 模板 ID
- `name`: 模板名称
- `category`: 分类
- `type`: 策略类型
- `config`: 默认配置
- `isOfficial`: 是否官方模板
- `usageCount`: 使用次数
- `rating`: 评分

### StrategyExecution (策略执行)
- `id`: 执行 ID
- `strategyId`: 策略 ID
- `status`: 执行状态 (PENDING/RUNNING/SUCCESS/FAILED)
- `executionType`: 执行类型 (BUY/SELL/CLOSE)
- `side`: 买卖方向
- `type`: 订单类型 (MARKET/LIMIT)
- `amount`: 数量
- `price`: 价格
- `profit`: 盈亏

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `PORT` | 服务端口 | 3002 |
| `DATABASE_URL` | 数据库连接 | - |
| `JWT_SECRET` | JWT 密钥 | - |
| `MAX_STRATEGIES_PER_USER` | 每用户最大策略数 | 50 |
| `MAX_ACTIVE_STRATEGIES` | 最大同时运行策略数 | 10 |

## 开发命令

```bash
# 开发模式
pnpm dev

# 构建
pnpm build

# 生产运行
pnpm start

# 类型检查
pnpm type-check

# 代码检查
pnpm lint

# 代码格式化
pnpm format

# 测试
pnpm test

# Prisma 相关
pnpm prisma:generate   # 生成 Prisma Client
pnpm prisma:migrate    # 运行迁移
pnpm prisma:studio     # 打开数据库管理界面
```

## 项目结构

```
strategy-service/
├── prisma/
│   └── schema.prisma          # Prisma 数据模型
├── src/
│   ├── config/
│   │   └── index.ts           # 配置管理
│   ├── repositories/
│   │   └── strategy.repository.ts  # 数据访问层
│   ├── services/
│   │   ├── strategy.service.ts     # 策略服务
│   │   ├── template.service.ts     # 模板服务
│   │   └── execution.service.ts    # 执行服务
│   ├── routes/
│   │   ├── strategies.ts           # 策略路由
│   │   ├── templates.ts            # 模板路由
│   │   └── executions.ts           # 执行路由
│   ├── types/
│   │   └── strategy.ts             # 类型定义
│   ├── app.ts                      # Fastify 应用
│   └── index.ts                    # 入口文件
├── .env.example                    # 环境变量示例
├── package.json
├── tsconfig.json
└── README.md
```

## 许可证

MIT

---

**维护者**: Delta Terminal 开发团队  
**最后更新**: 2025-12-24
