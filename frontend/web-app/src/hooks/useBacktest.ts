/**
 * useBacktest Hook
 * Story 2.1: 回测状态管理与执行流程
 *
 * 连接 BacktestCanvas 组件与 API/BacktestStore，
 * 提供完整的回测状态管理和进度跟踪。
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { useBacktestStore } from '@/store/backtest'
import { apiClient } from '@/lib/api'
import type {
  BacktestConfig,
  BacktestResult,
  BacktestRunState,
} from '@/types/backtest'

// =============================================================================
// Types
// =============================================================================

export type BacktestPhase =
  | 'idle'           // 初始状态
  | 'configuring'    // 配置中
  | 'running'        // 运行中
  | 'completed'      // 完成
  | 'failed'         // 失败

export interface BacktestState {
  /** 当前回测阶段 */
  phase: BacktestPhase
  /** 回测进度 (0-100) */
  progress: number
  /** 当前步骤描述 */
  currentStep: string
  /** 错误信息 */
  error: BacktestError | null
  /** 回测结果 */
  result: BacktestResult | null
}

export interface BacktestError {
  message: string
  code: BacktestErrorCode
  cause?: unknown
}

export type BacktestErrorCode =
  | 'INVALID_CONFIG'
  | 'DATA_LOAD_FAILED'
  | 'EXECUTION_ERROR'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR'

export interface UseBacktestOptions {
  /** 策略 ID */
  strategyId: string
  /** 回测成功回调 */
  onSuccess?: (result: BacktestResult) => void
  /** 回测失败回调 */
  onError?: (error: BacktestError) => void
  /** 状态轮询间隔 (ms) */
  pollingInterval?: number
  /** 超时时间 (ms) */
  timeout?: number
}

export interface UseBacktestReturn {
  /** 回测状态 */
  state: BacktestState
  /** 回测配置 */
  config: BacktestConfig | null
  /** 是否正在运行 */
  isRunning: boolean
  /** 是否可以开始回测 */
  canStart: boolean
  /** 回测是否通过 */
  isPassed: boolean

  /** 开始回测 */
  startBacktest: (config: BacktestConfig) => Promise<void>
  /** 暂停回测 */
  pauseBacktest: () => Promise<void>
  /** 恢复回测 */
  resumeBacktest: () => Promise<void>
  /** 取消回测 */
  cancelBacktest: () => Promise<void>
  /** 重置状态 */
  reset: () => void
}

// =============================================================================
// Constants
// =============================================================================

const STEP_MESSAGES: Record<BacktestRunState['stage'], string> = {
  preparing: '准备回测环境...',
  loading_data: '加载历史数据...',
  running: '执行回测策略...',
  analyzing: '分析回测结果...',
  completed: '回测完成',
}

