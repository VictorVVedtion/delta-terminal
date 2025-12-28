import { create } from 'zustand'

import type { SpiritEvent as RealtimeSpiritEvent } from '../lib/spiritRealtime'
import type { SpiritState } from '../types/spirit'

// 统一的 Spirit Event 类型 (兼容 Supabase 格式)
export interface SpiritEvent {
  id: string
  timestamp: number
  type: string
  priority: 'p0' | 'p1' | 'p2' | 'p3' | 'p4'
  title: string
  content: string
  spiritState: SpiritState
  metadata?: Record<string, any>
}

interface SpiritStore {
  currentState: SpiritState
  lastEvent: SpiritEvent | null
  history: SpiritEvent[]
  lastHeartbeat: number
  isConnected: boolean

  setEvent: (event: SpiritEvent) => void
  setDormant: () => void
  checkHeartbeat: () => void
  setConnected: (connected: boolean) => void
}

// 将 Supabase 事件格式转换为内部格式
export function convertRealtimeEvent(raw: RealtimeSpiritEvent): SpiritEvent {
  return {
    id: raw.id,
    timestamp: new Date(raw.created_at).getTime(),
    type: raw.type,
    priority: raw.priority,
    title: raw.title,
    content: raw.content,
    spiritState: raw.spirit_state as SpiritState,
    metadata: raw.metadata,
  }
}

export const useSpiritStore = create<SpiritStore>((set, get) => ({
  currentState: 'dormant',
  lastEvent: null,
  history: [],
  lastHeartbeat: 0,
  isConnected: false,

  setEvent: (event: SpiritEvent) =>
    set((state) => {
      // 如果事件包含状态，则更新当前状态
      const newState = event.spiritState || state.currentState

      // 添加到历史记录 (保留最近 50 条)
      const newHistory = [event, ...state.history].slice(0, 50)

      return {
        currentState: newState,
        lastEvent: event,
        history: newHistory,
        lastHeartbeat: Date.now(),
      }
    }),

  setDormant: () => set({ currentState: 'dormant' }),

  setConnected: (connected: boolean) => set({ isConnected: connected }),

  checkHeartbeat: () => {
    const { lastHeartbeat, currentState } = get()
    // 如果超过 15 秒没有心跳，且当前不是休眠或错误状态，则设为休眠
    if (
      Date.now() - lastHeartbeat > 15000 &&
      currentState !== 'dormant' &&
      currentState !== 'error'
    ) {
      set({ currentState: 'dormant' })
    }
  },
}))
