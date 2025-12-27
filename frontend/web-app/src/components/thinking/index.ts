/**
 * Thinking Components
 *
 * 流式渲染相关组件，基于 PRD S71 设计
 */

export { InsightCardLoading, useInsightLoadingState } from './InsightCardLoading'
export { ThinkingIndicator } from './ThinkingIndicator'

// Re-export types
export type {
  InsightLoadingPhase,
  InsightLoadingState,
  ThinkingEvent,
  ThinkingEventType,
  ThinkingProcess,
  ThinkingStatus,
  TodoItem,
  TodoStatus,
  ToolCall,
} from '@/types/thinking'
