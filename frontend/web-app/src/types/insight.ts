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
  | 'risk_alert'       // Risk alert notification
  | 'backtest';        // Backtest result (EPIC-007)

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
  /** Story 3.3: Agent ID for monitoring */
  agent_id?: string;
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
  | 'detail'
  | 'deploy';

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
  /**
   * 可用动作列表 (Story 1.3)
   * 当 AI 返回包含 'deploy_paper' 或 'deploy_live' 时，
   * ChatInterface 会自动弹出 DeployCanvas
   */
  actions?: InsightActionType[];
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
// Insight Action Types (Story 1.3)
// =============================================================================

/**
 * 可执行的洞察动作类型
 * - approve: 批准策略提案
 * - reject: 拒绝策略提案
 * - run_backtest: 运行回测
 * - deploy_paper: 部署到 Paper 模式
 * - deploy_live: 部署到 Live 模式
 * - stop_agent: 停止 Agent
 * - modify_params: 修改参数
 */
export type InsightActionType =
  | 'approve'
  | 'reject'
  | 'run_backtest'
  | 'deploy_paper'
  | 'deploy_live'
  | 'stop_agent'
  | 'modify_params';

// =============================================================================
// Backtest Types (EPIC-007)
// =============================================================================

/**
 * 交易方向
 */
export type TradeDirection = 'long' | 'short';

/**
 * 交易状态
 */
export type TradeStatus = 'open' | 'closed' | 'liquidated';

/**
 * 单笔回测交易记录
 */
export interface BacktestTrade {
  id: string;
  /** 开仓时间戳 */
  entryTime: number;
  /** 平仓时间戳 (未平仓时为 undefined) */
  exitTime?: number;
  /** 交易方向 */
  direction: TradeDirection;
  /** 开仓价格 */
  entryPrice: number;
  /** 平仓价格 */
  exitPrice?: number;
  /** 持仓数量 */
  quantity: number;
  /** 盈亏金额 (USDT) */
  pnl: number;
  /** 盈亏百分比 */
  pnlPercent: number;
  /** 交易状态 */
  status: TradeStatus;
  /** 开仓信号类型 (如 RSI超卖, 支撑位触及) */
  entrySignal?: string;
  /** 平仓信号类型 (如 止盈, 止损, 信号反转) */
  exitSignal?: string;
  /** 手续费 */
  fee: number;
}

/**
 * 回测统计指标
 */
export interface BacktestStats {
  // 核心指标
  /** 总收益率 (%) */
  totalReturn: number;
  /** 年化收益率 (%) */
  annualizedReturn: number;
  /** 胜率 (%) */
  winRate: number;
  /** 盈亏比 */
  profitFactor: number;
  /** 最大回撤 (%) */
  maxDrawdown: number;
  /** 最大回撤持续天数 */
  maxDrawdownDays: number;
  /** 夏普比率 */
  sharpeRatio: number;
  /** 索提诺比率 */
  sortinoRatio: number;

  // 交易统计
  /** 总交易次数 */
  totalTrades: number;
  /** 盈利次数 */
  winningTrades: number;
  /** 亏损次数 */
  losingTrades: number;
  /** 平均盈利 (USDT) */
  avgWin: number;
  /** 平均亏损 (USDT) */
  avgLoss: number;
  /** 最大单笔盈利 (USDT) */
  maxWin: number;
  /** 最大单笔亏损 (USDT) */
  maxLoss: number;
  /** 平均持仓时间 (小时) */
  avgHoldingTime: number;

  // 资金统计
  /** 初始资金 (USDT) */
  initialCapital: number;
  /** 最终资金 (USDT) */
  finalCapital: number;
  /** 最高资金 (USDT) */
  peakCapital: number;
  /** 总手续费 (USDT) */
  totalFees: number;
}

/**
 * 收益曲线数据点 (扩展)
 */
export interface BacktestEquityPoint {
  /** 时间戳 */
  timestamp: number;
  /** 资金余额 */
  equity: number;
  /** 当日盈亏 */
  dailyPnl: number;
  /** 累计盈亏 */
  cumulativePnl: number;
  /** 回撤百分比 */
  drawdown: number;
}

/**
 * 可调参数定义 (A2UI 控件)
 */
export interface BacktestParameter {
  /** 参数唯一标识 */
  key: string;
  /** 显示名称 */
  label: string;
  /** 参数描述 */
  description?: string;
  /** 参数类型 */
  type: 'slider' | 'number' | 'select' | 'toggle';
  /** 当前值 */
  value: number | string | boolean;
  /** 默认值 */
  defaultValue: number | string | boolean;
  /** 配置 */
  config: {
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    options?: { value: string | number; label: string }[];
  };
  /** 参数分组 (用于UI分组显示) */
  group?: string;
}

/**
 * 策略配置 (回测输入)
 */
export interface BacktestStrategyConfig {
  /** 策略名称 */
  name: string;
  /** 策略描述 (AI生成) */
  description: string;
  /** 交易对 */
  symbol: string;
  /** 时间周期 */
  timeframe: string;
  /** 可调参数列表 */
  parameters: BacktestParameter[];
  /** 入场条件描述 */
  entryConditions: string[];
  /** 出场条件描述 */
  exitConditions: string[];
}

/**
 * 回测 Insight 数据 (A2UI Canvas 渲染)
 * 继承自 InsightData，params 字段用于参数调节面板
 */
export interface BacktestInsightData extends InsightData {
  type: 'backtest';
  /** 策略配置 */
  strategy: BacktestStrategyConfig;
  /** 回测统计 */
  stats: BacktestStats;
  /** 交易记录列表 */
  trades: BacktestTrade[];
  /** 收益曲线数据 */
  equityCurve: BacktestEquityPoint[];
  /** K线数据 (含买卖信号) */
  chartData: ChartData;
  /** 基准对比 (Buy & Hold) */
  benchmark?: {
    equityCurve: BacktestEquityPoint[];
    totalReturn: number;
  };
  /** 回测时间范围 */
  period: {
    start: number;
    end: number;
  };
  /** AI 解读与建议 */
  aiSummary: string;
  /** 参数优化建议 */
  suggestions?: string[];
}

/**
 * 类型守卫: 判断是否为 BacktestInsightData
 */
export function isBacktestInsight(insight: InsightData): insight is BacktestInsightData {
  return insight.type === 'backtest';
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
