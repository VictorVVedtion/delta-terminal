'use client'

import React from 'react'
import {
  X,
  Pause,
  Play,
  StopCircle,
  Activity,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { InsightData } from '@/types/insight'
import { cn } from '@/lib/utils'
import { notify } from '@/lib/notification'

// =============================================================================
// Type Definitions
// =============================================================================

export type BacktestStatus = 'running' | 'paused' | 'completed' | 'failed'

export interface BacktestMetrics {
  totalReturn: number // 累计收益率 (%)
  winRate: number // 胜率 (%)
  maxDrawdown: number // 最大回撤 (%)
  sharpeRatio: number // 夏普比率
  totalTrades?: number // 总交易次数
  winningTrades?: number // 获胜交易次数
  losingTrades?: number // 亏损交易次数
  avgProfit?: number // 平均盈利 (%)
  avgLoss?: number // 平均亏损 (%)
}

export interface BacktestTrade {
  id: string
  timestamp: number
  type: 'buy' | 'sell'
  symbol: string
  price: number
  quantity: number
  pnl?: number // 盈亏
  pnlPercent?: number // 盈亏百分比
  status: 'open' | 'closed'
}

export interface EquityCurvePoint {
  timestamp: number
  value: number
}

// =============================================================================
// BacktestCanvas Props
// =============================================================================

export interface BacktestCanvasProps {
  /** InsightData for context */
  insight: InsightData
  /** Whether the panel is open */
  isOpen: boolean
  /** Called when panel should close */
  onClose: () => void
  /** Called when user pauses backtest */
  onPause?: () => void
  /** Called when user resumes backtest */
  onResume?: () => void
  /** Called when user stops backtest */
  onStop?: () => void
  /** Backtest progress (0-100) */
  progress: number
  /** Backtest status */
  status: BacktestStatus
  /** Backtest performance metrics */
  metrics: BacktestMetrics
  /** Trade history */
  trades: BacktestTrade[]
  /** Equity curve data points */
  equityCurve?: EquityCurvePoint[]
}

// =============================================================================
// BacktestCanvas Component
// =============================================================================

export function BacktestCanvas({
  insight,
  isOpen,
  onClose,
  onPause,
  onResume,
  onStop,
  progress,
  status,
  metrics,
  trades,
  equityCurve = [],
}: BacktestCanvasProps) {
  // Track previous status for notification triggering
  const prevStatusRef = React.useRef<BacktestStatus | null>(null)

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

  // Story 5.3: Notify on backtest completion/failure
  React.useEffect(() => {
    const prevStatus = prevStatusRef.current
    prevStatusRef.current = status

    // Only notify on status transitions
    if (prevStatus && prevStatus !== status) {
      const strategyName = insight.target?.name || '策略'

      if (status === 'completed') {
        notify('success', '回测完成', {
          description: `${strategyName} 收益率 ${metrics.totalReturn >= 0 ? '+' : ''}${metrics.totalReturn.toFixed(1)}%，胜率 ${metrics.winRate.toFixed(0)}%`,
          source: 'BacktestCanvas',
        })
      } else if (status === 'failed') {
        notify('error', '回测失败', {
          description: `${strategyName} 回测过程中出现错误`,
          source: 'BacktestCanvas',
        })
      }
    }
  }, [status, insight.target?.name, metrics.totalReturn, metrics.winRate])

  // Get status badge variant and label
  const getStatusInfo = (status: BacktestStatus) => {
    switch (status) {
      case 'running':
        return { label: '运行中', variant: 'default' as const, icon: Activity }
      case 'paused':
        return { label: '已暂停', variant: 'secondary' as const, icon: Pause }
      case 'completed':
        return { label: '已完成', variant: 'outline' as const, icon: Target }
      case 'failed':
        return { label: '失败', variant: 'destructive' as const, icon: AlertTriangle }
    }
  }

  const statusInfo = getStatusInfo(status)
  const StatusIcon = statusInfo.icon

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
          'fixed top-0 right-0 z-40 h-full w-full sm:w-[600px]',
          'bg-card/80 backdrop-blur-sm border-l border-border shadow-2xl',
          'transform transition-transform duration-300 ease-out',
          'flex flex-col',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Backtest Canvas"
      >
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <StatusIcon className="h-5 w-5 text-primary" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">回测进度</h2>
                <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
              </div>
              {insight.target && (
                <p className="text-xs text-muted-foreground">
                  {insight.target.name} · {insight.target.symbol}
                </p>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-4 space-y-6">
            {/* Progress Section */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">
                  回测进度
                </h3>
                <span className="text-sm font-semibold text-foreground">
                  {Math.round(progress)}%
                </span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {status === 'running'
                  ? '正在处理历史数据...'
                  : status === 'paused'
                    ? '回测已暂停'
                    : status === 'completed'
                      ? '回测已完成'
                      : '回测失败'}
              </p>
            </section>

            {/* Key Metrics - 4 Grid */}
            <section className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                关键指标
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <MetricCard
                  label="累计收益"
                  value={metrics.totalReturn}
                  unit="%"
                  trend={metrics.totalReturn >= 0 ? 'up' : 'down'}
                  icon={DollarSign}
                />
                <MetricCard
                  label="胜率"
                  value={metrics.winRate}
                  unit="%"
                  trend={metrics.winRate >= 50 ? 'up' : 'down'}
                  icon={Target}
                />
                <MetricCard
                  label="最大回撤"
                  value={Math.abs(metrics.maxDrawdown)}
                  unit="%"
                  trend="down"
                  icon={TrendingDown}
                />
                <MetricCard
                  label="夏普比率"
                  value={metrics.sharpeRatio}
                  unit=""
                  trend={metrics.sharpeRatio >= 1 ? 'up' : 'down'}
                  icon={TrendingUp}
                />
              </div>
            </section>

            {/* Equity Curve Section */}
            {equityCurve.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">
                  权益曲线
                </h3>
                <Card className="bg-card/80 backdrop-blur-sm border-border">
                  <CardContent className="p-4">
                    <EquityCurveChart data={equityCurve} />
                  </CardContent>
                </Card>
              </section>
            )}

            {/* Trade History Section */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">
                  交易记录
                </h3>
                <Badge variant="outline" className="text-xs">
                  {trades.length} 笔交易
                </Badge>
              </div>
              <Card className="bg-card/80 backdrop-blur-sm border-border">
                <CardContent className="p-0">
                  <div className="max-h-[300px] overflow-y-auto scrollbar-thin">
                    {trades.length === 0 ? (
                      <div className="p-6 text-center text-muted-foreground">
                        <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">暂无交易记录</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {trades.map((trade) => (
                          <TradeRow key={trade.id} trade={trade} />
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Additional Stats */}
            {metrics.totalTrades !== undefined && (
              <section className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">
                  详细统计
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 bg-card/80 backdrop-blur-sm rounded-lg border border-border">
                    <p className="text-muted-foreground text-xs">总交易次数</p>
                    <p className="font-semibold text-foreground mt-1">
                      {metrics.totalTrades}
                    </p>
                  </div>
                  <div className="p-3 bg-card/80 backdrop-blur-sm rounded-lg border border-border">
                    <p className="text-muted-foreground text-xs">获胜交易</p>
                    <p className="font-semibold text-green-500 mt-1">
                      {metrics.winningTrades || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-card/80 backdrop-blur-sm rounded-lg border border-border">
                    <p className="text-muted-foreground text-xs">亏损交易</p>
                    <p className="font-semibold text-red-500 mt-1">
                      {metrics.losingTrades || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-card/80 backdrop-blur-sm rounded-lg border border-border">
                    <p className="text-muted-foreground text-xs">平均盈利</p>
                    <p className="font-semibold text-green-500 mt-1">
                      {metrics.avgProfit !== undefined
                        ? `${metrics.avgProfit.toFixed(2)}%`
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>

        {/* Control Buttons Footer */}
        <footer className="flex items-center gap-3 px-4 py-3 border-t border-border bg-card/80 backdrop-blur-sm">
          {status === 'running' && (
            <>
              <Button
                variant="outline"
                onClick={onPause}
                className="flex-1"
              >
                <Pause className="h-4 w-4 mr-2" />
                暂停
              </Button>
              <Button
                variant="destructive"
                onClick={onStop}
                className="flex-1"
              >
                <StopCircle className="h-4 w-4 mr-2" />
                停止
              </Button>
            </>
          )}

          {status === 'paused' && (
            <>
              <Button
                variant="default"
                onClick={onResume}
                className="flex-1"
              >
                <Play className="h-4 w-4 mr-2" />
                继续
              </Button>
              <Button
                variant="destructive"
                onClick={onStop}
                className="flex-1"
              >
                <StopCircle className="h-4 w-4 mr-2" />
                停止
              </Button>
            </>
          )}

          {(status === 'completed' || status === 'failed') && (
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full"
            >
              关闭
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
 * MetricCard - 指标卡片
 */
interface MetricCardProps {
  label: string
  value: number
  unit: string
  trend: 'up' | 'down' | 'neutral'
  icon: React.ElementType
}

function MetricCard({ label, value, unit, trend, icon: Icon }: MetricCardProps) {
  return (
    <div
      className={cn(
        'p-3 rounded-lg border backdrop-blur-sm transition-colors',
        trend === 'up' && 'bg-green-500/5 border-green-500/20',
        trend === 'down' && 'bg-red-500/5 border-red-500/20',
        trend === 'neutral' && 'bg-muted/50 border-border'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon
          className={cn(
            'h-4 w-4',
            trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground'
          )}
        />
      </div>
      <div className="flex items-baseline gap-1">
        <span
          className={cn(
            'text-xl font-bold',
            trend === 'up' && 'text-green-500',
            trend === 'down' && 'text-red-500',
            trend === 'neutral' && 'text-foreground'
          )}
        >
          {value.toFixed(2)}
        </span>
        <span className="text-sm text-muted-foreground">{unit}</span>
      </div>
    </div>
  )
}

/**
 * TradeRow - 交易记录行
 */
interface TradeRowProps {
  trade: BacktestTrade
}

function TradeRow({ trade }: TradeRowProps) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const isProfitable = trade.pnl !== undefined && trade.pnl > 0

  return (
    <div className="p-3 hover:bg-muted/50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {trade.type === 'buy' ? (
            <div className="p-1.5 bg-green-500/10 rounded">
              <ArrowUpRight className="h-4 w-4 text-green-500" />
            </div>
          ) : (
            <div className="p-1.5 bg-red-500/10 rounded">
              <ArrowDownRight className="h-4 w-4 text-red-500" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {trade.type === 'buy' ? '买入' : '卖出'}
              </span>
              <Badge variant="outline" className="text-xs">
                {trade.status === 'open' ? '持仓中' : '已平仓'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDate(trade.timestamp)} · {trade.symbol}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">
            ${trade.price.toFixed(2)}
          </p>
          {trade.pnl !== undefined && (
            <p
              className={cn(
                'text-xs font-medium',
                isProfitable ? 'text-green-500' : 'text-red-500'
              )}
            >
              {isProfitable ? '+' : ''}
              {trade.pnl.toFixed(2)} ({trade.pnlPercent?.toFixed(2)}%)
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * EquityCurveChart - 权益曲线图表（简化 SVG 版本）
 */
interface EquityCurveChartProps {
  data: EquityCurvePoint[]
}

function EquityCurveChart({ data }: EquityCurveChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-muted-foreground">
        <p className="text-sm">暂无数据</p>
      </div>
    )
  }

  // Calculate bounds
  const values = data.map((d) => d.value)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const range = maxValue - minValue || 1

  // SVG dimensions
  const width = 500
  const height = 160
  const padding = 20

  // Generate path
  const points = data.map((point, i) => {
    const x = padding + (i / (data.length - 1)) * (width - 2 * padding)
    const y =
      height - padding - ((point.value - minValue) / range) * (height - 2 * padding)
    return `${x},${y}`
  })

  const pathData = `M ${points.join(' L ')}`

  // Determine if overall positive
  const isPositive = (data[data.length - 1]?.value ?? 0) >= (data[0]?.value ?? 0)

  return (
    <div className="relative">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
      >
        {/* Grid lines */}
        <line
          x1={padding}
          y1={height / 2}
          x2={width - padding}
          y2={height / 2}
          stroke="currentColor"
          strokeWidth="1"
          className="text-border opacity-30"
        />

        {/* Equity curve */}
        <path
          d={pathData}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={cn(
            isPositive ? 'text-green-500' : 'text-red-500'
          )}
        />

        {/* Area fill */}
        <path
          d={`${pathData} L ${width - padding},${height - padding} L ${padding},${height - padding} Z`}
          fill="currentColor"
          className={cn(
            isPositive ? 'text-green-500/10' : 'text-red-500/10'
          )}
        />

        {/* Start and end points */}
        {data.length > 0 && (
          <>
            <circle
              cx={padding}
              cy={height - padding - ((data[0]?.value ?? 0 - minValue) / range) * (height - 2 * padding)}
              r="4"
              fill="currentColor"
              className="text-primary"
            />
            <circle
              cx={width - padding}
              cy={height - padding - ((data[data.length - 1]?.value ?? 0 - minValue) / range) * (height - 2 * padding)}
              r="4"
              fill="currentColor"
              className={cn(
                isPositive ? 'text-green-500' : 'text-red-500'
              )}
            />
          </>
        )}
      </svg>

      {/* Legend */}
      {data.length > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
          <span>起始: ${data[0]?.value.toFixed(2) ?? 'N/A'}</span>
          <span
            className={cn(
              'font-semibold',
              isPositive ? 'text-green-500' : 'text-red-500'
            )}
          >
            当前: ${data[data.length - 1]?.value.toFixed(2) ?? 'N/A'}
          </span>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Exports
// =============================================================================

export default BacktestCanvas
