'use client'

import {
  Check,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Minus,
  RotateCcw,
  TrendingDown,
  TrendingUp,
  X,
  XCircle,
} from 'lucide-react'
import React from 'react'

import { ParamControl } from '@/components/a2ui/controls/ParamControl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useParamConstraints } from '@/hooks/useParamConstraints'
import { notify } from '@/lib/notification'
import { cn } from '@/lib/utils'
import type { ImpactMetric,InsightData, InsightParam } from '@/types/insight'

// =============================================================================
// CanvasPanel Props
// =============================================================================

interface CanvasPanelProps {
  /** The InsightData to display */
  insight: InsightData | null
  /** Whether the panel is open */
  isOpen: boolean
  /** Called when panel should close */
  onClose?: (() => void) | undefined
  /** Called when user approves the insight */
  onApprove?: ((insight: InsightData, params: InsightParam[]) => void) | undefined
  /** Called when user rejects the insight */
  onReject?: ((insight: InsightData) => void) | undefined
  /** Whether the panel is loading */
  isLoading?: boolean | undefined
}

// =============================================================================
// CanvasPanel Component - ChatGPT-style sliding sidebar
// =============================================================================

export function CanvasPanel({
  insight,
  isOpen,
  onClose,
  onApprove,
  onReject,
  isLoading = false,
}: CanvasPanelProps) {
  // Track edited params
  const [editedParams, setEditedParams] = React.useState<InsightParam[]>([])
  const [showAdvanced, setShowAdvanced] = React.useState(false)

  // Reset edited params when insight changes
  React.useEffect(() => {
    if (insight) {
      setEditedParams(insight.params)
    }
  }, [insight])

  // Separate core (L1) and advanced (L2) params
  const coreParams = React.useMemo(
    () => editedParams.filter((p) => p.level === 1),
    [editedParams]
  )
  const advancedParams = React.useMemo(
    () => editedParams.filter((p) => p.level === 2),
    [editedParams]
  )

  // Constraint validation
  const constraintValidation = useParamConstraints(editedParams)

  // Check if params have changed
  const hasChanges = React.useMemo(() => {
    if (!insight) return false
    return editedParams.some((p, i) => {
      const original = insight.params[i]
      return original && JSON.stringify(p.value) !== JSON.stringify(original.value)
    })
  }, [editedParams, insight])

  // Handle param value change
  const handleParamChange = React.useCallback(
    (key: string, value: unknown) => {
      const newParams = editedParams.map((p) =>
        p.key === key ? { ...p, value: value as InsightParam['value'] } : p
      )
      setEditedParams(newParams)
    },
    [editedParams]
  )

  // Reset to original values
  const handleReset = React.useCallback(() => {
    if (insight) {
      setEditedParams(insight.params)
    }
  }, [insight])

  // Handle approve with edited params (with constraint validation)
  const handleApprove = React.useCallback(() => {
    if (!insight) return

    // Check for constraint violations
    if (!constraintValidation.valid) {
      const errorMessages = constraintValidation.violations
        .filter(v => v.severity === 'error')
        .map(v => v.message)
        .join('; ')
      notify('error', '参数验证失败', {
        description: errorMessages || '请检查参数配置',
        source: 'CanvasPanel',
      })
      return
    }

    // Show warnings but allow proceed
    if (constraintValidation.hasWarnings) {
      const warningMessages = constraintValidation.violations
        .filter(v => v.severity === 'warning')
        .map(v => v.message)
        .join('; ')
      notify('warning', '参数存在警告', {
        description: warningMessages,
        source: 'CanvasPanel',
      })
    }

    onApprove?.(insight, editedParams)
  }, [insight, editedParams, onApprove, constraintValidation])

  // Handle reject
  const handleReject = React.useCallback(() => {
    if (insight) {
      onReject?.(insight)
    }
  }, [insight, onReject])

  // Handle modify and submit
  const handleModifyAndSubmit = React.useCallback(() => {
    if (insight) {
      onApprove?.(insight, editedParams)
    }
  }, [insight, editedParams, onApprove])

  // Close on escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => { window.removeEventListener('keydown', handleEscape); }
  }, [isOpen, onClose])

  if (!insight) {
    return null
  }

  // Get type label and variant
  const getTypeInfo = (type: InsightData['type']) => {
    switch (type) {
      case 'strategy_create':
        return { label: '新建策略', variant: 'default' as const }
      case 'strategy_modify':
        return { label: '策略调整', variant: 'secondary' as const }
      case 'batch_adjust':
        return { label: '批量调整', variant: 'outline' as const }
      case 'risk_alert':
        return { label: '风险警报', variant: 'destructive' as const }
      default:
        return { label: '未知', variant: 'outline' as const }
    }
  }

  const typeInfo = getTypeInfo(insight.type)

  return (
    <>
      {/* Backdrop for mobile */}
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
          'bg-card/80 backdrop-blur-sm border-l border-border shadow-2xl',
          'transform transition-transform duration-300 ease-out',
          'flex flex-col',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Proposal Canvas"
      >
        {/* Header: 策略名称 + 类型 Badge + 关闭按钮 */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Lightbulb className="h-5 w-5 text-primary" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">
                  {insight.target?.name || '策略提案'}
                </h2>
                <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>
              </div>
              {insight.target && (
                <p className="text-xs text-muted-foreground">
                  {insight.target.symbol}
                </p>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-4 space-y-6">
            {/* AI 解释区 */}
            <section className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                AI 策略逻辑
              </h3>
              <div className="p-3 bg-card/80 backdrop-blur-sm rounded-lg border border-border">
                <p className="text-sm leading-relaxed text-foreground">
                  {insight.explanation}
                </p>
              </div>
            </section>

            {/* 影响区: 4 宫格指标展示 */}
            {insight.impact && (
              <section className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  预期影响
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {insight.impact.metrics.slice(0, 4).map((metric) => (
                    <MetricCard key={metric.key} metric={metric} />
                  ))}
                </div>
                {/* Confidence indicator */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full transition-all duration-500',
                        insight.impact.confidence >= 0.8
                          ? 'bg-green-500'
                          : insight.impact.confidence >= 0.6
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                      )}
                      style={{ width: `${insight.impact.confidence * 100}%` }}
                    />
                  </div>
                  <span>
                    置信度 {Math.round(insight.impact.confidence * 100)}%
                  </span>
                </div>
              </section>
            )}

            {/* L1 参数区: 核心参数 */}
            <section className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                核心参数
              </h3>
              <div className="space-y-4">
                {coreParams.map((param) => (
                  <ParamControl
                    key={param.key}
                    param={param}
                    value={param.value}
                    onChange={(value) => { handleParamChange(param.key, value); }}
                    disabled={isLoading}
                  />
                ))}
              </div>
            </section>

            {/* L2 参数区: 高级参数 (折叠) */}
            {advancedParams.length > 0 && (
              <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                <section className="space-y-4">
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full">
                      {showAdvanced ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      高级参数 ({advancedParams.length})
                    </button>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="space-y-4 pl-4 border-l-2 border-muted">
                    {advancedParams.map((param) => (
                      <ParamControl
                        key={param.key}
                        param={param}
                        value={param.value}
                        onChange={(value) => { handleParamChange(param.key, value); }}
                        disabled={isLoading}
                      />
                    ))}
                  </CollapsibleContent>
                </section>
              </Collapsible>
            )}

            {/* 参数重置按钮 */}
            {hasChanges && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                disabled={isLoading}
                className="w-full"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                重置所有参数
              </Button>
            )}
          </div>
        </div>

        {/* 操作区: [拒绝] [修改后提交] [批准] 按钮 */}
        <footer className="flex items-center gap-3 px-4 py-3 border-t border-border bg-card/80 backdrop-blur-sm">
          <Button
            variant="outline"
            onClick={handleReject}
            disabled={isLoading}
            className="flex-1"
          >
            <XCircle className="h-4 w-4 mr-2" />
            拒绝
          </Button>

          {hasChanges ? (
            <Button
              onClick={handleModifyAndSubmit}
              disabled={isLoading}
              className="flex-[2] bg-primary hover:bg-primary/90"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  处理中...
                </span>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  修改后提交
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleApprove}
              disabled={isLoading}
              className="flex-[2] bg-primary hover:bg-primary/90"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  处理中...
                </span>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  批准
                </>
              )}
            </Button>
          )}
        </footer>
      </aside>
    </>
  )
}

