# Delta Terminal Web 应用

> 基于 Next.js 15 的现代化交易终端前端应用

## 技术栈

- **框架**: Next.js 15 (App Router)
- **UI 库**: React 19
- **语言**: TypeScript
- **样式**: TailwindCSS + Shadcn/ui
- **状态管理**: Zustand
- **图表**: Recharts (待集成 TradingView)
- **实时通信**: WebSocket
- **构建工具**: Turbopack

## 项目结构

```
src/
├── app/                      # Next.js App Router 页面
│   ├── dashboard/           # 仪表盘页面
│   ├── trading/             # 交易页面
│   ├── strategies/          # 策略管理页面
│   ├── backtest/            # 回测页面
│   ├── settings/            # 设置页面
│   └── layout.tsx           # 根布局
│
├── components/              # React 组件
│   ├── ui/                  # Shadcn UI 基础组件
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── tabs.tsx
│   │   └── badge.tsx
│   │
│   ├── layout/              # 布局组件
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── MainLayout.tsx
│   │
│   ├── dashboard/           # 仪表盘组件
│   │   ├── Overview.tsx
│   │   ├── PortfolioCard.tsx
│   │   └── PnLChart.tsx
│   │
│   ├── trading/             # 交易组件
│   │   ├── TradingView.tsx
│   │   ├── OrderForm.tsx
│   │   ├── OrderBook.tsx
│   │   └── TradeHistory.tsx
│   │
│   └── strategy/            # 策略组件
│       ├── StrategyList.tsx
│       ├── ChatInterface.tsx
│       └── StrategyBuilder.tsx
│
├── lib/                     # 工具库
│   ├── api.ts              # API 客户端
│   ├── websocket.ts        # WebSocket 客户端
│   └── utils.ts            # 工具函数
│
├── hooks/                   # 自定义 Hooks
│   ├── useMarketData.ts    # 市场数据 Hook
│   └── useStrategy.ts      # 策略管理 Hook
│
├── store/                   # Zustand 状态管理
│   └── index.ts            # 全局状态
│
└── types/                   # TypeScript 类型定义
    └── index.ts
```

## 核心功能

### 1. 仪表盘 (`/dashboard`)
- 资产总览卡片
- 盈亏曲线图表
- 活跃策略统计
- 最近交易记录

### 2. 交易界面 (`/trading`)
- 实时 K 线图表（TradingView 集成）
- 订单簿实时显示
- 交易下单表单（市价/限价）
- 成交历史列表

### 3. AI 策略 (`/strategies`)
- **策略列表**: 查看和管理所有策略
- **AI 助手**: 对话式创建策略
- 策略性能监控
- 启动/暂停/删除策略

### 4. 回测 (`/backtest`)
- 历史数据回测
- 策略性能评估
- 结果可视化

### 5. 设置 (`/settings`)
- 交易所 API 配置
- 风险管理参数
- 通知设置

## 组件说明

### UI 组件 (`components/ui/`)

基于 Shadcn/ui 的可复用基础组件：

- `Button`: 按钮组件（支持多种变体）
- `Card`: 卡片容器
- `Input`: 输入框
- `Tabs`: 标签页
- `Badge`: 徽章标签

### 布局组件 (`components/layout/`)

- `Header`: 顶部导航栏，包含搜索、通知、用户菜单
- `Sidebar`: 侧边栏导航
- `MainLayout`: 主布局容器

### 业务组件

#### 仪表盘组件 (`components/dashboard/`)
- `Overview`: 总览统计卡片
- `PortfolioCard`: 资产卡片
- `PnLChart`: 盈亏曲线图

#### 交易组件 (`components/trading/`)
- `TradingView`: K线图表容器
- `OrderForm`: 下单表单
- `OrderBook`: 实时订单簿
- `TradeHistory`: 成交历史表格

#### 策略组件 (`components/strategy/`)
- `StrategyList`: 策略列表网格
- `ChatInterface`: AI 对话界面
- `StrategyBuilder`: 策略构建器（可视化）

## 状态管理

使用 Zustand 管理全局状态：

```typescript
// 认证状态
useAuthStore()

// 市场数据
useMarketStore()

// 策略管理
useStrategyStore()

// 订单管理
useOrderStore()

// UI 状态
useUIStore()
```

## API 客户端

所有后端请求通过 `apiClient` 统一处理：

```typescript
import { apiClient } from '@/lib/api'

// 登录
await apiClient.login(email, password)

// 获取市场数据
await apiClient.getMarketData('BTC/USDT')

// 创建策略
await apiClient.createStrategy(strategyData)

// 下单
await apiClient.createOrder({
  symbol: 'BTC/USDT',
  side: 'buy',
  type: 'market',
  amount: 0.1
})
```

## WebSocket 客户端

实时数据订阅：

```typescript
import { wsClient } from '@/lib/websocket'

// 连接
await wsClient.connect(token)

// 订阅市场数据
wsClient.subscribeTicker('BTC/USDT', (data) => {
  console.log('Price update:', data)
})

// 订阅订单簿
wsClient.subscribeOrderBook('BTC/USDT', (data) => {
  console.log('Order book update:', data)
})

// 订阅订单更新
wsClient.subscribeOrderUpdates((data) => {
  console.log('Order update:', data)
})
```

## 自定义 Hooks

### useMarketData

```typescript
import { useMarketData } from '@/hooks/useMarketData'

const { marketData, loading, error } = useMarketData('BTC/USDT')
```

### useOrderBook

```typescript
import { useOrderBook } from '@/hooks/useMarketData'

const { orderBook, loading, error } = useOrderBook('BTC/USDT', 20)
```

### useStrategies

```typescript
import { useStrategies } from '@/hooks/useStrategy'

const {
  strategies,
  loading,
  createStrategy,
  updateStrategy,
  deleteStrategy,
  startStrategy,
  stopStrategy
} = useStrategies()
```

## 开发指南

### 安装依赖

```bash
cd frontend/web-app
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000

### 构建生产版本

```bash
pnpm build
```

### 类型检查

```bash
pnpm type-check
```

### 代码规范

```bash
pnpm lint
```

## 环境变量

创建 `.env.local` 文件：

```env
# API 配置
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_WS_URL=ws://localhost:4000

# 应用配置
NEXT_PUBLIC_APP_NAME=Delta Terminal
NEXT_PUBLIC_APP_VERSION=0.1.0
```

## 样式系统

### TailwindCSS 配置

主题色和变量定义在 `globals.css` 中：

```css
:root {
  --primary: ...
  --secondary: ...
  --accent: ...
}

.dark {
  /* 深色主题变量 */
}
```

### 自定义类

```css
/* 交易相关 */
.price-up { @apply text-green-500; }
.price-down { @apply text-red-500; }

/* 滚动条 */
.scrollbar-thin { ... }
```

## 性能优化

- 使用 React Server Components（RSC）
- 图片懒加载
- 代码分割和动态导入
- WebSocket 连接复用
- 状态选择器优化（Zustand）

## 待实现功能

- [ ] TradingView 图表集成
- [ ] 深色/浅色主题切换
- [ ] 国际化（i18n）
- [ ] PWA 支持
- [ ] 移动端响应式优化
- [ ] 策略可视化编辑器
- [ ] 高级图表组件（Recharts）
- [ ] 实时通知系统
- [ ] 多语言支持

## 技术债务

- 部分组件使用模拟数据，需要连接真实 API
- 图表组件需要完整实现
- 错误边界处理
- 单元测试覆盖
- E2E 测试

## 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

MIT License
