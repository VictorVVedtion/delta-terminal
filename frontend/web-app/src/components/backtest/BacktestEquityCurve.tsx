'use client'

import React from 'react'
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { cn } from '@/lib/utils'
import type { BacktestEquityPoint } from '@/types/insight'

// =============================================================================
// Types
// =============================================================================

interface BacktestEquityCurveProps {
  data: BacktestEquityPoint[]
  benchmark?: BacktestEquityPoint[] | undefined
  initialCapital: number
  className?: string | undefined
  height?: number | undefined
  showDrawdown?: boolean | undefined
  showDailyPnL?: boolean | undefined
  showBenchmark?: boolean | undefined
}

interface ChartDataPoint {
  date: string
  timestamp: number
  equity: number
  dailyPnl: number
  cumulativePnl: number
  drawdown: number
  benchmark?: number | undefined
  benchmarkPnl?: number | undefined
}

// =============================================================================
// Constants
// =============================================================================

const CHART_COLORS = {
  equity: '#3b82f6', // blue-500
  equityArea: 'rgba(59, 130, 246, 0.1)',
  benchmark: '#a855f7', // purple-500
  dailyPnlPositive: '#22c55e', // green-500
  dailyPnlNegative: '#ef4444', // red-500
  drawdown: 'rgba(239, 68, 68, 0.3)',
  grid: '#27272a',
  text: '#a1a1aa',
  tooltip: '#18181b',
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`
  }
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`
  }
  return `$${value.toFixed(2)}`
}

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  })
}

function formatFullDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// =============================================================================
// Custom Tooltip
// =============================================================================

interface CustomTooltipProps {
  active?: boolean
  payload?: {
    dataKey: string
    value: number
    color: string
    name: string
    payload: ChartDataPoint
  }[]
  label?: string
  initialCapital: number
}

