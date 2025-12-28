'use client'

import React, { Suspense } from 'react'

import { A2UILayout } from '@/components/layout/A2UILayout'
import { ChatInterface } from '@/components/strategy/ChatInterface'

// Minimal fallback for initial load
function ChatFallback() {
  return <div className="h-full w-full flex items-center justify-center text-muted-foreground">Loading interface...</div>
}

/**
 * Chat 主页面 - A2UI 统一交互界面
 * 基于 PRD S77 - ChatGPT Style 全宽对话界面
 * 
 * 统一入口: 集成了对话、策略创建、分析和部署功能
 */
export default function ChatPage() {
  return (
    <A2UILayout>
      <Suspense fallback={<ChatFallback />}>
        <ChatInterface />
      </Suspense>
    </A2UILayout>
  )
}
