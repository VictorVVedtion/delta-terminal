'use client'

/**
 * ErrorBoundary 演示组件
 *
 * 用于测试和演示 ErrorBoundary 的功能
 * 仅在开发环境中使用
 */

import { AlertTriangle, Bug } from 'lucide-react'
import React from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { ComponentErrorBoundary } from './ErrorBoundary'

// =============================================================================
// Demo Components
// =============================================================================

/**
 * 会抛出错误的组件
 */
function BuggyComponent({ shouldThrow = false }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('这是一个测试错误！ErrorBoundary 应该捕获它。')
  }

  return (
    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
      <div className="flex items-center gap-2 text-green-500">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-sm font-medium">组件运行正常</span>
      </div>
    </div>
  )
}

/**
 * 异步错误组件
 */
function AsyncBuggyComponent() {
  const [hasError, setHasError] = React.useState(false)

  React.useEffect(() => {
    if (hasError) {
      // 模拟异步操作中的错误
      throw new Error('异步操作中发生错误！')
    }
  }, [hasError])

  return (
    <div className="space-y-3">
      <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
        <div className="flex items-center gap-2 text-blue-500">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-sm font-medium">异步组件运行正常</span>
        </div>
      </div>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => { setHasError(true); }}
      >
        <Bug className="w-4 h-4 mr-2" />
        触发异步错误
      </Button>
    </div>
  )
}

// =============================================================================
// Main Demo Component
// =============================================================================

export function ErrorBoundaryDemo() {
  const [throwError, setThrowError] = React.useState(false)
  const [resetKey, setResetKey] = React.useState(0)

  const handleReset = () => {
    setThrowError(false)
    setResetKey(prev => prev + 1)
  }

  // 仅在开发环境显示
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
          ErrorBoundary 测试面板
        </CardTitle>
        <CardDescription>
          测试不同场景下的错误边界处理 (仅开发环境可见)
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Test 1: Component Error Boundary */}
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold mb-1">测试 1: 组件级错误边界</h3>
            <p className="text-xs text-muted-foreground">
              ComponentErrorBoundary 可以捕获单个组件的错误，不影响页面其他部分
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ComponentErrorBoundary key={resetKey} name="测试组件">
              <BuggyComponent shouldThrow={throwError} />
            </ComponentErrorBoundary>

            <div className="space-y-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => { setThrowError(true); }}
                disabled={throwError}
                className="w-full"
              >
                <Bug className="w-4 h-4 mr-2" />
                {throwError ? '已触发错误' : '触发组件错误'}
              </Button>
              {throwError && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="w-full"
                >
                  重置组件
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Test 2: Async Error */}
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold mb-1">测试 2: 异步错误处理</h3>
            <p className="text-xs text-muted-foreground">
              ErrorBoundary 也可以捕获 useEffect 等生命周期中的错误
            </p>
          </div>

          <ComponentErrorBoundary key={`async-${resetKey}`} name="异步组件">
            <AsyncBuggyComponent />
          </ComponentErrorBoundary>
        </div>

        {/* Test 3: Error Reporting Info */}
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold mb-1">错误上报功能</h3>
            <p className="text-xs text-muted-foreground">
              当错误发生时，错误信息会自动：
            </p>
          </div>

          <ul className="space-y-2 text-xs text-muted-foreground ml-4">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>
                在开发环境：完整的错误堆栈和组件堆栈会输出到浏览器控制台
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>
                在生产环境：错误会发送到外部监控服务（如 Sentry）
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>
                包含丰富的上下文信息：URL、用户代理、组件名称、时间戳等
              </span>
            </li>
          </ul>

          <div className="p-3 rounded-lg bg-muted/50 border border-border/30">
            <p className="text-xs font-mono text-muted-foreground">
              💡 提示: 打开浏览器控制台查看详细的错误报告
            </p>
          </div>
        </div>

        {/* Test 4: Global Error Boundary Info */}
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold mb-1">全局错误边界</h3>
            <p className="text-xs text-muted-foreground">
              app/layout.tsx 已配置全局 PageErrorBoundary，可捕获整个应用的未处理错误
            </p>
          </div>

          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="text-xs space-y-2">
              <p className="font-medium text-primary">集成位置：</p>
              <pre className="font-mono text-muted-foreground overflow-x-auto">
{`<PageErrorBoundary>
  <AuthProvider>
    <ThemeProvider>
      <WebSocketProvider>
        {children}
      </WebSocketProvider>
    </ThemeProvider>
  </AuthProvider>
</PageErrorBoundary>`}
              </pre>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