function CustomTooltip({ active, payload, initialCapital }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null
  }

  const firstPayload = payload[0]
  if (!firstPayload) return null
  const data = firstPayload.payload

  const equityReturn = ((data.equity - initialCapital) / initialCapital) * 100

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl">
      <p className="text-xs text-zinc-400 mb-2">{formatFullDate(data.timestamp)}</p>

      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-xs text-zinc-400">权益:</span>
          <span className="text-xs font-medium text-blue-400">
            {formatCurrency(data.equity)}
          </span>
        </div>

        <div className="flex justify-between gap-4">
          <span className="text-xs text-zinc-400">累计收益:</span>
          <span className={cn(
            'text-xs font-medium',
            equityReturn >= 0 ? 'text-green-400' : 'text-red-400'
          )}>
            {formatPercent(equityReturn)}
          </span>
        </div>

        {data.dailyPnl !== 0 && (
          <div className="flex justify-between gap-4">
            <span className="text-xs text-zinc-400">当日盈亏:</span>
            <span className={cn(
              'text-xs font-medium',
              data.dailyPnl >= 0 ? 'text-green-400' : 'text-red-400'
            )}>
              {formatCurrency(data.dailyPnl)}
            </span>
          </div>
        )}

        {data.drawdown < 0 && (
          <div className="flex justify-between gap-4">
            <span className="text-xs text-zinc-400">回撤:</span>
            <span className="text-xs font-medium text-red-400">
              {formatPercent(data.drawdown)}
            </span>
          </div>
        )}

        {data.benchmark !== undefined && (
          <div className="flex justify-between gap-4 border-t border-zinc-700 pt-1 mt-1">
            <span className="text-xs text-zinc-400">基准收益:</span>
            <span className={cn(
              'text-xs font-medium',
              (data.benchmarkPnl ?? 0) >= 0 ? 'text-purple-400' : 'text-red-400'
            )}>
              {formatPercent(data.benchmarkPnl ?? 0)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// Component
// =============================================================================

export function BacktestEquityCurve({
  data,
  benchmark,
  initialCapital,
  className,
  height = 320,
  showDrawdown = true,
  showDailyPnL = true,
  showBenchmark = true,
}: BacktestEquityCurveProps) {
  // Transform data for the chart
  const chartData: ChartDataPoint[] = React.useMemo(() => {
    return data.map((point, index) => {
      const benchmarkPoint = benchmark?.[index]
      const benchmarkPnl = benchmarkPoint
        ? ((benchmarkPoint.equity - initialCapital) / initialCapital) * 100
        : undefined

      return {
        date: formatDate(point.timestamp),
        timestamp: point.timestamp,
        equity: point.equity,
        dailyPnl: point.dailyPnl,
        cumulativePnl: point.cumulativePnl,
        drawdown: point.drawdown,
        benchmark: benchmarkPoint?.equity,
        benchmarkPnl,
      }
    })
  }, [data, benchmark, initialCapital])

  // Calculate min/max for Y axis
  const { minEquity, maxEquity, minDrawdown } = React.useMemo(() => {
    let min = initialCapital
    let max = initialCapital
    let minDd = 0

    chartData.forEach((point) => {
      if (point.equity < min) min = point.equity
      if (point.equity > max) max = point.equity
      if (point.benchmark !== undefined) {
        if (point.benchmark < min) min = point.benchmark
        if (point.benchmark > max) max = point.benchmark
      }
      if (point.drawdown < minDd) minDd = point.drawdown
    })

    // Add padding
    const range = max - min
    return {
      minEquity: min - range * 0.1,
      maxEquity: max + range * 0.1,
      minDrawdown: minDd,
    }
  }, [chartData, initialCapital])

  if (data.length === 0) {
    return (
      <div className={cn('flex items-center justify-center', className)} style={{ height }}>
        <p className="text-sm text-zinc-500">暂无权益曲线数据</p>
      </div>
    )
  }

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
        >
          <defs>
            <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.equity} stopOpacity={0.3} />
              <stop offset="95%" stopColor={CHART_COLORS.equity} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke={CHART_COLORS.grid}
            vertical={false}
          />

          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: CHART_COLORS.text }}
            tickLine={false}
            axisLine={{ stroke: CHART_COLORS.grid }}
            interval="preserveStartEnd"
          />

          <YAxis
            yAxisId="equity"
            domain={[minEquity, maxEquity]}
            tick={{ fontSize: 11, fill: CHART_COLORS.text }}
            tickFormatter={formatCurrency}
            tickLine={false}
            axisLine={false}
            width={60}
          />

          {showDailyPnL && (
            <YAxis
              yAxisId="pnl"
              orientation="right"
              tick={{ fontSize: 11, fill: CHART_COLORS.text }}
              tickFormatter={formatCurrency}
              tickLine={false}
              axisLine={false}
              width={50}
            />
          )}

          <Tooltip
            content={<CustomTooltip initialCapital={initialCapital} />}
            cursor={{ stroke: CHART_COLORS.text, strokeWidth: 1, strokeDasharray: '3 3' }}
          />

          <Legend
            verticalAlign="top"
            height={36}
            formatter={(value: string) => (
              <span className="text-xs text-zinc-400">{value}</span>
            )}
          />

          {/* Reference line at initial capital */}
          <ReferenceLine
            yAxisId="equity"
            y={initialCapital}
            stroke={CHART_COLORS.text}
            strokeDasharray="3 3"
            strokeOpacity={0.5}
          />

          {/* Drawdown area */}
          {showDrawdown && minDrawdown < -1 && (
            <Area
              yAxisId="equity"
              type="monotone"
              dataKey={(d: ChartDataPoint) => initialCapital + (d.drawdown / 100) * initialCapital}
              fill="url(#drawdownGradient)"
              stroke="none"
              name="回撤区域"
              isAnimationActive={false}
            />
          )}

          {/* Daily PnL bars */}
          {showDailyPnL && (
            <Bar
              yAxisId="pnl"
              dataKey="dailyPnl"
              name="日盈亏"
              isAnimationActive={false}
            >
              {chartData.map((entry, index) => (
                <rect
                  key={`bar-${index}`}
                  fill={entry.dailyPnl >= 0 ? CHART_COLORS.dailyPnlPositive : CHART_COLORS.dailyPnlNegative}
                  opacity={0.6}
                />
              ))}
            </Bar>
          )}

          {/* Benchmark line */}
          {showBenchmark && benchmark && benchmark.length > 0 && (
            <Line
              yAxisId="equity"
              type="monotone"
              dataKey="benchmark"
              stroke={CHART_COLORS.benchmark}
              strokeWidth={1.5}
              dot={false}
              name="基准"
              strokeDasharray="5 5"
              isAnimationActive={false}
            />
          )}

          {/* Equity line with gradient fill */}
          <Area
            yAxisId="equity"
            type="monotone"
            dataKey="equity"
            fill="url(#equityGradient)"
            stroke={CHART_COLORS.equity}
            strokeWidth={2}
            name="权益曲线"
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

// =============================================================================
// Compact Version
// =============================================================================

interface CompactEquityCurveProps {
  data: BacktestEquityPoint[]
  className?: string
  height?: number
}

export function CompactEquityCurve({
  data,
  className,
  height = 80,
}: CompactEquityCurveProps) {
  const chartData = React.useMemo(() => {
    return data.map((point) => ({
      timestamp: point.timestamp,
      equity: point.equity,
    }))
  }, [data])

  const isPositive = data.length >= 2 && data[data.length - 1].equity >= data[0].equity

  if (data.length === 0) {
    return (
      <div className={cn('flex items-center justify-center', className)} style={{ height }}>
        <p className="text-xs text-zinc-500">-</p>
      </div>
    )
  }

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <defs>
            <linearGradient id="compactGradient" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={isPositive ? '#22c55e' : '#ef4444'}
                stopOpacity={0.3}
              />
              <stop
                offset="95%"
                stopColor={isPositive ? '#22c55e' : '#ef4444'}
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="equity"
            fill="url(#compactGradient)"
            stroke={isPositive ? '#22c55e' : '#ef4444'}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export default BacktestEquityCurve
