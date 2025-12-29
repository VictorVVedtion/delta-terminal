'use client'

import { AlertCircle, BarChart3, Database, RefreshCw, Sparkles } from 'lucide-react'
import React from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

export type EmptyStateReason =
  | 'no-params' // params 为空数组
  | 'no-impact' // impact 缺失
  | 'no-chart-data' // evidence.chart 无数据
  | 'null-insight' // 整个 insight 为 null
  | 'loading' // 正在加载中
  | 'error' // 错误状态
  | 'generic' // 通用空状态

interface InsightEmptyStateProps {
  /** 空状态原因 */
  reason?: EmptyStateReason
  /** 自定义标题 */
  title?: string
  /** 自定义描述 */
  description?: string
  /** 是否显示重试按钮 */
  showRetry?: boolean
  /** 重试回调 */
  onRetry?: () => void
  /** 是否显示为紧凑模式 */
  compact?: boolean
  /** 自定义类名 */
  className?: string
}

// =============================================================================
// 配置
// =============================================================================

const EMPTY_STATE_CONFIG: Record<
  EmptyStateReason,
  {
    icon: React.ComponentType<{ className?: string }>
    title: string
    description: string
    iconColor: string
    bgColor: string
  }
> = {
  'no-params': {
    icon: Database,
    title: '缺少参数',
    description: 'AI 分析未返回策略参数，请尝试更详细地描述您的需求',
    iconColor: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  'no-impact': {
    icon: BarChart3,
    title: '缺少影响分析',
    description: '暂无影响评估数据，AI 正在分析中...',
    iconColor: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  'no-chart-data': {
    icon: BarChart3,
    title: '暂无图表数据',
    description: '图表数据尚未生成，请稍候或尝试重新生成',
    iconColor: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
  },
  'null-insight': {
    icon: AlertCircle,
    title: '暂无分析结果',
    description: 'AI 未能生成有效的分析结果，请尝试重新提问',
    iconColor: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  loading: {
    icon: Sparkles,
    title: 'AI 正在分析中',
    description: '请稍候，正在为您生成个性化策略建议...',
    iconColor: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  error: {
    icon: AlertCircle,
    title: '出现错误',
    description: '无法加载分析结果，请稍后重试',
    iconColor: 'text-destructive',
    bgColor: 'bg-destructive/10',
  },
  generic: {
    icon: Database,
    title: '暂无数据',
    description: 'AI 正在分析中，请稍候...',
    iconColor: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
  },
}

// =============================================================================
// Component
// =============================================================================

export function InsightEmptyState({
  reason = 'generic',
  title,
  description,
  showRetry = true,
  onRetry,
  compact = false,
  className,
}: InsightEmptyStateProps) {
  const config = EMPTY_STATE_CONFIG[reason]
  const Icon = config.icon

  const displayTitle = title || config.title
  const displayDescription = description || config.description

  if (compact) {
    // 紧凑模式 - 用于小区域内嵌显示
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center p-6 text-center',
          className
        )}
      >
        <div className={cn('p-3 rounded-lg mb-3', config.bgColor)}>
          <Icon className={cn('h-6 w-6', config.iconColor)} />
        </div>
        <p className="text-sm font-medium text-foreground mb-1">{displayTitle}</p>
        <p className="text-xs text-muted-foreground mb-3">{displayDescription}</p>
        {showRetry && onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RefreshCw className="h-3 w-3 mr-1" />
            重试
          </Button>
        )}
      </div>
    )
  }

  // 完整模式 - 独立卡片显示
  return (
    <Card className={cn('border-dashed', className)}>
      <CardContent className="flex flex-col items-center justify-center p-12 text-center">
        {/* Icon with glow */}
        <div className="relative mb-6">
          <div
            className={cn(
              'absolute inset-0 rounded-full blur-xl opacity-50 animate-pulse',
              config.bgColor
            )}
          />
          <div className={cn('relative p-4 rounded-full', config.bgColor)}>
            <Icon className={cn('h-12 w-12', config.iconColor)} />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-semibold text-foreground mb-2">
          {displayTitle}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
          {displayDescription}
        </p>

        {/* Actions */}
        {showRetry && onRetry && (
          <Button onClick={onRetry} variant="default" size="default">
            <RefreshCw className="h-4 w-4 mr-2" />
            重新生成
          </Button>
        )}

        {/* Loading indicator for loading state */}
        {reason === 'loading' && (
          <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
            </div>
            <span>预计需要 10-30 秒</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// =============================================================================
// 便捷子组件
// =============================================================================

/**
 * 参数缺失空状态
 */
export function NoParamsEmptyState({
  onRetry,
  compact,
  className,
}: Pick<InsightEmptyStateProps, 'onRetry' | 'compact' | 'className'>) {
  return (
    <InsightEmptyState
      reason="no-params"
      onRetry={onRetry}
      compact={compact}
      className={className}
    />
  )
}

/**
 * 影响分析缺失空状态
 */
export function NoImpactEmptyState({
  onRetry,
  compact,
  className,
}: Pick<InsightEmptyStateProps, 'onRetry' | 'compact' | 'className'>) {
  return (
    <InsightEmptyState
      reason="no-impact"
      onRetry={onRetry}
      compact={compact}
      className={className}
    />
  )
}

/**
 * 图表数据缺失空状态
 */
export function NoChartDataEmptyState({
  onRetry,
  compact,
  className,
}: Pick<InsightEmptyStateProps, 'onRetry' | 'compact' | 'className'>) {
  return (
    <InsightEmptyState
      reason="no-chart-data"
      onRetry={onRetry}
      compact={compact}
      className={className}
    />
  )
}

/**
 * 加载中空状态
 */
export function LoadingEmptyState({
  compact,
  className,
}: Pick<InsightEmptyStateProps, 'compact' | 'className'>) {
  return (
    <InsightEmptyState
      reason="loading"
      showRetry={false}
      compact={compact}
      className={className}
    />
  )
}

/**
 * 错误空状态
 */
export function ErrorEmptyState({
  onRetry,
  compact,
  className,
}: Pick<InsightEmptyStateProps, 'onRetry' | 'compact' | 'className'>) {
  return (
    <InsightEmptyState
      reason="error"
      onRetry={onRetry}
      compact={compact}
      className={className}
    />
  )
}

// =============================================================================
// Exports
// =============================================================================

export default InsightEmptyState
