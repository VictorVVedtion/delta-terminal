/**
 * Strategy Schema 系统类型定义
 *
 * 设计原则：
 * 1. Schema 定义参数结构，AI 只填充值
 * 2. 支持计算字段（derived fields）
 * 3. 支持参数间依赖和约束
 * 4. 与现有 InsightParam 兼容
 */

import type { Constraint, ParamConfig, ParamLevel, ParamType, ParamValue } from './insight'

// =============================================================================
// 策略类型枚举
// =============================================================================

/**
 * 策略类型 - 每种类型对应固定的 Schema
 */
export type StrategyType =
  | 'grid'              // 网格交易
  | 'rsi_reversal'      // RSI 反转
  | 'ma_cross'          // 均线交叉
  | 'macd_cross'        // MACD 交叉
  | 'bollinger_bounce'  // 布林带反弹
  | 'breakout'          // 突破策略
  | 'dca'               // 定投策略
  | 'arbitrage'         // 套利策略
  | 'custom'            // 自定义策略

// =============================================================================
// 参数分组定义
// =============================================================================

/**
 * 参数分组类型
 */
export type ParamGroup = 'basic' | 'entry' | 'exit' | 'risk' | 'advanced'

/**
 * 参数分组配置
 */
export const PARAM_GROUP_CONFIG: Record<ParamGroup, {
  label: string
  icon: string
  order: number
}> = {
  basic: { label: '基础设置', icon: 'Settings', order: 1 },
  entry: { label: '入场条件', icon: 'TrendingUp', order: 2 },
  exit: { label: '出场条件', icon: 'TrendingDown', order: 3 },
  risk: { label: '风险管理', icon: 'Shield', order: 4 },
  advanced: { label: '高级设置', icon: 'Wrench', order: 5 },
}

// =============================================================================
// 计算上下文
// =============================================================================

/**
 * 计算上下文 - 提供市场数据等外部信息
 */
export interface ComputeContext {
  /** 当前价格 */
  currentPrice?: number
  /** 24h 最高价 */
  high24h?: number
  /** 24h 最低价 */
  low24h?: number
  /** 账户余额 */
  balance?: number
  /** 自定义数据 */
  extra?: Record<string, unknown>
}

// =============================================================================
// 参数 Schema 字段定义
// =============================================================================

/**
 * 参数 Schema 字段定义
 *
 * 相比 InsightParam，增加了：
 * - required: 是否必填
 * - computed: 计算字段公式
 * - dependsOn: 依赖的其他参数
 * - group: 参数分组
 * - order: 显示顺序
 */
export interface ParamSchemaField {
  /** 唯一标识 */
  key: string
  /** 显示标签 */
  label: string
  /** 参数类型 */
  type: ParamType
  /** 默认值 */
  defaultValue: ParamValue
  /** 是否必填 */
  required: boolean
  /** 参数级别 1=核心, 2=高级 */
  level: ParamLevel
  /** 参数描述 */
  description?: string
  /** 控件配置 */
  config: ParamConfig
  /** 约束规则 */
  constraints?: Constraint[]

  // === Schema 特有字段 ===

  /**
   * 是否为计算字段
   * 计算字段的值由其他参数自动计算得出
   */
  computed?: boolean

  /**
   * 计算公式 - 字符串表达式
   * 例如: "(upperBound - lowerBound) / gridCount"
   */
  formula?: string

  /**
   * 依赖的参数列表
   * 当依赖的参数变化时，触发重新计算
   */
  dependsOn?: string[]

  /**
   * 参数分组（用于 UI 展示）
   */
  group?: ParamGroup

  /**
   * 显示顺序（同组内）
   */
  order?: number

  /**
   * 条件显示规则
   * 例如: "stopLossEnabled === true" 时才显示 stopLossPercent
   */
  showWhen?: string

  /**
   * 是否禁止用户编辑（只读）
   */
  readonly?: boolean
}

// =============================================================================
// Schema 验证器
// =============================================================================

/**
 * Schema 级别验证器
 * 用于跨参数的复杂验证
 */
export interface SchemaValidator {
  /** 验证规则名称 */
  name: string
  /** 验证表达式 */
  expression: string
  /** 验证失败消息 */
  message: string
  /** 严重程度 */
  severity: 'error' | 'warning'
}

// =============================================================================
// 策略 Schema 完整定义
// =============================================================================

/**
 * 策略 Schema 完整定义
 */
export interface StrategySchema {
  /** 策略类型标识 */
  type: StrategyType
  /** 策略名称 */
  name: string
  /** 策略描述 */
  description: string
  /** 策略版本 */
  version: string
  /** 参数字段定义列表 */
  fields: ParamSchemaField[]

  /**
   * Schema 级别的验证规则
   * 用于跨参数的复杂验证
   */
  validators?: SchemaValidator[]

  /**
   * 推荐的交易对
   */
  recommendedSymbols?: string[]

  /**
   * 推荐的时间周期
   */
  recommendedTimeframes?: string[]

  /**
   * Schema 元数据
   */
  meta?: {
    author?: string
    createdAt?: string
    tags?: string[]
  }
}

// =============================================================================
// AI 填充值类型
// =============================================================================

/**
 * AI 返回的参数值填充
 * AI 只需要返回 key-value 映射，不决定参数结构
 */
export interface AIParamValues {
  /** 策略类型 - 必须匹配已注册的 Schema */
  strategyType: StrategyType
  /** 参数值映射 */
  values: Record<string, ParamValue>
  /** AI 解释 */
  explanation?: string
}

// =============================================================================
// 解析结果类型
// =============================================================================

/**
 * Schema 解析结果
 */
export interface SchemaResolveResult {
  /** 解析后的参数列表 */
  params: import('./insight').InsightParam[]
  /** 验证错误 */
  errors: string[]
  /** 验证警告 */
  warnings: string[]
}

/**
 * 参数验证结果
 */
export interface ParamValidationResult {
  /** 是否有效 */
  valid: boolean
  /** 是否有错误 */
  hasErrors: boolean
  /** 是否有警告 */
  hasWarnings: boolean
  /** 错误映射 */
  errors: Map<string, string>
  /** 警告映射 */
  warnings: Map<string, string>
}
