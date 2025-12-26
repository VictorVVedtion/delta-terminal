/**
 * Risk Management Types
 * Story 4.1: 风险配置类型定义
 *
 * 定义止损止盈、仓位限制等风险管理相关类型
 */

// =============================================================================
// Risk Level
// =============================================================================

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

// =============================================================================
// Stop Loss Configuration
// =============================================================================

export interface StopLossConfig {
  /** Whether stop loss is enabled */
  enabled: boolean
  /** Stop loss type */
  type: 'fixed_price' | 'percentage'
  /** Stop loss value (price or percentage) */
  value: number
}

// =============================================================================
// Take Profit Configuration
// =============================================================================

export interface TakeProfitConfig {
  /** Whether take profit is enabled */
  enabled: boolean
  /** Take profit type */
  type: 'fixed_price' | 'percentage'
  /** Take profit value (price or percentage) */
  value: number
}

// =============================================================================
// Position Limit Configuration
// =============================================================================

export interface PositionLimitConfig {
  /** Maximum position size as percentage of total capital (0-100) */
  maxPositionPercent: number
  /** Maximum single trade amount in USDT */
  maxTradeAmount: number
}

// =============================================================================
// Combined Risk Settings
// =============================================================================

export interface RiskSettings {
  /** Stop loss configuration */
  stopLoss: StopLossConfig
  /** Take profit configuration */
  takeProfit: TakeProfitConfig
  /** Position limit configuration */
  positionLimit: PositionLimitConfig
}

// =============================================================================
// Risk Validation
// =============================================================================

export interface ValidationMessage {
  /** Field that has the issue */
  field: string
  /** Human-readable message */
  message: string
  /** Error code for programmatic handling */
  code: string
}

export interface RiskValidationResult {
  /** Whether the settings are valid */
  valid: boolean
  /** List of errors (must fix before deploy) */
  errors: ValidationMessage[]
  /** List of warnings (can proceed but risky) */
  warnings: ValidationMessage[]
  /** Calculated risk level */
  riskLevel: RiskLevel
  /** Risk summary for display */
  summary: {
    /** Maximum possible loss amount */
    maxLoss: number
    /** Maximum possible gain amount */
    maxGain: number
    /** Risk/Reward ratio */
    riskRewardRatio: number
  }
}

// =============================================================================
// Default Values
// =============================================================================

export const DEFAULT_STOP_LOSS: StopLossConfig = {
  enabled: true,
  type: 'percentage',
  value: 5,
}

export const DEFAULT_TAKE_PROFIT: TakeProfitConfig = {
  enabled: true,
  type: 'percentage',
  value: 15,
}

export const DEFAULT_POSITION_LIMIT: PositionLimitConfig = {
  maxPositionPercent: 20,
  maxTradeAmount: 10000,
}

export const DEFAULT_RISK_SETTINGS: RiskSettings = {
  stopLoss: DEFAULT_STOP_LOSS,
  takeProfit: DEFAULT_TAKE_PROFIT,
  positionLimit: DEFAULT_POSITION_LIMIT,
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate risk level based on settings
 */
export function calculateRiskLevel(settings: RiskSettings): RiskLevel {
  const { stopLoss, takeProfit, positionLimit } = settings

  // No stop loss = high risk
  if (!stopLoss.enabled) return 'high'

  // Very high stop loss (>15%) = high risk
  if (stopLoss.type === 'percentage' && stopLoss.value > 15) return 'high'

  // High stop loss (>10%) = medium risk
  if (stopLoss.type === 'percentage' && stopLoss.value > 10) return 'medium'

  // Large position (>40%) = medium risk
  if (positionLimit.maxPositionPercent > 40) return 'medium'

  // Poor risk/reward ratio
  if (takeProfit.enabled && stopLoss.enabled) {
    const ratio = takeProfit.value / stopLoss.value
    if (ratio < 1.5) return 'medium'
  }

  return 'low'
}

/**
 * Calculate trigger price based on current price and settings
 */
export function calculateTriggerPrice(
  currentPrice: number,
  config: StopLossConfig | TakeProfitConfig,
  isStopLoss: boolean
): number {
  if (config.type === 'fixed_price') {
    return config.value
  }

  // Percentage calculation
  const multiplier = isStopLoss
    ? 1 - config.value / 100
    : 1 + config.value / 100

  return currentPrice * multiplier
}

/**
 * Format currency value
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}
