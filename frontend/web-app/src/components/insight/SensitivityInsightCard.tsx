'use client'

/**
 * SensitivityInsightCard Component
 *
 * EPIC-008 Story 8.1: 参数敏感度分析卡片
 * 展示参数对策略性能的影响程度，包括热力图和关键参数排序
 */

import {
  Activity,
  AlertTriangle,
  ChevronRight,
  Target,
  TrendingUp,
} from 'lucide-react'
import React from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { safeNumber, formatSafePercent } from '@/lib/safe-number'
import { cn } from '@/lib/utils'
import type { SensitivityInsightData } from '@/types/insight'

// =============================================================================
// Types
// =============================================================================

interface SensitivityInsightCardProps {
  /** 敏感度分析数据 */
  data: SensitivityInsightData
  /** 是否为紧凑模式 */
  compact?: boolean
  /** 展开回调 */
  onExpand?: () => void
}

// =============================================================================
// Constants
// =============================================================================

const SENSITIVITY_CONFIG = {
  high: {
    label: '高敏感',
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    borderColor: 'border-red-500',
  },
  medium: {
    label: '中敏感',
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500',
  },
  low: {
    label: '低敏感',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    borderColor: 'border-green-500',
  },
} as const

const METRIC_LABELS: Record<string, string> = {
  totalReturn: '收益率',
  winRate: '胜率',
  maxDrawdown: '回撤',
  sharpeRatio: '夏普',
}

// =============================================================================
// Sub Components
// =============================================================================

/**
 * 关键参数条形图
 */
function KeyParamBar({
  param,
  rank,
}: {
  param: { paramKey: string; paramLabel: string; impactScore: number; sensitivity: 'high' | 'medium' | 'low' }
  rank: number
}) {
  const config = SENSITIVITY_CONFIG[param.sensitivity]
  const safeImpact = safeNumber(param.impactScore, 0)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">#{rank}</span>
          <span className="text-sm font-medium">{param.paramLabel}</span>
        </div>
        <Badge variant="outline" className={cn('text-xs', config.color)}>
          {config.label}
        </Badge>
      </div>
      <Progress value={safeImpact} className="h-2" />
      <p className="text-xs text-muted-foreground">影响分数: {safeImpact.toFixed(0)}</p>
    </div>
  )
}

/**
 * 简化热力图
 */
