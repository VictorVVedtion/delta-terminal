/**
 * A2UI Insight Components
 *
 * Components for rendering AI-generated InsightData in the chat interface
 */

export { InsightCard, default as InsightCardDefault } from './InsightCard'
export { InsightMessage, MultiInsightMessage } from './InsightMessage'
export { ClarificationCard } from './ClarificationCard'

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
  // Clarification types (EPIC-010 Story 10.2)
  ClarificationInsight,
  ClarificationOption,
  ClarificationAnswer,
  ClarificationCategory,
  ClarificationOptionType,
} from '@/types/insight'

// Re-export type guards
export { isClarificationInsight } from '@/types/insight'
