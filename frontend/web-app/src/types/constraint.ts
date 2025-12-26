/**
 * Constraint System Types
 * V3 Design Document: Trading Constraints & Rule Engine
 *
 * A comprehensive constraint system for:
 * - Position size limits
 * - Trading time restrictions
 * - Asset/pair restrictions
 * - Order frequency limits
 * - Daily loss limits
 * - Correlation constraints
 */

// =============================================================================
// Constraint Types
// =============================================================================

/** Constraint category */
export type ConstraintCategory =
  | 'position'     // Position size related
  | 'timing'       // Time-based restrictions
  | 'asset'        // Asset/pair restrictions
  | 'frequency'    // Order frequency limits
  | 'loss'         // Loss limits
  | 'correlation'  // Correlation/diversification
  | 'execution'    // Order execution constraints
  | 'custom'       // User-defined constraints

/** Constraint evaluation result */
export type ConstraintResult = 'pass' | 'warn' | 'block'

/** Time period for time-based constraints */
export type TimePeriod = 'minute' | 'hour' | 'day' | 'week' | 'month'

/** Comparison operator for numeric constraints */
export type CompareOperator = 'lt' | 'lte' | 'eq' | 'gte' | 'gt' | 'between'

// =============================================================================
// Constraint Definitions
// =============================================================================

/** Base constraint definition */
export interface ConstraintBase {
  /** Unique constraint ID */
  id: string
  /** Human-readable name */
  name: string
  /** Description */
  description?: string
  /** Constraint category */
  category: ConstraintCategory
  /** Whether constraint is active */
  enabled: boolean
  /** Priority (lower = evaluated first) */
  priority: number
  /** Result when constraint fails: 'warn' shows warning, 'block' prevents action */
  severity: 'warn' | 'block'
  /** Created timestamp */
  createdAt: number
  /** Last modified timestamp */
  updatedAt?: number
}

/** Position size constraint */
export interface PositionConstraint extends ConstraintBase {
  category: 'position'
  rule: {
    type: 'max_position_percent' | 'max_position_value' | 'max_leverage' | 'min_position_value'
    value: number
    perAsset?: boolean // Apply per asset or total portfolio
  }
}

/** Trading time constraint */
export interface TimingConstraint extends ConstraintBase {
  category: 'timing'
  rule: {
    type: 'trading_hours' | 'no_trading_hours' | 'weekday_only' | 'avoid_news'
    /** Time windows in HH:MM format (UTC) */
    windows?: { start: string; end: string }[]
    /** Days of week (0 = Sunday, 6 = Saturday) */
    days?: number[]
    /** Minutes before/after news events to avoid */
    newsBufferMinutes?: number
  }
}

/** Asset restriction constraint */
export interface AssetConstraint extends ConstraintBase {
  category: 'asset'
  rule: {
    type: 'whitelist' | 'blacklist' | 'max_assets' | 'required_liquidity'
    /** List of asset symbols */
    assets?: string[]
    /** Maximum number of different assets */
    maxAssets?: number
    /** Minimum 24h volume (USD) */
    minVolume?: number
  }
}

/** Order frequency constraint */
export interface FrequencyConstraint extends ConstraintBase {
  category: 'frequency'
  rule: {
    type: 'max_orders' | 'min_interval' | 'max_trades'
    /** Maximum number of orders/trades */
    maxCount?: number
    /** Minimum interval between orders (seconds) */
    minIntervalSeconds?: number
    /** Time period for counting */
    period: TimePeriod
  }
}

/** Loss limit constraint */
export interface LossConstraint extends ConstraintBase {
  category: 'loss'
  rule: {
    type: 'daily_loss_limit' | 'weekly_loss_limit' | 'consecutive_loss_limit' | 'drawdown_limit'
    /** Loss limit percentage */
    limitPercent?: number
    /** Maximum consecutive losses */
    maxConsecutive?: number
    /** Maximum drawdown percentage */
    maxDrawdown?: number
  }
}

/** Correlation constraint */
export interface CorrelationConstraint extends ConstraintBase {
  category: 'correlation'
  rule: {
    type: 'max_correlation' | 'min_diversification'
    /** Maximum correlation coefficient */
    maxCorrelation?: number
    /** Minimum number of different sectors/categories */
    minSectors?: number
  }
}

