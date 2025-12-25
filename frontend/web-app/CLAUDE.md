# Delta Terminal Web 应用

> Next.js 15 交易终端前端 - AI驱动的现代化交易界面

## 模块概述

Delta Terminal Web 应用是 Delta Terminal 项目的主要前端界面，提供完整的交易功能、AI策略管理、实时市场数据展示和用户交互。

**创建时间**: 2025-12-24
**状态**: 开发中
**技术栈**: Next.js 15, React 19, TypeScript, TailwindCSS, Shadcn/ui

---

## 核心功能

### 1. 仪表盘 (Dashboard)
- **总资产展示**: 实时资产价值、24h盈亏、可用余额
- **概览统计**: 活跃策略数、交易次数、胜率、日盈亏
- **盈亏曲线**: 30天历史盈亏数据可视化
- **最近交易**: 最新10笔交易记录

**文件路径**:
- `/src/app/dashboard/page.tsx`
- `/src/components/dashboard/Overview.tsx`
- `/src/components/dashboard/PortfolioCard.tsx`
- `/src/components/dashboard/PnLChart.tsx`

### 2. 交易界面 (Trading)
- **实时K线图**: 多时间周期切换 (1分-1日)
- **订单簿**: 实时买卖盘口数据
- **下单表单**: 市价单/限价单，支持百分比快捷下单
- **成交历史**: 实时交易记录流

**文件路径**:
- `/src/app/trading/page.tsx`
- `/src/components/trading/TradingView.tsx`
- `/src/components/trading/OrderForm.tsx`
- `/src/components/trading/OrderBook.tsx`
- `/src/components/trading/TradeHistory.tsx`

### 3. AI 策略管理 (Strategies)
- **策略列表**: 网格展示所有策略及性能指标
- **AI 对话助手**: 自然语言创建交易策略
- **策略控制**: 启动/暂停/删除策略
- **性能监控**: 实时PnL、交易次数、胜率

**文件路径**:
- `/src/app/strategies/page.tsx`
- `/src/components/strategy/StrategyList.tsx`
- `/src/components/strategy/ChatInterface.tsx`

### 4. 布局系统
- **响应式导航**: 顶部Header + 左侧Sidebar
- **实时行情条**: 主流交易对实时价格
- **通知中心**: 系统通知和交易提醒
- **用户菜单**: 账户管理和设置入口

**文件路径**:
- `/src/components/layout/Header.tsx`
- `/src/components/layout/Sidebar.tsx`
- `/src/components/layout/MainLayout.tsx`

---

## 技术架构

### 状态管理 (Zustand)

```typescript
// 认证状态
useAuthStore()
  - user: User | null
  - token: string | null
  - login(user, token)
  - logout()

// 市场数据状态
useMarketStore()
  - markets: Map<symbol, MarketData>
  - activeSymbol: string
  - updateMarket(symbol, data)
  - getMarket(symbol)

// 策略状态
useStrategyStore()
  - strategies: Strategy[]
  - activeStrategyId: string | null
  - setStrategies(strategies)
  - addStrategy(strategy)
  - updateStrategy(id, updates)
  - removeStrategy(id)

// 订单状态
useOrderStore()
  - orders: Order[]
  - addOrder(order)
  - updateOrder(id, updates)
  - removeOrder(id)

// UI状态
useUIStore()
  - sidebarOpen: boolean
  - theme: 'light' | 'dark'
  - toggleSidebar()
  - setTheme(theme)
```

**文件**: `/src/store/index.ts`

### API 客户端

统一的后端API请求管理：

```typescript
import { apiClient } from '@/lib/api'

// 认证
apiClient.login(email, password)
apiClient.register(email, password, name)

// 市场数据
apiClient.getMarketData(symbol)
apiClient.getOrderBook(symbol, limit)

// 策略管理
apiClient.getStrategies()
apiClient.createStrategy(data)
apiClient.startStrategy(id)
apiClient.stopStrategy(id)

// 交易
apiClient.createOrder(orderData)
apiClient.getOrders(params)
apiClient.cancelOrder(id)

// AI
apiClient.chatWithAI(message, conversationId)
apiClient.generateStrategy(prompt)
apiClient.analyzeMarket(symbol)
```

