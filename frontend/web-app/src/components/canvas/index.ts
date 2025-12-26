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
