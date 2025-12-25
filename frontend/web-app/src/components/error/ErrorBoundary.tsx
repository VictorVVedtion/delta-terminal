'use client'

import React from 'react'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

interface ErrorBoundaryProps {
  children: React.ReactNode
  /** Fallback component to render on error */
  fallback?: React.ReactNode | undefined
  /** Called when error is caught */
  onError?: ((error: Error, errorInfo: React.ErrorInfo) => void) | undefined
  /** Whether to show detailed error info (dev mode) */
  showDetails?: boolean | undefined
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

// =============================================================================
// ErrorBoundary Component
// =============================================================================

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo })

    // Log error to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    // Call optional error handler
    this.props.onError?.(error, errorInfo)

    // TODO: Send error to monitoring service (Sentry, etc.)
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/dashboard'
  }

  override render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          showDetails={this.props.showDetails}
          onReset={this.handleReset}
          onReload={this.handleReload}
          onGoHome={this.handleGoHome}
        />
      )
    }

    return this.props.children
  }
}

// =============================================================================
// ErrorFallback Component
// =============================================================================

interface ErrorFallbackProps {
  error: Error | null
  errorInfo?: React.ErrorInfo | null | undefined
  showDetails?: boolean | undefined
  onReset?: (() => void) | undefined
  onReload?: (() => void) | undefined
  onGoHome?: (() => void) | undefined
  className?: string | undefined
}

export function ErrorFallback({
  error,
  errorInfo,
  showDetails = process.env.NODE_ENV === 'development',
  onReset,
  onReload,
  onGoHome,
  className,
}: ErrorFallbackProps) {
  const [showStack, setShowStack] = React.useState(false)

  return (
    <div
      className={cn(
        'min-h-[400px] flex items-center justify-center p-8',
        className,
      )}
    >
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>

        {/* Title & Message */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">出现了一些问题</h2>
          <p className="text-muted-foreground text-sm">
            抱歉，应用程序遇到了意外错误。请尝试刷新页面或返回首页。
          </p>
        </div>

        {/* Error Message (if available) */}
        {error && showDetails && (
          <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20 text-left">
            <p className="text-sm font-mono text-destructive break-all">
              {error.message}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onReset && (
            <Button variant="outline" onClick={onReset}>
              <RefreshCw className="w-4 h-4 mr-2" />
              重试
            </Button>
          )}
          {onReload && (
            <Button variant="outline" onClick={onReload}>
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新页面
            </Button>
          )}
          {onGoHome && (
            <Button onClick={onGoHome}>
              <Home className="w-4 h-4 mr-2" />
              返回首页
            </Button>
          )}
        </div>

        {/* Stack Trace (dev only) */}
        {showDetails && errorInfo && (
          <div className="pt-4 border-t">
            <button
              onClick={() => setShowStack(!showStack)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mx-auto"
            >
              <Bug className="w-3 h-3" />
              {showStack ? '隐藏详情' : '显示错误详情'}
            </button>

            {showStack && (
              <pre className="mt-4 p-4 rounded-lg bg-muted text-left text-xs overflow-auto max-h-48 scrollbar-thin">
                <code className="text-muted-foreground">
                  {errorInfo.componentStack}
                </code>
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// PageErrorBoundary - Full page error boundary
// =============================================================================

interface PageErrorBoundaryProps {
  children: React.ReactNode
  onError?: ((error: Error, errorInfo: React.ErrorInfo) => void) | undefined
}

export function PageErrorBoundary({ children, onError }: PageErrorBoundaryProps) {
  return (
    <ErrorBoundary
      onError={onError}
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <ErrorFallback
            error={null}
            onReload={() => window.location.reload()}
            onGoHome={() => window.location.href = '/dashboard'}
          />
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

// =============================================================================
// ComponentErrorBoundary - For individual components
// =============================================================================

interface ComponentErrorBoundaryProps {
  children: React.ReactNode
  name?: string | undefined
  fallback?: React.ReactNode | undefined
}

export function ComponentErrorBoundary({
  children,
  name = 'Component',
  fallback,
}: ComponentErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={fallback || (
        <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">
              {name} 加载失败
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            请刷新页面重试
          </p>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  )
}

// =============================================================================
// Exports
// =============================================================================

export default ErrorBoundary
