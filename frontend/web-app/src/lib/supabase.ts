import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js'

const DEVICE_ID_STORAGE_KEY = 'delta-paper-trading-device-id'

// 延迟初始化 Supabase 客户端，避免构建时报错
let _supabaseClient: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient | null {
  if (_supabaseClient) {
    return _supabaseClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // 构建时或未配置时返回 null，不抛出错误
    console.warn('[Supabase] 未配置环境变量，跳过初始化')
    return null
  }

  _supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
  return _supabaseClient
}

// 向后兼容：导出一个 getter
export const supabaseClient = {
  get instance() {
    return getSupabaseClient()
  },
}

export function getDeviceId(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  const deviceId = localStorage.getItem(DEVICE_ID_STORAGE_KEY)
  if (deviceId) {
    return deviceId
  }

  const randomId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `device-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`

  localStorage.setItem(DEVICE_ID_STORAGE_KEY, randomId)
  return randomId
}
