'use client'

/**
 * CircuitBreakerPanel Component
 *
 * EPIC-007 Story 7.1: 熔断器可视化组件
 * 展示熔断器状态、触发原因、恢复倒计时，并提供手动重置功能
 */

import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  History,
  RotateCcw,
  Shield,
  ShieldCheck,
  ShieldOff,
  TrendingDown,
} from 'lucide-react'
import React from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  selectCircuitBreakerStatus,
  selectSafetyConfig,
  useSafetyStore,
} from '@/store/safety'
import type { CircuitBreakerTrigger } from '@/types/safety'

// =============================================================================
// Types
// =============================================================================

interface CircuitBreakerPanelProps {
  /** 是否自动展开（熔断触发时） */
  autoExpand?: boolean
  /** 展示模式：完整/紧凑 */
  mode?: 'full' | 'compact'
  /** 自定义类名 */
  className?: string
}

// =============================================================================
// Constants
// =============================================================================

const TRIGGER_REASON_MAP: Record<CircuitBreakerTrigger, { label: string; icon: React.ReactNode }> = {
  daily_loss_limit: {
    label: '日亏损超限',
    icon: <TrendingDown className="h-4 w-4" />,
  },
  hourly_loss_limit: {
    label: '时亏损超限',
    icon: <Clock className="h-4 w-4" />,
  },
  consecutive_losses: {
    label: '连续亏损',
    icon: <TrendingDown className="h-4 w-4" />,
  },
  manual: {
    label: '手动触发',
    icon: <Shield className="h-4 w-4" />,
  },
  market_anomaly: {
    label: '市场异常',
    icon: <AlertTriangle className="h-4 w-4" />,
  },
}

// =============================================================================
// CircuitBreakerPanel Component
// =============================================================================

