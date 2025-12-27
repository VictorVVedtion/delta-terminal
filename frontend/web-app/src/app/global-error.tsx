'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'
import { useEffect } from 'react'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Global error boundary for root layout errors
 * This catches errors that error.tsx cannot handle
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log critical error
    console.error('Critical application error:', error)
  }, [error])

  return (
    <html lang="zh-CN" className="dark">
      <body className="min-h-screen bg-[#070E12] text-[#EBEEF0] font-sans antialiased">
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="max-w-md w-full text-center space-y-6">
            {/* Icon */}
            <div className="mx-auto w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>

            {/* Title & Message */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">应用程序崩溃</h1>
              <p className="text-[#75838A]">
                抱歉，应用程序遇到了严重错误。请刷新页面重试。
              </p>
            </div>

            {/* Error Details (dev only) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20 text-left">
                <p className="text-sm font-mono text-red-400 break-all">
                  {error.message}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-center gap-3">
              <button
                onClick={reset}
                className="inline-flex items-center px-4 py-2 rounded-lg bg-[#1F292E] hover:bg-[#2A363C] border border-[#2A363C] transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                重试
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="inline-flex items-center px-4 py-2 rounded-lg bg-[#0EECBC] text-[#070E12] hover:bg-[#0EECBC]/90 transition-colors"
              >
                返回首页
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
