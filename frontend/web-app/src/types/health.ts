/**
 * Strategy Health Types - 策略健康评分类型定义
 *
 * @module S74 策略健康评分
 * @module S76 性能衰退预警
 */

// =============================================================================
// Health Score Types
// =============================================================================

/**
 * 健康等级
 */
export type HealthGrade = 'A' | 'B' | 'C' | 'D' | 'F'

/**
 * 健康状态
 */
export type HealthStatus = 'excellent' | 'good' | 'fair' | 'poor' | 'critical'

/**
 * 健康维度
 */
export type HealthDimension =
  | 'profitability'   // 盈利能力
  | 'risk'            // 风险控制
  | 'consistency'     // 稳定性
  | 'efficiency'      // 效率
  | 'activity'        // 活跃度

/**
 * 单项健康指标
 */
export interface HealthIndicator {
  /** 指标名称 */
  name: string
  /** 指标值 */
  value: number
  /** 满分值 */
  maxScore: number
  /** 权重 */
  weight: number
  /** 状态 */
  status: HealthStatus
  /** 描述 */
  description: string
  /** 建议 */
  suggestion?: string
}

/**
 * 健康维度评分
 */
export interface DimensionScore {
  /** 维度 */
  dimension: HealthDimension
  /** 维度名称 */
  label: string
  /** 得分 (0-100) */
  score: number
  /** 权重 */
  weight: number
  /** 状态 */
  status: HealthStatus
  /** 包含的指标 */
  indicators: HealthIndicator[]
}

/**
 * 策略健康评分
 */
export interface StrategyHealthScore {
  /** 策略ID */
  strategyId: string
  /** 总分 (0-100) */
  totalScore: number
  /** 等级 */
  grade: HealthGrade
  /** 状态 */
  status: HealthStatus
  /** 各维度评分 */
  dimensions: DimensionScore[]
  /** 评分时间 */
  evaluatedAt: number
  /** 趋势 (与上次比较) */
  trend: 'up' | 'down' | 'stable'
  /** 变化值 */
  change: number
}

// =============================================================================
// Performance Decay Types (S76)
// =============================================================================

/**
 * 衰退严重程度
 */
export type DecaySeverity = 'mild' | 'moderate' | 'severe' | 'critical'

/**
 * 衰退类型
 */
export type DecayType =
  | 'profitability_decline'    // 盈利能力下降
  | 'risk_increase'            // 风险上升
  | 'consistency_drop'         // 稳定性下降
  | 'activity_reduction'       // 活跃度降低
  | 'market_mismatch'          // 市场适配性下降

/**
 * 衰退指标
 */
export interface DecayIndicator {
  /** 指标类型 */
  type: DecayType
  /** 指标名称 */
  name: string
  /** 当前值 */
  currentValue: number
  /** 历史均值 */
  historicalAverage: number
  /** 变化百分比 */
  changePercent: number
  /** 严重程度 */
  severity: DecaySeverity
  /** 检测时间 */
  detectedAt: number
}

/**
 * 衰退预警
 */
export interface DecayWarning {
  /** 预警ID */
  id: string
  /** 策略ID */
  strategyId: string
  /** 策略名称 */
  strategyName: string
  /** 衰退指标列表 */
  indicators: DecayIndicator[]
  /** 综合严重程度 */
  overallSeverity: DecaySeverity
  /** 建议操作 */
  recommendations: string[]
  /** 创建时间 */
  createdAt: number
  /** 是否已确认 */
  acknowledged: boolean
}

// =============================================================================
// Health Threshold Configuration
// =============================================================================

/**
 * 健康评分阈值配置
 */
export interface HealthThresholds {
  /** 优秀阈值 */
  excellent: number
  /** 良好阈值 */
  good: number
  /** 一般阈值 */
  fair: number
  /** 较差阈值 */
  poor: number
}

/**
 * 默认健康阈值
 */
export const DEFAULT_HEALTH_THRESHOLDS: HealthThresholds = {
  excellent: 85,
  good: 70,
  fair: 55,
  poor: 40,
}

/**
 * 等级对应分数范围
 */
export const GRADE_THRESHOLDS: Record<HealthGrade, { min: number; max: number }> = {
  A: { min: 90, max: 100 },
  B: { min: 75, max: 89 },
  C: { min: 60, max: 74 },
  D: { min: 40, max: 59 },
  F: { min: 0, max: 39 },
}

// =============================================================================
// Health Calculation Helpers
// =============================================================================

/**
 * 根据分数获取健康状态
 */
export function getHealthStatus(score: number): HealthStatus {
  if (score >= DEFAULT_HEALTH_THRESHOLDS.excellent) return 'excellent'
  if (score >= DEFAULT_HEALTH_THRESHOLDS.good) return 'good'
  if (score >= DEFAULT_HEALTH_THRESHOLDS.fair) return 'fair'
  if (score >= DEFAULT_HEALTH_THRESHOLDS.poor) return 'poor'
  return 'critical'
}

/**
 * 根据分数获取等级
 */
export function getHealthGrade(score: number): HealthGrade {
  if (score >= GRADE_THRESHOLDS.A.min) return 'A'
  if (score >= GRADE_THRESHOLDS.B.min) return 'B'
  if (score >= GRADE_THRESHOLDS.C.min) return 'C'
  if (score >= GRADE_THRESHOLDS.D.min) return 'D'
  return 'F'
}

/**
 * 健康状态颜色映射
 */
export const HEALTH_STATUS_COLORS: Record<HealthStatus, string> = {
  excellent: '#22c55e', // green-500
  good: '#84cc16',      // lime-500
  fair: '#eab308',      // yellow-500
  poor: '#f97316',      // orange-500
  critical: '#ef4444',  // red-500
}

/**
 * 等级颜色映射
 */
export const GRADE_COLORS: Record<HealthGrade, string> = {
  A: '#22c55e',
  B: '#84cc16',
  C: '#eab308',
  D: '#f97316',
  F: '#ef4444',
}

/**
 * 健康维度标签
 */
export const DIMENSION_LABELS: Record<HealthDimension, string> = {
  profitability: '盈利能力',
  risk: '风险控制',
  consistency: '稳定性',
  efficiency: '执行效率',
  activity: '活跃度',
}

/**
 * 衰退严重程度标签
 */
export const DECAY_SEVERITY_LABELS: Record<DecaySeverity, string> = {
  mild: '轻微',
  moderate: '中等',
  severe: '严重',
  critical: '危急',
}
