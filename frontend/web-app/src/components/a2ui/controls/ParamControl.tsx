'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import type { InsightParam, ParamValue } from '@/types/insight'
import { ParamSlider } from './ParamSlider'
import { HeatmapSlider } from './HeatmapSlider'

// =============================================================================
// Types
// =============================================================================

interface ParamControlProps {
  /** The parameter definition */
  param: InsightParam
  /** Current value */
  value?: ParamValue | undefined
  /** Called when value changes */
  onChange: (value: ParamValue) => void
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
// ParamControl Component
// =============================================================================

export function ParamControl({
  param,
  value,
  onChange,
  error,
  warning,
  disabled = false,
  className,
}: ParamControlProps) {
  // Use param.value as default if no value provided
  const currentValue = value ?? param.value

  // Determine control type and render
  switch (param.type) {
    case 'slider':
      return (
        <ParamSlider
          param={param}
          value={currentValue as number}
          onChange={onChange}
          error={error}
          warning={warning}
          disabled={disabled}
          className={className}
        />
      )

    case 'heatmap_slider':
      return (
        <HeatmapSlider
          param={param}
          value={currentValue as number}
          onChange={onChange}
          error={error}
          warning={warning}
          disabled={disabled}
          className={className}
        />
      )

    case 'number':
      return (
        <NumberControl
          param={param}
          value={currentValue as number}
          onChange={onChange}
          error={error}
          warning={warning}
          disabled={disabled}
          className={className}
        />
      )

    case 'toggle':
      return (
        <ToggleControl
          param={param}
          value={currentValue as boolean}
          onChange={onChange}
          error={error}
          warning={warning}
          disabled={disabled}
          className={className}
        />
      )

    case 'button_group':
      return (
        <ButtonGroupControl
          param={param}
          value={currentValue as string}
          onChange={onChange}
          error={error}
          warning={warning}
          disabled={disabled}
          className={className}
        />
      )

    case 'select':
      return (
        <SelectControl
          param={param}
          value={currentValue as string}
          onChange={onChange}
          error={error}
          warning={warning}
          disabled={disabled}
          className={className}
        />
      )

    default:
      return (
        <div className={cn('text-sm text-muted-foreground', className)}>
          不支持的控件类型: {param.type}
        </div>
      )
  }
}

// =============================================================================
// Number Control
// =============================================================================

interface NumberControlProps {
  param: InsightParam
  value: number
  onChange: (value: number) => void
  error?: string | undefined
  warning?: string | undefined
  disabled?: boolean | undefined
  className?: string | undefined
}

function NumberControl({
  param,
  value,
  onChange,
  error,
  warning,
  disabled,
  className,
}: NumberControlProps) {
  const { min, max, step = 1, unit = '', precision = 2 } = param.config
  const hasError = !!error
  const hasWarning = !!warning && !hasError

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value
    if (rawValue === '' || rawValue === '-') return

    let newValue = parseFloat(rawValue)
    if (isNaN(newValue)) return

    onChange(newValue)
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{param.label}</label>
        {param.description && (
          <span className="text-xs text-muted-foreground">{param.description}</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={precision !== undefined ? value.toFixed(precision) : value}
          onChange={handleChange}
          disabled={disabled}
          className={cn(
            'flex-1 h-9 px-3 rounded-md border bg-background text-sm',
            'focus:outline-none focus:ring-2 focus:ring-ring',
            hasError && 'border-red-500 focus:ring-red-500',
            hasWarning && 'border-yellow-500 focus:ring-yellow-500',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
        />
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>

      {(error || warning) && (
        <p className={cn('text-xs', error ? 'text-red-500' : 'text-yellow-600')}>
          {error || warning}
        </p>
      )}
    </div>
  )
}

// =============================================================================
// Toggle Control
// =============================================================================

interface ToggleControlProps {
  param: InsightParam
  value: boolean
  onChange: (value: boolean) => void
  error?: string | undefined
  warning?: string | undefined
  disabled?: boolean | undefined
  className?: string | undefined
}

function ToggleControl({
  param,
  value,
  onChange,
  error,
  warning,
  disabled,
  className,
}: ToggleControlProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium">{param.label}</label>
          {param.description && (
            <p className="text-xs text-muted-foreground">{param.description}</p>
          )}
        </div>

        <button
          onClick={() => onChange(!value)}
          disabled={disabled}
          className={cn(
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
            value ? 'bg-primary' : 'bg-muted',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
        >
          <span
            className={cn(
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm',
              value ? 'translate-x-6' : 'translate-x-1',
            )}
          />
        </button>
      </div>

      {(error || warning) && (
        <p className={cn('text-xs', error ? 'text-red-500' : 'text-yellow-600')}>
          {error || warning}
        </p>
      )}
    </div>
  )
}

// =============================================================================
// Button Group Control
// =============================================================================

interface ButtonGroupControlProps {
  param: InsightParam
  value: string
  onChange: (value: string) => void
  error?: string | undefined
  warning?: string | undefined
  disabled?: boolean | undefined
  className?: string | undefined
}

function ButtonGroupControl({
  param,
  value,
  onChange,
  error,
  warning,
  disabled,
  className,
}: ButtonGroupControlProps) {
  const options = param.config.options || []

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{param.label}</label>
        {param.description && (
          <span className="text-xs text-muted-foreground">{param.description}</span>
        )}
      </div>

      <div className="flex gap-1">
        {options.map(opt => (
          <button
            key={String(opt.value)}
            onClick={() => onChange(String(opt.value))}
            disabled={disabled}
            className={cn(
              'flex-1 px-3 py-2 text-sm rounded-md transition-colors',
              value === String(opt.value)
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80 text-foreground',
              disabled && 'opacity-50 cursor-not-allowed',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {(error || warning) && (
        <p className={cn('text-xs', error ? 'text-red-500' : 'text-yellow-600')}>
          {error || warning}
        </p>
      )}
    </div>
  )
}

// =============================================================================
// Select Control
// =============================================================================

interface SelectControlProps {
  param: InsightParam
  value: string
  onChange: (value: string) => void
  error?: string | undefined
  warning?: string | undefined
  disabled?: boolean | undefined
  className?: string | undefined
}

function SelectControl({
  param,
  value,
  onChange,
  error,
  warning,
  disabled,
  className,
}: SelectControlProps) {
  const options = param.config.options || []
  const hasError = !!error
  const hasWarning = !!warning && !hasError

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{param.label}</label>
        {param.description && (
          <span className="text-xs text-muted-foreground">{param.description}</span>
        )}
      </div>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          'w-full h-9 px-3 rounded-md border bg-background text-sm',
          'focus:outline-none focus:ring-2 focus:ring-ring',
          hasError && 'border-red-500 focus:ring-red-500',
          hasWarning && 'border-yellow-500 focus:ring-yellow-500',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        {options.map(opt => (
          <option key={String(opt.value)} value={String(opt.value)}>
            {opt.label}
          </option>
        ))}
      </select>

      {(error || warning) && (
        <p className={cn('text-xs', error ? 'text-red-500' : 'text-yellow-600')}>
          {error || warning}
        </p>
      )}
    </div>
  )
}

export default ParamControl
