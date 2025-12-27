'use client'

/**
 * Dashboard 页面 - 重定向到 Chat
 *
 * 根据 PRD S77 布局重构决策:
 * - Dashboard 内容已迁移到 Sidebar (盈亏仪表盘、Agent 列表、风险概览)
 * - 主入口改为 Chat 页面 (ChatGPT Style)
 */

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardPage() {
  const router = useRouter()

  useEffect(() => {
    // 重定向到 Chat 主页面
    router.replace('/chat')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-muted-foreground">正在跳转到主界面...</p>
      </div>
    </div>
  )
}
