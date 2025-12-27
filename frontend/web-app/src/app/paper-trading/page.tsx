/**
 * Paper Trading 独立页面
 *
 * 提供专门的 Paper Trading 入口和管理界面
 */

'use client'

import { AlertCircle,History, Play, Target, TrendingUp, Wallet } from 'lucide-react'
import React, { useState } from 'react'

import { MainLayout } from '@/components/layout/MainLayout'
import { PaperTradingDashboard } from '@/components/paper-trading/PaperTradingDashboard'
import { TradeHistory } from '@/components/paper-trading/TradeHistory'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription,CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useSingleAssetPrice } from '@/hooks/useHyperliquidPrice'
import { cn } from '@/lib/utils'
import { usePaperTradingStore } from '@/store/paperTrading'

// =============================================================================
// Main Page Component
// =============================================================================

export default function PaperTradingPage() {
  // Store
  const accounts = usePaperTradingStore((s) => s.accounts)
  const initAccount = usePaperTradingStore((s) => s.initAccount)
  const deleteAccount = usePaperTradingStore((s) => s.deleteAccount)
  const placeMarketOrder = usePaperTradingStore((s) => s.placeMarketOrder)
  const closePosition = usePaperTradingStore((s) => s.closePosition)
  const getAccountStats = usePaperTradingStore((s) => s.getAccountStats)

  // 获取第一个账户（单用户场景）
  const activeAccount = accounts.length > 0 ? accounts[0] : null
  const stats = activeAccount ? getAccountStats(activeAccount.id) : null

  // 实时价格
  const { price: currentPrice, loading: priceLoading, error: priceError } = useSingleAssetPrice('BTC', {
    refreshInterval: 3000,
    enabled: true,
  })

  // 本地状态
  const [initialCapital, setInitialCapital] = useState(10000)
  const [isCreating, setIsCreating] = useState(false)

  // 创建新账户
  const handleCreateAccount = () => {
    setIsCreating(true)
    try {
      initAccount('manual-trading', initialCapital)
    } finally {
      setIsCreating(false)
    }
  }

  // 删除账户
  const handleDeleteAccount = () => {
    if (activeAccount) {
      deleteAccount(activeAccount.id)
    }
  }

  // 交易操作
  const handleBuy = (size: number) => {
    if (!activeAccount || !currentPrice) return
    placeMarketOrder(
      {
        accountId: activeAccount.id,
        symbol: 'BTC/USDT',
        side: 'buy',
        type: 'market',
        size,
      },
      currentPrice
    )
  }

  const handleSell = (size: number) => {
    if (!activeAccount || !currentPrice) return
    placeMarketOrder(
      {
        accountId: activeAccount.id,
        symbol: 'BTC/USDT',
        side: 'sell',
        type: 'market',
        size,
      },
      currentPrice
    )
  }

  const handleClosePosition = (positionId: string) => {
    if (!activeAccount || !currentPrice) return
    closePosition(
      { accountId: activeAccount.id, positionId },
      currentPrice
    )
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[hsl(var(--rb-yellow))]/10">
              <Target className="h-6 w-6 text-[hsl(var(--rb-yellow))]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Paper Trading</h1>
              <p className="text-sm text-muted-foreground">
                使用虚拟资金进行模拟交易，零风险测试策略
              </p>
            </div>
          </div>

          {/* 状态徽章 */}
          {activeAccount && (
            <Badge
              variant="outline"
              className="bg-[hsl(var(--rb-yellow))]/10 text-[hsl(var(--rb-yellow))] border-[hsl(var(--rb-yellow))]/30"
            >
              <div className="w-2 h-2 rounded-full bg-[hsl(var(--rb-yellow))] mr-2 animate-pulse" />
              运行中
            </Badge>
          )}
        </div>

        {/* 未启动状态 - 创建账户引导 */}
        {!activeAccount && (
          <Card className="border-dashed border-2">
            <CardHeader className="text-center pb-2">
              <CardTitle className="flex items-center justify-center gap-2">
                <Play className="h-5 w-5 text-[hsl(var(--rb-yellow))]" />
                开始 Paper Trading
              </CardTitle>
              <CardDescription>
                创建虚拟账户，使用模拟资金进行交易测试
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 初始资金设置 */}
              <div className="max-w-sm mx-auto space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  初始虚拟资金 (USDT)
                </label>
                <Input
                  type="number"
                  value={initialCapital}
                  onChange={(e) => { setInitialCapital(Number(e.target.value)); }}
                  min={100}
                  max={1000000}
                  className="text-center text-lg font-mono"
                />
                <div className="flex justify-center gap-2">
                  {[1000, 10000, 50000, 100000].map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      size="sm"
                      onClick={() => { setInitialCapital(amount); }}
                      className={cn(
                        initialCapital === amount && 'border-primary bg-primary/10'
                      )}
                    >
                      ${amount.toLocaleString()}
                    </Button>
                  ))}
                </div>
              </div>

              {/* 功能预览 */}
              <div className="grid grid-cols-3 gap-4 py-4">
                <FeatureCard
                  icon={<Wallet className="h-5 w-5" />}
                  title="虚拟账户"
                  description="模拟真实交易环境"
                />
                <FeatureCard
                  icon={<TrendingUp className="h-5 w-5" />}
                  title="实时价格"
                  description="Hyperliquid 数据源"
                />
                <FeatureCard
                  icon={<History className="h-5 w-5" />}
                  title="交易记录"
                  description="完整的盈亏追踪"
                />
              </div>

              {/* 创建按钮 */}
              <div className="flex justify-center">
                <Button
                  size="lg"
                  onClick={handleCreateAccount}
                  disabled={isCreating || initialCapital < 100}
                  className="gap-2 bg-[hsl(var(--rb-yellow))] hover:bg-[hsl(var(--rb-yellow))]/90 text-black font-semibold px-8"
                >
                  <Play className="h-4 w-4" />
                  创建虚拟账户
                </Button>
              </div>

              {/* 提示 */}
              <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Paper Trading 不会产生真实盈亏，所有交易均为模拟
              </p>
            </CardContent>
          </Card>
        )}

        {/* 已启动状态 - Dashboard */}
        {activeAccount && (
          <>
            {/* 价格错误提示 */}
            {priceError && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
                价格获取失败: {priceError.message}
              </div>
            )}

            {/* Dashboard */}
            <PaperTradingDashboard
              account={activeAccount}
              stats={stats}
              currentPrice={currentPrice}
              symbol="BTC/USDT"
              priceLoading={priceLoading}
              onBuy={handleBuy}
              onSell={handleSell}
              onClosePosition={handleClosePosition}
              onStop={handleDeleteAccount}
            />

            {/* 交易历史 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="h-5 w-5 text-muted-foreground" />
                  交易历史
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TradeHistory trades={activeAccount.trades} limit={10} />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  )
}

// =============================================================================
// Feature Card Component
// =============================================================================

interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="text-center p-4 rounded-lg bg-muted/30">
      <div className="inline-flex p-2 rounded-lg bg-background mb-2">
        {icon}
      </div>
      <h3 className="font-medium text-sm">{title}</h3>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  )
}
