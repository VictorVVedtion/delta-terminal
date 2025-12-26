/**
 * Safety System Types
 * V3 Design Document: S28, S30, S31
 *
 * Core safety features for trading protection:
 * - Kill Switch (S30)
 * - Approval Flow (S31)
 * - Margin Alert (S28)
 * - Circuit Breaker
 */

// ============================================================================
// Kill Switch Types (S30)
// ============================================================================

/** Kill Switch current status */
export type KillSwitchStatus = 'ready' | 'triggered' | 'cooldown'

/** Kill Switch execution result */
export interface KillSwitchResult {
  success: boolean
  stoppedStrategies: number
  cancelledOrders: number
  closedPositions: number
  timestamp: number
  executionTime: number // milliseconds
  errors?: string[]
}

/** Kill Switch configuration */
export interface KillSwitchConfig {
  confirmMethod: 'longPress' | 'doubleClick'
  longPressDuration: number // milliseconds
  closePositionsDefault: boolean
  cooldownDuration: number // milliseconds after trigger
}

// ============================================================================
// Approval Flow Types (S31)
// ============================================================================

/** Approval step identifier */
export type ApprovalStep =
  | 'risk_review'      // Step 1: Risk disclosure and acknowledgment
  | 'capital_confirm'  // Step 2: Capital and settings confirmation
  | 'final_confirm'    // Step 3: Final deployment confirmation

/** Approval flow state */
export interface ApprovalState {
  currentStep: ApprovalStep
  completedSteps: ApprovalStep[]
  riskAcknowledged: boolean
  capitalConfirmed: boolean
  cooldownRemaining?: number // seconds remaining in cooling period
  approvalToken?: string
  expiresAt?: number // token expiration timestamp
}

/** Approval flow configuration */
export interface ApprovalConfig {
  coolingPeriodEnabled: boolean
  coolingPeriodMinutes: number
  requireRiskAcknowledge: boolean
  tokenValidityMinutes: number
}

/** Risk disclosure item */
export interface RiskDisclosure {
  id: string
  title: string
  description: string
  severity: 'info' | 'warning' | 'danger'
}

/** Approval history record */
export interface ApprovalRecord {
  id: string
  strategyId: string
  strategyName: string
  approvedAt: number
  capital: number
  mode: 'paper' | 'live'
  riskLevel: 'low' | 'medium' | 'high'
}

// ============================================================================
// Margin Alert Types (S28)
// ============================================================================

/** Margin alert level */
export type MarginAlertLevel = 'safe' | 'warning' | 'danger' | 'critical'

/** Margin status */
export interface MarginStatus {
  marginRatio: number           // Margin ratio percentage (0-100)
  usedMargin: number           // Used margin amount
  availableMargin: number      // Available margin amount
  totalEquity: number          // Total account equity
  alertLevel: MarginAlertLevel
  estimatedLiquidationPrice?: number
  lastUpdated: number
}

/** Margin alert configuration */
export interface MarginAlertConfig {
  enabled: boolean
  soundEnabled: boolean
  autoReducePosition: boolean
  thresholds: {
    safe: number      // > this = safe (default 50)
    warning: number   // > this = warning (default 30)
    danger: number    // > this = danger (default 15)
    // < danger = critical
  }
}

/** Margin alert notification */
export interface MarginAlertNotification {
  level: MarginAlertLevel
  marginRatio: number
  message: string
  timestamp: number
  acknowledged: boolean
}

// ============================================================================
// Circuit Breaker Types
// ============================================================================

/** Circuit breaker trigger reason */
export type CircuitBreakerTrigger =
  | 'daily_loss_limit'
  | 'hourly_loss_limit'
  | 'consecutive_losses'
  | 'manual'
  | 'market_anomaly'

/** Circuit breaker status */
export interface CircuitBreakerStatus {
  triggered: boolean
  triggerReason?: CircuitBreakerTrigger
  triggeredAt?: number
  resumeAt?: number
  currentDailyLoss: number      // percentage
  currentHourlyLoss: number     // percentage
  consecutiveLosses: number
  canResume: boolean
}

/** Circuit breaker configuration */
export interface CircuitBreakerConfig {
  enabled: boolean
  dailyLossLimit: number        // percentage (default 10%)
  hourlyLossLimit: number       // percentage (default 5%)
  consecutiveLossLimit: number  // count (default 5)
  autoResume: boolean
  resumeAfterMinutes: number
}

// ============================================================================
// Combined Safety Status
// ============================================================================

