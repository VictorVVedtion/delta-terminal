/**
 * PaperTradingStatusCard - Header 中的 Paper Trading 状态卡片
 *
 * 始终显示在 Header 中，让用户随时可以看到 Paper Trading 状态
 * 点击可展开 Paper Trading 面板
 */

'use client'

import { Activity, Target,TrendingDown, TrendingUp } from 'lucide-react'
import React from 'react'

import { cn } from '@/lib/utils'
import type { PaperAccountStats } from '@/types/paperTrading'

// =============================================================================
// Types
// =============================================================================

interface PaperTradingStatusCardProps {
  /** 是否正在运行 */
  isRunning: boolean
  /** 账户统计数据 */
  stats: PaperAccountStats | null
  /** 点击回调 */
  onClick: () => void
  /** 额外的 className */
  className?: string
}

// =============================================================================
// Component
// =============================================================================

export function PaperTradingStatusCard({
  isRunning,
  stats,
  onClick,
  className,
}: PaperTradingStatusCardProps) {
  // 未运行时显示快捷入口
  if (!isRunning) {
    return (
      <button
        onClick={onClick}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg',
          'bg-[hsl(var(--rb-yellow))]/10 border border-[hsl(var(--rb-yellow))]/20',
          'hover:bg-[hsl(var(--rb-yellow))]/20 hover:border-[hsl(var(--rb-yellow))]/40',
          'transition-all duration-200 cursor-pointer',
          className
        )}
        aria-label="开始 Paper Trading"
      >
        <Target className="h-4 w-4 text-[hsl(var(--rb-yellow))]" />
        <span className="text-xs font-medium text-[hsl(var(--rb-yellow))]">
          Paper Trading
        </span>
      </button>
    )
  }

  // 运行中显示状态
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg',
        'bg-[hsl(var(--rb-yellow))]/10 border border-[hsl(var(--rb-yellow))]/30',
        'hover:bg-[hsl(var(--rb-yellow))]/20 transition-all duration-200',
        'cursor-pointer animate-pulse-subtle',
        className
      )}
      aria-label="Paper Trading 状态"
      aria-pressed={isRunning}
    >
      {/* 状态指示器 */}
      <div className="flex items-center gap-1.5">
        <Activity className="h-4 w-4 text-[hsl(var(--rb-yellow))] animate-pulse" />
        <span className="text-xs font-medium text-[hsl(var(--rb-yellow))]">
          PT
        </span>
      </div>

      {/* 分隔线 */}
      <div className="w-px h-4 bg-[hsl(var(--rb-yellow))]/30" />

      {/* PnL 显示 */}
      {stats ? (
        <div className="flex items-center gap-1">
          {stats.totalPnl >= 0 ? (
            <TrendingUp className="h-3.5 w-3.5 text-[hsl(var(--rb-green))]" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-[hsl(var(--rb-red))]" />
          )}
          <span
            className={cn(
              'text-sm font-mono font-bold',
              stats.totalPnl >= 0
                ? 'text-[hsl(var(--rb-green))]'
                : 'text-[hsl(var(--rb-red))]'
            )}
          >
            {stats.totalPnl >= 0 ? '+' : ''}${Math.abs(stats.totalPnl).toFixed(2)}
          </span>
          <span className="text-[10px] text-muted-foreground">
            ({stats.totalPnlPercent >= 0 ? '+' : ''}{stats.totalPnlPercent.toFixed(1)}%)
          </span>
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">加载中...</span>
      )}
    </button>
  )
}

// =============================================================================
// 紧凑版本 - 用于移动端或空间受限场景
// =============================================================================

export function PaperTradingStatusBadge({
  isRunning,
  stats,
  onClick,
}: PaperTradingStatusCardProps) {
  if (!isRunning) return null

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 px-2 py-1 rounded-md',
        'bg-[hsl(var(--rb-yellow))]/10',
        'hover:bg-[hsl(var(--rb-yellow))]/20 transition-colors'
      )}
      aria-label="Paper Trading 状态"
    >
      <div className="w-2 h-2 rounded-full bg-[hsl(var(--rb-yellow))] animate-pulse" />
      {stats && (
        <span
          className={cn(
            'text-xs font-mono font-medium',
            stats.totalPnl >= 0
              ? 'text-[hsl(var(--rb-green))]'
              : 'text-[hsl(var(--rb-red))]'
          )}
        >
          {stats.totalPnl >= 0 ? '+' : ''}{stats.totalPnlPercent.toFixed(1)}%
        </span>
      )}
    </button>
  )
}

export default PaperTradingStatusCard
