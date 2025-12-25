/**
 * Zustand 状态管理
 * 全局应用状态
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

// 用户状态
interface User {
  id: string
  email: string
  name: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (user: User, token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        token: null,
        isAuthenticated: false,
        login: (user, token) =>
          set({ user, token, isAuthenticated: true }, false, 'auth/login'),
        logout: () =>
          set(
            { user: null, token: null, isAuthenticated: false },
            false,
            'auth/logout'
          ),
      }),
      {
        name: 'auth-storage',
      }
    )
  )
)

// 市场数据状态
export interface MarketData {
  symbol: string
  price: number
  change24h: number
  volume24h: number
  timestamp: number
}

interface MarketState {
  markets: Map<string, MarketData>
  activeSymbol: string
  setActiveSymbol: (symbol: string) => void
  updateMarket: (symbol: string, data: MarketData) => void
  getMarket: (symbol: string) => MarketData | undefined
}

export const useMarketStore = create<MarketState>()(
  devtools((set, get) => ({
    markets: new Map(),
    activeSymbol: 'BTC/USDT',
    setActiveSymbol: (symbol) =>
      set({ activeSymbol: symbol }, false, 'market/setActiveSymbol'),
    updateMarket: (symbol, data) =>
      set(
        (state) => {
          const newMarkets = new Map(state.markets)
          newMarkets.set(symbol, data)
          return { markets: newMarkets }
        },
        false,
        'market/updateMarket'
      ),
    getMarket: (symbol) => get().markets.get(symbol),
  }))
)

// 策略状态
export interface Strategy {
  id: string
  name: string
  status: 'running' | 'paused' | 'stopped'
  performance: {
    pnl: number
    trades: number
    winRate: number
  }
}

interface StrategyState {
  strategies: Strategy[]
  activeStrategyId: string | null
  setStrategies: (strategies: Strategy[]) => void
  addStrategy: (strategy: Strategy) => void
  updateStrategy: (id: string, updates: Partial<Strategy>) => void
  removeStrategy: (id: string) => void
  setActiveStrategy: (id: string | null) => void
}

export const useStrategyStore = create<StrategyState>()(
  devtools((set) => ({
    strategies: [],
    activeStrategyId: null,
    setStrategies: (strategies) =>
      set({ strategies }, false, 'strategy/setStrategies'),
    addStrategy: (strategy) =>
      set(
        (state) => ({ strategies: [...state.strategies, strategy] }),
        false,
        'strategy/addStrategy'
      ),
    updateStrategy: (id, updates) =>
      set(
        (state) => ({
          strategies: state.strategies.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        }),
        false,
        'strategy/updateStrategy'
      ),
    removeStrategy: (id) =>
      set(
        (state) => ({
          strategies: state.strategies.filter((s) => s.id !== id),
          activeStrategyId:
            state.activeStrategyId === id ? null : state.activeStrategyId,
        }),
        false,
        'strategy/removeStrategy'
      ),
    setActiveStrategy: (id) =>
      set({ activeStrategyId: id }, false, 'strategy/setActiveStrategy'),
  }))
)

// 订单状态
interface Order {
  id: string
  symbol: string
  side: 'buy' | 'sell'
  type: 'market' | 'limit'
  status: 'pending' | 'completed' | 'cancelled' | 'failed'
  price: number
  amount: number
  filled: number
  timestamp: number
}

interface OrderState {
  orders: Order[]
  addOrder: (order: Order) => void
  updateOrder: (id: string, updates: Partial<Order>) => void
  removeOrder: (id: string) => void
  clearOrders: () => void
}

export const useOrderStore = create<OrderState>()(
  devtools((set) => ({
    orders: [],
    addOrder: (order) =>
      set(
        (state) => ({ orders: [...state.orders, order] }),
        false,
        'order/addOrder'
      ),
    updateOrder: (id, updates) =>
      set(
        (state) => ({
          orders: state.orders.map((o) => (o.id === id ? { ...o, ...updates } : o)),
        }),
        false,
        'order/updateOrder'
      ),
    removeOrder: (id) =>
      set(
        (state) => ({ orders: state.orders.filter((o) => o.id !== id) }),
        false,
        'order/removeOrder'
      ),
    clearOrders: () => set({ orders: [] }, false, 'order/clearOrders'),
  }))
)

// UI 状态
interface UIState {
  sidebarOpen: boolean
  theme: 'light' | 'dark'
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setTheme: (theme: 'light' | 'dark') => void
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set) => ({
        sidebarOpen: true,
        theme: 'dark',
        toggleSidebar: () =>
          set(
            (state) => ({ sidebarOpen: !state.sidebarOpen }),
            false,
            'ui/toggleSidebar'
          ),
        setSidebarOpen: (open) =>
          set({ sidebarOpen: open }, false, 'ui/setSidebarOpen'),
        setTheme: (theme) => set({ theme }, false, 'ui/setTheme'),
      }),
      {
        name: 'ui-storage',
      }
    )
  )
)
