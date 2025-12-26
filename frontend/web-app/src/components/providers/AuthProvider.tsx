'use client'

/**
 * 认证提供者 - 钱包认证版本
 *
 * 设计原则：
 * - 默认允许浏览所有页面（无需登录）
 * - 只有需要写入操作时才要求连接钱包
 * - 用户可以通过右上角按钮随时连接/断开钱包
 */

import { useEffect, useState, createContext, useContext, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { apiClient } from '@/lib/api'

// 需要认证才能访问的路由（执行敏感操作的页面）
// 大部分页面都是可浏览的，只有这些页面强制要求登录
const PROTECTED_ROUTES: string[] = [
  // 暂时没有强制要求登录的页面
  // 所有页面都可以浏览，只有执行操作时才需要连接钱包
]

// 登录页面路由（已登录用户会被重定向）
const AUTH_ROUTES = ['/login']

interface AuthContextValue {
  /** 是否已连接钱包 */
  isConnected: boolean
  /** 检查是否需要连接钱包，如果未连接则显示提示 */
  requireAuth: (action?: string) => boolean
  /** 打开连接钱包弹窗 */
  openConnectModal: () => void
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
  const router = useRouter()
  const pathname = usePathname()
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

  // 路由保护 - 只保护特定路由，其他页面都可以浏览
  useEffect(() => {
    if (!isInitialized) return

    const isProtectedRoute = PROTECTED_ROUTES.some((route) => pathname.startsWith(route))
    const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route))

    // 未登录用户访问强制保护路由 -> 跳转登录（目前没有这样的路由）
    if (!isAuthenticated && isProtectedRoute) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`)
      return
    }

    // 已登录用户访问登录页 -> 跳转仪表盘
    if (isAuthenticated && isAuthRoute) {
      router.replace('/dashboard')
      return
    }
  }, [isInitialized, isAuthenticated, pathname, router])

  // 检查是否需要认证的辅助函数
  const requireAuth = useCallback((action?: string) => {
    if (isAuthenticated) return true

    // 未连接钱包，可以在这里触发连接提示
    // TODO: 显示一个友好的提示弹窗，而不是跳转到登录页
    console.log(`需要连接钱包才能${action || '执行此操作'}`)
    router.push(`/login?redirect=${encodeURIComponent(pathname)}&action=${encodeURIComponent(action || '')}`)
    return false
  }, [isAuthenticated, router, pathname])

  // 打开连接钱包弹窗
  const openConnectModal = useCallback(() => {
    router.push(`/login?redirect=${encodeURIComponent(pathname)}`)
  }, [router, pathname])

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
    openConnectModal,
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * 高阶组件：保护需要认证的页面
 */
export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated } = useAuthStore()
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
      if (!isAuthenticated) {
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`)
      }
    }, [isAuthenticated, router, pathname])

    if (!isAuthenticated) {
      return null
    }

    return <WrappedComponent {...props} />
  }
}
