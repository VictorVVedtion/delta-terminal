/**
 * A2UI Insight Components
 *
 * Components for rendering AI-generated InsightData in the chat interface
 */

export { ClarificationCard } from './ClarificationCard'
export { InsightCard, default as InsightCardDefault } from './InsightCard'
export { InsightMessage, MultiInsightMessage } from './InsightMessage'

// Re-export types
export type {
  ClarificationAnswer,
  ClarificationCategory,
  // Clarification types (EPIC-010 Story 10.2)
  ClarificationInsight,
  ClarificationOption,
  ClarificationOptionType,
  InsightCardProps,
  InsightCardStatus,
  InsightData,
  InsightEvidence,
  InsightImpact,
  InsightParam,
  InsightType,
  ParamConfig,
  ParamType,
  ParamValue,
} from '@/types/insight'

// Re-export type guards
export { isClarificationInsight } from '@/types/insight'
