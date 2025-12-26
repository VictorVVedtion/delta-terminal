'use client'

import React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ChevronRight,
  Check,
  X,
  Settings,
  BarChart3,
  Clock,
  Percent,
  Target,
  LineChart,
} from 'lucide-react'
import type {
  InsightType,
  InsightCardProps,
  InsightCardStatus,
  InsightParam,
  ImpactMetric,
} from '@/types/insight'
import { cn } from '@/lib/utils'

// =============================================================================
// InsightCard Main Component
// =============================================================================

export function InsightCard({
  insight,
  status = 'pending',
  onExpand,
  onApprove,
  onReject,
  compact = false,
}: InsightCardProps) {
  const [isHovered, setIsHovered] = React.useState(false)

  // Get display info based on insight type
  const typeInfo = getInsightTypeInfo(insight.type)

  // Get key params to display (level 1 only, max 3)
  const keyParams = insight.params
    .filter(p => p.level === 1)
    .slice(0, 3)

  // Get key metrics from impact
  const keyMetrics = insight.impact?.metrics.slice(0, 2) || []

  // Truncate explanation
  const shortExplanation = insight.explanation.length > 100
    ? insight.explanation.slice(0, 100) + '...'
    : insight.explanation

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-200 cursor-pointer',
        'border-l-4 border-border/50',
        'bg-card/80 backdrop-blur-sm', // RiverBit glass effect
        typeInfo.borderColor,
        isHovered && 'shadow-lg shadow-primary/5 scale-[1.01]',
        status === 'approved' && 'opacity-80 border-l-success',
        status === 'rejected' && 'opacity-50 border-l-destructive',
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onExpand}
    >
      {/* Status Badge */}
      {status !== 'pending' && (
        <StatusBadge status={status} />
      )}

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          {/* Type Icon and Title */}
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-lg',
              typeInfo.bgColor,
            )}>
              {typeInfo.icon}
            </div>
            <div>
              <h3 className="font-semibold text-sm">{typeInfo.title}</h3>
              {insight.target && (
                <p className="text-xs text-muted-foreground">
                  {insight.target.symbol} - {insight.target.name}
                </p>
              )}
            </div>
          </div>

          {/* Confidence Badge */}
          {insight.impact && (
            <ConfidenceBadge confidence={insight.impact.confidence} />
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Key Parameters Preview */}
        {keyParams.length > 0 && !compact && (
          <div className="flex flex-wrap gap-2">
            {keyParams.map(param => (
              <ParamPreview key={param.key} param={param} />
            ))}
          </div>
        )}

        {/* Key Metrics Preview */}
        {keyMetrics.length > 0 && !compact && (
          <div className="flex gap-4">
            {keyMetrics.map(metric => (
              <MetricPreview key={metric.key} metric={metric} />
            ))}
          </div>
        )}

        {/* Explanation */}
        <p className="text-sm text-muted-foreground">
          {compact ? insight.explanation.slice(0, 60) + '...' : shortExplanation}
        </p>

        {/* Actions */}
        {status === 'pending' && !compact && (
          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="default"
                onClick={(e) => {
                  e.stopPropagation()
                  onApprove?.(insight.params)
                }}
                className="gap-1"
              >
                <Check className="h-3 w-3" />
                批准
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation()
                  onReject?.()
                }}
                className="gap-1"
              >
                <X className="h-3 w-3" />
                拒绝
              </Button>
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                onExpand?.()
              }}
              className="gap-1 text-muted-foreground"
            >
              查看详情
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Compact view expand hint */}
        {compact && (
          <div className="flex items-center justify-end text-xs text-muted-foreground">
            <ChevronRight className="h-3 w-3" />
            点击展开
          </div>
        )}
      </CardContent>

      {/* Hover indicator - RiverBit cyan glow */}
      {isHovered && (
        <div className="absolute inset-0 bg-primary/[0.03] pointer-events-none" />
      )}
    </Card>
  )
}

// =============================================================================
// Sub Components
// =============================================================================

