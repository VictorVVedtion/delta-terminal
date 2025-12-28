/**
 * AIStore Tests - AI 引擎状态管理测试
 * 覆盖配置管理、Session 管理、使用统计等核心功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act } from '@testing-library/react'

import { useAIStore } from '../ai'
import { DEFAULT_AI_CONFIG, DEFAULT_AI_USER_STATUS } from '@/types/ai'
import type { AITaskType, AIResponse } from '@/types/ai'

// =============================================================================
// Test Setup
// =============================================================================

// Mock fetch API
global.fetch = vi.fn()

const mockUsage: AIResponse['usage'] = {
  inputTokens: 1000,
  outputTokens: 500,
  totalTokens: 1500,
  totalCost: 0.015,
  latency: 1200,
}

describe('AIStore', () => {
  beforeEach(() => {
    // 清空 localStorage
    localStorage.clear()

    // 重置 fetch mock
    vi.clearAllMocks()

    // 重置 store 到初始状态
    act(() => {
      useAIStore.setState({
        config: DEFAULT_AI_CONFIG,
        userStatus: DEFAULT_AI_USER_STATUS,
        userStatusLoading: false,
        isLoading: false,
        currentTaskType: null,
        currentModel: null,
        thinkingSteps: [],
        streamingContent: '',
        usage: {
          today: {
            period: 'day',
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
              agent: { calls: 0, cost: 0, avgLatency: 0 },
            },
          },
          thisWeek: {
            period: 'week',
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
              agent: { calls: 0, cost: 0, avgLatency: 0 },
            },
          },
          thisMonth: {
            period: 'month',
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
              agent: { calls: 0, cost: 0, avgLatency: 0 },
            },
          },
        },
        sessions: {},
        currentSessionId: null,
        error: null,
      })
    })
  })

  // =============================================================================
  // 初始状态测试
  // =============================================================================

  describe('初始状态', () => {
    it('应该使用默认配置初始化', () => {
      const state = useAIStore.getState()
      expect(state.config).toEqual(DEFAULT_AI_CONFIG)
    })

    it('应该使用默认用户状态初始化', () => {
      const state = useAIStore.getState()
      expect(state.userStatus).toEqual(DEFAULT_AI_USER_STATUS)
    })

    it('应该初始化为非加载状态', () => {
      const state = useAIStore.getState()
      expect(state.isLoading).toBe(false)
      expect(state.userStatusLoading).toBe(false)
    })

    it('应该没有当前任务', () => {
      const state = useAIStore.getState()
      expect(state.currentTaskType).toBeNull()
      expect(state.currentModel).toBeNull()
    })

    it('应该初始化空的使用统计', () => {
      const state = useAIStore.getState()
      expect(state.usage.today.totalCalls).toBe(0)
      expect(state.usage.today.totalCost).toBe(0)
      expect(state.usage.thisWeek.totalCalls).toBe(0)
      expect(state.usage.thisMonth.totalCalls).toBe(0)
    })

    it('应该没有 sessions', () => {
      const state = useAIStore.getState()
      expect(Object.keys(state.sessions)).toHaveLength(0)
      expect(state.currentSessionId).toBeNull()
    })

    it('应该没有错误', () => {
      const state = useAIStore.getState()
      expect(state.error).toBeNull()
    })
  })

  // =============================================================================
  // 配置管理测试
  // =============================================================================

  describe('配置管理', () => {
    describe('setMode', () => {
      it('应该切换到简单模式', () => {
        act(() => {
          useAIStore.getState().setMode('simple')
        })

        expect(useAIStore.getState().config.mode).toBe('simple')
      })

      it('应该切换到高级模式', () => {
        act(() => {
          useAIStore.getState().setMode('advanced')
        })

        expect(useAIStore.getState().config.mode).toBe('advanced')
      })
    })

    describe('setSimplePreset', () => {
      it('应该设置快速预设', () => {
        act(() => {
          useAIStore.getState().setSimplePreset('fast')
        })

        expect(useAIStore.getState().config.simple.preset).toBe('fast')
      })

      it('应该设置平衡预设', () => {
        act(() => {
          useAIStore.getState().setSimplePreset('balanced')
        })

        expect(useAIStore.getState().config.simple.preset).toBe('balanced')
      })

      it('应该设置强力预设', () => {
        act(() => {
          useAIStore.getState().setSimplePreset('powerful')
        })

        expect(useAIStore.getState().config.simple.preset).toBe('powerful')
      })
    })

    describe('setCustomModel', () => {
      it('应该设置自定义模型', () => {
        act(() => {
          useAIStore.getState().setCustomModel('gpt-4')
        })

        expect(useAIStore.getState().config.simple.customModel).toBe('gpt-4')
      })
    })

    describe('setTaskModel', () => {
      it('应该为指定任务设置模型', () => {
        act(() => {
          useAIStore.getState().setTaskModel('analysis', 'claude-opus-4')
        })

        expect(useAIStore.getState().config.advanced.taskModels.analysis).toBe('claude-opus-4')
      })

      it('应该支持设置所有任务类型的模型', () => {
        const taskTypes: AITaskType[] = ['scan', 'analysis', 'execution', 'chat', 'reasoning', 'agent']

        taskTypes.forEach((taskType, index) => {
          act(() => {
            useAIStore.getState().setTaskModel(taskType, `model-${index}`)
          })

          expect(useAIStore.getState().config.advanced.taskModels[taskType]).toBe(`model-${index}`)
        })
      })
    })

    describe('updateSettings', () => {
      it('应该更新思考过程显示设置', () => {
        act(() => {
          useAIStore.getState().updateSettings({ showThinkingProcess: false })
        })

        expect(useAIStore.getState().config.settings.showThinkingProcess).toBe(false)
      })

      it('应该更新流式输出设置', () => {
        act(() => {
          useAIStore.getState().updateSettings({ streamResponse: false })
        })

        expect(useAIStore.getState().config.settings.streamResponse).toBe(false)
      })

      it('应该更新多个设置', () => {
        act(() => {
          useAIStore.getState().updateSettings({
            showThinkingProcess: false,
            streamResponse: false,
            autoRetry: false,
          })
        })

        const settings = useAIStore.getState().config.settings
        expect(settings.showThinkingProcess).toBe(false)
        expect(settings.streamResponse).toBe(false)
        expect(settings.autoRetry).toBe(false)
      })
    })

    describe('resetConfig', () => {
      it('应该重置配置到默认值', () => {
        // 先修改配置
        act(() => {
          useAIStore.getState().setMode('advanced')
          useAIStore.getState().setTaskModel('chat', 'custom-model')
        })

        // 重置
        act(() => {
          useAIStore.getState().resetConfig()
        })

        expect(useAIStore.getState().config).toEqual(DEFAULT_AI_CONFIG)
      })
    })
  })

  // =============================================================================
  // 状态管理测试
  // =============================================================================

  describe('状态管理', () => {
    describe('setLoading', () => {
      it('应该设置加载状态', () => {
        act(() => {
          useAIStore.getState().setLoading(true)
        })

        expect(useAIStore.getState().isLoading).toBe(true)
      })

      it('应该清除加载状态', () => {
        act(() => {
          useAIStore.getState().setLoading(true)
          useAIStore.getState().setLoading(false)
        })

        expect(useAIStore.getState().isLoading).toBe(false)
      })
    })

    describe('setCurrentTask', () => {
      it('应该设置当前任务', () => {
        act(() => {
          useAIStore.getState().setCurrentTask('analysis', 'claude-sonnet-4')
        })

        expect(useAIStore.getState().currentTaskType).toBe('analysis')
        expect(useAIStore.getState().currentModel).toBe('claude-sonnet-4')
      })

      it('应该清除当前任务', () => {
        act(() => {
          useAIStore.getState().setCurrentTask('analysis', 'claude-sonnet-4')
          useAIStore.getState().setCurrentTask(null, null)
        })

        expect(useAIStore.getState().currentTaskType).toBeNull()
        expect(useAIStore.getState().currentModel).toBeNull()
      })
    })

    describe('思考步骤管理', () => {
      it('应该添加思考步骤', () => {
        const step = { step: 1, title: '分析市场', content: '正在分析...', status: 'running' as const }

        act(() => {
          useAIStore.getState().addThinkingStep(step)
        })

        expect(useAIStore.getState().thinkingSteps).toHaveLength(1)
        expect(useAIStore.getState().thinkingSteps[0]).toEqual(step)
      })

      it('应该更新思考步骤', () => {
        const step = { step: 1, title: '分析市场', content: '正在分析...', status: 'running' as const }

        act(() => {
          useAIStore.getState().addThinkingStep(step)
          useAIStore.getState().updateThinkingStep(0, { status: 'completed', content: '分析完成' })
        })

        const updatedStep = useAIStore.getState().thinkingSteps[0]
        expect(updatedStep.status).toBe('completed')
        expect(updatedStep.content).toBe('分析完成')
      })

      it('应该清除所有思考步骤', () => {
        act(() => {
          useAIStore.getState().addThinkingStep({ step: 1, title: 'Step 1', content: 'Test', status: 'running' })
          useAIStore.getState().addThinkingStep({ step: 2, title: 'Step 2', content: 'Test', status: 'running' })
          useAIStore.getState().clearThinkingSteps()
        })

        expect(useAIStore.getState().thinkingSteps).toHaveLength(0)
      })
    })

    describe('流式内容管理', () => {
      it('应该追加流式内容', () => {
        act(() => {
          useAIStore.getState().appendStreamingContent('Hello ')
          useAIStore.getState().appendStreamingContent('World')
        })

        expect(useAIStore.getState().streamingContent).toBe('Hello World')
      })

      it('应该清除流式内容', () => {
        act(() => {
          useAIStore.getState().appendStreamingContent('Test content')
          useAIStore.getState().clearStreamingContent()
        })

        expect(useAIStore.getState().streamingContent).toBe('')
      })
    })

    describe('错误管理', () => {
      it('应该设置错误信息', () => {
        act(() => {
          useAIStore.getState().setError('API Error')
        })

        expect(useAIStore.getState().error).toBe('API Error')
      })

      it('应该清除错误信息', () => {
        act(() => {
          useAIStore.getState().setError('Error')
          useAIStore.getState().setError(null)
        })

        expect(useAIStore.getState().error).toBeNull()
      })
    })
  })

  // =============================================================================
  // Session 管理测试
  // =============================================================================

  describe('Session 管理', () => {
    describe('createSession', () => {
      it('应该创建新 session', () => {
        let sessionId: string = ''

        act(() => {
          sessionId = useAIStore.getState().createSession('chat', 'claude-sonnet-4')
        })

        expect(sessionId).toBeTruthy()
        expect(sessionId).toMatch(/^session_/)

        const state = useAIStore.getState()
        expect(state.sessions[sessionId]).toBeDefined()
        expect(state.sessions[sessionId].taskType).toBe('chat')
        expect(state.sessions[sessionId].model).toBe('claude-sonnet-4')
        expect(state.currentSessionId).toBe(sessionId)
      })

      it('创建的 session 应该有空消息列表', () => {
        let sessionId: string = ''

        act(() => {
          sessionId = useAIStore.getState().createSession('analysis', 'claude-opus-4')
        })

        const session = useAIStore.getState().sessions[sessionId]
        expect(session.messages).toHaveLength(0)
      })

      it('应该初始化总费用为 0', () => {
        let sessionId: string = ''

        act(() => {
          sessionId = useAIStore.getState().createSession('chat', 'claude-sonnet-4')
        })

        const session = useAIStore.getState().sessions[sessionId]
        expect(session.totalCost).toBe(0)
      })
    })

    describe('addMessage', () => {
      it('应该向 session 添加消息', () => {
        let sessionId: string = ''

        act(() => {
          sessionId = useAIStore.getState().createSession('chat', 'claude-sonnet-4')
          useAIStore.getState().addMessage(sessionId, {
            role: 'user',
            content: 'Hello',
          })
        })

        const session = useAIStore.getState().sessions[sessionId]
        expect(session.messages).toHaveLength(1)
        expect(session.messages[0].content).toBe('Hello')
        expect(session.messages[0].role).toBe('user')
      })

      it('应该生成消息 ID', () => {
        let sessionId: string = ''

        act(() => {
          sessionId = useAIStore.getState().createSession('chat', 'claude-sonnet-4')
          useAIStore.getState().addMessage(sessionId, {
            role: 'user',
            content: 'Test',
          })
        })

        const message = useAIStore.getState().sessions[sessionId].messages[0]
        expect(message.id).toBeTruthy()
        expect(message.id).toMatch(/^msg_/)
      })

      it('应该设置时间戳', () => {
        const beforeTime = Date.now()
        let sessionId: string = ''

        act(() => {
          sessionId = useAIStore.getState().createSession('chat', 'claude-sonnet-4')
          useAIStore.getState().addMessage(sessionId, {
            role: 'user',
            content: 'Test',
          })
        })

        const message = useAIStore.getState().sessions[sessionId].messages[0]
        expect(message.timestamp).toBeGreaterThanOrEqual(beforeTime)
      })

      it('应该累加消息费用到 totalCost', () => {
        let sessionId: string = ''

        act(() => {
          sessionId = useAIStore.getState().createSession('chat', 'claude-sonnet-4')
          useAIStore.getState().addMessage(sessionId, {
            role: 'assistant',
            content: 'Response',
            usage: { ...mockUsage, totalCost: 0.01 },
          })
          useAIStore.getState().addMessage(sessionId, {
            role: 'assistant',
            content: 'Response 2',
            usage: { ...mockUsage, totalCost: 0.02 },
          })
        })

        const session = useAIStore.getState().sessions[sessionId]
        expect(session.totalCost).toBe(0.03)
      })

      it('不存在的 session 不应该添加消息', () => {
        act(() => {
          useAIStore.getState().addMessage('non-existent-id', {
            role: 'user',
            content: 'Test',
          })
        })

        expect(Object.keys(useAIStore.getState().sessions)).toHaveLength(0)
      })
    })

    describe('clearSession', () => {
      it('应该删除指定 session', () => {
        let sessionId: string = ''

        act(() => {
          sessionId = useAIStore.getState().createSession('chat', 'claude-sonnet-4')
          useAIStore.getState().clearSession(sessionId)
        })

        expect(useAIStore.getState().sessions[sessionId]).toBeUndefined()
      })

      it('删除当前 session 应该清除 currentSessionId', () => {
        let sessionId: string = ''

        act(() => {
          sessionId = useAIStore.getState().createSession('chat', 'claude-sonnet-4')
          useAIStore.getState().clearSession(sessionId)
        })

        expect(useAIStore.getState().currentSessionId).toBeNull()
      })

      it('删除非当前 session 不应该影响 currentSessionId', () => {
        let session1: string = ''
        let session2: string = ''

        act(() => {
          session1 = useAIStore.getState().createSession('chat', 'claude-sonnet-4')
          session2 = useAIStore.getState().createSession('analysis', 'claude-opus-4')
          useAIStore.getState().clearSession(session1)
        })

        expect(useAIStore.getState().currentSessionId).toBe(session2)
      })
    })

    describe('setCurrentSession', () => {
      it('应该设置当前 session', () => {
        let sessionId: string = ''

        act(() => {
          sessionId = useAIStore.getState().createSession('chat', 'claude-sonnet-4')
          // 创建另一个 session
          useAIStore.getState().createSession('analysis', 'claude-opus-4')
          // 切换回第一个
          useAIStore.getState().setCurrentSession(sessionId)
        })

        expect(useAIStore.getState().currentSessionId).toBe(sessionId)
      })
    })
  })

  // =============================================================================
  // 使用统计测试
  // =============================================================================

  describe('使用统计', () => {
    describe('recordUsage', () => {
      it('应该记录使用统计', () => {
        act(() => {
          useAIStore.getState().recordUsage('chat', 'claude-sonnet-4', mockUsage)
        })

        const usage = useAIStore.getState().usage.today
        expect(usage.totalCalls).toBe(1)
        expect(usage.totalInputTokens).toBe(1000)
        expect(usage.totalOutputTokens).toBe(500)
        expect(usage.totalCost).toBe(0.015)
      })

      it('应该按模型分组统计', () => {
        act(() => {
          useAIStore.getState().recordUsage('chat', 'claude-sonnet-4', mockUsage)
        })

        const modelStats = useAIStore.getState().usage.today.byModel['claude-sonnet-4']
        expect(modelStats).toBeDefined()
        expect(modelStats.calls).toBe(1)
        expect(modelStats.inputTokens).toBe(1000)
        expect(modelStats.outputTokens).toBe(500)
        expect(modelStats.cost).toBe(0.015)
      })

      it('应该按任务类型分组统计', () => {
        act(() => {
          useAIStore.getState().recordUsage('chat', 'claude-sonnet-4', mockUsage)
        })

        const taskStats = useAIStore.getState().usage.today.byTaskType.chat
        expect(taskStats.calls).toBe(1)
        expect(taskStats.cost).toBe(0.015)
      })

      it('应该累加多次使用统计', () => {
        act(() => {
          useAIStore.getState().recordUsage('chat', 'claude-sonnet-4', mockUsage)
          useAIStore.getState().recordUsage('analysis', 'claude-opus-4', {
            ...mockUsage,
            inputTokens: 2000,
            outputTokens: 1000,
            totalCost: 0.03,
          })
        })

        const usage = useAIStore.getState().usage.today
        expect(usage.totalCalls).toBe(2)
        expect(usage.totalInputTokens).toBe(3000)
        expect(usage.totalOutputTokens).toBe(1500)
        expect(usage.totalCost).toBe(0.045)
      })

      it('应该同时更新所有时间段统计', () => {
        act(() => {
          useAIStore.getState().recordUsage('chat', 'claude-sonnet-4', mockUsage)
        })

        expect(useAIStore.getState().usage.today.totalCalls).toBe(1)
        expect(useAIStore.getState().usage.thisWeek.totalCalls).toBe(1)
        expect(useAIStore.getState().usage.thisMonth.totalCalls).toBe(1)
      })
    })

    describe('resetUsage', () => {
      it('应该重置日统计', () => {
        act(() => {
          useAIStore.getState().recordUsage('chat', 'claude-sonnet-4', mockUsage)
          useAIStore.getState().resetUsage('day')
        })

        const usage = useAIStore.getState().usage.today
        expect(usage.totalCalls).toBe(0)
        expect(usage.totalCost).toBe(0)
      })

      it('应该重置周统计', () => {
        act(() => {
          useAIStore.getState().recordUsage('chat', 'claude-sonnet-4', mockUsage)
          useAIStore.getState().resetUsage('week')
        })

        const usage = useAIStore.getState().usage.thisWeek
        expect(usage.totalCalls).toBe(0)
        expect(usage.totalCost).toBe(0)
      })

      it('应该重置月统计', () => {
        act(() => {
          useAIStore.getState().recordUsage('chat', 'claude-sonnet-4', mockUsage)
          useAIStore.getState().resetUsage('month')
        })

        const usage = useAIStore.getState().usage.thisMonth
        expect(usage.totalCalls).toBe(0)
        expect(usage.totalCost).toBe(0)
      })

      it('重置不应该影响其他时间段', () => {
        act(() => {
          useAIStore.getState().recordUsage('chat', 'claude-sonnet-4', mockUsage)
          useAIStore.getState().resetUsage('day')
        })

        expect(useAIStore.getState().usage.today.totalCalls).toBe(0)
        expect(useAIStore.getState().usage.thisWeek.totalCalls).toBe(1)
        expect(useAIStore.getState().usage.thisMonth.totalCalls).toBe(1)
      })
    })
  })

  // =============================================================================
  // 工具方法测试
  // =============================================================================

  describe('工具方法', () => {
    describe('getModelForTask', () => {
      it('简单模式应该返回预设的默认模型', () => {
        act(() => {
          useAIStore.getState().setMode('simple')
          useAIStore.getState().setSimplePreset('balanced')
        })

        const model = useAIStore.getState().getModelForTask('chat')
        expect(model).toBeTruthy()
      })

      it('简单模式使用自定义模型时应该返回自定义模型', () => {
        act(() => {
          useAIStore.getState().setMode('simple')
          useAIStore.getState().setCustomModel('gpt-4')
        })

        const model = useAIStore.getState().getModelForTask('chat')
        expect(model).toBe('gpt-4')
      })

      it('高级模式应该返回任务对应的模型', () => {
        act(() => {
          useAIStore.getState().setMode('advanced')
          useAIStore.getState().setTaskModel('analysis', 'claude-opus-4')
        })

        const model = useAIStore.getState().getModelForTask('analysis')
        expect(model).toBe('claude-opus-4')
      })
    })

    describe('canUseModel', () => {
      it('用户不可使用 AI 时应该返回 false', () => {
        act(() => {
          useAIStore.getState().setUserStatus({
            ...DEFAULT_AI_USER_STATUS,
            limits: {
              ...DEFAULT_AI_USER_STATUS.limits,
              canUseAI: false,
            },
          })
        })

        expect(useAIStore.getState().canUseModel('claude-sonnet-4')).toBe(false)
      })

      it('模型不在允许列表时应该返回 false', () => {
        act(() => {
          useAIStore.getState().setUserStatus({
            ...DEFAULT_AI_USER_STATUS,
            limits: {
              ...DEFAULT_AI_USER_STATUS.limits,
              allowedModels: ['claude-haiku-4'],
            },
          })
        })

        expect(useAIStore.getState().canUseModel('claude-sonnet-4')).toBe(false)
      })

      it('模型在允许列表时应该返回 true', () => {
        act(() => {
          useAIStore.getState().setUserStatus({
            ...DEFAULT_AI_USER_STATUS,
            limits: {
              ...DEFAULT_AI_USER_STATUS.limits,
              allowedModels: ['claude-sonnet-4', 'claude-opus-4'],
            },
          })
        })

        expect(useAIStore.getState().canUseModel('claude-sonnet-4')).toBe(true)
      })

      it('允许列表包含 * 时应该返回 true', () => {
        act(() => {
          useAIStore.getState().setUserStatus({
            ...DEFAULT_AI_USER_STATUS,
            limits: {
              ...DEFAULT_AI_USER_STATUS.limits,
              allowedModels: ['*'],
            },
          })
        })

        expect(useAIStore.getState().canUseModel('any-model')).toBe(true)
      })
    })

    describe('estimateCost', () => {
      it('应该返回费用估算', () => {
        const estimate = useAIStore.getState().estimateCost()

        expect(estimate.daily).toBeGreaterThan(0)
        expect(estimate.weekly).toBe(estimate.daily * 7)
        expect(estimate.monthly).toBe(estimate.daily * 30)
        expect(estimate.breakdown).toHaveLength(6) // 6 种任务类型
      })

      it('费用估算应该包含所有任务类型', () => {
        const estimate = useAIStore.getState().estimateCost()
        const taskTypes = estimate.breakdown.map(item => item.taskType)

        expect(taskTypes).toContain('scan')
        expect(taskTypes).toContain('analysis')
        expect(taskTypes).toContain('execution')
        expect(taskTypes).toContain('chat')
        expect(taskTypes).toContain('reasoning')
        expect(taskTypes).toContain('agent')
      })
    })
  })

  // =============================================================================
  // 边界情况测试
  // =============================================================================

  describe('边界情况', () => {
    it('应该处理空 session ID', () => {
      act(() => {
        useAIStore.getState().addMessage('', {
          role: 'user',
          content: 'Test',
        })
      })

      // 不应该崩溃，sessions 应该为空
      expect(Object.keys(useAIStore.getState().sessions)).toHaveLength(0)
    })

    it('应该处理大量 sessions', () => {
      const sessionIds: string[] = []

      act(() => {
        for (let i = 0; i < 100; i++) {
          const id = useAIStore.getState().createSession('chat', 'claude-sonnet-4')
          sessionIds.push(id)
        }
      })

      expect(Object.keys(useAIStore.getState().sessions)).toHaveLength(100)
    })

    it('应该处理大量消息', () => {
      let sessionId: string = ''

      act(() => {
        sessionId = useAIStore.getState().createSession('chat', 'claude-sonnet-4')

        for (let i = 0; i < 100; i++) {
          useAIStore.getState().addMessage(sessionId, {
            role: i % 2 === 0 ? 'user' : 'assistant',
            content: `Message ${i}`,
          })
        }
      })

      expect(useAIStore.getState().sessions[sessionId].messages).toHaveLength(100)
    })

    it('应该处理零费用的使用记录', () => {
      act(() => {
        useAIStore.getState().recordUsage('chat', 'claude-sonnet-4', {
          ...mockUsage,
          totalCost: 0,
        })
      })

      expect(useAIStore.getState().usage.today.totalCost).toBe(0)
    })
  })
})
