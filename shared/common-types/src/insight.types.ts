/**
 * A2UI InsightData Type Definitions
 *
 * A2UI (Agent-to-UI) is the core innovation of Delta Terminal 2.0.
 * Instead of returning plain text, AI returns structured InsightData
 * that can be rendered as interactive UI controls.
 *
 * Core Philosophy: "AI Proposer, Human Approver"
 *
 * @module @delta/common-types/insight
 * @version 1.0.0
 */

// =============================================================================
// Insight Types
// =============================================================================

/**
 * Type of insight returned by AI
 */
export type InsightType =
  | 'strategy_create'  // Create a new strategy
  | 'strategy_modify'  // Modify an existing strategy
  | 'batch_adjust'     // Batch adjust multiple strategies
  | 'risk_alert';      // Risk alert notification

/**
 * The main InsightData structure returned by AI
 *
 * @example
 * ```typescript
 * const insight: InsightData = {
 *   id: 'insight_abc123',
 *   type: 'strategy_create',
 *   params: [...],
 *   evidence: { chart: {...}, comparison: {...} },
 *   impact: { metrics: [...], confidence: 0.85, sampleSize: 90 },
 *   explanation: 'Based on the last 90 days of data...',
 *   createdAt: '2025-12-25T00:00:00Z'
 * };
 * ```
 */
export interface InsightData {
  /** Unique identifier for this insight */
  id: string;

  /** Type of insight */
  type: InsightType;

  /** Target strategy (for modify/batch operations) */
  target?: InsightTarget;

  /** Parameter list - the core of A2UI */
  params: InsightParam[];

  /** Visual evidence (charts, comparisons) */
  evidence?: InsightEvidence;

  /** Impact estimation (metrics, confidence) */
  impact?: InsightImpact;

  /** AI's natural language explanation */
  explanation: string;

  /** Timestamp when this insight was created */
  createdAt: string;
}

/**
 * Target strategy for modify/batch operations
 */
export interface InsightTarget {
  /** Strategy ID */
  strategyId: string;

  /** Strategy name */
  name: string;

  /** Trading symbol (e.g., 'BTC/USDT') */
  symbol: string;
}

// =============================================================================
// Parameter Types
// =============================================================================

/**
 * Supported parameter control types
 */
export type ParamType =
  | 'slider'         // Numeric range slider
  | 'number'         // Number input
  | 'select'         // Dropdown select
  | 'toggle'         // Boolean toggle
  | 'button_group'   // Radio button group
  | 'logic_builder'  // Multi-condition logic builder
  | 'heatmap_slider'; // Risk level heatmap slider

/**
 * Parameter level for display hierarchy
 * - L1: Core parameters, always visible
 * - L2: Advanced parameters, collapsed by default
 */
export type ParamLevel = 1 | 2;

/**
 * InsightParam - The polymorphic parameter control
 *
 * Each parameter specifies its type and the frontend renders
 * the corresponding UI control based on the type.
 *
 * @example
 * ```typescript
 * const rsiPeriodParam: InsightParam = {
 *   key: 'rsiPeriod',
 *   label: 'RSI Period',
 *   type: 'slider',
 *   value: 14,
 *   level: 1,
 *   config: { min: 7, max: 21, step: 1 }
 * };
 * ```
 */
export interface InsightParam {
  /** Unique key for this parameter */
  key: string;

  /** Display label */
  label: string;

  /** Control type */
  type: ParamType;

  /** Current value */
  value: ParamValue;

  /** Previous value (for modify operations, shows diff) */
  oldValue?: ParamValue;

  /** Display level: 1 = core, 2 = advanced */
  level: ParamLevel;

  /** Constraint rules */
  constraints?: Constraint[];

  /** Type-specific configuration */
  config: ParamConfig;

  /** Optional description/tooltip */
  description?: string;

  /** Whether this param is disabled */
  disabled?: boolean;
}

/**
 * Possible parameter values
 */
export type ParamValue =
  | number
  | string
  | boolean
  | string[]
  | LogicCondition[];

/**
 * Parameter configuration (type-specific)
 */
export interface ParamConfig {
  /** Minimum value (for slider/number) */
  min?: number;

  /** Maximum value (for slider/number) */
  max?: number;

  /** Step increment (for slider/number) */
  step?: number;

  /** Options (for select/button_group) */
  options?: ParamOption[];

  /** Unit suffix (e.g., '%', 'hours') */
  unit?: string;

  /** Heatmap zones (for heatmap_slider) */
  heatmapZones?: HeatmapZone[];

  /** Decimal precision */
  precision?: number;
}

/**
 * Option for select/button_group
 */
export interface ParamOption {
  /** Option value */
  value: string | number;

  /** Display label */
  label: string;

  /** Optional description */
  description?: string;
}

/**
 * Heatmap zone for risk level slider
 */
export interface HeatmapZone {
  /** Start value (percentage 0-100) */
  start: number;

