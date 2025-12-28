/**
 * Constraint Engine
 * V3 Design Document: Rule Engine for Trading Constraints
 *
 * Evaluates trading constraints against current portfolio state,
 * pending orders, and trading statistics.
 */

import type {
  AssetConstraint,
  Constraint,
  ConstraintContext,
  ConstraintEvaluation,
  ConstraintResult,
  ConstraintValidationResult,
  ExecutionConstraint,
  FrequencyConstraint,
  LossConstraint,
  PositionConstraint,
  TimingConstraint,
} from '@/types/constraint'

// =============================================================================
// Constraint Evaluators
// =============================================================================

/**
 * Evaluate a position constraint
 */
function evaluatePositionConstraint(
  constraint: PositionConstraint,
  context: ConstraintContext
): ConstraintEvaluation {
  const { rule } = constraint
  const { portfolio, pendingOrder } = context

  let result: ConstraintResult = 'pass'
  let message: string | undefined
  let details: Record<string, unknown> = {}

  switch (rule.type) {
    case 'max_position_percent': {
      if (pendingOrder) {
        const currentPositionValue =
          portfolio.positions.find(p => p.symbol === pendingOrder.symbol)?.value || 0
        const newPositionValue = currentPositionValue + pendingOrder.estimatedValue
        const positionPercent = (newPositionValue / portfolio.totalValue) * 100

        details = { positionPercent, limit: rule.value, currentValue: currentPositionValue }

        if (positionPercent > rule.value) {
          result = constraint.severity === 'block' ? 'block' : 'warn'
          message = `仓位 ${positionPercent.toFixed(1)}% 超过限制 ${rule.value}%`
        }
      }
      break
    }

    case 'max_position_value': {
      if (pendingOrder && pendingOrder.estimatedValue > rule.value) {
        result = constraint.severity === 'block' ? 'block' : 'warn'
        message = `订单金额 $${pendingOrder.estimatedValue.toFixed(2)} 超过限制 $${rule.value}`
        details = { orderValue: pendingOrder.estimatedValue, limit: rule.value }
      }
      break
    }

    case 'max_leverage': {
      const totalPositionValue = portfolio.positions.reduce((sum, p) => sum + p.value, 0)
      const leverage = totalPositionValue / portfolio.totalValue
      details = { leverage, limit: rule.value }

      if (leverage > rule.value) {
        result = constraint.severity === 'block' ? 'block' : 'warn'
        message = `杠杆 ${leverage.toFixed(2)}x 超过限制 ${rule.value}x`
      }
      break
    }

    case 'min_position_value': {
      if (pendingOrder && pendingOrder.estimatedValue < rule.value) {
        result = constraint.severity === 'block' ? 'block' : 'warn'
        message = `订单金额 $${pendingOrder.estimatedValue.toFixed(2)} 低于最小值 $${rule.value}`
        details = { orderValue: pendingOrder.estimatedValue, minimum: rule.value }
      }
      break
    }
  }

  const evaluation: ConstraintEvaluation = {
    constraintId: constraint.id,
    constraintName: constraint.name,
    category: constraint.category,
    result,
    details,
    evaluatedAt: Date.now(),
  }
  if (message) {
    evaluation.message = message
  }
  return evaluation
}

/**
 * Evaluate a timing constraint
 */
