'use client'

/**
 * 认证提供者 - 钱包认证版本
 * 处理认证状态恢复和路由保护
 */

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { apiClient } from '@/lib/api'

// 公开路由（无需登录）
// TODO: 移除 /chat 用于生产环境
const PUBLIC_ROUTES = ['/login', '/', '/chat']

// 认证路由（已登录用户不应访问）
const AUTH_ROUTES = ['/login']

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

  // 注意：钱包状态监听移到 WalletAuthGuard 组件（在登录页面中使用）
  // 这里只做 token 恢复和路由保护

  // 路由保护
  useEffect(() => {
    if (!isInitialized) return

    const isPublicRoute = PUBLIC_ROUTES.some((route) =>
      route === '/' ? pathname === '/' : pathname.startsWith(route)
    )
    const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route))

    // 未登录用户访问受保护路由 -> 跳转登录
    if (!isAuthenticated && !isPublicRoute) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`)
      return
    }

    // 已登录用户访问认证路由 -> 跳转仪表盘
    if (isAuthenticated && isAuthRoute) {
      router.replace('/dashboard')
      return
    }
  }, [isInitialized, isAuthenticated, pathname, router])

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

  return <>{children}</>
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
