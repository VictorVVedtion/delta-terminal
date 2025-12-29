'use client'

import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCheck,
  ChevronRight,
  Clock,
  GitCompare,
  Lightbulb,
  LineChart,
  MessageSquare,
  Percent,
  PieChart,
  Settings,
  Target,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react'
import React from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { InsightEmptyState } from '@/components/insight/InsightEmptyState'
import { getSmartDefaultValue } from '@/lib/param-defaults'
import { safeNumber, formatSafePercent } from '@/lib/safe-number'
import { cn } from '@/lib/utils'
import type {
  ImpactMetric,
  InsightCardProps,
  InsightCardStatus,
  InsightParam,
  InsightType,
} from '@/types/insight'

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
  // 防重复提交状态
  const [isApproving, setIsApproving] = React.useState(false)
  const [isRejecting, setIsRejecting] = React.useState(false)
  const actionInProgressRef = React.useRef(false)

  // ========== 数据完整性检查 ==========
  // 检查 insight 是否为 null 或 undefined
  if (!insight) {
    return (
      <InsightEmptyState
        reason="null-insight"
        compact={compact}
        onRetry={onExpand}
      />
    )
  }

  // 检查是否缺少关键字段
  if (!insight.type || !insight.explanation) {
    return (
      <InsightEmptyState
        reason="null-insight"
        compact={compact}
        onRetry={onExpand}
        title="数据不完整"
        description="AI 返回的分析结果缺少关键信息"
      />
    )
  }

  // 检查 params 是否为空（某些 insight 类型需要参数）
  const hasParams = insight.params && insight.params.length > 0
  if (!hasParams && ['strategy_create', 'strategy_modify', 'batch_adjust'].includes(insight.type)) {
    return (
      <InsightEmptyState
        reason="no-params"
        compact={compact}
        onRetry={onExpand}
      />
    )
  }

  // Get display info based on insight type
  const typeInfo = getInsightTypeInfo(insight.type)

  // Get key params to display (level 1 only, max 3)
  const keyParams = hasParams ? insight.params.filter((p) => p.level === 1).slice(0, 3) : []

  // Get symbol for smart defaults
  const symbolParam = hasParams ? insight.params.find((p) => p.key === 'symbol') : undefined
  const symbol = typeof symbolParam?.value === 'string' ? symbolParam.value : undefined

  // Get key metrics from impact (使用安全访问)
  const keyMetrics = insight.impact?.metrics?.slice(0, 2) || []

  // Truncate explanation
  const shortExplanation =
    insight.explanation.length > 100
      ? insight.explanation.slice(0, 100) + '...'
      : insight.explanation

  // 批准处理函数 (防重复提交)
  const handleApprove = React.useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()

      // 检查是否已经在处理中
      if (actionInProgressRef.current || isApproving || isRejecting) {
        return
      }

      // 设置处理中标志
      actionInProgressRef.current = true
      setIsApproving(true)

      try {
        await onApprove?.(insight.params)
      } finally {
        // 延迟重置标志，避免快速双击
        setTimeout(() => {
          actionInProgressRef.current = false
          setIsApproving(false)
        }, 500)
      }
    },
    [onApprove, insight.params, isApproving, isRejecting]
  )

  // 拒绝处理函数 (防重复提交)
  const handleReject = React.useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()

      // 检查是否已经在处理中
      if (actionInProgressRef.current || isApproving || isRejecting) {
        return
      }

      // 设置处理中标志
      actionInProgressRef.current = true
      setIsRejecting(true)

      try {
        await onReject?.()
      } finally {
        // 延迟重置标志，避免快速双击
        setTimeout(() => {
          actionInProgressRef.current = false
          setIsRejecting(false)
        }, 500)
      }
    },
    [onReject, isApproving, isRejecting]
  )

  return (
    <Card
      className={cn(
        'relative cursor-pointer overflow-hidden transition-all duration-200',
        'border-l-4 border-border/50',
        'bg-card/80 backdrop-blur-sm', // RiverBit glass effect
        typeInfo.borderColor,
        isHovered && 'scale-[1.01] shadow-lg shadow-primary/5',
        status === 'approved' && 'border-l-success opacity-80',
        status === 'rejected' && 'border-l-destructive opacity-50'
      )}
      onMouseEnter={() => {
        setIsHovered(true)
      }}
      onMouseLeave={() => {
        setIsHovered(false)
      }}
      onClick={onExpand}
    >
      {/* Status Badge */}
      {status !== 'pending' && <StatusBadge status={status} />}

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          {/* Type Icon and Title */}
          <div className="flex items-center gap-3">
            <div className={cn('rounded-lg p-2', typeInfo.bgColor)}>{typeInfo.icon}</div>
            <div>
              <h3 className="text-sm font-semibold">{typeInfo.title}</h3>
              {insight.target && (
                <p className="text-xs text-muted-foreground">
                  {insight.target.symbol} - {insight.target.name}
                </p>
              )}
            </div>
          </div>

          {/* Confidence Badge */}
          {insight.impact && <ConfidenceBadge confidence={insight.impact.confidence} />}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Key Parameters Preview */}
        {keyParams.length > 0 && !compact && (
          <div className="flex flex-wrap gap-2">
            {keyParams.map((param) => (
              <ParamPreview key={param.key} param={param} symbol={symbol} />
            ))}
          </div>
        )}

        {/* Key Metrics Preview */}
        {keyMetrics.length > 0 && !compact && (
          <div className="flex gap-4">
            {keyMetrics.map((metric) => (
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
              {/* Quick Approve Button - UX Enhancement (P0) */}
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={handleApprove}
                      disabled={isApproving || isRejecting}
                      className="gap-1 border-0 bg-gradient-to-r from-emerald-500 to-green-500 shadow-sm hover:from-emerald-600 hover:to-green-600 disabled:opacity-50"
                    >
                      <CheckCheck className={cn('h-3.5 w-3.5', isApproving && 'animate-pulse')} />
                      {isApproving ? '处理中...' : '快速批准'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs p-0">
                    <QuickApprovePreview params={insight.params} symbol={symbol} />
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Button
                size="sm"
                variant="outline"
                onClick={handleReject}
                disabled={isApproving || isRejecting}
                className="gap-1"
              >
                <X className={cn('h-3 w-3', isRejecting && 'animate-pulse')} />
                {isRejecting ? '处理中...' : '拒绝'}
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
              调参后批准
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
      {isHovered && <div className="pointer-events-none absolute inset-0 bg-primary/[0.03]" />}
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
    <Badge variant={config.variant} className="absolute right-2 top-2 text-xs">
      {config.label}
    </Badge>
  )
}

function ConfidenceBadge({ confidence }: { confidence: number | undefined }) {
  // 使用安全数值处理
  const safeConfidence = safeNumber(confidence, 0)
  const percent = Math.round(safeConfidence * 100)
  const color =
    safeConfidence >= 0.8 ? 'text-green-500' : safeConfidence >= 0.6 ? 'text-yellow-500' : 'text-red-500'

  return (
    <div className={cn('flex items-center gap-1 text-xs', color)}>
      <Target className="h-3 w-3" />
      <span>{percent}% 置信度</span>
    </div>
  )
}

function ParamPreview({ param, symbol }: { param: InsightParam; symbol?: string | undefined }) {
  const displayValue = formatParamValue(param, symbol)

  return (
    <div className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs">
      <Settings className="h-3 w-3 text-muted-foreground" />
      <span className="text-muted-foreground">{param.label}:</span>
      <span className="font-medium">{displayValue}</span>
      {param.old_value != null && (
        <span className="ml-1 text-muted-foreground line-through">
          {formatParamValue({ ...param, value: param.old_value }, symbol)}
        </span>
      )}
    </div>
  )
}

function MetricPreview({ metric }: { metric: ImpactMetric }) {
  const TrendIcon =
    metric.trend === 'up' ? TrendingUp : metric.trend === 'down' ? TrendingDown : null

  const trendColor =
    metric.trend === 'up'
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
        <span>
          {metric.value}
          {metric.unit}
        </span>
      </div>
    </div>
  )
}

/**
 * QuickApprovePreview - Shows parameter preview in tooltip before quick approve
 * UX Enhancement: Users can see what values will be used before one-click approval
 */
function QuickApprovePreview({ params, symbol }: { params: InsightParam[]; symbol?: string }) {
  // Show only level 1 (core) params, max 5
  const coreParams = params.filter((p) => p.level === 1).slice(0, 5)

  if (coreParams.length === 0) {
    return <div className="p-3 text-xs text-muted-foreground">使用 AI 推荐的默认参数</div>
  }

  return (
    <div className="space-y-2 p-3">
      <div className="mb-2 flex items-center gap-1.5 border-b border-border pb-2 text-xs font-medium text-foreground">
        <CheckCheck className="h-3 w-3 text-emerald-500" />
        将使用以下参数：
      </div>
      <div className="space-y-1.5">
        {coreParams.map((param) => (
          <div key={param.key} className="flex items-center justify-between gap-4 text-xs">
            <span className="text-muted-foreground">{param.label}</span>
            <span className="font-medium text-foreground">{formatParamValue(param, symbol)}</span>
          </div>
        ))}
      </div>
      {params.filter((p) => p.level === 1).length > 5 && (
        <div className="border-t border-border pt-1 text-xs text-muted-foreground">
          +{params.filter((p) => p.level === 1).length - 5} 更多参数...
        </div>
      )}
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
    trade_signal: {
      title: '交易信号',
      icon: <Zap className="h-5 w-5 text-yellow-500" />,
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-l-yellow-500',
    },
    backtest: {
      title: '回测结果',
      icon: <LineChart className="h-5 w-5 text-cyan-500" />,
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-l-cyan-500',
    },
    clarification: {
      title: 'AI 追问',
      icon: <MessageSquare className="h-5 w-5 text-indigo-500" />,
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-l-indigo-500',
    },
    sensitivity: {
      title: '敏感度分析',
      icon: <Activity className="h-5 w-5 text-amber-500" />,
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-l-amber-500',
    },
    attribution: {
      title: '归因分析',
      icon: <PieChart className="h-5 w-5 text-emerald-500" />,
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-l-emerald-500',
    },
    comparison: {
      title: '策略对比',
      icon: <GitCompare className="h-5 w-5 text-orange-500" />,
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-l-orange-500',
    },
  }

  return typeMap[type] || typeMap.strategy_create
}

// getSmartDefaultValue 已提取到 @/lib/param-defaults 共享模块

function formatParamValue(param: InsightParam, symbol?: string): string {
  let value = param.value

  // 对于数值类型，尝试获取智能默认值
  if (typeof value === 'number' && (value === 0 || value === undefined || value === null)) {
    const smartValue = getSmartDefaultValue(param.key, value, symbol)
    if (smartValue !== undefined && smartValue !== value) {
      value = smartValue
    }
  }

  if (typeof value === 'boolean') {
    return value ? '启用' : '禁用'
  }

  if (typeof value === 'number') {
    // 使用安全数值处理防止 NaN/Infinity
    const safeValue = safeNumber(value, 0)
    const precision = param.config?.precision !== undefined ? param.config.precision : 2
    const formatted = safeValue.toFixed(precision)
    return param.config?.unit ? `${formatted}${param.config.unit}` : formatted
  }

  if (typeof value === 'string') {
    // Try to find label from options
    const option = param.config?.options?.find((o) => o.value === value)
    return option?.label || value
  }

  if (Array.isArray(value)) {
    return `${value.length} 条件`
  }

  return String(value ?? '')
}

// =============================================================================
// Exports
// =============================================================================

export default InsightCard
