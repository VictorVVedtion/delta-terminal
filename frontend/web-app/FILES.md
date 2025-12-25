# Delta Terminal Web 应用 - 文件清单

> 完整的前端文件结构和说明

## 文件统计

- **总文件数**: 28
- **页面文件**: 4
- **组件文件**: 16
- **工具库**: 3
- **Hooks**: 2
- **状态管理**: 1
- **配置文件**: 5

---

## 页面文件 (4)

### `/src/app/`

| 文件 | 说明 | 功能 |
|------|------|------|
| `layout.tsx` | 根布局 | Next.js App Router 根布局，配置深色主题 |
| `page.tsx` | 首页 | 重定向到仪表盘 |
| `dashboard/page.tsx` | 仪表盘页面 | 总资产、盈亏图表、交易记录 |
| `strategies/page.tsx` | 策略管理页面 | 策略列表、AI对话助手 |
| `trading/page.tsx` | 交易页面 | K线图、订单簿、下单表单 |

---

## 组件文件 (16)

### UI 基础组件 (5)
`/src/components/ui/`

| 文件 | 说明 | 变体 |
|------|------|------|
| `button.tsx` | 按钮组件 | default, destructive, outline, secondary, ghost, link, success, warning |
| `card.tsx` | 卡片组件 | Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter |
| `input.tsx` | 输入框 | 标准HTML input扩展 |
| `badge.tsx` | 徽章标签 | default, secondary, destructive, outline, success, warning |
| `tabs.tsx` | 标签页 | Tabs, TabsList, TabsTrigger, TabsContent |

### 布局组件 (3)
`/src/components/layout/`

| 文件 | 说明 | 功能 |
|------|------|------|
| `Header.tsx` | 顶部导航栏 | Logo、搜索、通知、用户菜单、市场行情条 |
| `Sidebar.tsx` | 侧边栏 | 主导航菜单、底部工具链接 |
| `MainLayout.tsx` | 主布局容器 | 组合Header和Sidebar |

### 仪表盘组件 (3)
`/src/components/dashboard/`

| 文件 | 说明 | 数据 |
|------|------|------|
| `Overview.tsx` | 总览统计卡片 | 活跃策略、交易次数、胜率、日盈亏 |
| `PortfolioCard.tsx` | 资产卡片 | 总资产、24h变化、可用余额 |
| `PnLChart.tsx` | 盈亏曲线图 | 历史盈亏数据、时间周期切换 |

### 交易组件 (4)
`/src/components/trading/`

| 文件 | 说明 | 功能 |
|------|------|------|
| `TradingView.tsx` | K线图表容器 | 价格展示、时间周期、技术指标 |
| `OrderForm.tsx` | 下单表单 | 市价单/限价单、买入/卖出、百分比快捷 |
| `OrderBook.tsx` | 订单簿 | 实时买卖盘口、深度可视化 |
| `TradeHistory.tsx` | 成交历史 | 交易记录表格、状态标签 |

### 策略组件 (2)
`/src/components/strategy/`

| 文件 | 说明 | 功能 |
|------|------|------|
| `StrategyList.tsx` | 策略列表 | 网格展示、性能指标、操作按钮 |
| `ChatInterface.tsx` | AI对话界面 | 消息历史、快速提示、实时对话 |

---

## 工具库 (3)

### `/src/lib/`

| 文件 | 说明 | 核心功能 |
|------|------|----------|
| `api.ts` | API客户端 | 统一后端请求、认证、市场数据、策略、交易、AI |
| `websocket.ts` | WebSocket客户端 | 实时连接管理、订阅管理、事件处理、自动重连 |
| `utils.ts` | 工具函数 | 样式合并、数字格式化、时间格式化、验证 |

### API 客户端方法

```typescript
// 认证
login(email, password)
register(email, password, name)
getCurrentUser()

// 市场数据
getMarketData(symbol)
getOrderBook(symbol, limit)
getTrades(symbol, limit)

// 策略
getStrategies()
getStrategy(id)
createStrategy(data)
updateStrategy(id, data)
deleteStrategy(id)
startStrategy(id)
stopStrategy(id)

// 交易
createOrder(data)
getOrders(params)
cancelOrder(id)

// 资产
getPortfolio()
getBalance()
getTransactions(limit)

// 回测
createBacktest(data)
getBacktest(id)
getBacktestResults(id)

// AI
chatWithAI(message, conversationId)
generateStrategy(prompt)
analyzeMarket(symbol)
```

### WebSocket 订阅方法

```typescript
// 连接管理
connect(token)
disconnect()
isConnected()

// 市场数据订阅
subscribeTicker(symbol, callback)
subscribeOrderBook(symbol, callback)
subscribeTrades(symbol, callback)

// 用户数据订阅
subscribeOrderUpdates(callback)
subscribeBalanceUpdates(callback)
subscribeStrategyUpdates(callback)

// 通用方法
on(eventType, callback)
off(eventType, callback)
unsubscribe(channel, eventType, callback)
```

