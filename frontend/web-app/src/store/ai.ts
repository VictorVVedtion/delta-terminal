/**
 * AI Store - Delta Terminal
 *
 * AI 引擎状态管理，包括配置、使用统计、对话历史等
 */

import { create } from 'zustand'
import { createJSONStorage,persist } from 'zustand/middleware'

import type {
  AIConfig,
  AIResponse,
  AITaskType,
  AIUsageStats,
  AIUserStatus,
  CostEstimate,
  SimplePreset,
  ThinkingStep} from '@/types/ai';
import {
  AI_MODELS,
  DEFAULT_AI_CONFIG,
  DEFAULT_AI_USER_STATUS,
  SIMPLE_PRESETS} from '@/types/ai'

// ============================================================================
// State Types
// ============================================================================

interface AIState {
  // 配置
  config: AIConfig

  // 用户状态（从后端获取）
  userStatus: AIUserStatus
  userStatusLoading: boolean

  // 当前状态
  isLoading: boolean
  currentTaskType: AITaskType | null
  currentModel: string | null
  thinkingSteps: ThinkingStep[]
  streamingContent: string

  // 使用统计（本地追踪，与后端同步）
  usage: {
    today: AIUsageStats
    thisWeek: AIUsageStats
    thisMonth: AIUsageStats
  }

  // 对话历史 (按 session)
  sessions: Record<string, AISession>
  currentSessionId: string | null

  // 错误状态
  error: string | null
}

interface AISession {
  id: string
  taskType: AITaskType
  model: string
  messages: AISessionMessage[]
  createdAt: number
  updatedAt: number
  totalCost: number
}

interface AISessionMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  thinking?: ThinkingStep[]
  usage?: AIResponse['usage']
  timestamp: number
}

// ============================================================================
// Actions
// ============================================================================

/** 后端模型路由配置响应 */
interface BackendRoutingConfig {
  system_defaults: Record<string, string>
  user_overrides: Record<string, string>
  effective_config: Record<string, string>
  available_tasks: string[]
}

interface AIActions {
  // 配置管理
  setMode: (mode: 'simple' | 'advanced') => void
  setSimplePreset: (preset: SimplePreset) => void
  setCustomModel: (model: string) => void
  setTaskModel: (taskType: AITaskType, model: string) => void
  updateSettings: (settings: Partial<AIConfig['settings']>) => void
  resetConfig: () => void

  // 后端同步 (新增)
  syncWithBackend: () => Promise<void>
  saveToBackend: () => Promise<boolean>
  loadFromBackend: () => Promise<void>

  // 用户状态管理
  setUserStatus: (status: AIUserStatus) => void
  setUserStatusLoading: (loading: boolean) => void
  refreshUserStatus: () => Promise<void>

  // 状态管理
  setLoading: (loading: boolean) => void
  setCurrentTask: (taskType: AITaskType | null, model: string | null) => void
  addThinkingStep: (step: ThinkingStep) => void
  updateThinkingStep: (stepIndex: number, update: Partial<ThinkingStep>) => void
  clearThinkingSteps: () => void
  appendStreamingContent: (content: string) => void
  clearStreamingContent: () => void
  setError: (error: string | null) => void

  // Session 管理
  createSession: (taskType: AITaskType, model: string) => string
  addMessage: (sessionId: string, message: Omit<AISessionMessage, 'id' | 'timestamp'>) => void
  clearSession: (sessionId: string) => void
  setCurrentSession: (sessionId: string | null) => void

  // 使用统计
  recordUsage: (taskType: AITaskType, model: string, usage: AIResponse['usage']) => void
  resetUsage: (period: 'day' | 'week' | 'month') => void

  // 工具方法
  getModelForTask: (taskType: AITaskType) => string
  estimateCost: () => CostEstimate
  canUseModel: (model: string) => boolean
  isModelAllowed: (model: string) => boolean
}

// ============================================================================
// Initial State
// ============================================================================

const createEmptyUsageStats = (period: 'day' | 'week' | 'month'): AIUsageStats => ({
  period,
  totalCalls: 0,
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalCost: 0,
  byModel: {},
  byTaskType: {
    scan: { calls: 0, cost: 0, avgLatency: 0 },
    analysis: { calls: 0, cost: 0, avgLatency: 0 },
    execution: { calls: 0, cost: 0, avgLatency: 0 },
    chat: { calls: 0, cost: 0, avgLatency: 0 },
    reasoning: { calls: 0, cost: 0, avgLatency: 0 },
    agent: { calls: 0, cost: 0, avgLatency: 0 }
  }
})