export function CircuitBreakerPanel({
  autoExpand = true,
  mode = 'full',
  className,
}: CircuitBreakerPanelProps) {
  const circuitBreaker = useSafetyStore(selectCircuitBreakerStatus)
  const config = useSafetyStore(selectSafetyConfig)
  const resetCircuitBreaker = useSafetyStore((s) => s.resetCircuitBreaker)

  // State
  const [isExpanded, setIsExpanded] = React.useState(autoExpand && circuitBreaker.triggered)
  const [resetProgress, setResetProgress] = React.useState(0)
  const [isResetting, setIsResetting] = React.useState(false)
  const [remainingTime, setRemainingTime] = React.useState<number | null>(null)

  // Auto expand when triggered
  React.useEffect(() => {
    if (autoExpand && circuitBreaker.triggered) {
      setIsExpanded(true)
    }
  }, [autoExpand, circuitBreaker.triggered])

  // Countdown timer for auto-resume
  React.useEffect(() => {
    if (circuitBreaker.triggered && circuitBreaker.resumeAt) {
      const interval = setInterval(() => {
        const remaining = circuitBreaker.resumeAt! - Date.now()
        if (remaining <= 0) {
          setRemainingTime(null)
          clearInterval(interval)
        } else {
          setRemainingTime(remaining)
        }
      }, 1000)

      return () => { clearInterval(interval); }
    } else {
      setRemainingTime(null)
    }
  }, [circuitBreaker.triggered, circuitBreaker.resumeAt])

  // Manual reset with long press
  const handleResetStart = () => {
    setIsResetting(true)
    setResetProgress(0)

    const startTime = Date.now()
    const duration = 3000 // 3 seconds

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min((elapsed / duration) * 100, 100)
      setResetProgress(progress)

      if (progress >= 100) {
        clearInterval(interval)
        resetCircuitBreaker()
        setIsResetting(false)
        setResetProgress(0)
      }
    }, 50)

    const cleanup = () => {
      clearInterval(interval)
      setIsResetting(false)
      setResetProgress(0)
    }

    // Store cleanup function
    const handleMouseUp = () => {
      cleanup()
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('mouseleave', handleMouseUp)
    }

    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('mouseleave', handleMouseUp)
  }

  // Format remaining time
  const formatRemainingTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Get trigger metrics
  const getTriggerMetrics = () => {
    const cbConfig = config.circuitBreaker
    switch (circuitBreaker.triggerReason) {
      case 'daily_loss_limit':
        return {
          current: circuitBreaker.currentDailyLoss,
          threshold: cbConfig.dailyLossLimit,
          unit: '%',
          label: '当前日亏损',
        }
      case 'hourly_loss_limit':
        return {
          current: circuitBreaker.currentHourlyLoss,
          threshold: cbConfig.hourlyLossLimit,
          unit: '%',
          label: '当前时亏损',
        }
      case 'consecutive_losses':
        return {
          current: circuitBreaker.consecutiveLosses,
          threshold: cbConfig.consecutiveLossLimit,
          unit: '次',
          label: '连续亏损次数',
        }
      default:
        return null
    }
  }

  const triggerMetrics = getTriggerMetrics()
  const triggerInfo = circuitBreaker.triggerReason
    ? TRIGGER_REASON_MAP[circuitBreaker.triggerReason]
    : null

  // Compact mode
  if (mode === 'compact') {
    return (
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
          circuitBreaker.triggered
            ? 'bg-red-500/10 border border-red-500/30'
            : 'bg-muted',
          className
        )}
      >
        {circuitBreaker.triggered ? (
          <>
            <ShieldOff className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium text-red-500">熔断中</span>
            {remainingTime && (
              <Badge variant="destructive" className="text-xs">
                {formatRemainingTime(remainingTime)}
              </Badge>
            )}
          </>
        ) : (
          <>
            <ShieldCheck className="h-4 w-4 text-green-500" />
            <span className="text-sm text-muted-foreground">熔断器正常</span>
          </>
        )}
      </div>
    )
  }

  // Full mode
  return (
    <Card
      className={cn(
        'transition-all duration-300',
        circuitBreaker.triggered && 'border-red-500/50 shadow-lg shadow-red-500/10',
        className
      )}
    >
      <CardHeader
        className="cursor-pointer"
        onClick={() => { setIsExpanded(!isExpanded); }}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield
              className={cn(
                'h-5 w-5',
                circuitBreaker.triggered ? 'text-red-500' : 'text-primary'
              )}
            />
            熔断器状态
          </CardTitle>
          <div className="flex items-center gap-2">
            {circuitBreaker.triggered ? (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                触发中
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-green-500 border-green-500/30">
                <ShieldCheck className="h-3 w-3" />
                正常
              </Badge>
            )}
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 space-y-4">
          {circuitBreaker.triggered ? (
            <>
              {/* Trigger Reason */}
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="flex items-center gap-2 mb-3">
                  {triggerInfo?.icon}
                  <span className="font-medium text-red-500">
                    触发原因: {triggerInfo?.label}
                  </span>
                </div>

                {/* Trigger Metrics */}
                {triggerMetrics && (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">{triggerMetrics.label}</p>
                      <p className="font-mono font-medium text-red-500">
                        -{triggerMetrics.current}{triggerMetrics.unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">限制阈值</p>
                      <p className="font-mono font-medium">
                        -{triggerMetrics.threshold}{triggerMetrics.unit}
                      </p>
                    </div>
                  </div>
                )}

                {circuitBreaker.triggeredAt && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    触发时间: {new Date(circuitBreaker.triggeredAt).toLocaleString('zh-CN')}
                  </p>
                )}
              </div>

              {/* Auto Resume Countdown */}
              {remainingTime && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">自动恢复倒计时</span>
                  </div>
                  <span className="font-mono font-bold text-lg">
                    {formatRemainingTime(remainingTime)}
                  </span>
                </div>
              )}

              {/* Manual Reset Button */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground text-center">
                  长按 3 秒手动重置熔断器
                </p>
                <Button
                  variant="destructive"
                  className="w-full relative overflow-hidden"
                  onMouseDown={handleResetStart}
                  disabled={!circuitBreaker.canResume}
                >
                  {isResetting && (
                    <div
                      className="absolute inset-0 bg-green-500/50 transition-all"
                      style={{ width: `${resetProgress}%` }}
                    />
                  )}
                  <RotateCcw className="h-4 w-4 mr-2 relative z-10" />
                  <span className="relative z-10">
                    {isResetting
                      ? `${Math.round(resetProgress)}%`
                      : '长按重置熔断器'}
                  </span>
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Current Metrics (when not triggered) */}
              <div className="grid grid-cols-3 gap-3">
                <MetricCard
                  label="日亏损"
                  value={circuitBreaker.currentDailyLoss}
                  threshold={config.circuitBreaker.dailyLossLimit}
                  unit="%"
                />
                <MetricCard
                  label="时亏损"
                  value={circuitBreaker.currentHourlyLoss}
                  threshold={config.circuitBreaker.hourlyLossLimit}
                  unit="%"
                />
                <MetricCard
                  label="连续亏损"
                  value={circuitBreaker.consecutiveLosses}
                  threshold={config.circuitBreaker.consecutiveLossLimit}
                  unit="次"
                  isCount
                />
              </div>

              {/* Config Summary */}
              <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-3.5 w-3.5" />
                  <span className="font-medium">保护配置</span>
                </div>
                <ul className="space-y-1">
                  <li>日亏损限制: {config.circuitBreaker.dailyLossLimit}%</li>
                  <li>时亏损限制: {config.circuitBreaker.hourlyLossLimit}%</li>
                  <li>连续亏损限制: {config.circuitBreaker.consecutiveLossLimit}次</li>
                  <li>
                    自动恢复: {config.circuitBreaker.autoResume
                      ? `${config.circuitBreaker.resumeAfterMinutes}分钟后`
                      : '需手动重置'}
                  </li>
                </ul>
              </div>
            </>
          )}

          {/* History Button */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
          >
            <History className="h-4 w-4 mr-2" />
            查看历史记录
          </Button>
        </CardContent>
      )}
    </Card>
  )
}

// =============================================================================
// MetricCard Component
// =============================================================================

interface MetricCardProps {
  label: string
  value: number
  threshold: number
  unit: string
  isCount?: boolean
}

function MetricCard({ label, value, threshold, unit, isCount }: MetricCardProps) {
  const percentage = isCount ? (value / threshold) * 100 : (value / threshold) * 100
  const isWarning = percentage >= 50
  const isDanger = percentage >= 80

  return (
    <div className="p-3 rounded-lg bg-muted/50">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p
        className={cn(
          'font-mono font-medium',
          isDanger && 'text-red-500',
          isWarning && !isDanger && 'text-yellow-500'
        )}
      >
        {isCount ? value : `-${value}`}{unit}
      </p>
      <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            'h-full transition-all',
            isDanger ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-green-500'
          )}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground mt-1">
        限额: {isCount ? threshold : `-${threshold}`}{unit}
      </p>
    </div>
  )
}

// =============================================================================
// Export
// =============================================================================

export default CircuitBreakerPanel
