'use client'

/**
 * Margin Alert Component
 * V3 Design Document: S28 - 保证金/强平预警机制
 *
 * Features:
 * - Real-time margin ratio display with visual gauge
 * - Multi-level alert states (safe/warning/danger/critical)
 * - Estimated liquidation price display
 * - Sound alert support
 * - Quick actions for risk reduction
 */

import {
  AlertTriangle,
  DollarSign,
  Percent,
  ShieldAlert,
  ShieldCheck,
  Skull,
  TrendingDown,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react'
import React from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { selectMarginStatus, selectSafetyConfig,useSafetyStore } from '@/store/safety'
import type { MarginAlertLevel } from '@/types/safety'

// =============================================================================
// Type Definitions
// =============================================================================

export interface MarginAlertProps {
  /** Compact mode for sidebar display */
  compact?: boolean
  /** Show sound control */
  showSoundControl?: boolean
  /** Callback when user wants to reduce position */
  onReducePosition?: () => void
  /** Callback when user wants to add margin */
  onAddMargin?: () => void
  /** Custom class name */
  className?: string
}

// =============================================================================
// Alert Level Configuration
// =============================================================================

const ALERT_LEVEL_CONFIG: Record<
  MarginAlertLevel,
  {
    label: string
    labelEn: string
    icon: typeof ShieldCheck
    color: string
    bgColor: string
    borderColor: string
    textColor: string
    pulseAnimation: boolean
  }
> = {
  safe: {
    label: '安全',
    labelEn: 'Safe',
    icon: ShieldCheck,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    textColor: 'text-green-400',
    pulseAnimation: false,
  },
  warning: {
    label: '警告',
    labelEn: 'Warning',
    icon: AlertTriangle,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    textColor: 'text-yellow-400',
    pulseAnimation: false,
  },
  danger: {
    label: '危险',
    labelEn: 'Danger',
    icon: ShieldAlert,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    textColor: 'text-orange-400',
    pulseAnimation: true,
  },
  critical: {
    label: '临界',
    labelEn: 'Critical',
    icon: Skull,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    textColor: 'text-red-400',
    pulseAnimation: true,
  },
}

// =============================================================================
// Main Component
// =============================================================================

export function MarginAlert({
  compact = false,
  showSoundControl = true,
  onReducePosition,
  onAddMargin,
  className,
}: MarginAlertProps) {
  const marginStatus = useSafetyStore(selectMarginStatus)
  const config = useSafetyStore(selectSafetyConfig)
  const { updateConfig } = useSafetyStore()

  const [soundEnabled, setSoundEnabled] = React.useState(config.marginAlert.soundEnabled)
  const prevLevelRef = React.useRef<MarginAlertLevel>(marginStatus.alertLevel)

  // Play sound on level change to danger/critical
  React.useEffect(() => {
    const prevLevel = prevLevelRef.current
    prevLevelRef.current = marginStatus.alertLevel

    if (soundEnabled && config.marginAlert.enabled) {
      const shouldAlert =
        (marginStatus.alertLevel === 'danger' || marginStatus.alertLevel === 'critical') &&
        (prevLevel === 'safe' || prevLevel === 'warning')

      if (shouldAlert) {
        playAlertSound()
      }
    }
  }, [marginStatus.alertLevel, soundEnabled, config.marginAlert.enabled])

  // Toggle sound
  const toggleSound = () => {
    const newValue = !soundEnabled
    setSoundEnabled(newValue)
    updateConfig({
      marginAlert: {
        ...config.marginAlert,
        soundEnabled: newValue,
      },
    })
  }

  const levelConfig = ALERT_LEVEL_CONFIG[marginStatus.alertLevel]
  const LevelIcon = levelConfig.icon

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  // Compact mode for sidebar
  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
          levelConfig.bgColor,
          levelConfig.borderColor,
          levelConfig.pulseAnimation && 'animate-pulse',
          className
        )}
      >
        <LevelIcon className={cn('h-4 w-4', levelConfig.color)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">{levelConfig.label}</span>
            <span className={cn('text-sm font-bold', levelConfig.textColor)}>
              {marginStatus.marginRatio.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    )
  }

  // Full mode
  return (
    <div
      className={cn(
        'rounded-xl border p-4 space-y-4 transition-all duration-300',
        levelConfig.bgColor,
        levelConfig.borderColor,
        levelConfig.pulseAnimation && 'animate-pulse',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LevelIcon className={cn('h-5 w-5', levelConfig.color)} />
          <span className="font-semibold">保证金状态</span>
          <Badge
            variant={
              marginStatus.alertLevel === 'safe'
                ? 'success'
                : marginStatus.alertLevel === 'warning'
                ? 'warning'
                : 'destructive'
            }
          >
            {levelConfig.label}
          </Badge>
        </div>

        {showSoundControl && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSound}
            className="h-8 w-8"
            title={soundEnabled ? '关闭声音提醒' : '开启声音提醒'}
          >
            {soundEnabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        )}
      </div>

      {/* Margin Ratio Gauge */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">保证金率</span>
          <span className={cn('text-2xl font-bold', levelConfig.textColor)}>
            {marginStatus.marginRatio.toFixed(1)}%
          </span>
        </div>
        <MarginGauge ratio={marginStatus.marginRatio} thresholds={config.marginAlert.thresholds} />
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        {/* Used Margin */}
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-muted-foreground">
            <DollarSign className="h-3.5 w-3.5" />
            <span>已用保证金</span>
          </div>
          <div className="font-medium">{formatCurrency(marginStatus.usedMargin)}</div>
        </div>

        {/* Available Margin */}
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Percent className="h-3.5 w-3.5" />
            <span>可用保证金</span>
          </div>
          <div className="font-medium">{formatCurrency(marginStatus.availableMargin)}</div>
        </div>

        {/* Total Equity */}
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-muted-foreground">
            <TrendingDown className="h-3.5 w-3.5" />
            <span>账户权益</span>
          </div>
          <div className="font-medium">{formatCurrency(marginStatus.totalEquity)}</div>
        </div>

        {/* Estimated Liquidation */}
        {marginStatus.estimatedLiquidationPrice !== undefined && (
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Zap className="h-3.5 w-3.5" />
              <span>预估强平价</span>
            </div>
            <div className={cn('font-medium', marginStatus.alertLevel !== 'safe' && 'text-red-400')}>
              {formatCurrency(marginStatus.estimatedLiquidationPrice)}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons (show in danger/critical) */}
      {(marginStatus.alertLevel === 'danger' || marginStatus.alertLevel === 'critical') && (
        <div className="flex gap-2 pt-2 border-t border-border/50">
          {onReducePosition && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onReducePosition}
              className="flex-1"
            >
              <TrendingDown className="h-4 w-4 mr-1" />
              减少仓位
            </Button>
          )}
          {onAddMargin && (
            <Button variant="outline" size="sm" onClick={onAddMargin} className="flex-1">
              <DollarSign className="h-4 w-4 mr-1" />
              追加保证金
            </Button>
          )}
        </div>
      )}

      {/* Last Updated */}
      <div className="text-xs text-muted-foreground text-right">
        更新于 {new Date(marginStatus.lastUpdated).toLocaleTimeString('zh-CN')}
      </div>
    </div>
  )
}

