'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log error to monitoring service
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-destructive" />
        </div>

        {/* Title & Message */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">出现了问题</h1>
          <p className="text-muted-foreground">
            抱歉，应用程序遇到了意外错误。我们已记录此问题并将尽快修复。
          </p>
        </div>

        {/* Error Details (dev only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20 text-left">
            <p className="text-sm font-mono text-destructive break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs text-muted-foreground mt-2">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" onClick={reset}>
            <RefreshCw className="w-4 h-4 mr-2" />
            重试
          </Button>
          <Button onClick={() => window.location.href = '/dashboard'}>
            <Home className="w-4 h-4 mr-2" />
            返回首页
          </Button>
        </div>

        {/* Help Text */}
        <p className="text-xs text-muted-foreground">
          如果问题持续存在，请联系客服支持
        </p>
      </div>
    </div>
  )
}
