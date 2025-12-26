'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import type { InsightParam } from '@/types/insight'

// =============================================================================
// Types
// =============================================================================

export interface ParamToggleProps {
  /** The parameter definition */
  param: InsightParam
  /** Current value */
  value: boolean
  /** Called when value changes */
  onChange: (value: boolean) => void
  /** Error message */
  error?: string | undefined
  /** Warning message */
  warning?: string | undefined
  /** Disabled state */
  disabled?: boolean | undefined
  /** Custom class name */
  className?: string | undefined
}

// =============================================================================
// ParamToggle Component
// =============================================================================

export function ParamToggle({
  param,
  value,
  onChange,
  error,
  warning,
  disabled = false,
  className,
}: ParamToggleProps) {
  // Handle toggle click
  const handleToggle = () => {
    if (!disabled) {
      onChange(!value)
    }
  }

  // Handle keyboard interaction
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      handleToggle()
    }
  }

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

      {/* Toggle Row */}
      <div className="flex items-center gap-3">
        {/* Toggle Switch */}
        <button
          type="button"
          role="switch"
          aria-checked={value}
          aria-label={param.label}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={cn(
            'relative inline-flex h-6 w-11 items-center rounded-full',
            'transition-colors duration-200 ease-in-out',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            value
              ? 'bg-[hsl(var(--rb-green))]' // 绿色开启状态
              : 'bg-muted',
            hasError && 'bg-red-500',
            hasWarning && !value && 'bg-yellow-500',
            disabled && 'opacity-50 cursor-not-allowed',
            !disabled && 'cursor-pointer',
          )}
        >
          {/* Switch Knob */}
          <span
            className={cn(
              'inline-block h-4 w-4 rounded-full bg-white shadow-sm',
              'transition-transform duration-200 ease-in-out',
              value ? 'translate-x-6' : 'translate-x-1',
            )}
          />
        </button>

        {/* State Label */}
        <span className={cn(
          'text-sm font-medium tabular-nums',
          value
            ? 'text-[hsl(var(--rb-green))]'
            : 'text-muted-foreground',
          hasError && 'text-red-500',
          hasWarning && 'text-yellow-600',
        )}>
          {value ? '开启' : '关闭'}
        </span>
      </div>

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
      {typeof param.old_value === 'boolean' && param.old_value !== value && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>原值:</span>
          <span className="line-through">
            {param.old_value ? '开启' : '关闭'}
          </span>
        </div>
      )}
    </div>
  )
}

export default ParamToggle
