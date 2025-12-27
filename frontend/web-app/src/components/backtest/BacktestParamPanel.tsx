'use client'

import {
  ChevronDown,
  ChevronRight,
  Info,
  Play,
  RotateCcw,
  Settings,
} from 'lucide-react'
import React from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { BacktestParameter } from '@/types/insight'

// =============================================================================
// Types
// =============================================================================

interface BacktestParamPanelProps {
  parameters: BacktestParameter[]
  onChange: (key: string, value: number | string | boolean) => void
  onReset: () => void
  onRerun: () => void
  className?: string
  isRunning?: boolean
  /** Group parameters by their group property */
  grouped?: boolean
}

interface ParamInputProps {
  param: BacktestParameter
  onChange: (value: number | string | boolean) => void
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatValue(value: number | string | boolean, config: BacktestParameter['config']): string {
  if (typeof value === 'boolean') {
    return value ? '开启' : '关闭'
  }
  if (typeof value === 'string') {
    return value
  }
  if (config.unit) {
    return `${value}${config.unit}`
  }
  return value.toString()
}

function groupParameters(params: BacktestParameter[]): Record<string, BacktestParameter[]> {
  return params.reduce<Record<string, BacktestParameter[]>>((acc, param) => {
    const group = param.group || '通用设置'
    if (!acc[group]) {
      acc[group] = []
    }
    acc[group].push(param)
    return acc
  }, {})
}

// =============================================================================
// Slider Input
// =============================================================================

function SliderInput({ param, onChange }: ParamInputProps) {
  const value = param.value as number
  const { min = 0, max = 100, step = 1, unit } = param.config

  // Calculate percentage for gradient
  const percentage = ((value - min) / (max - min)) * 100

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-300">{param.label}</span>
        <span className="text-sm font-mono text-zinc-400">
          {value}{unit}
        </span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => { onChange(Number(e.target.value)); }}
          className="w-full h-2 rounded-full appearance-none cursor-pointer bg-zinc-700"
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percentage}%, #3f3f46 ${percentage}%, #3f3f46 100%)`,
          }}
        />
      </div>
      <div className="flex justify-between text-xs text-zinc-500">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  )
}

// =============================================================================
// Number Input
// =============================================================================

