/**
 * useConstraintValidation Hook
 * V3 Design Document: Constraint System Integration
 *
 * Hook for validating trading constraints in React components.
 * Provides real-time constraint evaluation for pending orders
 * and portfolio state.
 */

import { useMemo, useCallback } from 'react'
import {
  evaluateAllConstraints,
  evaluateConstraint,
  createDefaultContext,
} from '@/lib/constraint-engine'
import type {
  Constraint,
  ConstraintContext,
  ConstraintValidationResult,
  ConstraintEvaluation,
  PendingOrder,
  PortfolioPosition,
  TradingStats,
  MarketData,
} from '@/types/constraint'

// =============================================================================
// Types
// =============================================================================

export interface UseConstraintValidationOptions {
  /** Active constraints to evaluate */
  constraints: Constraint[]
  /** Portfolio positions */
  positions?: PortfolioPosition[]
  /** Total portfolio value */
  totalValue?: number
  /** Available cash */
  cashAvailable?: number
  /** Trading statistics */
  stats?: Partial<TradingStats>
  /** Market data */
  market?: MarketData
  /** Auto-update on context changes */
  autoUpdate?: boolean
}

export interface UseConstraintValidationResult {
  /** Validate a pending order against all constraints */
  validateOrder: (order: PendingOrder) => ConstraintValidationResult
  /** Validate current portfolio state (without pending order) */
  validatePortfolio: () => ConstraintValidationResult
  /** Evaluate a single constraint */
  evaluateSingle: (constraint: Constraint, order?: PendingOrder) => ConstraintEvaluation
  /** Get current context */
  getContext: (order?: PendingOrder) => ConstraintContext
  /** Check if a specific constraint would pass */
  wouldPass: (constraintId: string, order?: PendingOrder) => boolean
  /** Get all blocking constraints for an order */
  getBlockers: (order: PendingOrder) => ConstraintEvaluation[]
  /** Get all warnings for an order */
  getWarnings: (order: PendingOrder) => ConstraintEvaluation[]
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useConstraintValidation(
  options: UseConstraintValidationOptions
): UseConstraintValidationResult {
  const {
    constraints,
    positions = [],
    totalValue = 10000,
    cashAvailable = 5000,
    stats = {},
    market = {},
  } = options

  // Build context from options
  const baseContext = useMemo<Omit<ConstraintContext, 'pendingOrder'>>(
    () => ({
      currentTime: new Date(),
      portfolio: {
        totalValue,
        cashAvailable,
        positions,
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
        ...stats,
      },
      market,
    }),
    [totalValue, cashAvailable, positions, stats, market]
  )

  // Get context with optional pending order
  const getContext = useCallback(
    (order?: PendingOrder): ConstraintContext => {
      const context: ConstraintContext = {
        ...baseContext,
        currentTime: new Date(), // Always use current time
      }
      if (order) {
        context.pendingOrder = order
      }
      return context
    },
    [baseContext]
  )

  // Validate a pending order
  const validateOrder = useCallback(
    (order: PendingOrder): ConstraintValidationResult => {
      const context = getContext(order)
      return evaluateAllConstraints(constraints, context)
    },
    [constraints, getContext]
  )

  // Validate current portfolio state
  const validatePortfolio = useCallback((): ConstraintValidationResult => {
    const context = getContext()
    return evaluateAllConstraints(constraints, context)
  }, [constraints, getContext])

  // Evaluate a single constraint
  const evaluateSingle = useCallback(
    (constraint: Constraint, order?: PendingOrder): ConstraintEvaluation => {
      const context = getContext(order)
      return evaluateConstraint(constraint, context)
    },
    [getContext]
  )

  // Check if a specific constraint would pass
  const wouldPass = useCallback(
    (constraintId: string, order?: PendingOrder): boolean => {
      const constraint = constraints.find(c => c.id === constraintId)
      if (!constraint) return true

      const evaluation = evaluateSingle(constraint, order)
      return evaluation.result === 'pass'
    },
    [constraints, evaluateSingle]
  )

  // Get all blocking constraints for an order
  const getBlockers = useCallback(
    (order: PendingOrder): ConstraintEvaluation[] => {
      const result = validateOrder(order)
      return result.blockers
    },
    [validateOrder]
  )

  // Get all warnings for an order
  const getWarnings = useCallback(
    (order: PendingOrder): ConstraintEvaluation[] => {
      const result = validateOrder(order)
      return result.warnings
    },
    [validateOrder]
  )

  return {
    validateOrder,
    validatePortfolio,
    evaluateSingle,
    getContext,
    wouldPass,
    getBlockers,
    getWarnings,
  }
}

// =============================================================================
// Convenience Hook for Quick Validation
// =============================================================================

export interface QuickValidateOptions {
  /** Pending order to validate */
  order: PendingOrder
  /** Constraints to check */
  constraints: Constraint[]
  /** Portfolio total value */
  totalValue?: number
}

/**
 * Quick validation for a single order
 * Returns a simple pass/fail with messages
 */
export function useQuickValidate(options: QuickValidateOptions) {
  const { order, constraints, totalValue = 10000 } = options

  return useMemo(() => {
    const context: ConstraintContext = {
      ...createDefaultContext(),
      portfolio: {
        totalValue,
        cashAvailable: totalValue,
        positions: [],
      },
      pendingOrder: order,
    }

    const result = evaluateAllConstraints(constraints, context)

    return {
      valid: result.valid,
      blockerCount: result.blockers.length,
      warningCount: result.warnings.length,
      messages: [
        ...result.blockers.map(b => ({ type: 'error' as const, message: b.message || b.constraintName })),
        ...result.warnings.map(w => ({ type: 'warning' as const, message: w.message || w.constraintName })),
      ],
    }
  }, [order, constraints, totalValue])
}

// =============================================================================
// Exports
// =============================================================================

export default useConstraintValidation
