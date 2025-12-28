import { getDeviceId,supabaseClient } from '@/lib/supabase'
import type { PaperAccount, PaperPosition, PaperTrade } from '@/types/paperTrading'

const TABLE_NAME = 'paper_accounts'

interface SupabasePaperAccountRow {
  id: string
  device_id: string
  agent_id: string
  initial_capital: number | string
  current_balance: number | string
  created_at: string
  updated_at: string
  positions: PaperPosition[]
  trades: PaperTrade[]
}

interface SyncResult {
  success: boolean
  error?: string
}

function buildPayload(account: PaperAccount, deviceId: string) {
  return {
    id: account.id,
    device_id: deviceId,
    agent_id: account.agentId,
    initial_capital: account.initialCapital,
    current_balance: account.currentBalance,
    created_at: new Date(account.createdAt).toISOString(),
    updated_at: new Date(account.updatedAt).toISOString(),
    positions: account.positions,
    trades: account.trades,
  }
}

function normalizeRow(row: SupabasePaperAccountRow): PaperAccount {
  const createdAt = new Date(row.created_at).getTime()
  const updatedAt = new Date(row.updated_at).getTime()

  return {
    id: row.id,
    agentId: row.agent_id,
    initialCapital: Number(row.initial_capital) || 0,
    currentBalance: Number(row.current_balance) || 0,
    positions: Array.isArray(row.positions) ? row.positions : [],
    trades: Array.isArray(row.trades) ? row.trades : [],
    createdAt,
    updatedAt,
  }
}

export async function persistAccountsToSupabase(accounts: PaperAccount[]): Promise<SyncResult> {
  const deviceId = getDeviceId()
  if (!deviceId) {
    return { success: false, error: '设备 ID 未就绪，无法同步' }
  }

  const payload = accounts.map((account) => buildPayload(account, deviceId))

  const { error } = await supabaseClient
    .from(TABLE_NAME)
    .upsert(payload, { onConflict: 'id' })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function fetchRemoteAccountsFromSupabase(): Promise<PaperAccount[]> {
  const deviceId = getDeviceId()
  if (!deviceId) {
    return []
  }

  const { data, error } = await supabaseClient
    .from(TABLE_NAME)
    .select('*')
    .eq('device_id', deviceId)

  if (error) {
    console.error('同步 Paper Trading 数据失败:', error)
    return []
  }

  return (data as SupabasePaperAccountRow[] ?? []).map((row) => normalizeRow(row))
}

