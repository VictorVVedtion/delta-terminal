import { ErrorBoundaryDemo } from '@/components/error'

/**
 * ErrorBoundary 测试页面
 *
 * 访问 /test-error-boundary 来测试错误边界功能
 * 仅在开发环境可用
 */
export default function TestErrorBoundaryPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">ErrorBoundary 测试</h1>
          <p className="text-muted-foreground">
            测试应用的错误处理和边界捕获功能
          </p>
        </div>

        <ErrorBoundaryDemo />
      </div>
    </div>
  )
}
