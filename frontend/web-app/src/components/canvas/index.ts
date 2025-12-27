/**
 * A2UI Canvas Components
 *
 * Canvas is the detailed editing panel that opens when user clicks on InsightCard.
 * It supports multiple modes for different use cases.
 */

export { BacktestCanvas, default as BacktestCanvasDefault } from './BacktestCanvas'
export { Canvas, default as CanvasDefault } from './Canvas'
export { CanvasPanel, default as CanvasPanelDefault } from './CanvasPanel'
export { ConfigCanvas, default as ConfigCanvasDefault } from './ConfigCanvas'
export { DeployCanvas, default as DeployCanvasDefault } from './DeployCanvas'
export { MonitorCanvas, default as MonitorCanvasDefault } from './MonitorCanvas'
export { RiskSettings, default as RiskSettingsDefault } from './RiskSettings'

// EPIC-007: A2UI Backtest Insight Canvas
export { BacktestInsightCanvas, default as BacktestInsightCanvasDefault } from './BacktestInsightCanvas'

// Re-export types
export type {
  CanvasMode,
  InsightData,
  InsightImpact,
  InsightParam,
} from '@/types/insight'

// Re-export MonitorCanvas types
export type {
  MonitorCanvasProps,
  OrderSide,
  PnLData,
  Position,
  StrategyInfo,
  StrategyMetrics,
  StrategyStatus,
  Trade,
} from './MonitorCanvas'

// Re-export BacktestCanvas types
export type {
  BacktestCanvasProps,
  BacktestMetrics,
  BacktestStatus,
  BacktestTrade,
} from './BacktestCanvas'

// Re-export DeployCanvas types
export type {
  BacktestSummary,
  DeployConfig,
  PaperPerformance,
} from './DeployCanvas'

// Re-export RiskSettings types
export type { RiskSettingsProps } from './RiskSettings'

// Re-export ConfigCanvas types
export type {
  ConfigCanvasProps,
  ConfigCategory,
  ConfigChange,
  ConfigGroup,
  ConfigPreset,
} from './ConfigCanvas'

// Re-export risk types from types/risk
export type {
  PositionLimitConfig,
  RiskLevel,
  RiskSettings as RiskSettingsType,
  RiskValidationResult,
  StopLossConfig,
  TakeProfitConfig,
  ValidationMessage,
} from '@/types/risk'
export { DEFAULT_RISK_SETTINGS } from '@/types/risk'
