/**
 * useA2UIInsight Hook
 *
 * A2UI 核心 Hook: 统一处理 AI Insight 生成和多步骤引导
 *
 * 功能:
 * 1. 调用后端 NLP Processor 生成 InsightData
 * 2. 处理 ClarificationInsight 多步骤引导流程
 * 3. 收集用户回答并继续对话
 * 4. 管理对话状态和历史
 */

import { useCallback, useRef, useState } from 'react'

import { useAuthStore } from '@/store/auth'
import { useInsightStore } from '@/store/insight'
import type {
  ClarificationAnswer,
  ClarificationInsight,
  InsightData,
  InsightType,
} from '@/types/insight'

// =============================================================================
// Types
// =============================================================================

interface InsightApiResponse {
  success: boolean
  message: string
  conversationId: string
  intent: string
  confidence: number
  insight?: InsightData
  suggestedActions?: string[]
  error?: string
}

/** Chat history message for context preservation */
interface ChatHistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

interface UseA2UIInsightState {
  /** 当前 Insight */
  insight: InsightData | null
  /** 当前澄清问题 (如果是 ClarificationInsight) */
  clarification: ClarificationInsight | null
  /** 是否正在加载 */
  isLoading: boolean
  /** 错误信息 */
  error: string | null
  /** 对话 ID */
  conversationId: string | null
  /** 识别的意图 */
  intent: string | null
  /** 置信度 */
  confidence: number
  /** AI 回复消息 */
  message: string
  /** 建议的后续操作 */
  suggestedActions: string[]
  /** 已收集的参数 (多步骤引导) */
  collectedParams: Record<string, unknown>
  /** 当前是第几个问题 (多步骤引导) */
  currentStep: number
  /** 剩余问题数 */
  remainingQuestions: number
}

interface UseA2UIInsightReturn extends UseA2UIInsightState {
  /** 发送消息并获取 InsightData */
  sendMessage: (message: string, context?: Record<string, unknown>) => Promise<InsightData | null>
  /** 提交澄清回答并继续对话 */
  submitClarificationAnswer: (answer: ClarificationAnswer) => Promise<InsightData | null>
  /** 跳过当前澄清问题 */
  skipClarification: () => Promise<InsightData | null>
  /** 重置状态 */
  reset: () => void
  /** 清除错误 */
  clearError: () => void
}

// =============================================================================
// Constants
// =============================================================================

/** API 请求超时时间 (毫秒) - 与后端 BACKEND_TIMEOUT 保持一致 */
const REQUEST_TIMEOUT = 60000

/** 最大重试次数 */
const MAX_RETRIES = 2

/** 重试延迟基数 (毫秒) - 用于指数退避 */
const RETRY_DELAY_BASE = 1000

/** 最大重试延迟 (毫秒) */
const MAX_RETRY_DELAY = 10000

// =============================================================================
// Initial State
// =============================================================================