function StatusBadge({ status }: { status: InsightCardStatus }) {
  const statusConfig = {
    pending: { label: '待审批', variant: 'secondary' as const },
    approved: { label: '已批准', variant: 'success' as const },
    rejected: { label: '已拒绝', variant: 'destructive' as const },
    expired: { label: '已过期', variant: 'outline' as const },
  }

  const config = statusConfig[status]

  return (
    <Badge
      variant={config.variant}
      className="absolute top-2 right-2 text-xs"
    >
      {config.label}
    </Badge>
  )
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const percent = Math.round(confidence * 100)
  const color = confidence >= 0.8
    ? 'text-green-500'
    : confidence >= 0.6
      ? 'text-yellow-500'
      : 'text-red-500'

  return (
    <div className={cn('flex items-center gap-1 text-xs', color)}>
      <Target className="h-3 w-3" />
      <span>{percent}% 置信度</span>
    </div>
  )
}

function ParamPreview({ param }: { param: InsightParam }) {
  const displayValue = formatParamValue(param)

  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-xs">
      <Settings className="h-3 w-3 text-muted-foreground" />
      <span className="text-muted-foreground">{param.label}:</span>
      <span className="font-medium">{displayValue}</span>
      {param.old_value !== undefined && (
        <span className="text-muted-foreground line-through ml-1">
          {formatParamValue({ ...param, value: param.old_value })}
        </span>
      )}
    </div>
  )
}

function MetricPreview({ metric }: { metric: ImpactMetric }) {
  const TrendIcon = metric.trend === 'up'
    ? TrendingUp
    : metric.trend === 'down'
      ? TrendingDown
      : null

  const trendColor = metric.trend === 'up'
    ? 'text-green-500'
    : metric.trend === 'down'
      ? 'text-red-500'
      : 'text-muted-foreground'

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {metric.key === 'expectedReturn' || metric.key === 'annualizedReturn' ? (
          <Percent className="h-3 w-3 text-muted-foreground" />
        ) : metric.key === 'winRate' ? (
          <BarChart3 className="h-3 w-3 text-muted-foreground" />
        ) : (
          <Clock className="h-3 w-3 text-muted-foreground" />
        )}
        <span className="text-xs text-muted-foreground">{metric.label}</span>
      </div>
      <div className={cn('flex items-center gap-1 text-sm font-medium', trendColor)}>
        {TrendIcon && <TrendIcon className="h-3 w-3" />}
        <span>{metric.value}{metric.unit}</span>
      </div>
    </div>
  )
}

// =============================================================================
// Helper Functions
// =============================================================================

function getInsightTypeInfo(type: InsightType) {
  const typeMap = {
    strategy_create: {
      title: '创建新策略',
      icon: <Lightbulb className="h-5 w-5 text-primary" />,
      bgColor: 'bg-primary/10',
      borderColor: 'border-l-primary',
    },
    strategy_modify: {
      title: '修改策略',
      icon: <Settings className="h-5 w-5 text-blue-500" />,
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-l-blue-500',
    },
    batch_adjust: {
      title: '批量调整',
      icon: <BarChart3 className="h-5 w-5 text-purple-500" />,
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-l-purple-500',
    },
    risk_alert: {
      title: '风险警告',
      icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
      bgColor: 'bg-red-500/10',
      borderColor: 'border-l-red-500',
    },
    backtest: {
      title: '回测结果',
      icon: <LineChart className="h-5 w-5 text-cyan-500" />,
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-l-cyan-500',
    },
  }

  return typeMap[type] || typeMap.strategy_create
}

function formatParamValue(param: InsightParam): string {
  const value = param.value

  if (typeof value === 'boolean') {
    return value ? '启用' : '禁用'
  }

  if (typeof value === 'number') {
    const formatted = param.config.precision !== undefined
      ? value.toFixed(param.config.precision)
      : value.toString()
    return param.config.unit ? `${formatted}${param.config.unit}` : formatted
  }

  if (typeof value === 'string') {
    // Try to find label from options
    const option = param.config.options?.find(o => o.value === value)
    return option?.label || value
  }

  if (Array.isArray(value)) {
    return `${value.length} 条件`
  }

  return String(value)
}

// =============================================================================
// Exports
// =============================================================================

export default InsightCard
