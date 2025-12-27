/**
 * ThinkingIndicator - 思考过程可视化组件
 *
 * 显示 AI 的思考步骤，支持流式更新
 */

'use client'

import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils'
import type { ThinkingStep } from '@/types/ai'

// ============================================================================
// Types
// ============================================================================

interface ThinkingIndicatorProps {
  steps: ThinkingStep[]
  isLoading?: boolean
  collapsed?: boolean
  className?: string
}

// ============================================================================
// Component
// ============================================================================

export function ThinkingIndicator({
  steps,
  isLoading = false,
  collapsed: initialCollapsed = false,
  className
}: ThinkingIndicatorProps) {
  const [collapsed, setCollapsed] = useState(initialCollapsed)
  const [animatedSteps, setAnimatedSteps] = useState<number[]>([])

  // 动画效果：新步骤添加时触发
  useEffect(() => {
    if (steps.length > animatedSteps.length) {
      const newIndex = steps.length - 1
      setAnimatedSteps(prev => [...prev, newIndex])
    }
  }, [steps.length, animatedSteps.length])

  if (steps.length === 0 && !isLoading) {
    return null
  }

  return (
    <div className={cn('rounded-lg border bg-secondary/30', className)}>
      {/* 头部 */}
      <button
        onClick={() => { setCollapsed(!collapsed); }}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isLoading ? (
            <LoadingSpinner className="w-4 h-4" />
          ) : (
            <span className="text-primary">🧠</span>
          )}
          <span className="text-sm font-medium">
            {isLoading ? 'Spirit 正在思考...' : `思考过程 (${steps.length} 步)`}
          </span>
        </div>
        <span className={cn(
          'text-xs transition-transform',
          collapsed && 'rotate-180'
        )}>
          ▼
        </span>
      </button>

      {/* 步骤列表 */}
      {!collapsed && (
        <div className="px-4 pb-4 space-y-3">
          {steps.map((step, index) => (
            <ThinkingStepItem
              key={step.step}
              step={step}
              index={index}
              isNew={animatedSteps.includes(index)}
            />
          ))}

          {/* 加载中占位 */}
          {isLoading && steps.length === 0 && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <LoadingSpinner className="w-3 h-3" />
              <span>正在分析...</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Thinking Step Item
// ============================================================================

interface ThinkingStepItemProps {
  step: ThinkingStep
  index: number
  isNew: boolean
}

function ThinkingStepItem({ step, index: _index, isNew }: ThinkingStepItemProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className={cn(
        'transition-all duration-300',
        isNew && 'animate-in fade-in slide-in-from-left-2'
      )}
    >
      <div className="flex items-start gap-3">
        {/* 状态图标 */}
        <div className="flex-shrink-0 mt-0.5">
          {step.status === 'completed' ? (
            <span className="text-green-500">✓</span>
          ) : step.status === 'processing' ? (
            <LoadingSpinner className="w-4 h-4 text-primary" />
          ) : (
            <span className="text-muted-foreground">○</span>
          )}
        </div>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-sm',
                step.status === 'completed' && 'text-foreground',
                step.status === 'processing' && 'text-primary',
                step.status === 'pending' && 'text-muted-foreground'
              )}
            >
              {step.title}
            </span>
            {step.duration && (
              <span className="text-xs text-muted-foreground">
                ({step.duration}ms)
              </span>
            )}
          </div>

          {/* 详细内容 (可展开) */}
          {step.content && (
            <>
              <button
                onClick={() => { setExpanded(!expanded); }}
                className="text-xs text-muted-foreground hover:text-foreground mt-1"
              >
                {expanded ? '收起详情' : '查看详情'}
              </button>
              {expanded && (
                <div className="mt-2 p-3 rounded bg-secondary text-xs text-muted-foreground whitespace-pre-wrap">
                  {step.content}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Loading Spinner
// ============================================================================

interface LoadingSpinnerProps {
  className?: string
}

function LoadingSpinner({ className }: LoadingSpinnerProps) {
  return (
    <svg
      className={cn('animate-spin', className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

// ============================================================================
// Compact Thinking Indicator
// ============================================================================

interface CompactThinkingIndicatorProps {
  steps: ThinkingStep[]
  isLoading?: boolean
  className?: string
}

export function CompactThinkingIndicator({
  steps,
  isLoading = false,
  className
}: CompactThinkingIndicatorProps) {
  const completedCount = steps.filter(s => s.status === 'completed').length
  const currentStep = steps.find(s => s.status === 'processing')

  if (!isLoading && steps.length === 0) {
    return null
  }

  return (
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      {isLoading && <LoadingSpinner className="w-4 h-4 text-primary" />}
      <span className="text-muted-foreground">
        {currentStep
          ? currentStep.title
          : isLoading
            ? '思考中...'
            : `完成 ${completedCount}/${steps.length} 步`}
      </span>
    </div>
  )
}

// ============================================================================
// Skeleton Loader
// ============================================================================

export function ThinkingSkeleton() {
  return (
    <div className="rounded-lg border bg-secondary/30 p-4 space-y-3 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-full bg-primary/20" />
        <div className="w-24 h-4 rounded bg-secondary" />
      </div>
      <div className="space-y-2 pl-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500/20" />
          <div className="w-40 h-3 rounded bg-secondary" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500/20" />
          <div className="w-32 h-3 rounded bg-secondary" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary/20 animate-pulse" />
          <div className="w-36 h-3 rounded bg-secondary" />
        </div>
      </div>
    </div>
  )
}

export default ThinkingIndicator
