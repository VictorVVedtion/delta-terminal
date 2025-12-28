/**
 * SchemaParamRenderer
 *
 * 基于 Schema 的参数渲染器，提供：
 * - 参数分组显示
 * - 计算字段标识
 * - 高级参数折叠
 * - 验证错误/警告显示
 */

'use client'

import React, { useMemo, useCallback, useState } from 'react'
import { ChevronDown, ChevronUp, Calculator, Lock, AlertCircle, AlertTriangle } from 'lucide-react'

import { ParamControl } from '@/components/a2ui/controls/ParamControl'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { evaluateCondition } from '@/lib/schema'
import type { InsightParam, ParamValue } from '@/types/insight'
import type { ParamGroup, ParamSchemaField, PARAM_GROUP_CONFIG } from '@/types/strategy-schema'

// =============================================================================
// Types
// =============================================================================

interface SchemaParamRendererProps {
  /** 参数列表 */
  params: InsightParam[]
  /** Schema 字段定义（用于分组和计算字段标识） */
  schemaFields?: ParamSchemaField[]
  /** 参数值变化回调 */
  onParamChange: (key: string, value: ParamValue) => void
  /** 验证错误 */
  errors?: Map<string, string>
  /** 验证警告 */
  warnings?: Map<string, string>
  /** 是否禁用 */
  disabled?: boolean
  /** 是否显示高级参数 */
  showAdvanced?: boolean
  /** 切换高级参数显示 */
  onToggleAdvanced?: () => void
  /** 自定义类名 */
  className?: string
}

// =============================================================================
// 分组配置
// =============================================================================

const GROUP_CONFIG: Record<ParamGroup, { label: string; icon: string; order: number }> = {
  basic: { label: '基础设置', icon: 'Settings', order: 1 },
  entry: { label: '入场条件', icon: 'TrendingUp', order: 2 },
  exit: { label: '出场条件', icon: 'TrendingDown', order: 3 },
  risk: { label: '风险管理', icon: 'Shield', order: 4 },
  advanced: { label: '高级设置', icon: 'Wrench', order: 5 },
}

// =============================================================================
// Component
// =============================================================================

