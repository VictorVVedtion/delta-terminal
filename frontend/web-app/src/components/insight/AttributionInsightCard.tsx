'use client'

/**
 * AttributionInsightCard Component
 *
 * EPIC-008 Story 8.2: 盈亏归因分析卡片
 * 展示策略盈亏的分解归因，帮助理解收益来源和风险点
 */

import { ChevronRight, PieChart, TrendingDown, TrendingUp } from 'lucide-react'
import React from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { safeNumber, formatSafeCurrency } from '@/lib/safe-number'
import { cn } from '@/lib/utils'
import type { AttributionInsightData } from '@/types/insight'

// =============================================================================
// Types
// =============================================================================

interface AttributionInsightCardProps {
  /** 归因分析数据 */
  data: AttributionInsightData
  /** 是否为紧凑模式 */
  compact?: boolean
  /** 展开回调 */
  onExpand?: () => void
}

// =============================================================================
// Constants
// =============================================================================

const FACTOR_COLORS: Record<string, string> = {
  趋势跟踪: 'bg-blue-500',
  波段交易: 'bg-green-500',
  止损: 'bg-red-500',
  止盈: 'bg-emerald-500',
  手续费: 'bg-gray-500',
  滑点: 'bg-yellow-500',
  其他: 'bg-purple-500',
}

// =============================================================================
// Sub Components
// =============================================================================

/**
 * 瀑布图简化版 - 显示主要归因因子
 */
function WaterfallChart({
  breakdown,
  totalPnL,
  compact = false,
}: {
  breakdown: AttributionInsightData['attributionBreakdown']
  totalPnL: number
  compact?: boolean
}) {
  const safeTotalPnL = safeNumber(totalPnL, 0)
  const displayItems = compact ? breakdown.slice(0, 3) : breakdown.slice(0, 5)

  // 按贡献绝对值排序
  const sortedItems = [...displayItems].sort(
    (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)
  )

  return (
    <div className="space-y-2">
      {sortedItems.map((item) => {
        const safeContribution = safeNumber(item.contribution, 0)
        const safePercent = safeNumber(item.contributionPercent, 0)
        const isPositive = safeContribution >= 0
        const barWidth = Math.min(Math.abs(safePercent), 100)

        return (
          <div key={item.factor} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{item.factor}</span>
              <span className={cn(isPositive ? 'text-green-500' : 'text-red-500')}>
                {isPositive ? '+' : ''}
                {formatSafeCurrency(safeContribution)}
              </span>
            </div>

            {/* Progress bar */}
            <div className="relative h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all',
                  FACTOR_COLORS[item.factor] || 'bg-primary',
                  !isPositive && 'opacity-60'
                )}
                style={{ width: `${barWidth}%` }}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {item.description || ''}
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                {safePercent.toFixed(1)}%
              </span>
            </div>
          </div>
        )
      })}

      {/* Total PnL */}
      <div className="mt-3 flex items-center justify-between border-t border-border pt-2">
        <span className="text-sm font-medium">总盈亏</span>
        <span
          className={cn(
            'text-sm font-bold',
            safeTotalPnL >= 0 ? 'text-green-500' : 'text-red-500'
          )}
        >
          {safeTotalPnL >= 0 ? '+' : ''}
          {formatSafeCurrency(safeTotalPnL)}
        </span>
      </div>
    </div>
  )
}

/**
 * 饼图图例 - 显示主要因子占比
 */
