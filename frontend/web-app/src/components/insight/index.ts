/**
 * A2UI Insight Components
 *
 * Components for rendering AI-generated InsightData in the chat interface
 */

export { ClarificationCard } from './ClarificationCard'
export { InsightCard, default as InsightCardDefault } from './InsightCard'
export { InsightMessage, MultiInsightMessage } from './InsightMessage'
export { ReasoningChainView, ReasoningNodeView } from './ReasoningChainView'

// EPIC-008 分析类卡片
export { SensitivityInsightCard } from './SensitivityInsightCard'
export { AttributionInsightCard } from './AttributionInsightCard'
export { ComparisonInsightCard } from './ComparisonInsightCard'

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
export {
  isClarificationInsight,
  isSensitivityInsight,
  isAttributionInsight,
  isComparisonInsight,
} from '@/types/insight'

// Re-export reasoning chain types (A2UI 2.0)
export type {
  EvidenceType,
  NodeAction,
  ReasoningBranch,
  ReasoningChain,
  ReasoningChainStatus,
  ReasoningChainViewProps,
  ReasoningDisplayMode,
  ReasoningEvidence,
  ReasoningNode,
  ReasoningNodeStatus,
  ReasoningNodeType,
  ReasoningNodeViewProps,
  UserInteraction,
} from '@/types/reasoning'
