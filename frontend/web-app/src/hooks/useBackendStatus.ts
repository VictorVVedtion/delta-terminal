/**
 * useBackendStatus Hook
 *
 * 检测后端服务连接状态
 * - 定期检查 NLP Processor 和 API 服务可用性
 * - 提供连接状态给 UI 组件显示
 */

import { useCallback, useEffect, useState } from 'react'

// =============================================================================
// Types
// =============================================================================

export interface BackendStatus {
  /** NLP Processor 服务状态 */
  nlpProcessor: 'connected' | 'disconnected' | 'checking'
  /** API Gateway 服务状态 */
  apiGateway: 'connected' | 'disconnected' | 'checking'
  /** 整体连接状态 */
  overall: 'connected' | 'partial' | 'disconnected' | 'checking'
  /** 最后检查时间 */
  lastChecked: number | null
  /** 错误信息 */
  error: string | null
}

interface UseBackendStatusOptions {
  /** 自动检查间隔 (毫秒)，0 表示不自动检查 */
  checkInterval?: number
  /** 是否在挂载时立即检查 */
  checkOnMount?: boolean
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_CHECK_INTERVAL = 30000 // 30 秒
const CHECK_TIMEOUT = 5000 // 5 秒超时

// =============================================================================
// Initial State
// =============================================================================

const initialStatus: BackendStatus = {
  nlpProcessor: 'checking',
  apiGateway: 'checking',
  overall: 'checking',
  lastChecked: null,
  error: null,
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useBackendStatus(options: UseBackendStatusOptions = {}) {
  const { checkInterval = DEFAULT_CHECK_INTERVAL, checkOnMount = true } = options

  const [status, setStatus] = useState<BackendStatus>(initialStatus)
  const [isChecking, setIsChecking] = useState(false)

  /**
   * 检查单个服务状态
   */
  const checkService = async (url: string): Promise<boolean> => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), CHECK_TIMEOUT)

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      })
      return response.ok
    } catch {
      return false
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * 检查所有后端服务状态
   */
  const checkStatus = useCallback(async () => {
    if (isChecking) return

    setIsChecking(true)
    setStatus((prev) => ({
      ...prev,
      nlpProcessor: 'checking',
      apiGateway: 'checking',
      overall: 'checking',
    }))

    try {
      // 并行检查所有服务
      const [nlpOk, apiOk] = await Promise.all([
        checkService('/api/ai/insight'), // 检查 NLP Processor 路由
        checkService('/api/ai/status'), // 检查 API 状态路由
      ])

      // 计算整体状态
      let overall: BackendStatus['overall']
      if (nlpOk && apiOk) {
        overall = 'connected'
      } else if (nlpOk || apiOk) {
        overall = 'partial'
      } else {
        overall = 'disconnected'
      }

      setStatus({
        nlpProcessor: nlpOk ? 'connected' : 'disconnected',
        apiGateway: apiOk ? 'connected' : 'disconnected',
        overall,
        lastChecked: Date.now(),
        error: overall === 'disconnected' ? '无法连接后端服务' : null,
      })
    } catch (error) {
      setStatus({
        nlpProcessor: 'disconnected',
        apiGateway: 'disconnected',
        overall: 'disconnected',
        lastChecked: Date.now(),
        error: error instanceof Error ? error.message : '检查连接状态失败',
      })
    } finally {
      setIsChecking(false)
    }
  }, [isChecking])

  // 初始检查
  useEffect(() => {
    if (checkOnMount) {
      void checkStatus()
    }
  }, [checkOnMount, checkStatus])

  // 定期检查
  useEffect(() => {
    if (checkInterval <= 0) return

    const intervalId = setInterval(() => void checkStatus(), checkInterval)
    return () => clearInterval(intervalId)
  }, [checkInterval, checkStatus])

  return {
    ...status,
    isChecking,
    checkStatus,
  }
}

export default useBackendStatus