function PieChartLegend({
  breakdown,
}: {
  breakdown: AttributionInsightData['attributionBreakdown']
}) {
  // 只显示正向贡献的因子
  const positiveFactors = breakdown.filter((item) => item.contribution > 0)

  return (
    <div className="space-y-1">
      <h4 className="text-xs font-medium text-muted-foreground">正向贡献因子</h4>
      <div className="space-y-1.5">
        {positiveFactors.slice(0, 4).map((item) => {
          const safePercent = safeNumber(item.contributionPercent, 0)
          return (
            <div key={item.factor} className="flex items-center gap-2">
              <div
                className={cn('h-3 w-3 rounded-sm', FACTOR_COLORS[item.factor] || 'bg-primary')}
              />
              <span className="flex-1 text-xs">{item.factor}</span>
              <span className="text-xs font-mono text-muted-foreground">
                {safePercent.toFixed(1)}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * 时间序列摘要 - 显示归因随时间的变化趋势
 */
function TimeSeriesSummary({
  timeSeries,
}: {
  timeSeries: AttributionInsightData['timeSeriesAttribution']
}) {
  if (timeSeries.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">暂无时间序列数据</p>
    )
  }

  const latestPoint = timeSeries[timeSeries.length - 1]
  const firstPoint = timeSeries[0]

  // 计算趋势
  const factorNames = Object.keys(latestPoint.factors)
  const trendingFactors = factorNames
    .map((factor) => {
      const latest = safeNumber(latestPoint.factors[factor], 0)
      const first = safeNumber(firstPoint.factors[factor], 0)
      const change = latest - first
      return { factor, change }
    })
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
    .slice(0, 2)

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-muted-foreground">趋势分析</h4>
      <div className="space-y-1.5">
        {trendingFactors.map(({ factor, change }) => {
          const isIncreasing = change > 0
          return (
            <div key={factor} className="flex items-center gap-2 text-xs">
              {isIncreasing ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className="flex-1">{factor}</span>
              <span className={cn(isIncreasing ? 'text-green-500' : 'text-red-500')}>
                {isIncreasing ? '+' : ''}
                {formatSafeCurrency(change)}
              </span>
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

export function AttributionInsightCard({
  data,
  compact = false,
  onExpand,
}: AttributionInsightCardProps) {
  const [isHovered, setIsHovered] = React.useState(false)

  const safeTotalPnL = safeNumber(data.totalPnL, 0)
  const isProfitable = safeTotalPnL >= 0

  // 计算统计
  const positiveFactors = data.attributionBreakdown.filter((item) => item.contribution > 0)
  const negativeFactors = data.attributionBreakdown.filter((item) => item.contribution < 0)

  return (
    <Card
      className={cn(
        'relative cursor-pointer overflow-hidden transition-all duration-200',
        'border-l-4 border-l-emerald-500',
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
            <div className="rounded-lg bg-emerald-500/10 p-2">
              <PieChart className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">盈亏归因分析</h3>
              <p className="text-xs text-muted-foreground">
                {data.strategyName} · {data.symbol}
              </p>
            </div>
          </div>

          {/* Total PnL Badge */}
          <Badge variant={isProfitable ? 'default' : 'destructive'} className="gap-1">
            {isProfitable ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {formatSafeCurrency(safeTotalPnL)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* AI Summary */}
        <div className="rounded-lg bg-primary/5 p-3">
          <p className="text-sm text-muted-foreground">
            {compact
              ? data.aiInsight.slice(0, 80) + '...'
              : data.aiInsight.slice(0, 150) + '...'}
          </p>
        </div>

        {!compact && (
          <>
            {/* Attribution Breakdown */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">盈亏分解</h4>
              <WaterfallChart
                breakdown={data.attributionBreakdown}
                totalPnL={data.totalPnL}
                compact={compact}
              />
            </div>

            {/* Pie Chart Legend */}
            {positiveFactors.length > 0 && (
              <PieChartLegend breakdown={data.attributionBreakdown} />
            )}

            {/* Time Series Summary */}
            {data.timeSeriesAttribution.length > 0 && (
              <TimeSeriesSummary timeSeries={data.timeSeriesAttribution} />
            )}

            {/* Factor Summary */}
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3">
              <div>
                <p className="text-xs text-muted-foreground">正向因子</p>
                <p className="text-sm font-medium text-green-500">
                  {positiveFactors.length} 个
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">负向因子</p>
                <p className="text-sm font-medium text-red-500">
                  {negativeFactors.length} 个
                </p>
              </div>
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
          {compact ? '查看完整归因' : '打开归因分析画布'}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardContent>

      {/* Hover indicator */}
      {isHovered && <div className="pointer-events-none absolute inset-0 bg-primary/[0.03]" />}
    </Card>
  )
}

export default AttributionInsightCard
