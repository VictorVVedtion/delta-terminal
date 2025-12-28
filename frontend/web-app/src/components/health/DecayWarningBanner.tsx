/**
 * DecayWarningBanner - 性能衰退预警横幅
 *
 * @module S76 性能衰退预警
 *
 * 页面顶部或卡片内的醒目预警横幅
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { DecayWarning, DecaySeverity } from '@/types/health'
import { DECAY_SEVERITY_LABELS } from '@/types/health'

export interface DecayWarningBannerProps {
  /** 预警列表 */
  warnings: DecayWarning[]
  /** 确认预警回调 */
  onAcknowledge?: (warningId: string) => void
  /** 查看详情回调 */
  onViewDetails?: (warning: DecayWarning) => void
  /** 全部忽略回调 */
  onDismissAll?: () => void
  /** 是否可关闭 */
  dismissible?: boolean
  /** 自定义样式 */
  className?: string
}

const SEVERITY_STYLES: Record<DecaySeverity, string> = {
  mild: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600',
  moderate: 'bg-orange-500/10 border-orange-500/30 text-orange-600',
  severe: 'bg-red-500/10 border-red-500/30 text-red-600',
  critical: 'bg-red-600/20 border-red-600/50 text-red-500',
}

const SEVERITY_ICONS: Record<DecaySeverity, string> = {
  mild: '⚡',
  moderate: '⚠️',
  severe: '🔴',
  critical: '🚨',
}

export function DecayWarningBanner({
  warnings,
  onAcknowledge,
  onViewDetails,
  onDismissAll,
  dismissible = true,
  className,
}: DecayWarningBannerProps) {
  const [dismissed, setDismissed] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  // 过滤未确认的预警
  const activeWarnings = useMemo(
    () => warnings.filter((w) => !w.acknowledged),
    [warnings]
  )

  // 自动轮播多个预警
  useEffect(() => {
    if (activeWarnings.length <= 1) return
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeWarnings.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [activeWarnings.length])

  // 无预警或已关闭
  if (activeWarnings.length === 0 || dismissed) {
    return null
  }

  // 确保索引有效
  const safeIndex = Math.min(currentIndex, activeWarnings.length - 1)
  const currentWarning = activeWarnings[safeIndex]
  if (!currentWarning) {
    return null
  }

  const severity = currentWarning.overallSeverity
  const styles = SEVERITY_STYLES[severity]
  const icon = SEVERITY_ICONS[severity]

  const handleDismissAll = () => {
    if (onDismissAll) {
      onDismissAll()
    }
    setDismissed(true)
  }

  return (
    <div
      className={cn(
        'p-3 border rounded-lg flex items-center justify-between gap-4',
        styles,
        severity === 'critical' && 'animate-pulse',
        className
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="text-xl flex-shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">
              {currentWarning.strategyName}
            </span>
            <span className="text-xs opacity-75">
              {DECAY_SEVERITY_LABELS[severity]}预警
            </span>
            {activeWarnings.length > 1 && (
              <span className="text-xs opacity-60">
                ({currentIndex + 1}/{activeWarnings.length})
              </span>
            )}
          </div>
          <p className="text-xs opacity-80 truncate">
            {currentWarning.indicators.map((i) => i.name).join(', ')}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {onViewDetails && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onViewDetails(currentWarning)}
          >
            详情
          </Button>
        )}
        {onAcknowledge && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              onAcknowledge(currentWarning.id)
              if (currentIndex >= activeWarnings.length - 1) {
                setCurrentIndex(0)
              }
            }}
          >
            知道了
          </Button>
        )}
        {dismissible && activeWarnings.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 opacity-60 hover:opacity-100"
            onClick={handleDismissAll}
          >
            ✕
          </Button>
        )}
      </div>
    </div>
  )
}

export default DecayWarningBanner
