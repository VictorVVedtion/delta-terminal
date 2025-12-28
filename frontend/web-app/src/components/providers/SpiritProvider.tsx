'use client'

import { useEffect, useRef } from 'react'
import { spiritClient, SpiritEvent as RealtimeEvent } from '@/lib/spiritRealtime'
import { useSpiritStore, convertRealtimeEvent } from '@/store/spiritStore'

/**
 * Spirit Provider
 * 负责初始化 Supabase Realtime 订阅并同步到 Zustand Store
 */
export function SpiritProvider({ children }: { children: React.ReactNode }) {
  const { setEvent, checkHeartbeat, setConnected } = useSpiritStore()
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // 1. 订阅 Spirit 事件
    const unsubscribe = spiritClient.subscribe((rawEvent: RealtimeEvent) => {
      const event = convertRealtimeEvent(rawEvent)
      setEvent(event)
    })

    // 2. 启动心跳检测
    heartbeatIntervalRef.current = setInterval(checkHeartbeat, 1000)

    // 3. 监听连接状态变化
    const checkConnection = setInterval(() => {
      setConnected(spiritClient.isConnected())
    }, 2000)

    return () => {
      unsubscribe()
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
      }
      clearInterval(checkConnection)
    }
  }, [setEvent, checkHeartbeat, setConnected])

  return <>{children}</>
}

