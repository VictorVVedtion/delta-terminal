'use client'

import { useEffect, useState } from 'react'
import { spiritClient, SpiritEvent as RealtimeEvent } from '@/lib/spiritRealtime'
import { useSpiritStore, convertRealtimeEvent } from '@/store/spiritStore'

/**
 * Spirit Realtime 连接 Hook
 * 自动连接到 Supabase Realtime 并更新 store
 */
export function useSpiritConnection() {
  const [isConnected, setIsConnected] = useState(false)
  const setEvent = useSpiritStore((s) => s.setEvent)
  const setDormant = useSpiritStore((s) => s.setDormant)

  useEffect(() => {
    // 1. 订阅 Spirit 事件 (Supabase Realtime)
    const unsubscribe = spiritClient.subscribe((rawEvent: RealtimeEvent) => {
      const event = convertRealtimeEvent(rawEvent)
      setEvent(event)
    })

    // 2. 定期检查连接状态
    const statusCheck = setInterval(() => {
      const connected = spiritClient.isConnected()
      setIsConnected(connected)
      if (!connected) {
        setDormant()
      }
    }, 2000)

    // 3. 定期检查心跳超时
    const heartbeatCheck = setInterval(() => {
      useSpiritStore.getState().checkHeartbeat()
    }, 5000)

    return () => {
      unsubscribe()
      clearInterval(statusCheck)
      clearInterval(heartbeatCheck)
    }
  }, [setEvent, setDormant])

  return { isConnected }
}
