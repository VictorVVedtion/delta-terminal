'use client'

/**
 * Web3 Provider - wagmi + RainbowKit 集成
 * 确保只在客户端渲染以避免 SSR 问题
 */

import { useState, useEffect, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { config } from '@/lib/wagmi'

import '@rainbow-me/rainbowkit/styles.css'

// 创建 React Query 客户端（在组件外部创建避免重复）
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5分钟
      gcTime: 1000 * 60 * 30, // 30分钟
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

interface Web3ProviderProps {
  children: ReactNode
}

export function Web3Provider({ children }: Web3ProviderProps) {
  // 确保只在客户端渲染
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // 服务端渲染时返回占位符，避免 hydration 错误
  if (!mounted) {
    return (
      <div style={{ visibility: 'hidden' }}>
        {children}
      </div>
    )
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          locale="zh-CN"
          theme={darkTheme({
            accentColor: '#3b82f6', // 主题蓝色
            accentColorForeground: 'white',
            borderRadius: 'medium',
            fontStack: 'system',
            overlayBlur: 'small',
          })}
          modalSize="compact"
          showRecentTransactions={false}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