/** Execution constraint */
export interface ExecutionConstraint extends ConstraintBase {
  category: 'execution'
  rule: {
    type: 'order_type_restriction' | 'slippage_limit' | 'max_spread'
    /** Allowed order types */
    allowedOrderTypes?: ('market' | 'limit' | 'stop' | 'stop_limit')[]
    /** Maximum slippage percentage */
    maxSlippagePercent?: number
    /** Maximum spread percentage */
    maxSpreadPercent?: number
  }
}

/** Custom constraint with expression */
export interface CustomConstraint extends ConstraintBase {
  category: 'custom'
  rule: {
    /** Expression to evaluate (e.g., "position.value < 1000 && time.hour >= 9") */
    expression: string
    /** Variables available in expression */
    variables: string[]
  }
}

/** Union type for all constraints */
export type Constraint =
  | PositionConstraint
  | TimingConstraint
  | AssetConstraint
  | FrequencyConstraint
  | LossConstraint
  | CorrelationConstraint
  | ExecutionConstraint
  | CustomConstraint

// =============================================================================
// Constraint Evaluation Context
// =============================================================================

/** Context provided for constraint evaluation */
export interface ConstraintContext {
  /** Current time (UTC) */
  currentTime: Date
  /** Portfolio state */
  portfolio: {
    totalValue: number
    cashAvailable: number
    positions: PortfolioPosition[]
  }
  /** Pending order being evaluated */
  pendingOrder?: PendingOrder
  /** Trading statistics */
  stats: TradingStats
  /** Market data */
  market: MarketData
}

export interface PortfolioPosition {
  symbol: string
  quantity: number
  value: number
  entryPrice: number
  currentPrice: number
  unrealizedPnL: number
  unrealizedPnLPercent: number
}

export interface PendingOrder {
  symbol: string
  side: 'buy' | 'sell'
  type: 'market' | 'limit' | 'stop' | 'stop_limit'
  quantity: number
  price?: number
  stopPrice?: number
  estimatedValue: number
}

export interface TradingStats {
  dailyPnL: number
  dailyPnLPercent: number
  weeklyPnL: number
  weeklyPnLPercent: number
  consecutiveLosses: number
  ordersToday: number
  ordersThisHour: number
  tradesThisWeek: number
  currentDrawdown: number
}

export interface MarketData {
  [symbol: string]: {
    price: number
    volume24h: number
    spread: number
    spreadPercent: number
  }
}

// =============================================================================
// Constraint Evaluation Result
// =============================================================================

/** Result of evaluating a single constraint */
export interface ConstraintEvaluation {
  constraintId: string
  constraintName: string
  category: ConstraintCategory
  result: ConstraintResult
  message?: string
  details?: Record<string, unknown>
  evaluatedAt: number
}

/** Result of evaluating all constraints */
export interface ConstraintValidationResult {
  /** Whether all blocking constraints passed */
  valid: boolean
  /** Overall result considering severity */
  overallResult: ConstraintResult
  /** Individual constraint evaluations */
  evaluations: ConstraintEvaluation[]
  /** Blocking constraint violations */
  blockers: ConstraintEvaluation[]
  /** Warning constraint violations */
  warnings: ConstraintEvaluation[]
  /** Passed constraints */
  passed: ConstraintEvaluation[]
  /** Evaluation timestamp */
  evaluatedAt: number
}

// =============================================================================
// Constraint Sets & Profiles
// =============================================================================

/** A named set of constraints */
export interface ConstraintSet {
  id: string
  name: string
  description?: string
  constraints: Constraint[]
  isDefault?: boolean
  createdAt: number
  updatedAt?: number
}

/** Predefined constraint profiles */
export type ConstraintProfile = 'conservative' | 'moderate' | 'aggressive' | 'custom'

// =============================================================================
// Default Constraints
// =============================================================================

