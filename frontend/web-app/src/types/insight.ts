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
  | 'backtest'         // Backtest result (EPIC-007)
  | 'clarification'    // AI clarification question (EPIC-010)
  | 'sensitivity'      // Parameter sensitivity analysis (EPIC-008)
  | 'attribution'      // PnL attribution analysis (EPIC-008)
  | 'comparison';      // Strategy comparison (EPIC-008)

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

export interface EvidenceEquityCurvePoint {
  timestamp: number;
  value: number;
}

export interface ComparisonData {
  original: EvidenceEquityCurvePoint[];
  modified: EvidenceEquityCurvePoint[];
  baseline?: EvidenceEquityCurvePoint[];
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
// Clarification Types (EPIC-010 Story 10.2)
// =============================================================================

/**
 * 追问选项类型
 */
export type ClarificationOptionType = 'single' | 'multiple' | 'text';

/**
 * 追问选项
 */
export interface ClarificationOption {
  /** 选项唯一标识 */
  id: string;
  /** 显示文本 */
  label: string;
  /** 选项描述 (可选) */
  description?: string;
  /** 选项图标 (可选, emoji 或 lucide icon 名称) */
  icon?: string;
  /** 是否为推荐选项 */
  recommended?: boolean;
}

/**
 * 追问分类
 */
export type ClarificationCategory =
  | 'risk_preference'      // 风险偏好
  | 'trading_pair'         // 交易对选择
  | 'timeframe'            // 时间周期
  | 'strategy_type'        // 策略类型
  | 'capital_allocation'   // 资金配置
  | 'entry_condition'      // 入场条件
  | 'exit_condition'       // 出场条件
  | 'general';             // 一般问题

/**
 * AI 追问 Insight 数据
 */
export interface ClarificationInsight extends InsightData {
  type: 'clarification';
  /** 追问问题 */
  question: string;
  /** 问题分类 */
  category: ClarificationCategory;
  /** 选项类型 */
  optionType: ClarificationOptionType;
  /** 可选选项列表 */
  options: ClarificationOption[];
  /** 是否允许自定义输入 */
  allowCustomInput: boolean;
  /** 自定义输入占位符 */
  customInputPlaceholder?: string;
  /** 跳过按钮文本 (如果允许跳过) */
  skipLabel?: string;
  /** 问题上下文 (AI 对之前对话的理解) */
  context?: string;
}

/**
 * 追问回答结果
 */
export interface ClarificationAnswer {
  /** 问题 ID (insight.id) */
  questionId: string;
  /** 选中的选项 ID 列表 */
  selectedOptions: string[];
  /** 自定义输入文本 */
  customText?: string;
  /** 是否跳过 */
  skipped: boolean;
}

/**
 * 类型守卫: 判断是否为 ClarificationInsight
 */
export function isClarificationInsight(insight: InsightData): insight is ClarificationInsight {
  return insight.type === 'clarification';
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

// =============================================================================
// Analysis Types (EPIC-008)
// =============================================================================

/**
 * 参数敏感度等级
 */
export type SensitivityLevel = 'high' | 'medium' | 'low';

/**
 * 参数影响数据点
 */
export interface ParamImpactPoint {
  paramValue: number;
  totalReturn: number;
  winRate: number;
  maxDrawdown: number;
  sharpeRatio: number;
}

/**
 * 参数敏感度矩阵项
 */
export interface SensitivityMatrixItem {
  paramKey: string;
  paramLabel: string;
  impacts: ParamImpactPoint[];
}

/**
 * 关键参数信息
 */
export interface KeyParameter {
  paramKey: string;
  paramLabel: string;
  impactScore: number; // 0-100
  sensitivity: SensitivityLevel;
}

/**
 * 敏感度分析基准数据
 */
export interface SensitivityBaseline {
  totalReturn: number;
  winRate: number;
  maxDrawdown: number;
  sharpeRatio: number;
}

/**
 * 敏感度分析 Insight 数据 (Story 8.1)
 */
export interface SensitivityInsightData extends InsightData {
  type: 'sensitivity';
  /** 策略名称 */
  strategyName: string;
  /** 交易对 */
  symbol: string;
  /** 参数敏感度矩阵 */
  sensitivityMatrix: SensitivityMatrixItem[];
  /** 关键参数排序 (按影响程度) */
  keyParameters: KeyParameter[];
  /** 基准性能 (未调参) */
  baseline: SensitivityBaseline;
  /** AI 分析洞察 */
  aiInsight: string;
}

/**
 * 类型守卫: 判断是否为 SensitivityInsightData
 */
export function isSensitivityInsight(insight: InsightData): insight is SensitivityInsightData {
  return insight.type === 'sensitivity';
}

// =============================================================================
// Attribution Types (EPIC-008)
// =============================================================================

/**
 * 归因因子分解项
 */
export interface AttributionBreakdownItem {
  factor: string;           // 因子名称 (趋势跟踪, 波段交易, 止损, 手续费等)
  contribution: number;     // 贡献金额 (USDT)
  contributionPercent: number; // 贡献百分比
  color: string;            // 图表颜色
  description?: string;
}

/**
 * 时间序列归因数据点
 */
export interface TimeSeriesAttributionPoint {
  timestamp: number;
  factors: Record<string, number>; // factor -> 累计贡献
}

/**
 * 归因分析 Insight 数据 (Story 8.2)
 */
export interface AttributionInsightData extends InsightData {
  type: 'attribution';
  /** 策略名称 */
  strategyName: string;
  /** 交易对 */
  symbol: string;
  /** 盈亏归因分解 */
  attributionBreakdown: AttributionBreakdownItem[];
  /** 时间序列因子表现 */
  timeSeriesAttribution: TimeSeriesAttributionPoint[];
  /** 总盈亏 */
  totalPnL: number;
  /** 分析周期 */
  period: {
    start: number;
    end: number;
  };
  /** AI 分析洞察 */
  aiInsight: string;
}

/**
 * 类型守卫: 判断是否为 AttributionInsightData
 */
export function isAttributionInsight(insight: InsightData): insight is AttributionInsightData {
  return insight.type === 'attribution';
}

// =============================================================================
// Comparison Types (EPIC-008)
// =============================================================================

/**
 * 差异显著性
 */
export type DifferenceSignificance = 'high' | 'medium' | 'low';

/**
 * 策略性能指标
 */
export interface StrategyMetrics {
  totalReturn: number;
  annualizedReturn: number;
  winRate: number;
  maxDrawdown: number;
  sharpeRatio: number;
  sortinoRatio: number;
  profitFactor: number;
  totalTrades: number;
}

/**
 * 收益曲线数据点
 */
export interface EquityCurvePoint {
  timestamp: number;
  equity: number;
}

/**
 * 对比策略项
 */
export interface ComparisonStrategy {
  id: string;
  name: string;
  symbol: string;
  color: string;
  metrics: StrategyMetrics;
  equityCurve: EquityCurvePoint[];
}

/**
 * 指标差异分析
 */
export interface MetricDifference {
  metric: string;
  metricLabel: string;
  significance: DifferenceSignificance;
  bestStrategy: string;
  worstStrategy: string;
}

/**
 * 策略对比 Insight 数据 (Story 8.3)
 */
export interface ComparisonInsightData extends InsightData {
  type: 'comparison';
  /** 对比的策略列表 (2-4个) */
  strategies: ComparisonStrategy[];
  /** 差异分析 */
  differences: MetricDifference[];
  /** AI 对比总结 */
  aiSummary: string;
}

/**
 * 类型守卫: 判断是否为 ComparisonInsightData
 */
export function isComparisonInsight(insight: InsightData): insight is ComparisonInsightData {
  return insight.type === 'comparison';
}
