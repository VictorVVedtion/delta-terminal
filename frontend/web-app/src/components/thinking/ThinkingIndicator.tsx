'use client'

import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react'
import React from 'react'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type {
  ThinkingProcess,
  ThinkingStatus,
  TodoItem,
  TodoStatus,
  ToolCall,
} from '@/types/thinking'

// =============================================================================
// Props
// =============================================================================

interface ThinkingIndicatorProps {
  /** 思考进程数据 */
  process: ThinkingProcess
  /** 初始是否展开 */
  defaultExpanded?: boolean
  /** 自定义类名 */
  className?: string
  /** 紧凑模式 (只显示进度条) */
  compact?: boolean
}

// =============================================================================
// Sub Components
// =============================================================================

/**
 * PulsingDot - 状态指示动画点
 */
function PulsingDot({ status }: { status: ThinkingStatus }) {
  const colorMap: Record<ThinkingStatus, string> = {
    idle: 'bg-muted-foreground',
    thinking: 'bg-[hsl(var(--rb-cyan))]',
    tool_calling: 'bg-[hsl(var(--rb-purple,_270_70%_60%))]',
    generating: 'bg-[hsl(var(--rb-green))]',
    approval_required: 'bg-[hsl(var(--rb-yellow))]',
    completed: 'bg-[hsl(var(--rb-green))]',
    error: 'bg-[hsl(var(--rb-red))]',
  }

  const isAnimated = ['thinking', 'tool_calling', 'generating'].includes(status)

  return (
    <span className="relative flex h-3 w-3">
      {isAnimated && (
        <span
          className={cn(
            'absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping',
            colorMap[status]
          )}
        />
      )}
      <span
        className={cn(
          'relative inline-flex rounded-full h-3 w-3',
          colorMap[status]
        )}
      />
    </span>
  )
}

/**
 * TodoIcon - 任务状态图标
 */
function TodoIcon({ status }: { status: TodoStatus }) {
  switch (status) {
    case 'completed':
      return (
        <div className="w-4 h-4 rounded-full bg-[hsl(var(--rb-green))]/20 flex items-center justify-center">
          <Check className="w-2.5 h-2.5 text-[hsl(var(--rb-green))]" />
        </div>
      )
    case 'in_progress':
      return (
        <div className="w-4 h-4 rounded-full bg-[hsl(var(--rb-cyan))]/20 flex items-center justify-center">
          <Loader2 className="w-2.5 h-2.5 text-[hsl(var(--rb-cyan))] animate-spin" />
        </div>
      )
    case 'failed':
      return (
        <div className="w-4 h-4 rounded-full bg-[hsl(var(--rb-red))]/20 flex items-center justify-center">
          <X className="w-2.5 h-2.5 text-[hsl(var(--rb-red))]" />
        </div>
      )
    case 'skipped':
      return (
        <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center">
          <span className="text-[8px] text-muted-foreground">-</span>
        </div>
      )
    default: // pending
      return (
        <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center">
          <Clock className="w-2.5 h-2.5 text-muted-foreground" />
        </div>
      )
  }
}

/**
 * TodoList - 任务列表
 */