**文件**: `/src/lib/api.ts`

### WebSocket 客户端

实时数据流订阅：

```typescript
import { wsClient } from '@/lib/websocket'

// 连接管理
wsClient.connect(token)
wsClient.disconnect()
wsClient.isConnected()

// 市场数据订阅
wsClient.subscribeTicker(symbol, callback)
wsClient.subscribeOrderBook(symbol, callback)
wsClient.subscribeTrades(symbol, callback)

// 用户数据订阅
wsClient.subscribeOrderUpdates(callback)
wsClient.subscribeBalanceUpdates(callback)
wsClient.subscribeStrategyUpdates(callback)

// 取消订阅
wsClient.unsubscribe(channel, eventType, callback)
```

**文件**: `/src/lib/websocket.ts`

### 自定义 Hooks

#### useMarketData
实时市场数据订阅和管理

```typescript
const { marketData, loading, error, refetch } = useMarketData('BTC/USDT')
```

**功能**:
- 获取初始市场数据
- WebSocket实时更新订阅
- 自动状态同步到全局store

#### useOrderBook
订单簿数据管理

```typescript
const { orderBook, loading, error, refetch } = useOrderBook('BTC/USDT', 20)
```

#### useStrategies
策略CRUD操作

```typescript
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

#### useAIChat
AI对话管理

```typescript
const {
  conversationId,
  loading,
  sendMessage,
  generateStrategy,
  resetConversation
} = useAIChat()
```

**文件**:
- `/src/hooks/useMarketData.ts`
- `/src/hooks/useStrategy.ts`

---

## UI 组件库

### 基础组件 (Shadcn/ui)

| 组件 | 文件 | 用途 |
|------|------|------|
| Button | `components/ui/button.tsx` | 按钮，支持多种变体和尺寸 |
| Card | `components/ui/card.tsx` | 卡片容器，包含Header/Content/Footer |
| Input | `components/ui/input.tsx` | 输入框 |
| Badge | `components/ui/badge.tsx` | 徽章标签 |
| Tabs | `components/ui/tabs.tsx` | 标签页切换 |

### 变体支持

```typescript
// Button 变体
variant: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'success' | 'warning'
size: 'default' | 'sm' | 'lg' | 'icon'

// Badge 变体
variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'
```

---

## 样式系统

### Tailwind 主题

深色主题为默认，定义在 `globals.css`:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 3.9%;
  --primary: 0 0% 9%;
  /* ... */
}

.dark {
  --background: 0 0% 3.9%;
  --foreground: 0 0% 98%;
  /* ... */
}
```

### 自定义类

```css
/* 交易相关 */
.price-up { @apply text-green-500; }
.price-down { @apply text-red-500; }
.order-book-bid { @apply text-green-400; }
.order-book-ask { @apply text-red-400; }

/* 滚动条 */
.scrollbar-thin::-webkit-scrollbar { width: 6px; }
```

---

## 工具函数

`/src/lib/utils.ts` 提供常用工具：

```typescript
// 样式合并
cn(...inputs: ClassValue[])

// 数字格式化
formatCurrency(value: number, decimals?: number)
formatPercentage(value: number, decimals?: number)
formatPriceChange(value: number)

// 价格计算
calculatePriceChange(current: number, previous: number)

// 时间格式化
formatTimestamp(timestamp: number, includeTime?: boolean)

// 验证
isValidTradingPair(pair: string)

// 字符串处理
truncate(text: string, maxLength: number)
```

---

## 数据流

### 市场数据流

```
WebSocket → wsClient.subscribeTicker()
         → useMarketData hook
         → useMarketStore.updateMarket()
         → Component re-render
```

### 策略数据流

```
User Action → useStrategies.createStrategy()
           → apiClient.createStrategy()
           → Backend API
           → useStrategyStore.addStrategy()
           → Component update
```

### 订单数据流

```
OrderForm submit → apiClient.createOrder()
                → Backend API
                → WebSocket order_update
                → useOrderStore.updateOrder()
                → TradeHistory update
```

---

## 环境配置

### 环境变量

创建 `.env.local`:

