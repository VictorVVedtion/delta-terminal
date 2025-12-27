import { ArrowLeft,FileQuestion, Home } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'

/**
 * 404 Not Found page
 */
export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-6">
        {/* 404 Display */}
        <div className="space-y-2">
          <div className="text-8xl font-bold text-primary/20">404</div>
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <FileQuestion className="w-8 h-8 text-muted-foreground" />
          </div>
        </div>

        {/* Title & Message */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">页面未找到</h1>
          <p className="text-muted-foreground">
            抱歉，您访问的页面不存在或已被移除。
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" asChild>
            <Link href="javascript:history.back()">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回上页
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard">
              <Home className="w-4 h-4 mr-2" />
              返回首页
            </Link>
          </Button>
        </div>

        {/* Quick Links */}
        <div className="pt-6 border-t">
          <p className="text-sm text-muted-foreground mb-3">
            或者访问以下页面：
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Link
              href="/dashboard"
              className="text-sm text-primary hover:underline"
            >
              仪表盘
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link
              href="/trading"
              className="text-sm text-primary hover:underline"
            >
              交易
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link
              href="/strategies"
              className="text-sm text-primary hover:underline"
            >
              AI 策略
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