const initialState: AIState = {
  config: DEFAULT_AI_CONFIG,
  userStatus: DEFAULT_AI_USER_STATUS,
  userStatusLoading: false,
  isLoading: false,
  currentTaskType: null,
  currentModel: null,
  thinkingSteps: [],
  streamingContent: '',
  usage: {
    today: createEmptyUsageStats('day'),
    thisWeek: createEmptyUsageStats('week'),
    thisMonth: createEmptyUsageStats('month')
  },
  sessions: {},
  currentSessionId: null,
  error: null
}

// ============================================================================
// Store
// ============================================================================

export const useAIStore = create<AIState & AIActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ==================== 配置管理 ====================

      setMode: (mode) => {
        set((state) => ({
          config: { ...state.config, mode }
        }))
      },

      setSimplePreset: (preset) => {
        set((state) => ({
          config: {
            ...state.config,
            simple: { preset } // 切换预设时清除自定义模型
          }
        }))
      },

      setCustomModel: (model) => {
        set((state) => ({
          config: {
            ...state.config,
            simple: { ...state.config.simple, customModel: model }
          }
        }))
      },

      setTaskModel: (taskType, model) => {
        set((state) => ({
          config: {
            ...state.config,
            advanced: {
              ...state.config.advanced,
              taskModels: {
                ...state.config.advanced.taskModels,
                [taskType]: model
              }
            }
          }
        }))
      },

      updateSettings: (settings) => {
        set((state) => ({
          config: {
            ...state.config,
            settings: { ...state.config.settings, ...settings }
          }
        }))
      },

      resetConfig: () => {
        set({ config: DEFAULT_AI_CONFIG })
      },

      // ==================== 后端同步 ====================

      syncWithBackend: async () => {
        // 同时加载配置和保存本地更改
        await get().loadFromBackend()
      },

      saveToBackend: async () => {
        try {
          const { config } = get()
          // 只在高级模式下同步任务模型配置
          if (config.mode !== 'advanced') return true

          // 将前端任务类型映射到后端任务类型
          const taskMapping: Record<AITaskType, string> = {
            scan: 'market_analysis',
            analysis: 'insight_generation',
            execution: 'intent_recognition',
            chat: 'simple_chat',
            reasoning: 'complex_reasoning',
            agent: 'strategy_generation',
          }

          const taskRouting: Record<string, string> = {}
          for (const [frontendTask, backendTask] of Object.entries(taskMapping)) {
            const model = config.advanced.taskModels[frontendTask as AITaskType]
            if (model) {
              taskRouting[backendTask] = model
            }
          }

          const response = await fetch('/api/ai/config', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              task_routing: taskRouting,
              prefer_speed: false,
              prefer_cost: false,
              prefer_quality: true,
            }),
          })

          if (!response.ok) {
            console.error('Failed to save AI config to backend')
            return false
          }

          console.log('AI config saved to backend successfully')
          return true
        } catch (error) {
          console.error('Error saving AI config to backend:', error)
          return false
        }
      },

      loadFromBackend: async () => {
        try {
          const response = await fetch('/api/ai/config')
          if (!response.ok) {
            console.warn('Failed to load AI config from backend, using local config')
            return
          }

          const data = await response.json() as BackendRoutingConfig
          console.log('Loaded AI config from backend:', data)

          // 后端任务类型到前端的映射
          const reverseMapping: Record<string, AITaskType> = {
            market_analysis: 'scan',
            insight_generation: 'analysis',
            intent_recognition: 'execution',
            simple_chat: 'chat',
            complex_reasoning: 'reasoning',
            strategy_generation: 'agent',
          }

          // 更新高级模式的任务模型配置
          const taskModels: Record<AITaskType, string> = { ...get().config.advanced.taskModels }

          for (const [backendTask, model] of Object.entries(data.effective_config)) {
            const frontendTask = reverseMapping[backendTask]
            if (frontendTask && model) {
              taskModels[frontendTask] = model
            }
          }

          set((state) => ({
            config: {
              ...state.config,
              advanced: {
                ...state.config.advanced,
                taskModels,
              },
            },
          }))
        } catch (error) {
          console.error('Error loading AI config from backend:', error)
        }
      },

      // ==================== 用户状态管理 ====================

      setUserStatus: (userStatus) => {
        set({ userStatus })
      },

      setUserStatusLoading: (userStatusLoading) => {
        set({ userStatusLoading })
      },

      refreshUserStatus: async () => {
        set({ userStatusLoading: true })
        try {
          // 调用后端 API 获取用户状态
          const response = await fetch('/api/ai/status')
          if (response.ok) {
            const status = await response.json()
            set({ userStatus: status, userStatusLoading: false })
          } else {
            // 如果获取失败，使用默认状态
            set({ userStatus: DEFAULT_AI_USER_STATUS, userStatusLoading: false })
          }
        } catch {
          set({ userStatus: DEFAULT_AI_USER_STATUS, userStatusLoading: false })
        }
      },

      // ==================== 状态管理 ====================

      setLoading: (isLoading) => {
        set({ isLoading })
      },

      setCurrentTask: (taskType, model) => {
        set({ currentTaskType: taskType, currentModel: model })
      },

      addThinkingStep: (step) => {
        set((state) => ({
          thinkingSteps: [...state.thinkingSteps, step]
        }))
      },

      updateThinkingStep: (stepIndex, update) => {
        set((state) => ({
          thinkingSteps: state.thinkingSteps.map((step, index) =>
            index === stepIndex ? { ...step, ...update } : step
          )
        }))
      },

      clearThinkingSteps: () => {
        set({ thinkingSteps: [] })
      },

      appendStreamingContent: (content) => {
        set((state) => ({
          streamingContent: state.streamingContent + content
        }))
      },

      clearStreamingContent: () => {
        set({ streamingContent: '' })
      },

      setError: (error) => {
        set({ error })
      },

      // ==================== Session 管理 ====================

      createSession: (taskType, model) => {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const session: AISession = {
          id: sessionId,
          taskType,
          model,
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          totalCost: 0
        }

        set((state) => ({
          sessions: { ...state.sessions, [sessionId]: session },
          currentSessionId: sessionId
        }))

        return sessionId
      },

      addMessage: (sessionId, message) => {
        const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const fullMessage: AISessionMessage = {
          ...message,
          id: messageId,
          timestamp: Date.now()
        }

        set((state) => {
          const session = state.sessions[sessionId]
          if (!session) return state

          const updatedSession: AISession = {
            ...session,
            messages: [...session.messages, fullMessage],
            updatedAt: Date.now(),
            totalCost: session.totalCost + (message.usage?.totalCost || 0)
          }

          return {
            sessions: { ...state.sessions, [sessionId]: updatedSession }
          }
        })
      },

      clearSession: (sessionId) => {
        set((state) => {
          const { [sessionId]: _, ...rest } = state.sessions
          return {
            sessions: rest,
            currentSessionId: state.currentSessionId === sessionId ? null : state.currentSessionId
          }
        })
      },

      setCurrentSession: (sessionId) => {
        set({ currentSessionId: sessionId })
      },

      // ==================== 使用统计 ====================

      recordUsage: (taskType, model, usage) => {
        set((state) => {
          const updateStats = (stats: AIUsageStats): AIUsageStats => {
            const modelStats = stats.byModel[model] || {
              calls: 0,
              inputTokens: 0,
              outputTokens: 0,
              cost: 0
            }

            const taskStats = stats.byTaskType[taskType]

            return {
              ...stats,
              totalCalls: stats.totalCalls + 1,
              totalInputTokens: stats.totalInputTokens + usage.inputTokens,
              totalOutputTokens: stats.totalOutputTokens + usage.outputTokens,
              totalCost: stats.totalCost + usage.totalCost,
              byModel: {
                ...stats.byModel,
                [model]: {
                  calls: modelStats.calls + 1,
                  inputTokens: modelStats.inputTokens + usage.inputTokens,
                  outputTokens: modelStats.outputTokens + usage.outputTokens,
                  cost: modelStats.cost + usage.totalCost
                }
              },
              byTaskType: {
                ...stats.byTaskType,
                [taskType]: {
                  calls: taskStats.calls + 1,
                  cost: taskStats.cost + usage.totalCost,
                  avgLatency: taskStats.avgLatency // TODO: 更新平均延迟
                }
              }
            }
          }

          return {
            usage: {
              today: updateStats(state.usage.today),
              thisWeek: updateStats(state.usage.thisWeek),
              thisMonth: updateStats(state.usage.thisMonth)
            }
          }
        })
      },

      resetUsage: (period) => {
        set((state) => ({
          usage: {
            ...state.usage,
            [period === 'day' ? 'today' : period === 'week' ? 'thisWeek' : 'thisMonth']:
              createEmptyUsageStats(period)
          }
        }))
      },

      // ==================== 工具方法 ====================

      getModelForTask: (taskType) => {
        const { config } = get()

        if (config.mode === 'simple') {
          // 简单模式：使用预设或自定义模型
          if (config.simple.customModel) {
            return config.simple.customModel
          }
          return SIMPLE_PRESETS[config.simple.preset].defaultModel
        } else {
          // 高级模式：按任务类型选择模型
          return config.advanced.taskModels[taskType]
        }
      },

      estimateCost: () => {
        const { config: _config } = get()

        // 预估每日调用量
        const estimatedDailyCalls: Record<AITaskType, number> = {
          scan: 50,       // 市场扫描：每天 50 次
          analysis: 10,   // 策略分析：每天 10 次
          execution: 5,   // 执行确认：每天 5 次
          chat: 20,       // 对话交互：每天 20 次
          reasoning: 3,   // 复杂推理：每天 3 次
          agent: 5        // Agent 任务：每天 5 次
        }

        const breakdown = Object.entries(estimatedDailyCalls).map(([taskType, calls]) => {
          const model = get().getModelForTask(taskType as AITaskType)
          const modelInfo = AI_MODELS[model]

          // 预估每次调用的 token 消耗
          const avgInputTokens = taskType === 'analysis' ? 2000 : taskType === 'agent' ? 3000 : 500
          const avgOutputTokens = taskType === 'analysis' ? 1000 : taskType === 'agent' ? 2000 : 300

          const costPerCall = modelInfo
            ? (avgInputTokens * modelInfo.inputPrice + avgOutputTokens * modelInfo.outputPrice) / 1000000
            : 0.01

          return {
            taskType: taskType as AITaskType,
            estimatedCalls: calls,
            costPerCall,
            totalCost: calls * costPerCall
          }
        })

        const daily = breakdown.reduce((sum, item) => sum + item.totalCost, 0)

        return {
          daily,
          weekly: daily * 7,
          monthly: daily * 30,
          breakdown
        }
      },

      canUseModel: (model) => {
        const { userStatus } = get()
        if (!userStatus.limits.canUseAI) return false
        return get().isModelAllowed(model)
      },

      isModelAllowed: (model) => {
        const { userStatus } = get()
        const allowedModels = userStatus.limits.allowedModels
        // '*' 表示全部模型
        if (allowedModels.includes('*')) return true
        return allowedModels.includes(model)
      }
    }),
    {
      name: 'delta-ai-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // 只持久化配置和使用统计，不持久化临时状态
        config: state.config,
        usage: state.usage,
        sessions: state.sessions
      })
    }
  )
)

// ============================================================================
// Selectors
// ============================================================================

/** 获取当前模式 */
export const selectMode = (state: AIState) => state.config.mode

/** 获取当前预设 */
export const selectPreset = (state: AIState) => state.config.simple.preset

/** 获取用户状态 */
export const selectUserStatus = (state: AIState) => state.userStatus

/** 获取是否可以使用 AI */
export const selectCanUseAI = (state: AIState) => state.userStatus.limits.canUseAI

/** 获取当前 session */
export const selectCurrentSession = (state: AIState) =>
  state.currentSessionId ? state.sessions[state.currentSessionId] : null

/** 获取月度费用 */
export const selectMonthlyUsage = (state: AIState) => state.usage.thisMonth

/** 获取是否支持思考过程 */
export const selectSupportsThinking = (state: AIState) => {
  if (!state.currentModel) return false
  const model = AI_MODELS[state.currentModel]
  return model.supportsThinking ?? false
}
