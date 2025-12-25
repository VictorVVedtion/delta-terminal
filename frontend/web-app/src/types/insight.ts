/**
 * A2UI InsightData Type Definitions for Frontend
 *
 * A2UI (Agent-to-UI) is the core innovation of Delta Terminal 2.0.
 * Instead of returning plain text, AI returns structured InsightData
 * that can be rendered as interactive UI controls.
 *
 * Core Philosophy: "AI Proposer, Human Approver"
 */

// =============================================================================
// Insight Types
// =============================================================================

export type InsightType =
  | 'strategy_create'  // Create a new strategy
  | 'strategy_modify'  // Modify an existing strategy
  | 'batch_adjust'     // Batch adjust multiple strategies
  | 'risk_alert';      // Risk alert notification

// =============================================================================
// Parameter Types
// =============================================================================

export type ParamType =
  | 'slider'         // Numeric range slider
  | 'number'         // Number input
  | 'select'         // Dropdown select
  | 'toggle'         // Boolean toggle
  | 'button_group'   // Radio button group
  | 'logic_builder'  // Multi-condition logic builder
  | 'heatmap_slider'; // Risk level heatmap slider

export type ParamLevel = 1 | 2; // 1 = core, 2 = advanced

export interface ParamOption {
  value: string | number;
  label: string;
  description?: string;
}

export interface HeatmapZone {
  start: number;
  end: number;
  color: 'green' | 'gray' | 'red' | 'yellow' | 'blue';
  label: string;
}

export interface ParamConfig {
  min?: number;
  max?: number;
  step?: number;
  options?: ParamOption[];
  unit?: string;
  heatmap_zones?: HeatmapZone[];
  precision?: number;
}

// =============================================================================
// Constraint Types
// =============================================================================

export type ConstraintType =
  | 'min_max'
  | 'dependency'
  | 'mutual_exclusive'
  | 'conditional';

export interface Constraint {
  type: ConstraintType;
  related_param?: string | undefined;
  rule: string;
  message: string;
  severity?: 'error' | 'warning' | undefined;
}

// =============================================================================
// Logic Builder Types
// =============================================================================

export type LogicConnector = 'AND' | 'OR';

export type ComparisonOperator =
  | '>'
  | '<'
  | '>='
  | '<='
  | '=='
  | '!='
  | 'crosses_above'
  | 'crosses_below';

export interface LogicCondition {
  id: string;
  indicator: string;
  operator: ComparisonOperator;
  value: number | string;
  indicator_params?: Record<string, number>;
}

// =============================================================================
// InsightParam
// =============================================================================

export type ParamValue =
  | number
  | string
  | boolean
  | string[]
  | LogicCondition[];

export interface InsightParam {
  key: string;
  label: string;
  type: ParamType;
  value: ParamValue;
  old_value?: ParamValue;
  level: ParamLevel;
  constraints?: Constraint[];
  config: ParamConfig;
  description?: string;
  disabled?: boolean;
}

// =============================================================================
// Evidence Types
// =============================================================================

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartSignal {
  timestamp: number;
  type: 'buy' | 'sell' | 'close';
  price: number;
  label?: string;
}

export interface ChartOverlay {
  name: string;
  color: string;
  data: { timestamp: number; value: number }[];
}

export interface ChartData {
  symbol: string;
  timeframe: string;
  candles: Candle[];
  signals?: ChartSignal[];
  overlays?: ChartOverlay[];
}

export interface EquityCurvePoint {
  timestamp: number;
  value: number;
}

export interface ComparisonData {
  original: EquityCurvePoint[];
  modified: EquityCurvePoint[];
  baseline?: EquityCurvePoint[];
}

export interface InsightEvidence {
  chart?: ChartData;
  comparison?: ComparisonData;
}

// =============================================================================
// Impact Types
// =============================================================================

export type ImpactMetricKey =
  | 'expectedReturn'
  | 'annualizedReturn'
  | 'winRate'
  | 'maxDrawdown'
  | 'sharpeRatio'
  | 'profitFactor'
  | 'totalTrades'
  | 'avgTradeDuration'
  | 'avgProfit'
  | 'avgLoss';

export interface ImpactMetric {
  key: ImpactMetricKey;
  label: string;
  value: number;
  old_value?: number;
  unit: string;
  trend: 'up' | 'down' | 'neutral';
}

export interface InsightImpact {
  metrics: ImpactMetric[];
  confidence: number;
  sample_size: number;
}

// =============================================================================
// Target Types
// =============================================================================

export interface InsightTarget {
  strategy_id: string;
  name: string;
  symbol: string;
}

// =============================================================================
// Risk Alert Types
// =============================================================================

export type RiskAlertSeverity = 'info' | 'warning' | 'critical';

export type RiskAlertType =
  | 'high_volatility'
  | 'margin_warning'
  | 'liquidation_risk'
  | 'drawdown_limit'
  | 'market_crash'
  | 'strategy_anomaly';

export type TimeoutAction = 'auto_execute' | 'pause' | 'notify';

// =============================================================================
// Canvas Types
// =============================================================================

export type CanvasMode =
  | 'proposal'
  | 'backtest'
  | 'explorer'
  | 'monitor'
  | 'config'
  | 'detail';

// =============================================================================
// Main InsightData Structure
// =============================================================================

export interface InsightData {
  id: string;
  type: InsightType;
  target?: InsightTarget;
  params: InsightParam[];
  evidence?: InsightEvidence;
  impact?: InsightImpact;
  explanation: string;
  created_at: string;
}

export interface RiskAlertInsight extends InsightData {
  type: 'risk_alert';
  severity: RiskAlertSeverity;
  alert_type: RiskAlertType;
  suggested_action: InsightParam[];
  timeout_action?: TimeoutAction;
  timeout_seconds?: number;
  affected_strategies?: string[];
}

// =============================================================================
// Helper Types
// =============================================================================

export interface InsightActionResult {
  success: boolean;
  message: string;
  entity_id?: string;
  status?: string;
  errors?: { field: string; message: string }[];
}

export interface ParamValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}

// =============================================================================
// InsightCard Display Types
// =============================================================================

export type InsightCardStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface InsightCardProps {
  insight: InsightData;
  status?: InsightCardStatus;
  onExpand?: () => void;
  onApprove?: (params: InsightParam[]) => void;
  onReject?: () => void;
  compact?: boolean;
}