// =============================================================================
// Sub Components
// =============================================================================

/**
 * MarginGauge - Visual gauge for margin ratio
 */
interface MarginGaugeProps {
  ratio: number
  thresholds: {
    safe: number
    warning: number
    danger: number
  }
}

function MarginGauge({ ratio, thresholds }: MarginGaugeProps) {
  // Clamp ratio to 0-100 for display
  const displayRatio = Math.min(100, Math.max(0, ratio))

  // Calculate marker positions (as percentages)
  const safePos = thresholds.safe
  const warningPos = thresholds.warning
  const dangerPos = thresholds.danger

  return (
    <div className="relative h-3 bg-muted rounded-full overflow-hidden">
      {/* Background gradient zones */}
      <div className="absolute inset-0 flex">
        {/* Critical zone (0 to danger threshold) */}
        <div
          className="h-full bg-red-500/30"
          style={{ width: `${dangerPos}%` }}
        />
        {/* Danger zone (danger to warning) */}
        <div
          className="h-full bg-orange-500/30"
          style={{ width: `${warningPos - dangerPos}%` }}
        />
        {/* Warning zone (warning to safe) */}
        <div
          className="h-full bg-yellow-500/30"
          style={{ width: `${safePos - warningPos}%` }}
        />
        {/* Safe zone (safe to 100) */}
        <div
          className="h-full bg-green-500/30"
          style={{ width: `${100 - safePos}%` }}
        />
      </div>

      {/* Current ratio indicator */}
      <div
        className={cn(
          'absolute top-0 h-full rounded-full transition-all duration-500',
          ratio >= thresholds.safe && 'bg-green-500',
          ratio >= thresholds.warning && ratio < thresholds.safe && 'bg-yellow-500',
          ratio >= thresholds.danger && ratio < thresholds.warning && 'bg-orange-500',
          ratio < thresholds.danger && 'bg-red-500'
        )}
        style={{ width: `${displayRatio}%` }}
      />

      {/* Threshold markers */}
      <div
        className="absolute top-0 h-full w-px bg-yellow-500/50"
        style={{ left: `${safePos}%` }}
      />
      <div
        className="absolute top-0 h-full w-px bg-orange-500/50"
        style={{ left: `${warningPos}%` }}
      />
      <div
        className="absolute top-0 h-full w-px bg-red-500/50"
        style={{ left: `${dangerPos}%` }}
      />
    </div>
  )
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Play alert sound for margin warnings
 */
function playAlertSound() {
  // Use Web Audio API for alert sound
  if (typeof window === 'undefined') return

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const audioContext = new AudioContextClass()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 800
    oscillator.type = 'sine'

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.5)

    // Clean up
    setTimeout(() => {
      void audioContext.close()
    }, 1000)
  } catch {
    // Silently fail if audio is not available
  }
}

// =============================================================================
// Compact Alert Badge (for header/status bar)
// =============================================================================

export interface MarginAlertBadgeProps {
  className?: string
  onClick?: () => void
}

export function MarginAlertBadge({ className, onClick }: MarginAlertBadgeProps) {
  const marginStatus = useSafetyStore(selectMarginStatus)
  const levelConfig = ALERT_LEVEL_CONFIG[marginStatus.alertLevel]
  const LevelIcon = levelConfig.icon

  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium',
        'transition-all hover:opacity-80',
        levelConfig.bgColor,
        levelConfig.borderColor,
        'border',
        levelConfig.pulseAnimation && 'animate-pulse',
        className
      )}
    >
      <LevelIcon className={cn('h-3.5 w-3.5', levelConfig.color)} />
      <span className={levelConfig.textColor}>{marginStatus.marginRatio.toFixed(1)}%</span>
    </button>
  )
}

// =============================================================================
// Exports
// =============================================================================

export default MarginAlert
