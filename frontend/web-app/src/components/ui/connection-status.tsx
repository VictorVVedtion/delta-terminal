'use client'

import { Loader2,Wifi, WifiOff } from 'lucide-react'
import React from 'react'

import { useConnectionStatus } from '@/components/providers/WebSocketProvider'
import { cn } from '@/lib/utils'

// =============================================================================
// ConnectionStatus Component
// =============================================================================

interface ConnectionStatusProps {
  variant?: 'icon' | 'badge' | 'full' | undefined
  className?: string | undefined
  showReconnect?: boolean | undefined
}

/**
 * Connection status indicator
 * Shows WebSocket connection state
 */
export function ConnectionStatus({
  variant = 'icon',
  className,
  showReconnect = false,
}: ConnectionStatusProps) {
  const { isConnected, isConnecting, error, reconnect } = useConnectionStatus()

  const statusConfig = {
    connected: {
      label: '已连接',
      color: 'text-green-500',
      bgColor: 'bg-green-500',
      icon: Wifi,
    },
    connecting: {
      label: '连接中...',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500',
      icon: Loader2,
    },
    disconnected: {
      label: '已断开',
      color: 'text-red-500',
      bgColor: 'bg-red-500',
      icon: WifiOff,
    },
  }

  const status = isConnecting ? 'connecting' : isConnected ? 'connected' : 'disconnected'
  const config = statusConfig[status]
  const Icon = config.icon

  if (variant === 'icon') {
    return (
      <div
        className={cn('relative flex items-center', className)}
        title={config.label}
      >
        <Icon
          className={cn(
            'h-4 w-4',
            config.color,
            isConnecting && 'animate-spin'
          )}
        />
        {/* Pulse indicator for connected state */}
        {isConnected && (
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        )}
      </div>
    )
  }

  if (variant === 'badge') {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
          isConnected
            ? 'bg-green-500/10 text-green-500'
            : isConnecting
            ? 'bg-yellow-500/10 text-yellow-500'
            : 'bg-red-500/10 text-red-500',
          className
        )}
      >
        <span
          className={cn('h-1.5 w-1.5 rounded-full', config.bgColor, isConnected && 'animate-pulse')}
        />
        {config.label}
      </div>
    )
  }

  // Full variant with reconnect button
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex items-center gap-2">
        <Icon
          className={cn('h-4 w-4', config.color, isConnecting && 'animate-spin')}
        />
        <span className={cn('text-sm', config.color)}>{config.label}</span>
      </div>

      {showReconnect && !isConnected && !isConnecting && (
        <button
          onClick={reconnect}
          className="text-xs text-primary hover:underline"
        >
          重新连接
        </button>
      )}

      {error && (
        <span className="text-xs text-muted-foreground">({error})</span>
      )}
    </div>
  )
}

// =============================================================================
// ConnectionIndicator - Minimal dot indicator
// =============================================================================

interface ConnectionIndicatorProps {
  className?: string | undefined
}

export function ConnectionIndicator({ className }: ConnectionIndicatorProps) {
  const { isConnected, isConnecting } = useConnectionStatus()

  return (
    <span
      className={cn(
        'h-2 w-2 rounded-full',
        isConnected
          ? 'bg-green-500 animate-pulse'
          : isConnecting
          ? 'bg-yellow-500 animate-pulse'
          : 'bg-red-500',
        className
      )}
      title={isConnected ? '已连接' : isConnecting ? '连接中' : '已断开'}
    />
  )
}
