/**
 * useAI Hook - Delta Terminal
 *
 * AI 调用 Hook，通过后端 API 代理调用 OpenRouter
 * 支持流式响应、思考过程可视化、用户额度检查
 */

import { useCallback, useRef, useState } from 'react'

import { useAIStore } from '@/store/ai'
import { useAuthStore } from '@/store/auth'
import type {
  AIMessage,
  AIRequest,
  AIResponse,
  AIStreamChunk,
  AITaskType,
  ThinkingStep} from '@/types/ai';
import {
  AI_MODELS} from '@/types/ai'

// ============================================================================
// Types
// ============================================================================

interface UseAIOptions {
  /** 任务类型 */
  taskType?: AITaskType
  /** 是否自动使用配置的模型 */
  autoSelectModel?: boolean
  /** 覆盖流式设置 */
  streaming?: boolean
  /** 成功回调 */
  onSuccess?: (response: AIResponse) => void
  /** 错误回调 */
  onError?: (error: Error) => void
  /** 流式内容回调 */
  onStream?: (chunk: AIStreamChunk) => void
  /** 思考步骤回调 */
  onThinking?: (step: ThinkingStep) => void
}

interface UseAIReturn {
  /** 发送消息 */
  send: (content: string, options?: SendOptions) => Promise<AIResponse | null>
  /** 发送消息（流式），返回完整响应内容 */
  sendStream: (content: string, options?: SendOptions) => Promise<string>
  /** 取消当前请求 */
  cancel: () => void
  /** 清除对话历史 */
  clear: () => void
  /** 是否正在加载 */
  isLoading: boolean
  /** 当前响应内容（流式） */
  streamContent: string
  /** 思考步骤 */
  thinkingSteps: ThinkingStep[]
  /** 对话历史 */
  messages: AIMessage[]
  /** 错误信息 */
  error: string | null
  /** 当前使用的模型 */
  currentModel: string | null
  /** 总费用 */
  totalCost: number
  /** 是否可以使用 AI */
  canUseAI: boolean
  /** 不能使用的原因 */
  disabledReason: string | null
}

interface SendOptions {
  /** 覆盖模型 */
  model?: string
  /** 系统提示 */
  systemPrompt?: string
  /** 上下文数据 */
  context?: AIRequest['context']
  /** 覆盖温度 */
  temperature?: number
  /** 覆盖最大 tokens */
  maxTokens?: number
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useAI(options: UseAIOptions = {}): UseAIReturn {
  const {
    taskType = 'chat',
    autoSelectModel = true,
    onSuccess,
    onError,
    onStream,
    onThinking
  } = options

  // Store
  const {
    config,
    userStatus,
    getModelForTask,
    canUseModel: _canUseModel,
    setLoading,
    setCurrentTask,
    addThinkingStep,
    clearThinkingSteps,
    appendStreamingContent,
    clearStreamingContent,
    setError,
    recordUsage
  } = useAIStore()

  // Auth Store - 获取 JWT token
  const { accessToken } = useAuthStore()

  // Local state
  const [isLoading, setIsLoadingLocal] = useState(false)
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [streamContent, setStreamContent] = useState('')
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([])
  const [error, setErrorLocal] = useState<string | null>(null)
  const [currentModel, setCurrentModel] = useState<string | null>(null)
  const [totalCost, setTotalCost] = useState(0)

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null)

  // Check if can use AI
  const canUseAI = userStatus.limits.canUseAI
  const disabledReason = !canUseAI ? '无法使用 AI 服务' : null

  // Get model for current task
  const getModel = useCallback(
    (overrideModel?: string) => {
      if (overrideModel) return overrideModel
      if (autoSelectModel) return getModelForTask(taskType)
      return config.advanced.taskModels[taskType]
    },
    [autoSelectModel, config.advanced.taskModels, getModelForTask, taskType]
  )

  // Build messages array
  const buildMessages = useCallback(
    (content: string, systemPrompt?: string): AIMessage[] => {
      const msgs: AIMessage[] = []

      // System prompt
      if (systemPrompt) {
        msgs.push({ role: 'system', content: systemPrompt })
      }

      // History messages
      msgs.push(...messages)

      // New user message
      msgs.push({ role: 'user', content })

      return msgs
    },
    [messages]
  )

