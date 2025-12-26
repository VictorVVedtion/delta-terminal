/**
 * useMarginMonitor Hook
 * V3 Design Document: S28 - Real-time margin monitoring
 *
 * Features:
 * - WebSocket-based real-time margin updates
 * - Automatic alert level calculation
 * - Notification triggering on threshold breach
 * - Configurable polling fallback
 * - Auto-reconnect on connection loss
 */

import { useEffect, useRef, useCallback } from 'react'
import { useSafetyStore, selectMarginStatus, selectSafetyConfig } from '@/store/safety'
import { notify } from '@/lib/notification'
import type { MarginStatus, MarginAlertLevel } from '@/types/safety'

// =============================================================================
// Type Definitions
// =============================================================================

export interface UseMarginMonitorOptions {
  /** Enable real-time monitoring */
  enabled?: boolean
  /** Polling interval in milliseconds (fallback when WS unavailable) */
  pollingInterval?: number
  /** Enable toast notifications */
  enableNotifications?: boolean
  /** Exchange ID for multi-exchange support */
  exchangeId?: string
  /** Account ID for sub-account support */
  accountId?: string
}

export interface MarginMonitorResult {
  /** Current margin status */
  status: MarginStatus
  /** Current alert level */
  alertLevel: MarginAlertLevel
  /** Is monitoring active */
  isMonitoring: boolean
  /** Connection status */
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error'
  /** Last error message */
  error: string | null
  /** Manually refresh margin data */
  refresh: () => Promise<void>
  /** Start monitoring */
  start: () => void
  /** Stop monitoring */
  stop: () => void
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useMarginMonitor(options: UseMarginMonitorOptions = {}): MarginMonitorResult {
  const {
    enabled = true,
    pollingInterval = 5000, // 5 seconds
    enableNotifications = true,
    exchangeId = 'default',
    accountId = 'default',
  } = options

  const marginStatus = useSafetyStore(selectMarginStatus)
  const config = useSafetyStore(selectSafetyConfig)
  const { updateMarginStatus } = useSafetyStore()

  // Refs for managing async state
  const isMonitoringRef = useRef(false)
  const wsRef = useRef<WebSocket | null>(null)
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const prevAlertLevelRef = useRef<MarginAlertLevel>(marginStatus.alertLevel)

  // Connection state (using refs to avoid re-renders)
  const connectionStatusRef = useRef<'connected' | 'connecting' | 'disconnected' | 'error'>('disconnected')
  const errorRef = useRef<string | null>(null)

  // ==========================================================================
  // Notification Handler
  // ==========================================================================

  const handleAlertLevelChange = useCallback(
    (newLevel: MarginAlertLevel, prevLevel: MarginAlertLevel, marginRatio: number) => {
      if (!enableNotifications) return

      // Only notify on escalation (getting worse)
      const levelSeverity: Record<MarginAlertLevel, number> = {
        safe: 0,
        warning: 1,
        danger: 2,
        critical: 3,
      }

      const isEscalation = levelSeverity[newLevel] > levelSeverity[prevLevel]

      if (isEscalation) {
        switch (newLevel) {
          case 'warning':
            notify('warning', '保证金预警', {
              description: `保证金率已降至 ${marginRatio.toFixed(1)}%，请注意风险`,
              source: 'MarginMonitor',
            })
            break
          case 'danger':
            notify('error', '保证金危险', {
              description: `保证金率已降至 ${marginRatio.toFixed(1)}%，建议立即减仓`,
              source: 'MarginMonitor',
              action: {
                label: '查看详情',
                onClick: () => {
                  // Could navigate to margin details page
                },
              },
            })
            break
          case 'critical':
            notify('error', '强平风险警告！', {
              description: `保证金率仅剩 ${marginRatio.toFixed(1)}%，面临强制平仓风险！`,
              source: 'MarginMonitor',
              action: {
                label: '紧急处理',
                onClick: () => {
                  // Could open emergency actions modal
                },
              },
            })
            break
        }
      }
    },
    [enableNotifications]
  )

  // ==========================================================================
  // WebSocket Connection
  // ==========================================================================

  const connectWebSocket = useCallback(() => {
    // Skip if already connected or not enabled
    if (!enabled || wsRef.current?.readyState === WebSocket.OPEN) return

    connectionStatusRef.current = 'connecting'

    try {
      // TODO: Replace with actual WebSocket URL from config
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000'
      wsRef.current = new WebSocket(`${wsUrl}/margin/${exchangeId}/${accountId}`)

      wsRef.current.onopen = () => {
        connectionStatusRef.current = 'connected'
        errorRef.current = null
        console.log('[MarginMonitor] WebSocket connected')
      }

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as Partial<MarginStatus>

          // Update store
          updateMarginStatus(data)

          // Check for alert level change
          if (data.alertLevel && data.alertLevel !== prevAlertLevelRef.current) {
            handleAlertLevelChange(
              data.alertLevel,
              prevAlertLevelRef.current,
              data.marginRatio ?? marginStatus.marginRatio
            )
            prevAlertLevelRef.current = data.alertLevel
          } else if (data.marginRatio !== undefined) {
            // Recalculate alert level locally if not provided
            const thresholds = config.marginAlert.thresholds
            let newLevel: MarginAlertLevel = 'safe'
            if (data.marginRatio < thresholds.danger) newLevel = 'critical'
            else if (data.marginRatio < thresholds.warning) newLevel = 'danger'
            else if (data.marginRatio < thresholds.safe) newLevel = 'warning'

            if (newLevel !== prevAlertLevelRef.current) {
              handleAlertLevelChange(newLevel, prevAlertLevelRef.current, data.marginRatio)
              prevAlertLevelRef.current = newLevel
            }
          }
        } catch (err) {
          console.error('[MarginMonitor] Failed to parse message:', err)
        }
      }

      wsRef.current.onerror = (error) => {
        console.error('[MarginMonitor] WebSocket error:', error)
        connectionStatusRef.current = 'error'
        errorRef.current = 'WebSocket connection error'
      }

      wsRef.current.onclose = () => {
        connectionStatusRef.current = 'disconnected'
        console.log('[MarginMonitor] WebSocket disconnected')

        // Auto-reconnect after delay if still monitoring
        if (isMonitoringRef.current) {
          setTimeout(() => {
            if (isMonitoringRef.current) {
              connectWebSocket()
            }
          }, 3000)
        }
      }
    } catch (err) {
      console.error('[MarginMonitor] Failed to connect WebSocket:', err)
      connectionStatusRef.current = 'error'
      errorRef.current = 'Failed to establish WebSocket connection'

      // Fallback to polling
      startPolling()
    }
  }, [enabled, exchangeId, accountId, updateMarginStatus, handleAlertLevelChange, config.marginAlert.thresholds, marginStatus.marginRatio])

  // ==========================================================================
  // Polling Fallback
  // ==========================================================================

  const fetchMarginData = useCallback(async () => {
    try {
      // TODO: Replace with actual API call
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
      const response = await fetch(`${apiUrl}/api/margin/${exchangeId}/${accountId}`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = (await response.json()) as Partial<MarginStatus>
      updateMarginStatus(data)

      // Check for alert level change
      if (data.marginRatio !== undefined) {
        const thresholds = config.marginAlert.thresholds
        let newLevel: MarginAlertLevel = 'safe'
        if (data.marginRatio < thresholds.danger) newLevel = 'critical'
        else if (data.marginRatio < thresholds.warning) newLevel = 'danger'
        else if (data.marginRatio < thresholds.safe) newLevel = 'warning'

        if (newLevel !== prevAlertLevelRef.current) {
          handleAlertLevelChange(newLevel, prevAlertLevelRef.current, data.marginRatio)
          prevAlertLevelRef.current = newLevel
        }
      }
    } catch (err) {
      console.error('[MarginMonitor] Polling failed:', err)
      errorRef.current = 'Failed to fetch margin data'
    }
  }, [exchangeId, accountId, updateMarginStatus, config.marginAlert.thresholds, handleAlertLevelChange])

  const startPolling = useCallback(() => {
    if (pollingTimerRef.current) return

    pollingTimerRef.current = setInterval(() => {
      if (isMonitoringRef.current) {
        fetchMarginData()
      }
    }, pollingInterval)

    // Initial fetch
    fetchMarginData()
  }, [fetchMarginData, pollingInterval])

  const stopPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current)
      pollingTimerRef.current = null
    }
  }, [])

  // ==========================================================================
  // Control Functions
  // ==========================================================================

  const start = useCallback(() => {
    if (isMonitoringRef.current) return

    isMonitoringRef.current = true
    connectWebSocket()

    // Start polling as fallback if WS not available
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      startPolling()
    }
  }, [connectWebSocket, startPolling])

  const stop = useCallback(() => {
    isMonitoringRef.current = false

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    // Stop polling
    stopPolling()

    connectionStatusRef.current = 'disconnected'
  }, [stopPolling])

  const refresh = useCallback(async () => {
    await fetchMarginData()
  }, [fetchMarginData])

  // ==========================================================================
  // Lifecycle
  // ==========================================================================

  useEffect(() => {
    if (enabled) {
      start()
    } else {
      stop()
    }

    return () => {
      stop()
    }
  }, [enabled, start, stop])

  // Track alert level changes from store
  useEffect(() => {
    if (marginStatus.alertLevel !== prevAlertLevelRef.current) {
      handleAlertLevelChange(
        marginStatus.alertLevel,
        prevAlertLevelRef.current,
        marginStatus.marginRatio
      )
      prevAlertLevelRef.current = marginStatus.alertLevel
    }
  }, [marginStatus.alertLevel, marginStatus.marginRatio, handleAlertLevelChange])

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    status: marginStatus,
    alertLevel: marginStatus.alertLevel,
    isMonitoring: isMonitoringRef.current,
    connectionStatus: connectionStatusRef.current,
    error: errorRef.current,
    refresh,
    start,
    stop,
  }
}

// =============================================================================
// Simulation Hook (for development/testing)
// =============================================================================

/**
 * useMarginSimulator - Simulates margin changes for testing
 */
export function useMarginSimulator(enabled = false) {
  const { updateMarginStatus } = useSafetyStore()

  useEffect(() => {
    if (!enabled) return

    // Simulate initial state
    updateMarginStatus({
      marginRatio: 75,
      usedMargin: 5000,
      availableMargin: 15000,
      totalEquity: 20000,
    })

    // Gradually decrease margin ratio for testing alerts
    const interval = setInterval(() => {
      updateMarginStatus({
        marginRatio: Math.max(5, Math.random() * 100),
        lastUpdated: Date.now(),
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [enabled, updateMarginStatus])
}

// =============================================================================
// Exports
// =============================================================================

export default useMarginMonitor
