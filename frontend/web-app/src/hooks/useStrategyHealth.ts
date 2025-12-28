/**
 * Strategy Health Hook - 策略健康评分计算
 *
 * @module S74 策略健康评分
 * @module S76 性能衰退预警
 *
 * 计算策略的综合健康评分，包含五个维度：
 * - 盈利能力 (profitability)
 * - 风险控制 (risk)
 * - 稳定性 (consistency)
 * - 执行效率 (efficiency)
 * - 活跃度 (activity)
 */

import { useCallback,useMemo } from 'react'

import type {
  DecayIndicator,
  DecaySeverity,
  DecayWarning,
  DimensionScore,
  HealthDimension,
  HealthIndicator,
  StrategyHealthScore,
} from '@/types/health'
import {
  DIMENSION_LABELS,
  getHealthGrade,
  getHealthStatus,
} from '@/types/health'
import type { StrategyMetrics } from '@/types/insight'

// =============================================================================
// Configuration Constants
// =============================================================================

/** 各维度权重配置 */
const DIMENSION_WEIGHTS: Record<HealthDimension, number> = {
  profitability: 0.30,  // 盈利能力权重 30%
  risk: 0.25,           // 风险控制权重 25%
  consistency: 0.20,    // 稳定性权重 20%
  efficiency: 0.15,     // 执行效率权重 15%
  activity: 0.10,       // 活跃度权重 10%
}

/** 评分阈值配置 */
const SCORE_THRESHOLDS = {
  // 盈利能力
  profitability: {
    excellent: { totalReturn: 30, annualizedReturn: 50, profitFactor: 2.0 },
    good: { totalReturn: 15, annualizedReturn: 25, profitFactor: 1.5 },
    fair: { totalReturn: 5, annualizedReturn: 10, profitFactor: 1.2 },
    poor: { totalReturn: 0, annualizedReturn: 0, profitFactor: 1.0 },
  },
  // 风险控制
  risk: {
    excellent: { maxDrawdown: 5, sharpeRatio: 2.0, sortinoRatio: 2.5 },
    good: { maxDrawdown: 10, sharpeRatio: 1.5, sortinoRatio: 2.0 },
    fair: { maxDrawdown: 20, sharpeRatio: 1.0, sortinoRatio: 1.0 },
    poor: { maxDrawdown: 30, sharpeRatio: 0.5, sortinoRatio: 0.5 },
  },
  // 稳定性
  consistency: {
    excellent: { winRate: 65 },
    good: { winRate: 55 },
    fair: { winRate: 45 },
    poor: { winRate: 35 },
  },
  // 效率
  efficiency: {
    excellent: { profitFactor: 2.5 },
    good: { profitFactor: 1.8 },
    fair: { profitFactor: 1.3 },
    poor: { profitFactor: 1.0 },
  },
  // 活跃度
  activity: {
    excellent: { totalTrades: 100 },
    good: { totalTrades: 50 },
    fair: { totalTrades: 20 },
    poor: { totalTrades: 5 },
  },
}

/** 衰退检测阈值 */
const DECAY_THRESHOLDS = {
  mild: -10,      // 下降 10%
  moderate: -20,  // 下降 20%
  severe: -35,    // 下降 35%
  critical: -50,  // 下降 50%
}

// =============================================================================
// Score Calculation Helpers
// =============================================================================

/**
 * 将原始值映射到 0-100 分数
 */
function mapToScore(
  value: number,
  thresholds: { excellent: number; good: number; fair: number; poor: number },
  isLowerBetter = false
): number {
  const { excellent, good, fair, poor } = thresholds

  if (isLowerBetter) {
    // 越低越好 (如回撤)
    if (value <= excellent) return 95
    if (value <= good) return 80
    if (value <= fair) return 60
    if (value <= poor) return 40
    return Math.max(0, 20 - (value - poor) * 0.5)
  } else {
    // 越高越好
    if (value >= excellent) return 95
    if (value >= good) return 80
    if (value >= fair) return 60
    if (value >= poor) return 40
    return Math.max(0, 20 + (value - poor) * 0.5)
  }
}

/**
 * 计算盈利能力维度分数
 */
