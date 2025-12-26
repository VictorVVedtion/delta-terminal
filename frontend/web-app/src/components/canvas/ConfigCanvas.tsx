'use client'

/**
 * ConfigCanvas Component
 * V3 Design Document: S23 - Runtime Configuration Panel
 *
 * Features:
 * - Live adjustment of strategy parameters while running
 * - Real-time risk settings modification
 * - Execution settings control (order size, timing)
 * - Parameter presets and templates
 * - Diff view between current and proposed changes
 */

import React from 'react'
import {
  X,
  Settings,
  Save,
  RotateCcw,
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Sliders,
  ShieldAlert,
  Clock,
  DollarSign,
  Percent,
  Zap,
  History,
  Copy,
  Download,
  Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { notify } from '@/lib/notification'
import type { InsightParam, ParamValue } from '@/types/insight'

// =============================================================================
// Type Definitions
// =============================================================================

export type ConfigCategory = 'strategy' | 'risk' | 'execution' | 'timing'

export interface ConfigGroup {
  id: string
  label: string
  category: ConfigCategory
  description?: string
  params: InsightParam[]
}

export interface ConfigPreset {
  id: string
  name: string
  description?: string
  values: Record<string, ParamValue>
  createdAt: number
  isDefault?: boolean
}

export interface ConfigChange {
  paramKey: string
  label: string
  oldValue: ParamValue
  newValue: ParamValue
  timestamp: number
}

export interface ConfigCanvasProps {
  /** Strategy ID */
  strategyId: string
  /** Strategy name for display */
  strategyName: string
  /** Panel open state */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** Apply configuration changes */
  onApply?: (params: InsightParam[]) => Promise<void>
  /** Save as preset */
  onSavePreset?: (name: string, values: Record<string, ParamValue>) => void
  /** Configuration groups */
  configGroups: ConfigGroup[]
  /** Available presets */
  presets?: ConfigPreset[]
  /** Change history */
  changeHistory?: ConfigChange[]
  /** Current strategy status */
  status?: 'running' | 'paused' | 'stopped'
  /** Loading state */
  isLoading?: boolean
  /** Apply immediately or require confirmation */
  requireConfirmation?: boolean
}

// =============================================================================
// Category Configuration
// =============================================================================

const CATEGORY_CONFIG: Record<
  ConfigCategory,
  {
    label: string
    icon: typeof Settings
    color: string
    bgColor: string
  }
> = {
  strategy: {
    label: '策略参数',
    icon: Sliders,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  risk: {
    label: '风险控制',
    icon: ShieldAlert,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  execution: {
    label: '执行设置',
    icon: Zap,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  timing: {
    label: '时间设置',
    icon: Clock,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
}

// =============================================================================
// ConfigCanvas Component
// =============================================================================

export function ConfigCanvas({
  strategyId,
  strategyName,
  isOpen,
  onClose,
  onApply,
  onSavePreset,
  configGroups,
  presets = [],
  changeHistory = [],
  status = 'running',
  isLoading = false,
  requireConfirmation = true,
}: ConfigCanvasProps) {
  // Local state for editing params
  const [editedParams, setEditedParams] = React.useState<Map<string, ParamValue>>(new Map())
  const [expandedCategories, setExpandedCategories] = React.useState<Set<ConfigCategory>>(
    new Set(['strategy', 'risk'])
  )
  const [showChangeConfirm, setShowChangeConfirm] = React.useState(false)
  const [showPresetModal, setShowPresetModal] = React.useState(false)
  const [presetName, setPresetName] = React.useState('')
  const [showHistory, setShowHistory] = React.useState(false)
  const [isApplying, setIsApplying] = React.useState(false)

  // Initialize edited params from config groups
  React.useEffect(() => {
    const initial = new Map<string, ParamValue>()
    configGroups.forEach(group => {
      group.params.forEach(param => {
        initial.set(param.key, param.value)
      })
    })
    setEditedParams(initial)
  }, [configGroups])

  // Close on escape
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Get all params with edited values
  const getAllParams = React.useCallback((): InsightParam[] => {
    return configGroups.flatMap(group =>
      group.params.map(param => ({
        ...param,
        value: editedParams.get(param.key) ?? param.value,
      }))
    )
  }, [configGroups, editedParams])

  // Check if there are changes
  const hasChanges = React.useMemo(() => {
    return configGroups.some(group =>
      group.params.some(param => {
        const edited = editedParams.get(param.key)
        return edited !== undefined && JSON.stringify(edited) !== JSON.stringify(param.value)
      })
    )
  }, [configGroups, editedParams])

  // Get list of changes
  const pendingChanges = React.useMemo((): ConfigChange[] => {
    const changes: ConfigChange[] = []
    configGroups.forEach(group => {
      group.params.forEach(param => {
        const edited = editedParams.get(param.key)
        if (edited !== undefined && JSON.stringify(edited) !== JSON.stringify(param.value)) {
          changes.push({
            paramKey: param.key,
            label: param.label,
            oldValue: param.value,
            newValue: edited,
            timestamp: Date.now(),
          })
        }
      })
    })
    return changes
  }, [configGroups, editedParams])

  // Handle param value change
  const handleParamChange = React.useCallback((key: string, value: ParamValue) => {
    setEditedParams(prev => {
      const next = new Map(prev)
      next.set(key, value)
      return next
    })
  }, [])

  // Reset to original values
  const handleReset = React.useCallback(() => {
    const original = new Map<string, ParamValue>()
    configGroups.forEach(group => {
      group.params.forEach(param => {
        original.set(param.key, param.value)
      })
    })
    setEditedParams(original)
    notify('info', '已重置所有参数', {
      description: '参数已恢复到原始值',
      source: 'ConfigCanvas',
    })
  }, [configGroups])

  // Apply changes
  const handleApply = React.useCallback(async () => {
    if (!onApply) return

    if (requireConfirmation && !showChangeConfirm) {
      setShowChangeConfirm(true)
      return
    }

    setIsApplying(true)
    try {
      await onApply(getAllParams())
      notify('success', '配置已更新', {
        description: `${pendingChanges.length} 个参数已生效`,
        source: 'ConfigCanvas',
      })
      setShowChangeConfirm(false)
    } catch (error) {
      notify('error', '配置更新失败', {
        description: error instanceof Error ? error.message : '请稍后重试',
        source: 'ConfigCanvas',
      })
    } finally {
      setIsApplying(false)
    }
  }, [onApply, requireConfirmation, showChangeConfirm, getAllParams, pendingChanges.length])

  // Save as preset
  const handleSavePreset = React.useCallback(() => {
    if (!onSavePreset || !presetName.trim()) return

    const values: Record<string, ParamValue> = {}
    editedParams.forEach((value, key) => {
      values[key] = value
    })

    onSavePreset(presetName.trim(), values)
    setShowPresetModal(false)
    setPresetName('')

    notify('success', '预设已保存', {
      description: `预设 "${presetName}" 已保存`,
      source: 'ConfigCanvas',
    })
  }, [onSavePreset, presetName, editedParams])

  // Apply preset
  const handleApplyPreset = React.useCallback((preset: ConfigPreset) => {
    const newParams = new Map(editedParams)
    Object.entries(preset.values).forEach(([key, value]) => {
      newParams.set(key, value)
    })
    setEditedParams(newParams)

    notify('info', '预设已加载', {
      description: `已应用预设 "${preset.name}"`,
      source: 'ConfigCanvas',
    })
  }, [editedParams])

  // Toggle category expansion
  const toggleCategory = (category: ConfigCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  // Group params by category
  const groupedByCategory = React.useMemo(() => {
    const grouped = new Map<ConfigCategory, ConfigGroup[]>()
    configGroups.forEach(group => {
      const existing = grouped.get(group.category) || []
      grouped.set(group.category, [...existing, group])
    })
    return grouped
  }, [configGroups])

  // Format value for display
  const formatValue = (value: ParamValue, param: InsightParam): string => {
    if (typeof value === 'boolean') return value ? '开启' : '关闭'
    if (typeof value === 'number') {
      const unit = param.config.unit || ''
      return `${value}${unit}`
    }
    if (Array.isArray(value)) return `[${value.length} 项]`
    return String(value)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden',
          'transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sliding Panel */}
      <aside
        className={cn(
          'fixed top-0 right-0 z-40 h-full w-full sm:w-[520px]',
          'bg-card/95 backdrop-blur-lg border-l border-border shadow-2xl',
          'transform transition-transform duration-300 ease-out',
          'flex flex-col',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Config Canvas"
      >
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Settings className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">运行时配置</h2>
                <Badge
                  variant={
                    status === 'running'
                      ? 'success'
                      : status === 'paused'
                      ? 'warning'
                      : 'destructive'
                  }
                >
                  {status === 'running' ? '运行中' : status === 'paused' ? '已暂停' : '已停止'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{strategyName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* History toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowHistory(!showHistory)}
              className={cn(showHistory && 'bg-muted')}
            >
              <History className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Change Confirmation Banner */}
        {showChangeConfirm && (
          <div className="px-4 py-3 bg-yellow-500/10 border-b border-yellow-500/30">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">确认应用以下更改？</p>
                <p className="text-xs text-muted-foreground mt-1">
                  策略正在运行，更改将立即生效
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowChangeConfirm(false)}
                className="flex-1"
              >
                取消
              </Button>
              <Button
                size="sm"
                onClick={handleApply}
                disabled={isApplying}
                className="flex-1"
              >
                {isApplying ? (
                  <span className="flex items-center gap-1">
                    <span className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    应用中...
                  </span>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    确认应用
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Pending Changes Summary */}
        {hasChanges && !showChangeConfirm && (
          <div className="px-4 py-2 bg-blue-500/10 border-b border-blue-500/30">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-400">
                {pendingChanges.length} 个参数待应用
              </span>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <RotateCcw className="h-3 w-3 mr-1" />
                重置
              </Button>
            </div>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {/* History Panel */}
          {showHistory && changeHistory.length > 0 && (
            <div className="p-4 border-b border-border bg-muted/30">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <History className="h-4 w-4" />
                变更历史
              </h3>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {changeHistory.slice(0, 10).map((change, idx) => (
                  <div key={idx} className="text-xs p-2 bg-card rounded border border-border">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{change.label}</span>
                      <span className="text-muted-foreground">
                        {new Date(change.timestamp).toLocaleTimeString('zh-CN')}
                      </span>
                    </div>
                    <div className="mt-1 text-muted-foreground">
                      <span className="line-through">{String(change.oldValue)}</span>
                      <span className="mx-2">→</span>
                      <span className="text-foreground">{String(change.newValue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Presets Section */}
          {presets.length > 0 && (
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Copy className="h-4 w-4" />
                快速预设
              </h3>
              <div className="flex flex-wrap gap-2">
                {presets.map(preset => (
                  <Button
                    key={preset.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleApplyPreset(preset)}
                    className="text-xs"
                  >
                    {preset.name}
                    {preset.isDefault && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        默认
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Config Categories */}
          <div className="p-4 space-y-4">
            {Array.from(groupedByCategory.entries()).map(([category, groups]) => {
              const config = CATEGORY_CONFIG[category]
              const CategoryIcon = config.icon
              const isExpanded = expandedCategories.has(category)

              return (
                <section key={category} className="space-y-3">
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(category)}
                    className={cn(
                      'w-full flex items-center justify-between p-3 rounded-lg',
                      'transition-colors hover:bg-muted/50',
                      config.bgColor
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <CategoryIcon className={cn('h-4 w-4', config.color)} />
                      <span className="font-medium">{config.label}</span>
                      <Badge variant="outline" className="text-xs">
                        {groups.reduce((acc, g) => acc + g.params.length, 0)}
                      </Badge>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>

                  {/* Category Content */}
                  {isExpanded && (
                    <div className="space-y-4 pl-2">
                      {groups.map(group => (
                        <div key={group.id} className="space-y-3">
                          {group.description && (
                            <p className="text-xs text-muted-foreground">{group.description}</p>
                          )}
                          <div className="space-y-4">
                            {group.params.map(param => {
                              const edited = editedParams.get(param.key)
                              const currentValue = edited ?? param.value
                              const hasChange =
                                JSON.stringify(currentValue) !== JSON.stringify(param.value)

                              return (
                                <ConfigParamControl
                                  key={param.key}
                                  param={param}
                                  value={currentValue}
                                  originalValue={param.value}
                                  onChange={value => handleParamChange(param.key, value)}
                                  hasChange={hasChange}
                                  disabled={isLoading || isApplying}
                                />
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <footer className="px-4 py-3 border-t border-border bg-card/80 backdrop-blur-sm space-y-3">
          {/* Pending Changes List */}
          {pendingChanges.length > 0 && !showChangeConfirm && (
            <div className="p-3 bg-muted/50 rounded-lg space-y-2 max-h-[120px] overflow-y-auto">
              {pendingChanges.map(change => (
                <div key={change.paramKey} className="flex items-center justify-between text-xs">
                  <span className="font-medium">{change.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground line-through">
                      {formatValue(change.oldValue, configGroups.flatMap(g => g.params).find(p => p.key === change.paramKey)!)}
                    </span>
                    <span>→</span>
                    <span className="text-primary font-medium">
                      {formatValue(change.newValue, configGroups.flatMap(g => g.params).find(p => p.key === change.paramKey)!)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPresetModal(true)}
              disabled={isLoading || isApplying}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              保存预设
            </Button>
            <Button
              onClick={handleApply}
              disabled={!hasChanges || isLoading || isApplying}
              className="flex-1"
            >
              {isApplying ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  应用中...
                </span>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  应用更改 {hasChanges && `(${pendingChanges.length})`}
                </>
              )}
            </Button>
          </div>
        </footer>
      </aside>

      {/* Save Preset Modal */}
      {showPresetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowPresetModal(false)}
          />
          <div className="relative bg-card border border-border rounded-xl p-6 w-[400px] shadow-2xl">
            <h3 className="text-lg font-semibold mb-4">保存配置预设</h3>
            <input
              type="text"
              value={presetName}
              onChange={e => setPresetName(e.target.value)}
              placeholder="输入预设名称..."
              className="w-full h-10 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setShowPresetModal(false)}
                className="flex-1"
              >
                取消
              </Button>
              <Button
                onClick={handleSavePreset}
                disabled={!presetName.trim()}
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                保存
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// =============================================================================
// Sub Components
// =============================================================================

interface ConfigParamControlProps {
  param: InsightParam
  value: ParamValue
  originalValue: ParamValue
  onChange: (value: ParamValue) => void
  hasChange: boolean
  disabled?: boolean
}

function ConfigParamControl({
  param,
  value,
  originalValue,
  onChange,
  hasChange,
  disabled,
}: ConfigParamControlProps) {
  return (
    <div
      className={cn(
        'p-3 rounded-lg border transition-all',
        hasChange ? 'bg-blue-500/5 border-blue-500/30' : 'bg-card/50 border-border'
      )}
    >
      {/* Label and description */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">{param.label}</label>
          {hasChange && (
            <Badge variant="outline" className="text-xs text-blue-400 border-blue-400/30">
              已修改
            </Badge>
          )}
        </div>
        {param.description && (
          <span className="text-xs text-muted-foreground">{param.description}</span>
        )}
      </div>

      {/* Control based on type */}
      {param.type === 'slider' && (
        <SliderControl param={param} value={value as number} onChange={onChange} {...(disabled ? { disabled } : {})} />
      )}

      {param.type === 'number' && (
        <NumberControl param={param} value={value as number} onChange={onChange} {...(disabled ? { disabled } : {})} />
      )}

      {param.type === 'select' && (
        <SelectControl param={param} value={value as string} onChange={onChange} {...(disabled ? { disabled } : {})} />
      )}

      {param.type === 'toggle' && (
        <ToggleControl value={value as boolean} onChange={onChange} {...(disabled ? { disabled } : {})} />
      )}

      {param.type === 'button_group' && (
        <ButtonGroupControl
          param={param}
          value={value as string}
          onChange={onChange}
          {...(disabled ? { disabled } : {})}
        />
      )}

      {/* Show original value if changed */}
      {hasChange && (
        <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">原始值:</span>
          <span className="text-muted-foreground">
            {typeof originalValue === 'boolean'
              ? originalValue
                ? '开启'
                : '关闭'
              : `${originalValue}${param.config.unit || ''}`}
          </span>
        </div>
      )}
    </div>
  )
}

function SliderControl({
  param,
  value,
  onChange,
  disabled,
}: {
  param: InsightParam
  value: number
  onChange: (v: ParamValue) => void
  disabled?: boolean
}) {
  const { min = 0, max = 100, step = 1, unit = '' } = param.config

  return (
    <div className="space-y-2">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        disabled={disabled}
        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer disabled:opacity-50 accent-primary"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          {min}
          {unit}
        </span>
        <span className="font-medium text-foreground">
          {value}
          {unit}
        </span>
        <span>
          {max}
          {unit}
        </span>
      </div>
    </div>
  )
}

function NumberControl({
  param,
  value,
  onChange,
  disabled,
}: {
  param: InsightParam
  value: number
  onChange: (v: ParamValue) => void
  disabled?: boolean
}) {
  const { min, max, step = 1, unit = '' } = param.config

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        disabled={disabled}
        className="flex-1 h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
      />
      {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
    </div>
  )
}

function SelectControl({
  param,
  value,
  onChange,
  disabled,
}: {
  param: InsightParam
  value: string
  onChange: (v: ParamValue) => void
  disabled?: boolean
}) {
  const options = param.config.options || []

  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
    >
      {options.map(opt => (
        <option key={String(opt.value)} value={String(opt.value)}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

function ToggleControl({
  value,
  onChange,
  disabled,
}: {
  value: boolean
  onChange: (v: ParamValue) => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
        value ? 'bg-primary' : 'bg-muted',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
          value ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  )
}

function ButtonGroupControl({
  param,
  value,
  onChange,
  disabled,
}: {
  param: InsightParam
  value: string
  onChange: (v: ParamValue) => void
  disabled?: boolean
}) {
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
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// =============================================================================
// Exports
// =============================================================================

export default ConfigCanvas