  /** End value (percentage 0-100) */
  end: number;

  /** Zone color (e.g., 'green', 'gray', 'red') */
  color: 'green' | 'gray' | 'red' | 'yellow' | 'blue';

  /** Zone label */
  label: string;
}

// =============================================================================
// Logic Builder Types
// =============================================================================

/**
 * Logical connector for condition groups
 */
export type LogicConnector = 'AND' | 'OR';

/**
 * Comparison operator for conditions
 */
export type ComparisonOperator =
  | '>'
  | '<'
  | '>='
  | '<='
  | '=='
  | '!='
  | 'crosses_above'
  | 'crosses_below';

/**
 * Single condition in logic builder
 */
export interface LogicCondition {
  /** Condition ID */
  id: string;

  /** Indicator name (e.g., 'RSI', 'MACD') */
  indicator: string;

  /** Comparison operator */
  operator: ComparisonOperator;

  /** Comparison value */
  value: number | string;

  /** Indicator parameters (e.g., { period: 14 }) */
  indicatorParams?: Record<string, number>;
}

/**
 * Condition group with connector
 */
export interface LogicConditionGroup {
  /** Group ID */
  id: string;

  /** Connector between conditions in this group */
  connector: LogicConnector;

  /** Conditions in this group */
  conditions: LogicCondition[];

  /** Nested groups (for complex logic) */
  nestedGroups?: LogicConditionGroup[];
}

// =============================================================================
// Constraint Types
// =============================================================================

/**
 * Constraint type
 */
export type ConstraintType =
  | 'min_max'          // Value must be within min/max
  | 'dependency'       // Depends on another parameter
  | 'mutual_exclusive' // Mutually exclusive with another param
  | 'conditional';     // Conditional constraint

/**
 * Constraint rule for parameter validation
 *
 * @example
 * ```typescript
 * // Stop loss must be less than take profit
 * const constraint: Constraint = {
 *   type: 'dependency',
 *   relatedParam: 'takeProfit',
 *   rule: 'value < relatedValue',
 *   message: 'Stop loss must be less than take profit'
 * };
 * ```
 */
export interface Constraint {
  /** Constraint type */
  type: ConstraintType;

  /** Related parameter key (for dependency constraints) */
  relatedParam?: string;

  /** Constraint rule expression */
  rule: string;

  /** Error message when constraint is violated */
  message: string;

  /** Severity level */
  severity?: 'error' | 'warning';
}

// =============================================================================
// Evidence Types
// =============================================================================

/**
 * Visual evidence for the insight
 */
export interface InsightEvidence {
  /** K-line chart with signals */
  chart?: ChartData;

  /** Before/after comparison */
  comparison?: ComparisonData;
}

/**
 * Chart data for visualization
 */
export interface ChartData {
  /** Trading symbol */
  symbol: string;

  /** Timeframe (e.g., '1h', '4h', '1d') */
  timeframe: string;

  /** OHLCV candles */
  candles: Candle[];

  /** Signal markers on chart */
  signals?: ChartSignal[];

  /** Overlay indicators */
  overlays?: ChartOverlay[];
}

/**
 * Single candle data
 */
export interface Candle {
  /** Timestamp */
  timestamp: number;

  /** Open price */
  open: number;

  /** High price */
  high: number;

  /** Low price */
  low: number;

  /** Close price */
  close: number;

  /** Volume */
  volume: number;
}

/**
 * Signal marker on chart
 */
export interface ChartSignal {
  /** Timestamp */
  timestamp: number;

  /** Signal type */
  type: 'buy' | 'sell' | 'close';

  /** Price level */
  price: number;

  /** Signal label */
  label?: string;
}

/**
 * Chart overlay (e.g., moving average)
 */
export interface ChartOverlay {
  /** Overlay name */
  name: string;

  /** Overlay color */
  color: string;

  /** Data points */
  data: { timestamp: number; value: number }[];
}

/**
 * Before/after comparison data
 */
export interface ComparisonData {
  /** Original equity curve */
  original: EquityCurvePoint[];

  /** New equity curve (after modification) */
  modified: EquityCurvePoint[];

  /** Baseline comparison (e.g., buy and hold) */
  baseline?: EquityCurvePoint[];
}

/**
 * Point on equity curve
 */
export interface EquityCurvePoint {
  /** Timestamp */
  timestamp: number;

  /** Equity value (starting from 100) */
  value: number;
}

// =============================================================================
// Impact Types
// =============================================================================

/**
 * Impact estimation for the strategy
 */
export interface InsightImpact {
  /** Key performance metrics */
  metrics: ImpactMetric[];

  /** AI's confidence in the estimation (0-1) */
  confidence: number;

  /** Sample size (number of days used) */
  sampleSize: number;
}

/**
 * Single impact metric
 */
export interface ImpactMetric {
  /** Metric key (e.g., 'expectedReturn', 'winRate') */
  key: ImpactMetricKey;

