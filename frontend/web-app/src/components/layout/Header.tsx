'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useDisconnect } from 'wagmi'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth'
import { apiClient } from '@/lib/api'
import {
  TrendingUp,
  Settings,
  Wallet,
  Menu,
  Search,
  LogOut,
  ChevronDown,
  Copy,
  Check
} from 'lucide-react'
import { ThemeSwitcher } from '@/components/ui/theme-switcher'
import { ConnectionIndicator } from '@/components/ui/connection-status'
import { KillSwitch } from '@/components/KillSwitch'
import { NotificationCenter } from '@/components/NotificationCenter'
import { GlobalAgentStatus } from '@/components/system/GlobalAgentStatus'
import { MarginAlertBadge } from '@/components/safety/MarginAlert'

export function Header() {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const { disconnect } = useDisconnect()
  const [showUserMenu, setShowUserMenu] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  // 格式化钱包地址显示
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // 复制地址
  const copyAddress = async () => {
    if (user?.walletAddress) {
      await navigator.clipboard.writeText(user.walletAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleLogout = async () => {
    try {
      await apiClient.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      disconnect()
      logout()
      router.push('/login')
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-4">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-6">
          <TrendingUp className="h-6 w-6 text-primary" />
          <Link href="/dashboard" className="flex items-center space-x-2">
            <span className="font-bold text-xl">Delta Terminal</span>
          </Link>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索交易对、策略..."
              className="w-full pl-8 pr-4 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Right Section - 分组布局 */}
        <div className="ml-auto flex items-center gap-1">
          {/* 状态指示器组 - 合并显示，降低视觉权重 */}
          <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/30 mr-2">
            <GlobalAgentStatus />
            <div className="h-3 w-[1px] bg-border/50" />
            <MarginAlertBadge />
            <div className="h-3 w-[1px] bg-border/50" />
            <ConnectionIndicator />
          </div>

          {/* 操作按钮组 - 紧急停止突出 */}
          <KillSwitch />

          {/* 分隔线 */}
          <div className="hidden md:block h-6 w-[1px] bg-border/50 mx-1" />

          {/* 通知 + 主题 */}
          <NotificationCenter />
          <ThemeSwitcher />

          {/* 分隔线 */}
          <div className="hidden md:block h-6 w-[1px] bg-border/50 mx-1" />

          {/* User Menu - 包含设置入口 */}
          <div className="relative">
            <Button
              variant="ghost"
              className="flex items-center gap-2"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <Wallet className="h-5 w-5" />
              <span className="hidden md:inline text-sm font-mono">
                {user?.walletAddress ? formatAddress(user.walletAddress) : '未连接'}
              </span>
              <ChevronDown className="h-4 w-4" />
            </Button>

            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-56 rounded-md border bg-popover shadow-lg z-50">
                  <div className="p-3 border-b">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <p className="text-sm font-medium">已连接</p>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <p className="text-sm font-mono text-muted-foreground">
                        {user?.walletAddress ? formatAddress(user.walletAddress) : ''}
                      </p>
                      <button
                        onClick={copyAddress}
                        className="p-1 hover:bg-muted rounded-sm"
                        title="复制地址"
                      >
                        {copied ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="p-1">
                    <Link
                      href="/settings"
                      className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <Settings className="h-4 w-4" />
                      设置
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent text-destructive"
                    >
                      <LogOut className="h-4 w-4" />
                      断开连接
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Mobile Menu */}
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Market Ticker - 紧凑设计 */}
      <div className="border-t border-border/50 bg-muted/30">
        <div className="container px-4 py-1.5">
          <div className="flex gap-4 overflow-x-auto scrollbar-thin text-xs">
            <MarketTicker symbol="BTC/USDT" price="43,256.78" change={2.34} />
            <MarketTicker symbol="ETH/USDT" price="2,289.45" change={-1.23} />
            <MarketTicker symbol="SOL/USDT" price="98.76" change={5.67} />
            <MarketTicker symbol="BNB/USDT" price="312.45" change={1.89} />
          </div>
        </div>
      </div>
    </header>
  )
}

interface MarketTickerProps {
  symbol: string
  price: string
  change: number
}

function MarketTicker({ symbol, price, change }: MarketTickerProps) {
  const isPositive = change >= 0

  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <span className="font-medium text-muted-foreground">{symbol}</span>
      <span className="font-semibold">{price}</span>
      <span className={isPositive ? 'text-green-500' : 'text-red-500'}>
        {isPositive ? '+' : ''}{change.toFixed(2)}%
      </span>
    </div>
  )
}
