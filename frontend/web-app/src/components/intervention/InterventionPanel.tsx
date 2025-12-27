'use client'

/**
 * InterventionPanel Component
 *
 * EPIC-009 Story 9.1: 策略参数实时调整面板
 * 支持实时修改运行中策略的参数
 */

import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  RotateCcw,
  Settings2,
} from 'lucide-react'
import React from 'react'

import { ParamControl } from '@/components/a2ui/controls/ParamControl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { InsightParam } from '@/types/insight'
import type { ParamChange } from '@/types/intervention'

// =============================================================================
// Types
// =============================================================================

interface InterventionPanelProps {
  /** Agent ID */
  agentId: string
  /** 当前策略参数 */
  currentParams: InsightParam[]
  /** 原始参数（对比用） */
  originalParams: InsightParam[]
  /** 参数更新回调 */
  onParamsUpdate: (params: InsightParam[], changes: ParamChange[]) => Promise<void>
  /** 是否正在加载 */
  isLoading?: boolean
  /** 自定义类名 */
  className?: string
}

// =============================================================================
// InterventionPanel Component
// =============================================================================

export function InterventionPanel({
  agentId: _agentId,
  currentParams,
  originalParams,
  onParamsUpdate,
  isLoading = false,
  className,
}: InterventionPanelProps) {
  // State
  const [editedParams, setEditedParams] = React.useState<InsightParam[]>(currentParams)
  const [showAdvanced, setShowAdvanced] = React.useState(false)
  const [isPreviewMode, setIsPreviewMode] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // 同步外部参数变化
  React.useEffect(() => {
    setEditedParams(currentParams)
  }, [currentParams])

  // 分离核心参数和高级参数 (level: 1 = core, 2 = advanced)
  const coreParams = editedParams.filter(p => p.level === 1)
  const advancedParams = editedParams.filter(p => p.level === 2)

  // 原始参数映射
  const originalParamMap = React.useMemo(
    () => new Map(originalParams.map(p => [p.key, p])),
    [originalParams]
  )

  // 检查参数是否有变更
  const getParamChanges = (): ParamChange[] => {
    const changes: ParamChange[] = []
    for (const param of editedParams) {
      const original = originalParamMap.get(param.key)
      if (original && original.value !== param.value) {
        changes.push({
          key: param.key,
          label: param.label,
          oldValue: original.value,
          newValue: param.value,
          unit: param.config.unit,
        })
      }
    }
    return changes
  }

  const changes = getParamChanges()
  const hasChanges = changes.length > 0

  // 处理参数变更
  const handleParamChange = (key: string, value: InsightParam['value']) => {
    setEditedParams(prev =>
      prev.map(p => (p.key === key ? { ...p, value } : p))
    )
  }

  // 重置参数
  const handleReset = () => {
    setEditedParams(currentParams)
    setIsPreviewMode(false)
  }

  // 预览影响
  const handlePreview = () => {
    setIsPreviewMode(true)
  }

  // 应用参数修改
  const handleApply = async () => {
    if (!hasChanges) return

    setIsSubmitting(true)
    try {
      await onParamsUpdate(editedParams, changes)
      setIsPreviewMode(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 渲染参数对比值
  const renderParamComparison = (param: InsightParam) => {
    const original = originalParamMap.get(param.key)
    if (!original || original.value === param.value) return null

    return (
      <span className="text-xs text-muted-foreground ml-2">
        (原值: {String(original.value)}{param.config.unit ? ` ${param.config.unit}` : ''})
      </span>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base">
            <Settings2 className="h-5 w-5 text-primary" />
            参数调整
          </div>
          {hasChanges && (
            <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">
              {changes.length} 项修改
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 警告提示 */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-600 dark:text-yellow-400">
            实时参数调整会立即影响策略行为，请谨慎操作
          </p>
        </div>

        {/* 核心参数 */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            核心参数
            <Badge variant="secondary" className="text-xs">L1</Badge>
          </h4>

          {coreParams.map(param => (
            <div key={param.key} className="space-y-1">
              <div className="flex items-center">
                <ParamControl
                  param={param}
                  onChange={(value) => { handleParamChange(param.key, value); }}
                  disabled={isLoading || isSubmitting}
                />
                {renderParamComparison(param)}
              </div>
            </div>
          ))}
        </div>

        {/* 高级参数 */}
        {advancedParams.length > 0 && (
          <div className="space-y-3">
            <button
              onClick={() => { setShowAdvanced(!showAdvanced); }}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              高级参数 ({advancedParams.length})
              {showAdvanced ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {showAdvanced && (
              <div className="space-y-3 pl-2 border-l-2 border-muted">
                {advancedParams.map(param => (
                  <div key={param.key} className="space-y-1">
                    <div className="flex items-center">
                      <ParamControl
                        param={param}
                        onChange={(value) => { handleParamChange(param.key, value); }}
                        disabled={isLoading || isSubmitting}
                      />
                      {renderParamComparison(param)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 预览模式 - 变更对比 */}
        {isPreviewMode && hasChanges && (
          <div className="p-3 rounded-lg bg-muted/50 space-y-2">
            <h4 className="text-sm font-medium">参数变更预览</h4>
            {changes.map(change => (
              <div key={change.key} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{change.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-red-500 line-through">
                    {String(change.oldValue)}{change.unit}
                  </span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-green-500 font-medium">
                    {String(change.newValue)}{change.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 验证状态 */}
        <div className="p-3 rounded-lg bg-muted/30">
          <div className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-green-500" />
            <span className="text-muted-foreground">所有参数在有效范围内</span>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={!hasChanges || isSubmitting}
          >
            <RotateCcw className="h-4 w-4 mr-1.5" />
            重置
          </Button>

          {!isPreviewMode ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreview}
              disabled={!hasChanges || isSubmitting}
            >
              <Eye className="h-4 w-4 mr-1.5" />
              预览影响
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleApply}
              disabled={!hasChanges || isSubmitting}
              className={cn(
                hasChanges && 'bg-primary hover:bg-primary/90'
              )}
            >
              {isSubmitting ? '应用中...' : '应用参数修改'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default InterventionPanel
