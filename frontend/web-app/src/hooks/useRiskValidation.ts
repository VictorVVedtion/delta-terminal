'use client'

import { useMemo } from 'react'

import type {
  RiskSettings,
  RiskValidationResult,
  ValidationMessage} from '@/types/risk';
import {
  calculateRiskLevel
} from '@/types/risk'

// =============================================================================
// Types
// =============================================================================

export interface RiskValidationOptions {
  /** Risk settings to validate */
  settings: RiskSettings
  /** Trading mode - live mode has stricter requirements */
  mode: 'paper' | 'live'
  /** Total capital for position size calculations */
  totalCapital?: number
}

// =============================================================================
// Validation Rules
// =============================================================================

/**
 * Validate risk settings based on mode and business rules
 */
function validateRiskSettings(
  settings: RiskSettings,
  mode: 'paper' | 'live',
  totalCapital = 10000
): RiskValidationResult {
  const errors: ValidationMessage[] = []
  const warnings: ValidationMessage[] = []

  const { stopLoss, takeProfit, positionLimit } = settings

  // ==========================================================================
  // Error Validations (must fix before deploy)
  // ==========================================================================

  // Rule: Live mode requires stop loss
  if (mode === 'live' && !stopLoss.enabled) {
    errors.push({
      field: 'stopLoss.enabled',
      message: 'Live 模式必须设置止损',
      code: 'STOP_LOSS_REQUIRED',
    })
  }

  // Rule: Stop loss must be less than take profit (when both percentage type)
  if (
    stopLoss.enabled &&
    takeProfit.enabled &&
    stopLoss.type === 'percentage' &&
    takeProfit.type === 'percentage' &&
    stopLoss.value >= takeProfit.value
  ) {
    errors.push({
      field: 'stopLoss.value',
      message: '止损百分比必须小于止盈百分比',
      code: 'STOP_LOSS_GREATER_THAN_TAKE_PROFIT',
    })
  }

  // Rule: Stop loss value must be positive
  if (stopLoss.enabled && stopLoss.value <= 0) {
    errors.push({
      field: 'stopLoss.value',
      message: '止损值必须大于 0',
      code: 'STOP_LOSS_INVALID',
    })
  }

  // Rule: Take profit value must be positive
  if (takeProfit.enabled && takeProfit.value <= 0) {
    errors.push({
      field: 'takeProfit.value',
      message: '止盈值必须大于 0',
      code: 'TAKE_PROFIT_INVALID',
    })
  }

  // Rule: Max trade amount cannot exceed max position value
  const maxPositionValue = (totalCapital * positionLimit.maxPositionPercent) / 100
  if (positionLimit.maxTradeAmount > maxPositionValue) {
    errors.push({
      field: 'positionLimit.maxTradeAmount',
      message: `单笔最大金额不能超过最大仓位 (${formatCurrency(maxPositionValue)})`,
      code: 'TRADE_AMOUNT_EXCEEDS_POSITION',
    })
  }

  // ==========================================================================
  // Warning Validations (can proceed but risky)
  // ==========================================================================

  // Rule: High stop loss warning (>10%)
  if (
    stopLoss.enabled &&
    stopLoss.type === 'percentage' &&
    stopLoss.value > 10
  ) {
    warnings.push({
      field: 'stopLoss.value',
      message: '止损超过 10%，风险较高',
      code: 'STOP_LOSS_HIGH',
    })
  }

  // Rule: Very high stop loss warning (>20%)
  if (
    stopLoss.enabled &&
    stopLoss.type === 'percentage' &&
    stopLoss.value > 20
  ) {
    warnings.push({
      field: 'stopLoss.value',
      message: '止损超过 20%，风险极高，建议降低',
      code: 'STOP_LOSS_CRITICAL',
    })
  }

  // Rule: Large position warning (>50%)
  if (positionLimit.maxPositionPercent > 50) {
    warnings.push({
      field: 'positionLimit.maxPositionPercent',
      message: '单策略仓位超过 50%，建议分散风险',
      code: 'POSITION_SIZE_HIGH',
    })
  }

  // Rule: Poor risk/reward ratio warning (<2)
  if (
    stopLoss.enabled &&
    takeProfit.enabled &&
    stopLoss.type === 'percentage' &&
    takeProfit.type === 'percentage' &&
    stopLoss.value > 0
  ) {
    const ratio = takeProfit.value / stopLoss.value
    if (ratio < 1.5) {
      warnings.push({
        field: 'takeProfit.value',
        message: `风险收益比为 1:${ratio.toFixed(1)}，建议至少 1:2`,
        code: 'RISK_REWARD_LOW',
      })
    }
  }

  // Rule: No take profit warning
  if (!takeProfit.enabled) {
    warnings.push({
      field: 'takeProfit.enabled',
      message: '未设置止盈，可能错过最佳获利时机',
      code: 'TAKE_PROFIT_NOT_SET',
    })
  }

  // Rule: No stop loss in paper mode (soft warning)
  if (mode === 'paper' && !stopLoss.enabled) {
    warnings.push({
      field: 'stopLoss.enabled',
      message: '模拟模式未设置止损，建议配置以便测试',
      code: 'STOP_LOSS_NOT_SET_PAPER',
    })
  }

  // ==========================================================================
  // Calculate Summary
  // ==========================================================================

  const summary = calculateSummary(settings, totalCapital)
  const riskLevel = calculateRiskLevel(settings)

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    riskLevel,
    summary,
  }
}

