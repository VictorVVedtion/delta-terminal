'use client'

/**
 * SignalLog Component
 * V3 Design Document: S47 - Signal Log Panel
 *
 * Features:
 * - Real-time display of trading signals
 * - Signal execution status tracking
 * - Filtering by signal type, status, and time range
 * - Signal details expansion
 * - Export and analysis capabilities
 */

import React from 'react'
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Circle,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Filter,
  Download,
  ChevronDown,
  ChevronUp,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Pause,
  Target,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// =============================================================================
// Type Definitions
// =============================================================================

export type SignalType = 'entry' | 'exit' | 'stop_loss' | 'take_profit' | 'adjust'
export type SignalDirection = 'long' | 'short'
export type SignalStatus = 'pending' | 'executed' | 'cancelled' | 'failed' | 'expired'

export interface TradingSignal {
  /** Unique signal ID */
  id: string
  /** Signal type */
  type: SignalType
  /** Direction (long/short) */
  direction: SignalDirection
  /** Target asset symbol */
  symbol: string
  /** Execution status */
  status: SignalStatus
  /** Signal generation timestamp */
  timestamp: number
  /** Signal trigger price */
  triggerPrice?: number
  /** Actual execution price */
  executionPrice?: number
  /** Order size/quantity */
  quantity?: number
  /** Signal confidence (0-1) */
  confidence?: number
  /** Strategy that generated the signal */
  strategyId: string
  /** Strategy name */
  strategyName?: string
  /** Signal reason/source */
  reason?: string
  /** Error message if failed */
  error?: string
  /** Execution timestamp */
  executedAt?: number
  /** Related indicators/conditions */
  indicators?: SignalIndicator[]
}

export interface SignalIndicator {
  name: string
  value: number
  threshold?: number
  direction?: 'above' | 'below' | 'cross'
}

export interface SignalLogProps {
  /** List of signals */
  signals: TradingSignal[]
  /** Selected strategy ID filter */
  selectedStrategyId?: string
  /** Show filter controls */
  showFilters?: boolean
  /** Max signals to display (default 100) */
  maxSignals?: number
  /** Real-time update indicator */
  isLive?: boolean
  /** Callback when signal clicked */
  onSignalClick?: (signal: TradingSignal) => void
  /** Export signals callback */
  onExport?: (signals: TradingSignal[]) => void
  /** Custom class name */
  className?: string
}

// =============================================================================
// Configuration
// =============================================================================

const SIGNAL_TYPE_CONFIG: Record<
  SignalType,
  {
    label: string
    icon: typeof TrendingUp
    color: string
  }
> = {
  entry: {
    label: '开仓',
    icon: ArrowUpRight,
    color: 'text-green-500',
  },
  exit: {
    label: '平仓',
    icon: ArrowDownRight,
    color: 'text-blue-500',
  },
  stop_loss: {
    label: '止损',
    icon: XCircle,
    color: 'text-red-500',
  },
  take_profit: {
    label: '止盈',
    icon: Target,
    color: 'text-green-400',
  },
  adjust: {
    label: '调整',
    icon: RefreshCw,
    color: 'text-yellow-500',
  },
}

const SIGNAL_STATUS_CONFIG: Record<
  SignalStatus,
  {
    label: string
    icon: typeof Circle
    badgeVariant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary'
  }
> = {
  pending: {
    label: '待执行',
    icon: Clock,
    badgeVariant: 'warning',
  },
  executed: {
    label: '已执行',
    icon: CheckCircle,
    badgeVariant: 'success',
  },
  cancelled: {
    label: '已取消',
    icon: XCircle,
    badgeVariant: 'secondary',
  },
  failed: {
    label: '失败',
    icon: AlertTriangle,
    badgeVariant: 'destructive',
  },
  expired: {
    label: '已过期',
    icon: Clock,
    badgeVariant: 'secondary',
  },
}

// =============================================================================
// SignalLog Component
// =============================================================================

