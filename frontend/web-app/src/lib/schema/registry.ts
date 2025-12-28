/**
 * Strategy Schema Registry
 *
 * 策略 Schema 的中央注册表，管理所有策略类型的 Schema 定义
 */

import type { InsightParam, ParamValue } from '@/types/insight'
import type {
  AIParamValues,
  ComputeContext,
  ParamSchemaField,
  SchemaResolveResult,
  StrategySchema,
  StrategyType,
} from '@/types/strategy-schema'

import { computeAllDerivedFields } from './compute-engine'
import { evaluateCondition,validateSchema } from './schema-validator'
import { DCA_STRATEGY_SCHEMA } from './schemas/dca.schema'
// Import all schemas
import { GRID_STRATEGY_SCHEMA } from './schemas/grid.schema'
import { RSI_REVERSAL_SCHEMA } from './schemas/rsi.schema'

// =============================================================================
// Schema Registry Class
// =============================================================================

class StrategySchemaRegistry {
  private schemas = new Map<StrategyType, StrategySchema>()
  private initialized = false

  constructor() {
    // 自动注册内置 Schema
    this.registerBuiltinSchemas()
  }

  /**
   * 注册内置 Schema
   */
  private registerBuiltinSchemas(): void {
    this.register(GRID_STRATEGY_SCHEMA)
    this.register(RSI_REVERSAL_SCHEMA)
    this.register(DCA_STRATEGY_SCHEMA)
    this.initialized = true
  }

  /**
   * 注册一个策略 Schema
   */
  register(schema: StrategySchema): void {
    // 验证 Schema 结构
    this.validateSchemaStructure(schema)
    this.schemas.set(schema.type, schema)
  }

  /**
   * 获取指定类型的 Schema
   */
  get(type: StrategyType): StrategySchema | undefined {
    return this.schemas.get(type)
  }

  /**
   * 获取所有已注册的 Schema
   */
  getAll(): StrategySchema[] {
    return Array.from(this.schemas.values())
  }

  /**
   * 检查 Schema 是否存在
   */
  has(type: StrategyType): boolean {
    return this.schemas.has(type)
  }

  /**
   * 获取所有已注册的策略类型
   */
  getTypes(): StrategyType[] {
    return Array.from(this.schemas.keys())
  }