---

## 自定义 Hooks (2)

### `/src/hooks/`

| 文件 | Hooks | 功能 |
|------|-------|------|
| `useMarketData.ts` | `useMarketData`<br>`useOrderBook`<br>`useTrades`<br>`useMarketList` | 市场数据订阅和管理 |
| `useStrategy.ts` | `useStrategies`<br>`useStrategy`<br>`useAIChat` | 策略CRUD、AI对话 |

### Hook 详情

#### useMarketData
```typescript
const { marketData, loading, error, refetch } = useMarketData('BTC/USDT')
```
- 获取初始市场数据
- WebSocket实时更新
- 自动同步到全局store

#### useOrderBook
```typescript
const { orderBook, loading, error, refetch } = useOrderBook('BTC/USDT', 20)
```
- 订单簿数据
- 实时深度更新

#### useStrategies
```typescript
const {
  strategies,
  loading,
  error,
  refetch,
  createStrategy,
  updateStrategy,
  deleteStrategy,
  startStrategy,
  stopStrategy
} = useStrategies()
```
- 策略列表管理
- CRUD操作
- WebSocket状态同步

#### useAIChat
```typescript
const {
  conversationId,
  loading,
  error,
  sendMessage,
  generateStrategy,
  resetConversation
} = useAIChat()
```
- AI对话管理
- 策略生成
- 会话持久化

---

## 状态管理 (1)

### `/src/store/index.ts`

包含5个Zustand store:

| Store | 状态 | 方法 |
|-------|------|------|
| `useAuthStore` | user, token, isAuthenticated | login, logout |
| `useMarketStore` | markets, activeSymbol | setActiveSymbol, updateMarket, getMarket |
| `useStrategyStore` | strategies, activeStrategyId | setStrategies, addStrategy, updateStrategy, removeStrategy |
| `useOrderStore` | orders | addOrder, updateOrder, removeOrder, clearOrders |
| `useUIStore` | sidebarOpen, theme | toggleSidebar, setSidebarOpen, setTheme |

### 特性

- **DevTools**: 所有store支持Redux DevTools
- **持久化**: `useAuthStore` 和 `useUIStore` 使用localStorage持久化
- **类型安全**: 完整的TypeScript类型定义

---

## 配置文件 (5)

| 文件 | 说明 |
|------|------|
| `package.json` | 项目依赖和脚本 |
| `tsconfig.json` | TypeScript配置 |
| `tailwind.config.ts` | TailwindCSS配置 |
| `next.config.ts` | Next.js配置 |
| `postcss.config.mjs` | PostCSS配置 |
| `components.json` | Shadcn/ui配置 |

---

## 样式文件 (1)

### `/src/app/globals.css`

- Tailwind基础层
- CSS变量（浅色/深色主题）
- 自定义工具类
- 交易终端特定样式
- 滚动条样式

---

## 文档文件 (3)

| 文件 | 说明 |
|------|------|
| `README.md` | 项目概述和使用指南 |
| `CLAUDE.md` | AI开发上下文文档 |
| `FILES.md` | 本文件清单 |

---

## 缺失但推荐的文件

以下文件建议在后续开发中添加：

### 测试文件
- `__tests__/` - 单元测试
- `e2e/` - E2E测试
- `jest.config.js` - Jest配置

### 类型定义
- `src/types/index.ts` - 全局类型定义
- `src/types/api.ts` - API类型
- `src/types/market.ts` - 市场数据类型

### 额外配置
- `.env.example` - 环境变量示例
- `.eslintrc.json` - ESLint规则
- `.prettierrc` - Prettier配置
- `docker-compose.yml` - 本地开发环境

### 更多页面
- `src/app/backtest/page.tsx` - 回测页面
- `src/app/settings/page.tsx` - 设置页面
- `src/app/portfolio/page.tsx` - 资产组合页面
- `src/app/history/page.tsx` - 历史记录页面

### 更多组件
- `src/components/backtest/BacktestPanel.tsx`
- `src/components/backtest/ResultsChart.tsx`
- `src/components/strategy/StrategyBuilder.tsx`

---

## 文件大小统计

```
总代码行数: ~3,500 行
平均文件大小: ~125 行

最大文件:
- store/index.ts: ~250 行
- lib/api.ts: ~240 行
- lib/websocket.ts: ~230 行

最小文件:
- components/layout/MainLayout.tsx: ~20 行
- app/page.tsx: ~5 行
```

---

## 依赖关系图

```
app/
  └─> components/
       ├─> ui/
       │    └─> lib/utils.ts
       ├─> layout/
       ├─> dashboard/
       ├─> trading/
       └─> strategy/

hooks/
  ├─> store/
  ├─> lib/api.ts
  └─> lib/websocket.ts

lib/api.ts
  └─> store/

lib/websocket.ts
  └─> store/
```

---

**最后更新**: 2025-12-24
**文件版本**: 1.0
**维护者**: Delta Terminal 前端团队
