/**
 * useAIInit - AI 初始化 Hook
 *
 * 管理 AI 引擎的初始化状态和用户订阅状态
 * 注意：用户不再配置自己的 API Key，平台统一管理
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAIStore } from '@/store/ai'

interface UseAIInitOptions {
  /** 是否自动初始化 */
  autoInit?: boolean
}

interface UseAIInitReturn {
  /** 是否已初始化 */
  isInitialized: boolean
  /** 是否可以使用 AI */
  canUseAI: boolean
  /** 初始化 AI 引擎 */
  initialize: () => Promise<boolean>
  /** 刷新用户状态 */
  refresh: () => Promise<void>
  /** 是否正在加载 */
  isLoading: boolean
  /** 错误信息 */
  error: string | null
  /** 不可用原因 */
  disabledReason: string | null
}

/**
 * AI 初始化 Hook
 *
 * 用于管理 AI 引擎的初始化状态，包括用户订阅状态的加载
 */
export function useAIInit(options: UseAIInitOptions = {}): UseAIInitReturn {
  const { autoInit = true } = options

  const {
    userStatus,
    userStatusLoading,
    refreshUserStatus
  } = useAIStore()

  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 检查是否可以使用 AI
  const canUseAI = userStatus.limits.canUseAI
  const disabledReason = !canUseAI ? userStatus.limits.reason || null : null

  /**
   * 初始化 AI 引擎
   */
  const initialize = useCallback(async (): Promise<boolean> => {
    setError(null)

    try {
      await refreshUserStatus()
      setIsInitialized(true)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : '初始化失败'
      setError(message)
      return false
    }
  }, [refreshUserStatus])

  /**
   * 刷新用户状态
   */
  const refresh = useCallback(async (): Promise<void> => {
    setError(null)
    try {
      await refreshUserStatus()
    } catch (err) {
      const message = err instanceof Error ? err.message : '刷新失败'
      setError(message)
    }
  }, [refreshUserStatus])

  // 自动初始化
  useEffect(() => {
    if (autoInit && !isInitialized) {
      initialize()
    }
  }, [autoInit, isInitialized, initialize])

  return {
    isInitialized,
    canUseAI,
    initialize,
    refresh,
    isLoading: userStatusLoading,
    error,
    disabledReason
  }
}

export default useAIInit