  // Send message (non-streaming) - 通过后端 API
  const send = useCallback(
    async (content: string, sendOptions: SendOptions = {}): Promise<AIResponse | null> => {
      // 检查是否可以使用 AI
      if (!canUseAI) {
        const errorMsg = disabledReason || '无法使用 AI 服务'
        setErrorLocal(errorMsg)
        setError(errorMsg)
        onError?.(new Error(errorMsg))
        return null
      }

      const model = getModel(sendOptions.model)

      // 注意：模型权限检查由后端 API 统一处理
      // 前端不再做模型检查，避免用户状态还未从 API 加载时的误判

      try {
        setIsLoadingLocal(true)
        setErrorLocal(null)
        setLoading(true)

        setCurrentModel(model)
        setCurrentTask(taskType, model)

        const request: AIRequest = {
          taskType,
          messages: buildMessages(content, sendOptions.systemPrompt),
          model,
          streaming: false,
          maxTokens: sendOptions.maxTokens || config.settings.maxTokens,
          temperature: sendOptions.temperature || config.settings.temperature,
          ...(sendOptions.context && { context: sendOptions.context })
        }

        // Add user message to history
        setMessages(prev => [...prev, { role: 'user', content }])

        // 调用后端 API (携带 JWT token)
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (accessToken) {
          headers.Authorization = `Bearer ${accessToken}`
        }

        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers,
          body: JSON.stringify(request)
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `API 错误: ${response.statusText}`)
        }

        const result: AIResponse = await response.json()

        // Add assistant message to history
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: result.content }
        ])

        // Update thinking steps
        if (result.thinking) {
          setThinkingSteps(result.thinking)
        }

        // Record usage
        recordUsage(taskType, model, result.usage)
        setTotalCost(prev => prev + result.usage.totalCost)

        // Callback
        onSuccess?.(result)

        return result
      } catch (err) {
        const error = err as Error
        setErrorLocal(error.message)
        setError(error.message)
        onError?.(error)
        return null
      } finally {
        setIsLoadingLocal(false)
        setLoading(false)
        setCurrentTask(null, null)
      }
    },
    [
      accessToken,
      buildMessages,
      canUseAI,
      config.settings.maxTokens,
      config.settings.temperature,
      disabledReason,
      getModel,
      onError,
      onSuccess,
      recordUsage,
      setCurrentTask,
      setError,
      setLoading,
      taskType
    ]
  )

  // Send message (streaming) - 通过后端 API 使用 SSE
  // 返回完整的 AI 响应内容
  const sendStream = useCallback(
    async (content: string, sendOptions: SendOptions = {}): Promise<string> => {
      // 检查是否可以使用 AI
      if (!canUseAI) {
        const errorMsg = disabledReason || '无法使用 AI 服务'
        setErrorLocal(errorMsg)
        setError(errorMsg)
        onError?.(new Error(errorMsg))
        return ''
      }

      const model = getModel(sendOptions.model)

      // 注意：模型权限检查由后端 API 统一处理
      // 前端不再做模型检查，避免用户状态还未从 API 加载时的误判

      try {
        setIsLoadingLocal(true)
        setErrorLocal(null)
        setLoading(true)
        setStreamContent('')
        setThinkingSteps([])
        clearThinkingSteps()
        clearStreamingContent()

        setCurrentModel(model)
        setCurrentTask(taskType, model)

        const request: AIRequest = {
          taskType,
          messages: buildMessages(content, sendOptions.systemPrompt),
          model,
          streaming: true,
          maxTokens: sendOptions.maxTokens || config.settings.maxTokens,
          temperature: sendOptions.temperature || config.settings.temperature,
          ...(sendOptions.context && { context: sendOptions.context })
        }

        // Add user message to history
        setMessages(prev => [...prev, { role: 'user', content }])

        // Create abort controller
        abortControllerRef.current = new AbortController()

        // 调用后端流式 API (携带 JWT token)
        const streamHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
        if (accessToken) {
          streamHeaders.Authorization = `Bearer ${accessToken}`
        }

        const response = await fetch('/api/ai/chat/stream', {
          method: 'POST',
          headers: streamHeaders,
          body: JSON.stringify(request),
          signal: abortControllerRef.current.signal
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `API 错误: ${response.statusText}`)
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error('无法读取响应流')

        const decoder = new TextDecoder()
        let fullContent = ''
        let inputTokens = 0
        let outputTokens = 0
        let buffer = '' // 用于处理跨 chunk 的数据

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          // 保留最后一个可能不完整的行
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const chunk: AIStreamChunk = JSON.parse(data)
              onStream?.(chunk)

              switch (chunk.type) {
                case 'content':
                  if (chunk.data.content) {
                    fullContent += chunk.data.content
                    // 直接更新 UI - 这就是真实的 token 速度
                    // SSE 流按 AI 生成速度推送 token，前端立即显示
                    // 无需使用 TextAnimator，因为这已经是最真实的速度
                    setStreamContent(fullContent)
                    appendStreamingContent(chunk.data.content)
                  }
                  break

                case 'thinking':
                  if (chunk.data.thinking) {
                    const step = chunk.data.thinking
                    setThinkingSteps(prev => {
                      const existing = prev.findIndex(s => s.step === step.step)
                      if (existing >= 0) {
                        const updated = [...prev]
                        updated[existing] = step
                        return updated
                      }
                      return [...prev, step]
                    })
                    addThinkingStep(step)
                    onThinking?.(step)
                  }
                  break

                case 'usage':
                  if (chunk.data.usage) {
                    inputTokens = chunk.data.usage.inputTokens
                    outputTokens = chunk.data.usage.outputTokens
                  }
                  break

                case 'error':
                  throw new Error(chunk.data.error)
              }
            } catch {
              // 忽略解析错误
            }
          }
        }

        // 处理剩余的 buffer 内容
        if (buffer.trim() && buffer.startsWith('data: ')) {
          const data = buffer.slice(6).trim()
          if (data && data !== '[DONE]') {
            try {
              const chunk: AIStreamChunk = JSON.parse(data)
              if (chunk.type === 'content' && chunk.data.content) {
                fullContent += chunk.data.content
                setStreamContent(fullContent)
                appendStreamingContent(chunk.data.content)
              } else if (chunk.type === 'usage' && chunk.data.usage) {
                inputTokens = chunk.data.usage.inputTokens
                outputTokens = chunk.data.usage.outputTokens
              }
            } catch {
              // 忽略解析错误
            }
          }
        }

        // Add assistant message to history
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: fullContent }
        ])

        // Calculate cost
        const modelInfo = AI_MODELS[model]
        const estimatedInputTokens = inputTokens || Math.ceil(content.length / 4)
        const estimatedOutputTokens = outputTokens || Math.ceil(fullContent.length / 4)
        const cost = modelInfo
          ? (estimatedInputTokens * modelInfo.inputPrice + estimatedOutputTokens * modelInfo.outputPrice) / 1000000
          : 0

        // Record usage
        recordUsage(taskType, model, {
          inputTokens: estimatedInputTokens,
          outputTokens: estimatedOutputTokens,
          totalCost: cost
        })
        setTotalCost(prev => prev + cost)

        // Success callback
        onSuccess?.({
          id: `stream_${Date.now()}`,
          model,
          content: fullContent,
          thinking: thinkingSteps,
          usage: {
            inputTokens: estimatedInputTokens,
            outputTokens: estimatedOutputTokens,
            totalCost: cost
          },
          latency: 0,
          finishReason: 'stop'
        })

        // 返回完整内容供调用方使用
        return fullContent
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          // 用户取消，不作为错误处理
          return ''
        }
        const error = err as Error
        setErrorLocal(error.message)
        setError(error.message)
        onError?.(error)
        return ''
      } finally {
        setIsLoadingLocal(false)
        setLoading(false)
        setCurrentTask(null, null)
        abortControllerRef.current = null
      }
    },
    [
      accessToken,
      addThinkingStep,
      appendStreamingContent,
      buildMessages,
      canUseAI,
      clearStreamingContent,
      clearThinkingSteps,
      config.settings.maxTokens,
      config.settings.temperature,
      disabledReason,
      getModel,
      onError,
      onStream,
      onSuccess,
      onThinking,
      recordUsage,
      setCurrentTask,
      setError,
      setLoading,
      taskType,
      thinkingSteps
    ]
  )

  // Cancel request
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsLoadingLocal(false)
    setLoading(false)
    setCurrentTask(null, null)
  }, [setCurrentTask, setLoading])

  // Clear history
  const clear = useCallback(() => {
    setMessages([])
    setStreamContent('')
    setThinkingSteps([])
    setErrorLocal(null)
    setTotalCost(0)
    clearThinkingSteps()
    clearStreamingContent()
  }, [clearStreamingContent, clearThinkingSteps])

  return {
    send,
    sendStream,
    cancel,
    clear,
    isLoading,
    streamContent,
    thinkingSteps,
    messages,
    error,
    currentModel,
    totalCost,
    canUseAI,
    disabledReason
  }
}

// ============================================================================
// Specialized Hooks
// ============================================================================

/**
 * 市场扫描专用 Hook
 */
export function useMarketScan(options?: Omit<UseAIOptions, 'taskType'>) {
  return useAI({ ...options, taskType: 'scan' })
}

/**
 * 策略分析专用 Hook
 */
export function useStrategyAnalysis(options?: Omit<UseAIOptions, 'taskType'>) {
  return useAI({ ...options, taskType: 'analysis' })
}

/**
 * 执行确认专用 Hook
 */
export function useExecutionConfirm(options?: Omit<UseAIOptions, 'taskType'>) {
  return useAI({ ...options, taskType: 'execution' })
}

/**
 * 对话交互专用 Hook
 */
export function useChat(options?: Omit<UseAIOptions, 'taskType'>) {
  return useAI({ ...options, taskType: 'chat' })
}

/**
 * 复杂推理专用 Hook
 */
export function useReasoning(options?: Omit<UseAIOptions, 'taskType'>) {
  return useAI({ ...options, taskType: 'reasoning' })
}

/**
 * Agent 任务专用 Hook
 */
export function useAgent(options?: Omit<UseAIOptions, 'taskType'>) {
  return useAI({ ...options, taskType: 'agent' })
}