const initialState: UseA2UIInsightState = {
  insight: null,
  clarification: null,
  isLoading: false,
  error: null,
  conversationId: null,
  intent: null,
  confidence: 0,
  message: '',
  suggestedActions: [],
  collectedParams: {},
  currentStep: 0,
  remainingQuestions: 0,
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useA2UIInsight(): UseA2UIInsightReturn {
  const [state, setState] = useState<UseA2UIInsightState>(initialState)

  // AbortController ref for request deduplication
  const abortControllerRef = useRef<AbortController | null>(null)

  // Store hooks
  const { addToHistory, setLoading: setStoreLoading } = useInsightStore()
  const { accessToken } = useAuthStore()

  /**
   * 带超时的 fetch 请求 (支持外部取消)
   */
  const fetchWithTimeout = useCallback(
    async (
      url: string,
      options: RequestInit,
      timeout: number,
      externalSignal?: AbortSignal
    ): Promise<Response> => {
      const timeoutController = new AbortController()
      const timeoutId = setTimeout(() => timeoutController.abort(), timeout)

      // Combine timeout signal with external signal
      const abortHandler = () => timeoutController.abort()
      externalSignal?.addEventListener('abort', abortHandler)

      try {
        const response = await fetch(url, {
          ...options,
          signal: timeoutController.signal,
        })
        return response
      } finally {
        clearTimeout(timeoutId)
        externalSignal?.removeEventListener('abort', abortHandler)
      }
    },
    []
  )

  /**
   * 延迟函数
   */
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  /**
   * 计算指数退避延迟
   */
  const getExponentialDelay = (attempt: number): number => {
    const delay = RETRY_DELAY_BASE * Math.pow(2, attempt)
    // 添加随机抖动 (±20%)
    const jitter = delay * (0.8 + Math.random() * 0.4)
    return Math.min(jitter, MAX_RETRY_DELAY)
  }

  /**
   * 调用后端 API 获取 InsightData (带超时、重试和请求去重)
   */
  const fetchInsight = useCallback(
    async (
      message: string,
      context?: Record<string, unknown>
    ): Promise<InsightApiResponse | null> => {
      // 请求去重：取消任何进行中的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      const abortController = new AbortController()
      abortControllerRef.current = abortController

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`
      }

      // 优先使用显式传递的 collectedParams，避免 React 状态竞态条件
      const explicitCollectedParams = context?.collectedParams as
        | Record<string, unknown>
        | undefined
      const mergedCollectedParams = explicitCollectedParams
        ? { ...state.collectedParams, ...explicitCollectedParams }
        : state.collectedParams

      // 提取 chatHistory 用于无 Redis 环境的上下文恢复
      const chatHistory = context?.chatHistory as ChatHistoryMessage[] | undefined

      const requestBody = JSON.stringify({
        message,
        conversationId: state.conversationId,
        context: {
          ...context,
          collectedParams: mergedCollectedParams,
          // 传递完整对话历史作为 fallback (用于无 Redis 的 Railway 部署)
          chatHistory: chatHistory || [],
        },
      })

      let lastError: Error | null = null

      // 重试逻辑 (使用指数退避)
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        // 检查是否已被取消
        if (abortController.signal.aborted) {
          throw new Error('请求已取消')
        }

        try {
          if (attempt > 0) {
            const retryDelay = getExponentialDelay(attempt)
            console.log(
              `[useA2UIInsight] 重试 ${attempt}/${MAX_RETRIES}, 延迟 ${Math.round(retryDelay)}ms`
            )
            await delay(retryDelay)
          }

          const response = await fetchWithTimeout(
            '/api/ai/insight',
            {
              method: 'POST',
              headers,
              body: requestBody,
            },
            REQUEST_TIMEOUT,
            abortController.signal
          )

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `API 错误: ${response.status}`)
          }

          // 请求完成，清除 ref
          if (abortControllerRef.current === abortController) {
            abortControllerRef.current = null
          }

          return await response.json()
        } catch (error) {
          // 如果是被新请求取消，直接抛出不重试
          if (abortController.signal.aborted) {
            throw new Error('请求已取消')
          }

          lastError = error instanceof Error ? error : new Error(String(error))

          // 超时错误提供友好提示
          if (lastError.name === 'AbortError') {
            lastError = new Error('AI 响应较慢，请稍候...')
          }

          console.error(`[useA2UIInsight] 请求失败 (尝试 ${attempt + 1}):`, lastError.message)

          // 最后一次重试失败，抛出错误
          if (attempt === MAX_RETRIES) {
            // 清除 ref
            if (abortControllerRef.current === abortController) {
              abortControllerRef.current = null
            }
            throw lastError
          }
        }
      }

      throw lastError || new Error('请求失败')
    },
    [accessToken, state.conversationId, state.collectedParams, fetchWithTimeout]
  )

  /**
   * 处理 API 响应，更新状态
   */
  const handleResponse = useCallback(
    (response: InsightApiResponse): InsightData | null => {
      const insight = response.insight

      // Debug: 打印 API 返回的 insight.params
      if (insight?.params) {
        console.log(
          '[useA2UIInsight] API response insight.params:',
          insight.params.map((p) => ({
            key: p.key,
            value: p.value,
            type: typeof p.value,
          }))
        )
      }

      // 检查是否是澄清类型
      const isClarification = insight?.type === 'clarification'
      const clarification = isClarification ? (insight as ClarificationInsight) : null

      // 更新状态
      setState((prev) => ({
        ...prev,
        insight: insight || null,
        clarification,
        conversationId: response.conversationId,
        intent: response.intent,
        confidence: response.confidence,
        message: response.message,
        suggestedActions: response.suggestedActions || [],
        isLoading: false,
        error: null,
        // 更新多步骤引导状态
        currentStep: clarification ? prev.currentStep + 1 : prev.currentStep,
        remainingQuestions: clarification?.remainingQuestions ?? 0,
        // 保留已收集的参数
        collectedParams: clarification?.collectedParams
          ? { ...prev.collectedParams, ...clarification.collectedParams }
          : prev.collectedParams,
      }))

      // 添加到历史
      if (insight) {
        addToHistory(insight)
      }

      return insight || null
    },
    [addToHistory]
  )

  /**
   * 发送消息并获取 InsightData
   */
  const sendMessage = useCallback(
    async (message: string, context?: Record<string, unknown>): Promise<InsightData | null> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }))
      setStoreLoading(true)

      try {
        const response = await fetchInsight(message, context)

        if (!response) {
          throw new Error('无法获取 AI 响应')
        }

        if (!response.success) {
          throw new Error(response.error || '请求失败')
        }

        return handleResponse(response)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '请求失败'

        // 忽略被取消的请求（不显示错误）
        if (errorMessage === '请求已取消') {
          return null
        }

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }))
        return null
      } finally {
        setStoreLoading(false)
      }
    },
    [fetchInsight, handleResponse, setStoreLoading]
  )

  /**
   * 提交澄清回答并继续对话
   */
  const submitClarificationAnswer = useCallback(
    async (answer: ClarificationAnswer): Promise<InsightData | null> => {
      if (!state.clarification) {
        console.warn('[useA2UIInsight] No active clarification')
        return null
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }))
      setStoreLoading(true)

      try {
        // 构建回答文本
        let answerText = ''

        if (answer.selectedOptions.length > 0) {
          // 找到选中的选项标签
          const selectedLabels = answer.selectedOptions
            .map((optId) => {
              const option = state.clarification?.options.find((o) => o.id === optId)
              return option?.label
            })
            .filter(Boolean)

          answerText = selectedLabels.join(', ')
        }

        if (answer.customText) {
          answerText = answerText ? `${answerText}; ${answer.customText}` : answer.customText
        }

        // 更新已收集的参数
        const newCollectedParams = {
          ...state.collectedParams,
          [state.clarification.category]: answerText,
        }

        setState((prev) => ({
          ...prev,
          collectedParams: newCollectedParams,
        }))

        // 发送回答给后端继续对话
        // 注意：必须显式传递 collectedParams，因为 setState 是异步的
        // fetchInsight 使用 state.collectedParams 可能还是旧值
        const response = await fetchInsight(answerText, {
          isFollowUp: true,
          previousQuestion: state.clarification.question,
          category: state.clarification.category,
          collectedParams: newCollectedParams, // 显式传递最新的参数
        })

        if (!response) {
          throw new Error('无法获取 AI 响应')
        }

        if (!response.success) {
          throw new Error(response.error || '请求失败')
        }

        return handleResponse(response)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '提交回答失败'

        // 忽略被取消的请求（不显示错误）
        if (errorMessage === '请求已取消') {
          return null
        }

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }))
        return null
      } finally {
        setStoreLoading(false)
      }
    },
    [state.clarification, state.collectedParams, fetchInsight, handleResponse, setStoreLoading]
  )

  /**
   * 跳过当前澄清问题
   */
  const skipClarification = useCallback(async (): Promise<InsightData | null> => {
    if (!state.clarification) {
      console.warn('[useA2UIInsight] No active clarification to skip')
      return null
    }

    return submitClarificationAnswer({
      questionId: state.clarification.id,
      selectedOptions: [],
      skipped: true,
    })
  }, [state.clarification, submitClarificationAnswer])

  /**
   * 重置状态
   */
  const reset = useCallback(() => {
    // 取消任何进行中的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setState(initialState)
  }, [])

  /**
   * 清除错误
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
  }, [])

  return {
    ...state,
    sendMessage,
    submitClarificationAnswer,
    skipClarification,
    reset,
    clearError,
  }
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * 检查 InsightData 是否是 ClarificationInsight
 */
export function isClarificationInsight(
  insight: InsightData | null
): insight is ClarificationInsight {
  return insight?.type === 'clarification'
}

/**
 * 检查 InsightData 是否需要用户审批
 */
export function needsApproval(insight: InsightData | null): boolean {
  if (!insight) return false
  const approvalTypes: InsightType[] = ['strategy_create', 'strategy_modify', 'risk_alert']
  return approvalTypes.includes(insight.type)
}

// =============================================================================
// Export
// =============================================================================

export default useA2UIInsight
