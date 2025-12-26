/**
 * AI Engine Types - Delta Terminal
 *
 * OpenRouter 集成的 AI 引擎类型定义
 * 支持 15+ SOTA 模型，简单/高级模式，思考过程可视化
 */

// ============================================================================
// Model Definitions
// ============================================================================

/** 模型提供商 */
export type ModelProvider =
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'deepseek'
  | 'xai'
  | 'moonshotai'
  | 'qwen'
  | 'zhipu'

/** 模型 Tier 分级 */
export type ModelTier = 'tier1' | 'tier2' | 'tier3'

/** 模型能力标签 */
export type ModelCapability =
  | 'reasoning'      // 深度推理
  | 'coding'         // 代码生成
  | 'agent'          // Agent/工具调用
  | 'multimodal'     // 多模态
  | 'realtime'       // 实时知识
  | 'chinese'        // 中文优化
  | 'fast'           // 快速响应
  | 'cheap'          // 低成本

/** 模型定义 */
export interface AIModel {
  id: string                    // OpenRouter 模型 ID
  name: string                  // 显示名称
  provider: ModelProvider       // 提供商
  tier: ModelTier               // 分级
  capabilities: ModelCapability[] // 能力标签
  contextLength: number         // 上下文长度
  inputPrice: number            // 输入价格 ($/M tokens)
  outputPrice: number           // 输出价格 ($/M tokens)
  supportsStreaming: boolean    // 是否支持流式
  supportsThinking: boolean     // 是否支持思考过程
  description: string           // 描述
  icon: string                  // 图标 emoji
}