function evaluateTimingConstraint(
  constraint: TimingConstraint,
  context: ConstraintContext
): ConstraintEvaluation {
  const { rule } = constraint
  const { currentTime } = context

  let result: ConstraintResult = 'pass'
  let message: string | undefined
  let details: Record<string, unknown> = {}

  const hour = currentTime.getUTCHours()
  const minute = currentTime.getUTCMinutes()
  const dayOfWeek = currentTime.getUTCDay()
  const currentMinutes = hour * 60 + minute

  switch (rule.type) {
    case 'trading_hours': {
      if (rule.windows && rule.windows.length > 0) {
        const inWindow = rule.windows.some(window => {
          const startParts = window.start.split(':').map(Number)
          const endParts = window.end.split(':').map(Number)
          const startH = startParts[0] ?? 0
          const startM = startParts[1] ?? 0
          const endH = endParts[0] ?? 0
          const endM = endParts[1] ?? 0
          const startMinutes = startH * 60 + startM
          const endMinutes = endH * 60 + endM

          // Handle overnight windows
          if (endMinutes < startMinutes) {
            return currentMinutes >= startMinutes || currentMinutes <= endMinutes
          }
          return currentMinutes >= startMinutes && currentMinutes <= endMinutes
        })

        details = { currentTime: `${hour}:${minute.toString().padStart(2, '0')}`, windows: rule.windows }

        if (!inWindow) {
          result = constraint.severity === 'block' ? 'block' : 'warn'
          message = `当前时间不在交易时段内`
        }
      }
      break
    }

    case 'no_trading_hours': {
      if (rule.windows && rule.windows.length > 0) {
        const inBlockedWindow = rule.windows.some(window => {
          const startParts = window.start.split(':').map(Number)
          const endParts = window.end.split(':').map(Number)
          const startH = startParts[0] ?? 0
          const startM = startParts[1] ?? 0
          const endH = endParts[0] ?? 0
          const endM = endParts[1] ?? 0
          const startMinutes = startH * 60 + startM
          const endMinutes = endH * 60 + endM

          if (endMinutes < startMinutes) {
            return currentMinutes >= startMinutes || currentMinutes <= endMinutes
          }
          return currentMinutes >= startMinutes && currentMinutes <= endMinutes
        })

        details = { currentTime: `${hour}:${minute.toString().padStart(2, '0')}`, blockedWindows: rule.windows }

        if (inBlockedWindow) {
          result = constraint.severity === 'block' ? 'block' : 'warn'
          message = `当前时间在禁止交易时段内`
        }
      }
      break
    }

    case 'weekday_only': {
      const allowedDays = rule.days || [1, 2, 3, 4, 5] // Mon-Fri default
      details = { currentDay: dayOfWeek, allowedDays }

      if (!allowedDays.includes(dayOfWeek)) {
        result = constraint.severity === 'block' ? 'block' : 'warn'
        message = `当前日期不在允许交易日内`
      }
      break
    }
  }

  const evaluation: ConstraintEvaluation = {
    constraintId: constraint.id,
    constraintName: constraint.name,
    category: constraint.category,
    result,
    details,
    evaluatedAt: Date.now(),
  }
  if (message) {
    evaluation.message = message
  }
  return evaluation
}

/**
 * Evaluate an asset constraint
 */
function evaluateAssetConstraint(
  constraint: AssetConstraint,
  context: ConstraintContext
): ConstraintEvaluation {
  const { rule } = constraint
  const { portfolio, pendingOrder, market } = context

  let result: ConstraintResult = 'pass'
  let message: string | undefined
  let details: Record<string, unknown> = {}

  switch (rule.type) {
    case 'whitelist': {
      if (pendingOrder && rule.assets) {
        details = { symbol: pendingOrder.symbol, whitelist: rule.assets }

        if (!rule.assets.includes(pendingOrder.symbol)) {
          result = constraint.severity === 'block' ? 'block' : 'warn'
          message = `${pendingOrder.symbol} 不在允许交易列表中`
        }
      }
      break
    }

    case 'blacklist': {
      if (pendingOrder && rule.assets) {
        details = { symbol: pendingOrder.symbol, blacklist: rule.assets }

        if (rule.assets.includes(pendingOrder.symbol)) {
          result = constraint.severity === 'block' ? 'block' : 'warn'
          message = `${pendingOrder.symbol} 在禁止交易列表中`
        }
      }
      break
    }

    case 'max_assets': {
      const currentAssets = new Set(portfolio.positions.map(p => p.symbol))
      if (pendingOrder && pendingOrder.side === 'buy') {
        currentAssets.add(pendingOrder.symbol)
      }
      const assetCount = currentAssets.size
      details = { assetCount, limit: rule.maxAssets }

      if (rule.maxAssets && assetCount > rule.maxAssets) {
        result = constraint.severity === 'block' ? 'block' : 'warn'
        message = `资产数量 ${assetCount} 超过限制 ${rule.maxAssets}`
      }
      break
    }

    case 'required_liquidity': {
      if (pendingOrder && rule.minVolume) {
        const symbolData = market[pendingOrder.symbol]
        const volume = symbolData.volume24h || 0
        details = { symbol: pendingOrder.symbol, volume24h: volume, minVolume: rule.minVolume }

        if (volume < rule.minVolume) {
          result = constraint.severity === 'block' ? 'block' : 'warn'
          message = `${pendingOrder.symbol} 24h成交量不足 (要求: $${rule.minVolume.toLocaleString()})`
        }
      }
      break
    }
  }

  const evaluation: ConstraintEvaluation = {
    constraintId: constraint.id,
    constraintName: constraint.name,
    category: constraint.category,
    result,
    details,
    evaluatedAt: Date.now(),
  }
  if (message) {
    evaluation.message = message
  }
  return evaluation
}

