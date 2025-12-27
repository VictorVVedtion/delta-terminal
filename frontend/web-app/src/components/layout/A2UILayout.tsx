'use client'

import React, { useCallback } from 'react'

import { CanvasPanel } from '@/components/canvas/CanvasPanel'
import { FunctionalSidebar } from '@/components/sidebar'
import { cn } from '@/lib/utils'
import { useInsightStore } from '@/store/insight'

import { Header } from './Header'
import { MobileBottomNav } from './MobileBottomNav'

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
 *
 * Canvas 状态由全局 useInsightStore 管理，子组件通过 store.openCanvas() 触发
 */

interface A2UILayoutProps {
  children: React.ReactNode
  /** 是否显示 Sidebar (默认 true) */
  showSidebar?: boolean
}

export function A2UILayout({ children, showSidebar = true }: A2UILayoutProps) {
  // 使用全局 store 管理 Canvas 状态
  const {
    activeInsight,
    canvasOpen,
    closeCanvas,
    setInsightStatus,
  } = useInsightStore()

  // Canvas 关闭处理
  const handleCloseCanvas = useCallback(() => {
    closeCanvas()
  }, [closeCanvas])

  // 批准处理
  const handleApprove = useCallback(() => {
    if (activeInsight) {
      setInsightStatus(activeInsight.id, 'approved')
      handleCloseCanvas()
    }
  }, [activeInsight, setInsightStatus, handleCloseCanvas])

  // 拒绝处理
  const handleReject = useCallback(() => {
    if (activeInsight) {
      setInsightStatus(activeInsight.id, 'rejected')
      handleCloseCanvas()
    }
  }, [activeInsight, setInsightStatus, handleCloseCanvas])

  // ESC 键关闭 Canvas
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && canvasOpen) {
        handleCloseCanvas()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => { window.removeEventListener('keydown', handleEscape); }
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
          {/* 子组件直接渲染，Canvas 通过 store.openCanvas() 触发 */}
          {children}
        </main>

        {/* Canvas Panel - 滑出面板，监听 store 状态 */}
        <CanvasPanel
          insight={activeInsight}
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
