# Error Boundary 使用指南

## 快速开始

### 1. 全局错误边界（已集成）

全局 `PageErrorBoundary` 已经在 `app/layout.tsx` 中集成，无需额外配置。

```tsx
// app/layout.tsx (已完成)
import { PageErrorBoundary } from '@/components/error/ErrorBoundary'

export default function RootLayout({ children }) {
  return (
    <PageErrorBoundary>
      {children}
    </PageErrorBoundary>
  )
}
```

### 2. 保护单个组件

为可能出错的组件添加错误边界：

```tsx
import { ComponentErrorBoundary } from '@/components/error'

export function MyPage() {
  return (
    <div>
      <h1>我的页面</h1>

      {/* 保护可能出错的组件 */}
      <ComponentErrorBoundary name="交易图表">
        <TradingChart />
      </ComponentErrorBoundary>

      <ComponentErrorBoundary name="订单列表">
        <OrderList />
      </ComponentErrorBoundary>
    </div>
  )
}
```

### 3. 手动错误上报

在 try-catch 中手动上报错误：

```tsx
import { reportError } from '@/lib/error-reporter'

async function handleSubmit() {
  try {
    await submitOrder(orderData)
  } catch (error) {
    // 上报错误
    reportError(error as Error, {
      severity: 'high',
      context: {
        action: 'submit_order',
        orderId: orderData.id,
      }
    })

    // 显示用户友好的错误提示
    toast.error('提交订单失败，请稍后重试')
  }
}
```

## 常见使用场景

### 场景 1: 保护第三方组件

```tsx
import { ComponentErrorBoundary } from '@/components/error'
import { TradingViewChart } from 'third-party-lib'

export function ChartWidget() {
  return (
    <ComponentErrorBoundary name="TradingView 图表">
      <TradingViewChart symbol="BTC/USDT" />
    </ComponentErrorBoundary>
  )
}
```

### 场景 2: 保护异步数据加载

```tsx
import { ComponentErrorBoundary } from '@/components/error'

export function DataTable() {
  return (
    <ComponentErrorBoundary name="数据表格">
      <Suspense fallback={<TableSkeleton />}>
        <AsyncDataTable />
      </Suspense>
    </ComponentErrorBoundary>
  )
}

function AsyncDataTable() {
  const data = use(fetchData()) // React 19 use hook
  return <Table data={data} />
}
```

### 场景 3: 自定义错误 UI

```tsx
import { ErrorBoundary } from '@/components/error'

export function CustomFeature() {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-8 text-center">
          <h3>功能暂时不可用</h3>
          <p className="text-sm text-muted-foreground mt-2">
            我们正在修复此问题，请稍后再试
          </p>
          <Button onClick={() => window.location.reload()}>
            刷新页面
          </Button>
        </div>
      }
    >
      <MyFeature />
    </ErrorBoundary>
  )
}
```

### 场景 4: 上报网络错误

```tsx
import { reportNetworkError } from '@/lib/error-reporter'

async function fetchMarketData(symbol: string) {
  try {
    const response = await fetch(`/api/market/${symbol}`)

    if (!response.ok) {
      const error = new Error(`获取市场数据失败: ${response.statusText}`)

      reportNetworkError(error, {
        url: `/api/market/${symbol}`,
        method: 'GET',
        statusCode: response.status,
        severity: response.status >= 500 ? 'high' : 'medium',
      })

      throw error
    }

    return await response.json()
  } catch (error) {
    // 处理网络错误
    reportNetworkError(error as Error, {
      url: `/api/market/${symbol}`,
      method: 'GET',
      severity: 'high',
    })

    throw error
  }
}
```

### 场景 5: 嵌套错误边界

```tsx
import { ComponentErrorBoundary, PageErrorBoundary } from '@/components/error'

export function TradingDashboard() {
  return (
    <PageErrorBoundary>
      <div className="grid grid-cols-3 gap-4">
        {/* 左侧面板 */}
        <ComponentErrorBoundary name="市场列表">
          <MarketList />
        </ComponentErrorBoundary>

        {/* 中间面板 */}
        <div className="col-span-2 space-y-4">
          <ComponentErrorBoundary name="图表">
            <TradingChart />
          </ComponentErrorBoundary>

          <ComponentErrorBoundary name="订单表单">
            <OrderForm />
          </ComponentErrorBoundary>
        </div>

        {/* 右侧面板 */}
        <ComponentErrorBoundary name="订单簿">
          <OrderBook />
        </ComponentErrorBoundary>
      </div>
    </PageErrorBoundary>
  )
}
```

