import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase configuration. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
  )
}

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)

const DEVICE_ID_STORAGE_KEY = 'delta-paper-trading-device-id'

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

