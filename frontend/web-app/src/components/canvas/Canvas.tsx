'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  X,
  Check,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Settings,
  BarChart3,
  Activity,
  Eye,
  TrendingUp,
  AlertCircle,
  AlertTriangle,
  Plus,
  Trash2,
  Rocket,
} from 'lucide-react'
import type {
  InsightData,
  InsightParam,
  InsightImpact,
  CanvasMode,
  ParamValue,
  LogicCondition,
  LogicConnector,
  ComparisonOperator,
} from '@/types/insight'
import { cn } from '@/lib/utils'
import { useParamValidation } from '@/hooks/useParamValidation'

// =============================================================================
// Canvas Props
// =============================================================================

interface CanvasProps {
  /** The InsightData to display */
  insight: InsightData
  /** Current canvas mode */
  mode?: CanvasMode | undefined
  /** Called when user closes the canvas */
  onClose?: (() => void) | undefined
  /** Called when user approves the insight */
  onApprove?: ((params: InsightParam[]) => void) | undefined
  /** Called when user rejects the insight */
  onReject?: (() => void) | undefined
  /** Called when params change */
  onParamsChange?: ((params: InsightParam[]) => void) | undefined
  /** Whether the canvas is loading */
  isLoading?: boolean | undefined
  /** Display variant: 'standalone' for modal/card, 'embedded' for sidebar */
  variant?: 'standalone' | 'embedded' | undefined
}

// =============================================================================
// Canvas Component
// =============================================================================

