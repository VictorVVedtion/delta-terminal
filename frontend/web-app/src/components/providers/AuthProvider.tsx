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
  // Zustand store - 从 persist 中读取
  const { isAuthenticated, accessToken, refreshToken } = useAuthStore()

  // 当 token 变化时更新 API 客户端
  useEffect(() => {
    if (accessToken) {
      apiClient.setToken(accessToken)
    }
    if (refreshToken) {
      apiClient.setRefreshToken(refreshToken)
    }
  }, [accessToken, refreshToken])

  // 检查是否需要认证的辅助函数
  // Paper Trading 不需要认证，直接返回 true
  const requireAuth = (action?: string) => {
    // Paper Trading 模式：始终允许
    // Live Trading 模式：将来需要检查钱包连接
    if (!isAuthenticated) {
      console.info(`[Paper Trading] ${action || '操作'} - 无需钱包连接`)
    }
    return true
  }

  // Paper Trading 模式：不需要等待认证，直接渲染子组件
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
