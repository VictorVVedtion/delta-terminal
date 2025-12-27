'use client'

import { AnimatePresence,motion } from 'framer-motion'
import React from 'react'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { InsightLoadingPhase, InsightLoadingState, ThinkingProcess } from '@/types/thinking'

import { ThinkingIndicator } from './ThinkingIndicator'

// =============================================================================
// Props
// =============================================================================

interface InsightCardLoadingProps {
  /** 加载状态 */
  state: InsightLoadingState
  /** 自定义类名 */
  className?: string
}

// =============================================================================
// Phase 1: Skeleton (0-0.5s)
// =============================================================================

function SkeletonPhase({ className }: { className?: string }) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          {/* Icon + Title skeleton */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" animation="shimmer" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" animation="shimmer" />
              <Skeleton className="h-3 w-24" animation="shimmer" />
            </div>
          </div>
          {/* Badge skeleton */}
          <Skeleton className="h-5 w-16 rounded-full" animation="shimmer" />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Metrics grid skeleton */}
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-12" animation="shimmer" />
              <Skeleton className="h-5 w-16" animation="shimmer" />
            </div>
          ))}
        </div>

        {/* Explanation skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" animation="shimmer" />
          <Skeleton className="h-3 w-4/5" animation="shimmer" />
        </div>

        {/* Actions skeleton */}
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-8 w-16 rounded-md" animation="shimmer" />
          <Skeleton className="h-8 w-16 rounded-md" animation="shimmer" />
          <Skeleton className="h-8 flex-1 rounded-md" animation="shimmer" />
        </div>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// Phase 2: Thinking (0.5-3s)
// =============================================================================

