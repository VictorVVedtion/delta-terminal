'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { useAgentStore, ChatHistory } from '@/store/agent'
import { MessageSquare, Trash2 } from 'lucide-react'

/**
 * 历史对话组件
 * 基于 PRD S77 Sidebar 规格 - 历史对话区块
 */

interface ChatItemProps {
  chat: ChatHistory
  onClick: () => void
  onDelete: () => void
}

function ChatItem({ chat, onClick, onDelete }: ChatItemProps) {
  const timeAgo = getTimeAgo(chat.timestamp)

  return (
    <div
      className={cn(
        'group flex items-start gap-2 py-1.5 px-2 -mx-2',
        'rounded hover:bg-muted/50 cursor-pointer transition-colors'
      )}
      onClick={onClick}
    >
      <MessageSquare className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-medium truncate">{chat.title}</div>
        <div className="text-[9px] text-muted-foreground">{timeAgo}</div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        className={cn(
          'opacity-0 group-hover:opacity-100',
          'p-1 hover:bg-destructive/20 rounded transition-all'
        )}
      >
        <Trash2 className="h-2.5 w-2.5 text-destructive" />
      </button>
    </div>
  )
}

function getTimeAgo(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return new Date(timestamp).toLocaleDateString('zh-CN')
}

export function ChatHistoryPanel() {
  const { chatHistory, removeChatHistory } = useAgentStore()

  const handleChatClick = (chatId: string) => {
    // TODO: 加载历史对话
    console.log('Load chat:', chatId)
  }

  if (chatHistory.length === 0) {
    return null
  }

  return (
    <div className="border-t border-border p-3 max-h-[120px] overflow-y-auto">
      {/* 标题 */}
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-sm">📜</span>
        <span className="text-[10px] font-semibold text-muted-foreground">
          历史对话
        </span>
      </div>

      {/* 对话列表 */}
      <div className="space-y-0.5">
        {chatHistory.slice(0, 5).map((chat) => (
          <ChatItem
            key={chat.id}
            chat={chat}
            onClick={() => handleChatClick(chat.id)}
            onDelete={() => removeChatHistory(chat.id)}
          />
        ))}
      </div>
    </div>
  )
}