export function Canvas({
  insight,
  mode = 'proposal',
  onClose,
  onApprove,
  onReject,
  onParamsChange,
  isLoading = false,
  variant = 'standalone',
}: CanvasProps) {
  // Local state for editable params
  const [params, setParams] = React.useState<InsightParam[]>(insight.params)
  const [showAdvanced, setShowAdvanced] = React.useState(false)

  // Create values map for validation
  const valuesMap = React.useMemo(() => {
    const map = new Map<string, ParamValue>()
    params.forEach(p => map.set(p.key, p.value))
    return map
  }, [params])

  // Param validation
  const { getError, getWarning, isValid } = useParamValidation({
    params,
    values: valuesMap,
    validateOnChange: true,
  })

  // Reset params when insight changes
  React.useEffect(() => {
    setParams(insight.params)
  }, [insight.params])

  // Separate core and advanced params
  const coreParams = params.filter(p => p.level === 1)
  const advancedParams = params.filter(p => p.level === 2)

  // Handle param value change
  const handleParamChange = React.useCallback((key: string, value: unknown) => {
    const newParams = params.map(p =>
      p.key === key ? { ...p, value: value as InsightParam['value'] } : p
    )
    setParams(newParams)
    onParamsChange?.(newParams)
  }, [params, onParamsChange])

  // Reset to original values
  const handleReset = React.useCallback(() => {
    setParams(insight.params)
    onParamsChange?.(insight.params)
  }, [insight.params, onParamsChange])

  // Check if params have changed
  const hasChanges = React.useMemo(() => {
    return params.some((p, i) => {
      const original = insight.params[i]
      return original && JSON.stringify(p.value) !== JSON.stringify(original.value)
    })
  }, [params, insight.params])

  const modeInfo = getCanvasModeInfo(mode)

  // Embedded variant: simplified content for sidebar use
  if (variant === 'embedded') {
    return (
      <div className="p-4 space-y-6">
        {/* AI Explanation */}
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">AI 分析</h3>
          <p className="text-sm leading-relaxed">{insight.explanation}</p>
        </section>

        {/* Impact Metrics */}
        {insight.impact && (
          <ImpactSection impact={insight.impact} />
        )}

        {/* Core Parameters */}
        <section className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            核心参数
          </h3>
          <div className="space-y-4">
            {coreParams.map(param => (
              <ParamControl
                key={param.key}
                param={param}
                onChange={(value) => handleParamChange(param.key, value)}
                disabled={isLoading}
                error={getError(param.key)}
                warning={getWarning(param.key)}
              />
            ))}
          </div>
        </section>

        {/* Advanced Parameters (Collapsible) */}
        {advancedParams.length > 0 && (
          <section className="space-y-4">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {showAdvanced ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              高级参数 ({advancedParams.length})
            </button>

            {showAdvanced && (
              <div className="space-y-4 pl-4 border-l-2 border-muted">
                {advancedParams.map(param => (
                  <ParamControl
                    key={param.key}
                    param={param}
                    onChange={(value) => handleParamChange(param.key, value)}
                    disabled={isLoading}
                    error={getError(param.key)}
                    warning={getWarning(param.key)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Validation Summary */}
        {!isValid && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>请修正参数错误后再批准执行</span>
            </div>
          </div>
        )}

        {/* Reset button if params changed */}
        {hasChanges && (
          <Button variant="ghost" size="sm" onClick={handleReset} className="w-full">
            <RotateCcw className="h-4 w-4 mr-2" />
            重置参数
          </Button>
        )}
      </div>
    )
  }

  // Standalone variant: full card with header and footer
  return (
    <Card className="w-full max-w-2xl mx-auto">
      {/* Header */}
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', modeInfo.bgColor)}>
              {modeInfo.icon}
            </div>
            <div>
              <CardTitle className="text-lg">{modeInfo.title}</CardTitle>
              {insight.target && (
                <p className="text-sm text-muted-foreground">
                  {insight.target.symbol} - {insight.target.name}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {insight.impact && (
              <ConfidenceBadge confidence={insight.impact.confidence} />
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* AI Explanation */}
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">AI 分析</h3>
          <p className="text-sm">{insight.explanation}</p>
        </section>

        {/* Impact Metrics */}
        {insight.impact && (
          <ImpactSection impact={insight.impact} />
        )}

        {/* Core Parameters */}
        <section className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            核心参数
          </h3>
          <div className="space-y-4">
            {coreParams.map(param => (
              <ParamControl
                key={param.key}
                param={param}
                onChange={(value) => handleParamChange(param.key, value)}
                disabled={isLoading}
                error={getError(param.key)}
                warning={getWarning(param.key)}
              />
            ))}
          </div>
        </section>

        {/* Advanced Parameters (Collapsible) */}
        {advancedParams.length > 0 && (
          <section className="space-y-4">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {showAdvanced ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              高级参数 ({advancedParams.length})
            </button>

            {showAdvanced && (
              <div className="space-y-4 pl-4 border-l-2 border-muted">
                {advancedParams.map(param => (
                  <ParamControl
                    key={param.key}
                    param={param}
                    onChange={(value) => handleParamChange(param.key, value)}
                    disabled={isLoading}
                    error={getError(param.key)}
                    warning={getWarning(param.key)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Validation Summary */}
        {!isValid && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>请修正参数错误后再批准执行</span>
            </div>
          </div>
        )}
      </CardContent>

      {/* Footer Actions */}
      <CardFooter className="border-t p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button variant="ghost" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-1" />
              重置
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={onReject}
            disabled={isLoading}
          >
            拒绝
          </Button>
          <Button
            onClick={() => onApprove?.(params)}
            disabled={isLoading || !isValid}
            title={!isValid ? '请先修正参数错误' : undefined}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                处理中...
              </span>
            ) : (
              <>
                <Check className="h-4 w-4 mr-1" />
                批准执行
              </>
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}

// =============================================================================
// Sub Components
// =============================================================================

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const percent = Math.round(confidence * 100)
  const variant = confidence >= 0.8
    ? 'success'
    : confidence >= 0.6
      ? 'warning'
      : 'destructive'

  return (
    <Badge variant={variant as 'success' | 'warning' | 'destructive'}>
      {percent}% 置信度
    </Badge>
  )
}

// Impact metric icons and colors
const IMPACT_METRIC_ICONS: Record<string, string> = {
  expectedReturn: '📈',
  annualizedReturn: '📊',
  winRate: '🎯',
  maxDrawdown: '📉',
  sharpeRatio: '⚡',
  profitFactor: '💰',
  totalTrades: '🔄',
  avgTradeDuration: '⏱️',
  avgProfit: '✅',
  avgLoss: '❌',
}

function ImpactSection({ impact }: { impact: InsightImpact }) {
  // Calculate change percentage
  const getChangePercent = (current: number, old?: number): string | null => {
    if (old === undefined || old === 0) return null
    const change = ((current - old) / Math.abs(old)) * 100
    return change > 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">📊</span>
          <h3 className="text-sm font-medium text-muted-foreground">预期影响</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            置信度 {Math.round(impact.confidence * 100)}%
          </Badge>
          <span className="text-xs text-muted-foreground">
            基于 {impact.sample_size} 天数据
          </span>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-500',
            impact.confidence >= 0.8 ? 'bg-green-500' :
            impact.confidence >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
          )}
          style={{ width: `${impact.confidence * 100}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {impact.metrics.map(metric => {
          const changePercent = getChangePercent(metric.value, metric.old_value)
          const icon = IMPACT_METRIC_ICONS[metric.key] || '📋'

          return (
            <div
              key={metric.key}
              className={cn(
                'p-3 rounded-lg border space-y-2 transition-colors',
                metric.trend === 'up' && 'bg-green-500/5 border-green-500/20',
                metric.trend === 'down' && 'bg-red-500/5 border-red-500/20',
                metric.trend === 'neutral' && 'bg-muted/50 border-border'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{icon}</span>
                  <span className="text-xs text-muted-foreground">{metric.label}</span>
                </div>
                {metric.trend !== 'neutral' && (
                  <span className={cn(
                    'text-xs px-1.5 py-0.5 rounded',
                    metric.trend === 'up' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                  )}>
                    {metric.trend === 'up' ? '↑' : '↓'}
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-2">
                <span className={cn(
                  'text-xl font-bold',
                  metric.trend === 'up' && 'text-green-500',
                  metric.trend === 'down' && 'text-red-500',
                )}>
                  {metric.value}{metric.unit}
                </span>
                {metric.old_value !== undefined && (
                  <span className="text-sm text-muted-foreground line-through">
                    {metric.old_value}{metric.unit}
                  </span>
                )}
                {changePercent && (
                  <span className={cn(
                    'text-xs font-medium',
                    metric.trend === 'up' ? 'text-green-500' : 'text-red-500'
                  )}>
                    {changePercent}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

interface ParamControlProps {
  param: InsightParam
  onChange: (value: unknown) => void
  disabled?: boolean | undefined
  error?: string | undefined
  warning?: string | undefined
}

function ParamControl({ param, onChange, disabled, error, warning }: ParamControlProps) {
  const hasError = !!error
  const hasWarning = !!warning && !hasError

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className={cn(
          'text-sm font-medium',
          hasError && 'text-destructive',
          hasWarning && 'text-yellow-500'
        )}>
          {param.label}
        </label>
        {param.description && !error && !warning && (
          <span className="text-xs text-muted-foreground">{param.description}</span>
        )}
      </div>

      {/* Render different controls based on param type */}
      {param.type === 'slider' && (
        <SliderControl param={param} onChange={onChange} disabled={disabled} hasError={hasError} />
      )}

      {param.type === 'heatmap_slider' && (
        <HeatmapSliderControl param={param} onChange={onChange} disabled={disabled} />
      )}

      {param.type === 'number' && (
        <NumberControl param={param} onChange={onChange} disabled={disabled} hasError={hasError} />
      )}

      {param.type === 'select' && (
        <SelectControl param={param} onChange={onChange} disabled={disabled} hasError={hasError} />
      )}

      {param.type === 'toggle' && (
        <ToggleControl param={param} onChange={onChange} disabled={disabled} />
      )}

      {param.type === 'button_group' && (
        <ButtonGroupControl param={param} onChange={onChange} disabled={disabled} />
      )}

      {param.type === 'logic_builder' && (
        <LogicBuilderControl param={param} onChange={onChange} disabled={disabled} />
      )}

      {/* Error/Warning Message */}
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          <span>{error}</span>
        </div>
      )}
      {warning && !error && (
        <div className="flex items-center gap-1.5 text-xs text-yellow-500">
          <AlertTriangle className="h-3 w-3" />
          <span>{warning}</span>
        </div>
      )}
    </div>
  )
}

interface ControlProps extends ParamControlProps {
  hasError?: boolean
}

function SliderControl({ param, onChange, disabled, hasError }: ControlProps) {
  const value = param.value as number
  const { min = 0, max = 100, step = 1, unit = '' } = param.config

  return (
    <div className="space-y-2">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className={cn(
          'w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer disabled:opacity-50',
          hasError ? 'accent-destructive' : 'accent-primary'
        )}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{min}{unit}</span>
        <span className={cn(
          'font-medium',
          hasError ? 'text-destructive' : 'text-foreground'
        )}>{value}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  )
}

function HeatmapSliderControl({ param, onChange, disabled }: ControlProps) {
  const value = param.value as number
  const { min = 0, max = 100, step = 1, unit = '', heatmap_zones = [] } = param.config

  // Calculate position percentage
  const percentage = ((value - min) / (max - min)) * 100

  // Find current zone
  const currentZone = heatmap_zones.find(z => value >= z.start && value <= z.end)
  const zoneColor = currentZone?.color || 'gray'

  const colorMap: Record<string, string> = {
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    blue: 'bg-blue-500',
    gray: 'bg-muted-foreground',
  }

  return (
    <div className="space-y-3">
      {/* Heatmap background */}
      <div className="relative h-3 rounded-full overflow-hidden">
        <div className="absolute inset-0 flex">
          {heatmap_zones.map((zone, i) => {
            const width = ((zone.end - zone.start) / (max - min)) * 100
            const left = ((zone.start - min) / (max - min)) * 100
            return (
              <div
                key={i}
                className={cn('absolute h-full', colorMap[zone.color])}
                style={{ left: `${left}%`, width: `${width}%` }}
              />
            )
          })}
        </div>
        {/* Slider thumb indicator */}
        <div
          className="absolute top-0 w-1 h-full bg-white shadow-lg rounded-full"
          style={{ left: `${percentage}%`, transform: 'translateX(-50%)' }}
        />
      </div>

      {/* Actual slider (invisible) */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="w-full h-2 opacity-0 absolute cursor-pointer"
        style={{ marginTop: '-20px' }}
      />

      {/* Zone labels */}
      <div className="flex justify-between text-xs">
        {heatmap_zones.map((zone, i) => (
          <span
            key={i}
            className={cn(
              'px-1.5 py-0.5 rounded text-white',
              colorMap[zone.color],
              currentZone?.label === zone.label && 'ring-2 ring-white/50'
            )}
          >
            {zone.label}
          </span>
        ))}
      </div>

      {/* Current value */}
      <div className="flex justify-between items-center text-xs">
        <span className="text-muted-foreground">{min}{unit}</span>
        <span className={cn('font-medium px-2 py-1 rounded', colorMap[zoneColor], 'text-white')}>
          {value}{unit}
        </span>
        <span className="text-muted-foreground">{max}{unit}</span>
      </div>
    </div>
  )
}

function NumberControl({ param, onChange, disabled, hasError }: ControlProps) {
  const value = param.value as number
  const { min, max, step = 1, unit = '' } = param.config

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className={cn(
          'flex-1 h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 disabled:opacity-50',
          hasError
            ? 'border-destructive focus:ring-destructive/50'
            : 'focus:ring-ring'
        )}
      />
      {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
    </div>
  )
}

function SelectControl({ param, onChange, disabled, hasError }: ControlProps) {
  const value = param.value as string
  const options = param.config.options || []

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={cn(
        'w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 disabled:opacity-50',
        hasError
          ? 'border-destructive focus:ring-destructive/50'
          : 'focus:ring-ring'
      )}
    >
      {options.map(opt => (
        <option key={String(opt.value)} value={String(opt.value)}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

function ToggleControl({ param, onChange, disabled }: ParamControlProps) {
  const value = param.value as boolean

  return (
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
          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
          value ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  )
}

function ButtonGroupControl({ param, onChange, disabled }: ParamControlProps) {
  const value = param.value as string
  const options = param.config.options || []

  return (
    <div className="flex gap-1">
      {options.map(opt => (
        <button
          key={String(opt.value)}
          onClick={() => onChange(opt.value)}
          disabled={disabled}
          className={cn(
            'flex-1 px-3 py-2 text-sm rounded-md transition-colors',
            value === opt.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// =============================================================================
// Logic Builder Control - Complex multi-condition builder
// =============================================================================

const OPERATORS: { value: ComparisonOperator; label: string }[] = [
  { value: '>', label: '>' },
  { value: '<', label: '<' },
  { value: '>=', label: '≥' },
  { value: '<=', label: '≤' },
  { value: '==', label: '=' },
  { value: '!=', label: '≠' },
  { value: 'crosses_above', label: '上穿' },
  { value: 'crosses_below', label: '下穿' },
]

const INDICATORS = [
  { value: 'price', label: '价格' },
  { value: 'rsi', label: 'RSI' },
  { value: 'macd', label: 'MACD' },
  { value: 'ma', label: '均线' },
  { value: 'volume', label: '成交量' },
  { value: 'bb_upper', label: '布林上轨' },
  { value: 'bb_lower', label: '布林下轨' },
  { value: 'atr', label: 'ATR' },
]

function LogicBuilderControl({ param, onChange, disabled }: ControlProps) {
  const conditions = (param.value as LogicCondition[]) || []
  const [connector, setConnector] = React.useState<LogicConnector>('AND')

  // Generate unique ID
  const generateId = () => `cond_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

  // Add new condition
  const handleAddCondition = () => {
    const newCondition: LogicCondition = {
      id: generateId(),
      indicator: 'rsi',
      operator: '>',
      value: 70,
    }
    onChange([...conditions, newCondition])
  }

  // Remove condition
  const handleRemoveCondition = (id: string) => {
    onChange(conditions.filter(c => c.id !== id))
  }

  // Update condition
  const handleUpdateCondition = (id: string, updates: Partial<LogicCondition>) => {
    onChange(conditions.map(c => c.id === id ? { ...c, ...updates } : c))
  }

  return (
    <div className="space-y-3">
      {/* Connector selector */}
      {conditions.length > 1 && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-muted-foreground">条件关系:</span>
          <div className="flex gap-1">
            <button
              onClick={() => setConnector('AND')}
              disabled={disabled}
              className={cn(
                'px-2 py-1 text-xs rounded transition-colors',
                connector === 'AND'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              )}
            >
              且 (AND)
            </button>
            <button
              onClick={() => setConnector('OR')}
              disabled={disabled}
              className={cn(
                'px-2 py-1 text-xs rounded transition-colors',
                connector === 'OR'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              )}
            >
              或 (OR)
            </button>
          </div>
        </div>
      )}

      {/* Conditions list */}
      <div className="space-y-2">
        {conditions.map((condition, index) => (
          <div key={condition.id}>
            {/* Connector label between conditions */}
            {index > 0 && (
              <div className="flex items-center justify-center my-1">
                <span className="text-xs px-2 py-0.5 bg-muted rounded text-muted-foreground">
                  {connector === 'AND' ? '且' : '或'}
                </span>
              </div>
            )}

            {/* Condition row */}
            <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
              {/* Indicator select */}
              <select
                value={condition.indicator}
                onChange={(e) => handleUpdateCondition(condition.id, { indicator: e.target.value })}
                disabled={disabled}
                className="flex-1 h-8 px-2 text-xs rounded border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {INDICATORS.map(ind => (
                  <option key={ind.value} value={ind.value}>{ind.label}</option>
                ))}
              </select>

              {/* Operator select */}
              <select
                value={condition.operator}
                onChange={(e) => handleUpdateCondition(condition.id, { operator: e.target.value as ComparisonOperator })}
                disabled={disabled}
                className="w-16 h-8 px-2 text-xs rounded border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {OPERATORS.map(op => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>

              {/* Value input */}
              <input
                type="number"
                value={typeof condition.value === 'number' ? condition.value : 0}
                onChange={(e) => handleUpdateCondition(condition.id, { value: Number(e.target.value) })}
                disabled={disabled}
                className="w-20 h-8 px-2 text-xs rounded border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />

              {/* Remove button */}
              <button
                onClick={() => handleRemoveCondition(condition.id)}
                disabled={disabled || conditions.length <= 1}
                className={cn(
                  'p-1.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors',
                  (disabled || conditions.length <= 1) && 'opacity-50 cursor-not-allowed'
                )}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add condition button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleAddCondition}
        disabled={disabled}
        className="w-full"
      >
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        添加条件
      </Button>

      {/* Summary */}
      {conditions.length > 0 && (
        <div className="text-xs text-muted-foreground p-2 bg-muted/20 rounded">
          当{' '}
          {conditions.map((c, i) => (
            <React.Fragment key={c.id}>
              {i > 0 && <span className="text-primary font-medium"> {connector === 'AND' ? '且' : '或'} </span>}
              <span className="font-medium text-foreground">
                {INDICATORS.find(ind => ind.value === c.indicator)?.label || c.indicator}
              </span>
              {' '}
              <span className="text-primary">{OPERATORS.find(op => op.value === c.operator)?.label || c.operator}</span>
              {' '}
              <span className="font-medium text-foreground">{c.value}</span>
            </React.Fragment>
          ))}
          {' '}时触发
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Helper Functions
// =============================================================================

function getCanvasModeInfo(mode: CanvasMode) {
  const modeMap = {
    proposal: {
      title: '策略提案',
      icon: <Lightbulb className="h-5 w-5 text-primary" />,
      bgColor: 'bg-primary/10',
    },
    backtest: {
      title: '回测报告',
      icon: <BarChart3 className="h-5 w-5 text-blue-500" />,
      bgColor: 'bg-blue-500/10',
    },
    explorer: {
      title: '参数探索',
      icon: <TrendingUp className="h-5 w-5 text-purple-500" />,
      bgColor: 'bg-purple-500/10',
    },
    monitor: {
      title: '实时监控',
      icon: <Activity className="h-5 w-5 text-green-500" />,
      bgColor: 'bg-green-500/10',
    },
    config: {
      title: '完整配置',
      icon: <Settings className="h-5 w-5 text-orange-500" />,
      bgColor: 'bg-orange-500/10',
    },
    detail: {
      title: '详情查看',
      icon: <Eye className="h-5 w-5 text-cyan-500" />,
      bgColor: 'bg-cyan-500/10',
    },
    deploy: {
      title: '策略部署',
      icon: <Rocket className="h-5 w-5 text-[hsl(var(--rb-cyan))]" />,
      bgColor: 'bg-[hsl(var(--rb-cyan))]/10',
    },
  }

  return modeMap[mode] || modeMap.proposal
}

// =============================================================================
// Exports
// =============================================================================

export default Canvas
