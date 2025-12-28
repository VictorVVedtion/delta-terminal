'use client'

import React, { useMemo } from 'react'

import { cn } from '@/lib/utils'
import type { HeatmapZone,InsightParam } from '@/types/insight'

// =============================================================================
// Types
// =============================================================================

export interface HeatmapSliderProps {
  /** The parameter definition */
  param: InsightParam
  /** Current value */
  value: number
  /** Called when value changes */
  onChange: (value: number) => void
  /** Error message */
  error?: string | undefined
  /** Warning message */
  warning?: string | undefined
  /** Disabled state */
  disabled?: boolean | undefined
  /** Custom class name */
  className?: string | undefined
}

// Default zones if not provided
const defaultZones: HeatmapZone[] = [
  { start: 0, end: 33, color: 'green', label: '保守' },
  { start: 33, end: 66, color: 'gray', label: '中性' },
  { start: 66, end: 100, color: 'red', label: '激进' },
]

// Zone color mapping
const zoneColors: Record<HeatmapZone['color'], { bg: string; text: string; border: string }> = {
  green: {
    bg: 'bg-green-500',
    text: 'text-green-500',
    border: 'border-green-500',
  },
  gray: {
    bg: 'bg-gray-500',
    text: 'text-gray-500',
    border: 'border-gray-500',
  },
  red: {
    bg: 'bg-red-500',
    text: 'text-red-500',
    border: 'border-red-500',
  },
  yellow: {
    bg: 'bg-yellow-500',
    text: 'text-yellow-500',
    border: 'border-yellow-500',
  },
  blue: {
    bg: 'bg-blue-500',
    text: 'text-blue-500',
    border: 'border-blue-500',
  },
}

// =============================================================================
// HeatmapSlider Component
// =============================================================================

export function HeatmapSlider({
  param,
  value,
  onChange,
  error,
  warning,
  disabled = false,
  className,
}: HeatmapSliderProps) {
  const {
    min = 0,
    max = 100,
    step = 1,
    unit = '',
    heatmap_zones = defaultZones,
  } = param.config

  // Calculate percentage for visual position
  const percentage = ((value - min) / (max - min)) * 100

  // Find current zone
  const currentZone = useMemo(() => {
    return heatmap_zones.find(zone =>
      percentage >= zone.start && percentage < zone.end
    ) || heatmap_zones[heatmap_zones.length - 1]
  }, [percentage, heatmap_zones])

  // Handle slider change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value)
    onChange(newValue)
  }

  // Handle zone click (jump to zone center)
  const handleZoneClick = (zone: HeatmapZone) => {
    if (disabled) return
    const zoneCenter = (zone.start + zone.end) / 2
    const newValue = min + (zoneCenter / 100) * (max - min)
    onChange(Math.round(newValue / step) * step)
  }

  // Determine state colors
  const hasError = !!error
  const hasWarning = !!warning && !hasError
  const colors = currentZone ? zoneColors[currentZone.color] : zoneColors.gray

  return (
    <div className={cn('space-y-3', className)}>
      {/* Label Row */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">
          {param.label}
        </label>
        <div className="flex items-center gap-2">
          <span className={cn('text-sm font-semibold', colors.text)}>
            {currentZone?.label}
          </span>
          <span className="text-sm text-muted-foreground">
            ({value}{unit})
          </span>
        </div>
      </div>

      {/* Heatmap Track - 增加可交互区域 */}
      <div className="relative h-8 flex items-center">
        {/* Zone Backgrounds */}
        <div className="flex h-3 rounded-full overflow-hidden w-full">
          {heatmap_zones.map((zone, index) => (
            <button
              key={index}
              onClick={() => { handleZoneClick(zone); }}
              disabled={disabled}
              className={cn(
                'h-full transition-opacity',
                zoneColors[zone.color].bg,
                disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:opacity-80',
              )}
              style={{ width: `${zone.end - zone.start}%` }}
              title={zone.label}
            />
          ))}
        </div>

        {/* Native Range Input - 扩大可点击区域 */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          className={cn(
            'absolute inset-0 w-full h-8 opacity-0 cursor-pointer z-10',
            disabled && 'cursor-not-allowed',
          )}
          style={{ touchAction: 'none' }}
        />

        {/* Thumb - 不捕获事件 */}
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none',
            'w-5 h-5 rounded-full bg-white border-2 shadow-md',
            'transition-all duration-100',
            colors.border,
            hasError && 'border-red-500',
            hasWarning && 'border-yellow-500',
            disabled && 'opacity-50',
          )}
          style={{ left: `${percentage}%` }}
        >
          {/* Inner dot */}
          <div className={cn(
            'absolute inset-1 rounded-full',
            colors.bg,
            hasError && 'bg-red-500',
            hasWarning && 'bg-yellow-500',
          )} />
        </div>
      </div>

      {/* Zone Labels */}
      <div className="flex justify-between">
        {heatmap_zones.map((zone, index) => (
          <button
            key={index}
            onClick={() => { handleZoneClick(zone); }}
            disabled={disabled}
            className={cn(
              'text-xs transition-colors',
              percentage >= zone.start && percentage < zone.end
                ? cn('font-semibold', zoneColors[zone.color].text)
                : 'text-muted-foreground',
              !disabled && 'hover:text-foreground cursor-pointer',
              disabled && 'cursor-not-allowed',
            )}
            style={{
              width: `${zone.end - zone.start}%`,
              textAlign: index === 0 ? 'left' : index === heatmap_zones.length - 1 ? 'right' : 'center',
            }}
          >
            {zone.label}
          </button>
        ))}
      </div>

      {/* Description based on current zone */}
      {currentZone && (
        <p className={cn('text-xs', colors.text)}>
          {getZoneDescription(currentZone, param.label)}
        </p>
      )}

      {/* Error/Warning Message */}
      {(error || warning) && (
        <p className={cn(
          'text-xs',
          error ? 'text-red-500' : 'text-yellow-600',
        )}>
          {error || warning}
        </p>
      )}
    </div>
  )
}

// =============================================================================
// Helper Functions
// =============================================================================

function getZoneDescription(zone: HeatmapZone, paramLabel: string): string {
  const descriptions: Record<string, Record<HeatmapZone['color'], string>> = {
    default: {
      green: '低风险配置，适合稳健型交易者',
      gray: '平衡配置，风险收益适中',
      red: '高风险配置，追求更高收益',
      yellow: '中等风险，需要关注市场变化',
      blue: '标准配置，推荐给大多数用户',
    },
    '风险等级': {
      green: '保守策略：低仓位、严格止损，适合震荡市',
      gray: '中性策略：均衡配置，适合大多数行情',
      red: '激进策略：高仓位、宽止损，适合趋势市',
      yellow: '谨慎策略：建议在市场明朗后调整',
      blue: '推荐策略：基于历史数据优化的配置',
    },
  }

  const emptyDescriptions: Partial<Record<HeatmapZone['color'], string>> = {}
  const labelDescriptions = descriptions[paramLabel] ?? descriptions.default ?? emptyDescriptions
  const defaultDescriptions = descriptions.default ?? emptyDescriptions
  return labelDescriptions[zone.color] ?? defaultDescriptions[zone.color] ?? ''
}

export default HeatmapSlider
