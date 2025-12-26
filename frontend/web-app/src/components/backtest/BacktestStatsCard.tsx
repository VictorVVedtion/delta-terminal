'use client'

import React from 'react'
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  AlertTriangle,
  Clock,
  DollarSign,
  BarChart3,
  Percent,
  Zap,
} from 'lucide-react'
import type { BacktestStats } from '@/types/insight'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

interface BacktestStatsCardProps {
  stats: BacktestStats
  className?: string
  /** Display mode: full grid or compact summary */
  mode?: 'full' | 'compact' | 'minimal'
}

interface StatItemProps {
  label: string
  value: string | number
  subValue?: string | undefined
  icon?: React.ReactNode | undefined
  trend?: 'up' | 'down' | 'neutral' | undefined
  highlight?: 'positive' | 'negative' | 'warning' | 'neutral' | undefined
  tooltip?: string | undefined
}

// =============================================================================
// Constants
// =============================================================================

const STAT_THRESHOLDS = {
  winRate: { good: 60, warning: 45 },
  profitFactor: { good: 1.5, warning: 1 },
  sharpeRatio: { good: 1.5, warning: 0.5 },
  maxDrawdown: { good: -10, warning: -20 },
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

function formatPercent(value: number, decimals = 2): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`
}

function formatRatio(value: number): string {
  return value.toFixed(2)
}

function formatDuration(hours: number): string {
  if (hours < 24) {
    return `${hours.toFixed(1)}h`
  }
  const days = hours / 24
  return `${days.toFixed(1)}d`
}

function getHighlight(
  metric: keyof typeof STAT_THRESHOLDS,
  value: number
): 'positive' | 'negative' | 'warning' | 'neutral' {
  const threshold = STAT_THRESHOLDS[metric]
  if (!threshold) return 'neutral'

  // For drawdown (negative is worse)
  if (metric === 'maxDrawdown') {
    if (value >= threshold.good) return 'positive'
    if (value >= threshold.warning) return 'warning'
    return 'negative'
  }

  // For other metrics (higher is better)
  if (value >= threshold.good) return 'positive'
  if (value >= threshold.warning) return 'warning'
  return 'negative'
}

// =============================================================================
// Stat Item Component
// =============================================================================

function StatItem({
  label,
  value,
  subValue,
  icon,
  trend,
  highlight = 'neutral',
  tooltip,
}: StatItemProps) {
  const highlightColors = {
    positive: 'text-green-400',
    negative: 'text-red-400',
    warning: 'text-yellow-400',
    neutral: 'text-zinc-200',
  }

  const trendColors = {
    up: 'text-green-400',
    down: 'text-red-400',
    neutral: 'text-zinc-400',
  }

  return (
    <div
      className="flex flex-col gap-1 p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
      title={tooltip}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-400">{label}</span>
        {icon && <span className="text-zinc-500">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className={cn('text-lg font-semibold', highlightColors[highlight])}>
          {value}
        </span>
        {trend && (
          <span className={cn('text-xs', trendColors[trend])}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '–'}
          </span>
        )}
      </div>
      {subValue && (
        <span className="text-xs text-zinc-500">{subValue}</span>
      )}
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export function BacktestStatsCard({
  stats,
  className,
  mode = 'full',
}: BacktestStatsCardProps) {
  // Calculate additional metrics
  const totalReturn = ((stats.finalCapital - stats.initialCapital) / stats.initialCapital) * 100
  const avgTrade = stats.totalTrades > 0
    ? (stats.finalCapital - stats.initialCapital - stats.totalFees) / stats.totalTrades
    : 0
  const riskRewardRatio = stats.avgLoss !== 0 ? Math.abs(stats.avgWin / stats.avgLoss) : 0

  if (mode === 'minimal') {
    return (
      <div className={cn('flex items-center gap-4 text-sm', className)}>
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-400">收益</span>
          <span className={cn(
            'font-medium',
            totalReturn >= 0 ? 'text-green-400' : 'text-red-400'
          )}>
            {formatPercent(totalReturn)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-400">胜率</span>
          <span className={cn(
            'font-medium',
            stats.winRate >= 50 ? 'text-green-400' : 'text-yellow-400'
          )}>
            {stats.winRate.toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-400">夏普</span>
          <span className={cn(
            'font-medium',
            stats.sharpeRatio >= 1 ? 'text-green-400' : 'text-zinc-300'
          )}>
            {stats.sharpeRatio.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-400">回撤</span>
          <span className="font-medium text-red-400">
            {stats.maxDrawdown.toFixed(1)}%
          </span>
        </div>
      </div>
    )
  }

  if (mode === 'compact') {
    return (
      <div className={cn('grid grid-cols-2 sm:grid-cols-4 gap-3', className)}>
        <StatItem
          label="总收益"
          value={formatPercent(totalReturn)}
          subValue={formatCurrency(stats.finalCapital - stats.initialCapital)}
          icon={<Percent className="h-3.5 w-3.5" />}
          trend={totalReturn >= 0 ? 'up' : 'down'}
          highlight={totalReturn >= 10 ? 'positive' : totalReturn >= 0 ? 'neutral' : 'negative'}
        />
        <StatItem
          label="胜率"
          value={`${stats.winRate.toFixed(1)}%`}
          subValue={`${stats.winningTrades}/${stats.totalTrades}`}
          icon={<Target className="h-3.5 w-3.5" />}
          highlight={getHighlight('winRate', stats.winRate)}
        />
        <StatItem
          label="夏普比率"
          value={formatRatio(stats.sharpeRatio)}
          icon={<Activity className="h-3.5 w-3.5" />}
          highlight={getHighlight('sharpeRatio', stats.sharpeRatio)}
        />
        <StatItem
          label="最大回撤"
          value={`${stats.maxDrawdown.toFixed(1)}%`}
          subValue={`${stats.maxDrawdownDays}天`}
          icon={<TrendingDown className="h-3.5 w-3.5" />}
          highlight={getHighlight('maxDrawdown', stats.maxDrawdown)}
        />
      </div>
    )
  }

  // Full mode - comprehensive stats grid
  return (
    <div className={cn('space-y-4', className)}>
      {/* Primary Metrics */}
      <div>
        <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
          核心指标
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatItem
            label="总收益"
            value={formatPercent(totalReturn)}
            subValue={formatCurrency(stats.finalCapital - stats.initialCapital)}
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            trend={totalReturn >= 0 ? 'up' : 'down'}
            highlight={totalReturn >= 10 ? 'positive' : totalReturn >= 0 ? 'neutral' : 'negative'}
            tooltip="策略总收益率"
          />
          <StatItem
            label="年化收益"
            value={formatPercent(stats.annualizedReturn)}
            icon={<BarChart3 className="h-3.5 w-3.5" />}
            highlight={stats.annualizedReturn >= 20 ? 'positive' : stats.annualizedReturn >= 0 ? 'neutral' : 'negative'}
            tooltip="折算为年度收益率"
          />
          <StatItem
            label="夏普比率"
            value={formatRatio(stats.sharpeRatio)}
            icon={<Activity className="h-3.5 w-3.5" />}
            highlight={getHighlight('sharpeRatio', stats.sharpeRatio)}
            tooltip="风险调整后收益，>1.5 为优秀"
          />
          <StatItem
            label="索提诺比率"
            value={formatRatio(stats.sortinoRatio)}
            icon={<Zap className="h-3.5 w-3.5" />}
            highlight={stats.sortinoRatio >= 2 ? 'positive' : stats.sortinoRatio >= 1 ? 'neutral' : 'warning'}
            tooltip="仅考虑下行波动的风险调整收益"
          />
        </div>
      </div>

      {/* Risk Metrics */}
      <div>
        <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
          风险指标
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatItem
            label="最大回撤"
            value={`${stats.maxDrawdown.toFixed(1)}%`}
            subValue={`持续 ${stats.maxDrawdownDays} 天`}
            icon={<TrendingDown className="h-3.5 w-3.5" />}
            highlight={getHighlight('maxDrawdown', stats.maxDrawdown)}
            tooltip="最大资金回撤幅度"
          />
          <StatItem
            label="盈利因子"
            value={formatRatio(stats.profitFactor)}
            icon={<DollarSign className="h-3.5 w-3.5" />}
            highlight={getHighlight('profitFactor', stats.profitFactor)}
            tooltip="总盈利/总亏损，>1.5 为健康"
          />
          <StatItem
            label="盈亏比"
            value={formatRatio(riskRewardRatio)}
            icon={<Target className="h-3.5 w-3.5" />}
            highlight={riskRewardRatio >= 1.5 ? 'positive' : riskRewardRatio >= 1 ? 'neutral' : 'warning'}
            tooltip="平均盈利/平均亏损"
          />
          <StatItem
            label="峰值资金"
            value={formatCurrency(stats.peakCapital)}
            icon={<AlertTriangle className="h-3.5 w-3.5" />}
            highlight="neutral"
            tooltip="历史最高权益"
          />
        </div>
      </div>

      {/* Trade Statistics */}
      <div>
        <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
          交易统计
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatItem
            label="胜率"
            value={`${stats.winRate.toFixed(1)}%`}
            subValue={`${stats.winningTrades} 盈 / ${stats.losingTrades} 亏`}
            icon={<Target className="h-3.5 w-3.5" />}
            highlight={getHighlight('winRate', stats.winRate)}
          />
          <StatItem
            label="总交易"
            value={stats.totalTrades.toString()}
            subValue={`平均 ${formatDuration(stats.avgHoldingTime)} 持仓`}
            icon={<Activity className="h-3.5 w-3.5" />}
            highlight="neutral"
          />
          <StatItem
            label="平均盈利"
            value={formatCurrency(stats.avgWin)}
            subValue={`最大 ${formatCurrency(stats.maxWin)}`}
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            highlight="positive"
          />
          <StatItem
            label="平均亏损"
            value={formatCurrency(stats.avgLoss)}
            subValue={`最大 ${formatCurrency(stats.maxLoss)}`}
            icon={<TrendingDown className="h-3.5 w-3.5" />}
            highlight="negative"
          />
        </div>
      </div>

      {/* Capital Summary */}
      <div>
        <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
          资金概况
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatItem
            label="初始资金"
            value={formatCurrency(stats.initialCapital)}
            icon={<DollarSign className="h-3.5 w-3.5" />}
            highlight="neutral"
          />
          <StatItem
            label="最终资金"
            value={formatCurrency(stats.finalCapital)}
            icon={<DollarSign className="h-3.5 w-3.5" />}
            trend={stats.finalCapital >= stats.initialCapital ? 'up' : 'down'}
            highlight={stats.finalCapital >= stats.initialCapital ? 'positive' : 'negative'}
          />
          <StatItem
            label="总手续费"
            value={formatCurrency(stats.totalFees)}
            icon={<Clock className="h-3.5 w-3.5" />}
            highlight="warning"
          />
          <StatItem
            label="平均每笔"
            value={formatCurrency(avgTrade)}
            icon={<BarChart3 className="h-3.5 w-3.5" />}
            highlight={avgTrade >= 0 ? 'positive' : 'negative'}
          />
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Single Stat Card (for custom layouts)
// =============================================================================

export function SingleStatCard({
  label,
  value,
  subValue,
  icon,
  trend,
  highlight = 'neutral',
  className,
}: StatItemProps & { className?: string }) {
  return (
    <div className={cn('', className)}>
      <StatItem
        label={label}
        value={value}
        subValue={subValue}
        icon={icon}
        trend={trend}
        highlight={highlight}
      />
    </div>
  )
}

export default BacktestStatsCard
