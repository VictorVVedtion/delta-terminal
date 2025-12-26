/**
 * A2UI Canvas Components
 *
 * Canvas is the detailed editing panel that opens when user clicks on InsightCard.
 * It supports multiple modes for different use cases.
 */

export { Canvas, default as CanvasDefault } from './Canvas'
export { CanvasPanel, default as CanvasPanelDefault } from './CanvasPanel'
export { MonitorCanvas, default as MonitorCanvasDefault } from './MonitorCanvas'
export { BacktestCanvas, default as BacktestCanvasDefault } from './BacktestCanvas'
export { DeployCanvas, default as DeployCanvasDefault } from './DeployCanvas'
export { RiskSettings, default as RiskSettingsDefault } from './RiskSettings'
export { ConfigCanvas, default as ConfigCanvasDefault } from './ConfigCanvas'

// EPIC-007: A2UI Backtest Insight Canvas
export { BacktestInsightCanvas, default as BacktestInsightCanvasDefault } from './BacktestInsightCanvas'

// Re-export types
export type {
  CanvasMode,
  InsightData,
  InsightParam,
  InsightImpact,
} from '@/types/insight'

// Re-export MonitorCanvas types
export type {
  MonitorCanvasProps,
  StrategyStatus,
  StrategyInfo,
  Position,
  Trade,
  OrderSide,
  PnLData,
  StrategyMetrics,
} from './MonitorCanvas'

// Re-export BacktestCanvas types
export type {
  BacktestCanvasProps,
  BacktestStatus,
  BacktestMetrics,
  BacktestTrade,
} from './BacktestCanvas'

// Re-export DeployCanvas types
export type {
  DeployConfig,
  BacktestSummary,
  PaperPerformance,
} from './DeployCanvas'

// Re-export RiskSettings types
export type { RiskSettingsProps } from './RiskSettings'

// Re-export ConfigCanvas types
export type {
  ConfigCanvasProps,
  ConfigCategory,
  ConfigGroup,
  ConfigPreset,
  ConfigChange,
} from './ConfigCanvas'

// Re-export risk types from types/risk
export type {
  RiskSettings as RiskSettingsType,
  StopLossConfig,
  TakeProfitConfig,
  PositionLimitConfig,
  RiskLevel,
  RiskValidationResult,
  ValidationMessage,
} from '@/types/risk'

export { DEFAULT_RISK_SETTINGS } from '@/types/risk'