/** 支持的所有模型 */
export const AI_MODELS: Record<string, AIModel> = {
  // ==================== Tier 1: 核心模型 ====================
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
    icon: '🏆'
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
    description: '性价比之王，策略分析推荐',
    icon: '⭐'
  },
  'anthropic/claude-3.5-haiku': {
    id: 'anthropic/claude-3.5-haiku',
    name: 'Claude Haiku 3.5',
    provider: 'anthropic',
    tier: 'tier1',
    capabilities: ['fast', 'cheap'],
    contextLength: 200000,
    inputPrice: 1,
    outputPrice: 5,
    supportsStreaming: true,
    supportsThinking: false,
    description: '快速响应，执行确认推荐',
    icon: '⚡'
  },
  'openai/gpt-5.1': {
    id: 'openai/gpt-5.1',
    name: 'GPT-5.1',
    provider: 'openai',
    tier: 'tier1',
    capabilities: ['reasoning', 'coding', 'multimodal'],
    contextLength: 128000,
    inputPrice: 1.25,
    outputPrice: 10,
    supportsStreaming: true,
    supportsThinking: true,
    description: '全能旗舰，综合能力最强',
    icon: '🚀'
  },
  'openai/gpt-5-mini': {
    id: 'openai/gpt-5-mini',
    name: 'GPT-5 Mini',
    provider: 'openai',
    tier: 'tier1',
    capabilities: ['fast', 'cheap'],
    contextLength: 128000,
    inputPrice: 0.15,
    outputPrice: 0.60,
    supportsStreaming: true,
    supportsThinking: false,
    description: '经济实惠，市场扫描推荐',
    icon: '💨'
  },
  'openai/gpt-4o': {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    tier: 'tier1',
    capabilities: ['multimodal', 'coding'],
    contextLength: 128000,
    inputPrice: 2.50,
    outputPrice: 10,
    supportsStreaming: true,
    supportsThinking: false,
    description: '多模态强，对话交互推荐',
    icon: '🎯'
  },
  'deepseek/deepseek-v3.2': {
    id: 'deepseek/deepseek-v3.2',
    name: 'DeepSeek V3.2',
    provider: 'deepseek',
    tier: 'tier1',
    capabilities: ['reasoning', 'coding', 'cheap', 'chinese'],
    contextLength: 128000,
    inputPrice: 0.27,
    outputPrice: 1.10,
    supportsStreaming: true,
    supportsThinking: true,
    description: '超高性价比，中文优化',
    icon: '💰'
  },
  'google/gemini-3-pro-preview': {
    id: 'google/gemini-3-pro-preview',
    name: 'Gemini 3 Pro',
    provider: 'google',
    tier: 'tier1',
    capabilities: ['reasoning', 'multimodal'],
    contextLength: 2000000,
    inputPrice: 1.25,
    outputPrice: 10,
    supportsStreaming: true,
    supportsThinking: true,
    description: '超长上下文 2M tokens',
    icon: '📚'
  },
  'google/gemini-3-flash': {
    id: 'google/gemini-3-flash',
    name: 'Gemini 3 Flash',
    provider: 'google',
    tier: 'tier1',
    capabilities: ['fast', 'multimodal', 'cheap'],
    contextLength: 1000000,
    inputPrice: 0.15,
    outputPrice: 0.60,
    supportsStreaming: true,
    supportsThinking: false,
    description: '快速多模态，1M 上下文',
    icon: '⚡'
  },

  // ==================== Tier 2: 推荐模型 ====================
  'moonshotai/kimi-k2-thinking': {
    id: 'moonshotai/kimi-k2-thinking',
    name: 'Kimi K2 Thinking',
    provider: 'moonshotai',
    tier: 'tier2',
    capabilities: ['agent', 'reasoning', 'chinese'],
    contextLength: 256000,
    inputPrice: 0.15,
    outputPrice: 0.60,
    supportsStreaming: true,
    supportsThinking: true,
    description: 'Agent 专精，200-300 次工具调用',
    icon: '🤖'
  },
  'qwen/qwen3-max': {
    id: 'qwen/qwen3-max',
    name: 'Qwen 3 Max',
    provider: 'qwen',
    tier: 'tier2',
    capabilities: ['reasoning', 'chinese', 'cheap'],
    contextLength: 256000,
    inputPrice: 0.35,
    outputPrice: 0.60,
    supportsStreaming: true,
    supportsThinking: true,
    description: '中文优化，多语言支持',
    icon: '🇨🇳'
  },
  'xai/grok-4.1': {
    id: 'xai/grok-4.1',
    name: 'Grok 4.1',
    provider: 'xai',
    tier: 'tier2',
    capabilities: ['realtime', 'reasoning'],
    contextLength: 128000,
    inputPrice: 3,
    outputPrice: 15,
    supportsStreaming: true,
    supportsThinking: false,
    description: '实时知识，X/Twitter 数据',
    icon: '🌐'
  },

  // ==================== Tier 3: 可选模型 ====================
  'zhipu/glm-4.7': {
    id: 'zhipu/glm-4.7',
    name: 'GLM 4.7',
    provider: 'zhipu',
    tier: 'tier3',
    capabilities: ['chinese', 'cheap'],
    contextLength: 128000,
    inputPrice: 0.20,
    outputPrice: 0.80,
    supportsStreaming: true,
    supportsThinking: false,
    description: '智谱出品，中文能力强',
    icon: '🔮'
  },
  'qwen/qwen3-coder': {
    id: 'qwen/qwen3-coder',
    name: 'Qwen 3 Coder',
    provider: 'qwen',
    tier: 'tier3',
    capabilities: ['coding', 'agent'],
    contextLength: 256000,
    inputPrice: 1.20,
    outputPrice: 6,
    supportsStreaming: true,
    supportsThinking: false,
    description: '代码专精，Agent 工作流',
    icon: '💻'
  }
}

/** 获取所有模型列表 */
export const getAllModels = (): AIModel[] => Object.values(AI_MODELS)

/** 按 Tier 获取模型 */
export const getModelsByTier = (tier: ModelTier): AIModel[] =>
  getAllModels().filter(m => m.tier === tier)

