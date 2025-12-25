/**
 * A2UI Canvas Components
 *
 * Canvas is the detailed editing panel that opens when user clicks on InsightCard.
 * It supports multiple modes for different use cases.
 */

export { Canvas, default as CanvasDefault } from './Canvas'
export { CanvasPanel, default as CanvasPanelDefault } from './CanvasPanel'

// Re-export types
export type {
  CanvasMode,
  InsightData,
  InsightParam,
  InsightImpact,
} from '@/types/insight'