/**
 * Calculate risk summary values
 */
function calculateSummary(
  settings: RiskSettings,
  totalCapital: number
): RiskValidationResult['summary'] {
  const { stopLoss, takeProfit, positionLimit } = settings

  const maxPositionValue = (totalCapital * positionLimit.maxPositionPercent) / 100

  // Calculate max loss
  let maxLoss = maxPositionValue // Default: could lose entire position
  if (stopLoss.enabled) {
    if (stopLoss.type === 'percentage') {
      maxLoss = (maxPositionValue * stopLoss.value) / 100
    } else {
      // Fixed price - estimate based on typical 5% move
      maxLoss = maxPositionValue * 0.05
    }
  }

  // Calculate max gain
  let maxGain = maxPositionValue // Default: could double position
  if (takeProfit.enabled) {
    if (takeProfit.type === 'percentage') {
      maxGain = (maxPositionValue * takeProfit.value) / 100
    } else {
      // Fixed price - estimate based on typical 10% gain
      maxGain = maxPositionValue * 0.10
    }
  }

  // Calculate risk/reward ratio
  let riskRewardRatio = 0
  if (
    stopLoss.enabled &&
    takeProfit.enabled &&
    stopLoss.type === 'percentage' &&
    takeProfit.type === 'percentage' &&
    stopLoss.value > 0
  ) {
    riskRewardRatio = takeProfit.value / stopLoss.value
  }

  return {
    maxLoss,
    maxGain,
    riskRewardRatio,
  }
}

/**
 * Format currency for display in messages
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

// =============================================================================
// Hook
// =============================================================================

/**
 * useRiskValidation Hook
 *
 * Validates risk settings and returns errors, warnings, and risk assessment.
 *
 * @example
 * ```tsx
 * const { valid, errors, warnings, riskLevel, summary } = useRiskValidation({
 *   settings: riskSettings,
 *   mode: 'live',
 *   totalCapital: 10000,
 * })
 *
 * if (!valid) {
 *   // Show errors, disable deploy button
 * }
 * ```
 */
export function useRiskValidation(
  options: RiskValidationOptions
): RiskValidationResult {
  const { settings, mode, totalCapital = 10000 } = options

  // Memoize validation to prevent unnecessary recalculations
  const result = useMemo(() => {
    return validateRiskSettings(settings, mode, totalCapital)
  }, [settings, mode, totalCapital])

  return result
}

// =============================================================================
// Standalone Validation Function (for non-React usage)
// =============================================================================

export { validateRiskSettings }

export default useRiskValidation