export function SchemaParamRenderer({
  params,
  schemaFields,
  onParamChange,
  errors = new Map(),
  warnings = new Map(),
  disabled = false,
  showAdvanced: controlledShowAdvanced,
  onToggleAdvanced,
  className,
}: SchemaParamRendererProps) {
  // 内部状态（如果未受控）
  const [internalShowAdvanced, setInternalShowAdvanced] = useState(false)
  const showAdvanced = controlledShowAdvanced ?? internalShowAdvanced
  const toggleAdvanced = onToggleAdvanced ?? (() => setInternalShowAdvanced(prev => !prev))

  // 创建 Schema 字段映射
  const schemaFieldMap = useMemo(() => {
    if (!schemaFields) return new Map<string, ParamSchemaField>()
    return new Map(schemaFields.map(f => [f.key, f]))
  }, [schemaFields])

  // 当前参数值映射（用于条件显示判断）
  const paramValues = useMemo(() => {
    const values: Record<string, ParamValue> = {}
    for (const param of params) {
      values[param.key] = param.value
    }
    return values
  }, [params])

  // 过滤条件显示的参数
  const visibleParams = useMemo(() => {
    return params.filter(param => {
      const field = schemaFieldMap.get(param.key)
      if (field?.showWhen) {
        return evaluateCondition(field.showWhen, paramValues)
      }
      return true
    })
  }, [params, schemaFieldMap, paramValues])

  // 按组和级别分组参数
  const groupedParams = useMemo(() => {
    const groups = new Map<string, InsightParam[]>()

    // 分离核心参数和高级参数
    const coreParams = visibleParams.filter(p => p.level === 1)
    const advParams = visibleParams.filter(p => p.level === 2)

    // 核心参数按组分组
    for (const param of coreParams) {
      const field = schemaFieldMap.get(param.key)
      const groupKey = field?.group || 'basic'

      if (!groups.has(groupKey)) {
        groups.set(groupKey, [])
      }
      groups.get(groupKey)!.push(param)
    }

    // 高级参数单独分组
    if (advParams.length > 0) {
      groups.set('_advanced', advParams)
    }

    // 按组排序
    const sortedGroups = Array.from(groups.entries()).sort((a, b) => {
      if (a[0] === '_advanced') return 1
      if (b[0] === '_advanced') return -1
      const orderA = GROUP_CONFIG[a[0] as ParamGroup]?.order ?? 99
      const orderB = GROUP_CONFIG[b[0] as ParamGroup]?.order ?? 99
      return orderA - orderB
    })

    return sortedGroups
  }, [visibleParams, schemaFieldMap])

  // 渲染单个参数
  const renderParam = useCallback((param: InsightParam) => {
    const field = schemaFieldMap.get(param.key)
    const isComputed = field?.computed ?? false
    const isReadonly = field?.readonly ?? param.disabled
    const error = errors.get(param.key)
    const warning = warnings.get(param.key)

    return (
      <div key={param.key} className="relative group">
        {/* 计算字段标识 */}
        {isComputed && (
          <Badge
            variant="outline"
            className="absolute -top-2 right-0 text-[10px] px-1.5 py-0 bg-background z-10 gap-0.5"
          >
            <Calculator className="h-2.5 w-2.5" />
            <span>自动计算</span>
          </Badge>
        )}

        {/* 参数控件 */}
        <div className={cn(
          "transition-all",
          isComputed && "opacity-80"
        )}>
          <ParamControl
            param={param}
            value={param.value}
            onChange={(value) => onParamChange(param.key, value)}
            disabled={disabled || isReadonly}
          />
        </div>

        {/* 验证错误 */}
        {error && (
          <div className="mt-1 flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="h-3 w-3" />
            <span>{error}</span>
          </div>
        )}

        {/* 验证警告 */}
        {warning && !error && (
          <div className="mt-1 flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-500">
            <AlertTriangle className="h-3 w-3" />
            <span>{warning}</span>
          </div>
        )}

        {/* 计算字段依赖提示 */}
        {isComputed && field?.dependsOn && field.dependsOn.length > 0 && (
          <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-muted-foreground/60">公式:</span>
            <code className="px-1 py-0.5 bg-muted rounded text-[9px]">
              {field.formula}
            </code>
          </div>
        )}
      </div>
    )
  }, [schemaFieldMap, onParamChange, errors, warnings, disabled])

  // 计算高级参数数量
  const advancedParamCount = useMemo(() => {
    return visibleParams.filter(p => p.level === 2).length
  }, [visibleParams])

  return (
    <div className={cn('space-y-6', className)}>
      {groupedParams.map(([groupKey, groupParams]) => {
        // 高级参数折叠区
        if (groupKey === '_advanced') {
          return (
            <Collapsible
              key={groupKey}
              open={showAdvanced}
              onOpenChange={toggleAdvanced}
            >
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full group">
                  <div className="flex items-center gap-1.5">
                    {showAdvanced ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    <span>高级参数</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {advancedParamCount}
                  </Badge>
                  {!showAdvanced && (
                    <span className="text-xs text-muted-foreground/60 ml-auto">
                      点击展开
                    </span>
                  )}
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent className="mt-4 space-y-4 pl-4 border-l-2 border-muted">
                {groupParams.map(renderParam)}
              </CollapsibleContent>
            </Collapsible>
          )
        }

        // 普通参数组
        const config = GROUP_CONFIG[groupKey as ParamGroup]
        const hasComputedFields = groupParams.some(p => schemaFieldMap.get(p.key)?.computed)

        return (
          <section key={groupKey} className="space-y-4">
            {config && (
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  {config.label}
                </h3>
                {hasComputedFields && (
                  <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                    <Calculator className="h-3 w-3" />
                    含自动计算
                  </span>
                )}
              </div>
            )}
            <div className="space-y-4">
              {groupParams.map(renderParam)}
            </div>
          </section>
        )
      })}

      {/* 空状态 */}
      {groupedParams.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Lock className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>暂无可配置的参数</p>
        </div>
      )}
    </div>
  )
}

export default SchemaParamRenderer
