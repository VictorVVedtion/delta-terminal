/**
 * useDeployment Hook
 * Story 1.3: 部署流程集成与管理
 *
 * 连接 DeployCanvas 组件与 API/AgentStore，
 * 提供完整的部署状态管理和错误处理。
 */

import { useState, useCallback, useEffect } from 'react'
import { useAgentStore } from '@/store/agent'
import { apiClient } from '@/lib/api'
import type {
  DeploymentResult,
  DeploymentStatus,
  BacktestSummary,
  PaperPerformance,
} from '@/types/deployment'
import { DeploymentError, isDeploymentError } from '@/types/deployment'
import type { DeployConfig } from '@/components/canvas/DeployCanvas'
import { usePaperTradingStore } from '@/store/paperTrading'

// =============================================================================
// Types
// =============================================================================

export type DeploymentPhase =
  | 'idle'           // 初始状态
  | 'preflight'      // 检查前置条件
  | 'deploying'      // 部署进行中
  | 'success'        // 部署成功
  | 'failed'         // 部署失败

export interface DeploymentState {
  /** 当前部署阶段 */
  phase: DeploymentPhase
  /** 部署进度 (0-100) */
  progress: number
  /** 当前步骤描述 */
  currentStep: string
  /** 错误信息 */
  error: DeploymentError | null
  /** 部署结果 */
  result: DeploymentResult | null
}

export interface UseDeploymentOptions {
  /** 策略 ID */
  strategyId: string
  /** 部署成功回调 */
  onSuccess?: (result: DeploymentResult) => void
  /** 部署失败回调 */
  onError?: (error: DeploymentError) => void
  /** 状态轮询间隔 (ms) */
  pollingInterval?: number
}

export interface UseDeploymentReturn {
  /** 部署状态 */
  state: DeploymentState
  /** 回测结果 */
  backtestResult: BacktestSummary | null
  /** Paper 表现数据 */
  paperPerformance: PaperPerformance | null
  /** 是否正在加载数据 */
  isLoading: boolean
  /** 是否可以部署到 Paper */
  canDeployToPaper: boolean
  /** 是否可以部署到 Live */
  canDeployToLive: boolean
  /** 执行部署 */
  deploy: (config: DeployConfig) => Promise<DeploymentResult>
  /** 取消部署 */
  cancelDeployment: () => Promise<void>
  /** 重置状态 */
  reset: () => void
  /** 刷新前置条件数据 */
  refreshPrerequisites: () => Promise<void>
}

// =============================================================================
// Initial State
// =============================================================================

