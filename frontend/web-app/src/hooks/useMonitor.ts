/**
 * useMonitor Hook
 * Story 3.1: 监控状态管理与实时数据
 *
 * 连接 MonitorCanvas 组件与 API/MonitorStore，
 * 提供策略实时监控和控制功能。
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { useMonitorStore } from '@/store/monitor'
import { apiClient } from '@/lib/api'
import type {
  StrategyInfo,
  PnLData,
  Position,
  Trade,
  StrategyMetrics,
  StrategyStatus,
} from '@/components/canvas/MonitorCanvas'

// =============================================================================
// Types
// =============================================================================

export interface MonitorState {
  /** 策略信息 */
  strategy: StrategyInfo | null
  /** 盈亏数据 */
  pnl: PnLData | null
  /** 持仓列表 */
  positions: Position[]
  /** 最近交易 */
  recentTrades: Trade[]
  /** 性能指标 */
  metrics: StrategyMetrics | null
  /** 加载中 */
  isLoading: boolean
  /** 错误信息 */
  error: string | null
  /** 最后更新时间 */
  lastUpdated: number | null
}

export interface UseMonitorOptions {
  /** Agent ID */
  agentId: string
  /** 轮询间隔 (ms) */
  pollingInterval?: number
  /** 是否启用轮询 */
  enabled?: boolean
  /** 状态变更回调 */
  onStatusChange?: (status: StrategyStatus) => void
  /** 错误回调 */
  onError?: (error: Error) => void
}

export interface UseMonitorReturn {
  /** 监控状态 */
  state: MonitorState
  /** 是否正在运行 */
  isRunning: boolean
  /** 是否已暂停 */
  isPaused: boolean
  /** 是否已停止 */
  isStopped: boolean

  /** 暂停 Agent */
  pauseAgent: () => Promise<void>
  /** 恢复 Agent */
  resumeAgent: () => Promise<void>
  /** 停止 Agent */
  stopAgent: () => Promise<void>
  /** 手动刷新 */
  refresh: () => Promise<void>
}

// =============================================================================
// Initial State
// =============================================================================