function NumberInput({ param, onChange }: ParamInputProps) {
  const value = param.value as number
  const { min, max, step = 1, unit } = param.config

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-300">{param.label}</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => { onChange(Number(e.target.value)); }}
          className={cn(
            'flex-1 px-3 py-2 rounded-lg',
            'bg-zinc-800 border border-zinc-700',
            'text-sm text-zinc-200 font-mono',
            'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500',
            'transition-all'
          )}
        />
        {unit && (
          <span className="text-sm text-zinc-500 min-w-[40px]">{unit}</span>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// Select Input
// =============================================================================

function SelectInput({ param, onChange }: ParamInputProps) {
  const value = param.value as string | number
  const { options = [] } = param.config

  return (
    <div className="space-y-2">
      <span className="text-sm text-zinc-300">{param.label}</span>
      <select
        value={value}
        onChange={(e) => { onChange(e.target.value); }}
        className={cn(
          'w-full px-3 py-2 rounded-lg',
          'bg-zinc-800 border border-zinc-700',
          'text-sm text-zinc-200',
          'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500',
          'transition-all cursor-pointer'
        )}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

// =============================================================================
// Toggle Input
// =============================================================================

function ToggleInput({ param, onChange }: ParamInputProps) {
  const value = param.value as boolean

  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex-1">
        <span className="text-sm text-zinc-300">{param.label}</span>
        {param.description && (
          <p className="text-xs text-zinc-500 mt-0.5">{param.description}</p>
        )}
      </div>
      <button
        onClick={() => { onChange(!value); }}
        className={cn(
          'relative w-11 h-6 rounded-full transition-colors',
          value ? 'bg-blue-500' : 'bg-zinc-700'
        )}
      >
        <span
          className={cn(
            'absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform',
            value && 'translate-x-5'
          )}
        />
      </button>
    </div>
  )
}

// =============================================================================
// Parameter Group
// =============================================================================

interface ParamGroupProps {
  title: string
  params: BacktestParameter[]
  onChange: (key: string, value: number | string | boolean) => void
  defaultExpanded?: boolean
}

function ParamGroup({ title, params, onChange, defaultExpanded = true }: ParamGroupProps) {
  const [expanded, setExpanded] = React.useState(defaultExpanded)

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <button
        onClick={() => { setExpanded(!expanded); }}
        className="w-full flex items-center justify-between px-4 py-3 bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
      >
        <span className="text-sm font-medium text-zinc-300">{title}</span>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-zinc-500" />
        ) : (
          <ChevronRight className="h-4 w-4 text-zinc-500" />
        )}
      </button>
      {expanded && (
        <div className="p-4 space-y-4 bg-zinc-900/50">
          {params.map((param) => (
            <ParamInput
              key={param.key}
              param={param}
              onChange={(value) => { onChange(param.key, value); }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Parameter Input Router
// =============================================================================

function ParamInput({ param, onChange }: ParamInputProps) {
  switch (param.type) {
    case 'slider':
      return <SliderInput param={param} onChange={onChange} />
    case 'number':
      return <NumberInput param={param} onChange={onChange} />
    case 'select':
      return <SelectInput param={param} onChange={onChange} />
    case 'toggle':
      return <ToggleInput param={param} onChange={onChange} />
    default:
      return null
  }
}

// =============================================================================
// Main Component
// =============================================================================

export function BacktestParamPanel({
  parameters,
  onChange,
  onReset,
  onRerun,
  className,
  isRunning = false,
  grouped = true,
}: BacktestParamPanelProps) {
  const [hasChanges, setHasChanges] = React.useState(false)

  // Track changes
  const handleChange = React.useCallback(
    (key: string, value: number | string | boolean) => {
      onChange(key, value)
      setHasChanges(true)
    },
    [onChange]
  )

  const handleReset = React.useCallback(() => {
    onReset()
    setHasChanges(false)
  }, [onReset])

  const handleRerun = React.useCallback(() => {
    onRerun()
    setHasChanges(false)
  }, [onRerun])

  // Group parameters if needed
  const groups = React.useMemo(() => {
    if (!grouped) {
      return { '参数设置': parameters }
    }
    return groupParameters(parameters)
  }, [parameters, grouped])

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-200">参数调节</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={isRunning}
            className="text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            重置
          </Button>
        </div>
      </div>

      {/* Parameters */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {Object.entries(groups).map(([groupName, params]) => (
          grouped ? (
            <ParamGroup
              key={groupName}
              title={groupName}
              params={params}
              onChange={handleChange}
            />
          ) : (
            <div key={groupName} className="space-y-4">
              {params.map((param) => (
                <ParamInput
                  key={param.key}
                  param={param}
                  onChange={(value) => { handleChange(param.key, value); }}
                />
              ))}
            </div>
          )
        ))}

        {/* Info notice */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-300">
            调整参数后点击「重新回测」按钮查看新的回测结果。参数变化会影响策略表现。
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-zinc-800">
        <Button
          onClick={handleRerun}
          disabled={isRunning || !hasChanges}
          className="w-full"
        >
          {isRunning ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              回测中...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              重新回测
            </>
          )}
        </Button>
        {hasChanges && !isRunning && (
          <p className="text-xs text-center text-yellow-400 mt-2">
            参数已修改，点击按钮重新运行回测
          </p>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// Compact Parameter Display
// =============================================================================

interface CompactParamDisplayProps {
  parameters: BacktestParameter[]
  className?: string
}

export function CompactParamDisplay({ parameters, className }: CompactParamDisplayProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {parameters.slice(0, 5).map((param) => (
        <div
          key={param.key}
          className="px-2 py-1 rounded bg-zinc-800 text-xs"
        >
          <span className="text-zinc-500">{param.label}: </span>
          <span className="text-zinc-300 font-mono">
            {formatValue(param.value, param.config)}
          </span>
        </div>
      ))}
      {parameters.length > 5 && (
        <div className="px-2 py-1 rounded bg-zinc-800 text-xs text-zinc-500">
          +{parameters.length - 5} 更多
        </div>
      )}
    </div>
  )
}

export default BacktestParamPanel
