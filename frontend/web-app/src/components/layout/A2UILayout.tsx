'use client'

import React, { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Header } from './Header'
import { FunctionalSidebar } from '@/components/sidebar'
import { MobileBottomNav } from './MobileBottomNav'
import { CanvasPanel } from '@/components/canvas/CanvasPanel'
import { useInsightStore } from '@/store/insight'
import type { InsightData } from '@/types/insight'

/**
 * A2UI 布局组件
 * 基于 PRD S77 规范: Sidebar + Full Chat + Slide Canvas (ChatGPT Style)
 *
 * 布局结构:
 * ┌─────────────────────────────────────────────────┐
 * │  Header: Logo | Status | KILL | Avatar          │
 * ├──────────────────┬──────────────────────────────┤
 * │ Sidebar (260px)  │     Main Content (Chat)      │
 * │                  │                              │
 * │ [模式选择器]     │     children (全宽聊天)      │
 * │ [盈亏仪表盘]     │                              │
 * │ [Agent列表]      │                              │
 * │ [风险概览]       │              Canvas ────────→│
 * │ [历史对话]       │              (滑出面板)      │
 * └──────────────────┴──────────────────────────────┘
 * ┌─────────────────────────────────────────────────┐
 * │  Mobile Bottom Nav (仅移动端)                   │
 * └─────────────────────────────────────────────────┘
 */

interface A2UILayoutProps {
  children: React.ReactNode
  /** 是否显示 Sidebar (默认 true) */
  showSidebar?: boolean
}

export function A2UILayout({ children, showSidebar = true }: A2UILayoutProps) {
  const [selectedInsight, setSelectedInsight] = useState<InsightData | null>(null)
  const [canvasOpen, setCanvasOpen] = useState(false)
  const { setInsightStatus } = useInsightStore()

  // Canvas 处理函数
  const handleExpandInsight = useCallback((insight: InsightData) => {
    setSelectedInsight(insight)
    setCanvasOpen(true)
  }, [])

  const handleCloseCanvas = useCallback(() => {
    setCanvasOpen(false)
    // 延迟清除数据，等待动画完成
    setTimeout(() => setSelectedInsight(null), 300)
  }, [])

  const handleApprove = useCallback(() => {
    if (selectedInsight) {
      setInsightStatus(selectedInsight.id, 'approved')
      handleCloseCanvas()
    }
  }, [selectedInsight, setInsightStatus, handleCloseCanvas])

  const handleReject = useCallback(() => {
    if (selectedInsight) {
      setInsightStatus(selectedInsight.id, 'rejected')
      handleCloseCanvas()
    }
  }, [selectedInsight, setInsightStatus, handleCloseCanvas])

  // ESC 键关闭 Canvas
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && canvasOpen) {
        handleCloseCanvas()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [canvasOpen, handleCloseCanvas])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Header />

      {/* Main Container */}
      <div className="flex relative">
        {/* Sidebar - 桌面端显示 */}
        {showSidebar && (
          <div className="hidden md:block">
            <FunctionalSidebar />
          </div>
        )}

        {/* Main Content Area */}
        <main
          className={cn(
            'flex-1 min-h-[calc(100vh-4rem)]',
            showSidebar && 'md:ml-[260px]', // Sidebar 宽度
            'pb-[100px] md:pb-0', // 移动端底部导航空间
            'transition-all duration-300',
            // Canvas 打开时收缩主内容区
            canvasOpen && 'lg:mr-[480px]'
          )}
        >
          {/* 传递 Canvas 控制函数给子组件 */}
          {React.isValidElement(children)
            ? React.cloneElement(children as React.ReactElement<{ onExpandInsight?: (insight: InsightData) => void }>, {
                onExpandInsight: handleExpandInsight,
              })
            : children}
        </main>

        {/* Canvas Panel - 滑出面板 */}
        <CanvasPanel
          insight={selectedInsight}
          isOpen={canvasOpen}
          onClose={handleCloseCanvas}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  )
}

export default A2UILayout