function calculateProfitabilityScore(metrics: StrategyMetrics): DimensionScore {
  const { totalReturn, annualizedReturn, profitFactor } = metrics
  const thresholds = SCORE_THRESHOLDS.profitability

  const indicators: HealthIndicator[] = [
    {
      name: '总收益率',
      value: mapToScore(totalReturn, {
        excellent: thresholds.excellent.totalReturn,
        good: thresholds.good.totalReturn,
        fair: thresholds.fair.totalReturn,
        poor: thresholds.poor.totalReturn,
      }),
      maxScore: 100,
      weight: 0.4,
      status: getHealthStatus(mapToScore(totalReturn, {
        excellent: thresholds.excellent.totalReturn,
        good: thresholds.good.totalReturn,
        fair: thresholds.fair.totalReturn,
        poor: thresholds.poor.totalReturn,
      })),
      description: `当前收益率: ${totalReturn.toFixed(2)}%`,
      ...(totalReturn < 0 && { suggestion: '策略处于亏损状态，建议检查入场条件' }),
    },
    {
      name: '年化收益率',
      value: mapToScore(annualizedReturn, {
        excellent: thresholds.excellent.annualizedReturn,
        good: thresholds.good.annualizedReturn,
        fair: thresholds.fair.annualizedReturn,
        poor: thresholds.poor.annualizedReturn,
      }),
      maxScore: 100,
      weight: 0.35,
      status: getHealthStatus(mapToScore(annualizedReturn, {
        excellent: thresholds.excellent.annualizedReturn,
        good: thresholds.good.annualizedReturn,
        fair: thresholds.fair.annualizedReturn,
        poor: thresholds.poor.annualizedReturn,
      })),
      description: `年化收益: ${annualizedReturn.toFixed(2)}%`,
    },
    {
      name: '盈亏比',
      value: mapToScore(profitFactor, {
        excellent: thresholds.excellent.profitFactor,
        good: thresholds.good.profitFactor,
        fair: thresholds.fair.profitFactor,
        poor: thresholds.poor.profitFactor,
      }),
      maxScore: 100,
      weight: 0.25,
      status: getHealthStatus(mapToScore(profitFactor, {
        excellent: thresholds.excellent.profitFactor,
        good: thresholds.good.profitFactor,
        fair: thresholds.fair.profitFactor,
        poor: thresholds.poor.profitFactor,
      })),
      description: `盈亏比: ${profitFactor.toFixed(2)}`,
      ...(profitFactor < 1 && { suggestion: '盈亏比小于1，建议优化止盈止损' }),
    },
  ]

  const score = indicators.reduce((sum, ind) => sum + ind.value * ind.weight, 0)

  return {
    dimension: 'profitability',
    label: DIMENSION_LABELS.profitability,
    score,
    weight: DIMENSION_WEIGHTS.profitability,
    status: getHealthStatus(score),
    indicators,
  }
}

/**
 * 计算风险控制维度分数
 */
function calculateRiskScore(metrics: StrategyMetrics): DimensionScore {
  const { maxDrawdown, sharpeRatio, sortinoRatio } = metrics
  const thresholds = SCORE_THRESHOLDS.risk

  const indicators: HealthIndicator[] = [
    {
      name: '最大回撤',
      value: mapToScore(maxDrawdown, {
        excellent: thresholds.excellent.maxDrawdown,
        good: thresholds.good.maxDrawdown,
        fair: thresholds.fair.maxDrawdown,
        poor: thresholds.poor.maxDrawdown,
      }, true),
      maxScore: 100,
      weight: 0.4,
      status: getHealthStatus(mapToScore(maxDrawdown, {
        excellent: thresholds.excellent.maxDrawdown,
        good: thresholds.good.maxDrawdown,
        fair: thresholds.fair.maxDrawdown,
        poor: thresholds.poor.maxDrawdown,
      }, true)),
      description: `最大回撤: ${maxDrawdown.toFixed(2)}%`,
      ...(maxDrawdown > 25 && { suggestion: '回撤过大，建议收紧止损或降低仓位' }),
    },
    {
      name: '夏普比率',
      value: mapToScore(sharpeRatio, {
        excellent: thresholds.excellent.sharpeRatio,
        good: thresholds.good.sharpeRatio,
        fair: thresholds.fair.sharpeRatio,
        poor: thresholds.poor.sharpeRatio,
      }),
      maxScore: 100,
      weight: 0.35,
      status: getHealthStatus(mapToScore(sharpeRatio, {
        excellent: thresholds.excellent.sharpeRatio,
        good: thresholds.good.sharpeRatio,
        fair: thresholds.fair.sharpeRatio,
        poor: thresholds.poor.sharpeRatio,
      })),
      description: `夏普比率: ${sharpeRatio.toFixed(2)}`,
      ...(sharpeRatio < 1 && { suggestion: '风险收益比偏低' }),
    },
    {
      name: '索提诺比率',
      value: mapToScore(sortinoRatio, {
        excellent: thresholds.excellent.sortinoRatio,
        good: thresholds.good.sortinoRatio,
        fair: thresholds.fair.sortinoRatio,
        poor: thresholds.poor.sortinoRatio,
      }),
      maxScore: 100,
      weight: 0.25,
      status: getHealthStatus(mapToScore(sortinoRatio, {
        excellent: thresholds.excellent.sortinoRatio,
        good: thresholds.good.sortinoRatio,
        fair: thresholds.fair.sortinoRatio,
        poor: thresholds.poor.sortinoRatio,
      })),
      description: `索提诺比率: ${sortinoRatio.toFixed(2)}`,
    },
  ]

  const score = indicators.reduce((sum, ind) => sum + ind.value * ind.weight, 0)

  return {
    dimension: 'risk',
    label: DIMENSION_LABELS.risk,
    score,
    weight: DIMENSION_WEIGHTS.risk,
    status: getHealthStatus(score),
    indicators,
  }
}