### 场景 6: 动态导入组件

```tsx
import dynamic from 'next/dynamic'
import { ComponentErrorBoundary } from '@/components/error'

const HeavyComponent = dynamic(
  () => import('./HeavyComponent'),
  {
    loading: () => <Skeleton />,
    ssr: false,
  }
)

export function DashboardPage() {
  return (
    <ComponentErrorBoundary name="重型组件">
      <HeavyComponent />
    </ComponentErrorBoundary>
  )
}
```

## 测试错误边界

### 开发环境测试

访问测试页面: `http://localhost:3000/test-error-boundary`

### 创建测试组件

```tsx
'use client'

import { useState } from 'react'
import { ComponentErrorBoundary } from '@/components/error'
import { Button } from '@/components/ui/button'

function BuggyComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('测试错误！')
  }
  return <div>组件正常工作</div>
}

export function ErrorTest() {
  const [throwError, setThrowError] = useState(false)

  return (
    <div className="p-8 space-y-4">
      <ComponentErrorBoundary name="测试组件">
        <BuggyComponent shouldThrow={throwError} />
      </ComponentErrorBoundary>

      <Button onClick={() => setThrowError(true)}>
        触发错误
      </Button>
    </div>
  )
}
```

## 错误上报最佳实践

### 1. 选择合适的严重级别

```tsx
// Low - 不影响核心功能
reportError(error, { severity: 'low' })

// Medium - 影响部分功能（默认）
reportError(error, { severity: 'medium' })

// High - 影响主要功能
reportError(error, { severity: 'high' })

// Critical - 应用无法使用
reportError(error, { severity: 'critical' })
```

### 2. 添加有用的上下文

```tsx
reportError(error, {
  severity: 'high',
  context: {
    userId: user.id,
    action: 'place_order',
    symbol: 'BTC/USDT',
    orderType: 'LIMIT',
    timestamp: Date.now(),
    environment: process.env.NODE_ENV,
  }
})
```

### 3. 在关键操作前后上报

```tsx
async function criticalOperation() {
  const startTime = Date.now()

  try {
    const result = await performOperation()

    // 成功日志（可选）
    console.log('Operation completed', {
      duration: Date.now() - startTime
    })

    return result
  } catch (error) {
    reportError(error as Error, {
      severity: 'critical',
      context: {
        operation: 'criticalOperation',
        duration: Date.now() - startTime,
        startTime,
      }
    })

    throw error
  }
}
```

## 查看错误日志

### 开发环境

打开浏览器控制台，错误会以彩色格式显示：

```
🚨 Error Report [boundary] - high
Message: 组件渲染失败
Stack: Error: 组件渲染失败...
Component Stack: at MyComponent...
Context: {errorBoundary: "GlobalErrorBoundary", ...}
Timestamp: 2025-12-28T12:00:00.000Z
```

### 生产环境

错误会发送到配置的监控服务（如 Sentry），在控制台只显示简化信息。

## 故障排除

### 问题：ErrorBoundary 不捕获错误

**可能原因**：
1. 错误发生在事件处理器中（需手动 try-catch）
2. 错误发生在异步代码中（需要在组件生命周期中重新抛出）
3. 错误发生在 ErrorBoundary 外部

**解决方案**：

```tsx
// ✅ 正确：在组件渲染中抛出
function MyComponent() {
  if (error) {
    throw new Error('Render error')
  }
  return <div>Content</div>
}

// ✅ 正确：在 useEffect 中抛出
function MyComponent() {
  useEffect(() => {
    if (shouldThrow) {
      throw new Error('Effect error')
    }
  }, [shouldThrow])
}

// ❌ 错误：在事件处理器中抛出（不会被捕获）
function MyComponent() {
  const handleClick = () => {
    throw new Error('Event error') // 不会被 ErrorBoundary 捕获！
  }

  return <button onClick={handleClick}>Click</button>
}

// ✅ 正确：在事件处理器中手动处理
function MyComponent() {
  const handleClick = async () => {
    try {
      await riskyOperation()
    } catch (error) {
      reportError(error as Error)
      toast.error('操作失败')
    }
  }

  return <button onClick={handleClick}>Click</button>
}
```

## 下一步

- 查看 [完整文档](./README.md)
- 查看 [测试页面](/test-error-boundary)
- 集成 [Sentry](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
