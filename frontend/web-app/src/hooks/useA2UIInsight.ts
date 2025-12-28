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

import { useCallback, useState } from 'react'

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

/** API 请求超时时间 (毫秒) */
const REQUEST_TIMEOUT = 30000

/** 最大重试次数 */
const MAX_RETRIES = 2

/** 重试延迟基数 (毫秒) */
const RETRY_DELAY_BASE = 1000

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

  // Store hooks
  const { addToHistory, setLoading: setStoreLoading } = useInsightStore()
  const { accessToken } = useAuthStore()

  /**
   * 带超时的 fetch 请求
   */
  const fetchWithTimeout = useCallback(
    async (url: string, options: RequestInit, timeout: number): Promise<Response> => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        })
        return response
      } finally {
        clearTimeout(timeoutId)
      }
    },
    []
  )

  /**
   * 延迟函数
   */
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  /**
   * 调用后端 API 获取 InsightData (带超时和重试)
   */
  const fetchInsight = useCallback(
    async (
      message: string,
      context?: Record<string, unknown>
    ): Promise<InsightApiResponse | null> => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`
      }

      const requestBody = JSON.stringify({
        message,
        conversationId: state.conversationId,
        context: {
          ...context,
          collectedParams: state.collectedParams,
        },
      })

      let lastError: Error | null = null

      // 重试逻辑
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
            console.log(`[useA2UIInsight] Retry attempt ${attempt}/${MAX_RETRIES}...`)
            await delay(RETRY_DELAY_BASE * attempt)
          }

          const response = await fetchWithTimeout(
            '/api/ai/insight',
            {
              method: 'POST',
              headers,
              body: requestBody,
            },
            REQUEST_TIMEOUT
          )

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `API 错误: ${response.status}`)
          }

          return await response.json()
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error))

          // 超时错误特殊处理
          if (lastError.name === 'AbortError') {
            lastError = new Error('请求超时，请稍后重试')
          }

          console.error(`[useA2UIInsight] Fetch error (attempt ${attempt + 1}):`, lastError.message)

          // 最后一次重试失败，抛出错误
          if (attempt === MAX_RETRIES) {
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
        console.log('[useA2UIInsight] API response insight.params:', insight.params.map(p => ({
          key: p.key,
          value: p.value,
          type: typeof p.value,
        })))
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
        currentStep: clarification
          ? prev.currentStep + 1
          : prev.currentStep,
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
    async (
      message: string,
      context?: Record<string, unknown>
    ): Promise<InsightData | null> => {
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
        const errorMessage =
          error instanceof Error ? error.message : '请求失败'
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
              const option = state.clarification?.options.find(
                (o) => o.id === optId
              )
              return option?.label
            })
            .filter(Boolean)

          answerText = selectedLabels.join(', ')
        }

        if (answer.customText) {
          answerText = answerText
            ? `${answerText}; ${answer.customText}`
            : answer.customText
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
        const response = await fetchInsight(answerText, {
          isFollowUp: true,
          previousQuestion: state.clarification.question,
          category: state.clarification.category,
        })

        if (!response) {
          throw new Error('无法获取 AI 响应')
        }

        if (!response.success) {
          throw new Error(response.error || '请求失败')
        }

        return handleResponse(response)
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : '提交回答失败'
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
  const approvalTypes: InsightType[] = [
    'strategy_create',
    'strategy_modify',
    'risk_alert',
  ]
  return approvalTypes.includes(insight.type)
}

// =============================================================================
// Export
// =============================================================================

export default useA2UIInsight
