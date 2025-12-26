/**
 * AI 配置服务
 *
 * 管理模型配置、任务类型、预设等
 */

import type { AIModel, TaskTypeConfig, AITaskType, ModelTier, ModelCapability } from '../types/index.js'

// =============================================================================
// 模型配置 (与前端 types/ai.ts 保持同步)
// =============================================================================

export const AI_MODELS: Record<string, AIModel> = {
  // Tier 1 - 旗舰模型
  'anthropic/claude-opus-4.5': {
    id: 'anthropic/claude-opus-4.5',
    name: 'Claude Opus 4.5',
    provider: 'anthropic',
    tier: 'tier1',
    capabilities: ['reasoning', 'coding', 'agent'],
    contextLength: 200000,
    inputPrice: 15,
    outputPrice: 75,
    supportsStreaming: true,
    supportsThinking: true,
    description: '最强推理能力，复杂任务首选',
  },
  'anthropic/claude-sonnet-4.5': {
    id: 'anthropic/claude-sonnet-4.5',
    name: 'Claude Sonnet 4.5',
    provider: 'anthropic',
    tier: 'tier1',
    capabilities: ['reasoning', 'coding', 'agent'],
    contextLength: 200000,
    inputPrice: 3,
    outputPrice: 15,
    supportsStreaming: true,
    supportsThinking: true,
    description: '平衡性能与成本，推荐默认',
  },
  'openai/gpt-4.1': {
    id: 'openai/gpt-4.1',
    name: 'GPT-4.1',
    provider: 'openai',
    tier: 'tier1',
    capabilities: ['reasoning', 'coding', 'multimodal'],
    contextLength: 128000,
    inputPrice: 2,
    outputPrice: 8,
    supportsStreaming: true,
    supportsThinking: false,
    description: 'OpenAI 最新旗舰',
  },

  // Tier 2 - 高性价比
  'anthropic/claude-3.5-haiku': {
    id: 'anthropic/claude-3.5-haiku',
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    tier: 'tier2',
    capabilities: ['fast', 'cheap', 'coding'],
    contextLength: 200000,
    inputPrice: 0.8,
    outputPrice: 4,
    supportsStreaming: true,
    supportsThinking: false,
    description: '快速响应，适合简单任务',
  },
  'openai/gpt-4o-mini': {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    tier: 'tier2',
    capabilities: ['fast', 'cheap', 'multimodal'],
    contextLength: 128000,
    inputPrice: 0.15,
    outputPrice: 0.6,
    supportsStreaming: true,
    supportsThinking: false,
    description: '极致性价比',
  },
  'deepseek/deepseek-chat': {
    id: 'deepseek/deepseek-chat',
    name: 'DeepSeek V3',
    provider: 'deepseek',
    tier: 'tier2',
    capabilities: ['reasoning', 'coding', 'chinese', 'cheap'],
    contextLength: 64000,
    inputPrice: 0.14,
    outputPrice: 0.28,
    supportsStreaming: true,
    supportsThinking: true,
    description: '中文优化，超高性价比',
  },
  'google/gemini-2.0-flash-001': {
    id: 'google/gemini-2.0-flash-001',
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    tier: 'tier2',
    capabilities: ['fast', 'multimodal', 'realtime'],
    contextLength: 1000000,
    inputPrice: 0.1,
    outputPrice: 0.4,
    supportsStreaming: true,
    supportsThinking: false,
    description: '超长上下文，实时能力',
  },

  // Tier 3 - 专用模型
  'moonshotai/kimi-k2-instruct': {
    id: 'moonshotai/kimi-k2-instruct',
    name: 'Kimi K2',
    provider: 'moonshotai',
    tier: 'tier3',
    capabilities: ['agent', 'reasoning', 'chinese'],
    contextLength: 128000,
    inputPrice: 0.6,
    outputPrice: 2.5,
    supportsStreaming: true,
    supportsThinking: true,
    description: 'Agent 专精模型',
  },
  'qwen/qwen-2.5-coder-32b-instruct': {
    id: 'qwen/qwen-2.5-coder-32b-instruct',
    name: 'Qwen 2.5 Coder',
    provider: 'qwen',
    tier: 'tier3',
    capabilities: ['coding', 'chinese'],
    contextLength: 32000,
    inputPrice: 0.07,
    outputPrice: 0.16,
    supportsStreaming: true,
    supportsThinking: false,
    description: '代码生成专精',
  },
}

// =============================================================================
// 任务类型配置
// =============================================================================

export const TASK_TYPES: Record<AITaskType, TaskTypeConfig> = {
  scan: {
    type: 'scan',
    name: '快速扫描',
    priority: 'speed',
    recommendedModel: 'openai/gpt-4o-mini',
    alternativeModels: ['anthropic/claude-3.5-haiku', 'google/gemini-2.0-flash-001'],
  },
  analysis: {
    type: 'analysis',
    name: '策略分析',
    priority: 'intelligence',
    recommendedModel: 'anthropic/claude-sonnet-4.5',
    alternativeModels: ['openai/gpt-4.1', 'deepseek/deepseek-chat'],
  },
  execution: {
    type: 'execution',
    name: '执行确认',
    priority: 'reliability',
    recommendedModel: 'anthropic/claude-3.5-haiku',
    alternativeModels: ['openai/gpt-4o-mini'],
  },
  chat: {
    type: 'chat',
    name: '对话交流',
    priority: 'intelligence',
    recommendedModel: 'anthropic/claude-sonnet-4.5',
    alternativeModels: ['deepseek/deepseek-chat', 'openai/gpt-4.1'],
  },
  reasoning: {
    type: 'reasoning',
    name: '深度推理',
    priority: 'intelligence',
    recommendedModel: 'anthropic/claude-opus-4.5',
    alternativeModels: ['anthropic/claude-sonnet-4.5', 'deepseek/deepseek-chat'],
  },
  agent: {
    type: 'agent',
    name: 'Agent 执行',
    priority: 'intelligence',
    recommendedModel: 'moonshotai/kimi-k2-instruct',
    alternativeModels: ['anthropic/claude-sonnet-4.5', 'anthropic/claude-opus-4.5'],
  },
}

// =============================================================================
// 辅助函数
// =============================================================================

export function getModel(modelId: string): AIModel | undefined {
  return AI_MODELS[modelId]
}

export function getModelsByTier(tier: ModelTier): AIModel[] {
  return Object.values(AI_MODELS).filter(m => m.tier === tier)
}

export function getModelsByCapability(capability: ModelCapability): AIModel[] {
  return Object.values(AI_MODELS).filter(m => m.capabilities.includes(capability))
}

export function getTaskConfig(taskType: AITaskType): TaskTypeConfig {
  return TASK_TYPES[taskType]
}

export function calculateCost(model: AIModel, inputTokens: number, outputTokens: number): number {
  return (inputTokens * model.inputPrice + outputTokens * model.outputPrice) / 1_000_000
}