export function SignalLog({
  signals,
  selectedStrategyId,
  showFilters = true,
  maxSignals = 100,
  isLive = false,
  onSignalClick,
  onExport,
  className,
}: SignalLogProps) {
  // Filter state
  const [typeFilter, setTypeFilter] = React.useState<SignalType | 'all'>('all')
  const [statusFilter, setStatusFilter] = React.useState<SignalStatus | 'all'>('all')
  const [directionFilter, setDirectionFilter] = React.useState<SignalDirection | 'all'>('all')
  const [showFiltersPanel, setShowFiltersPanel] = React.useState(false)
  const [expandedSignalId, setExpandedSignalId] = React.useState<string | null>(null)

  // Filter signals
  const filteredSignals = React.useMemo(() => {
    return signals
      .filter(signal => {
        // Strategy filter
        if (selectedStrategyId && signal.strategyId !== selectedStrategyId) return false
        // Type filter
        if (typeFilter !== 'all' && signal.type !== typeFilter) return false
        // Status filter
        if (statusFilter !== 'all' && signal.status !== statusFilter) return false
        // Direction filter
        if (directionFilter !== 'all' && signal.direction !== directionFilter) return false
        return true
      })
      .slice(0, maxSignals)
  }, [signals, selectedStrategyId, typeFilter, statusFilter, directionFilter, maxSignals])

  // Signal stats
  const stats = React.useMemo(() => {
    const total = filteredSignals.length
    const executed = filteredSignals.filter(s => s.status === 'executed').length
    const pending = filteredSignals.filter(s => s.status === 'pending').length
    const failed = filteredSignals.filter(s => s.status === 'failed').length
    return { total, executed, pending, failed }
  }, [filteredSignals])

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

  // Format price
  const formatPrice = (price?: number) => {
    if (price === undefined) return '-'
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    })
  }

  // Toggle signal expansion
  const toggleExpand = (signalId: string) => {
    setExpandedSignalId(prev => (prev === signalId ? null : signalId))
  }

  // Handle export
  const handleExport = () => {
    if (onExport) {
      onExport(filteredSignals)
    }
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">信号日志</h3>
          {isLive && (
            <Badge variant="success" className="animate-pulse">
              <Circle className="h-2 w-2 mr-1 fill-current" />
              实时
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Stats */}
          <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
            <span>总计: {stats.total}</span>
            <span className="text-green-500">执行: {stats.executed}</span>
            <span className="text-yellow-500">待处理: {stats.pending}</span>
            {stats.failed > 0 && <span className="text-red-500">失败: {stats.failed}</span>}
          </div>

          {/* Filter toggle */}
          {showFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              className={cn(showFiltersPanel && 'bg-muted')}
            >
              <Filter className="h-4 w-4" />
            </Button>
          )}

          {/* Export */}
          {onExport && (
            <Button variant="ghost" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && showFiltersPanel && (
        <div className="px-4 py-3 border-b border-border bg-muted/30 space-y-3">
          {/* Type Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground w-12">类型:</span>
            <div className="flex flex-wrap gap-1">
              <FilterButton
                active={typeFilter === 'all'}
                onClick={() => setTypeFilter('all')}
              >
                全部
              </FilterButton>
              {Object.entries(SIGNAL_TYPE_CONFIG).map(([type, config]) => (
                <FilterButton
                  key={type}
                  active={typeFilter === type}
                  onClick={() => setTypeFilter(type as SignalType)}
                >
                  {config.label}
                </FilterButton>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground w-12">状态:</span>
            <div className="flex flex-wrap gap-1">
              <FilterButton
                active={statusFilter === 'all'}
                onClick={() => setStatusFilter('all')}
              >
                全部
              </FilterButton>
              {Object.entries(SIGNAL_STATUS_CONFIG).map(([status, config]) => (
                <FilterButton
                  key={status}
                  active={statusFilter === status}
                  onClick={() => setStatusFilter(status as SignalStatus)}
                >
                  {config.label}
                </FilterButton>
              ))}
            </div>
          </div>

          {/* Direction Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground w-12">方向:</span>
            <div className="flex gap-1">
              <FilterButton
                active={directionFilter === 'all'}
                onClick={() => setDirectionFilter('all')}
              >
                全部
              </FilterButton>
              <FilterButton
                active={directionFilter === 'long'}
                onClick={() => setDirectionFilter('long')}
              >
                <TrendingUp className="h-3 w-3 mr-1" />
                做多
              </FilterButton>
              <FilterButton
                active={directionFilter === 'short'}
                onClick={() => setDirectionFilter('short')}
              >
                <TrendingDown className="h-3 w-3 mr-1" />
                做空
              </FilterButton>
            </div>
          </div>
        </div>
      )}

      {/* Signal List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filteredSignals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
            <Activity className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-sm">暂无信号记录</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredSignals.map(signal => {
              const typeConfig = SIGNAL_TYPE_CONFIG[signal.type]
              const statusConfig = SIGNAL_STATUS_CONFIG[signal.status]
              const TypeIcon = typeConfig.icon
              const StatusIcon = statusConfig.icon
              const isExpanded = expandedSignalId === signal.id

              return (
                <div
                  key={signal.id}
                  className={cn(
                    'transition-colors hover:bg-muted/50',
                    isExpanded && 'bg-muted/30'
                  )}
                >
                  {/* Main Row */}
                  <button
                    onClick={() => {
                      toggleExpand(signal.id)
                      onSignalClick?.(signal)
                    }}
                    className="w-full px-4 py-3 text-left"
                  >
                    <div className="flex items-center gap-3">
                      {/* Direction & Type Icon */}
                      <div
                        className={cn(
                          'p-2 rounded-lg',
                          signal.direction === 'long'
                            ? 'bg-green-500/10'
                            : 'bg-red-500/10'
                        )}
                      >
                        <TypeIcon className={cn('h-4 w-4', typeConfig.color)} />
                      </div>

                      {/* Signal Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{signal.symbol}</span>
                          <Badge
                            variant={signal.direction === 'long' ? 'success' : 'destructive'}
                            className="text-xs"
                          >
                            {signal.direction === 'long' ? '多' : '空'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {typeConfig.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <span>{formatTime(signal.timestamp)}</span>
                          {signal.strategyName && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[120px]">
                                {signal.strategyName}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Price Info */}
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {formatPrice(signal.executionPrice || signal.triggerPrice)}
                        </div>
                        {signal.quantity && (
                          <div className="text-xs text-muted-foreground">
                            数量: {signal.quantity}
                          </div>
                        )}
                      </div>

                      {/* Status */}
                      <div className="flex items-center gap-2">
                        <Badge variant={statusConfig.badgeVariant}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4">
                      <div className="ml-12 p-3 bg-muted/50 rounded-lg space-y-3">
                        {/* Reason */}
                        {signal.reason && (
                          <div>
                            <span className="text-xs text-muted-foreground">触发原因:</span>
                            <p className="text-sm mt-1">{signal.reason}</p>
                          </div>
                        )}

                        {/* Price Details */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-xs text-muted-foreground">触发价格</span>
                            <p className="font-medium">{formatPrice(signal.triggerPrice)}</p>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground">执行价格</span>
                            <p className="font-medium">{formatPrice(signal.executionPrice)}</p>
                          </div>
                        </div>

                        {/* Confidence */}
                        {signal.confidence !== undefined && (
                          <div>
                            <span className="text-xs text-muted-foreground">置信度:</span>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    'h-full transition-all',
                                    signal.confidence >= 0.8
                                      ? 'bg-green-500'
                                      : signal.confidence >= 0.6
                                      ? 'bg-yellow-500'
                                      : 'bg-red-500'
                                  )}
                                  style={{ width: `${signal.confidence * 100}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium">
                                {(signal.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Indicators */}
                        {signal.indicators && signal.indicators.length > 0 && (
                          <div>
                            <span className="text-xs text-muted-foreground">关联指标:</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {signal.indicators.map((ind, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {ind.name}: {ind.value.toFixed(2)}
                                  {ind.threshold && ` (阈值: ${ind.threshold})`}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Error */}
                        {signal.error && (
                          <div className="p-2 bg-red-500/10 border border-red-500/30 rounded">
                            <span className="text-xs text-red-400">错误:</span>
                            <p className="text-sm text-red-400 mt-1">{signal.error}</p>
                          </div>
                        )}

                        {/* Execution Time */}
                        {signal.executedAt && (
                          <div className="text-xs text-muted-foreground">
                            执行于: {formatTime(signal.executedAt)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {filteredSignals.length > 0 && (
        <div className="px-4 py-2 border-t border-border bg-card/80 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              显示 {filteredSignals.length} / {signals.length} 条信号
            </span>
            {filteredSignals.length >= maxSignals && (
              <span className="text-yellow-500">已达显示上限</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Sub Components
// =============================================================================

interface FilterButtonProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}

function FilterButton({ active, onClick, children }: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center px-2 py-1 text-xs rounded-md transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted hover:bg-muted/80 text-muted-foreground'
      )}
    >
      {children}
    </button>
  )
}

// =============================================================================
// Compact Signal Badge (for other components)
// =============================================================================

export interface SignalBadgeProps {
  signal: TradingSignal
  onClick?: () => void
  className?: string
}

export function SignalBadge({ signal, onClick, className }: SignalBadgeProps) {
  const typeConfig = SIGNAL_TYPE_CONFIG[signal.type]
  const statusConfig = SIGNAL_STATUS_CONFIG[signal.status]
  const TypeIcon = typeConfig.icon

  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-md',
        'text-xs transition-all hover:opacity-80',
        signal.direction === 'long'
          ? 'bg-green-500/10 text-green-500'
          : 'bg-red-500/10 text-red-500',
        className
      )}
    >
      <TypeIcon className="h-3 w-3" />
      <span>{signal.symbol}</span>
      <Badge variant={statusConfig.badgeVariant} className="text-[10px] px-1">
        {statusConfig.label}
      </Badge>
    </button>
  )
}

// =============================================================================
// Exports
// =============================================================================

export default SignalLog
