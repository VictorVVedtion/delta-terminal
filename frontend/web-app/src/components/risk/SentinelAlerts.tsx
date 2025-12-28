'use client'

import {
  Activity,
  AlertTriangle,
  Bell,
  ChevronRight,
  Clock,
  Shield,
  TrendingDown,
  X,
  Zap,
} from 'lucide-react'
import React, { useCallback,useEffect, useState } from 'react'

import { notify } from '@/lib/notification'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

export type AlertSeverity = 'info' | 'warning' | 'critical'

export type AlertType =
  | 'volatility'      // 波动率预警
  | 'drawdown'        // 回撤预警
  | 'margin'          // 保证金预警
  | 'liquidity'       // 流动性预警
  | 'consecutive_loss' // 连续亏损
  | 'anomaly'         // 异常检测
  | 'market_crash'    // 市场闪崩

export interface SentinelAlert {
  id: string
  type: AlertType
  severity: AlertSeverity
  title: string
  message: string
  timestamp: number
  strategyId?: string
  strategyName?: string
  data?: Record<string, number | string>
  suggestedAction?: string
  isRead?: boolean
  isDismissed?: boolean
}

export interface SentinelAlertsProps {
  className?: string
  alerts?: SentinelAlert[]
  onDismiss?: (alertId: string) => void
  onAction?: (alertId: string, action: string) => void
  maxVisible?: number
}

// =============================================================================
// Constants
// =============================================================================

const ALERT_CONFIG: Record<
  AlertType,
  { icon: React.ReactNode; color: string; label: string }
> = {
  volatility: {
    icon: <Activity className="w-4 h-4" />,
    color: 'yellow',
    label: '波动率',
  },
  drawdown: {
    icon: <TrendingDown className="w-4 h-4" />,
    color: 'orange',
    label: '回撤',
  },
  margin: {
    icon: <Shield className="w-4 h-4" />,
    color: 'red',
    label: '保证金',
  },
  liquidity: {
    icon: <Zap className="w-4 h-4" />,
    color: 'blue',
    label: '流动性',
  },
  consecutive_loss: {
    icon: <AlertTriangle className="w-4 h-4" />,
    color: 'orange',
    label: '连亏',
  },
  anomaly: {
    icon: <Bell className="w-4 h-4" />,
    color: 'purple',
    label: '异常',
  },
  market_crash: {
    icon: <AlertTriangle className="w-4 h-4" />,
    color: 'red',
    label: '闪崩',
  },
}

const SEVERITY_STYLES: Record<AlertSeverity, string> = {
  info: 'border-blue-500/30 bg-blue-500/5',
  warning: 'border-yellow-500/30 bg-yellow-500/5',
  critical: 'border-red-500/30 bg-red-500/5 animate-pulse',
}

// =============================================================================
// Mock Alert Generator (for demo)
// =============================================================================

