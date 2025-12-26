'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

export interface SliderProps {
  /** Current value */
  value: number
  /** Called when value changes */
  onChange: (value: number) => void
  /** Minimum value */
  min?: number
  /** Maximum value */
  max?: number
  /** Step increment */
  step?: number
  /** Disabled state */
  disabled?: boolean
  /** Custom class name */
  className?: string
  /** Show value label */
  showValue?: boolean
  /** Value suffix (e.g., '%', 'USDT') */
  suffix?: string
  /** Value prefix (e.g., '$') */
  prefix?: string
}

// =============================================================================
// Slider Component
// =============================================================================

export function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  className,
  showValue = true,
  suffix = '',
  prefix = '',
}: SliderProps) {
  // Calculate percentage for visual fill
  const percentage = ((value - min) / (max - min)) * 100

  // Handle slider change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value)
    onChange(newValue)
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="relative flex items-center gap-3">
        {/* Slider Track */}
        <div className="relative flex-1 h-2">
          {/* Background Track */}
          <div className="absolute inset-0 rounded-full bg-muted" />

          {/* Fill Track */}
          <div
            className={cn(
              'absolute inset-y-0 left-0 rounded-full transition-all',
              disabled ? 'bg-muted-foreground/30' : 'bg-primary'
            )}
            style={{ width: `${percentage}%` }}
          />

          {/* Input Range (invisible but interactive) */}
          <input
            type="range"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={handleChange}
            disabled={disabled}
            className={cn(
              'absolute inset-0 w-full opacity-0 cursor-pointer',
              disabled && 'cursor-not-allowed'
            )}
          />

          {/* Thumb */}
          <div
            className={cn(
              'absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 shadow-sm transition-all',
              disabled
                ? 'bg-muted border-muted-foreground/30'
                : 'bg-background border-primary hover:scale-110'
            )}
            style={{ left: `calc(${percentage}% - 8px)` }}
          />
        </div>

        {/* Value Display */}
        {showValue && (
          <div
            className={cn(
              'min-w-[60px] text-right text-sm font-mono tabular-nums',
              disabled ? 'text-muted-foreground' : 'text-foreground'
            )}
          >
            {prefix}
            {value}
            {suffix}
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// SliderWithInput - Slider with editable input
// =============================================================================

export interface SliderWithInputProps extends SliderProps {
  /** Input width */
  inputWidth?: number
}

export function SliderWithInput({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  className,
  suffix = '',
  prefix = '',
  inputWidth = 80,
}: SliderWithInputProps) {
  const [inputValue, setInputValue] = React.useState(value.toString())

  // Sync input value when external value changes
  React.useEffect(() => {
    setInputValue(value.toString())
  }, [value])

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  // Handle input blur - validate and apply
  const handleInputBlur = () => {
    let newValue = parseFloat(inputValue)
    if (isNaN(newValue)) {
      setInputValue(value.toString())
      return
    }
    // Clamp to range
    newValue = Math.min(max, Math.max(min, newValue))
    setInputValue(newValue.toString())
    onChange(newValue)
  }

  // Handle enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInputBlur()
    }
  }

  // Calculate percentage for visual fill
  const percentage = ((value - min) / (max - min)) * 100

  // Handle slider change
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value)
    onChange(newValue)
    setInputValue(newValue.toString())
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center gap-3">
        {/* Slider Track */}
        <div className="relative flex-1 h-2">
          {/* Background Track */}
          <div className="absolute inset-0 rounded-full bg-muted" />

          {/* Fill Track */}
          <div
            className={cn(
              'absolute inset-y-0 left-0 rounded-full transition-all',
              disabled ? 'bg-muted-foreground/30' : 'bg-primary'
            )}
            style={{ width: `${percentage}%` }}
          />

          {/* Input Range */}
          <input
            type="range"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={handleSliderChange}
            disabled={disabled}
            className={cn(
              'absolute inset-0 w-full opacity-0 cursor-pointer',
              disabled && 'cursor-not-allowed'
            )}
          />

          {/* Thumb */}
          <div
            className={cn(
              'absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 shadow-sm transition-all',
              disabled
                ? 'bg-muted border-muted-foreground/30'
                : 'bg-background border-primary hover:scale-110'
            )}
            style={{ left: `calc(${percentage}% - 8px)` }}
          />
        </div>

        {/* Editable Input */}
        <div className="flex items-center gap-1">
          {prefix && (
            <span className="text-sm text-muted-foreground">{prefix}</span>
          )}
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className={cn(
              'text-sm font-mono tabular-nums text-right',
              'bg-transparent border-b border-border',
              'focus:outline-none focus:border-primary',
              disabled && 'text-muted-foreground cursor-not-allowed'
            )}
            style={{ width: inputWidth }}
          />
          {suffix && (
            <span className="text-sm text-muted-foreground">{suffix}</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default Slider
