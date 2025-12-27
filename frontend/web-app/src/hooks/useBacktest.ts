/**
 * useBacktest Hook
 * Story 2.1: 回测状态管理与执行流程
 *
 * 连接 BacktestCanvas 组件与 API/BacktestStore，
 * 提供完整的回测状态管理和进度跟踪。
 */

import { useCallback, useEffect, useRef,useState } from 'react'

import { useBacktestStore } from '@/store/backtest'
import type {
  BacktestConfig,
  BacktestResult,
  BacktestRunState,
} from '@/types/backtest'
import type { BacktestInsightData } from '@/types/insight'

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
  pauseBacktest: () => void
  /** 恢复回测 */
  resumeBacktest: () => void
  /** 取消回测 */
  cancelBacktest: () => void
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
    pollingInterval: _pollingInterval = 2000,
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

  // Note: 当前实现是同步的，不需要轮询
  // 保留 pollStatus 作为空操作，未来可扩展为异步模式
  const pollStatus = useCallback(() => {
    // 同步模式下不需要轮询，回测结果在 startBacktest 中直接返回
    if (!backtestId || isPaused) return
  }, [backtestId, isPaused])

  // 保留轮询 effect 结构，但当前不启用
  useEffect(() => {
    // 同步模式下不需要轮询
    void pollStatus // 消除未使用警告
  }, [pollStatus])

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
        // Generate backtest ID
        const newBacktestId = `bt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        setBacktestId(newBacktestId)

        // Update store
        setCurrentBacktest(newBacktestId, backtestConfig)

        setState((prev) => ({
          ...prev,
          progress: 10,
          currentStep: '加载历史数据...',
        }))

        // Convert BacktestConfig to API request format
        const apiRequest = {
          jobId: newBacktestId,
          config: {
            strategyName: backtestConfig.name,
            strategyDescription: `${backtestConfig.strategyType} 策略`,
            symbol: backtestConfig.symbol,
            timeframe: '1h', // 默认 1 小时周期
            startDate: new Date(backtestConfig.startDate).getTime(),
            endDate: new Date(backtestConfig.endDate).getTime(),
            initialCapital: backtestConfig.initialCapital,
            parameters: Object.entries(backtestConfig.params).map(([key, value]) => ({
              key,
              label: key,
              value: value as number,
              type: 'number' as const,
            })),
          },
        }

        setState((prev) => ({
          ...prev,
          progress: 30,
          currentStep: '执行回测策略...',
        }))

        // Call internal API directly
        const response = await fetch('/api/backtest/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiRequest),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || '回测请求失败')
        }

        const backtestResult: BacktestInsightData = await response.json()

        setState((prev) => ({
          ...prev,
          progress: 90,
          currentStep: '分析回测结果...',
        }))

        // Convert BacktestInsightData to BacktestResult format
        const result: BacktestResult = {
          id: newBacktestId,
          config: backtestConfig,
          metrics: {
            totalReturn: backtestResult.stats.totalReturn,
            annualizedReturn: backtestResult.stats.annualizedReturn,
            maxDrawdown: backtestResult.stats.maxDrawdown,
            sharpeRatio: backtestResult.stats.sharpeRatio,
            winRate: backtestResult.stats.winRate,
            profitFactor: backtestResult.stats.profitFactor,
            totalTrades: backtestResult.stats.totalTrades,
            avgWin: backtestResult.stats.avgWin,
            avgLoss: backtestResult.stats.avgLoss,
          },
          trades: backtestResult.trades.map((t) => ({
            id: t.id,
            symbol: backtestConfig.symbol,
            side: t.direction === 'long' ? 'buy' as const : 'sell' as const,
            entryPrice: t.entryPrice,
            exitPrice: t.exitPrice ?? t.entryPrice,
            quantity: t.quantity,
            entryTime: new Date(t.entryTime).toISOString(),
            exitTime: t.exitTime ? new Date(t.exitTime).toISOString() : new Date(t.entryTime).toISOString(),
            pnl: t.pnl,
            pnlPercent: t.pnlPercent,
            fee: t.fee,
          })),
          equity: backtestResult.equityCurve.map((e) => ({
            date: new Date(e.timestamp).toISOString(),
            equity: e.equity,
            drawdown: e.drawdown,
          })),
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        }

        // Complete
        setState({
          phase: 'completed',
          progress: 100,
          currentStep: '回测完成',
          error: null,
          result,
        })

        storeSetResult(result)
        onSuccess?.(result)
        cleanup()
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          // 用户取消，不作为错误处理
          return
        }
        handleError(
          createError(
            error instanceof Error ? error.message : '启动回测失败',
            'NETWORK_ERROR',
            error
          )
        )
      }
    },
    [cleanup, timeout, setCurrentBacktest, storeSetResult, onSuccess, handleError, createError]
  )

  // ==========================================================================
  // Pause Backtest
  // ==========================================================================

  const pauseBacktest = useCallback(() => {
    if (!backtestId || state.phase !== 'running') return

    // 同步模式下，暂停只更新本地状态
    setIsPaused(true)
    updateStatus({ isRunning: false })
    setState((prev) => ({
      ...prev,
      currentStep: '回测已暂停',
    }))
  }, [backtestId, state.phase, updateStatus])

  // ==========================================================================
  // Resume Backtest
  // ==========================================================================

  const resumeBacktest = useCallback(() => {
    if (!backtestId || state.phase !== 'running' || !isPaused) return

    // 同步模式下，恢复只更新本地状态
    setIsPaused(false)
    updateStatus({ isRunning: true })
    setState((prev) => ({
      ...prev,
      currentStep: STEP_MESSAGES.running,
    }))
  }, [backtestId, state.phase, isPaused, updateStatus])

  // ==========================================================================
  // Cancel Backtest
  // ==========================================================================

  const cancelBacktest = useCallback(() => {
    if (!backtestId) return

    // 同步模式下，取消只中止本地请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    handleError(createError('回测已取消', 'CANCELLED'))
    clearCurrent()
    cleanup()
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