/**
 * Evaluate a frequency constraint
 */
function evaluateFrequencyConstraint(
  constraint: FrequencyConstraint,
  context: ConstraintContext
): ConstraintEvaluation {
  const { rule } = constraint
  const { stats } = context

  let result: ConstraintResult = 'pass'
  let message: string | undefined
  let details: Record<string, unknown> = {}

  switch (rule.type) {
    case 'max_orders': {
      let currentCount = 0
      switch (rule.period) {
        case 'hour':
          currentCount = stats.ordersThisHour
          break
        case 'day':
          currentCount = stats.ordersToday
          break
        case 'week':
          currentCount = stats.tradesThisWeek
          break
      }

      details = { currentCount, limit: rule.maxCount, period: rule.period }

      if (rule.maxCount && currentCount >= rule.maxCount) {
        result = constraint.severity === 'block' ? 'block' : 'warn'
        message = `订单数量 ${currentCount} 已达${rule.period === 'hour' ? '小时' : rule.period === 'day' ? '日' : '周'}限制 ${rule.maxCount}`
      }
      break
    }
  }

  const evaluation: ConstraintEvaluation = {
    constraintId: constraint.id,
    constraintName: constraint.name,
    category: constraint.category,
    result,
    details,
    evaluatedAt: Date.now(),
  }
  if (message) {
    evaluation.message = message
  }
  return evaluation
}

/**
 * Evaluate a loss constraint
 */
function evaluateLossConstraint(
  constraint: LossConstraint,
  context: ConstraintContext
): ConstraintEvaluation {
  const { rule } = constraint
  const { stats } = context

  let result: ConstraintResult = 'pass'
  let message: string | undefined
  let details: Record<string, unknown> = {}

  switch (rule.type) {
    case 'daily_loss_limit': {
      details = { dailyPnLPercent: stats.dailyPnLPercent, limit: rule.limitPercent }

      if (rule.limitPercent && Math.abs(stats.dailyPnLPercent) >= rule.limitPercent && stats.dailyPnLPercent < 0) {
        result = constraint.severity === 'block' ? 'block' : 'warn'
        message = `日亏损 ${Math.abs(stats.dailyPnLPercent).toFixed(2)}% 已达限制 ${rule.limitPercent}%`
      }
      break
    }

    case 'weekly_loss_limit': {
      details = { weeklyPnLPercent: stats.weeklyPnLPercent, limit: rule.limitPercent }

      if (rule.limitPercent && Math.abs(stats.weeklyPnLPercent) >= rule.limitPercent && stats.weeklyPnLPercent < 0) {
        result = constraint.severity === 'block' ? 'block' : 'warn'
        message = `周亏损 ${Math.abs(stats.weeklyPnLPercent).toFixed(2)}% 已达限制 ${rule.limitPercent}%`
      }
      break
    }

    case 'consecutive_loss_limit': {
      details = { consecutiveLosses: stats.consecutiveLosses, limit: rule.maxConsecutive }

      if (rule.maxConsecutive && stats.consecutiveLosses >= rule.maxConsecutive) {
        result = constraint.severity === 'block' ? 'block' : 'warn'
        message = `连续亏损 ${stats.consecutiveLosses} 次已达限制 ${rule.maxConsecutive} 次`
      }
      break
    }

    case 'drawdown_limit': {
      details = { currentDrawdown: stats.currentDrawdown, limit: rule.maxDrawdown }

      if (rule.maxDrawdown && stats.currentDrawdown >= rule.maxDrawdown) {
        result = constraint.severity === 'block' ? 'block' : 'warn'
        message = `当前回撤 ${stats.currentDrawdown.toFixed(2)}% 已达限制 ${rule.maxDrawdown}%`
      }
      break
    }
  }

  const evaluation: ConstraintEvaluation = {
    constraintId: constraint.id,
    constraintName: constraint.name,
    category: constraint.category,
    result,
    details,
    evaluatedAt: Date.now(),
  }
  if (message) {
    evaluation.message = message
  }
  return evaluation
}

/**
 * Evaluate an execution constraint
 */
