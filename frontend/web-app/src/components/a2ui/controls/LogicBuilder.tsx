'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import type {
  InsightParam,
  LogicCondition,
  LogicConnector,
  ComparisonOperator,
} from '@/types/insight'
import { X, Plus, GripVertical } from 'lucide-react'

// =============================================================================
// Types
// =============================================================================

export interface LogicBuilderProps {
  /** The parameter definition */
  param: InsightParam
  /** Current conditions */
  value: LogicCondition[]
  /** Called when conditions change */
  onChange: (conditions: LogicCondition[]) => void
  /** Logic connector (AND/OR) */
  connector?: LogicConnector
  /** Called when connector changes */
  onConnectorChange?: (connector: LogicConnector) => void
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
// Constants
// =============================================================================

const INDICATORS = [
  { value: 'price', label: '价格' },
  { value: 'rsi', label: 'RSI' },
  { value: 'macd', label: 'MACD' },
  { value: 'ma', label: '均线' },
  { value: 'volume', label: '成交量' },
  { value: 'atr', label: 'ATR' },
  { value: 'bollinger', label: '布林带' },
]

const OPERATORS: { value: ComparisonOperator; label: string; symbol: string }[] = [
  { value: '>', label: '大于', symbol: '>' },
  { value: '<', label: '小于', symbol: '<' },
  { value: '>=', label: '大于等于', symbol: '≥' },
  { value: '<=', label: '小于等于', symbol: '≤' },
  { value: '==', label: '等于', symbol: '=' },
  { value: '!=', label: '不等于', symbol: '≠' },
  { value: 'crosses_above', label: '上穿', symbol: '↗' },
  { value: 'crosses_below', label: '下穿', symbol: '↘' },
]

// =============================================================================
// ConditionCard Sub-component
// =============================================================================

interface ConditionCardProps {
  condition: LogicCondition
  index: number
  total: number
  connector: LogicConnector
  onUpdate: (id: string, updates: Partial<LogicCondition>) => void
  onRemove: (id: string) => void
  disabled?: boolean
  hasError?: boolean
  hasWarning?: boolean
}

function ConditionCard({
  condition,
  index,
  total,
  connector,
  onUpdate,
  onRemove,
  disabled = false,
  hasError = false,
  hasWarning = false,
}: ConditionCardProps) {

  return (
    <div className="relative">
      {/* Condition Card */}
      <div
        className={cn(
          'relative flex items-center gap-3 p-4 rounded-lg border bg-card',
          'transition-all duration-200',
          hasError && 'border-red-500',
          hasWarning && 'border-yellow-500',
          !hasError && !hasWarning && 'border-border hover:border-[hsl(var(--rb-cyan))]/50',
          disabled && 'opacity-50',
        )}
      >
        {/* Drag Handle */}
        <button
          type="button"
          className={cn(
            'cursor-move text-muted-foreground hover:text-foreground',
            'transition-colors',
            disabled && 'cursor-not-allowed opacity-50',
          )}
          disabled={disabled}
          aria-label="拖拽排序"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* Indicator Select */}
        <select
          value={condition.indicator}
          onChange={(e) => onUpdate(condition.id, { indicator: e.target.value })}
          disabled={disabled}
          className={cn(
            'flex-1 h-9 px-3 rounded-md border bg-background text-sm',
            'focus:outline-none focus:ring-2 focus:ring-ring',
            'transition-colors',
            disabled && 'cursor-not-allowed opacity-50',
          )}
        >
          <option value="">选择指标</option>
          {INDICATORS.map((ind) => (
            <option key={ind.value} value={ind.value}>
              {ind.label}
            </option>
          ))}
        </select>

        {/* Operator Select */}
        <select
          value={condition.operator}
          onChange={(e) =>
            onUpdate(condition.id, { operator: e.target.value as ComparisonOperator })
          }
          disabled={disabled}
          className={cn(
            'w-32 h-9 px-3 rounded-md border bg-background text-sm',
            'focus:outline-none focus:ring-2 focus:ring-ring',
            'transition-colors',
            disabled && 'cursor-not-allowed opacity-50',
          )}
        >
          {OPERATORS.map((op) => (
            <option key={op.value} value={op.value}>
              {op.symbol} {op.label}
            </option>
          ))}
        </select>

        {/* Value Input */}
        <input
          type="number"
          value={condition.value}
          onChange={(e) => {
            const val = e.target.value
            onUpdate(condition.id, {
              value: val === '' ? 0 : parseFloat(val),
            })
          }}
          disabled={disabled}
          placeholder="阈值"
          className={cn(
            'w-24 h-9 px-3 rounded-md border bg-background text-sm text-right',
            'focus:outline-none focus:ring-2 focus:ring-ring',
            'transition-colors',
            disabled && 'cursor-not-allowed opacity-50',
          )}
        />

        {/* Remove Button */}
        <button
          type="button"
          onClick={() => onRemove(condition.id)}
          disabled={disabled || total === 1}
          className={cn(
            'p-1.5 rounded-md text-muted-foreground',
            'hover:bg-destructive/10 hover:text-destructive',
            'transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-ring',
            (disabled || total === 1) && 'opacity-30 cursor-not-allowed',
          )}
          aria-label="删除条件"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Connector Badge (between conditions) */}
      {index < total - 1 && (
        <div className="flex justify-center my-2">
          <div
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium',
              'bg-[hsl(var(--rb-cyan))]/10 text-[hsl(var(--rb-cyan))]',
              'border border-[hsl(var(--rb-cyan))]/30',
            )}
          >
            {connector}
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// LogicBuilder Component
// =============================================================================

export function LogicBuilder({
  param,
  value,
  onChange,
  connector = 'AND',
  onConnectorChange,
  error,
  warning,
  disabled = false,
  className,
}: LogicBuilderProps) {
  // Determine state colors
  const hasError = !!error
  const hasWarning = !!warning && !hasError

  // Generate unique ID for new conditions
  const generateId = () => `cond_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

  // Add new condition
  const handleAddCondition = () => {
    const newCondition: LogicCondition = {
      id: generateId(),
      indicator: '',
      operator: '>',
      value: 0,
    }
    onChange([...value, newCondition])
  }

  // Update condition
  const handleUpdateCondition = (id: string, updates: Partial<LogicCondition>) => {
    onChange(
      value.map((cond) =>
        cond.id === id ? { ...cond, ...updates } : cond,
      ),
    )
  }

  // Remove condition
  const handleRemoveCondition = (id: string) => {
    if (value.length === 1) return // Don't remove the last condition
    onChange(value.filter((cond) => cond.id !== id))
  }

  // Toggle connector
  const handleToggleConnector = () => {
    if (onConnectorChange) {
      onConnectorChange(connector === 'AND' ? 'OR' : 'AND')
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <label className="text-sm font-medium text-foreground">
            {param.label}
          </label>
          {param.description && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {param.description}
            </p>
          )}
        </div>

        {/* Connector Toggle (only show if multiple conditions) */}
        {value.length > 1 && onConnectorChange && (
          <button
            type="button"
            onClick={handleToggleConnector}
            disabled={disabled}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium',
              'border transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-ring',
              connector === 'AND'
                ? 'bg-[hsl(var(--rb-green))]/10 text-[hsl(var(--rb-green))] border-[hsl(var(--rb-green))]/30'
                : 'bg-[hsl(var(--rb-cyan))]/10 text-[hsl(var(--rb-cyan))] border-[hsl(var(--rb-cyan))]/30',
              'hover:opacity-80',
              disabled && 'opacity-50 cursor-not-allowed',
            )}
          >
            {connector === 'AND' ? '并且 (AND)' : '或者 (OR)'}
          </button>
        )}
      </div>

      {/* Conditions List */}
      <div className="space-y-0">
        {value.map((condition, index) => (
          <ConditionCard
            key={condition.id}
            condition={condition}
            index={index}
            total={value.length}
            connector={connector}
            onUpdate={handleUpdateCondition}
            onRemove={handleRemoveCondition}
            disabled={disabled}
            hasError={hasError}
            hasWarning={hasWarning}
          />
        ))}
      </div>

      {/* Add Condition Button */}
      <button
        type="button"
        onClick={handleAddCondition}
        disabled={disabled}
        className={cn(
          'w-full h-10 flex items-center justify-center gap-2',
          'rounded-lg border-2 border-dashed',
          'text-sm font-medium transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-ring',
          !disabled && [
            'border-muted-foreground/30 text-muted-foreground',
            'hover:border-[hsl(var(--rb-cyan))]/50 hover:text-[hsl(var(--rb-cyan))]',
            'hover:bg-[hsl(var(--rb-cyan))]/5',
          ],
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <Plus className="w-4 h-4" />
        <span>添加条件</span>
      </button>

      {/* Error/Warning Message */}
      {(error || warning) && (
        <p
          className={cn(
            'text-xs',
            error ? 'text-red-500' : 'text-yellow-600',
          )}
        >
          {error || warning}
        </p>
      )}

      {/* Summary */}
      {value.length > 0 && !hasError && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50 text-xs text-muted-foreground">
          <span className="font-medium">逻辑:</span>
          <div className="flex-1">
            {value.map((cond, idx) => {
              const indicator = INDICATORS.find((i) => i.value === cond.indicator)
              const operator = OPERATORS.find((o) => o.value === cond.operator)
              return (
                <span key={cond.id}>
                  {indicator?.label || cond.indicator || '?'}{' '}
                  {operator?.symbol || cond.operator} {cond.value}
                  {idx < value.length - 1 && (
                    <span className="mx-1 font-semibold text-[hsl(var(--rb-cyan))]">
                      {connector}
                    </span>
                  )}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Old Value Indicator */}
      {Array.isArray(param.old_value) &&
        param.old_value.length > 0 &&
        JSON.stringify(param.old_value) !== JSON.stringify(value) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>原值:</span>
            <span className="line-through">
              {param.old_value.length} 个条件
            </span>
          </div>
        )}
    </div>
  )
}

export default LogicBuilder
