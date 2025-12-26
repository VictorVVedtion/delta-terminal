'use client'

/**
 * ExtremeMarketPanel Component
 *
 * EPIC-007 Story 7.3: 极端行情监测面板
 * 监测市场异常指标（波动率、深度骤变），提供防护措施配置和历史事件记录
 */

import React from 'react'
import {
  AlertTriangle,
  Gauge,
  BarChart3,
  Volume2,
  VolumeX,
  Shield,
  ShieldCheck,
  Settings2,
  Clock,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  History,
  Pause,
  XCircle,
  Bell,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { notify } from '@/lib/notification'

// =============================================================================
// Types
// =============================================================================

interface ExtremeMarketPanelProps {
  /** 监控交易对 */
  symbol: string
  /** 是否启用声音警报 */
  soundEnabled?: boolean
  /** 自定义类名 */
  className?: string
}

interface ExtremeMarketConfig {
  enabled: boolean
  volatilityThreshold: number      // 波动率阈值 (%)
  depthDropThreshold: number       // 深度下降阈值 (%)
  volumeSpikeMultiplier: number    // 交易量倍数
  autoProtectionMode: 'pause_all' | 'cancel_orders' | 'notify_only'
}

interface ExtremeMarketEvent {
  id: string
  timestamp: number
  symbol: string
  triggerReason: 'volatility' | 'depth_drop' | 'volume_spike'
  triggerValue: number
  protectionAction: string
}

interface MarketMetrics {
  volatility: number          // Current 5-min volatility (%)
  depthChange: number         // Depth change (%)
  volumeMultiplier: number    // Volume vs average
}

// =============================================================================
// Default Config
// =============================================================================

const DEFAULT_CONFIG: ExtremeMarketConfig = {
  enabled: true,
  volatilityThreshold: 5.0,
  depthDropThreshold: 70,
  volumeSpikeMultiplier: 10,
  autoProtectionMode: 'notify_only',
}

// =============================================================================
// Mock Data (In production, this would come from WebSocket)
// =============================================================================

const MOCK_METRICS: MarketMetrics = {
  volatility: 2.3,
  depthChange: -15,
  volumeMultiplier: 2.1,
}

const MOCK_EVENTS: ExtremeMarketEvent[] = [
  {
    id: '1',
    timestamp: Date.now() - 86400000,
    symbol: 'BTC/USDT',
    triggerReason: 'volatility',
    triggerValue: 8.2,
    protectionAction: '暂停所有策略',
  },
  {
    id: '2',
    timestamp: Date.now() - 259200000,
    symbol: 'BTC/USDT',
    triggerReason: 'depth_drop',
    triggerValue: 82,
    protectionAction: '发送通知',
  },
  {
    id: '3',
    timestamp: Date.now() - 518400000,
    symbol: 'BTC/USDT',
    triggerReason: 'volume_spike',
    triggerValue: 15,
    protectionAction: '取消挂单',
  },
]

// =============================================================================
// ExtremeMarketPanel Component
// =============================================================================

export function ExtremeMarketPanel({
  symbol,
  soundEnabled: initialSoundEnabled = true,
  className,
}: ExtremeMarketPanelProps) {
  // State
  const [config, setConfig] = React.useState<ExtremeMarketConfig>(DEFAULT_CONFIG)
  const [soundEnabled, setSoundEnabled] = React.useState(initialSoundEnabled)
  const [showSettings, setShowSettings] = React.useState(false)
  const [showHistory, setShowHistory] = React.useState(false)
  const [metrics] = React.useState<MarketMetrics>(MOCK_METRICS)
  const [events] = React.useState<ExtremeMarketEvent[]>(MOCK_EVENTS)

  // Check alert status
  const volatilityAlert = metrics.volatility >= config.volatilityThreshold
  const depthAlert = Math.abs(metrics.depthChange) >= config.depthDropThreshold
  const volumeAlert = metrics.volumeMultiplier >= config.volumeSpikeMultiplier
  const hasAlert = volatilityAlert || depthAlert || volumeAlert

  // Handle protection toggle
  const handleProtectionToggle = () => {
    const newEnabled = !config.enabled
    setConfig({ ...config, enabled: newEnabled })
    notify(newEnabled ? 'success' : 'info', newEnabled ? '防护已启用' : '防护已关闭', {
      source: 'ExtremeMarket',
    })
  }

  // Handle protection mode change
  const handleModeChange = (mode: ExtremeMarketConfig['autoProtectionMode']) => {
    setConfig({ ...config, autoProtectionMode: mode })
    notify('info', `防护模式已切换为: ${getProtectionModeLabel(mode)}`, {
      source: 'ExtremeMarket',
    })
  }

  return (
    <Card
      className={cn(
        'transition-all duration-300',
        hasAlert && config.enabled && 'border-orange-500/50 shadow-lg shadow-orange-500/10',
        className
      )}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Gauge className="h-5 w-5 text-primary" />
            极端行情监测
            <Badge variant="outline" className="font-mono text-xs">
              {symbol}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            {hasAlert && config.enabled && (
              <Badge variant="destructive" className="gap-1 animate-pulse">
                <AlertTriangle className="h-3 w-3" />
                警报
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Metrics */}
        <div className="space-y-3">
          <p className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            监测指标
          </p>

          <MetricBar
            label="波动率 (5分钟)"
            value={metrics.volatility}
            threshold={config.volatilityThreshold}
            unit="%"
            isAlert={volatilityAlert && config.enabled}
          />

          <MetricBar
            label="订单簿深度"
            value={Math.abs(metrics.depthChange)}
            threshold={config.depthDropThreshold}
            unit="%"
            prefix={metrics.depthChange < 0 ? '-' : '+'}
            isAlert={depthAlert && config.enabled}
          />

          <MetricBar
            label="交易量倍数"
            value={metrics.volumeMultiplier}
            threshold={config.volumeSpikeMultiplier}
            unit="x"
            isAlert={volumeAlert && config.enabled}
          />
        </div>

        {/* Protection Settings */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              防护设置
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="h-7 px-2"
            >
              <Settings2 className="h-3.5 w-3.5 mr-1" />
              {showSettings ? '收起' : '展开'}
            </Button>
          </div>

          {/* Quick Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              {config.enabled ? (
                <ShieldCheck className="h-4 w-4 text-green-500" />
              ) : (
                <Shield className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm">自动防护</span>
            </div>
            <button
              onClick={handleProtectionToggle}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                config.enabled ? 'bg-primary' : 'bg-muted'
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  config.enabled ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>

          {/* Protection Mode Selector */}
          {showSettings && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">防护措施</p>
              <div className="grid grid-cols-1 gap-2">
                {(
                  [
                    { value: 'pause_all', label: '暂停所有策略', icon: Pause },
                    { value: 'cancel_orders', label: '取消挂单', icon: XCircle },
                    { value: 'notify_only', label: '仅发送通知', icon: Bell },
                  ] as const
                ).map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => handleModeChange(value)}
                    className={cn(
                      'flex items-center gap-2 p-2.5 rounded-lg border text-left text-sm transition-colors',
                      config.autoProtectionMode === value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                    {config.autoProtectionMode === value && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        当前
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sound Toggle */}
          {showSettings && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                <span className="text-sm">声音警报</span>
              </div>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  soundEnabled ? 'bg-primary' : 'bg-muted'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    soundEnabled ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>
          )}
        </div>

        {/* Recent Events */}
        <div className="space-y-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center justify-between w-full text-left"
          >
            <p className="text-sm font-medium flex items-center gap-2">
              <History className="h-4 w-4" />
              最近事件 ({events.length})
            </p>
            {showHistory ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {showHistory && (
            <div className="space-y-2">
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  暂无极端行情事件
                </p>
              ) : (
                events.slice(0, 5).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/30 text-sm"
                  >
                    <EventIcon reason={event.triggerReason} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {getTriggerReasonLabel(event.triggerReason)}
                        </span>
                        <span className="text-muted-foreground">
                          ({event.triggerValue}
                          {event.triggerReason === 'volume_spike' ? 'x' : '%'})
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{formatEventTime(event.timestamp)}</span>
                        <span>•</span>
                        <span>{event.protectionAction}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {events.length > 5 && (
                <Button variant="ghost" size="sm" className="w-full text-muted-foreground">
                  查看所有 {events.length} 条事件
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// MetricBar Component
// =============================================================================

interface MetricBarProps {
  label: string
  value: number
  threshold: number
  unit: string
  prefix?: string
  isAlert?: boolean
}

function MetricBar({ label, value, threshold, unit, prefix = '', isAlert }: MetricBarProps) {
  const percentage = Math.min((value / threshold) * 100, 100)
  const isWarning = percentage >= 50
  const isDanger = percentage >= 80

  return (
    <div
      className={cn(
        'p-3 rounded-lg transition-colors',
        isAlert ? 'bg-orange-500/10 border border-orange-500/30' : 'bg-muted/30'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm">{label}</span>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'font-mono font-medium',
              isAlert
                ? 'text-orange-500'
                : isDanger
                  ? 'text-red-500'
                  : isWarning
                    ? 'text-yellow-500'
                    : 'text-green-500'
            )}
          >
            {prefix}{value}{unit}
          </span>
          <span className="text-xs text-muted-foreground">/ {threshold}{unit}</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-500',
            isAlert
              ? 'bg-orange-500'
              : isDanger
                ? 'bg-red-500'
                : isWarning
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-muted-foreground">
          {isAlert ? '超限!' : percentage >= 50 ? '接近阈值' : '安全'}
        </span>
      </div>
    </div>
  )
}

// =============================================================================
// EventIcon Component
// =============================================================================

function EventIcon({ reason }: { reason: ExtremeMarketEvent['triggerReason'] }) {
  switch (reason) {
    case 'volatility':
      return <TrendingUp className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
    case 'depth_drop':
      return <BarChart3 className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
    case 'volume_spike':
      return <Gauge className="h-4 w-4 text-purple-500 flex-shrink-0 mt-0.5" />
  }
}

// =============================================================================
// Helpers
// =============================================================================

function getTriggerReasonLabel(reason: ExtremeMarketEvent['triggerReason']): string {
  switch (reason) {
    case 'volatility':
      return '波动率超限'
    case 'depth_drop':
      return '深度骤降'
    case 'volume_spike':
      return '交易量激增'
  }
}

function getProtectionModeLabel(mode: ExtremeMarketConfig['autoProtectionMode']): string {
  switch (mode) {
    case 'pause_all':
      return '暂停所有策略'
    case 'cancel_orders':
      return '取消挂单'
    case 'notify_only':
      return '仅发送通知'
  }
}

function formatEventTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const days = Math.floor(diff / 86400000)

  if (days === 0) {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  if (days === 1) return '昨天'
  if (days < 7) return `${days} 天前`
  return new Date(timestamp).toLocaleDateString('zh-CN')
}

// =============================================================================
// Export
// =============================================================================

export default ExtremeMarketPanel