  /** Display label */
  label: string;

  /** Current/new value */
  value: number;

  /** Previous value (for comparison) */
  oldValue?: number;

  /** Unit (e.g., '%', 'x') */
  unit: string;

  /** Trend direction */
  trend: 'up' | 'down' | 'neutral';
}

/**
 * Standard impact metric keys
 */
export type ImpactMetricKey =
  | 'expectedReturn'   // Expected return
  | 'annualizedReturn' // Annualized return
  | 'winRate'          // Win rate
  | 'maxDrawdown'      // Maximum drawdown
  | 'sharpeRatio'      // Sharpe ratio
  | 'profitFactor'     // Profit factor
  | 'totalTrades'      // Total number of trades
  | 'avgTradeDuration' // Average trade duration
  | 'avgProfit'        // Average profit per trade
  | 'avgLoss';         // Average loss per trade

// =============================================================================
// Risk Alert Types
// =============================================================================

/**
 * Risk alert severity levels
 */
export type RiskAlertSeverity = 'info' | 'warning' | 'critical';

/**
 * Risk alert types
 */
export type RiskAlertType =
  | 'high_volatility'     // High market volatility
  | 'margin_warning'      // Margin level warning
  | 'liquidation_risk'    // Liquidation risk
  | 'drawdown_limit'      // Drawdown limit reached
  | 'market_crash'        // Market crash detected
  | 'strategy_anomaly';   // Strategy behavior anomaly

/**
 * Timeout action for risk alerts
 */
export type TimeoutAction =
  | 'auto_execute'  // Automatically execute suggested action
  | 'pause'         // Pause affected strategies
  | 'notify';       // Just notify, no action

/**
 * Risk alert insight (extends InsightData)
 */
export interface RiskAlertInsight extends InsightData {
  type: 'risk_alert';

  /** Alert severity */
  severity: RiskAlertSeverity;

  /** Alert type */
  alertType: RiskAlertType;

  /** Suggested action (as InsightParams for approval) */
  suggestedAction: InsightParam[];

  /** Action to take on timeout */
  timeoutAction?: TimeoutAction;

  /** Timeout in seconds */
  timeoutSeconds?: number;

  /** Affected strategies */
  affectedStrategies?: string[];
}

// =============================================================================
// Canvas Types
// =============================================================================

/**
 * Canvas display modes
 */
export type CanvasMode =
  | 'proposal'  // Strategy creation/modification proposal
  | 'backtest'  // Backtest report
  | 'explorer'  // Parameter sensitivity analysis
  | 'monitor'   // Real-time strategy monitoring
  | 'config'    // Full strategy configuration
  | 'detail';   // Trade/order detail view

// =============================================================================
// Helper Types
// =============================================================================

/**
 * Insight action result
 */
export interface InsightActionResult {
  /** Whether the action was successful */
  success: boolean;

  /** Result message */
  message: string;

  /** Created/updated entity ID */
  entityId?: string;

  /** New entity status */
  status?: string;

  /** Errors if any */
  errors?: { field: string; message: string }[];
}

/**
 * Validation result for insight params
 */
export interface ParamValidationResult {
  /** Whether all params are valid */
  valid: boolean;

  /** Errors by param key */
  errors: Record<string, string>;

  /** Warnings by param key */
  warnings: Record<string, string>;
}

// =============================================================================
// Factory Functions (for creating InsightData)
// =============================================================================

/**
 * Creates a new strategy creation insight
 */
export function createStrategyInsight(
  params: InsightParam[],
  options: {
    evidence?: InsightEvidence;
    impact?: InsightImpact;
    explanation: string;
  }
): InsightData {
  const insight: InsightData = {
    id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'strategy_create',
    params,
    explanation: options.explanation,
    createdAt: new Date().toISOString(),
  };

  if (options.evidence) {
    insight.evidence = options.evidence;
  }

  if (options.impact) {
    insight.impact = options.impact;
  }

  return insight;
}

/**
 * Creates a risk alert insight
 */
export function createRiskAlert(
  alertType: RiskAlertType,
  severity: RiskAlertSeverity,
  options: {
    explanation: string;
    suggestedAction: InsightParam[];
    timeoutAction?: TimeoutAction;
    timeoutSeconds?: number;
    affectedStrategies?: string[];
  }
): RiskAlertInsight {
  const alert: RiskAlertInsight = {
    id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'risk_alert',
    alertType,
    severity,
    params: [],
    suggestedAction: options.suggestedAction,
    explanation: options.explanation,
    createdAt: new Date().toISOString(),
  };

  if (options.timeoutAction) {
    alert.timeoutAction = options.timeoutAction;
  }

  if (options.timeoutSeconds !== undefined) {
    alert.timeoutSeconds = options.timeoutSeconds;
  }

  if (options.affectedStrategies) {
    alert.affectedStrategies = options.affectedStrategies;
  }

  return alert;
}