function evaluateExecutionConstraint(
  constraint: ExecutionConstraint,
  context: ConstraintContext
): ConstraintEvaluation {
  const { rule } = constraint
  const { pendingOrder, market } = context

  let result: ConstraintResult = 'pass'
  let message: string | undefined
  let details: Record<string, unknown> = {}

  if (!pendingOrder) {
    return {
      constraintId: constraint.id,
      constraintName: constraint.name,
      category: constraint.category,
      result: 'pass',
      evaluatedAt: Date.now(),
    }
  }

  switch (rule.type) {
    case 'order_type_restriction': {
      if (rule.allowedOrderTypes) {
        details = { orderType: pendingOrder.type, allowedTypes: rule.allowedOrderTypes }

        if (!rule.allowedOrderTypes.includes(pendingOrder.type)) {
          result = constraint.severity === 'block' ? 'block' : 'warn'
          message = `订单类型 ${pendingOrder.type} 不在允许列表中`
        }
      }
      break
    }

    case 'max_spread': {
      const symbolData = market[pendingOrder.symbol]
      const spreadPercent = symbolData.spreadPercent || 0
      details = { spreadPercent, limit: rule.maxSpreadPercent }

      if (rule.maxSpreadPercent && spreadPercent > rule.maxSpreadPercent) {
        result = constraint.severity === 'block' ? 'block' : 'warn'
        message = `当前点差 ${spreadPercent.toFixed(2)}% 超过限制 ${rule.maxSpreadPercent}%`
      }
      break
    }
  }

  const evaluation: ConstraintEvaluation = {
    constraintId: constraint.id,
    constraintName: constraint.name,
    category: constraint.category,
    result,
    details,
    evaluatedAt: Date.now(),
  }
  if (message) {
    evaluation.message = message
  }
  return evaluation
}

// =============================================================================
// Main Constraint Engine
// =============================================================================

/**
 * Evaluate a single constraint
 */
export function evaluateConstraint(
  constraint: Constraint,
  context: ConstraintContext
): ConstraintEvaluation {
  if (!constraint.enabled) {
    return {
      constraintId: constraint.id,
      constraintName: constraint.name,
      category: constraint.category,
      result: 'pass',
      message: 'Constraint disabled',
      evaluatedAt: Date.now(),
    }
  }

  switch (constraint.category) {
    case 'position':
      return evaluatePositionConstraint(constraint, context)
    case 'timing':
      return evaluateTimingConstraint(constraint, context)
    case 'asset':
      return evaluateAssetConstraint(constraint, context)
    case 'frequency':
      return evaluateFrequencyConstraint(constraint, context)
    case 'loss':
      return evaluateLossConstraint(constraint, context)
    case 'execution':
      return evaluateExecutionConstraint(constraint, context)
    default:
      return {
        constraintId: constraint.id,
        constraintName: constraint.name,
        category: constraint.category,
        result: 'pass',
        message: 'Unknown constraint type',
        evaluatedAt: Date.now(),
      }
  }
}

/**
 * Evaluate all constraints
 */
export function evaluateAllConstraints(
  constraints: Constraint[],
  context: ConstraintContext
): ConstraintValidationResult {
  // Sort by priority
  const sortedConstraints = [...constraints].sort((a, b) => a.priority - b.priority)

  // Evaluate each constraint
  const evaluations = sortedConstraints.map(constraint => evaluateConstraint(constraint, context))

  // Categorize results
  const blockers = evaluations.filter(e => e.result === 'block')
  const warnings = evaluations.filter(e => e.result === 'warn')
  const passed = evaluations.filter(e => e.result === 'pass')

  // Determine overall result
  let overallResult: ConstraintResult = 'pass'
  if (blockers.length > 0) {
    overallResult = 'block'
  } else if (warnings.length > 0) {
    overallResult = 'warn'
  }

  return {
    valid: blockers.length === 0,
    overallResult,
    evaluations,
    blockers,
    warnings,
    passed,
    evaluatedAt: Date.now(),
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create a default context for testing
 */
export function createDefaultContext(): ConstraintContext {
  return {
    currentTime: new Date(),
    portfolio: {
      totalValue: 10000,
      cashAvailable: 5000,
      positions: [],
    },
    stats: {
      dailyPnL: 0,
      dailyPnLPercent: 0,
      weeklyPnL: 0,
      weeklyPnLPercent: 0,
      consecutiveLosses: 0,
      ordersToday: 0,
      ordersThisHour: 0,
      tradesThisWeek: 0,
      currentDrawdown: 0,
    },
    market: {},
  }
}

/**
 * Format constraint result for display
 */
export function formatConstraintResult(result: ConstraintResult): string {
  switch (result) {
    case 'pass':
      return '通过'
    case 'warn':
      return '警告'
    case 'block':
      return '阻止'
  }
}
