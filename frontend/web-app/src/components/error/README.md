# Error Boundary 组件

全局错误边界处理系统，提供优雅的错误降级 UI 和完整的错误上报功能。

## 功能特性

- ✅ **React 18 Error Boundary 模式**：符合 React 最新最佳实践
- ✅ **优雅降级 UI**：匹配 RiverBit 设计系统的错误提示界面
- ✅ **错误上报**：集成错误日志记录和外部监控服务支持
- ✅ **多层级边界**：支持全局和组件级错误捕获
- ✅ **中文界面**：友好的中文错误提示
- ✅ **开发者工具**：开发环境显示详细错误堆栈

## 组件列表

### 1. PageErrorBoundary

全局页面级错误边界，捕获整个应用的未处理错误。

**使用位置**: `app/layout.tsx`

```tsx
import { PageErrorBoundary } from '@/components/error/ErrorBoundary'

export default function RootLayout({ children }) {
  return (
    <PageErrorBoundary>
      {/* 你的应用内容 */}
      {children}
    </PageErrorBoundary>
  )
}
```

**特点**:
- 全屏错误提示
- 提供"刷新页面"和"返回首页"按钮
- 自动上报为 `high` 严重级别

### 2. ComponentErrorBoundary

组件级错误边界，隔离单个组件的错误，不影响页面其他部分。

```tsx
import { ComponentErrorBoundary } from '@/components/error'

export function MyFeature() {
  return (
    <ComponentErrorBoundary name="我的功能模块">
      <MyComponent />
    </ComponentErrorBoundary>
  )
}
```

**Props**:
- `children`: 要保护的组件
- `name`: 组件名称（用于错误报告）
- `fallback`: 自定义错误 UI（可选）

**特点**:
- 紧凑的错误提示
- 不影响页面其他部分
- 自动上报为 `medium` 严重级别

### 3. ErrorBoundary

基础错误边界组件，提供最大灵活性。

```tsx
import { ErrorBoundary, ErrorFallback } from '@/components/error'

export function CustomFeature() {
  return (
    <ErrorBoundary
      fallback={
        <ErrorFallback
          error={null}
          onReset={() => window.location.reload()}
        />
      }
      onError={(error, errorInfo) => {
        // 自定义错误处理
        console.error('Custom error handler:', error)
      }}
    >
      <MyComponent />
    </ErrorBoundary>
  )
}
```

**Props**:
- `children`: 要保护的组件
- `fallback`: 错误时显示的 UI
- `onError`: 错误回调函数
- `showDetails`: 是否显示错误详情（默认开发环境启用）

### 4. ErrorFallback

错误降级 UI 组件，可单独使用。

```tsx
import { ErrorFallback } from '@/components/error'

<ErrorFallback
  error={error}
  errorInfo={errorInfo}
  showDetails={true}
  onReset={() => reset()}
  onReload={() => window.location.reload()}
  onGoHome={() => router.push('/dashboard')}
/>
```

**Props**:
- `error`: Error 对象
- `errorInfo`: React 错误信息
- `showDetails`: 是否显示详细错误
- `onReset`: 重试按钮回调
- `onReload`: 刷新页面回调
- `onGoHome`: 返回首页回调

## 错误上报系统

### 错误上报服务

位置: `lib/error-reporter.ts`

提供统一的错误收集和上报功能。

```typescript
import { reportError, reportBoundaryError, reportNetworkError } from '@/lib/error-reporter'

// 上报运行时错误
try {
  // 你的代码
} catch (error) {
  reportError(error, {
    severity: 'medium',
    context: { feature: 'my-feature' }
  })
}

// 上报边界错误（自动在 ErrorBoundary 中调用）
reportBoundaryError(error, componentStack, {
  severity: 'high',
  context: { componentName: 'MyComponent' }
})

// 上报网络错误
reportNetworkError(error, {
  url: '/api/data',
  method: 'GET',
  statusCode: 500
})
```

### 错误严重级别

- `low`: 低优先级错误（不影响核心功能）
- `medium`: 中等优先级（影响部分功能）
- `high`: 高优先级（影响主要功能）
- `critical`: 严重错误（应用无法使用）

### 错误类型

- `runtime`: 运行时错误
- `boundary`: 边界捕获的错误
- `network`: 网络请求错误
- `unknown`: 未知类型错误

### 开发 vs 生产环境

**开发环境**:
- 完整的错误堆栈输出到控制台
- 彩色分级日志
- 错误详情面板可展开/折叠

**生产环境**:
- 错误发送到外部监控服务（待集成）
- 友好的用户提示
- 隐藏技术细节

## 集成外部监控服务

### Sentry 集成（示例）

在 `lib/error-reporter.ts` 中取消注释 Sentry 代码：

