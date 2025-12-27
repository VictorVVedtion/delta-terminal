'use client'

/**
 * 认证提供者 - 简化版本
 *
 * 设计原则：
 * - Paper Trading 模式不需要钱包连接
 * - Live Trading 模式将来需要钱包连接（暂未实现）
 * - 所有页面都可以自由访问
 */

import { createContext, useContext, useEffect, useState } from 'react'

import { apiClient } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

interface AuthContextValue {
  /** 是否已连接钱包 (仅用于 Live Trading) */
  isConnected: boolean
  /** 检查是否需要连接钱包 */
  requireAuth: (action?: string) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Zustand store
  const { isAuthenticated, accessToken, refreshToken } = useAuthStore()

  // 确保只在客户端运行
  useEffect(() => {
    setMounted(true)
  }, [])

  // 恢复 API 客户端的 token
  useEffect(() => {
    if (!mounted) return

    if (accessToken) {
      apiClient.setToken(accessToken)
    }
    if (refreshToken) {
      apiClient.setRefreshToken(refreshToken)
    }

    setIsInitialized(true)
  }, [mounted, accessToken, refreshToken])

  // 检查是否需要认证的辅助函数
  // Paper Trading 不需要认证，直接返回 true
  const requireAuth = (action?: string) => {
    // Paper Trading 模式：始终允许
    // Live Trading 模式：将来需要检查钱包连接
    if (!isAuthenticated) {
      console.log(`[Paper Trading] ${action || '操作'} - 无需钱包连接`)
    }
    return true
  }

  // 初始化中显示加载状态
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }

  const contextValue: AuthContextValue = {
    isConnected: isAuthenticated,
    requireAuth,
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}
