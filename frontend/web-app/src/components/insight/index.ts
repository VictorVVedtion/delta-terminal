/**
 * A2UI Insight Components
 *
 * Components for rendering AI-generated InsightData in the chat interface
 */

export { InsightCard, default as InsightCardDefault } from './InsightCard'
export { InsightMessage, MultiInsightMessage } from './InsightMessage'

// Re-export types
export type {
  InsightData,
  InsightParam,
  InsightType,
  InsightCardProps,
  InsightCardStatus,
  ParamType,
  ParamValue,
  ParamConfig,
  InsightImpact,
  InsightEvidence,
} from '@/types/insight'