const initialState: DeploymentState = {
  phase: 'idle',
  progress: 0,
  currentStep: '',
  error: null,
  result: null,
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useDeployment(options: UseDeploymentOptions): UseDeploymentReturn {
  const { strategyId, onSuccess, onError, pollingInterval = 2000 } = options

  // State
  const [state, setState] = useState<DeploymentState>(initialState)
  const [backtestResult, setBacktestResult] = useState<BacktestSummary | null>(null)
  const [paperPerformance, setPaperPerformance] = useState<PaperPerformance | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [deploymentId, setDeploymentId] = useState<string | null>(null)

  // AgentStore actions
  const {
    deployAgentToPaper,
    deployAgentToLive,
    updateDeploymentProgress,
    rollbackDeployment,
    canDeployToPaper: storeCanDeployToPaper,
    canDeployToLive: storeCanDeployToLive,
  } = useAgentStore()

  // ==========================================================================
  // Computed Values
  // ==========================================================================

  const canDeployToPaper = backtestResult?.passed ?? false
  const canDeployToLive =
    (backtestResult?.passed ?? false) &&
    (paperPerformance?.runningDays ?? 0) >= (paperPerformance?.requiredDays ?? 7)

  // ==========================================================================
  // Refresh Prerequisites
  // ==========================================================================

  const refreshPrerequisites = useCallback(async () => {
    setIsLoading(true)
    try {
      // Fetch backtest result
      const backtest = await apiClient.getStrategyBacktestResult(strategyId)
      setBacktestResult(backtest)

      // Fetch paper performance if applicable
      try {
        const performance = await apiClient.getPaperPerformance(strategyId)
        setPaperPerformance(performance)
      } catch {
        // Paper performance may not exist yet
        setPaperPerformance(null)
      }
    } catch (error) {
      console.error('Failed to fetch prerequisites:', error)
    } finally {
      setIsLoading(false)
    }
  }, [strategyId])

  // Initial data fetch
  useEffect(() => {
    refreshPrerequisites()
  }, [refreshPrerequisites])

  // ==========================================================================
  // Poll Deployment Status
  // ==========================================================================

  useEffect(() => {
    if (!deploymentId || state.phase !== 'deploying') return

    const pollStatus = async () => {
      try {
        const status = await apiClient.getDeploymentStatus(deploymentId)
        setState((prev) => ({
          ...prev,
          progress: status.progress,
          currentStep: status.currentStep,
        }))

        // Update store
        updateDeploymentProgress(strategyId, status)

        // Check completion
        if (status.status === 'completed') {
          setState((prev) => ({
            ...prev,
            phase: 'success',
            progress: 100,
            currentStep: '部署完成',
          }))
          setDeploymentId(null)
        } else if (status.status === 'failed') {
          const error = new DeploymentError(
            status.error || '部署失败',
            'API_ERROR'
          )
          setState((prev) => ({
            ...prev,
            phase: 'failed',
            error,
          }))
          setDeploymentId(null)
          onError?.(error)
        }
      } catch (error) {
        console.error('Failed to poll deployment status:', error)
      }
    }

    const interval = setInterval(pollStatus, pollingInterval)
    return () => clearInterval(interval)
  }, [deploymentId, state.phase, pollingInterval, strategyId, updateDeploymentProgress, onError])

  // ==========================================================================
  // Deploy Action
  // ==========================================================================

  const deploy = useCallback(
    async (config: DeployConfig): Promise<DeploymentResult> => {
      // Preflight check
      setState({
        phase: 'preflight',
        progress: 0,
        currentStep: '检查前置条件...',
        error: null,
        result: null,
      })

      try {
        // Validate prerequisites
        if (config.mode === 'paper') {
          if (!storeCanDeployToPaper(strategyId) && !canDeployToPaper) {
            throw new DeploymentError(
              '回测未通过，无法部署到 Paper',
              'BACKTEST_NOT_PASSED'
            )
          }
        } else {
          if (!storeCanDeployToLive(strategyId) && !canDeployToLive) {
            throw new DeploymentError(
              'Paper 运行时间不足，无法部署到 Live',
              'PAPER_TIME_INSUFFICIENT'
            )
          }
        }

        // Update state to deploying
        setState((prev) => ({
          ...prev,
          phase: 'deploying',
          progress: 10,
          currentStep: config.mode === 'paper' ? '启动 Paper 模式...' : '启动 Live 模式...',
        }))

        // Call API or local store
        let result: DeploymentResult
        if (config.mode === 'paper') {
          // 使用本地 Paper Trading Store
          const paperStore = usePaperTradingStore.getState()
          const accountId = paperStore.initAccount(strategyId, config.capital)

          result = {
            success: true,
            agentId: strategyId,
            deploymentId: `paper_${accountId}`,
            mode: 'paper',
            message: 'Paper Trading 已启动',
            deployedAt: new Date().toISOString(),
          }
        } else {
          if (!config.confirmationToken) {
            throw new DeploymentError(
              '缺少确认令牌',
              'INVALID_TOKEN'
            )
          }
          result = await apiClient.deployLive(strategyId, {
            initialCapital: config.capital,
            confirmationToken: config.confirmationToken,
          })
        }

        // Update store
        if (result.success) {
          if (config.mode === 'paper') {
            deployAgentToPaper(result.agentId, config.capital)
          } else {
            deployAgentToLive(result.agentId, config.capital)
          }

          // Start polling for progress
          setDeploymentId(result.deploymentId)

          setState((prev) => ({
            ...prev,
            phase: 'success',
            progress: 100,
            currentStep: '部署成功',
            result,
          }))

          onSuccess?.(result)
        } else {
          throw new DeploymentError(result.message, 'API_ERROR')
        }

        return result
      } catch (error) {
        const deploymentError = isDeploymentError(error)
          ? error
          : new DeploymentError(
              error instanceof Error ? error.message : '未知错误',
              'UNKNOWN_ERROR',
              error
            )

        setState((prev) => ({
          ...prev,
          phase: 'failed',
          error: deploymentError,
        }))

        // Rollback if needed
        rollbackDeployment(strategyId, 'shadow')

        onError?.(deploymentError)
        throw deploymentError
      }
    },
    [
      strategyId,
      canDeployToPaper,
      canDeployToLive,
      storeCanDeployToPaper,
      storeCanDeployToLive,
      deployAgentToPaper,
      deployAgentToLive,
      rollbackDeployment,
      onSuccess,
      onError,
    ]
  )

  // ==========================================================================
  // Cancel Deployment
  // ==========================================================================

  const cancelDeployment = useCallback(async () => {
    if (!deploymentId) return

    try {
      await apiClient.cancelDeployment(deploymentId)
      setDeploymentId(null)
      setState((prev) => ({
        ...prev,
        phase: 'idle',
        progress: 0,
        currentStep: '部署已取消',
      }))
    } catch (error) {
      console.error('Failed to cancel deployment:', error)
    }
  }, [deploymentId])

  // ==========================================================================
  // Reset
  // ==========================================================================

  const reset = useCallback(() => {
    setState(initialState)
    setDeploymentId(null)
  }, [])

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    state,
    backtestResult,
    paperPerformance,
    isLoading,
    canDeployToPaper,
    canDeployToLive,
    deploy,
    cancelDeployment,
    reset,
    refreshPrerequisites,
  }
}

// =============================================================================
// Additional Hooks
// =============================================================================

/**
 * useDeploymentStatus - 单独获取部署状态的轻量级 Hook
 */
export function useDeploymentStatus(deploymentId: string | null) {
  const [status, setStatus] = useState<DeploymentStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    if (!deploymentId) return

    setIsLoading(true)
    try {
      const data = await apiClient.getDeploymentStatus(deploymentId)
      setStatus(data)
      setError(null)
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [deploymentId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { status, isLoading, error, refresh }
}

/**
 * useBacktestResult - 获取回测结果的 Hook
 */
export function useBacktestResult(strategyId: string) {
  const [result, setResult] = useState<BacktestSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await apiClient.getStrategyBacktestResult(strategyId)
      setResult(data)
      setError(null)
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [strategyId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { result, isLoading, error, refresh }
}

/**
 * usePaperPerformance - 获取 Paper 阶段表现的 Hook
 */
export function usePaperPerformance(agentId: string) {
  const [performance, setPerformance] = useState<PaperPerformance | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await apiClient.getPaperPerformance(agentId)
      setPerformance(data)
      setError(null)
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [agentId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { performance, isLoading, error, refresh }
}