```typescript
// 1. 安装 Sentry SDK
npm install @sentry/nextjs

// 2. 初始化 Sentry
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
})

// 3. 在 error-reporter.ts 中启用上报
private sendToExternalService(errorReport: ErrorReport): void {
  if (typeof Sentry !== 'undefined') {
    Sentry.captureException(new Error(errorReport.message), {
      level: this.mapSeverityToSentryLevel(errorReport.severity),
      contexts: {
        error: {
          type: errorReport.type,
          componentStack: errorReport.componentStack,
        },
      },
      extra: errorReport.context,
    })
  }
}
```

### LogRocket 集成（示例）

```typescript
// 1. 安装 LogRocket
npm install logrocket

// 2. 初始化
import LogRocket from 'logrocket'

LogRocket.init('your-app-id')

// 3. 在错误上报中记录
LogRocket.captureException(error, {
  tags: {
    severity: errorReport.severity,
    type: errorReport.type,
  },
  extra: errorReport.context,
})
```

## 测试

### 访问测试页面

开发环境访问: `http://localhost:3000/test-error-boundary`

### 手动测试

```tsx
// 1. 测试组件级错误
<ComponentErrorBoundary name="测试组件">
  <BuggyComponent />
</ComponentErrorBoundary>

// 2. 测试全局错误
function BuggyComponent() {
  throw new Error('测试错误')
  return <div>不会渲染</div>
}
```

### 测试异步错误

```tsx
function AsyncBuggy() {
  useEffect(() => {
    throw new Error('异步错误')
  }, [])

  return <div>组件</div>
}
```

## 最佳实践

### 1. 分层使用错误边界

```tsx
// 全局边界
<PageErrorBoundary>
  {/* 页面级边界 */}
  <ComponentErrorBoundary name="侧边栏">
    <Sidebar />
  </ComponentErrorBoundary>

  <main>
    {/* 功能模块边界 */}
    <ComponentErrorBoundary name="交易面板">
      <TradingPanel />
    </ComponentErrorBoundary>
  </main>
</PageErrorBoundary>
```

### 2. 为关键组件添加边界

对以下类型的组件添加错误边界：
- 第三方组件集成
- 复杂的数据可视化
- WebSocket 实时数据组件
- 动态导入的组件

```tsx
import dynamic from 'next/dynamic'

const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <Skeleton />,
  ssr: false,
})

export function Dashboard() {
  return (
    <ComponentErrorBoundary name="图表">
      <HeavyChart />
    </ComponentErrorBoundary>
  )
}
```

### 3. 提供有意义的错误消息

```tsx
// ❌ 不好
throw new Error('Error')

// ✅ 好
throw new Error('获取市场数据失败: API 返回 500 错误')
```

### 4. 添加错误上下文

```tsx
try {
  await processOrder(orderId)
} catch (error) {
  reportError(error, {
    severity: 'high',
    context: {
      orderId,
      timestamp: Date.now(),
      userAction: 'place_order',
    }
  })
}
```

## 常见问题

### Q: ErrorBoundary 为什么不能捕获事件处理器中的错误？

A: ErrorBoundary 只能捕获组件渲染、生命周期方法和构造函数中的错误。对于事件处理器，需要手动 try-catch：

```tsx
const handleClick = async () => {
  try {
    await someAsyncOperation()
  } catch (error) {
    reportError(error)
    toast.error('操作失败')
  }
}
```

### Q: 如何处理 Promise 拒绝？

A: 使用全局 Promise 拒绝处理器：

```tsx
// app/layout.tsx
useEffect(() => {
  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    reportError(new Error(event.reason), {
      severity: 'high',
      context: { type: 'unhandled_promise_rejection' }
    })
  }

  window.addEventListener('unhandledrejection', handleUnhandledRejection)
  return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection)
}, [])
```

### Q: 如何在生产环境测试错误边界？

A: 创建一个隐藏的测试路由：

```tsx
// app/secret-error-test/page.tsx
'use client'

export default function ErrorTest() {
  const [shouldThrow, setShouldThrow] = useState(false)

  if (shouldThrow) {
    throw new Error('生产环境测试错误')
  }

  return (
    <button onClick={() => setShouldThrow(true)}>
      触发错误
    </button>
  )
}
```

## 性能考虑

1. **错误队列限制**: 错误队列最多保存 50 个错误，防止内存泄漏
2. **去重**: 考虑添加错误去重逻辑，避免重复上报相同错误
3. **批量上报**: 对于高频错误，可以考虑批量上报

## 更新日志

### v1.0.0 (2025-12-28)
- ✅ 初始实现
- ✅ 集成 RiverBit 设计系统
- ✅ 添加错误上报服务
- ✅ 创建测试页面
- ✅ 集成到全局 Layout

## 相关资源

- [React Error Boundaries 文档](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [Next.js Error Handling](https://nextjs.org/docs/app/building-your-application/routing/error-handling)
- [Sentry Next.js 集成](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