function TodoList({ todos }: { todos: TodoItem[] }) {
  return (
    <ul className="space-y-2">
      {todos.map((todo, index) => (
        <li
          key={todo.id}
          className={cn(
            'flex items-start gap-2 text-xs',
            'animate-in fade-in-0 slide-in-from-left-2',
          )}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <TodoIcon status={todo.status} />
          <span
            className={cn(
              'flex-1',
              todo.status === 'completed' && 'text-[hsl(var(--rb-green))]',
              todo.status === 'in_progress' && 'text-[hsl(var(--rb-cyan))]',
              todo.status === 'failed' && 'text-[hsl(var(--rb-red))]',
              todo.status === 'pending' && 'text-muted-foreground',
              todo.status === 'skipped' && 'text-muted-foreground line-through',
            )}
          >
            {todo.description}
          </span>
          {todo.actual_duration !== undefined && todo.status === 'completed' && (
            <span className="text-muted-foreground">
              {todo.actual_duration.toFixed(1)}s
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}

/**
 * CurrentToolIndicator - 当前工具调用指示器
 */
function CurrentToolIndicator({ tool }: { tool: ToolCall }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-[hsl(var(--rb-purple,_270_70%_60%))]/10 rounded-lg border border-[hsl(var(--rb-purple,_270_70%_60%))]/30">
      <Wrench className="w-3.5 h-3.5 text-[hsl(var(--rb-purple,_270_70%_60%))] animate-pulse" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-[hsl(var(--rb-purple,_270_70%_60%))]">
          {tool.tool_name}
        </p>
        <p className="text-[10px] text-muted-foreground truncate">
          {tool.description}
        </p>
      </div>
    </div>
  )
}

/**
 * 获取状态文本
 */
function getStatusText(status: ThinkingStatus): string {
  const statusTextMap: Record<ThinkingStatus, string> = {
    idle: '空闲',
    thinking: 'Spirit 正在思考...',
    tool_calling: '调用工具中...',
    generating: '生成回复中...',
    approval_required: '等待确认',
    completed: '完成',
    error: '出错了',
  }
  return statusTextMap[status]
}

/**
 * 获取状态图标
 */
function StatusIcon({ status }: { status: ThinkingStatus }) {
  switch (status) {
    case 'thinking':
    case 'tool_calling':
    case 'generating':
      return <Loader2 className="w-4 h-4 animate-spin" />
    case 'approval_required':
      return <AlertTriangle className="w-4 h-4" />
    case 'completed':
      return <Check className="w-4 h-4" />
    case 'error':
      return <X className="w-4 h-4" />
    default:
      return <Sparkles className="w-4 h-4" />
  }
}

// =============================================================================
// Main Component
// =============================================================================

export function ThinkingIndicator({
  process,
  defaultExpanded = false,
  className,
  compact = false,
}: ThinkingIndicatorProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded)

  // 计算完成百分比
  const completedCount = process.todos.filter(t => t.status === 'completed').length
  const totalCount = process.todos.length
  const progressPercent = process.progress?.percentage ?? (totalCount > 0 ? (completedCount / totalCount) * 100 : 0)

  // 是否正在活跃
  const isActive = ['thinking', 'tool_calling', 'generating'].includes(process.status)

  // 紧凑模式: 只显示单行进度
  if (compact) {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <PulsingDot status={process.status} />
            <span className={cn(
              isActive && 'text-[hsl(var(--rb-cyan))]',
              process.status === 'completed' && 'text-[hsl(var(--rb-green))]',
              process.status === 'error' && 'text-[hsl(var(--rb-red))]',
            )}>
              {getStatusText(process.status)}
            </span>
          </div>
          <span className="text-muted-foreground">
            {completedCount}/{totalCount}
          </span>
        </div>
        <Progress value={progressPercent} className="h-1" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-lg border transition-all duration-200',
        isActive && 'border-[hsl(var(--rb-cyan))]/50 bg-[hsl(var(--rb-cyan))]/5',
        process.status === 'approval_required' && 'border-[hsl(var(--rb-yellow))]/50 bg-[hsl(var(--rb-yellow))]/5',
        process.status === 'completed' && 'border-[hsl(var(--rb-green))]/50',
        process.status === 'error' && 'border-[hsl(var(--rb-red))]/50 bg-[hsl(var(--rb-red))]/5',
        !isActive && process.status !== 'error' && process.status !== 'approval_required' && 'border-border',
        className,
      )}
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        {/* Header: 可点击折叠/展开 */}
        <CollapsibleTrigger asChild>
          <button
            className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors rounded-t-lg"
            type="button"
          >
            <div className="flex items-center gap-3">
              <PulsingDot status={process.status} />
              <div className="flex items-center gap-2">
                <StatusIcon status={process.status} />
                <span className={cn(
                  'text-sm font-medium',
                  isActive && 'text-[hsl(var(--rb-cyan))]',
                  process.status === 'approval_required' && 'text-[hsl(var(--rb-yellow))]',
                  process.status === 'completed' && 'text-[hsl(var(--rb-green))]',
                  process.status === 'error' && 'text-[hsl(var(--rb-red))]',
                )}>
                  {getStatusText(process.status)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* 进度指示 */}
              <div className="flex items-center gap-2">
                <Progress value={progressPercent} className="w-20 h-1.5" />
                <span className="text-xs text-muted-foreground w-8">
                  {Math.round(progressPercent)}%
                </span>
              </div>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>

        {/* 展开内容 */}
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-3 border-t border-border/50">
            {/* 当前工具调用 */}
            {process.current_tool && (
              <div className="pt-3">
                <CurrentToolIndicator tool={process.current_tool} />
              </div>
            )}

            {/* 任务列表 */}
            {process.todos.length > 0 && (
              <div className="pt-3">
                <TodoList todos={process.todos} />
              </div>
            )}

            {/* 当前步骤描述 */}
            {process.progress?.current_step && (
              <div className="pt-2 text-xs text-muted-foreground">
                {process.progress.current_step}
              </div>
            )}

            {/* 错误信息 */}
            {process.error && (
              <div className="pt-2 text-xs text-[hsl(var(--rb-red))]">
                {process.error}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

export default ThinkingIndicator
