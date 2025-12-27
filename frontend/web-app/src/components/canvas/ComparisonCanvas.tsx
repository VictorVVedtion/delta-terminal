'use client'

/**
 * ComparisonCanvas Component
 *
 * EPIC-008 Story 8.3: 策略对比分析面板
 * 支持 2-4 个策略的并排性能对比
 */

import {
  AlertTriangle,
  BarChart3,
  TrendingDown,
  TrendingUp,
  Trophy,
  X,
} from 'lucide-react'
import React from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ComparisonInsightData, ComparisonStrategy, MetricDifference } from '@/types/insight'

// =============================================================================
// Types
// =============================================================================

interface ComparisonCanvasProps {
  /** 对比分析数据 */
  data: ComparisonInsightData
  /** 是否显示 */
  isOpen: boolean
  /** 关闭回调 */
  onClose: () => void
}

// =============================================================================
// Constants
// =============================================================================

const METRIC_LABELS: Record<string, { label: string; format: (v: number) => string; higherBetter: boolean }> = {
  totalReturn: { label: '总收益', format: v => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`, higherBetter: true },
  annualizedReturn: { label: '年化收益', format: v => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`, higherBetter: true },
  winRate: { label: '胜率', format: v => `${v.toFixed(1)}%`, higherBetter: true },
  maxDrawdown: { label: '最大回撤', format: v => `${v.toFixed(2)}%`, higherBetter: false },
  sharpeRatio: { label: '夏普比率', format: v => v.toFixed(2), higherBetter: true },
  sortinoRatio: { label: '索提诺比率', format: v => v.toFixed(2), higherBetter: true },
  profitFactor: { label: '盈亏比', format: v => v.toFixed(2), higherBetter: true },
  totalTrades: { label: '交易次数', format: v => v.toString(), higherBetter: true },
}

