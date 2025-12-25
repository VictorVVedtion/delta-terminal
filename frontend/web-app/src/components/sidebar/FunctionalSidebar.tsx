'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { ModeSelector } from './ModeSelector'
import { PnLPanel } from './PnLPanel'
import { AgentList } from './AgentList'
import { RiskPanel } from './RiskPanel'
import { ChatHistoryPanel } from './ChatHistoryPanel'

/**
 * 功能化 Sidebar 组件
 * 基于 PRD S77 完整布局 (ChatGPT Style)
 *
 * 结构:
 * ┌──────────────┐
 * │ 模式选择器   │  ← ① 高度 48px
 * ├──────────────┤
 * │ 盈亏仪表盘   │  ← ② 高度 80px
 * ├──────────────┤
 * │              │
 * │ Agent 列表   │  ← ③ 自适应高度
 * │              │
 * ├──────────────┤
 * │ 风险概览     │  ← ④ 高度 60px，可折叠
 * ├──────────────┤
 * │ 历史对话     │  ← ⑤ 最大 120px
 * └──────────────┘
 */

interface FunctionalSidebarProps {
  className?: string
}

export function FunctionalSidebar({ className }: FunctionalSidebarProps) {
  return (
    <aside
      className={cn(
        'fixed left-0 top-16 h-[calc(100vh-4rem)]',
        'w-[260px] bg-background/95 backdrop-blur',
        'border-r border-border',
        'flex flex-col',
        'z-30',
        className
      )}
    >
      {/* ① 模式选择器 */}
      <ModeSelector />

      {/* ② 盈亏仪表盘 */}
      <PnLPanel />

      {/* ③ Agent 列表 (flex-1 占据剩余空间) */}
      <AgentList />

      {/* ④ 风险概览 */}
      <RiskPanel />

      {/* ⑤ 历史对话 */}
      <ChatHistoryPanel />
    </aside>
  )
}

export { ModeSelector } from './ModeSelector'
export { PnLPanel } from './PnLPanel'
export { AgentList } from './AgentList'
export { RiskPanel } from './RiskPanel'
export { ChatHistoryPanel } from './ChatHistoryPanel'