function ThinkingPhase({
  thinking,
  className,
}: {
  thinking?: ThinkingProcess
  className?: string
}) {
  // 如果没有 thinking 数据，显示默认的思考状态
  const defaultProcess: ThinkingProcess = thinking ?? {
    process_id: 'default',
    user_message: '',
    status: 'thinking',
    todos: [
      { id: '1', description: '分析用户意图', status: 'completed' },
      { id: '2', description: '检索因子库', status: 'in_progress' },
      { id: '3', description: '评估风控约束', status: 'pending' },
      { id: '4', description: '生成策略配置', status: 'pending' },
    ],
    tool_history: [],
    started_at: Date.now(),
  }

  return (
    <Card
      className={cn(
        'overflow-hidden border-[hsl(var(--rb-cyan))]/50',
        className
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          {/* Icon + Title with partial data */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-[hsl(var(--rb-cyan))]/10 flex items-center justify-center">
              <span className="text-lg animate-pulse">🎯</span>
            </div>
            <div className="space-y-1">
              <Skeleton className="h-4 w-32" animation="shimmer" />
              <Skeleton className="h-3 w-24" animation="shimmer" />
            </div>
          </div>
          {/* Status badge */}
          <div className="px-2 py-1 rounded-full bg-[hsl(var(--rb-cyan))]/10 text-[hsl(var(--rb-cyan))] text-xs font-medium animate-pulse">
            生成中
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Thinking indicator */}
        <ThinkingIndicator process={defaultProcess} defaultExpanded />

        {/* Metrics skeleton with partial shimmer */}
        <div className="grid grid-cols-3 gap-3 opacity-50">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-12" animation="shimmer" />
              <Skeleton className="h-5 w-16" animation="shimmer" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// Phase 3: Filling (3-5s)
// =============================================================================

function FillingPhase({
  partialData,
  className,
}: {
  partialData?: InsightLoadingState['partial_data']
  className?: string
}) {
  const data = partialData ?? {
    title: '策略提案',
    symbol: 'BTC/USDT',
    type: 'strategy_create',
    metrics: [
      { key: 'return', value: 24.5, loading: false },
      { key: 'winRate', value: undefined, loading: true },
      { key: 'maxDrawdown', value: undefined, loading: true },
    ],
  }

  return (
    <Card
      className={cn(
        'overflow-hidden border-[hsl(var(--rb-cyan))]/50',
        className
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          {/* Icon + Title - filled */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-[hsl(var(--rb-cyan))]/10 flex items-center justify-center">
              <span className="text-lg">📈</span>
            </div>
            <div>
              <h3 className="font-semibold text-sm">{data.title}</h3>
              <p className="text-xs text-muted-foreground">{data.symbol}</p>
            </div>
          </div>
          {/* Badge - filled */}
          <div className="px-2 py-1 rounded-full bg-[hsl(var(--rb-green))]/10 text-[hsl(var(--rb-green))] text-xs font-medium">
            已就绪
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Metrics - progressive fill */}
        <div className="grid grid-cols-3 gap-3">
          {data.metrics?.map((metric) => (
            <div key={metric.key} className="space-y-1">
              <span className="text-xs text-muted-foreground">
                {metric.key === 'return' && '预估收益'}
                {metric.key === 'winRate' && '胜率'}
                {metric.key === 'maxDrawdown' && '最大回撤'}
              </span>
              {metric.loading ? (
                <Skeleton className="h-5 w-16" animation="shimmer" />
              ) : (
                <motion.span
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'text-lg font-bold block',
                    metric.key === 'return' && 'text-[hsl(var(--rb-green))]',
                    metric.key === 'maxDrawdown' && 'text-[hsl(var(--rb-red))]'
                  )}
                >
                  {metric.key === 'return' && `+${metric.value}%`}
                  {metric.key === 'winRate' && `${metric.value}%`}
                  {metric.key === 'maxDrawdown' && `-${metric.value}%`}
                </motion.span>
              )}
            </div>
          ))}
        </div>

        {/* Explanation - loading */}
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" animation="shimmer" />
          <Skeleton className="h-3 w-3/4" animation="shimmer" />
        </div>

        {/* Actions - ready */}
        <div className="flex gap-2 pt-2">
          <button className="h-8 px-3 text-xs rounded-md bg-muted hover:bg-muted/80 transition-colors">
            拒绝
          </button>
          <button className="h-8 px-4 text-xs rounded-md bg-[hsl(var(--rb-cyan))] text-[hsl(var(--rb-d900))] font-medium hover:opacity-90 transition-opacity flex-1">
            批准
          </button>
        </div>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export function InsightCardLoading({ state, className }: InsightCardLoadingProps) {
  // 避免 exactOptionalPropertyTypes 问题：只在值存在时传递
  const cnProps = className !== undefined ? { className } : {}
  const thinkingProps = state.thinking !== undefined ? { thinking: state.thinking } : {}
  const partialDataProps = state.partial_data !== undefined ? { partialData: state.partial_data } : {}

  return (
    <AnimatePresence mode="wait">
      {state.phase === 'skeleton' && (
        <motion.div
          key="skeleton"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <SkeletonPhase {...cnProps} />
        </motion.div>
      )}
      
      {state.phase === 'thinking' && (
        <motion.div
          key="thinking"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.3 }}
        >
          <ThinkingPhase {...thinkingProps} {...cnProps} />
        </motion.div>
      )}

      {state.phase === 'filling' && (
        <motion.div
          key="filling"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <FillingPhase {...partialDataProps} {...cnProps} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// =============================================================================
// Hook: useInsightLoadingState (Unchanged)
// =============================================================================

interface UseInsightLoadingStateOptions {
  /** 骨架屏阶段持续时间 (ms) */
  skeletonDuration?: number
  /** 自动切换到 thinking 阶段 */
  autoProgress?: boolean
}

export function useInsightLoadingState(
  isLoading: boolean,
  thinkingProcess?: ThinkingProcess,
  options: UseInsightLoadingStateOptions = {}
) {
  const { skeletonDuration = 500, autoProgress = true } = options
  const [phase, setPhase] = React.useState<InsightLoadingPhase>('skeleton')

  React.useEffect(() => {
    if (!isLoading) {
      setPhase('ready')
      return
    }

    // 开始加载时重置为 skeleton
    setPhase('skeleton')

    if (!autoProgress) return

    // 自动切换到 thinking 阶段
    const timer = setTimeout(() => {
      setPhase('thinking')
    }, skeletonDuration)

    return () => { clearTimeout(timer); }
  }, [isLoading, skeletonDuration, autoProgress])

  // 根据 thinkingProcess 状态自动切换到 filling
  React.useEffect(() => {
    if (thinkingProcess?.status === 'generating' && phase === 'thinking') {
      setPhase('filling')
    }
  }, [thinkingProcess?.status, phase])

  // 只在有值时包含属性，避免 exactOptionalPropertyTypes 问题
  const state: InsightLoadingState = {
    phase,
    ...(thinkingProcess ? { thinking: thinkingProcess } : {}),
  }

  return {
    state,
    phase,
    setPhase,
    isReady: phase === 'ready',
  }
}

export default InsightCardLoading
