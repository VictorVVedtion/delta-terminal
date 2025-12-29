'use client'

/**
 * ComparisonInsightCard Component
 *
 * EPIC-008 Story 8.3: 策略对比分析卡片
 * 并排对比多个策略的性能指标，帮助选择最优策略
 */

import {
  ChevronRight,
  GitCompare,
  TrendingDown,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import React from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { safeNumber, formatSafePercent } from '@/lib/safe-number'
import { cn } from '@/lib/utils'
import type { ComparisonInsightData } from '@/types/insight'

// =============================================================================
// Types
// =============================================================================

interface ComparisonInsightCardProps {
  /** 对比分析数据 */
  data: ComparisonInsightData
  /** 是否为紧凑模式 */
  compact?: boolean
  /** 展开回调 */
  onExpand?: () => void
}

// =============================================================================
// Constants
// =============================================================================

const METRIC_CONFIG: Record<
  string,
  { label: string; unit: string; isBetter: 'higher' | 'lower' }
> = {
  totalReturn: { label: '总收益', unit: '%', isBetter: 'higher' },
  annualizedReturn: { label: '年化收益', unit: '%', isBetter: 'higher' },
  winRate: { label: '胜率', unit: '%', isBetter: 'higher' },
  maxDrawdown: { label: '最大回撤', unit: '%', isBetter: 'lower' },
  sharpeRatio: { label: '夏普比率', unit: '', isBetter: 'higher' },
  sortinoRatio: { label: '索提诺比率', unit: '', isBetter: 'higher' },
  profitFactor: { label: '盈亏比', unit: '', isBetter: 'higher' },
  totalTrades: { label: '交易次数', unit: '', isBetter: 'higher' },
}

const SIGNIFICANCE_CONFIG = {
  high: { label: '显著', color: 'text-red-500', bg: 'bg-red-500/10' },
  medium: { label: '中等', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  low: { label: '轻微', color: 'text-green-500', bg: 'bg-green-500/10' },
} as const

// =============================================================================
// Sub Components
// =============================================================================

/**
 * 对比表格 - 核心指标
 */
function ComparisonTable({
  strategies,
  compact = false,
}: {
  strategies: ComparisonInsightData['strategies']
  compact?: boolean
}) {
  const displayMetrics = compact
    ? ['totalReturn', 'winRate', 'maxDrawdown']
    : ['totalReturn', 'annualizedReturn', 'winRate', 'maxDrawdown', 'sharpeRatio']

  // 找出每个指标的最佳策略
  const getBestStrategy = (metricKey: string) => {
    const config = METRIC_CONFIG[metricKey]
    if (!config) return null

    return strategies.reduce((best, current) => {
      const currentValue = safeNumber(current.metrics[metricKey as keyof typeof current.metrics], 0)
      const bestValue = safeNumber(best.metrics[metricKey as keyof typeof best.metrics], 0)

      if (config.isBetter === 'higher') {
        return currentValue > bestValue ? current : best
      } else {
        return currentValue < bestValue ? current : best
      }
    })
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            <th className="py-2 pr-2 text-left font-medium text-muted-foreground">指标</th>
            {strategies.map((strategy) => (
              <th
                key={strategy.id}
                className="px-2 py-2 text-center font-medium"
                style={{ color: strategy.color }}
              >
                {strategy.name.slice(0, compact ? 6 : 10)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayMetrics.map((metricKey) => {
            const config = METRIC_CONFIG[metricKey]
            const bestStrategy = getBestStrategy(metricKey)

            return (
              <tr key={metricKey} className="border-b border-border/50">
                <td className="py-2 pr-2 text-muted-foreground">{config?.label}</td>
                {strategies.map((strategy) => {
                  const value = safeNumber(
                    strategy.metrics[metricKey as keyof typeof strategy.metrics],
                    0
                  )
                  const isBest = bestStrategy?.id === strategy.id

                  return (
                    <td
                      key={strategy.id}
                      className={cn(
                        'px-2 py-2 text-center font-mono',
                        isBest && 'font-bold text-primary'
                      )}
                    >
                      {isBest && <Trophy className="mb-0.5 inline h-3 w-3 text-yellow-500" />}
                      {value.toFixed(metricKey.includes('Ratio') ? 2 : 1)}
                      {config?.unit}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/**
 * 雷达图图例 - 多维度对比可视化
 */
function RadarChartLegend({ strategies }: { strategies: ComparisonInsightData['strategies'] }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-muted-foreground">策略图例</h4>
      <div className="space-y-1.5">
        {strategies.map((strategy) => (
          <div key={strategy.id} className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: strategy.color }} />
            <span className="flex-1 text-xs">{strategy.name}</span>
            <span className="text-xs font-mono text-muted-foreground">{strategy.symbol}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * 差异分析 - 高亮显著差异
 */
function DifferenceAnalysis({
  differences,
  compact = false,
}: {
  differences: ComparisonInsightData['differences']
  compact?: boolean
}) {
  const displayItems = compact ? differences.slice(0, 2) : differences.slice(0, 4)

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-muted-foreground">关键差异</h4>
      <div className="space-y-2">
        {displayItems.map((diff) => {
          const config = SIGNIFICANCE_CONFIG[diff.significance]
          const metricConfig = METRIC_CONFIG[diff.metric]

          return (
            <div
              key={diff.metric}
              className={cn('rounded-lg border border-border p-2', config.bg)}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium">{metricConfig?.label || diff.metricLabel}</span>
                <Badge variant="outline" className={cn('text-xs', config.color)}>
                  {config.label}差异
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  最优: {diff.bestStrategy}
                </span>
                <span className="flex items-center gap-1">
                  <TrendingDown className="h-3 w-3 text-red-500" />
                  最差: {diff.worstStrategy}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export function ComparisonInsightCard({
  data,
  compact = false,
  onExpand,
}: ComparisonInsightCardProps) {
  const [isHovered, setIsHovered] = React.useState(false)

  // 找出总收益最高的策略
  const bestStrategy = data.strategies.reduce((best, current) => {
    const currentReturn = safeNumber(current.metrics.totalReturn, 0)
    const bestReturn = safeNumber(best.metrics.totalReturn, 0)
    return currentReturn > bestReturn ? current : best
  })

  return (
    <Card
      className={cn(
        'relative cursor-pointer overflow-hidden transition-all duration-200',
        'border-l-4 border-l-orange-500',
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
            <div className="rounded-lg bg-orange-500/10 p-2">
              <GitCompare className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">策略对比分析</h3>
              <p className="text-xs text-muted-foreground">
                {data.strategies.length} 个策略
              </p>
            </div>
          </div>

          {/* Best Strategy Badge */}
          <Badge variant="default" className="gap-1" style={{ backgroundColor: bestStrategy.color }}>
            <Trophy className="h-3 w-3" />
            {bestStrategy.name}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* AI Summary */}
        <div className="rounded-lg bg-primary/5 p-3">
          <p className="text-sm text-muted-foreground">
            {compact
              ? data.aiSummary.slice(0, 80) + '...'
              : data.aiSummary.slice(0, 150) + '...'}
          </p>
        </div>

        {!compact && (
          <>
            {/* Comparison Table */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">性能对比</h4>
              <ComparisonTable strategies={data.strategies} compact={compact} />
            </div>

            {/* Radar Chart Legend */}
            <RadarChartLegend strategies={data.strategies} />

            {/* Difference Analysis */}
            {data.differences.length > 0 && (
              <DifferenceAnalysis differences={data.differences} compact={compact} />
            )}
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
          {compact ? '查看完整对比' : '打开对比分析画布'}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardContent>

      {/* Hover indicator */}
      {isHovered && <div className="pointer-events-none absolute inset-0 bg-primary/[0.03]" />}
    </Card>
  )
}

export default ComparisonInsightCard
