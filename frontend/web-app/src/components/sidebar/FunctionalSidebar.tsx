'use client'

import React from 'react'

import { cn } from '@/lib/utils'

import { AgentList } from './AgentList'
import { ChatHistoryPanel } from './ChatHistoryPanel'
import { ModeSelector } from './ModeSelector'
import { PnLPanel } from './PnLPanel'
import { RiskPanel } from './RiskPanel'

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
        // Header 高度: 主导航 64px + 行情 Ticker ~30px = ~94px
        'fixed left-0 top-[94px] h-[calc(100vh-94px)]',
        'w-[260px] glass border-l-0 border-y-0 rounded-none',
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

export { AgentList } from './AgentList'
export { ChatHistoryPanel } from './ChatHistoryPanel'
export { ModeSelector } from './ModeSelector'
export { PnLPanel } from './PnLPanel'
export { RiskPanel } from './RiskPanel'