/** 按能力获取模型 */
export const getModelsByCapability = (capability: ModelCapability): AIModel[] =>
  getAllModels().filter(m => m.capabilities.includes(capability))

// ============================================================================
// Task Types
// ============================================================================

/** 任务类型 */
export type AITaskType =
  | 'scan'        // 市场扫描
  | 'analysis'    // 策略分析
  | 'execution'   // 执行确认
  | 'chat'        // 对话交互
  | 'reasoning'   // 复杂推理
  | 'agent'       // Agent 任务

/** 任务类型配置 */
export interface TaskTypeConfig {
  type: AITaskType
  name: string
  description: string
  priority: 'speed' | 'intelligence' | 'reliability' | 'natural' | 'cost'
  recommendedModel: string
  alternativeModels: string[]
  icon: string
}

/** 任务类型定义 */
export const TASK_TYPES: Record<AITaskType, TaskTypeConfig> = {
  scan: {
    type: 'scan',
    name: '市场扫描',
    description: '全市场机会发现、异常检测',
    priority: 'speed',
    recommendedModel: 'openai/gpt-5-mini',
    alternativeModels: ['google/gemini-3-flash', 'deepseek/deepseek-v3.2'],
    icon: '🔍'
  },
  analysis: {
    type: 'analysis',
    name: '策略分析',
    description: '深度分析、多因子评估、回测解读',
    priority: 'intelligence',
    recommendedModel: 'anthropic/claude-sonnet-4.5',
    alternativeModels: ['openai/gpt-5.1', 'deepseek/deepseek-v3.2'],
    icon: '📊'
  },
  execution: {
    type: 'execution',
    name: '执行确认',
    description: '交易前最终检查、风险验证',
    priority: 'reliability',
    recommendedModel: 'anthropic/claude-3.5-haiku',
    alternativeModels: ['deepseek/deepseek-v3.2', 'openai/gpt-5-mini'],
    icon: '⚡'
  },
  chat: {
    type: 'chat',
    name: '对话交互',
    description: '日常聊天、策略讨论、教学问答',
    priority: 'natural',
    recommendedModel: 'openai/gpt-4o',
    alternativeModels: ['qwen/qwen3-max', 'anthropic/claude-sonnet-4.5'],
    icon: '💬'
  },
  reasoning: {
    type: 'reasoning',
    name: '复杂推理',
    description: '多步骤推理、复杂决策、深度分析',
    priority: 'intelligence',
    recommendedModel: 'anthropic/claude-opus-4.5',
    alternativeModels: ['openai/gpt-5.1', 'google/gemini-3-pro-preview'],
    icon: '🧠'
  },
  agent: {
    type: 'agent',
    name: 'Agent 任务',
    description: '自动化工作流、多步骤工具调用',
    priority: 'reliability',
    recommendedModel: 'moonshotai/kimi-k2-thinking',
    alternativeModels: ['anthropic/claude-sonnet-4.5', 'qwen/qwen3-coder'],
    icon: '🤖'
  }
}

// ============================================================================
// Configuration Types
// ============================================================================

/** 简单模式预设 */
export type SimplePreset = 'economy' | 'balanced' | 'performance' | 'chinese' | 'agent'

/** 简单模式预设配置 */
export interface SimplePresetConfig {
  preset: SimplePreset
  name: string
  description: string
  defaultModel: string
  estimatedCostPerCall: number  // 预估每次调用成本 ($)
  icon: string
}