function generateMockAlert(): SentinelAlert {
  const types: AlertType[] = [
    'volatility',
    'drawdown',
    'margin',
    'consecutive_loss',
  ]
  const type = types[Math.floor(Math.random() * types.length)]

  const severities: AlertSeverity[] = ['info', 'warning', 'critical']
  const severity = severities[Math.floor(Math.random() * severities.length)]

  const alertTemplates: Record<AlertType, Partial<SentinelAlert>> = {
    volatility: {
      title: 'BTC 波动率上升',
      message: 'ATR 达到历史2倍，建议降低杠杆',
      data: { atr: 1250, avgAtr: 625, change: '+100%' },
      suggestedAction: '降低杠杆至2x',
    },
    drawdown: {
      title: '回撤达到阈值 50%',
      message: 'RSI 策略回撤接近预设上限',
      data: { currentDrawdown: -8.5, limit: -10, remaining: 1.5 },
      suggestedAction: '检查策略参数',
    },
    margin: {
      title: '保证金率过低',
      message: '当前保证金率 125%，低于安全线 150%',
      data: { marginRate: 125, safeLevel: 150 },
      suggestedAction: '追加保证金或减仓',
    },
    liquidity: {
      title: '流动性不足',
      message: '买卖盘深度下降 60%',
      data: { depthChange: -60 },
      suggestedAction: '减小仓位',
    },
    consecutive_loss: {
      title: '连续亏损 3 次',
      message: 'RSI 策略连续触发止损',
      data: { lossCount: 3, totalLoss: -450 },
      suggestedAction: '暂停策略复盘',
    },
    anomaly: {
      title: '策略行为异常',
      message: '交易频率异常增高',
      data: { tradeCount: 15, avgTradeCount: 3 },
      suggestedAction: '人工检查',
    },
    market_crash: {
      title: '⚠️ 市场闪崩警告',
      message: 'BTC 5分钟内下跌 5%',
      data: { priceChange: -5, timeframe: '5m' },
      suggestedAction: '启动 Kill Switch',
    },
  }

  const alertData = alertTemplates[type]

  const result: SentinelAlert = {
    id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    type,
    severity,
    title: alertData.title || '系统预警',
    message: alertData.message || '请检查系统状态',
    timestamp: Date.now(),
    strategyName: 'RSI 超卖反弹',
    isRead: false,
    isDismissed: false,
  }

  if (alertData.data) {
    result.data = alertData.data
  }
  if (alertData.suggestedAction) {
    result.suggestedAction = alertData.suggestedAction
  }

  return result
}

// =============================================================================
// AlertCard Component
// =============================================================================

interface AlertCardProps {
  alert: SentinelAlert
  onDismiss: () => void
  onAction?: (action: string) => void
}