```env
# API配置
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_WS_URL=ws://localhost:4000

# 应用配置
NEXT_PUBLIC_APP_NAME=Delta Terminal
NEXT_PUBLIC_APP_VERSION=0.1.0
```

### 开发配置

`next.config.ts`:
- Turbopack 开发模式
- 严格模式启用
- 图片优化配置

---

## 待实现功能

### 高优先级
- [ ] TradingView 图表集成
- [ ] 实时WebSocket连接实现
- [ ] 完整的错误处理和边界
- [ ] 加载状态优化

### 中优先级
- [ ] 深色/浅色主题切换器
- [ ] 策略可视化编辑器
- [ ] 高级图表组件 (Recharts)
- [ ] 回测页面完整实现

### 低优先级
- [ ] PWA 支持
- [ ] 国际化 (i18n)
- [ ] 移动端优化
- [ ] 单元测试覆盖

---

## 开发指南

### 添加新页面

1. 在 `src/app/` 创建路由文件夹
2. 添加 `page.tsx`
3. 使用 `MainLayout` 包裹
4. 更新 Sidebar 导航

示例:
```tsx
// src/app/portfolio/page.tsx
import { MainLayout } from '@/components/layout/MainLayout'

export default function PortfolioPage() {
  return (
    <MainLayout>
      <div>Portfolio Content</div>
    </MainLayout>
  )
}
```

### 添加新组件

1. 在对应目录创建组件文件
2. 使用 TypeScript 类型定义
3. 遵循命名规范 (PascalCase)
4. 添加 JSDoc 注释

示例:
```tsx
interface MyComponentProps {
  title: string
  data: number[]
}

/**
 * MyComponent - 组件说明
 */
export function MyComponent({ title, data }: MyComponentProps) {
  return <div>{title}</div>
}
```

### 添加新 API 端点

在 `lib/api.ts` 的 `ApiClient` 类中添加方法：

```typescript
async getMyData(id: string) {
  return this.request<MyDataType>(`/my-endpoint/${id}`)
}
```

### 添加 WebSocket 订阅

在 `lib/websocket.ts` 中添加订阅方法：

```typescript
subscribeMyData(callback: WebSocketCallback) {
  this.subscribe('mydata:channel', 'my_event', callback)
}
```

---

## 性能优化建议

1. **使用 React Server Components**: 对于不需要交互的组件
2. **动态导入**: 大型组件使用 `next/dynamic`
3. **图片优化**: 使用 `next/image`
4. **状态选择器**: Zustand 使用浅比较选择器
5. **WebSocket 连接池**: 复用连接减少开销
6. **虚拟滚动**: 长列表使用虚拟化

---

## 调试技巧

### Redux DevTools (Zustand)

安装浏览器扩展后，可以查看所有状态变化：

```typescript
// store/index.ts 已配置 devtools 中间件
export const useAuthStore = create<AuthState>()(
  devtools(/* ... */)
)
```

### WebSocket 调试

在浏览器控制台查看连接状态：

```javascript
// 检查连接
wsClient.isConnected()

// 查看订阅
console.log(wsClient.subscriptions)
```

### API 调试

在 `lib/api.ts` 中启用日志：

```typescript
private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  console.log('API Request:', endpoint, options)
  const response = await fetch(url, {...})
  console.log('API Response:', response)
  // ...
}
```

---

## 故障排除

### 常见问题

**问题**: WebSocket 连接失败
**解决**: 检查后端服务是否运行，确认 `NEXT_PUBLIC_WS_URL` 配置

**问题**: 组件不更新
**解决**: 检查 Zustand store 订阅，确保使用正确的选择器

**问题**: 样式不生效
**解决**: 检查 Tailwind 配置，确保路径包含在 `content` 中

**问题**: 类型错误
**解决**: 运行 `pnpm type-check` 查看详细错误

---

## 相关链接

- [Next.js 文档](https://nextjs.org/docs)
- [Shadcn/ui 组件](https://ui.shadcn.com/)
- [Zustand 文档](https://docs.pmnd.rs/zustand)
- [TailwindCSS 文档](https://tailwindcss.com/docs)

---

**最后更新**: 2025-12-24
**维护者**: Delta Terminal 前端团队
