/**
 * 策略管理 Hook
 * 处理策略的 CRUD 操作和状态管理
 */

import { useCallback,useEffect, useState } from 'react'

import { apiClient } from '@/lib/api'
import { wsClient } from '@/lib/websocket'
import type { Strategy} from '@/store';
import {useStrategyStore } from '@/store'

// Extended Strategy type with additional fields
export interface ExtendedStrategy extends Strategy {
  description?: string
  config?: any
  createdAt?: number
  lastActive?: number
}

export function useStrategies() {
  const { strategies, setStrategies, addStrategy, updateStrategy, removeStrategy } =
    useStrategyStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchStrategies = useCallback(async () => {
    try {
      setLoading(true)
      const data = await apiClient.getStrategies() as Strategy[]
      setStrategies(data)
      setError(null)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [setStrategies])

  // 订阅策略更新
  useEffect(() => {
    void fetchStrategies()

    const handleStrategyUpdate = (data: { id: string }) => {
      updateStrategy(data.id, data)
    }

    wsClient.subscribeStrategyUpdates(handleStrategyUpdate)

    return () => {
      wsClient.off('strategy_update', handleStrategyUpdate)
    }
  }, [fetchStrategies, updateStrategy])

  const createStrategy = useCallback(
    async (data: Partial<Strategy>) => {
      try {
        const newStrategy = await apiClient.createStrategy(data) as Strategy
        addStrategy(newStrategy)
        return newStrategy
      } catch (err) {
        throw err
      }
    },
    [addStrategy]
  )

  const updateStrategyById = useCallback(
    async (id: string, data: Partial<Strategy>) => {
      try {
        const updated = await apiClient.updateStrategy(id, data) as Strategy
        updateStrategy(id, updated)
        return updated
      } catch (err) {
        throw err
      }
    },
    [updateStrategy]
  )

  const deleteStrategy = useCallback(
    async (id: string) => {
      try {
        await apiClient.deleteStrategy(id)
        removeStrategy(id)
      } catch (err) {
        throw err
      }
    },
    [removeStrategy]
  )

  const startStrategy = useCallback(
    async (id: string) => {
      try {
        await apiClient.startStrategy(id)
        updateStrategy(id, { status: 'running' })
      } catch (err) {
        throw err
      }
    },
    [updateStrategy]
  )

  const stopStrategy = useCallback(
    async (id: string) => {
      try {
        await apiClient.stopStrategy(id)
        updateStrategy(id, { status: 'stopped' })
      } catch (err) {
        throw err
      }
    },
    [updateStrategy]
  )

  return {
    strategies,
    loading,
    error,
    refetch: fetchStrategies,
    createStrategy,
    updateStrategy: updateStrategyById,
    deleteStrategy,
    startStrategy,
    stopStrategy,
  }
}

export function useStrategy(id: string) {
  const [strategy, setStrategy] = useState<Strategy | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchStrategy = useCallback(async () => {
    try {
      setLoading(true)
      const data = await apiClient.getStrategy(id) as Strategy
      setStrategy(data)
      setError(null)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void fetchStrategy()
  }, [fetchStrategy])

  return { strategy, loading, error, refetch: fetchStrategy }
}

export function useAIChat() {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const sendMessage = useCallback(
    async (message: string) => {
      try {
        setLoading(true)
        const response = await apiClient.chatWithAI(message, conversationId || undefined)
        setConversationId(response.conversationId)
        setError(null)
        return response.response
      } catch (err) {
        setError(err as Error)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [conversationId]
  )

  const generateStrategy = useCallback(async (prompt: string) => {
    try {
      setLoading(true)
      const strategy = await apiClient.generateStrategy(prompt)
      setError(null)
      return strategy
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const resetConversation = useCallback(() => {
    setConversationId(null)
  }, [])

  return {
    conversationId,
    loading,
    error,
    sendMessage,
    generateStrategy,
    resetConversation,
  }
}
