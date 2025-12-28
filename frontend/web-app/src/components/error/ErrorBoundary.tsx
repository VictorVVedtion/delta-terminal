'use client'

import { AlertTriangle, Bug, Home, RefreshCw } from 'lucide-react'
import React from 'react'

import { Button } from '@/components/ui/button'
import { reportBoundaryError } from '@/lib/error-reporter'
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

    // 上报错误到错误追踪服务
    reportBoundaryError(error, errorInfo.componentStack ?? undefined, {
      severity: 'high',
      context: {
        errorBoundary: 'GlobalErrorBoundary',
        timestamp: new Date().toISOString(),
      },
    })

    // Call optional error handler
    this.props.onError?.(error, errorInfo)
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
      <div className="max-w-lg w-full">
        {/* Glass Card Container */}
        <div className="glass rounded-2xl p-8 space-y-6">
          {/* Icon with Glow */}
          <div className="text-center">
            <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center relative">
              <div className="absolute inset-0 rounded-full bg-destructive/20 blur-xl animate-pulse" />
              <AlertTriangle className="w-10 h-10 text-destructive relative z-10" />
            </div>
          </div>

          {/* Title & Message */}
          <div className="space-y-3 text-center">
            <h2 className="text-2xl font-semibold text-foreground">
              出现了一些问题
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed">
              抱歉，应用程序遇到了意外错误。
              <br />
              请尝试刷新页面或返回首页。
            </p>
          </div>

          {/* Error Message (if available) */}
          {error && showDetails && (
            <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20">
              <div className="flex items-start gap-2">
                <Bug className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-destructive mb-1">
                    错误信息
                  </p>
                  <p className="text-sm font-mono text-destructive/80 break-all">
                    {error.message}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {onReset && (
              <Button
                variant="outline"
                onClick={onReset}
                className="flex-1 hover:bg-accent/50 transition-all"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                重试
              </Button>
            )}
            {onReload && (
              <Button
                variant="outline"
                onClick={onReload}
                className="flex-1 hover:bg-accent/50 transition-all"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                刷新页面
              </Button>
            )}
            {onGoHome && (
              <Button
                onClick={onGoHome}
                className="flex-1 bg-primary hover:bg-primary/90 transition-all"
              >
                <Home className="w-4 h-4 mr-2" />
                返回首页
              </Button>
            )}
          </div>

          {/* Stack Trace (dev only) */}
          {showDetails && errorInfo && (
            <div className="pt-4 border-t border-border/50">
              <button
                onClick={() => { setShowStack(!showStack); }}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-2 mx-auto transition-colors"
                type="button"
              >
                <Bug className="w-3.5 h-3.5" />
                <span className="font-medium">
                  {showStack ? '隐藏详情' : '显示错误详情'}
                </span>
              </button>

              {showStack && (
                <div className="mt-4 p-4 rounded-xl bg-muted/50 border border-border/30">
                  <pre className="text-left text-xs overflow-auto max-h-48 scrollbar-thin">
                    <code className="text-muted-foreground font-mono">
                      {errorInfo.componentStack}
                    </code>
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Help Text */}
        <p className="text-center text-xs text-muted-foreground mt-4">
          如果问题持续出现，请联系技术支持
        </p>
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
            onReload={() => { window.location.reload(); }}
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
      onError={(error, errorInfo) => {
        reportBoundaryError(error, errorInfo.componentStack ?? undefined, {
          severity: 'medium',
          context: {
            componentName: name,
            errorBoundary: 'ComponentErrorBoundary',
          },
        })
      }}
      fallback={fallback || (
        <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-destructive">
                {name} 加载失败
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                组件出现错误，请尝试刷新页面
              </p>
            </div>
          </div>
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