/** Overall safety status */
export interface SafetyStatus {
  killSwitch: {
    status: KillSwitchStatus
    lastTriggered?: number
    cooldownUntil?: number
  }
  margin: MarginStatus
  circuitBreaker: CircuitBreakerStatus
  lastUpdated: number
  overallHealth: 'healthy' | 'warning' | 'critical'
}

/** Safety configuration */
export interface SafetyConfig {
  killSwitch: KillSwitchConfig
  approval: ApprovalConfig
  marginAlert: MarginAlertConfig
  circuitBreaker: CircuitBreakerConfig
}

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_KILL_SWITCH_CONFIG: KillSwitchConfig = {
  confirmMethod: 'longPress',
  longPressDuration: 3000,
  closePositionsDefault: false,
  cooldownDuration: 5000,
}

export const DEFAULT_APPROVAL_CONFIG: ApprovalConfig = {
  coolingPeriodEnabled: false,
  coolingPeriodMinutes: 5,
  requireRiskAcknowledge: true,
  tokenValidityMinutes: 5,
}

export const DEFAULT_MARGIN_ALERT_CONFIG: MarginAlertConfig = {
  enabled: true,
  soundEnabled: true,
  autoReducePosition: false,
  thresholds: {
    safe: 50,
    warning: 30,
    danger: 15,
  },
}

export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  enabled: true,
  dailyLossLimit: 10,
  hourlyLossLimit: 5,
  consecutiveLossLimit: 5,
  autoResume: false,
  resumeAfterMinutes: 60,
}

export const DEFAULT_SAFETY_CONFIG: SafetyConfig = {
  killSwitch: DEFAULT_KILL_SWITCH_CONFIG,
  approval: DEFAULT_APPROVAL_CONFIG,
  marginAlert: DEFAULT_MARGIN_ALERT_CONFIG,
  circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
}

// ============================================================================
// Risk Disclosures (for Approval Flow)
// ============================================================================

export const RISK_DISCLOSURES: RiskDisclosure[] = [
  {
    id: 'real_funds',
    title: 'Real Funds at Risk',
    description: 'This strategy will execute trades using your real funds. All profits and losses will affect your actual account balance.',
    severity: 'danger',
  },
  {
    id: 'no_guarantee',
    title: 'No Performance Guarantee',
    description: 'Historical backtest results do not guarantee future performance. Market conditions can change rapidly.',
    severity: 'warning',
  },
  {
    id: 'market_volatility',
    title: 'Market Volatility Risk',
    description: 'Cryptocurrency markets are highly volatile. Prices can move significantly in short periods, potentially exceeding stop-loss levels.',
    severity: 'warning',
  },
  {
    id: 'technical_risk',
    title: 'Technical Risk',
    description: 'Technical issues such as network delays, exchange downtime, or system errors may affect trade execution.',
    severity: 'info',
  },
  {
    id: 'liquidity_risk',
    title: 'Liquidity Risk',
    description: 'In some market conditions, orders may not execute at expected prices due to low liquidity.',
    severity: 'info',
  },
]

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate margin alert level based on margin ratio
 */
export function calculateMarginAlertLevel(
  marginRatio: number,
  thresholds: MarginAlertConfig['thresholds']
): MarginAlertLevel {
  if (marginRatio >= thresholds.safe) return 'safe'
  if (marginRatio >= thresholds.warning) return 'warning'
  if (marginRatio >= thresholds.danger) return 'danger'
  return 'critical'
}

/**
 * Calculate overall safety health
 */
export function calculateSafetyHealth(status: SafetyStatus): 'healthy' | 'warning' | 'critical' {
  // Critical conditions
  if (status.killSwitch.status === 'triggered') return 'critical'
  if (status.circuitBreaker.triggered) return 'critical'
  if (status.margin.alertLevel === 'critical') return 'critical'

  // Warning conditions
  if (status.margin.alertLevel === 'danger') return 'warning'
  if (status.margin.alertLevel === 'warning') return 'warning'
  if (status.circuitBreaker.currentDailyLoss > 5) return 'warning'

  return 'healthy'
}

/**
 * Generate approval token
 */
export function generateApprovalToken(): string {
  return `approval_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

/**
 * Check if approval token is valid
 */
export function isApprovalTokenValid(
  token: string | undefined,
  expiresAt: number | undefined
): boolean {
  if (!token || !expiresAt) return false
  return Date.now() < expiresAt
}
