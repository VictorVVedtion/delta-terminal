/**
 * OfflineBanner - 离线提示横幅
 *
 * 功能:
 * - 显示网络离线状态
 * - 展示离线持续时间
 * - 队列请求计数
 * - 自动恢复提示
 *
 * @module S45 网络断线处理
 */

'use client'

import { AlertTriangle,Clock, RefreshCw, WifiOff } from 'lucide-react'
import React from 'react'

import { useOfflineQueue } from '@/hooks/useOfflineQueue'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { cn } from '@/lib/utils'

interface OfflineBannerProps {
  className?: string
  /** 是否显示队列信息 */
  showQueueInfo?: boolean
  /** 自定义离线消息 */
  offlineMessage?: string
}

export function OfflineBanner({
  className,
  showQueueInfo = true,
  offlineMessage = '网络连接已断开',
}: OfflineBannerProps) {
  const { isOnline, isConnected, offlineDuration, reconnectAttempts } = useOnlineStatus()
  const { queueLength, isProcessing } = useOfflineQueue()

  // 在线时不显示
  if (isOnline && isConnected) {
    return null
  }

  // 格式化离线时间
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}小时${minutes % 60}分钟`
    }
    if (minutes > 0) {
      return `${minutes}分钟${seconds % 60}秒`
    }
    return `${seconds}秒`
  }

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-50',
        'bg-gradient-to-r from-red-600 to-orange-500',
        'text-white px-4 py-2',
        'shadow-lg',
        'animate-slide-down',
        className
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* 左侧: 状态图标和消息 */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 bg-white/20 rounded-full">
            <WifiOff className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{offlineMessage}</span>
              {reconnectAttempts > 0 && (
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                  重连尝试: {reconnectAttempts}
                </span>
              )}
            </div>
            {offlineDuration > 0 && (
              <div className="flex items-center gap-1 text-sm text-white/80">
                <Clock className="w-3 h-3" />
                <span>已离线 {formatDuration(offlineDuration)}</span>
              </div>
            )}
          </div>
        </div>

        {/* 右侧: 队列信息和操作 */}
        <div className="flex items-center gap-4">
          {showQueueInfo && queueLength > 0 && (
            <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>{queueLength} 个待处理请求</span>
              {isProcessing && (
                <RefreshCw className="w-3 h-3 animate-spin" />
              )}
            </div>
          )}

          <div className="text-sm text-white/80">
            恢复连接后将自动同步
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * OfflineIndicator - 最小化离线指示器
 */
export function OfflineIndicator({ className }: { className?: string }) {
  const { isOnline, isConnected } = useOnlineStatus()

  if (isOnline && isConnected) {
    return null
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full',
        'bg-red-500/10 text-red-500 text-xs font-medium',
        className
      )}
    >
      <WifiOff className="w-3 h-3" />
      <span>离线</span>
    </div>
  )
}

/**
 * OfflineOverlay - 全屏离线遮罩 (用于关键操作页面)
 */
export function OfflineOverlay({
  children,
  className,
  blockInteraction = true,
}: {
  children?: React.ReactNode
  className?: string
  blockInteraction?: boolean
}) {
  const { isOnline, isConnected } = useOnlineStatus()

  if (isOnline && isConnected) {
    return null
  }

  return (
    <div
      className={cn(
        'fixed inset-0 z-50',
        'bg-background/80 backdrop-blur-sm',
        'flex flex-col items-center justify-center',
        blockInteraction && 'pointer-events-auto',
        className
      )}
    >
      <div className="flex flex-col items-center gap-4 text-center p-8">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
          <WifiOff className="w-8 h-8 text-red-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-1">网络连接已断开</h3>
          <p className="text-muted-foreground text-sm">
            请检查您的网络连接后重试
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}

export default OfflineBanner