export const SIMPLE_PRESETS: Record<SimplePreset, SimplePresetConfig> = {
  economy: {
    preset: 'economy',
    name: '经济型',
    description: '成本最低，适合高频调用',
    defaultModel: 'deepseek/deepseek-v3.2',
    estimatedCostPerCall: 0.002,
    icon: '💰'
  },
  balanced: {
    preset: 'balanced',
    name: '平衡型',
    description: '性能与成本平衡，大多数场景推荐',
    defaultModel: 'deepseek/deepseek-v3.2',
    estimatedCostPerCall: 0.002,
    icon: '⚖️'
  },
  performance: {
    preset: 'performance',
    name: '性能型',
    description: '最强智能，复杂任务首选',
    defaultModel: 'anthropic/claude-opus-4.5',
    estimatedCostPerCall: 0.10,
    icon: '🚀'
  },
  chinese: {
    preset: 'chinese',
    name: '中文优化',
    description: '中文理解和生成最佳',
    defaultModel: 'qwen/qwen3-max',
    estimatedCostPerCall: 0.005,
    icon: '🇨🇳'
  },
  agent: {
    preset: 'agent',
    name: 'Agent 专精',
    description: '自动化交易、多步骤工具调用',
    defaultModel: 'moonshotai/kimi-k2-thinking',
    estimatedCostPerCall: 0.008,
    icon: '🤖'
  }
}

/** AI 配置 */
export interface AIConfig {
  // 模式选择
  mode: 'simple' | 'advanced'

  // 简单模式配置
  simple: {
    preset: SimplePreset
    customModel?: string | undefined  // 自定义模型覆盖预设
  }

  // 高级模式配置
  advanced: {
    taskModels: Record<AITaskType, string>
  }

  // 通用设置
  settings: {
    streaming: boolean           // 是否启用流式输出
    showThinking: boolean        // 是否显示思考过程
    autoRoute: boolean           // 是否启用自动路由
    maxTokens: number            // 最大输出 tokens
    temperature: number          // 温度参数
  }
}

/** 默认 AI 配置 */
export const DEFAULT_AI_CONFIG: AIConfig = {
  mode: 'simple',
  simple: {
    preset: 'balanced'
  },
  advanced: {
    taskModels: {
      scan: 'deepseek/deepseek-v3.2',
      analysis: 'deepseek/deepseek-v3.2',
      execution: 'deepseek/deepseek-v3.2',
      chat: 'deepseek/deepseek-v3.2',
      reasoning: 'deepseek/deepseek-v3.2',
      agent: 'deepseek/deepseek-v3.2'
    }
  },
  settings: {
    streaming: true,
    showThinking: true,
    autoRoute: false,
    maxTokens: 2048,
    temperature: 0.7
  }
}

// ============================================================================
// User Status Types
// ============================================================================

/** 订阅计划 */
export type SubscriptionPlan = 'free' | 'pro' | 'enterprise'

/** 订阅计划配置 */
export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, {
  name: string
  monthlyCredits: number
  features: string[]
}> = {
  free: { name: '免费版', monthlyCredits: 100, features: ['基础模型访问', '每日限量调用'] },
  pro: { name: '专业版', monthlyCredits: 5000, features: ['全部模型访问', '优先响应', '高级分析'] },
  enterprise: { name: '企业版', monthlyCredits: -1, features: ['无限制访问', '专属支持', '自定义模型'] },
}

/** 用户 AI 状态 */
export interface AIUserStatus {
  /** 订阅信息 */
  subscription: {
    plan: SubscriptionPlan
    status: 'active' | 'expired' | 'cancelled' | 'past_due'
    currentPeriodEnd: number
    cancelAtPeriodEnd: boolean
  }
  /** 额度信息 */
  credits: {
    balance: number
    used: number
    includedRemaining: number
  }
  /** 使用统计 */
  usage: {
    monthCalls: number
    monthCost: number
  }
  /** 限制信息 */
  limits: {
    canUseAI: boolean
    allowedModels: string[]
    maxCallsPerDay: number
    remainingCallsToday: number
    reason?: string
  }
}

