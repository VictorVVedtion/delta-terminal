'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { useAgentStore, Agent, AgentStatus } from '@/store/agent'
import { Plus } from 'lucide-react'

/**
 * Agent 列表组件
 * 基于 PRD S77 Sidebar 规格 - ③ Agent 列表 (自适应高度，最多 5 个可见)
 */

// 状态配置
const STATUS_CONFIG: Record<AgentStatus, { color: string; label: string; dotClass: string }> = {
  live: { color: 'border-l-green-500', label: 'LIVE', dotClass: 'bg-green-500' },
  paper: { color: 'border-l-yellow-500', label: 'PAPER', dotClass: 'bg-yellow-500' },
  shadow: { color: 'border-l-muted-foreground', label: 'Shadow', dotClass: 'bg-muted-foreground border border-muted-foreground' },
  paused: { color: 'border-l-orange-500', label: 'PAUSED', dotClass: 'bg-orange-500' },
  stopped: { color: 'border-l-muted', label: 'STOPPED', dotClass: 'bg-muted' },
}

interface AgentItemProps {
  agent: Agent
  isActive: boolean
  onClick: () => void
}

function AgentItem({ agent, isActive, onClick }: AgentItemProps) {
  const statusConfig = STATUS_CONFIG[agent.status]
  const isPositive = agent.pnl >= 0
  const isShadow = agent.status === 'shadow'

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-md p-2.5 mb-1.5',
        'bg-muted/50 hover:bg-muted transition-colors',
        'border-l-[3px]',
        statusConfig.color,
        isShadow && 'opacity-70',
        isActive && 'ring-1 ring-primary'
      )}
    >
      {/* 头部：名称 + 盈亏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              statusConfig.dotClass
            )}
          />
          <span className="text-[11px] font-semibold truncate max-w-[100px]">
            {agent.name}
          </span>
        </div>
        <span
          className={cn(
            'text-[11px] font-mono font-medium',
            isShadow
              ? 'text-muted-foreground'
              : isPositive
                ? 'text-green-500'
                : 'text-red-500'
          )}
        >
          {isShadow ? (
            `虚拟 ${isPositive ? '+' : ''}$${agent.pnl}`
          ) : (
            `${isPositive ? '+' : ''}$${agent.pnl}`
          )}
        </span>
      </div>

      {/* 底部：状态 + 交易对 */}
      <div className="flex items-center gap-1 mt-1 text-[9px] text-muted-foreground">
        <span>{statusConfig.label}</span>
        <span>·</span>
        <span>{agent.symbol}</span>
      </div>
    </button>
  )
}

export function AgentList() {
  const { agents, activeAgentId, setActiveAgent } = useAgentStore()

  const handleNewAgent = () => {
    // TODO: 打开新建策略对话
    console.log('Create new agent')
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      {/* 标题 */}
      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        Agents
      </div>

      {/* Agent 列表 */}
      <div className="space-y-0">
        {agents.map((agent) => (
          <AgentItem
            key={agent.id}
            agent={agent}
            isActive={agent.id === activeAgentId}
            onClick={() => setActiveAgent(agent.id)}
          />
        ))}
      </div>

      {/* 新建按钮 */}
      <button
        onClick={handleNewAgent}
        className={cn(
          'w-full mt-2 p-2.5 rounded-md',
          'border border-dashed border-primary/50',
          'bg-primary/5 hover:bg-primary/10',
          'text-primary text-[11px] font-semibold',
          'flex items-center justify-center gap-1.5',
          'transition-colors'
        )}
      >
        <Plus className="h-3.5 w-3.5" />
        新策略
      </button>
    </div>
  )
}