  /**
   * 从 AI 返回值 + Schema 解析出完整的 InsightParam 数组
   */
  resolveParams(
    aiValues: AIParamValues,
    context: ComputeContext = {}
  ): SchemaResolveResult {
    const schema = this.get(aiValues.strategyType)
    if (!schema) {
      return {
        params: [],
        errors: [`未知的策略类型: ${aiValues.strategyType}`],
        warnings: [],
      }
    }

    const errors: string[] = []
    const warnings: string[] = []
    const resolvedValues = new Map<string, ParamValue>()

    // 第一轮：填充非计算字段的值
    for (const field of schema.fields) {
      if (field.computed) continue

      const aiValue = aiValues.values[field.key]
      const value = aiValue !== undefined ? aiValue : field.defaultValue

      // 验证必填
      if (field.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field.label} 是必填参数`)
      }

      resolvedValues.set(field.key, value)
    }

    // 第二轮：计算派生字段
    const paramsObj = Object.fromEntries(resolvedValues)
    const computedValues = computeAllDerivedFields(schema.fields, paramsObj, context)

    // 更新计算值
    for (const [key, value] of Object.entries(computedValues)) {
      resolvedValues.set(key, value)
    }

    // 第三轮：执行 Schema 级别验证
    if (schema.validators) {
      const validationResult = validateSchema(
        schema.validators,
        Object.fromEntries(resolvedValues)
      )
      errors.push(...validationResult.errors)
      warnings.push(...validationResult.warnings)
    }

    // 转换为 InsightParam 格式
    const params: InsightParam[] = schema.fields
      .filter(f => {
        // 检查条件显示
        if (f.showWhen) {
          return evaluateCondition(f.showWhen, Object.fromEntries(resolvedValues))
        }
        return true
      })
      .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
      .map(field => {
        const param: InsightParam = {
          key: field.key,
          label: field.label,
          type: field.type,
          value: resolvedValues.get(field.key) ?? field.defaultValue,
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

    return { params, errors, warnings }
  }

  /**
   * 从 Schema 生成默认参数
   */
  getDefaultParams(type: StrategyType, context: ComputeContext = {}): InsightParam[] {
    const schema = this.get(type)
    if (!schema) return []

    // 收集默认值
    const defaults: Record<string, ParamValue> = {}
    for (const field of schema.fields) {
      if (!field.computed) {
        defaults[field.key] = field.defaultValue
      }
    }

    // 计算派生字段
    const computed = computeAllDerivedFields(schema.fields, defaults, context)

    return schema.fields.map(field => {
      const param: InsightParam = {
        key: field.key,
        label: field.label,
        type: field.type,
        value: computed[field.key] ?? field.defaultValue,
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
  }

  /**
   * 获取必填字段列表
   */
  getRequiredFields(type: StrategyType): string[] {
    const schema = this.get(type)
    if (!schema) return []
    return schema.fields
      .filter(f => f.required && !f.computed)
      .map(f => f.key)
  }

  /**
   * 获取 Schema 字段定义
   */
  getFields(type: StrategyType): ParamSchemaField[] {
    const schema = this.get(type)
    return schema?.fields ?? []
  }

  /**
   * 将 Schema 转换为 AI Prompt 格式
   */
  toAIPrompt(type: StrategyType): string {
    const schema = this.get(type)
    if (!schema) return ''

    const requiredParams = schema.fields
      .filter(f => f.required && !f.computed)
      .map(f => ({
        key: f.key,
        label: f.label,
        type: f.type,
        description: f.description,
        config: f.config,
      }))

    const computedParams = schema.fields
      .filter(f => f.computed)
      .map(f => ({
        key: f.key,
        label: f.label,
        formula: f.formula,
      }))

    return `
## ${schema.name} (${schema.type})

${schema.description}

### 必填参数（必须在 params 中返回）

${JSON.stringify(requiredParams, null, 2)}

### 计算字段（系统自动计算，无需返回）

${JSON.stringify(computedParams, null, 2)}

### 输出格式要求

params 数组中必须包含以上所有必填参数，每个参数格式：
{
  "key": "参数key",
  "label": "显示标签",
  "type": "slider|number|select|toggle|button_group",
  "value": <具体值>,
  "level": 1 或 2,
  "config": { ... }
}
`
  }

  /**
   * 验证 Schema 结构的正确性
   */
  private validateSchemaStructure(schema: StrategySchema): void {
    const keys = new Set<string>()

    for (const field of schema.fields) {
      // 检查 key 唯一性
      if (keys.has(field.key)) {
        throw new Error(`Schema ${schema.type}: 重复的参数 key "${field.key}"`)
      }
      keys.add(field.key)

      // 检查计算字段的依赖
      if (field.computed && field.dependsOn) {
        for (const dep of field.dependsOn) {
          if (!schema.fields.some(f => f.key === dep)) {
            throw new Error(
              `Schema ${schema.type}: 计算字段 "${field.key}" 依赖不存在的参数 "${dep}"`
            )
          }
        }
      }
    }
  }
}

// =============================================================================
// 单例导出
// =============================================================================

export const schemaRegistry = new StrategySchemaRegistry()

// =============================================================================
// 便捷函数
// =============================================================================

/**
 * 根据策略类型获取 Schema
 */
export function getStrategySchema(type: StrategyType): StrategySchema | undefined {
  return schemaRegistry.get(type)
}

/**
 * 获取所有已注册的策略类型
 */
export function getRegisteredStrategyTypes(): StrategyType[] {
  return schemaRegistry.getTypes()
}

/**
 * 从 AI 输出解析参数
 */
export function resolveAIParams(
  aiOutput: AIParamValues,
  context?: ComputeContext
): SchemaResolveResult {
  return schemaRegistry.resolveParams(aiOutput, context)
}

/**
 * 获取策略的默认参数
 */
export function getDefaultStrategyParams(
  type: StrategyType,
  context?: ComputeContext
): InsightParam[] {
  return schemaRegistry.getDefaultParams(type, context)
}

/**
 * 检测策略类型（从用户输入中推断）
 */
export function detectStrategyType(input: string): StrategyType | null {
  const lowerInput = input.toLowerCase()

  if (lowerInput.includes('网格') || lowerInput.includes('grid')) {
    return 'grid'
  }
  if (lowerInput.includes('rsi') || lowerInput.includes('超买') || lowerInput.includes('超卖')) {
    return 'rsi_reversal'
  }
  if (lowerInput.includes('定投') || lowerInput.includes('dca')) {
    return 'dca'
  }
  if (lowerInput.includes('均线') || lowerInput.includes('ma') || lowerInput.includes('移动平均')) {
    return 'ma_cross'
  }
  if (lowerInput.includes('macd')) {
    return 'macd_cross'
  }
  if (lowerInput.includes('布林') || lowerInput.includes('bollinger')) {
    return 'bollinger_bounce'
  }

  return null
}