const initialState: MonitorState = {
  strategy: null,
  pnl: null,
  positions: [],
  recentTrades: [],
  metrics: null,
  isLoading: true,
  error: null,
  lastUpdated: null,
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useMonitor(options: UseMonitorOptions): UseMonitorReturn {
  const {
    agentId,
    pollingInterval = 5000,
    enabled = true,
    onStatusChange,
    onError,
  } = options

  // Local state
  const [state, setState] = useState<MonitorState>(initialState)
  const previousStatusRef = useRef<StrategyStatus | null>(null)

  // Refs for cleanup
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Store actions
  const {
    setCurrentAgent,
    updateData,
    clearCurrent,
    setLoading,
    setError: storeSetError,
  } = useMonitorStore()

  // ==========================================================================
  // Computed Values
  // ==========================================================================

  const isRunning = state.strategy?.status === 'running'
  const isPaused = state.strategy?.status === 'paused'
  const isStopped = state.strategy?.status === 'stopped'

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  const cleanup = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
      clearCurrent()
    }
  }, [cleanup, clearCurrent])

  // ==========================================================================
  // Fetch Data
  // ==========================================================================

  const fetchData = useCallback(async () => {
    if (!agentId) return

    try {
      // 并行获取所有数据
      const [statusRes, positions, trades, metrics] = await Promise.all([
        apiClient.getAgentStatus(agentId),
        apiClient.getAgentPositions(agentId),
        apiClient.getAgentTrades(agentId, 10),
        apiClient.getAgentMetrics(agentId),
      ])

      const newState: MonitorState = {
        strategy: statusRes.strategy,
        pnl: statusRes.pnl,
        positions,
        recentTrades: trades,
        metrics,
        isLoading: false,
        error: null,
        lastUpdated: Date.now(),
      }

      setState(newState)

      // 更新 Store
      updateData(agentId, {
        strategy: statusRes.strategy,
        pnl: statusRes.pnl,
        positions,
        recentTrades: trades,
        metrics,
        lastUpdated: Date.now(),
      })

      // 检测状态变化
      if (
        previousStatusRef.current !== null &&
        previousStatusRef.current !== statusRes.strategy.status
      ) {
        onStatusChange?.(statusRes.strategy.status)
      }
      previousStatusRef.current = statusRes.strategy.status
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取监控数据失败'
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))
      storeSetError(errorMessage)
      onError?.(error instanceof Error ? error : new Error(errorMessage))
    }
  }, [agentId, updateData, storeSetError, onStatusChange, onError])

  // ==========================================================================
  // Polling Effect
  // ==========================================================================

  useEffect(() => {
    if (!agentId || !enabled) {
      cleanup()
      return
    }

    // 设置当前监控的 Agent
    setCurrentAgent(agentId)
    setLoading(true)

    // 立即获取一次数据
    fetchData()

    // 设置轮询
    pollingRef.current = setInterval(fetchData, pollingInterval)

    return () => {
      cleanup()
    }
  }, [agentId, enabled, pollingInterval, fetchData, cleanup, setCurrentAgent, setLoading])

  // ==========================================================================
  // Control Methods
  // ==========================================================================

  const pauseAgent = useCallback(async (): Promise<void> => {
    if (!agentId || isStopped) return

    try {
      setState((prev) => ({ ...prev, isLoading: true }))
      await apiClient.pauseAgent(agentId)

      // 更新本地状态
      setState((prev) => ({
        ...prev,
        strategy: prev.strategy
          ? { ...prev.strategy, status: 'paused' }
          : null,
        isLoading: false,
      }))

      // 更新 Store
      if (state.strategy) {
        updateData(agentId, {
          strategy: { ...state.strategy, status: 'paused' },
        })
      }

      onStatusChange?.('paused')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '暂停失败'
      setState((prev) => ({ ...prev, isLoading: false, error: errorMessage }))
      onError?.(error instanceof Error ? error : new Error(errorMessage))
    }
  }, [agentId, isStopped, state.strategy, updateData, onStatusChange, onError])

  const resumeAgent = useCallback(async (): Promise<void> => {
    if (!agentId || !isPaused) return

    try {
      setState((prev) => ({ ...prev, isLoading: true }))
      await apiClient.resumeAgent(agentId)

      // 更新本地状态
      setState((prev) => ({
        ...prev,
        strategy: prev.strategy
          ? { ...prev.strategy, status: 'running' }
          : null,
        isLoading: false,
      }))

      // 更新 Store
      if (state.strategy) {
        updateData(agentId, {
          strategy: { ...state.strategy, status: 'running' },
        })
      }

      onStatusChange?.('running')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '恢复失败'
      setState((prev) => ({ ...prev, isLoading: false, error: errorMessage }))
      onError?.(error instanceof Error ? error : new Error(errorMessage))
    }
  }, [agentId, isPaused, state.strategy, updateData, onStatusChange, onError])

  const stopAgent = useCallback(async (): Promise<void> => {
    if (!agentId || isStopped) return

    try {
      setState((prev) => ({ ...prev, isLoading: true }))
      await apiClient.stopAgent(agentId)

      // 停止轮询
      cleanup()

      // 更新本地状态
      setState((prev) => ({
        ...prev,
        strategy: prev.strategy
          ? { ...prev.strategy, status: 'stopped' }
          : null,
        isLoading: false,
      }))

      // 更新 Store
      if (state.strategy) {
        updateData(agentId, {
          strategy: { ...state.strategy, status: 'stopped' },
        })
      }

      onStatusChange?.('stopped')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '停止失败'
      setState((prev) => ({ ...prev, isLoading: false, error: errorMessage }))
      onError?.(error instanceof Error ? error : new Error(errorMessage))
    }
  }, [agentId, isStopped, cleanup, state.strategy, updateData, onStatusChange, onError])

  const refresh = useCallback(async (): Promise<void> => {
    setState((prev) => ({ ...prev, isLoading: true }))
    await fetchData()
  }, [fetchData])

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    state,
    isRunning,
    isPaused,
    isStopped,
    pauseAgent,
    resumeAgent,
    stopAgent,
    refresh,
  }
}

// =============================================================================
// Additional Hooks
// =============================================================================

/**
 * useMonitorData - 获取当前监控数据 (从 Store)
 */
export function useMonitorData(agentId?: string) {
  const getData = useMonitorStore((state) => state.getData)
  const currentAgentId = useMonitorStore((state) => state.currentAgentId)

  const id = agentId || currentAgentId
  return id ? getData(id) : null
}

/**
 * useMonitorStatus - 获取监控加载状态
 */
export function useMonitorStatus() {
  const isLoading = useMonitorStore((state) => state.isLoading)
  const error = useMonitorStore((state) => state.error)
  const currentAgentId = useMonitorStore((state) => state.currentAgentId)

  return {
    isLoading,
    error,
    currentAgentId,
  }
}

export default useMonitor