function AlertCard({ alert, onDismiss, onAction }: AlertCardProps) {
  const config = ALERT_CONFIG[alert.type]
  const timeAgo = getTimeAgo(alert.timestamp)

  return (
    <div
      className={cn(
        'relative p-4 rounded-lg border-l-4 transition-all duration-300',
        SEVERITY_STYLES[alert.severity],
        alert.severity === 'critical' && 'border-l-red-500',
        alert.severity === 'warning' && 'border-l-yellow-500',
        alert.severity === 'info' && 'border-l-blue-500'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'p-1.5 rounded-md',
              config.color === 'yellow' && 'bg-yellow-500/20 text-yellow-500',
              config.color === 'orange' && 'bg-orange-500/20 text-orange-500',
              config.color === 'red' && 'bg-red-500/20 text-red-500',
              config.color === 'blue' && 'bg-blue-500/20 text-blue-500',
              config.color === 'purple' && 'bg-purple-500/20 text-purple-500'
            )}
          >
            {config.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                {alert.title}
              </span>
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded text-[10px] font-medium uppercase',
                  alert.severity === 'critical' &&
                    'bg-red-500/20 text-red-500',
                  alert.severity === 'warning' &&
                    'bg-yellow-500/20 text-yellow-500',
                  alert.severity === 'info' && 'bg-blue-500/20 text-blue-500'
                )}
              >
                {alert.severity}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{timeAgo}</span>
              {alert.strategyName && (
                <>
                  <span>·</span>
                  <span>{alert.strategyName}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Message */}
      <p className="text-sm text-muted-foreground mb-3">{alert.message}</p>

      {/* Data Points */}
      {alert.data && (
        <div className="flex flex-wrap gap-2 mb-3">
          {Object.entries(alert.data).map(([key, value]) => (
            <div
              key={key}
              className="px-2 py-1 rounded bg-muted/50 text-xs font-mono"
            >
              <span className="text-muted-foreground">{key}:</span>{' '}
              <span className="text-foreground font-medium">{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Suggested Action */}
      {alert.suggestedAction && onAction && (
        <button
          onClick={() => { onAction(alert.suggestedAction!); }}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2 rounded-md',
            'bg-primary/10 text-primary text-sm font-medium',
            'hover:bg-primary/20 transition-colors'
          )}
        >
          <span>建议: {alert.suggestedAction}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

// =============================================================================
// SentinelAlerts Component
// =============================================================================

export function SentinelAlerts({
  className,
  alerts: initialAlerts,
  onDismiss,
  onAction,
  maxVisible = 5,
}: SentinelAlertsProps) {
  const [alerts, setAlerts] = useState<SentinelAlert[]>(initialAlerts || [])
  const [isExpanded, setIsExpanded] = useState(false)

  // Demo: Generate random alerts periodically
  useEffect(() => {
    if (initialAlerts) return // Don't generate if alerts provided

    const interval = setInterval(() => {
      // 20% chance to generate alert
      if (Math.random() < 0.2) {
        const newAlert = generateMockAlert()
        setAlerts((prev) => [newAlert, ...prev].slice(0, 20))

        // Show notification for critical alerts
        if (newAlert.severity === 'critical') {
          notify('error', newAlert.title, {
            description: newAlert.message,
            source: 'Sentinel',
          })
        }
      }
    }, 10000) // Every 10 seconds

    return () => { clearInterval(interval); }
  }, [initialAlerts])

  // Use provided alerts if available
  useEffect(() => {
    if (initialAlerts) {
      setAlerts(initialAlerts)
    }
  }, [initialAlerts])

  const handleDismiss = useCallback(
    (alertId: string) => {
      setAlerts((prev) => prev.filter((a) => a.id !== alertId))
      if (onDismiss) {
        onDismiss(alertId)
      }
    },
    [onDismiss]
  )

  const handleAction = useCallback(
    (alertId: string, action: string) => {
      if (onAction) {
        onAction(alertId, action)
      }
      handleDismiss(alertId)
    },
    [onAction, handleDismiss]
  )

  const activeAlerts = alerts.filter((a) => !a.isDismissed)
  const criticalCount = activeAlerts.filter((a) => a.severity === 'critical').length
  const warningCount = activeAlerts.filter((a) => a.severity === 'warning').length
  const visibleAlerts = isExpanded
    ? activeAlerts
    : activeAlerts.slice(0, maxVisible)

  if (activeAlerts.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 p-4 rounded-lg border',
          'bg-green-500/5 border-green-500/20',
          className
        )}
      >
        <Shield className="w-5 h-5 text-green-500" />
        <div>
          <p className="text-sm font-medium text-foreground">
            系统正常运行
          </p>
          <p className="text-xs text-muted-foreground">
            Sentinel 正在持续监控风险
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-yellow-500/10">
            <Bell className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Sentinel 预警
            </h3>
            <p className="text-xs text-muted-foreground">
              {criticalCount > 0 && (
                <span className="text-red-500 font-medium">
                  {criticalCount} 紧急
                </span>
              )}
              {criticalCount > 0 && warningCount > 0 && ' · '}
              {warningCount > 0 && (
                <span className="text-yellow-500">
                  {warningCount} 警告
                </span>
              )}
              {criticalCount === 0 && warningCount === 0 && (
                <span>{activeAlerts.length} 条通知</span>
              )}
            </p>
          </div>
        </div>

        {activeAlerts.length > maxVisible && (
          <button
            onClick={() => { setIsExpanded(!isExpanded); }}
            className="text-xs text-primary hover:underline"
          >
            {isExpanded ? '收起' : `查看全部 (${activeAlerts.length})`}
          </button>
        )}
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {visibleAlerts.map((alert) => (
          <AlertCard
            key={alert.id}
            alert={alert}
            onDismiss={() => { handleDismiss(alert.id); }}
            {...(onAction && { onAction: (action: string) => { handleAction(alert.id, action); } })}
          />
        ))}
      </div>

      {/* Collapse indicator */}
      {!isExpanded && activeAlerts.length > maxVisible && (
        <p className="text-center text-xs text-muted-foreground">
          还有 {activeAlerts.length - maxVisible} 条预警
        </p>
      )}
    </div>
  )
}

// =============================================================================
// Helper Functions
// =============================================================================

function getTimeAgo(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))

  if (seconds < 60) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  return new Date(timestamp).toLocaleDateString('zh-CN')
}

export default SentinelAlerts
