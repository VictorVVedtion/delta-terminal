'use client'

import { AlertCircle, Clock, RefreshCw, Server, WifiOff, X } from 'lucide-react'
import React from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// =============================================================================
// API Error Types
// =============================================================================

export interface ApiErrorInfo {
  code: string
  message: string
  status?: number | undefined
  details?: unknown | undefined
}

export type ApiErrorType =
  | 'network'      // Network/connection error
  | 'timeout'      // Request timeout
  | 'server'       // 5xx server errors
  | 'client'       // 4xx client errors
  | 'auth'         // 401/403 authentication errors
  | 'validation'   // 400 validation errors
  | 'notfound'     // 404 not found
  | 'unknown'      // Unknown errors

// =============================================================================
// Error Type Detection
// =============================================================================

export function getApiErrorType(error: ApiErrorInfo | Error): ApiErrorType {
  if (error instanceof Error) {
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'network'
    }
    if (error.message.includes('timeout')) {
      return 'timeout'
    }
    return 'unknown'
  }

  const status = error.status
  if (!status) return 'unknown'

  if (status === 401 || status === 403) return 'auth'
  if (status === 400) return 'validation'
  if (status === 404) return 'notfound'
  if (status >= 400 && status < 500) return 'client'
  if (status >= 500) return 'server'

  return 'unknown'
}

// =============================================================================
// Error Display Config
// =============================================================================

const errorConfig: Record<ApiErrorType, {
  icon: React.ReactNode
  title: string
  message: string
  color: string
}> = {
  network: {
    icon: <WifiOff className="w-5 h-5" />,
    title: '网络连接失败',
    message: '请检查您的网络连接后重试',
    color: 'text-orange-500',
  },
  timeout: {
    icon: <Clock className="w-5 h-5" />,
    title: '请求超时',
    message: '服务器响应时间过长，请稍后重试',
    color: 'text-yellow-500',
  },
  server: {
    icon: <Server className="w-5 h-5" />,
    title: '服务器错误',
    message: '服务器暂时无法处理请求，请稍后重试',
    color: 'text-red-500',
  },
  client: {
    icon: <AlertCircle className="w-5 h-5" />,
    title: '请求错误',
    message: '请检查您的输入后重试',
    color: 'text-orange-500',
  },
  auth: {
    icon: <AlertCircle className="w-5 h-5" />,
    title: '认证失败',
    message: '您的登录已过期，请重新登录',
    color: 'text-red-500',
  },
  validation: {
    icon: <AlertCircle className="w-5 h-5" />,
    title: '输入验证失败',
    message: '请检查您的输入是否正确',
    color: 'text-yellow-500',
  },
  notfound: {
    icon: <AlertCircle className="w-5 h-5" />,
    title: '资源未找到',
    message: '请求的资源不存在',
    color: 'text-gray-500',
  },
  unknown: {
    icon: <AlertCircle className="w-5 h-5" />,
    title: '发生错误',
    message: '请稍后重试',
    color: 'text-red-500',
  },
}

// =============================================================================
// ApiError Component
// =============================================================================

interface ApiErrorProps {
  error: ApiErrorInfo | Error
  onRetry?: (() => void) | undefined
  onDismiss?: (() => void) | undefined
  variant?: 'inline' | 'toast' | 'card' | undefined
  className?: string | undefined
}

export function ApiError({
  error,
  onRetry,
  onDismiss,
  variant = 'inline',
  className,
}: ApiErrorProps) {
  const errorType = getApiErrorType(error)
  const config = errorConfig[errorType]
  const errorMessage = error instanceof Error
    ? error.message
    : error.message || config.message

  if (variant === 'toast') {
    return (
      <div
        className={cn(
          'fixed bottom-4 right-4 z-50 max-w-sm',
          'bg-card border border-border rounded-lg shadow-lg',
          'animate-slide-in-right',
          className,
        )}
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className={cn('flex-shrink-0', config.color)}>
              {config.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{config.title}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {errorMessage}
              </p>
            </div>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="flex-shrink-0 p-1 rounded hover:bg-muted"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
          {onRetry && (
            <div className="mt-3 flex justify-end">
              <Button size="sm" variant="outline" onClick={onRetry}>
                <RefreshCw className="w-3 h-3 mr-1" />
                重试
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (variant === 'card') {
    return (
      <div
        className={cn(
          'p-6 rounded-lg bg-card border border-border',
          className,
        )}
      >
        <div className="flex flex-col items-center text-center space-y-4">
          <div className={cn('p-3 rounded-full bg-muted', config.color)}>
            {config.icon}
          </div>
          <div>
            <p className="font-medium">{config.title}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {errorMessage}
            </p>
          </div>
          {onRetry && (
            <Button variant="outline" onClick={onRetry}>
              <RefreshCw className="w-4 h-4 mr-2" />
              重试
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Inline variant (default)
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg',
        'bg-destructive/5 border border-destructive/20',
        className,
      )}
    >
      <div className={cn('flex-shrink-0', config.color)}>
        {config.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{config.title}</p>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {errorMessage}
        </p>
      </div>
      {onRetry && (
        <Button size="sm" variant="ghost" onClick={onRetry}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      )}
      {onDismiss && (
        <Button size="sm" variant="ghost" onClick={onDismiss}>
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  )
}

// =============================================================================
// useApiError Hook
// =============================================================================

interface UseApiErrorReturn {
  error: ApiErrorInfo | null
  setError: (error: ApiErrorInfo | Error | null) => void
  clearError: () => void
  showError: boolean
}

export function useApiError(): UseApiErrorReturn {
  const [error, setErrorState] = React.useState<ApiErrorInfo | null>(null)

  const setError = React.useCallback((err: ApiErrorInfo | Error | null) => {
    if (!err) {
      setErrorState(null)
      return
    }

    if (err instanceof Error) {
      setErrorState({
        code: 'ERROR',
        message: err.message,
      })
    } else {
      setErrorState(err)
    }
  }, [])

  const clearError = React.useCallback(() => {
    setErrorState(null)
  }, [])

  return {
    error,
    setError,
    clearError,
    showError: error !== null,
  }
}

// =============================================================================
// Exports
// =============================================================================

export default ApiError
