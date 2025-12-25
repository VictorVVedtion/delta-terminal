# Delta Terminal Web - 快速开始指南

> 5分钟启动你的交易终端前端

## 前置要求

确保你已安装：

- Node.js >= 18.x
- pnpm >= 8.x (推荐) 或 npm >= 9.x

## 快速启动

### 1. 安装依赖

```bash
cd frontend/web-app
pnpm install
```

### 2. 配置环境变量

创建 `.env.local` 文件：

```bash
# 复制示例配置
cp .env.example .env.local

# 或手动创建
cat > .env.local << 'EOF'
# API配置
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_WS_URL=ws://localhost:4000

# 应用配置
NEXT_PUBLIC_APP_NAME=Delta Terminal
NEXT_PUBLIC_APP_VERSION=0.1.0
EOF
```

### 3. 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000

你将看到：
- ✅ 仪表盘界面
- ✅ 模拟市场数据
- ✅ 交易界面
- ✅ AI策略助手

## 项目结构速览

```
src/
├── app/                 # 页面路由
│   ├── dashboard/       # 仪表盘
│   ├── trading/         # 交易
│   └── strategies/      # 策略
│
├── components/          # 组件
│   ├── ui/             # UI基础组件
│   ├── layout/         # 布局
│   ├── dashboard/      # 仪表盘组件
│   ├── trading/        # 交易组件
│   └── strategy/       # 策略组件
│
├── lib/                # 工具库
│   ├── api.ts         # API客户端
│   ├── websocket.ts   # WebSocket客户端
│   └── utils.ts       # 工具函数
│
├── hooks/              # 自定义Hooks
│   ├── useMarketData.ts
│   └── useStrategy.ts
│
└── store/              # 状态管理
    └── index.ts
```

## 核心功能演示

### 1. 查看仪表盘

访问 http://localhost:3000/dashboard

功能：
- 总资产展示
- 盈亏曲线图
- 活跃策略统计
- 最近交易记录

### 2. 进行交易

访问 http://localhost:3000/trading

功能：
- K线图表（多时间周期）
- 实时订单簿
- 市价单/限价单下单
- 成交历史

### 3. 创建策略

访问 http://localhost:3000/strategies

功能：
- 查看现有策略
- AI对话创建策略
- 启动/暂停策略
- 性能监控

## 开发命令

```bash
# 启动开发服务器（Turbopack）
pnpm dev

# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start

# 类型检查
pnpm type-check

# 代码检查
pnpm lint

# 清理缓存
pnpm clean
```

## 常用操作

### 添加新页面

```bash
# 创建页面目录
mkdir -p src/app/my-page

# 创建页面文件
cat > src/app/my-page/page.tsx << 'EOF'
import { MainLayout } from '@/components/layout/MainLayout'

export default function MyPage() {
  return (
    <MainLayout>
      <h1>My New Page</h1>
    </MainLayout>
  )
}
EOF
```

访问 http://localhost:3000/my-page

### 使用 API 客户端

```typescript
import { apiClient } from '@/lib/api'

// 获取市场数据
const data = await apiClient.getMarketData('BTC/USDT')

// 创建订单
const order = await apiClient.createOrder({
  symbol: 'BTC/USDT',
  side: 'buy',
  type: 'market',
  amount: 0.1
})
```

### 使用 WebSocket

```typescript
import { wsClient } from '@/lib/websocket'

// 连接
await wsClient.connect()

// 订阅实时价格
wsClient.subscribeTicker('BTC/USDT', (data) => {
  console.log('Price:', data.price)
})
```

### 使用状态管理

```typescript
import { useAuthStore, useMarketStore } from '@/store'

function MyComponent() {
  // 认证状态
  const { user, isAuthenticated } = useAuthStore()

  // 市场数据
  const { activeSymbol, setActiveSymbol } = useMarketStore()

  return <div>Current Symbol: {activeSymbol}</div>
}
```

### 使用自定义 Hooks

```typescript
import { useMarketData } from '@/hooks/useMarketData'
import { useStrategies } from '@/hooks/useStrategy'

function TradingComponent() {
  // 市场数据
  const { marketData, loading } = useMarketData('BTC/USDT')

  // 策略管理
  const { strategies, createStrategy } = useStrategies()

  return <div>Price: {marketData?.price}</div>
}
```

## 数据模拟

当前版本使用模拟数据，无需后端即可运行。

### 模拟数据位置

- `src/app/dashboard/page.tsx` - 仪表盘数据
- `src/app/trading/page.tsx` - 交易数据
- `src/app/strategies/page.tsx` - 策略数据

### 连接真实后端

1. 启动后端服务（参考 backend 文档）

2. 更新 `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_WS_URL=ws://localhost:4000
```

3. 组件将自动使用真实 API

## 调试技巧

### 查看状态

安装 Redux DevTools 浏览器扩展，可以查看所有 Zustand store 状态。

### 查看 API 请求

打开浏览器控制台 → Network 标签，查看所有 HTTP 请求。

### 查看 WebSocket

控制台输入：
```javascript
wsClient.isConnected()  // 检查连接状态
```

### 热重载

修改任何文件后，页面会自动刷新（Turbopack 支持）。

## 故障排除

### 端口被占用

```bash
# 使用其他端口
pnpm dev -p 3001
```

### 依赖安装失败

```bash
# 清理缓存
pnpm clean

# 删除 node_modules
rm -rf node_modules

# 重新安装
pnpm install
```

### 类型错误

```bash
# 运行类型检查
pnpm type-check

# 查看详细错误
npx tsc --noEmit --pretty
```

### 样式不生效

```bash
# 检查 Tailwind 配置
npx tailwindcss -i src/app/globals.css -o output.css --watch
```

## 下一步

- 📖 阅读 [完整文档](./README.md)
- 🎯 查看 [组件文档](./CLAUDE.md)
- 📝 了解 [文件结构](./FILES.md)
- 🔧 配置后端连接
- 🎨 自定义主题
- 🚀 部署到生产环境

## 生产部署

### Vercel (推荐)

```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel
```

### Docker

```bash
# 构建镜像
docker build -t delta-web .

# 运行容器
docker run -p 3000:3000 delta-web
```

### 手动部署

```bash
# 构建
pnpm build

# 启动
pnpm start
```

## 获取帮助

- 查看项目文档
- 提交 GitHub Issue
- 联系开发团队

---

**祝你使用愉快！** 🚀
