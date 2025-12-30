/**
 * Paper Trading 统一页面
 *
 * 整合现货模拟和永续合约模拟，通过 Tab 切换
 */

'use client'

import {
  AlertCircle,
  History,
  Play,
  Target,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react'
import React, { useState, useCallback, useEffect } from 'react'

import { MainLayout } from '@/components/layout/MainLayout'
import { PaperTradingDashboard } from '@/components/paper-trading/PaperTradingDashboard'
import { PerpetualPaperTradingPanel } from '@/components/paper-trading/PerpetualPaperTradingPanel'
import { TradeHistory } from '@/components/paper-trading/TradeHistory'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSingleAssetPrice } from '@/hooks/useHyperliquidPrice'
import { cn } from '@/lib/utils'
import { usePaperTradingStore } from '@/store/paperTrading'
import { usePerpetualPaperTradingStore } from '@/store/perpetualPaperTrading'

// =============================================================================
// Types
// =============================================================================

type TradingMode = 'spot' | 'perpetual'

// =============================================================================
// Main Page Component
// =============================================================================

export default function PaperTradingPage() {
  // 模式切换状态
  const [mode, setMode] = useState<TradingMode>('spot')

  // Spot Store
  const spotAccounts = usePaperTradingStore((s) => s.accounts)
  const initSpotAccount = usePaperTradingStore((s) => s.initAccount)
  const deleteSpotAccount = usePaperTradingStore((s) => s.deleteAccount)
  const placeMarketOrder = usePaperTradingStore((s) => s.placeMarketOrder)
  const closeSpotPosition = usePaperTradingStore((s) => s.closePosition)
  const getSpotAccountStats = usePaperTradingStore((s) => s.getAccountStats)

  // Perpetual Store
  const perpetualAccount = usePerpetualPaperTradingStore((s) => s.account)
  const perpetualIsInitialized = usePerpetualPaperTradingStore(
    (s) => s.isInitialized
  )
  const initPerpetualAccount = usePerpetualPaperTradingStore(
    (s) => s.initAccount
  )
  const resetPerpetualAccount = usePerpetualPaperTradingStore(
    (s) => s.resetAccount
  )
  const updateAllPrices = usePerpetualPaperTradingStore((s) => s.updateAllPrices)

  // 获取第一个现货账户（单用户场景）
  const activeSpotAccount = spotAccounts.length > 0 ? spotAccounts[0] : null
  const spotStats = activeSpotAccount
    ? getSpotAccountStats(activeSpotAccount.id)
    : null

  // 判断当前模式是否有活跃账户
  const hasActiveAccount =
    mode === 'spot' ? !!activeSpotAccount : perpetualIsInitialized

  // 实时价格
  const {
    price: btcPrice,
    loading: priceLoading,
    error: priceError,
  } = useSingleAssetPrice('BTC', {
    refreshInterval: 3000,
    enabled: true,
  })

  // 生成永续合约所需的多币种价格
  const [prices, setPrices] = useState<Record<string, number>>({})

  useEffect(() => {
    if (btcPrice) {
      const newPrices = {
        BTC: btcPrice,
        ETH: btcPrice * 0.037, // ~3.7% of BTC
        SOL: btcPrice * 0.00225, // ~0.225% of BTC
        DOGE: btcPrice * 0.0000034, // ~0.00034% of BTC
      }
      setPrices(newPrices)
      // 更新永续合约 store 价格
      if (perpetualIsInitialized) {
        updateAllPrices(newPrices)
      }
    }
  }, [btcPrice, perpetualIsInitialized, updateAllPrices])

  // 本地状态
  const [initialCapital, setInitialCapital] = useState(10000)
  const [isCreating, setIsCreating] = useState(false)

  // 创建账户
  const handleCreateAccount = useCallback(() => {
    setIsCreating(true)
    try {
      if (mode === 'spot') {
        initSpotAccount('manual-trading', initialCapital)
      } else {
        initPerpetualAccount(initialCapital)
      }
    } finally {
      setIsCreating(false)
    }
  }, [mode, initialCapital, initSpotAccount, initPerpetualAccount])

  // 删除/重置账户
  const handleStopTrading = useCallback(() => {
    if (mode === 'spot' && activeSpotAccount) {
      deleteSpotAccount(activeSpotAccount.id)
    } else {
      resetPerpetualAccount()
    }
  }, [mode, activeSpotAccount, deleteSpotAccount, resetPerpetualAccount])

  // 现货交易操作
  const handleBuy = (size: number) => {
    if (!activeSpotAccount || !btcPrice) return
    placeMarketOrder(
      {
        accountId: activeSpotAccount.id,
        symbol: 'BTC/USDT',
        side: 'buy',
        type: 'market',
        size,
      },
      btcPrice
    )
  }

  const handleSell = (size: number) => {
    if (!activeSpotAccount || !btcPrice) return
    placeMarketOrder(
      {
        accountId: activeSpotAccount.id,
        symbol: 'BTC/USDT',
        side: 'sell',
        type: 'market',
        size,
      },
      btcPrice
    )
  }

  const handleCloseSpotPosition = (positionId: string) => {
    if (!activeSpotAccount || !btcPrice) return
    closeSpotPosition(
      { accountId: activeSpotAccount.id, positionId },
      btcPrice
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
          {hasActiveAccount && (
            <Badge
              variant="outline"
              className={cn(
                mode === 'perpetual'
                  ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'
                  : 'bg-[hsl(var(--rb-yellow))]/10 text-[hsl(var(--rb-yellow))] border-[hsl(var(--rb-yellow))]/30'
              )}
            >
              <div
                className={cn(
                  'w-2 h-2 rounded-full mr-2 animate-pulse',
                  mode === 'perpetual' ? 'bg-yellow-500' : 'bg-[hsl(var(--rb-yellow))]'
                )}
              />
              {mode === 'perpetual' ? '永续模式' : '现货模式'}
            </Badge>
          )}
        </div>

        {/* 模式切换 Tabs */}
        <Tabs
          value={mode}
          onValueChange={(v) => setMode(v as TradingMode)}
          className="w-full"
        >
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="spot" className="gap-2">
              <Wallet className="h-4 w-4" />
              现货模拟
            </TabsTrigger>
            <TabsTrigger value="perpetual" className="gap-2">
              <Zap className="h-4 w-4" />
              永续合约
            </TabsTrigger>
          </TabsList>

          {/* 现货模式内容 */}
          <TabsContent value="spot" className="mt-4 space-y-4">
            {!activeSpotAccount ? (
              <CreateAccountCard
                mode="spot"
                initialCapital={initialCapital}
                onCapitalChange={setInitialCapital}
                onCreate={handleCreateAccount}
                isCreating={isCreating}
              />
            ) : (
              <>
                {priceError && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
                    价格获取失败: {priceError.message}
                  </div>
                )}

                <PaperTradingDashboard
                  account={activeSpotAccount}
                  stats={spotStats}
                  currentPrice={btcPrice}
                  symbol="BTC/USDT"
                  priceLoading={priceLoading}
                  onBuy={handleBuy}
                  onSell={handleSell}
                  onClosePosition={handleCloseSpotPosition}
                  onStop={handleStopTrading}
                />

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <History className="h-5 w-5 text-muted-foreground" />
                      交易历史
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TradeHistory trades={activeSpotAccount.trades} limit={10} />
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* 永续合约模式内容 */}
          <TabsContent value="perpetual" className="mt-4">
            <PerpetualPaperTradingPanel
              prices={prices}
              defaultCapital={initialCapital}
            />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}

// =============================================================================
// Create Account Card
// =============================================================================

interface CreateAccountCardProps {
  mode: TradingMode
  initialCapital: number
  onCapitalChange: (value: number) => void
  onCreate: () => void
  isCreating: boolean
}

function CreateAccountCard({
  mode,
  initialCapital,
  onCapitalChange,
  onCreate,
  isCreating,
}: CreateAccountCardProps) {
  const isSpot = mode === 'spot'

  return (
    <Card className="border-dashed border-2">
      <CardHeader className="text-center pb-2">
        <CardTitle className="flex items-center justify-center gap-2">
          <Play className="h-5 w-5 text-[hsl(var(--rb-yellow))]" />
          开始 {isSpot ? '现货' : '永续合约'} Paper Trading
        </CardTitle>
        <CardDescription>
          创建虚拟账户，使用模拟资金进行{isSpot ? '现货' : '永续合约'}交易测试
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
            onChange={(e) => onCapitalChange(Number(e.target.value))}
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
                onClick={() => onCapitalChange(amount)}
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
          {isSpot ? (
            <FeatureCard
              icon={<History className="h-5 w-5" />}
              title="交易记录"
              description="完整的盈亏追踪"
            />
          ) : (
            <FeatureCard
              icon={<Zap className="h-5 w-5" />}
              title="杠杆交易"
              description="最高 100x 杠杆"
            />
          )}
        </div>

        {/* 创建按钮 */}
        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={onCreate}
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