/** 默认用户状态（无限制访问） */
export const DEFAULT_AI_USER_STATUS: AIUserStatus = {
  subscription: {
    plan: 'enterprise',
    status: 'active',
    currentPeriodEnd: Date.now() + 365 * 24 * 60 * 60 * 1000,
    cancelAtPeriodEnd: false,
  },
  credits: {
    balance: 999999,
    used: 0,
    includedRemaining: 999999,
  },
  usage: {
    monthCalls: 0,
    monthCost: 0,
  },
  limits: {
    canUseAI: true,
    allowedModels: ['*'],
    maxCallsPerDay: 999999,
    remainingCallsToday: 999999,
  },
}

// ============================================================================
// Request/Response Types
// ============================================================================

/** AI 请求 */
export interface AIRequest {
  taskType: AITaskType
  messages: AIMessage[]
  model?: string                 // 覆盖配置的模型
  streaming?: boolean            // 覆盖配置的流式设置
  maxTokens?: number
  temperature?: number
  context?: {
    strategyId?: string
    marketData?: Record<string, unknown>
    userPreferences?: Record<string, unknown>
  }
}

/** AI 消息 */
export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** AI 响应 */
export interface AIResponse {
  id: string
  model: string
  content: string
  thinking?: ThinkingStep[]      // 思考过程
  usage: {
    inputTokens: number
    outputTokens: number
    totalCost: number            // 本次调用成本 ($)
  }
  latency: number                // 响应延迟 (ms)
  finishReason: 'stop' | 'length' | 'error'
}

/** 思考步骤 */
export interface ThinkingStep {
  step: number
  title: string
  content: string
  status: 'pending' | 'processing' | 'completed'
  duration?: number              // 步骤耗时 (ms)
}

/** 流式响应块 */
export interface AIStreamChunk {
  type: 'thinking' | 'content' | 'usage' | 'done' | 'error'
  data: {
    thinking?: ThinkingStep
    content?: string
    usage?: AIResponse['usage']
    error?: string
  }
}

// ============================================================================
// Usage & Statistics
// ============================================================================

/** 使用统计 */
export interface AIUsageStats {
  period: 'day' | 'week' | 'month'
  totalCalls: number
  totalInputTokens: number
  totalOutputTokens: number
  totalCost: number
  byModel: Record<string, {
    calls: number
    inputTokens: number
    outputTokens: number
    cost: number
  }>
  byTaskType: Record<AITaskType, {
    calls: number
    cost: number
    avgLatency: number
  }>
}

/** 成本预估 */
export interface CostEstimate {
  daily: number
  weekly: number
  monthly: number
  breakdown: {
    taskType: AITaskType
    estimatedCalls: number
    costPerCall: number
    totalCost: number
  }[]
}

// ============================================================================
// Auto Router
// ============================================================================

/** 自动路由配置 */
export interface AutoRouterConfig {
  enabled: boolean
  rules: AutoRouterRule[]
}

/** 自动路由规则 */
export interface AutoRouterRule {
  id: string
  name: string
  condition: {
    taskType?: AITaskType
    contextLength?: { min?: number; max?: number }
    urgency?: 'low' | 'medium' | 'high'
    costSensitive?: boolean
  }
  targetModel: string
  priority: number
}

/** 默认自动路由规则 */
export const DEFAULT_AUTO_ROUTER_RULES: AutoRouterRule[] = [
  {
    id: 'long-context',
    name: '超长上下文',
    condition: { contextLength: { min: 100000 } },
    targetModel: 'google/gemini-3-pro-preview',
    priority: 100
  },
  {
    id: 'urgent-execution',
    name: '紧急执行',
    condition: { taskType: 'execution', urgency: 'high' },
    targetModel: 'anthropic/claude-3.5-haiku',
    priority: 90
  },
  {
    id: 'cost-sensitive',
    name: '成本敏感',
    condition: { costSensitive: true },
    targetModel: 'deepseek/deepseek-v3.2',
    priority: 80
  },
  {
    id: 'agent-workflow',
    name: 'Agent 工作流',
    condition: { taskType: 'agent' },
    targetModel: 'moonshotai/kimi-k2-thinking',
    priority: 70
  }
]