/**
 * 计算稳定性维度分数
 */
function calculateConsistencyScore(metrics: StrategyMetrics): DimensionScore {
  const { winRate } = metrics
  const thresholds = SCORE_THRESHOLDS.consistency

  const indicators: HealthIndicator[] = [
    {
      name: '胜率',
      value: mapToScore(winRate, {
        excellent: thresholds.excellent.winRate,
        good: thresholds.good.winRate,
        fair: thresholds.fair.winRate,
        poor: thresholds.poor.winRate,
      }),
      maxScore: 100,
      weight: 1.0,
      status: getHealthStatus(mapToScore(winRate, {
        excellent: thresholds.excellent.winRate,
        good: thresholds.good.winRate,
        fair: thresholds.fair.winRate,
        poor: thresholds.poor.winRate,
      })),
      description: `胜率: ${winRate.toFixed(1)}%`,
      ...(winRate < 40 && { suggestion: '胜率较低，考虑优化入场信号' }),
    },
  ]

  const score = indicators.reduce((sum, ind) => sum + ind.value * ind.weight, 0)

  return {
    dimension: 'consistency',
    label: DIMENSION_LABELS.consistency,
    score,
    weight: DIMENSION_WEIGHTS.consistency,
    status: getHealthStatus(score),
    indicators,
  }
}

/**
 * 计算效率维度分数
 */
function calculateEfficiencyScore(metrics: StrategyMetrics): DimensionScore {
  const { profitFactor } = metrics
  const thresholds = SCORE_THRESHOLDS.efficiency

  const indicators: HealthIndicator[] = [
    {
      name: '资金效率',
      value: mapToScore(profitFactor, {
        excellent: thresholds.excellent.profitFactor,
        good: thresholds.good.profitFactor,
        fair: thresholds.fair.profitFactor,
        poor: thresholds.poor.profitFactor,
      }),
      maxScore: 100,
      weight: 1.0,
      status: getHealthStatus(mapToScore(profitFactor, {
        excellent: thresholds.excellent.profitFactor,
        good: thresholds.good.profitFactor,
        fair: thresholds.fair.profitFactor,
        poor: thresholds.poor.profitFactor,
      })),
      description: `盈利因子: ${profitFactor.toFixed(2)}`,
    },
  ]

  const score = indicators.reduce((sum, ind) => sum + ind.value * ind.weight, 0)

  return {
    dimension: 'efficiency',
    label: DIMENSION_LABELS.efficiency,
    score,
    weight: DIMENSION_WEIGHTS.efficiency,
    status: getHealthStatus(score),
    indicators,
  }
}

/**
 * 计算活跃度维度分数
 */
