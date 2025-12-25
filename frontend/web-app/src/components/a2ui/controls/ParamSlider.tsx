'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import type { InsightParam } from '@/types/insight'

// =============================================================================
// Types
// =============================================================================

export interface ParamSliderProps {
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
  /** Show value input alongside slider */
  showInput?: boolean | undefined
  /** Show markers at min/max */
  showMarkers?: boolean | undefined
  /** Custom class name */
  className?: string | undefined
}

// =============================================================================
// ParamSlider Component
// =============================================================================

export function ParamSlider({
  param,
  value,
  onChange,
  error,
  warning,
  disabled = false,
  showInput = true,
  showMarkers = true,
  className,
}: ParamSliderProps) {
  const {
    min = 0,
    max = 100,
    step = 1,
    unit = '',
    precision = 2,
  } = param.config

  // Calculate percentage for visual fill
  const percentage = ((value - min) / (max - min)) * 100

  // Handle slider change
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value)
    onChange(newValue)
  }

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value
    if (rawValue === '' || rawValue === '-') return

    let newValue = parseFloat(rawValue)
    if (isNaN(newValue)) return

    // Clamp to range
    newValue = Math.min(max, Math.max(min, newValue))
    onChange(newValue)
  }

  // Format display value
  const displayValue = precision !== undefined
    ? value.toFixed(precision)
    : value.toString()

  // Determine state colors
  const hasError = !!error
  const hasWarning = !!warning && !hasError

  return (
    <div className={cn('space-y-2', className)}>
      {/* Label Row */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">
          {param.label}
        </label>
        {param.description && (
          <span className="text-xs text-muted-foreground">
            {param.description}
          </span>
        )}
      </div>

      {/* Slider Row */}
      <div className="flex items-center gap-3">
        {/* Custom Slider */}
        <div className="relative flex-1">
          {/* Track Background */}
          <div className={cn(
            'absolute inset-0 h-2 rounded-full',
            hasError ? 'bg-red-100 dark:bg-red-950' : 'bg-muted',
          )} />

          {/* Track Fill */}
          <div
            className={cn(
              'absolute left-0 h-2 rounded-full transition-all duration-100',
              hasError
                ? 'bg-red-500'
                : hasWarning
                  ? 'bg-yellow-500'
                  : 'bg-primary',
              disabled && 'opacity-50',
            )}
            style={{ width: `${percentage}%` }}
          />

          {/* Native Range Input (invisible but functional) */}
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handleSliderChange}
            disabled={disabled}
            className={cn(
              'absolute inset-0 w-full h-2 opacity-0 cursor-pointer',
              disabled && 'cursor-not-allowed',
            )}
          />

          {/* Thumb */}
          <div
            className={cn(
              'absolute top-1/2 -translate-y-1/2 -translate-x-1/2',
              'w-4 h-4 rounded-full border-2 shadow-sm',
              'transition-all duration-100',
              hasError
                ? 'bg-red-500 border-red-600'
                : hasWarning
                  ? 'bg-yellow-500 border-yellow-600'
                  : 'bg-primary border-primary-foreground',
              disabled && 'opacity-50',
            )}
            style={{ left: `${percentage}%` }}
          />
        </div>

        {/* Value Input */}
        {showInput && (
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={min}
              max={max}
              step={step}
              value={displayValue}
              onChange={handleInputChange}
              disabled={disabled}
              className={cn(
                'w-20 h-8 px-2 text-sm text-right rounded-md border bg-background',
                'focus:outline-none focus:ring-2 focus:ring-ring',
                hasError && 'border-red-500 focus:ring-red-500',
                hasWarning && 'border-yellow-500 focus:ring-yellow-500',
                disabled && 'opacity-50 cursor-not-allowed',
              )}
            />
            {unit && (
              <span className="text-sm text-muted-foreground min-w-[2rem]">
                {unit}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Markers */}
      {showMarkers && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{min}{unit}</span>
          <span>{max}{unit}</span>
        </div>
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

      {/* Old Value Indicator */}
      {typeof param.old_value === 'number' && param.old_value !== value && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>原值:</span>
          <span className="line-through">
            {precision !== undefined
              ? param.old_value.toFixed(precision)
              : param.old_value}
            {unit}
          </span>
        </div>
      )}
    </div>
  )
}

export default ParamSlider