function MiniHeatmap({
  matrix,
  baseline,
}: {
  matrix: SensitivityInsightData['sensitivityMatrix']
  baseline: SensitivityInsightData['baseline']
}) {
  const metrics = ['totalReturn', 'winRate', 'maxDrawdown', 'sharpeRatio']

  // 计算每个参数对指标的平均影响
  const getAverageImpact = (paramKey: string, metric: string): number => {
    const item = matrix.find((m) => m.paramKey === paramKey)
    if (!item || item.impacts.length === 0) return 0

    const values = item.impacts.map((impact) => {
      const value = impact[metric as keyof typeof impact]
      return safeNumber(value, 0)
    })
    const baselineValue = safeNumber(baseline[metric as keyof typeof baseline], 0)
    const avgChange =
      values.reduce((sum, v) => sum + (v - baselineValue), 0) / values.length

    return avgChange
  }

  // 获取热力图单元格颜色
  const getHeatColor = (change: number, metric: string): string => {
    // 对于回撤，负值是好的
    const isNegativeBetter = metric === 'maxDrawdown'
    const effectiveChange = isNegativeBetter ? -change : change

    if (effectiveChange > 5) return 'bg-green-500'
    if (effectiveChange > 2) return 'bg-green-400'
    if (effectiveChange > -2) return 'bg-gray-400 dark:bg-gray-600'
    if (effectiveChange > -5) return 'bg-red-400'
    return 'bg-red-500'
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">参数影响热力图</h4>
      <div className="overflow-x-auto">
        <div className="min-w-fit space-y-1">
          {/* Header */}
          <div className="flex items-center gap-1">
            <div className="w-16 text-xs text-muted-foreground">指标</div>
            {matrix.slice(0, 4).map((item) => (
              <div
                key={item.paramKey}
                className="w-12 truncate text-center text-xs text-muted-foreground"
                title={item.paramLabel}
              >
                {item.paramLabel.slice(0, 4)}
              </div>
            ))}
          </div>

          {/* Rows */}
          {metrics.map((metric) => (
            <div key={metric} className="flex items-center gap-1">
              <div className="w-16 text-xs text-muted-foreground">
                {METRIC_LABELS[metric]}
              </div>
              {matrix.slice(0, 4).map((item) => {
                const impact = getAverageImpact(item.paramKey, metric)
                return (
                  <div
                    key={`${metric}-${item.paramKey}`}
                    className={cn(
                      'h-8 w-12 rounded transition-colors',
                      getHeatColor(impact, metric)
                    )}
                    title={`${impact > 0 ? '+' : ''}${impact.toFixed(2)}`}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-green-500" />
          <span>正向</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-gray-400 dark:bg-gray-600" />
          <span>中性</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-red-500" />
          <span>负向</span>
        </div>
      </div>
    </div>
  )
}

/**
 * 基准性能卡片
 */
function BaselineMetrics({ baseline }: { baseline: SensitivityInsightData['baseline'] }) {
  const metrics = [
    {
      key: 'totalReturn',
      label: '收益率',
      value: baseline.totalReturn,
      unit: '%',
      isPercentChange: true,
    },
    {
      key: 'winRate',
      label: '胜率',
      value: baseline.winRate,
      unit: '%',
      isPercentChange: false,
    },
    {
      key: 'maxDrawdown',
      label: '最大回撤',
      value: baseline.maxDrawdown,
      unit: '%',
      isPercentChange: false,
      isNegativeBetter: true,
    },
    {
      key: 'sharpeRatio',
      label: '夏普比率',
      value: baseline.sharpeRatio,
      unit: '',
      isPercentChange: false,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-2">
      {metrics.map((metric) => {
        const safeValue = safeNumber(metric.value, 0)
        const isPositive = metric.isNegativeBetter ? safeValue < 0 : safeValue > 0
        const color = isPositive ? 'text-green-500' : 'text-red-500'

        return (
          <div
            key={metric.key}
            className="rounded-lg border border-border bg-muted/30 p-2"
          >
            <p className="text-xs text-muted-foreground">{metric.label}</p>
            <p className={cn('font-mono text-sm font-medium', color)}>
              {metric.isPercentChange && safeValue >= 0 ? '+' : ''}
              {safeValue.toFixed(2)}
              {metric.unit}
            </p>
          </div>
        )
      })}
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export function SensitivityInsightCard({
  data,
  compact = false,
  onExpand,
}: SensitivityInsightCardProps) {
  const [isHovered, setIsHovered] = React.useState(false)

  // 获取前3个关键参数
  const topParams = data.keyParameters.slice(0, compact ? 2 : 3)

  return (
    <Card
      className={cn(
        'relative cursor-pointer overflow-hidden transition-all duration-200',
        'border-l-4 border-l-amber-500',
        'bg-card/80 backdrop-blur-sm',
        isHovered && 'scale-[1.01] shadow-lg shadow-primary/5'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onExpand}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/10 p-2">
              <Activity className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">参数敏感度分析</h3>
              <p className="text-xs text-muted-foreground">
                {data.strategyName} · {data.symbol}
              </p>
            </div>
          </div>

          {/* Params count badge */}
          <Badge variant="outline" className="gap-1">
            <Target className="h-3 w-3" />
            {data.keyParameters.length} 参数
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* AI Insight */}
        <div className="flex items-start gap-2 rounded-lg bg-primary/5 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground">
            {compact
              ? data.aiInsight.slice(0, 80) + '...'
              : data.aiInsight.slice(0, 150) + '...'}
          </p>
        </div>

        {!compact && (
          <>
            {/* Key Parameters */}
            <div className="space-y-3">
              <h4 className="flex items-center gap-2 text-sm font-medium">
                <TrendingUp className="h-4 w-4 text-primary" />
                关键参数影响
              </h4>
              <div className="space-y-3">
                {topParams.map((param, index) => (
                  <KeyParamBar key={param.paramKey} param={param} rank={index + 1} />
                ))}
              </div>
            </div>

            {/* Mini Heatmap */}
            {data.sensitivityMatrix.length > 0 && (
              <MiniHeatmap matrix={data.sensitivityMatrix} baseline={data.baseline} />
            )}

            {/* Baseline Performance */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">基准性能</h4>
              <BaselineMetrics baseline={data.baseline} />
            </div>
          </>
        )}

        {/* Expand Button */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full gap-1 text-muted-foreground"
          onClick={(e) => {
            e.stopPropagation()
            onExpand?.()
          }}
        >
          {compact ? '查看完整分析' : '打开敏感度画布'}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardContent>

      {/* Hover indicator */}
      {isHovered && <div className="pointer-events-none absolute inset-0 bg-primary/[0.03]" />}
    </Card>
  )
}

export default SensitivityInsightCard