function calculateActivityScore(metrics: StrategyMetrics): DimensionScore {
  const { totalTrades } = metrics
  const thresholds = SCORE_THRESHOLDS.activity

  const indicators: HealthIndicator[] = [
    {
      name: '交易次数',
      value: mapToScore(totalTrades, {
        excellent: thresholds.excellent.totalTrades,
        good: thresholds.good.totalTrades,
        fair: thresholds.fair.totalTrades,
        poor: thresholds.poor.totalTrades,
      }),
      maxScore: 100,
      weight: 1.0,
      status: getHealthStatus(mapToScore(totalTrades, {
        excellent: thresholds.excellent.totalTrades,
        good: thresholds.good.totalTrades,
        fair: thresholds.fair.totalTrades,
        poor: thresholds.poor.totalTrades,
      })),
      description: `总交易次数: ${totalTrades}`,
      ...(totalTrades < 10 && { suggestion: '交易样本较少，统计意义有限' }),
    },
  ]

  const score = indicators.reduce((sum, ind) => sum + ind.value * ind.weight, 0)

  return {
    dimension: 'activity',
    label: DIMENSION_LABELS.activity,
    score,
    weight: DIMENSION_WEIGHTS.activity,
    status: getHealthStatus(score),
    indicators,
  }
}

// =============================================================================
// Decay Detection
// =============================================================================

/**
 * 获取衰退严重程度
 */
function getDecaySeverity(changePercent: number): DecaySeverity {
  if (changePercent <= DECAY_THRESHOLDS.critical) return 'critical'
  if (changePercent <= DECAY_THRESHOLDS.severe) return 'severe'
  if (changePercent <= DECAY_THRESHOLDS.moderate) return 'moderate'
  if (changePercent <= DECAY_THRESHOLDS.mild) return 'mild'
  return 'mild'
}

/**
 * 检测性能衰退
 */
function detectDecay(
  current: StrategyMetrics,
  historical: StrategyMetrics
): DecayIndicator[] {
  const indicators: DecayIndicator[] = []
  const now = Date.now()

  // 盈利能力衰退
  if (current.totalReturn < historical.totalReturn) {
    const changePercent = ((current.totalReturn - historical.totalReturn) / Math.abs(historical.totalReturn || 1)) * 100
    if (changePercent <= DECAY_THRESHOLDS.mild) {
      indicators.push({
        type: 'profitability_decline',
        name: '盈利能力下降',
        currentValue: current.totalReturn,
        historicalAverage: historical.totalReturn,
        changePercent,
        severity: getDecaySeverity(changePercent),
        detectedAt: now,
      })
    }
  }

  // 风险上升
  if (current.maxDrawdown > historical.maxDrawdown) {
    const changePercent = ((current.maxDrawdown - historical.maxDrawdown) / (historical.maxDrawdown || 1)) * 100
    if (changePercent >= Math.abs(DECAY_THRESHOLDS.mild)) {
      indicators.push({
        type: 'risk_increase',
        name: '风险水平上升',
        currentValue: current.maxDrawdown,
        historicalAverage: historical.maxDrawdown,
        changePercent,
        severity: getDecaySeverity(-changePercent),
        detectedAt: now,
      })
    }
  }

  // 稳定性下降
  if (current.winRate < historical.winRate) {
    const changePercent = ((current.winRate - historical.winRate) / (historical.winRate || 1)) * 100
    if (changePercent <= DECAY_THRESHOLDS.mild) {
      indicators.push({
        type: 'consistency_drop',
        name: '胜率下降',
        currentValue: current.winRate,
        historicalAverage: historical.winRate,
        changePercent,
        severity: getDecaySeverity(changePercent),
        detectedAt: now,
      })
    }
  }

  return indicators
}

/**
 * 生成衰退建议
 */
function generateDecayRecommendations(indicators: DecayIndicator[]): string[] {
  const recommendations: string[] = []

  for (const indicator of indicators) {
    switch (indicator.type) {
      case 'profitability_decline':
        recommendations.push('检查市场环境是否发生变化')
        recommendations.push('考虑调整策略参数或入场条件')
        break
      case 'risk_increase':
        recommendations.push('收紧止损设置')
        recommendations.push('降低仓位规模')
        break
      case 'consistency_drop':
        recommendations.push('优化入场信号过滤')
        recommendations.push('增加确认指标')
        break
      case 'activity_reduction':
        recommendations.push('检查交易条件是否过于严格')
        break
      case 'market_mismatch':
        recommendations.push('评估当前市场是否适合此策略')
        break
    }
  }

  return [...new Set(recommendations)] // 去重
}

// =============================================================================
// Main Hook
// =============================================================================

export interface UseStrategyHealthOptions {
  /** 策略ID */
  strategyId: string
  /** 策略名称 */
  strategyName: string
  /** 当前指标 */
  currentMetrics: StrategyMetrics
  /** 历史指标 (用于衰退检测) */
  historicalMetrics?: StrategyMetrics
  /** 上次健康评分 (用于趋势计算) */
  previousScore?: number
}

