'use client'

import {
  Menu,
  Search,
  Settings,
  TrendingUp} from 'lucide-react'
import Link from 'next/link'
import React from 'react'

import { KillSwitch } from '@/components/KillSwitch'
import { NotificationCenter } from '@/components/NotificationCenter'
import { PaperTradingPanel } from '@/components/paper-trading/PaperTradingPanel'
import { PaperTradingStatusCard } from '@/components/paper-trading/PaperTradingStatusCard'
import { MarginAlertBadge } from '@/components/safety/MarginAlert'
import { GlobalAgentStatus } from '@/components/system/GlobalAgentStatus'
import { Button } from '@/components/ui/button'
import { ConnectionIndicator } from '@/components/ui/connection-status'
import { ThemeSwitcher } from '@/components/ui/theme-switcher'
import { useHyperliquidPrice } from '@/hooks/useHyperliquidPrice'
import { usePaperTradingStore } from '@/store/paperTrading'

export function Header() {
  const [showPTPanel, setShowPTPanel] = React.useState(false)

  // Paper Trading 状态
  const accounts = usePaperTradingStore((s) => s.accounts)
  const getAccountStats = usePaperTradingStore((s) => s.getAccountStats)
  const activeAccount = accounts.length > 0 ? accounts[0] : null
  const ptStats = activeAccount ? getAccountStats(activeAccount.id) : null

  // Hyperliquid 实时价格
  const { prices: livePrices } = useHyperliquidPrice(['BTC', 'ETH', 'SOL', 'BNB'], {
    refreshInterval: 5000,
  })

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

        {/* Paper Trading 状态卡片 - 明显的入口 */}
        <div className="hidden md:block mx-4">
          <PaperTradingStatusCard
            isRunning={!!activeAccount}
            stats={ptStats}
            onClick={() => { setShowPTPanel(true); }}
          />
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

          {/* 设置按钮 */}
          <Link href="/settings">
            <Button variant="ghost" size="icon" title="设置">
              <Settings className="h-5 w-5" />
            </Button>
          </Link>

          {/* Mobile Menu */}
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Market Ticker - 实时 Hyperliquid 价格 */}
      <div className="border-t border-border/50 bg-muted/30">
        <div className="container px-4 py-1.5">
          <div className="flex gap-4 overflow-x-auto scrollbar-thin text-xs">
            <MarketTicker
              symbol="BTC/USDT"
              price={livePrices.get('BTC')?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '--'}
            />
            <MarketTicker
              symbol="ETH/USDT"
              price={livePrices.get('ETH')?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '--'}
            />
            <MarketTicker
              symbol="SOL/USDT"
              price={livePrices.get('SOL')?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '--'}
            />
            <MarketTicker
              symbol="BNB/USDT"
              price={livePrices.get('BNB')?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '--'}
            />
          </div>
        </div>
      </div>

      {/* Paper Trading 滑动面板 - 始终渲染，Panel内部处理账户创建 */}
      <PaperTradingPanel
        isOpen={showPTPanel}
        onClose={() => { setShowPTPanel(false); }}
        strategyId={activeAccount?.agentId || 'manual-trading'}
        strategyName="Paper Trading"
        symbol="BTC/USDT"
      />
    </header>
  )
}

interface MarketTickerProps {
  symbol: string
  price: string
}

function MarketTicker({ symbol, price }: MarketTickerProps) {
  const isLoading = price === '--'

  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <span className="font-medium text-muted-foreground">{symbol}</span>
      <span className={`font-semibold ${isLoading ? 'text-muted-foreground animate-pulse' : ''}`}>
        ${price}
      </span>
    </div>
  )
}
