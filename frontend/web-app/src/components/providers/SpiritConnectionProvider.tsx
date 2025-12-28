'use client'

import { ReactNode } from 'react'
import { useSpiritConnection } from '@/hooks/useSpiritConnection'

/**
 * Spirit WebSocket 连接 Provider
 * 在应用启动时自动连接到 Spirit 后端
 */
export function SpiritConnectionProvider({ children }: { children: ReactNode }) {
  // 启动 Spirit WebSocket 连接
  const { isConnected } = useSpiritConnection()

  // 可选：在开发环境显示连接状态日志
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    // 仅在客户端
    (window as any).__SPIRIT_CONNECTED__ = isConnected
  }

  return <>{children}</>
}