// =============================================================================
// Sub Components
// =============================================================================

/**
 * MetricCard - 展示单个影响指标的卡片组件
 */
interface MetricCardProps {
  metric: ImpactMetric
}

function MetricCard({ metric }: MetricCardProps) {
  // 计算变化百分比
  const getChangePercent = (current: number, old?: number): string | null => {
    if (old === undefined || old === 0) return null
    const change = ((current - old) / Math.abs(old)) * 100
    return change > 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`
  }

  const changePercent = getChangePercent(metric.value, metric.old_value)

  // 趋势图标
  const TrendIcon =
    metric.trend === 'up'
      ? TrendingUp
      : metric.trend === 'down'
        ? TrendingDown
        : Minus

  return (
    <div
      className={cn(
        'p-3 rounded-lg border backdrop-blur-sm space-y-2 transition-colors',
        metric.trend === 'up' && 'bg-green-500/5 border-green-500/20',
        metric.trend === 'down' && 'bg-red-500/5 border-red-500/20',
        metric.trend === 'neutral' && 'bg-muted/50 border-border'
      )}
    >
      {/* 标签和趋势 */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{metric.label}</span>
        {metric.trend !== 'neutral' && (
          <TrendIcon
            className={cn(
              'h-3.5 w-3.5',
              metric.trend === 'up' ? 'text-green-500' : 'text-red-500'
            )}
          />
        )}
      </div>

      {/* 数值 */}
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            'text-xl font-bold',
            metric.trend === 'up' && 'text-green-500',
            metric.trend === 'down' && 'text-red-500',
            metric.trend === 'neutral' && 'text-foreground'
          )}
        >
          {metric.value}
          {metric.unit}
        </span>

        {/* 旧值 (删除线) */}
        {metric.old_value !== undefined && (
          <span className="text-sm text-muted-foreground line-through">
            {metric.old_value}
            {metric.unit}
          </span>
        )}
      </div>

      {/* 变化百分比 */}
      {changePercent && (
        <div className="text-xs font-medium">
          <span
            className={cn(
              metric.trend === 'up' ? 'text-green-500' : 'text-red-500'
            )}
          >
            {changePercent}
          </span>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Exports
// =============================================================================

export default CanvasPanel
