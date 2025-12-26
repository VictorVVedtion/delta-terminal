/**
 * Exchange Store - 交易所账户状态管理
 * EPIC-006: 交易所账户连接
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

// =============================================================================
// Types
// =============================================================================

// CEX (中心化交易所)
// Perp-DEX (去中心化永续合约交易所)
export type ExchangeType =
  | 'binance'
  | 'okx'
  | 'bybit'
  | 'bitget'
  | 'hyperliquid'
  | 'lighter'
  | 'aster'

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error'

export type Permission = 'read' | 'trade' | 'withdraw'

export interface ExchangeBalance {
  total: number
  available: number
  frozen: number
  currency: string
}

export interface ExchangeAccount {
  id: string
  exchange: ExchangeType
  name: string // 账户别名
  apiKey: string // 显示用掩码版本
  apiKeyFull: string // 完整 API Key (实际应用中应加密)
  apiSecret: string // 完整 API Secret (实际应用中应加密)
  passphrase?: string // OKX 需要
  permissions: Permission[]
  status: ConnectionStatus
  errorMessage?: string
  balance?: ExchangeBalance
  lastSync?: number
  createdAt: number
  updatedAt: number
}

export interface ExchangeInfo {
  id: ExchangeType
  name: string
  logo: string
  color: string
  requiresPassphrase: boolean
  docUrl: string
  supported: boolean
}

// =============================================================================
// Constants
// =============================================================================

// CEX (中心化交易所)
export const CEX_EXCHANGES: ExchangeInfo[] = [
  {
    id: 'binance',
    name: 'Binance',
    logo: '/exchanges/binance.svg',
    color: '#F0B90B',
    requiresPassphrase: false,
    docUrl: 'https://www.binance.com/en/support/faq/how-to-create-api-keys-on-binance-360002502072',
    supported: true,
  },
  {
    id: 'okx',
    name: 'OKX',
    logo: '/exchanges/okx.svg',
    color: '#FFFFFF',
    requiresPassphrase: true,
    docUrl: 'https://www.okx.com/help-center/how-to-create-api-keys',
    supported: true,
  },
  {
    id: 'bybit',
    name: 'Bybit',
    logo: '/exchanges/bybit.svg',
    color: '#F7A600',
    requiresPassphrase: false,
    docUrl: 'https://www.bybit.com/en-US/help-center/article/How-to-create-your-API-key',
    supported: true,
  },
  {
    id: 'bitget',
    name: 'Bitget',
    logo: '/exchanges/bitget.svg',
    color: '#00F0FF',
    requiresPassphrase: true, // Bitget 需要 passphrase
    docUrl: 'https://www.bitget.com/academy/how-to-create-api-key',
    supported: true,
  },
]

// Perp-DEX (去中心化永续合约交易所)
export const PERP_DEX_EXCHANGES: ExchangeInfo[] = [
  {
    id: 'hyperliquid',
    name: 'Hyperliquid',
    logo: '/exchanges/hyperliquid.svg',
    color: '#84FF84',
    requiresPassphrase: true, // Wallet Private Key / API Secret
    docUrl: 'https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/authentication',
    supported: true,
  },
  {
    id: 'lighter',
    name: 'Lighter',
    logo: '/exchanges/lighter.svg',
    color: '#FF6B35',
    requiresPassphrase: true, // Wallet Private Key
    docUrl: 'https://docs.lighter.xyz/developers/api-authentication',
    supported: true,
  },
  {
    id: 'aster',
    name: 'Aster DEX',
    logo: '/exchanges/aster.svg',
    color: '#9945FF',
    requiresPassphrase: true, // Wallet Private Key
    docUrl: 'https://docs.aster.trade/api',
    supported: true,
  },
]

// 所有交易所
export const SUPPORTED_EXCHANGES: ExchangeInfo[] = [
  ...CEX_EXCHANGES,
  ...PERP_DEX_EXCHANGES,
]

// =============================================================================
// Store
// =============================================================================

interface ExchangeState {
  accounts: ExchangeAccount[]
  activeAccountId: string | null
  isLoading: boolean

  // Actions
  addAccount: (
    account: Omit<ExchangeAccount, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'apiKey'>
  ) => string
  updateAccount: (id: string, updates: Partial<ExchangeAccount>) => void
  removeAccount: (id: string) => void
  setActiveAccount: (id: string | null) => void
  setConnectionStatus: (id: string, status: ConnectionStatus, errorMessage?: string) => void
  updateBalance: (id: string, balance: ExchangeBalance) => void
  testConnection: (id: string) => Promise<boolean>
  syncBalance: (id: string) => Promise<void>
  syncAllBalances: () => Promise<void>

  // Selectors
  getAccountById: (id: string) => ExchangeAccount | undefined
  getAccountsByExchange: (exchange: ExchangeType) => ExchangeAccount[]
  getConnectedAccounts: () => ExchangeAccount[]
  getTotalBalance: () => number
}

// 生成掩码 API Key
function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) return '****'
  return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`
}

// 生成唯一 ID
function generateId(): string {
  return `exc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export const useExchangeStore = create<ExchangeState>()(
  devtools(
    persist(
      (set, get) => ({
        accounts: [],
        activeAccountId: null,
        isLoading: false,

        // 添加账户
        addAccount: (accountData) => {
          const id = generateId()
          const now = Date.now()

          const newAccount: ExchangeAccount = {
            ...accountData,
            id,
            apiKey: maskApiKey(accountData.apiKeyFull),
            status: 'disconnected',
            createdAt: now,
            updatedAt: now,
          }

          set(
            (state) => ({
              accounts: [...state.accounts, newAccount],
              activeAccountId: state.activeAccountId ?? id,
            }),
            false,
            'exchange/addAccount'
          )

          return id
        },

        // 更新账户
        updateAccount: (id, updates) => {
          set(
            (state) => ({
              accounts: state.accounts.map((account) =>
                account.id === id
                  ? {
                      ...account,
                      ...updates,
                      apiKey: updates.apiKeyFull
                        ? maskApiKey(updates.apiKeyFull)
                        : account.apiKey,
                      updatedAt: Date.now(),
                    }
                  : account
              ),
            }),
            false,
            'exchange/updateAccount'
          )
        },

        // 删除账户
        removeAccount: (id) => {
          set(
            (state) => ({
              accounts: state.accounts.filter((account) => account.id !== id),
              activeAccountId:
                state.activeAccountId === id
                  ? state.accounts.find((a) => a.id !== id)?.id ?? null
                  : state.activeAccountId,
            }),
            false,
            'exchange/removeAccount'
          )
        },

        // 设置活跃账户
        setActiveAccount: (id) => {
          set({ activeAccountId: id }, false, 'exchange/setActiveAccount')
        },

        // 设置连接状态
        setConnectionStatus: (id, status, errorMessage) => {
          set(
            (state) => ({
              accounts: state.accounts.map((account) =>
                account.id === id
                  ? {
                      ...account,
                      status,
                      ...(status === 'error' && errorMessage ? { errorMessage } : {}),
                      updatedAt: Date.now(),
                    }
                  : account
              ),
            }),
            false,
            'exchange/setConnectionStatus'
          )
        },

        // 更新余额
        updateBalance: (id, balance) => {
          set(
            (state) => ({
              accounts: state.accounts.map((account) =>
                account.id === id
                  ? {
                      ...account,
                      balance,
                      lastSync: Date.now(),
                      updatedAt: Date.now(),
                    }
                  : account
              ),
            }),
            false,
            'exchange/updateBalance'
          )
        },

        // 测试连接 (模拟)
        testConnection: async (id) => {
          const { setConnectionStatus, updateBalance } = get()
          const account = get().accounts.find((a) => a.id === id)

          if (!account) return false

          setConnectionStatus(id, 'connecting')

          // 模拟 API 调用延迟
          await new Promise((resolve) => setTimeout(resolve, 1500))

          // 模拟成功/失败 (90% 成功率)
          const success = Math.random() > 0.1

          if (success) {
            setConnectionStatus(id, 'connected')

            // 模拟获取余额
            const mockBalance: ExchangeBalance = {
              total: Math.random() * 50000 + 5000,
              available: Math.random() * 40000 + 4000,
              frozen: Math.random() * 1000,
              currency: 'USDT',
            }
            updateBalance(id, mockBalance)

            return true
          } else {
            setConnectionStatus(id, 'error', 'API Key 无效或已过期')
            return false
          }
        },

        // 同步余额 (模拟)
        syncBalance: async (id) => {
          const { updateBalance } = get()
          const account = get().accounts.find((a) => a.id === id)

          if (!account || account.status !== 'connected') return

          // 模拟 API 调用
          await new Promise((resolve) => setTimeout(resolve, 800))

          const mockBalance: ExchangeBalance = {
            total: (account.balance?.total ?? 10000) * (0.98 + Math.random() * 0.04),
            available: (account.balance?.available ?? 8000) * (0.98 + Math.random() * 0.04),
            frozen: account.balance?.frozen ?? 0,
            currency: 'USDT',
          }

          updateBalance(id, mockBalance)
        },

        // 同步所有余额
        syncAllBalances: async () => {
          const { accounts, syncBalance } = get()
          const connectedAccounts = accounts.filter((a) => a.status === 'connected')

          await Promise.all(connectedAccounts.map((account) => syncBalance(account.id)))
        },

        // 按 ID 获取账户
        getAccountById: (id) => {
          return get().accounts.find((account) => account.id === id)
        },

        // 按交易所获取账户
        getAccountsByExchange: (exchange) => {
          return get().accounts.filter((account) => account.exchange === exchange)
        },

        // 获取已连接账户
        getConnectedAccounts: () => {
          return get().accounts.filter((account) => account.status === 'connected')
        },

        // 获取总余额
        getTotalBalance: () => {
          return get()
            .accounts.filter((a) => a.status === 'connected' && a.balance)
            .reduce((sum, account) => sum + (account.balance?.total ?? 0), 0)
        },
      }),
      {
        name: 'delta-exchange-storage',
        partialize: (state) => ({
          accounts: state.accounts.map((account) => ({
            ...account,
            // 清除敏感信息的实时状态
            status: 'disconnected' as ConnectionStatus,
            balance: undefined,
            lastSync: undefined,
          })),
          activeAccountId: state.activeAccountId,
        }),
      }
    ),
    { name: 'ExchangeStore' }
  )
)

// =============================================================================
// Selectors
// =============================================================================

export const selectAccounts = (state: ExchangeState) => state.accounts
export const selectActiveAccountId = (state: ExchangeState) => state.activeAccountId
export const selectActiveAccount = (state: ExchangeState) =>
  state.accounts.find((a) => a.id === state.activeAccountId)
export const selectConnectedAccounts = (state: ExchangeState) =>
  state.accounts.filter((a) => a.status === 'connected')
export const selectTotalBalance = (state: ExchangeState) =>
  state.accounts
    .filter((a) => a.status === 'connected' && a.balance)
    .reduce((sum, a) => sum + (a.balance?.total ?? 0), 0)
