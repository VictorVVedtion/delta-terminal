/**
 * useSchemaParams Hook
 *
 * 管理基于 Schema 的策略参数，提供：
 * - 参数值状态管理
 * - 计算字段自动更新
 * - 验证结果
 * - 与 InsightParam 格式兼容
 */

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { schemaRegistry, computeAllDerivedFields } from '@/lib/schema'
import { useParamConstraints } from './useParamConstraints'
import type { InsightParam, ParamValue } from '@/types/insight'
import type {
  AIParamValues,
  ComputeContext,
  ParamSchemaField,
  ParamValidationResult,
  StrategyType,
} from '@/types/strategy-schema'

// =============================================================================
// Types
// =============================================================================

export interface UseSchemaParamsOptions {
  /** 策略类型 */
  strategyType: StrategyType
  /** AI 返回的初始值 */
  initialValues?: AIParamValues
  /** 初始参数（InsightParam 格式） */
  initialParams?: InsightParam[]
  /** 计算上下文（市场数据等） */
  computeContext?: ComputeContext
  /** 值变化回调 */
  onValuesChange?: (values: Record<string, ParamValue>) => void
}

export interface UseSchemaParamsReturn {
  /** 解析后的参数列表（兼容 InsightParam） */
  params: InsightParam[]
  /** Schema 字段定义 */
  schemaFields: ParamSchemaField[]
  /** 当前值映射 */
  values: Record<string, ParamValue>
  /** 更新单个参数值 */
  updateParam: (key: string, value: ParamValue) => void
  /** 批量更新参数值 */
  updateParams: (updates: Record<string, ParamValue>) => void
  /** 重置为默认值 */
  resetToDefaults: () => void
  /** 验证结果 */
  validation: ParamValidationResult
  /** 是否有未保存的更改 */
  hasChanges: boolean
  /** Schema 不存在时的错误 */
  schemaError: string | undefined
  /** 策略类型 */
  strategyType: StrategyType
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useSchemaParams({
  strategyType,
  initialValues,
  initialParams,
  computeContext = {},
  onValuesChange,
}: UseSchemaParamsOptions): UseSchemaParamsReturn {
  // 获取 Schema
  const schema = useMemo(
    () => schemaRegistry.get(strategyType),
    [strategyType]
  )

  // 初始化值状态
  const [values, setValues] = useState<Record<string, ParamValue>>(() => {
    if (!schema) return {}

    // 优先使用 initialParams
    if (initialParams && initialParams.length > 0) {
      const merged: Record<string, ParamValue> = {}
      for (const param of initialParams) {
        merged[param.key] = param.value
      }
      return computeAllDerivedFields(schema.fields, merged, computeContext)
    }

    // 合并 AI 值和默认值
    const merged: Record<string, ParamValue> = {}
    for (const field of schema.fields) {
      if (!field.computed) {
        merged[field.key] = initialValues?.values[field.key] ?? field.defaultValue
      }
    }

    // 计算派生字段
    return computeAllDerivedFields(schema.fields, merged, computeContext)
  })

  // 原始值（用于检测变化）
  const [originalValues, setOriginalValues] = useState(values)

  // Schema 字段列表
  const schemaFields = useMemo(
    () => schema?.fields ?? [],
    [schema]
  )

  // 生成 InsightParam 数组
  const params = useMemo<InsightParam[]>(() => {
    if (!schema) return []

    return schema.fields.map(field => {
      const param: InsightParam = {
        key: field.key,
        label: field.label,
        type: field.type,
        value: values[field.key] ?? field.defaultValue,
        level: field.level,
        config: field.config,
      }
      if (field.constraints) {
        param.constraints = field.constraints
      }
      if (field.description) {
        param.description = field.description
      }
      if (field.readonly || field.computed) {
        param.disabled = true
      }
      return param
    })
  }, [schema, values])

  // 约束验证
  const constraintValidation = useParamConstraints(params)

  // 更新单个参数
  const updateParam = useCallback((key: string, value: ParamValue) => {
    if (!schema) return

    setValues(prev => {
      const updated = { ...prev, [key]: value }
      // 重新计算派生字段
      return computeAllDerivedFields(schema.fields, updated, computeContext)
    })
  }, [schema, computeContext])

  // 批量更新参数
  const updateParams = useCallback((updates: Record<string, ParamValue>) => {
    if (!schema) return

    setValues(prev => {
      const updated = { ...prev, ...updates }
      return computeAllDerivedFields(schema.fields, updated, computeContext)
    })
  }, [schema, computeContext])

  // 重置为默认值
  const resetToDefaults = useCallback(() => {
    if (!schema) return

    const defaults: Record<string, ParamValue> = {}
    for (const field of schema.fields) {
      if (!field.computed) {
        defaults[field.key] = field.defaultValue
      }
    }

    const computed = computeAllDerivedFields(schema.fields, defaults, computeContext)
    setValues(computed)
    setOriginalValues(computed)
  }, [schema, computeContext])

  // 值变化回调
  useEffect(() => {
    onValuesChange?.(values)
  }, [values, onValuesChange])

  // 检测变化
  const hasChanges = useMemo(() => {
    return JSON.stringify(values) !== JSON.stringify(originalValues)
  }, [values, originalValues])

  // 构建验证结果
  const validation = useMemo<ParamValidationResult>(() => {
    const errors = new Map<string, string>()
    const warnings = new Map<string, string>()

    for (const violation of constraintValidation.violations) {
      if (violation.severity === 'error') {
        errors.set(violation.paramKey, violation.message)
      } else {
        warnings.set(violation.paramKey, violation.message)
      }
    }

    return {
      valid: constraintValidation.valid,
      hasErrors: errors.size > 0,
      hasWarnings: warnings.size > 0,
      errors,
      warnings,
    }
  }, [constraintValidation])

  return {
    params,
    schemaFields,
    values,
    updateParam,
    updateParams,
    resetToDefaults,
    validation,
    hasChanges,
    schemaError: schema ? undefined : `未知的策略类型: ${strategyType}`,
    strategyType,
  }
}

export default useSchemaParams