export interface UseStrategyHealthResult {
  /** 健康评分结果 */
  healthScore: StrategyHealthScore
  /** 衰退预警 (如果有) */
  decayWarning: DecayWarning | null
  /** 是否健康 (总分 >= 60) */
  isHealthy: boolean
  /** 主要问题列表 */
  issues: string[]
  /** 改进建议列表 */
  suggestions: string[]
  /** 获取特定维度评分 */
  getDimensionScore: (dimension: HealthDimension) => DimensionScore | undefined
}

/**
 * 策略健康评分 Hook
 */
export function useStrategyHealth({
  strategyId,
  strategyName,
  currentMetrics,
  historicalMetrics,
  previousScore,
}: UseStrategyHealthOptions): UseStrategyHealthResult {
  // 计算各维度分数
  const dimensions = useMemo<DimensionScore[]>(() => [
    calculateProfitabilityScore(currentMetrics),
    calculateRiskScore(currentMetrics),
    calculateConsistencyScore(currentMetrics),
    calculateEfficiencyScore(currentMetrics),
    calculateActivityScore(currentMetrics),
  ], [currentMetrics])

  // 计算总分
  const totalScore = useMemo(() => {
    return dimensions.reduce((sum, dim) => sum + dim.score * dim.weight, 0)
  }, [dimensions])

  // 计算趋势
  const { trend, change } = useMemo(() => {
    if (previousScore === undefined) {
      return { trend: 'stable' as const, change: 0 }
    }
    const diff = totalScore - previousScore
    if (diff > 2) return { trend: 'up' as const, change: diff }
    if (diff < -2) return { trend: 'down' as const, change: diff }
    return { trend: 'stable' as const, change: diff }
  }, [totalScore, previousScore])

  // 生成健康评分结果
  const healthScore = useMemo<StrategyHealthScore>(() => ({
    strategyId,
    totalScore,
    grade: getHealthGrade(totalScore),
    status: getHealthStatus(totalScore),
    dimensions,
    evaluatedAt: Date.now(),
    trend,
    change,
  }), [strategyId, totalScore, dimensions, trend, change])

  // 衰退检测
  const decayWarning = useMemo<DecayWarning | null>(() => {
    if (!historicalMetrics) return null

    const decayIndicators = detectDecay(currentMetrics, historicalMetrics)
    if (decayIndicators.length === 0) return null

    const maxSeverity = decayIndicators.reduce<DecaySeverity>(
      (max, ind) => {
        const order: DecaySeverity[] = ['mild', 'moderate', 'severe', 'critical']
        return order.indexOf(ind.severity) > order.indexOf(max) ? ind.severity : max
      },
      'mild'
    )

    return {
      id: `decay-${strategyId}-${Date.now()}`,
      strategyId,
      strategyName,
      indicators: decayIndicators,
      overallSeverity: maxSeverity,
      recommendations: generateDecayRecommendations(decayIndicators),
      createdAt: Date.now(),
      acknowledged: false,
    }
  }, [strategyId, strategyName, currentMetrics, historicalMetrics])

  // 收集问题
  const issues = useMemo<string[]>(() => {
    const result: string[] = []
    for (const dim of dimensions) {
      if (dim.status === 'poor' || dim.status === 'critical') {
        result.push(`${dim.label}评分较低 (${dim.score.toFixed(0)}分)`)
      }
      for (const ind of dim.indicators) {
        if (ind.status === 'poor' || ind.status === 'critical') {
          result.push(ind.description)
        }
      }
    }
    return result
  }, [dimensions])

  // 收集建议
  const suggestions = useMemo<string[]>(() => {
    const result: string[] = []
    for (const dim of dimensions) {
      for (const ind of dim.indicators) {
        if (ind.suggestion) {
          result.push(ind.suggestion)
        }
      }
    }
    if (decayWarning) {
      result.push(...decayWarning.recommendations)
    }
    return [...new Set(result)]
  }, [dimensions, decayWarning])

  // 获取特定维度分数
  const getDimensionScore = useCallback(
    (dimension: HealthDimension): DimensionScore | undefined => {
      return dimensions.find((d) => d.dimension === dimension)
    },
    [dimensions]
  )

  return {
    healthScore,
    decayWarning,
    isHealthy: totalScore >= 60,
    issues,
    suggestions,
    getDimensionScore,
  }
}

export default useStrategyHealth
