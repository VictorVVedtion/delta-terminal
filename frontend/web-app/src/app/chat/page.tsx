'use client'

import React from 'react'

import { A2UILayout } from '@/components/layout/A2UILayout'
import { ChatInterface } from '@/components/strategy/ChatInterface'

/**
 * Chat 主页面 - A2UI 统一交互界面
 * 基于 PRD S77 - ChatGPT Style 全宽对话界面
 * 
 * 统一入口: 集成了对话、策略创建、分析和部署功能
 */
export default function ChatPage() {
  return (
    <A2UILayout>
      <ChatInterface />
    </A2UILayout>
  )
}