const SIGNIFICANCE_CONFIG = {
  high: { label: '显著', color: 'text-red-500', bg: 'bg-red-500/10' },
  medium: { label: '中等', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  low: { label: '轻微', color: 'text-green-500', bg: 'bg-green-500/10' },
} as const

// =============================================================================
// MetricRow Component
// =============================================================================

interface MetricRowProps {
  metricKey: string
  strategies: ComparisonStrategy[]
  differences: MetricDifference[]
}

function MetricRow({ metricKey, strategies, differences }: MetricRowProps) {
  const config = METRIC_LABELS[metricKey]
  if (!config) return null

  const diff = differences.find(d => d.metric === metricKey)

  // 找出最佳和最差
  const values = strategies.map(s => ({
    id: s.id,
    value: s.metrics[metricKey as keyof typeof s.metrics],
  }))

  const sortedValues = [...values].sort((a, b) =>
    config.higherBetter ? b.value - a.value : a.value - b.value
  )
  const bestId = sortedValues[0]?.id
  const worstId = sortedValues[sortedValues.length - 1]?.id

  return (
    <tr className="border-b border-border/50 last:border-0">
      <td className="py-3 pr-4">
        <span className="text-sm font-medium">{config.label}</span>
        {diff && (
          <Badge
            variant="outline"
            className={cn('ml-2 text-[10px]', SIGNIFICANCE_CONFIG[diff.significance].color)}
          >
            {SIGNIFICANCE_CONFIG[diff.significance].label}差异
          </Badge>
        )}
      </td>
      {strategies.map(strategy => {
        const value = strategy.metrics[metricKey as keyof typeof strategy.metrics]
        const isBest = strategy.id === bestId
        const isWorst = strategy.id === worstId

        return (
          <td
            key={strategy.id}
            className={cn(
              'py-3 text-center font-mono text-sm',
              isBest && 'text-green-500 font-medium',
              isWorst && values.length > 2 && 'text-red-500'
            )}
          >
            {config.format(value)}
            {isBest && (
              <Trophy className="inline-block ml-1 h-3 w-3 text-yellow-500" />
            )}
          </td>
        )
      })}
    </tr>
  )
}

// =============================================================================
// SimpleEquityCurve Component
// =============================================================================

interface SimpleEquityCurveProps {
  strategies: ComparisonStrategy[]
  height?: number
}

function SimpleEquityCurve({ strategies, height = 200 }: SimpleEquityCurveProps) {
  // 找出时间范围和值范围
  const allPoints = strategies.flatMap(s => s.equityCurve)
  if (allPoints.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-muted-foreground">
        无收益曲线数据
      </div>
    )
  }

  const minTime = Math.min(...allPoints.map(p => p.timestamp))
  const maxTime = Math.max(...allPoints.map(p => p.timestamp))
  const minEquity = Math.min(...allPoints.map(p => p.equity))
  const maxEquity = Math.max(...allPoints.map(p => p.equity))

  const width = 600
  const padding = { top: 10, right: 10, bottom: 30, left: 50 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const scaleX = (timestamp: number) =>
    padding.left + ((timestamp - minTime) / (maxTime - minTime)) * chartWidth

  const scaleY = (equity: number) =>
    padding.top + chartHeight - ((equity - minEquity) / (maxEquity - minEquity || 1)) * chartHeight

  const createPath = (points: typeof allPoints) => {
    if (points.length === 0) return ''
    const sorted = [...points].sort((a, b) => a.timestamp - b.timestamp)
    return sorted
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.timestamp)} ${scaleY(p.equity)}`)
      .join(' ')
  }

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      {/* Y-axis labels */}
      <text x={padding.left - 5} y={padding.top} textAnchor="end" className="text-[10px] fill-muted-foreground">
        {maxEquity.toFixed(0)}
      </text>
      <text x={padding.left - 5} y={padding.top + chartHeight} textAnchor="end" className="text-[10px] fill-muted-foreground">
        {minEquity.toFixed(0)}
      </text>

      {/* Grid lines */}
      <line
        x1={padding.left}
        y1={padding.top + chartHeight / 2}
        x2={padding.left + chartWidth}
        y2={padding.top + chartHeight / 2}
        stroke="var(--border)"
        strokeDasharray="4,4"
      />

      {/* Strategy curves */}
      {strategies.map(strategy => (
        <path
          key={strategy.id}
          d={createPath(strategy.equityCurve)}
          fill="none"
          stroke={strategy.color}
          strokeWidth={2}
          className="transition-opacity hover:opacity-100"
          style={{ opacity: 0.8 }}
        />
      ))}

      {/* X-axis */}
      <line
        x1={padding.left}
        y1={padding.top + chartHeight}
        x2={padding.left + chartWidth}
        y2={padding.top + chartHeight}
        stroke="var(--border)"
      />
    </svg>
  )
}

// =============================================================================
// ComparisonCanvas Component
// =============================================================================

export function ComparisonCanvas({
  data,
  isOpen,
  onClose,
}: ComparisonCanvasProps) {
  if (!isOpen) return null

  const mainMetrics = ['totalReturn', 'winRate', 'maxDrawdown', 'sharpeRatio']
  const secondaryMetrics = ['annualizedReturn', 'sortinoRatio', 'profitFactor', 'totalTrades']

  // 计算综合得分
  const getOverallScore = (strategy: ComparisonStrategy): number => {
    let score = 0
    mainMetrics.forEach(key => {
      const config = METRIC_LABELS[key]
      if (!config) return
      const values = data.strategies.map(s => s.metrics[key as keyof typeof s.metrics])
      const sorted = [...values].sort((a, b) => config.higherBetter ? b - a : a - b)
      const value = strategy.metrics[key as keyof typeof strategy.metrics]
      const rank = sorted.indexOf(value)
      score += (data.strategies.length - rank) * 10
    })
    return score
  }

  const rankedStrategies = [...data.strategies].sort(
    (a, b) => getOverallScore(b) - getOverallScore(a)
  )

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Canvas */}
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-full max-w-3xl z-50',
          'bg-background border-l border-border shadow-xl',
          'animate-in slide-in-from-right duration-300',
          'flex flex-col'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              策略对比
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              对比 {data.strategies.length} 个策略
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* 策略排名 */}
          <div className="flex gap-3 overflow-x-auto pb-2">
            {rankedStrategies.map((strategy, index) => (
              <div
                key={strategy.id}
                className={cn(
                  'flex-shrink-0 p-3 rounded-lg border min-w-[140px]',
                  index === 0
                    ? 'bg-yellow-500/10 border-yellow-500/30'
                    : 'bg-muted/50 border-border'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  {index === 0 && <Trophy className="h-4 w-4 text-yellow-500" />}
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: strategy.color }}
                  />
                  <span className="font-medium text-sm truncate">{strategy.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">{strategy.symbol}</p>
                <p
                  className={cn(
                    'font-mono font-medium mt-1',
                    strategy.metrics.totalReturn >= 0 ? 'text-green-500' : 'text-red-500'
                  )}
                >
                  {strategy.metrics.totalReturn >= 0 ? '+' : ''}
                  {strategy.metrics.totalReturn.toFixed(2)}%
                </p>
              </div>
            ))}
          </div>

          {/* 收益曲线对比 */}
          <div className="space-y-3">
            <h3 className="font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              收益曲线对比
            </h3>
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <SimpleEquityCurve strategies={data.strategies} />
              {/* Legend */}
              <div className="flex flex-wrap justify-center gap-4 mt-3">
                {data.strategies.map(strategy => (
                  <div key={strategy.id} className="flex items-center gap-2 text-sm">
                    <div
                      className="w-4 h-1 rounded"
                      style={{ backgroundColor: strategy.color }}
                    />
                    <span>{strategy.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 核心指标对比表 */}
          <div className="space-y-3">
            <h3 className="font-medium">核心指标对比</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-max">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2 pr-4 text-left text-sm font-medium text-muted-foreground">
                      指标
                    </th>
                    {data.strategies.map(strategy => (
                      <th
                        key={strategy.id}
                        className="py-2 text-center text-sm font-medium"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: strategy.color }}
                          />
                          {strategy.name}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mainMetrics.map(metric => (
                    <MetricRow
                      key={metric}
                      metricKey={metric}
                      strategies={data.strategies}
                      differences={data.differences}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 次要指标对比 */}
          <div className="space-y-3">
            <h3 className="font-medium text-muted-foreground">其他指标</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-max">
                <tbody>
                  {secondaryMetrics.map(metric => (
                    <MetricRow
                      key={metric}
                      metricKey={metric}
                      strategies={data.strategies}
                      differences={data.differences}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 差异分析 */}
          {data.differences.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-yellow-500" />
                显著差异
              </h3>
              <div className="space-y-2">
                {data.differences
                  .filter(d => d.significance === 'high')
                  .map(diff => (
                    <div
                      key={diff.metric}
                      className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm"
                    >
                      <span className="font-medium">{diff.metricLabel}</span>
                      <span className="text-muted-foreground">
                        : 最优 <span className="text-green-500">{diff.bestStrategy}</span>
                        , 最差 <span className="text-red-500">{diff.worstStrategy}</span>
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* AI 对比洞察 */}
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium mb-1">AI 对比洞察</p>
                <p className="text-sm text-muted-foreground">{data.aiSummary}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <Button className="w-full" onClick={onClose}>
            关闭
          </Button>
        </div>
      </div>
    </>
  )
}

export default ComparisonCanvas
