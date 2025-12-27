/**
 * Thinking Stream Type Definitions
 *
 * 基于 PRD delta-terminal-complete-spec-v1.md 第 7246-7400 行
 * 定义 AI 思考过程的 WebSocket 事件流类型
 */

// =============================================================================
// Todo Item Types (来自 DeepAgents write_todos 工具)
// =============================================================================

export type TodoStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped'

export interface TodoItem {
  id: string
  description: string
  status: TodoStatus
  /** 预计耗时 (秒) */
  estimated_duration?: number
  /** 实际耗时 (秒) */
  actual_duration?: number
  /** 失败原因 */
  error?: string
}

// =============================================================================
// Tool Call Types
// =============================================================================

export interface ToolCall {
  tool_name: string
  description: string
  /** 工具调用开始时间 */
  started_at: number
  /** 工具调用结束时间 */
  completed_at?: number
  /** 结果摘要 (用于展示) */
  result_summary?: string
  /** 是否成功 */
  success?: boolean
}

// =============================================================================
// Thinking Process State
// =============================================================================

export type ThinkingStatus =
  | 'idle'           // 空闲
  | 'thinking'       // 规划中
  | 'tool_calling'   // 调用工具中
  | 'generating'     // 生成回复中
  | 'approval_required' // 等待人类审批
  | 'completed'      // 完成
  | 'error'          // 错误

export interface ThinkingProgress {
  /** 总体进度百分比 0-100 */
  percentage: number
  /** 当前步骤描述 */
  current_step?: string
}

export interface ApprovalContext {
  /** 需要审批的操作 */
  action: string
  /** 审批上下文数据 */
  context: Record<string, unknown>
  /** 超时时间 (秒) */
  timeout_seconds?: number
  /** 超时后的默认行为 */
  on_timeout?: 'reject' | 'approve'
}

export interface ThinkingProcess {
  /** 进程 ID */
  process_id: string
  /** 用户原始消息 */
  user_message: string
  /** 当前状态 */
  status: ThinkingStatus
  /** 任务列表 */
  todos: TodoItem[]
  /** 当前工具调用 */
  current_tool?: ToolCall
  /** 历史工具调用 */
  tool_history: ToolCall[]
  /** 进度信息 */
  progress?: ThinkingProgress
  /** 审批上下文 (当 status === 'approval_required') */
  approval?: ApprovalContext
  /** 开始时间 */
  started_at: number
  /** 完成时间 */
  completed_at?: number
  /** 结果类型 */
  result_type?: 'insight_data' | 'text_response'
  /** InsightData ID (当 result_type === 'insight_data') */
  insight_id?: string
  /** 错误信息 */
  error?: string
}

// =============================================================================
// WebSocket Event Types
// =============================================================================

export type ThinkingEventType =
  | 'thinking.started'
  | 'thinking.todos_updated'
  | 'thinking.tool_started'
  | 'thinking.tool_completed'
  | 'thinking.progress_updated'
  | 'thinking.approval_required'
  | 'thinking.completed'
  | 'thinking.error'

export interface ThinkingStartedEvent {
  type: 'thinking.started'
  data: {
    process_id: string
    user_message: string
  }
}

export interface ThinkingTodosUpdatedEvent {
  type: 'thinking.todos_updated'
  data: {
    process_id: string
    todos: TodoItem[]
  }
}

export interface ThinkingToolStartedEvent {
  type: 'thinking.tool_started'
  data: {
    process_id: string
    tool_name: string
    description: string
  }
}

export interface ThinkingToolCompletedEvent {
  type: 'thinking.tool_completed'
  data: {
    process_id: string
    tool_name: string
    result_summary: string
    success: boolean
  }
}

export interface ThinkingProgressUpdatedEvent {
  type: 'thinking.progress_updated'
  data: {
    process_id: string
    progress: ThinkingProgress
  }
}

export interface ThinkingApprovalRequiredEvent {
  type: 'thinking.approval_required'
  data: {
    process_id: string
    action: string
    context: Record<string, unknown>
    timeout_seconds?: number
  }
}

export interface ThinkingCompletedEvent {
  type: 'thinking.completed'
  data: {
    process_id: string
    result_type: 'insight_data' | 'text_response'
    insight_id?: string
    text?: string
  }
}

export interface ThinkingErrorEvent {
  type: 'thinking.error'
  data: {
    process_id: string
    error: string
  }
}

export type ThinkingEvent =
  | ThinkingStartedEvent
  | ThinkingTodosUpdatedEvent
  | ThinkingToolStartedEvent
  | ThinkingToolCompletedEvent
  | ThinkingProgressUpdatedEvent
  | ThinkingApprovalRequiredEvent
  | ThinkingCompletedEvent
  | ThinkingErrorEvent

// =============================================================================
// InsightCard Loading State
// =============================================================================

export type InsightLoadingPhase =
  | 'skeleton'    // 阶段1: 骨架屏 (0-0.5s)
  | 'thinking'    // 阶段2: 思考过程 (0.5-3s)
  | 'filling'     // 阶段3: 渐进填充 (3-5s)
  | 'ready'       // 完成

export interface InsightLoadingState {
  phase: InsightLoadingPhase
  /** 思考过程 (阶段2使用) */
  thinking?: ThinkingProcess
  /** 部分数据 (阶段3使用) */
  partial_data?: {
    title?: string
    symbol?: string
    type?: string
    metrics?: { key: string; value?: number; loading: boolean }[]
  }
}

// =============================================================================
// Hook Return Types
// =============================================================================

export interface UseThinkingStreamReturn {
  /** 当前思考进程 */
  process: ThinkingProcess | null
  /** 是否正在思考 */
  isThinking: boolean
  /** 是否需要审批 */
  needsApproval: boolean
  /** 开始新的思考进程 */
  startThinking: (userMessage: string) => void
  /** 取消当前思考 */
  cancelThinking: () => void
  /** 提交审批结果 */
  submitApproval: (approved: boolean, reason?: string) => void
}
