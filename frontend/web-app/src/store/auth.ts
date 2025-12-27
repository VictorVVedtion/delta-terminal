/**
 * 认证状态管理 (Zustand) - 混合认证版本 (支持钱包 + 邮箱)
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

// 用户角色
export type UserRole = 'user' | 'admin' | 'moderator'

// 用户类型
export interface User {
  id: string
  email?: string
  displayName?: string
  walletAddress?: string
  role: UserRole
  avatarUrl?: string
}

// Token 类型
export interface Tokens {
  accessToken: string
  refreshToken: string
}

// 认证状态
interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean

  // Actions
  login: (user: User, accessToken: string, refreshToken: string) => void
  logout: () => void
  setUser: (user: User) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,

        login: (user, accessToken, refreshToken) =>
          set(
            {
              user,
              accessToken,
              refreshToken,
              isAuthenticated: true,
              isLoading: false,
            },
            false,
            'auth/login'
          ),

        logout: () =>
          set(
            {
              user: null,
              accessToken: null,
              refreshToken: null,
              isAuthenticated: false,
              isLoading: false,
            },
            false,
            'auth/logout'
          ),

        setUser: (user) =>
          set({ user }, false, 'auth/setUser'),

        setTokens: (accessToken, refreshToken) =>
          set(
            { accessToken, refreshToken },
            false,
            'auth/setTokens'
          ),

        setLoading: (isLoading) =>
          set({ isLoading }, false, 'auth/setLoading'),
      }),
      {
        name: 'delta-auth-storage',
        partialize: (state) => ({
          user: state.user,
          accessToken: state.accessToken,
          refreshToken: state.refreshToken,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    { name: 'AuthStore' }
  )
)

// 便捷选择器
export const selectUser = (state: AuthState) => state.user
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated
export const selectAccessToken = (state: AuthState) => state.accessToken
export const selectWalletAddress = (state: AuthState) => state.user?.walletAddress
