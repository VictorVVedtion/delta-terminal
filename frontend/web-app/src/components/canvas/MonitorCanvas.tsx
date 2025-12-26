'use client'

import React from 'react'
import {
  X,
  Play,
  Pause,
  Square,
  Settings,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Target,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// =============================================================================
// Type Definitions
// =============================================================================

export type StrategyStatus = 'running' | 'paused' | 'stopped'
export type OrderSide = 'buy' | 'sell'

export interface Position {
  /** 币种符号 */
  symbol: string
  /** 持仓数量 */
  amount: number
  /** 平均成本价 */
  avgPrice: number
  /** 当前市场价 */
  currentPrice: number
  /** 浮动盈亏 */
  unrealizedPnl: number
  /** 浮动盈亏百分比 */
  unrealizedPnlPercent: number
}

export interface Trade {
  /** 交易ID */
  id: string
  /** 时间戳 */
  timestamp: number
  /** 交易对 */
  symbol: string
  /** 买入/卖出 */
  side: OrderSide
  /** 成交价格 */
  price: number
  /** 成交数量 */
  amount: number
  /** 手续费 */
  fee: number
  /** 已实现盈亏 */
  realizedPnl?: number
}

export interface StrategyMetrics {
  /** 胜率 (0-1) */
  winRate: number
  /** 平均持仓时间 */
  avgHoldTime: string
  /** 最大回撤 (百分比) */
  maxDrawdown: number
  /** 总交易次数 */
  totalTrades: number
  /** 盈利交易次数 */
  winningTrades: number
  /** 亏损交易次数 */
  losingTrades: number
}

export interface StrategyInfo {
  /** 策略名称 */
  name: string
  /** 交易对 */
  symbol: string
  /** 运行状态 */
  status: StrategyStatus
  /** 创建时间 */
  createdAt: string
  /** 最后更新时间 */
  updatedAt?: string
}

export interface PnLData {
  /** 当日盈亏 */
  daily: number
  /** 总盈亏 */
  total: number
  /** 未实现盈亏 (浮盈) */
  unrealized: number
  /** 已实现盈亏 */
  realized: number
}

// =============================================================================
// MonitorCanvas Props
// =============================================================================

export interface MonitorCanvasProps {
  /** 策略ID */
  strategyId: string
  /** 面板是否打开 */
  isOpen: boolean
  /** 关闭回调 */
  onClose: () => void
  /** 暂停策略 */
  onPause?: () => void
  /** 恢复策略 */
  onResume?: () => void
  /** 停止策略 */
  onStop?: () => void
  /** 修改参数 */
  onModify?: () => void
  /** 策略基本信息 */
  strategy: StrategyInfo
  /** 盈亏数据 */
  pnl: PnLData
  /** 当前持仓列表 */
  positions: Position[]
  /** 最近交易记录 */
  recentTrades: Trade[]
  /** 性能指标 */
  metrics: StrategyMetrics
  /** 加载中 */
  isLoading?: boolean
}

// =============================================================================
// MonitorCanvas Component
// =============================================================================

export function MonitorCanvas({
  isOpen,
  onClose,
  onPause,
  onResume,
  onStop,
  onModify,
  strategy,
  pnl,
  positions,
  recentTrades,
  metrics,
  isLoading = false,
}: MonitorCanvasProps) {
  // Close on escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Get status badge config
  const getStatusBadge = (status: StrategyStatus) => {
    switch (status) {
      case 'running':
        return { label: '运行中', variant: 'success' as const }
      case 'paused':
        return { label: '已暂停', variant: 'warning' as const }
      case 'stopped':
        return { label: '已停止', variant: 'destructive' as const }
    }
  }

  const statusBadge = getStatusBadge(strategy.status)

  // Format timestamp
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  // Format currency
  const formatCurrency = (value: number, decimals = 2) => {
    return new Intl.NumberFormat('zh-CN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value)
  }

  // Format percentage
  const formatPercent = (value: number, decimals = 2) => {
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(decimals)}%`
  }

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden',
          'transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sliding Panel */}
      <aside
        className={cn(
          'fixed top-0 right-0 z-40 h-full w-full sm:w-[520px]',
          'bg-card/80 backdrop-blur-sm border-l border-border shadow-2xl',
          'transform transition-transform duration-300 ease-out',
          'flex flex-col',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Monitor Canvas"
      >
        {/* Header: 策略名称 + 状态 Badge */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-primary" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">{strategy.name}</h2>
                <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{strategy.symbol}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-4 space-y-6">
            {/* 实时 PnL 区 */}
            <section className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                实时盈亏
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {/* 当日盈亏 */}
                <PnLCard
                  label="当日盈亏"
                  value={pnl.daily}
                  formatValue={formatCurrency}
                />
                {/* 总盈亏 */}
                <PnLCard
                  label="总盈亏"
                  value={pnl.total}
                  formatValue={formatCurrency}
                />
                {/* 未实现盈亏 */}
                <PnLCard
                  label="浮动盈亏"
                  value={pnl.unrealized}
                  formatValue={formatCurrency}
                />
                {/* 已实现盈亏 */}
                <PnLCard
                  label="已实现盈亏"
                  value={pnl.realized}
                  formatValue={formatCurrency}
                />
              </div>
            </section>

            {/* 当前持仓区 */}
            <section className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Target className="h-4 w-4" />
                当前持仓 ({positions.length})
              </h3>
              {positions.length === 0 ? (
                <div className="p-4 bg-card/80 backdrop-blur-sm rounded-lg border border-border text-center text-sm text-muted-foreground">
                  暂无持仓
                </div>
              ) : (
                <div className="space-y-2 max-h-[240px] overflow-y-auto scrollbar-thin">
                  {positions.map((position, idx) => (
                    <PositionCard key={`${position.symbol}-${idx}`} position={position} formatCurrency={formatCurrency} formatPercent={formatPercent} />
                  ))}
                </div>
              )}
            </section>

            {/* 最近交易区 */}
            <section className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                最近交易 ({Math.min(recentTrades.length, 10)})
              </h3>
              {recentTrades.length === 0 ? (
                <div className="p-4 bg-card/80 backdrop-blur-sm rounded-lg border border-border text-center text-sm text-muted-foreground">
                  暂无交易记录
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin">
                  {recentTrades.slice(0, 10).map((trade) => (
                    <TradeCard key={trade.id} trade={trade} formatTime={formatTime} formatCurrency={formatCurrency} />
                  ))}
                </div>
              )}
            </section>

            {/* 性能指标区 */}
            <section className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                性能指标
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {/* 胜率 */}
                <MetricCard
                  label="胜率"
                  value={`${(metrics.winRate * 100).toFixed(1)}%`}
                  trend={metrics.winRate >= 0.6 ? 'up' : metrics.winRate >= 0.4 ? 'neutral' : 'down'}
                />
                {/* 平均持仓时间 */}
                <MetricCard
                  label="平均持仓"
                  value={metrics.avgHoldTime}
                  trend="neutral"
                />
                {/* 最大回撤 */}
                <MetricCard
                  label="最大回撤"
                  value={`${metrics.maxDrawdown.toFixed(2)}%`}
                  trend={metrics.maxDrawdown <= 5 ? 'up' : metrics.maxDrawdown <= 10 ? 'neutral' : 'down'}
                />
                {/* 总交易次数 */}
                <MetricCard
                  label="总交易"
                  value={`${metrics.totalTrades}`}
                  trend="neutral"
                />
              </div>
              {/* 交易统计 */}
              <div className="p-3 bg-card/80 backdrop-blur-sm rounded-lg border border-border">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">盈利 / 亏损</span>
                  <span className="font-medium">
                    <span className="text-green-500">{metrics.winningTrades}</span>
                    {' / '}
                    <span className="text-red-500">{metrics.losingTrades}</span>
                  </span>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* 操作按钮区 */}
        <footer className="px-4 py-3 border-t border-border bg-card/80 backdrop-blur-sm space-y-3">
          {/* 主要操作 */}
          <div className="flex items-center gap-2">
            {strategy.status === 'running' ? (
              <Button
                variant="warning"
                onClick={onPause}
                disabled={isLoading || !onPause}
                className="flex-1"
              >
                <Pause className="h-4 w-4 mr-2" />
                暂停策略
              </Button>
            ) : strategy.status === 'paused' ? (
              <Button
                variant="success"
                onClick={onResume}
                disabled={isLoading || !onResume}
                className="flex-1"
              >
                <Play className="h-4 w-4 mr-2" />
                恢复运行
              </Button>
            ) : (
              <Button
                variant="outline"
                disabled
                className="flex-1"
              >
                <Square className="h-4 w-4 mr-2" />
                已停止
              </Button>
            )}

            <Button
              variant="outline"
              onClick={onModify}
              disabled={isLoading || !onModify || strategy.status === 'stopped'}
              className="flex-1"
            >
              <Settings className="h-4 w-4 mr-2" />
              修改参数
            </Button>
          </div>

          {/* 停止策略 (危险操作) */}
          {strategy.status !== 'stopped' && (
            <Button
              variant="destructive"
              onClick={onStop}
              disabled={isLoading || !onStop}
              className="w-full"
            >
              <Square className="h-4 w-4 mr-2" />
              停止策略
            </Button>
          )}
        </footer>
      </aside>
    </>
  )
}

// =============================================================================
// Sub Components
// =============================================================================

/**
 * PnLCard - 盈亏指标卡片
 */
interface PnLCardProps {
  label: string
  value: number
  formatValue: (value: number, decimals?: number) => string
}

function PnLCard({ label, value, formatValue }: PnLCardProps) {
  const isPositive = value >= 0
  const isNeutral = value === 0

  return (
    <div
      className={cn(
        'p-3 rounded-lg border backdrop-blur-sm space-y-1',
        isNeutral && 'bg-muted/50 border-border',
        !isNeutral && isPositive && 'bg-green-500/5 border-green-500/20',
        !isNeutral && !isPositive && 'bg-red-500/5 border-red-500/20'
      )}
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={cn(
          'text-xl font-bold',
          isNeutral && 'text-foreground',
          !isNeutral && isPositive && 'text-green-500',
          !isNeutral && !isPositive && 'text-red-500'
        )}
      >
        {isPositive && value !== 0 && '+'}
        {formatValue(value)}
      </div>
    </div>
  )
}

/**
 * PositionCard - 持仓详情卡片
 */
interface PositionCardProps {
  position: Position
  formatCurrency: (value: number, decimals?: number) => string
  formatPercent: (value: number, decimals?: number) => string
}

function PositionCard({ position, formatCurrency, formatPercent }: PositionCardProps) {
  const isProfit = position.unrealizedPnl >= 0

  return (
    <div className="p-3 bg-card/80 backdrop-blur-sm rounded-lg border border-border space-y-2">
      {/* 币种和数量 */}
      <div className="flex items-center justify-between">
        <span className="font-medium">{position.symbol}</span>
        <span className="text-sm text-muted-foreground">
          {formatCurrency(position.amount, 4)}
        </span>
      </div>

      {/* 价格信息 */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">成本价: </span>
          <span className="font-medium">{formatCurrency(position.avgPrice)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">现价: </span>
          <span className="font-medium">{formatCurrency(position.currentPrice)}</span>
        </div>
      </div>

      {/* 浮动盈亏 */}
      <div className="flex items-center justify-between pt-1 border-t border-border/50">
        <span className="text-xs text-muted-foreground">浮动盈亏</span>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-sm font-semibold',
              isProfit ? 'text-green-500' : 'text-red-500'
            )}
          >
            {isProfit && '+'}
            {formatCurrency(position.unrealizedPnl)}
          </span>
          <span
            className={cn(
              'text-xs',
              isProfit ? 'text-green-500' : 'text-red-500'
            )}
          >
            ({formatPercent(position.unrealizedPnlPercent)})
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * TradeCard - 交易记录卡片
 */
interface TradeCardProps {
  trade: Trade
  formatTime: (timestamp: number) => string
  formatCurrency: (value: number, decimals?: number) => string
}

function TradeCard({ trade, formatTime, formatCurrency }: TradeCardProps) {
  const isBuy = trade.side === 'buy'

  return (
    <div className="p-3 bg-card/80 backdrop-blur-sm rounded-lg border border-border">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Badge variant={isBuy ? 'success' : 'destructive'}>
            {isBuy ? '买入' : '卖出'}
          </Badge>
          <span className="font-medium text-sm">{trade.symbol}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {formatTime(trade.timestamp)}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">价格: </span>
          <span className="font-medium">{formatCurrency(trade.price)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">数量: </span>
          <span className="font-medium">{formatCurrency(trade.amount, 4)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">手续费: </span>
          <span className="font-medium">{formatCurrency(trade.fee, 4)}</span>
        </div>
      </div>

      {trade.realizedPnl !== undefined && (
        <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">已实现盈亏</span>
          <span
            className={cn(
              'text-sm font-semibold',
              trade.realizedPnl >= 0 ? 'text-green-500' : 'text-red-500'
            )}
          >
            {trade.realizedPnl >= 0 && '+'}
            {formatCurrency(trade.realizedPnl)}
          </span>
        </div>
      )}
    </div>
  )
}

/**
 * MetricCard - 性能指标卡片
 */
interface MetricCardProps {
  label: string
  value: string
  trend: 'up' | 'down' | 'neutral'
}

function MetricCard({ label, value, trend }: MetricCardProps) {
  const TrendIcon =
    trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Activity

  return (
    <div
      className={cn(
        'p-3 rounded-lg border backdrop-blur-sm space-y-1',
        trend === 'up' && 'bg-green-500/5 border-green-500/20',
        trend === 'down' && 'bg-red-500/5 border-red-500/20',
        trend === 'neutral' && 'bg-muted/50 border-border'
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        {trend !== 'neutral' && (
          <TrendIcon
            className={cn(
              'h-3.5 w-3.5',
              trend === 'up' ? 'text-green-500' : 'text-red-500'
            )}
          />
        )}
      </div>
      <div
        className={cn(
          'text-lg font-bold',
          trend === 'up' && 'text-green-500',
          trend === 'down' && 'text-red-500',
          trend === 'neutral' && 'text-foreground'
        )}
      >
        {value}
      </div>
    </div>
  )
}

// =============================================================================
// Exports
// =============================================================================

export default MonitorCanvas