export const DEFAULT_POSITION_CONSTRAINT: PositionConstraint = {
  id: 'default_max_position',
  name: '最大仓位限制',
  description: '单个资产最大仓位不超过账户的 25%',
  category: 'position',
  enabled: true,
  priority: 1,
  severity: 'block',
  createdAt: Date.now(),
  rule: {
    type: 'max_position_percent',
    value: 25,
    perAsset: true,
  },
}

export const DEFAULT_DAILY_LOSS_CONSTRAINT: LossConstraint = {
  id: 'default_daily_loss',
  name: '日亏损限制',
  description: '日亏损不超过账户的 5%',
  category: 'loss',
  enabled: true,
  priority: 2,
  severity: 'block',
  createdAt: Date.now(),
  rule: {
    type: 'daily_loss_limit',
    limitPercent: 5,
  },
}

export const DEFAULT_ORDER_FREQUENCY_CONSTRAINT: FrequencyConstraint = {
  id: 'default_order_frequency',
  name: '下单频率限制',
  description: '每小时最多 20 笔订单',
  category: 'frequency',
  enabled: true,
  priority: 3,
  severity: 'warn',
  createdAt: Date.now(),
  rule: {
    type: 'max_orders',
    maxCount: 20,
    period: 'hour',
  },
}

export const DEFAULT_CONSECUTIVE_LOSS_CONSTRAINT: LossConstraint = {
  id: 'default_consecutive_loss',
  name: '连续亏损限制',
  description: '连续亏损 5 次后暂停交易',
  category: 'loss',
  enabled: true,
  priority: 2,
  severity: 'block',
  createdAt: Date.now(),
  rule: {
    type: 'consecutive_loss_limit',
    maxConsecutive: 5,
  },
}

export const DEFAULT_CONSTRAINTS: Constraint[] = [
  DEFAULT_POSITION_CONSTRAINT,
  DEFAULT_DAILY_LOSS_CONSTRAINT,
  DEFAULT_ORDER_FREQUENCY_CONSTRAINT,
  DEFAULT_CONSECUTIVE_LOSS_CONSTRAINT,
]

// =============================================================================
// Constraint Profile Presets
// =============================================================================

export const CONSTRAINT_PROFILES: Record<Exclude<ConstraintProfile, 'custom'>, Constraint[]> = {
  conservative: [
    {
      ...DEFAULT_POSITION_CONSTRAINT,
      rule: { type: 'max_position_percent', value: 10, perAsset: true },
    },
    {
      ...DEFAULT_DAILY_LOSS_CONSTRAINT,
      rule: { type: 'daily_loss_limit', limitPercent: 2 },
    },
    {
      ...DEFAULT_ORDER_FREQUENCY_CONSTRAINT,
      rule: { type: 'max_orders', maxCount: 10, period: 'hour' },
    },
    {
      id: 'conservative_drawdown',
      name: '回撤限制',
      category: 'loss',
      enabled: true,
      priority: 2,
      severity: 'block',
      createdAt: Date.now(),
      rule: { type: 'drawdown_limit', maxDrawdown: 10 },
    } as LossConstraint,
  ],
  moderate: DEFAULT_CONSTRAINTS,
  aggressive: [
    {
      ...DEFAULT_POSITION_CONSTRAINT,
      rule: { type: 'max_position_percent', value: 50, perAsset: true },
    },
    {
      ...DEFAULT_DAILY_LOSS_CONSTRAINT,
      rule: { type: 'daily_loss_limit', limitPercent: 10 },
    },
    {
      ...DEFAULT_ORDER_FREQUENCY_CONSTRAINT,
      rule: { type: 'max_orders', maxCount: 50, period: 'hour' },
    },
  ],
}

// =============================================================================
// Utility Type Guards
// =============================================================================

export function isPositionConstraint(c: Constraint): c is PositionConstraint {
  return c.category === 'position'
}

export function isTimingConstraint(c: Constraint): c is TimingConstraint {
  return c.category === 'timing'
}

export function isAssetConstraint(c: Constraint): c is AssetConstraint {
  return c.category === 'asset'
}

export function isFrequencyConstraint(c: Constraint): c is FrequencyConstraint {
  return c.category === 'frequency'
}

export function isLossConstraint(c: Constraint): c is LossConstraint {
  return c.category === 'loss'
}
