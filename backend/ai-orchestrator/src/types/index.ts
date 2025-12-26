/**
 * AI Orchestrator 核心类型定义
 *
 * 基于 delta-terminal-complete-spec-v1.md 规格设计
 */

import { z } from 'zod'

// =============================================================================
// 模型相关类型
// =============================================================================

export type ModelProvider = 'anthropic' | 'openai' | 'google' | 'deepseek' | 'xai' | 'moonshotai' | 'qwen' | 'zhipu'
export type ModelTier = 'tier1' | 'tier2' | 'tier3'
export type ModelCapability = 'reasoning' | 'coding' | 'agent' | 'multimodal' | 'realtime' | 'chinese' | 'fast' | 'cheap'

export interface AIModel {
  id: string
  name: string
  provider: ModelProvider
  tier: ModelTier
  capabilities: ModelCapability[]
  contextLength: number
  inputPrice: number  // $/M tokens
  outputPrice: number // $/M tokens
  supportsStreaming: boolean
  supportsThinking: boolean
  description: string
}

// =============================================================================
// 任务类型
// =============================================================================

export type AITaskType = 'scan' | 'analysis' | 'execution' | 'chat' | 'reasoning' | 'agent'

export interface TaskTypeConfig {
  type: AITaskType
  name: string
  priority: 'speed' | 'intelligence' | 'reliability' | 'cost'
  recommendedModel: string
  alternativeModels: string[]
}

// =============================================================================
// Skill 架构 (符合规格文档)
// =============================================================================

export type SkillCategory = 'intelligence' | 'action' | 'query'

export interface SkillDefinition {
  id: string
  name: string
  category: SkillCategory
  description: string
  parameters: z.ZodSchema
  execute: (params: unknown, context: SkillContext) => Promise<SkillResult>
}

export interface SkillContext {
  userId: string
  conversationId: string
  sessionId: string
  model: string
  metadata?: Record<string, unknown>
}

export interface SkillResult {
  success: boolean
  data?: unknown
  error?: string
  usage?: UsageStats
}

// =============================================================================
// 用户状态与配额
// =============================================================================

export type SubscriptionPlan = 'free' | 'pro' | 'enterprise'

export interface UserStatus {
  userId: string
  subscription: {
    plan: SubscriptionPlan
    status: 'active' | 'past_due' | 'canceled'
    currentPeriodEnd: number
  }
  credits: {
    balance: number
    used: number
    monthlyLimit: number
  }
  limits: {
    canUseAI: boolean
    allowedModels: string[]
    maxCallsPerDay: number
    remainingCallsToday: number
  }
}

// =============================================================================
// 请求/响应类型
// =============================================================================

export const ChatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string(),
  })),
  model: z.string().optional(),
  taskType: z.enum(['scan', 'analysis', 'execution', 'chat', 'reasoning', 'agent']).optional(),
  maxTokens: z.number().optional(),
  temperature: z.number().min(0).max(2).optional(),
  streaming: z.boolean().optional(),
})

export type ChatRequest = z.infer<typeof ChatRequestSchema>

export interface ChatResponse {
  id: string
  model: string
  content: string
  thinking?: ThinkingStep[]
  insightData?: InsightData
  usage: UsageStats
  latency: number
  finishReason: 'stop' | 'length' | 'error'
}

// =============================================================================
// 思考步骤
// =============================================================================

export interface ThinkingStep {
  step: number
  title: string
  content: string
  status: 'pending' | 'processing' | 'completed'
  duration?: number
}

// =============================================================================
// A2UI InsightData (规格文档 Section 20)
// =============================================================================

export type InsightType = 'strategy_create' | 'strategy_modify' | 'batch_adjust' | 'risk_alert' | 'analysis_result'

export interface InsightData {
  id: string
  type: InsightType
  params: InsightParam[]
  evidence?: {
    chart?: ChartData
    comparison?: ComparisonData
  }
  impact?: {
    metrics: ImpactMetric[]
    confidence: number
    sampleSize: number
  }
  explanation: string
  actions: InsightAction[]
}

export type ParamType = 'slider' | 'number' | 'select' | 'toggle' | 'button_group' | 'logic_builder' | 'heatmap_slider'

export interface InsightParam {
  id: string
  key: string
  label: string
  description?: string
  type: ParamType
  value: unknown
  oldValue?: unknown
  level: 1 | 2  // 1 = 主要参数, 2 = 高级参数
  constraints?: ParamConstraints
  options?: ParamOption[]
}

export interface ParamConstraints {
  min?: number
  max?: number
  step?: number
  required?: boolean
  dependencies?: string[]
}

export interface ParamOption {
  value: string | number
  label: string
  description?: string
}

export interface InsightAction {
  id: string
  label: string
  type: 'primary' | 'secondary' | 'danger'
  action: string  // Action ID to call
}

export interface ChartData {
  type: 'line' | 'bar' | 'candlestick' | 'heatmap'
  data: unknown
  config?: Record<string, unknown>
}

export interface ComparisonData {
  before: Record<string, unknown>
  after: Record<string, unknown>
  changes: Array<{ key: string; oldValue: unknown; newValue: unknown; change: number }>
}

export interface ImpactMetric {
  name: string
  value: number
  unit: string
  change?: number
  isPositive?: boolean
}

// =============================================================================
// 使用统计
// =============================================================================

export interface UsageStats {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  totalCost: number
  model: string
  timestamp: number
}

// =============================================================================
// 流式响应 Chunk
// =============================================================================

export type StreamChunkType = 'thinking' | 'content' | 'insight' | 'usage' | 'error' | 'done'

export interface StreamChunk {
  type: StreamChunkType
  data: {
    thinking?: ThinkingStep
    content?: string
    insight?: InsightData
    usage?: UsageStats
    error?: string
  }
}

// =============================================================================
// 模型路由配置
// =============================================================================

export interface ModelRoutingConfig {
  taskType: AITaskType
  userTier: SubscriptionPlan
  preferChinese: boolean
  preferSpeed: boolean
  preferCost: boolean
}

// =============================================================================
// NLP Processor 集成类型
// =============================================================================

export interface NLPProcessorRequest {
  message: string
  conversationId?: string
  userId: string
  context?: Record<string, unknown>
}

export interface NLPProcessorResponse {
  message: string
  conversationId: string
  intent: string
  confidence: number
  extractedParams?: Record<string, unknown>
  suggestedActions?: string[]
  insight?: InsightData
}