const initialState: BacktestState = {
  phase: 'idle',
  progress: 0,
  currentStep: '',
  error: null,
  result: null,
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useBacktest(options: UseBacktestOptions): UseBacktestReturn {
  const {
    strategyId: _strategyId, // Reserved for future use
    onSuccess,
    onError,
    pollingInterval = 2000,
    timeout = 300000, // 5 分钟超时
  } = options

  // Local state
  const [state, setState] = useState<BacktestState>(initialState)
  const [config, setConfig] = useState<BacktestConfig | null>(null)
  const [backtestId, setBacktestId] = useState<string | null>(null)
  const [isPaused, setIsPaused] = useState(false)

  // Refs for cleanup
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Store actions
  const {
    setCurrentBacktest,
    updateStatus,
    setResult: storeSetResult,
    clearCurrent,
    setError: storeSetError,
    isBacktestPassed,
  } = useBacktestStore()

  // ==========================================================================
  // Computed Values
  // ==========================================================================

  const isRunning = state.phase === 'running' && !isPaused
  const canStart = state.phase === 'idle' || state.phase === 'completed' || state.phase === 'failed'
  const isPassed = state.result ? isBacktestPassed() : false

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  const cleanup = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return cleanup
  }, [cleanup])

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  const createError = useCallback(
    (message: string, code: BacktestErrorCode, cause?: unknown): BacktestError => ({
      message,
      code,
      cause,
    }),
    []
  )

  const handleError = useCallback(
    (error: BacktestError) => {
      setState((prev) => ({
        ...prev,
        phase: 'failed',
        error,
      }))
      storeSetError(error.message)
      onError?.(error)
      cleanup()
    },
    [cleanup, onError, storeSetError]
  )

  // ==========================================================================
  // Poll Status
  // ==========================================================================

  const pollStatus = useCallback(async () => {
    if (!backtestId || isPaused) return

    try {
      const status = await apiClient.getBacktestRunStatus(backtestId)

      setState((prev) => ({
        ...prev,
        progress: status.progress,
        currentStep: STEP_MESSAGES[status.stage] || status.stage,
      }))

      updateStatus(status)

      // Check completion
      if (status.stage === 'completed' && status.progress >= 100) {
        const result = await apiClient.getBacktestFullResult(backtestId)

        setState((prev) => ({
          ...prev,
          phase: 'completed',
          progress: 100,
          currentStep: '回测完成',
          result,
        }))

        storeSetResult(result)
        onSuccess?.(result)
        cleanup()
      }

      // Check failure
      if (status.error) {
        handleError(createError(status.error, 'EXECUTION_ERROR'))
      }
    } catch (error) {
      console.error('Failed to poll backtest status:', error)
      // Don't fail immediately, might be a transient error
    }
  }, [backtestId, isPaused, updateStatus, storeSetResult, onSuccess, cleanup, handleError, createError])

  // Start polling when running
  useEffect(() => {
    if (state.phase === 'running' && backtestId && !isPaused) {
      pollingRef.current = setInterval(pollStatus, pollingInterval)
      return () => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current)
        }
      }
    }
  }, [state.phase, backtestId, isPaused, pollingInterval, pollStatus])

  // ==========================================================================
  // Start Backtest
  // ==========================================================================

  const startBacktest = useCallback(
    async (backtestConfig: BacktestConfig): Promise<void> => {
      // Validate config
      if (!backtestConfig.name || !backtestConfig.symbol) {
        handleError(createError('回测配置无效', 'INVALID_CONFIG'))
        return
      }

      // Reset state
      cleanup()
      setConfig(backtestConfig)
      setIsPaused(false)

      setState({
        phase: 'running',
        progress: 0,
        currentStep: '准备回测环境...',
        error: null,
        result: null,
      })

      // Create abort controller
      abortControllerRef.current = new AbortController()

      // Set timeout
      timeoutRef.current = setTimeout(() => {
        handleError(createError('回测超时', 'TIMEOUT'))
      }, timeout)

      try {
        // Call API to start backtest
        const response = await apiClient.runBacktest(backtestConfig)
        setBacktestId(response.backtestId)

        // Update store
        setCurrentBacktest(response.backtestId, backtestConfig)

        setState((prev) => ({
          ...prev,
          progress: 10,
          currentStep: '加载历史数据...',
        }))
      } catch (error) {
        handleError(
          createError(
            error instanceof Error ? error.message : '启动回测失败',
            'NETWORK_ERROR',
            error
          )
        )
      }
    },
    [cleanup, timeout, setCurrentBacktest, handleError, createError]
  )

  // ==========================================================================
  // Pause Backtest
  // ==========================================================================

  const pauseBacktest = useCallback(async (): Promise<void> => {
    if (!backtestId || state.phase !== 'running') return

    try {
      await apiClient.pauseBacktest(backtestId)
      setIsPaused(true)
      updateStatus({ isRunning: false })
      setState((prev) => ({
        ...prev,
        currentStep: '回测已暂停',
      }))
    } catch (error) {
      console.error('Failed to pause backtest:', error)
    }
  }, [backtestId, state.phase, updateStatus])

  // ==========================================================================
  // Resume Backtest
  // ==========================================================================

  const resumeBacktest = useCallback(async (): Promise<void> => {
    if (!backtestId || state.phase !== 'running' || !isPaused) return

    try {
      await apiClient.resumeBacktest(backtestId)
      setIsPaused(false)
      updateStatus({ isRunning: true })
      setState((prev) => ({
        ...prev,
        currentStep: STEP_MESSAGES.running,
      }))
    } catch (error) {
      console.error('Failed to resume backtest:', error)
    }
  }, [backtestId, state.phase, isPaused, updateStatus])

  // ==========================================================================
  // Cancel Backtest
  // ==========================================================================

  const cancelBacktest = useCallback(async (): Promise<void> => {
    if (!backtestId) return

    try {
      await apiClient.cancelBacktestRun(backtestId)
      handleError(createError('回测已取消', 'CANCELLED'))
      clearCurrent()
    } catch (error) {
      console.error('Failed to cancel backtest:', error)
    } finally {
      cleanup()
    }
  }, [backtestId, cleanup, clearCurrent, handleError, createError])

  // ==========================================================================
  // Reset
  // ==========================================================================

  const reset = useCallback(() => {
    cleanup()
    setState(initialState)
    setConfig(null)
    setBacktestId(null)
    setIsPaused(false)
    clearCurrent()
  }, [cleanup, clearCurrent])

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    state,
    config,
    isRunning,
    canStart,
    isPassed,
    startBacktest,
    pauseBacktest,
    resumeBacktest,
    cancelBacktest,
    reset,
  }
}

// =============================================================================
// Additional Hooks
// =============================================================================

/**
 * useBacktestHistory - 获取回测历史
 */
export function useBacktestHistory() {
  const history = useBacktestStore((state) => state.history)
  const removeFromHistory = useBacktestStore((state) => state.removeFromHistory)

  return {
    history,
    removeFromHistory,
  }
}

/**
 * useBacktestResult - 获取当前回测结果
 */
export function useBacktestResult() {
  const result = useBacktestStore((state) => state.currentResult)
  const isBacktestPassed = useBacktestStore((state) => state.isBacktestPassed)
  const getBacktestSummary = useBacktestStore((state) => state.getBacktestSummary)

  return {
    result,
    isPassed: isBacktestPassed(),
    summary: getBacktestSummary(),
  }
}

export default useBacktest
