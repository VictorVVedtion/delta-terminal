'use client'

import React from 'react'

import { cn } from '@/lib/utils'
import type { InsightParam, ParamOption } from '@/types/insight'

// =============================================================================
// Types
// =============================================================================

export interface ParamButtonGroupProps {
  /** The parameter definition */
  param: InsightParam
  /** Current value */
  value: string | number
  /** Called when value changes */
  onChange: (value: string | number) => void
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
// ParamButtonGroup Component
// =============================================================================

export function ParamButtonGroup({
  param,
  value,
  onChange,
  error,
  warning,
  disabled = false,
  className,
}: ParamButtonGroupProps) {
  const options = param.config.options || []

  // Handle option click
  const handleOptionClick = (optionValue: string | number) => {
    if (!disabled) {
      onChange(optionValue)
    }
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent, optionValue: string | number) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      handleOptionClick(optionValue)
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

      {/* Button Group Row */}
      <div className="flex items-center gap-2 flex-wrap">
        {options.map((option: ParamOption) => {
          const isSelected = option.value === value

          return (
            <button
              key={String(option.value)}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={option.label}
              onClick={() => { handleOptionClick(option.value); }}
              onKeyDown={(e) => { handleKeyDown(e, option.value); }}
              disabled={disabled}
              title={option.description}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium',
                'transition-all duration-200 ease-in-out',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                // 选中状态 - 使用品牌色 rb-cyan
                isSelected && !hasError && !hasWarning && [
                  'bg-[hsl(var(--rb-cyan))]',
                  'text-[hsl(var(--rb-d900))]', // 深色文字确保对比度
                  'shadow-md',
                ],
                // 未选中状态
                !isSelected && [
                  'bg-muted',
                  'text-muted-foreground',
                  'hover:bg-muted/80',
                  'hover:text-foreground',
                ],
                // 错误状态
                hasError && isSelected && 'bg-red-500 text-white',
                hasError && !isSelected && 'border border-red-500',
                // 警告状态
                hasWarning && isSelected && 'bg-yellow-500 text-[hsl(var(--rb-d900))]',
                hasWarning && !isSelected && 'border border-yellow-500',
                // 禁用状态
                disabled && 'opacity-50 cursor-not-allowed',
                !disabled && 'cursor-pointer',
              )}
            >
              {option.label}
            </button>
          )
        })}
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
      {(typeof param.old_value === 'string' || typeof param.old_value === 'number') &&
        param.old_value !== value && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>原值:</span>
            <span className="line-through">
              {options.find((opt) => opt.value === param.old_value)?.label || param.old_value}
            </span>
          </div>
        )}
    </div>
  )
}

export default ParamButtonGroup
