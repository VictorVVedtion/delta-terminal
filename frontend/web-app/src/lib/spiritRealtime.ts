/**
 * Spirit Realtime Client
 * 使用 Supabase Realtime 替代自定义 WebSocket
 */

import { getSupabaseClient } from './supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface SpiritEvent {
  id: string
  created_at: string
  type: string
  priority: 'p0' | 'p1' | 'p2' | 'p3' | 'p4'
  spirit_state: 'dormant' | 'monitoring' | 'analyzing' | 'executing' | 'alerting' | 'error'
  title: string
  content: string
  metadata?: Record<string, any>
}

type SpiritEventCallback = (event: SpiritEvent) => void

class SpiritRealtimeClient {
  private channel: RealtimeChannel | null = null
  private callbacks: Set<SpiritEventCallback> = new Set()
  private isSubscribed = false

  /**
   * 订阅 Spirit 事件流
   */
  subscribe(callback: SpiritEventCallback) {
    this.callbacks.add(callback)

    // 如果尚未订阅，则建立连接
    if (!this.isSubscribed) {
      this.connect()
    }

    // 返回取消订阅函数
    return () => {
      this.callbacks.delete(callback)
      if (this.callbacks.size === 0) {
        this.disconnect()
      }
    }
  }

  private connect() {
    const supabase = getSupabaseClient()
    if (!supabase) {
      console.warn('[Spirit] Supabase 未配置，跳过 Realtime 订阅')
      return
    }

    this.channel = supabase
      .channel('spirit_events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'spirit_events'
        },
        (payload) => {
          const event = payload.new as SpiritEvent
          this.notifyCallbacks(event)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Spirit] Realtime 已连接')
          this.isSubscribed = true
        }
      })
  }

  private disconnect() {
    if (this.channel) {
      this.channel.unsubscribe()
      this.channel = null
      this.isSubscribed = false
      console.log('[Spirit] Realtime 已断开')
    }
  }

  private notifyCallbacks(event: SpiritEvent) {
    this.callbacks.forEach(cb => {
      try {
        cb(event)
      } catch (err) {
        console.error('[Spirit] Callback error:', err)
      }
    })
  }

  /**
   * 检查连接状态
   */
  isConnected() {
    return this.isSubscribed
  }
}

// 导出单例
export const spiritClient = new SpiritRealtimeClient()

