/**
 * useOnlineStatus - 网络状态检测 Hook
 *
 * 功能:
 * - 监听浏览器 online/offline 事件
 * - 周期性 ping 检测实际连接状态
 * - 提供离线队列支持
 *
 * @module S45 网络断线处理
 */

import { useCallback, useEffect, useRef,useState } from 'react'

export interface NetworkStatus {
  /** 浏览器报告的在线状态 */
  isOnline: boolean
  /** 实际网络连接状态 (通过 ping 验证) */
  isConnected: boolean
  /** 上次成功连接时间 */
  lastOnlineAt: Date | null
  /** 离线持续时间 (毫秒) */
  offlineDuration: number
  /** 当前重连尝试次数 */
  reconnectAttempts: number
}

export interface UseOnlineStatusOptions {
  /** Ping 检测间隔 (毫秒), 默认 30000 */
  pingInterval?: number
  /** Ping 超时时间 (毫秒), 默认 5000 */
  pingTimeout?: number
  /** Ping 端点, 默认 /api/health */
  pingEndpoint?: string
  /** 是否启用 ping 检测, 默认 true */
  enablePing?: boolean
  /** 离线时回调 */
  onOffline?: () => void
  /** 恢复在线时回调 */
  onOnline?: () => void
}

const DEFAULT_OPTIONS: Required<Omit<UseOnlineStatusOptions, 'onOffline' | 'onOnline'>> = {
  pingInterval: 30000,
  pingTimeout: 5000,
  pingEndpoint: '/api/health',
  enablePing: true,
}

export function useOnlineStatus(options: UseOnlineStatusOptions = {}): NetworkStatus {
  const config = { ...DEFAULT_OPTIONS, ...options }

  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isConnected: true,
    lastOnlineAt: new Date(),
    offlineDuration: 0,
    reconnectAttempts: 0,
  })

  const offlineStartRef = useRef<Date | null>(null)
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)

  // Ping 检测实际连接状态
  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (!config.enablePing) return status.isOnline

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), config.pingTimeout)

    try {
      const response = await fetch(config.pingEndpoint, {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      return response.ok
    } catch {
      clearTimeout(timeoutId)
      return false
    }
  }, [config.enablePing, config.pingEndpoint, config.pingTimeout, status.isOnline])

  // 处理在线状态变化
  const handleOnline = useCallback(async () => {
    const isActuallyConnected = await checkConnection()

    if (isActuallyConnected) {
      const now = new Date()
      const offlineDuration = offlineStartRef.current
        ? now.getTime() - offlineStartRef.current.getTime()
        : 0

      setStatus(prev => ({
        ...prev,
        isOnline: true,
        isConnected: true,
        lastOnlineAt: now,
        offlineDuration,
        reconnectAttempts: reconnectAttemptsRef.current,
      }))

      offlineStartRef.current = null
      reconnectAttemptsRef.current = 0
      options.onOnline?.()
    }
  }, [checkConnection, options])

  // 处理离线状态变化
  const handleOffline = useCallback(() => {
    if (!offlineStartRef.current) {
      offlineStartRef.current = new Date()
    }
    reconnectAttemptsRef.current++

    setStatus(prev => ({
      ...prev,
      isOnline: false,
      isConnected: false,
      reconnectAttempts: reconnectAttemptsRef.current,
    }))

    options.onOffline?.()
  }, [options])

  // 周期性 ping 检测
  useEffect(() => {
    if (!config.enablePing) return

    const runPing = async () => {
      const isConnected = await checkConnection()

      setStatus(prev => {
        if (prev.isConnected !== isConnected) {
          if (isConnected) {
            void handleOnline()
          } else {
            handleOffline()
          }
        }
        return { ...prev, isConnected }
      })
    }

    // 初始检测
    void runPing()

    // 定期检测 - 使用同步包装器调用异步函数
    pingIntervalRef.current = setInterval(() => { void runPing() }, config.pingInterval)

    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
      }
    }
  }, [config.enablePing, config.pingInterval, checkConnection, handleOnline, handleOffline])

  // 监听浏览器 online/offline 事件
  useEffect(() => {
    const onOnline = () => { void handleOnline() }
    const onOffline = () => handleOffline()

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [handleOnline, handleOffline])

  // 更新离线持续时间
  useEffect(() => {
    if (!status.isOnline && offlineStartRef.current) {
      const intervalId = setInterval(() => {
        setStatus(prev => ({
          ...prev,
          offlineDuration: new Date().getTime() - (offlineStartRef.current?.getTime() || 0),
        }))
      }, 1000)

      return () => clearInterval(intervalId)
    }
  }, [status.isOnline])

  return status
}

export default useOnlineStatus
