'use client'

import { AlertTriangle, DollarSign,Shield, TrendingDown, TrendingUp } from 'lucide-react'
import React from 'react'

import { Checkbox } from '@/components/ui/checkbox'
import { SliderWithInput } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import type {
  RiskLevel,
  RiskSettings as RiskSettingsType} from '@/types/risk';
import {
  calculateRiskLevel,
  calculateTriggerPrice,
  DEFAULT_RISK_SETTINGS,
  formatCurrency
} from '@/types/risk'

// =============================================================================
// Types
// =============================================================================

export interface RiskSettingsProps {
  /** Current risk settings value */
  value: RiskSettingsType
  /** Called when settings change */
  onChange: (settings: RiskSettingsType) => void
  /** Current market price (for calculating trigger prices) */
  currentPrice?: number
  /** Total capital (for calculating position limits) */
  totalCapital?: number
  /** Disabled state */
  disabled?: boolean
  /** Custom class name */
  className?: string
}

// =============================================================================
// Constants
// =============================================================================

const RISK_LEVEL_CONFIG: Record<
  RiskLevel,
  { color: string; bgColor: string; label: string; icon: React.ReactNode }
> = {
  low: {
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    label: '低风险',
    icon: <Shield className="h-4 w-4" />,
  },
  medium: {
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    label: '中等风险',
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  high: {
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    label: '高风险',
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  critical: {
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    label: '极高风险',
    icon: <AlertTriangle className="h-4 w-4" />,
  },
}

// =============================================================================
// RiskSettings Component
// =============================================================================

export function RiskSettings({
  value,
  onChange,
  currentPrice = 40000,
  totalCapital = 10000,
  disabled = false,
  className,
}: RiskSettingsProps) {
  // Calculate derived values
  const riskLevel = calculateRiskLevel(value)
  const riskConfig = RISK_LEVEL_CONFIG[riskLevel]

  // Calculate trigger prices
  const stopLossPrice = value.stopLoss.enabled
    ? calculateTriggerPrice(currentPrice, value.stopLoss, true)
    : 0

  const takeProfitPrice = value.takeProfit.enabled
    ? calculateTriggerPrice(currentPrice, value.takeProfit, false)
    : 0

  // Calculate max loss/gain
  const maxPositionValue = (totalCapital * value.positionLimit.maxPositionPercent) / 100
  const maxLoss = value.stopLoss.enabled
    ? (maxPositionValue * value.stopLoss.value) / 100
    : maxPositionValue

  const maxGain = value.takeProfit.enabled
    ? (maxPositionValue * value.takeProfit.value) / 100
    : maxPositionValue

  const riskRewardRatio =
    value.stopLoss.enabled && value.takeProfit.enabled && value.stopLoss.value > 0
      ? value.takeProfit.value / value.stopLoss.value
      : 0

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const updateStopLoss = (updates: Partial<typeof value.stopLoss>) => {
    onChange({
      ...value,
      stopLoss: { ...value.stopLoss, ...updates },
    })
  }

  const updateTakeProfit = (updates: Partial<typeof value.takeProfit>) => {
    onChange({
      ...value,
      takeProfit: { ...value.takeProfit, ...updates },
    })
  }

  const updatePositionLimit = (updates: Partial<typeof value.positionLimit>) => {
    onChange({
      ...value,
      positionLimit: { ...value.positionLimit, ...updates },
    })
  }

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div className={cn('space-y-6', className)}>
      {/* Section: Stop Loss */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium">止损设置</span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={value.stopLoss.enabled}
              onCheckedChange={(checked) =>
                { updateStopLoss({ enabled: checked === true }); }
              }
              disabled={disabled}
            />
            <span className="text-xs text-muted-foreground">启用</span>
          </label>
        </div>

        {value.stopLoss.enabled && (
          <div className="pl-6 space-y-3">
            {/* Type Toggle */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { updateStopLoss({ type: 'percentage' }); }}
                disabled={disabled}
                className={cn(
                  'px-3 py-1 text-xs rounded-md transition-colors',
                  value.stopLoss.type === 'percentage'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                百分比
              </button>
              <button
                type="button"
                onClick={() => { updateStopLoss({ type: 'fixed_price' }); }}
                disabled={disabled}
                className={cn(
                  'px-3 py-1 text-xs rounded-md transition-colors',
                  value.stopLoss.type === 'fixed_price'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                固定价格
              </button>
            </div>

            {/* Value Slider */}
            <SliderWithInput
              value={value.stopLoss.value}
              onChange={(v) => { updateStopLoss({ value: v }); }}
              min={value.stopLoss.type === 'percentage' ? 0.5 : 0}
              max={value.stopLoss.type === 'percentage' ? 30 : currentPrice * 0.9}
              step={value.stopLoss.type === 'percentage' ? 0.5 : 100}
              suffix={value.stopLoss.type === 'percentage' ? '%' : ''}
              prefix={value.stopLoss.type === 'fixed_price' ? '$' : ''}
              disabled={disabled}
            />

            {/* Trigger Price Preview */}
            <div className="text-xs text-muted-foreground">
              触发价格: {formatCurrency(stopLossPrice)} (当前: {formatCurrency(currentPrice)})
            </div>
          </div>
        )}
      </div>

      {/* Section: Take Profit */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">止盈设置</span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={value.takeProfit.enabled}
              onCheckedChange={(checked) =>
                { updateTakeProfit({ enabled: checked === true }); }
              }
              disabled={disabled}
            />
            <span className="text-xs text-muted-foreground">启用</span>
          </label>
        </div>

        {value.takeProfit.enabled && (
          <div className="pl-6 space-y-3">
            {/* Type Toggle */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { updateTakeProfit({ type: 'percentage' }); }}
                disabled={disabled}
                className={cn(
                  'px-3 py-1 text-xs rounded-md transition-colors',
                  value.takeProfit.type === 'percentage'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                百分比
              </button>
              <button
                type="button"
                onClick={() => { updateTakeProfit({ type: 'fixed_price' }); }}
                disabled={disabled}
                className={cn(
                  'px-3 py-1 text-xs rounded-md transition-colors',
                  value.takeProfit.type === 'fixed_price'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                固定价格
              </button>
            </div>

            {/* Value Slider */}
            <SliderWithInput
              value={value.takeProfit.value}
              onChange={(v) => { updateTakeProfit({ value: v }); }}
              min={value.takeProfit.type === 'percentage' ? 1 : currentPrice}
              max={value.takeProfit.type === 'percentage' ? 100 : currentPrice * 2}
              step={value.takeProfit.type === 'percentage' ? 1 : 100}
              suffix={value.takeProfit.type === 'percentage' ? '%' : ''}
              prefix={value.takeProfit.type === 'fixed_price' ? '$' : ''}
              disabled={disabled}
            />

            {/* Trigger Price Preview */}
            <div className="text-xs text-muted-foreground">
              触发价格: {formatCurrency(takeProfitPrice)} (当前: {formatCurrency(currentPrice)})
            </div>
          </div>
        )}
      </div>

      {/* Section: Position Limit */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium">仓位限制</span>
        </div>

        <div className="pl-6 space-y-4">
          {/* Max Position Percent */}
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">
              最大仓位占比
            </div>
            <SliderWithInput
              value={value.positionLimit.maxPositionPercent}
              onChange={(v) => { updatePositionLimit({ maxPositionPercent: v }); }}
              min={5}
              max={100}
              step={5}
              suffix="%"
              disabled={disabled}
            />
            <div className="text-xs text-muted-foreground">
              最大仓位: {formatCurrency(maxPositionValue)} / {formatCurrency(totalCapital)}
            </div>
          </div>

          {/* Max Trade Amount */}
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">
              单笔最大金额
            </div>
            <SliderWithInput
              value={value.positionLimit.maxTradeAmount}
              onChange={(v) => { updatePositionLimit({ maxTradeAmount: v }); }}
              min={100}
              max={totalCapital}
              step={100}
              prefix="$"
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      {/* Section: Risk Assessment */}
      <div
        className={cn(
          'rounded-lg p-4 space-y-3',
          riskConfig.bgColor,
          'border border-border'
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={riskConfig.color}>{riskConfig.icon}</span>
            <span className="text-sm font-medium">风险评估</span>
          </div>
          <span className={cn('text-sm font-semibold', riskConfig.color)}>
            {riskConfig.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <div className="text-muted-foreground">最大可能损失</div>
            <div className="font-mono text-red-500">
              -{formatCurrency(maxLoss)} ({value.stopLoss.value}%)
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-muted-foreground">最大预期收益</div>
            <div className="font-mono text-green-500">
              +{formatCurrency(maxGain)} ({value.takeProfit.value}%)
            </div>
          </div>

          <div className="col-span-2 space-y-1">
            <div className="text-muted-foreground">风险收益比</div>
            <div
              className={cn(
                'font-mono',
                riskRewardRatio >= 2
                  ? 'text-green-500'
                  : riskRewardRatio >= 1
                    ? 'text-yellow-500'
                    : 'text-red-500'
              )}
            >
              1:{riskRewardRatio.toFixed(1)}
              {riskRewardRatio >= 2 && ' ✓'}
              {riskRewardRatio < 1 && ' (建议 ≥ 1:2)'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Export Default Settings
// =============================================================================

export { DEFAULT_RISK_SETTINGS }

export default RiskSettings
