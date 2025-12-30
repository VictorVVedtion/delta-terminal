'use client'

/**
 * Perpetual Paper Trading Panel - 永续合约模拟交易面板
 *
 * 完整的模拟交易界面，包含：
 * - 账户概览
 * - 下单表单
 * - 持仓列表
 * - 交易历史
 */

import { useState, useCallback, useEffect } from 'react'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  X,
  Plus,
  Minus,
  RotateCcw,
  History,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'

import { usePerpetualPaperTradingStore } from '@/store/perpetualPaperTrading'
import type {
  PerpetualPaperAccount,
  PerpetualPaperAccountStats,
  PerpetualPaperPosition,
  PerpetualPaperTrade,
  PositionSide,
} from '@/types/perpetualPaperTrading'
import { getMaxLeverage } from '@/types/perpetualPaperTrading'
import type { RiskLevel } from '@/types/perpetual'

// =============================================================================
// Constants
// =============================================================================

const SUPPORTED_COINS = [
  { coin: 'BTC', symbol: 'BTC-PERP', name: 'Bitcoin' },
  { coin: 'ETH', symbol: 'ETH-PERP', name: 'Ethereum' },
  { coin: 'SOL', symbol: 'SOL-PERP', name: 'Solana' },
  { coin: 'DOGE', symbol: 'DOGE-PERP', name: 'Dogecoin' },
]

const RISK_LEVEL_STYLES: Record<RiskLevel, { bg: string; text: string; label: string }> = {
  safe: { bg: 'bg-green-500/10', text: 'text-green-500', label: 'Safe' },
  warning: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', label: 'Warning' },
  danger: { bg: 'bg-orange-500/10', text: 'text-orange-500', label: 'Danger' },
  liquidation: { bg: 'bg-red-500/10', text: 'text-red-500', label: 'Liquidation Risk' },
}

// =============================================================================
// Main Component
// =============================================================================

interface PerpetualPaperTradingPanelProps {
  /** 实时价格数据 */
  prices?: Record<string, number>
  /** 默认初始资金 */
  defaultCapital?: number
}

export function PerpetualPaperTradingPanel({
  prices = {},
  defaultCapital = 10000,
}: PerpetualPaperTradingPanelProps) {
  const {
    account,
    isInitialized,
    initAccount,
    resetAccount,
    openPosition,
    closePosition,
    updateAllPrices,
    getAccountStats,
  } = usePerpetualPaperTradingStore()

  // 更新价格
  useEffect(() => {
    if (Object.keys(prices).length > 0) {
      updateAllPrices(prices)
    }
  }, [prices, updateAllPrices])

  // 初始化账户
  const handleInitAccount = useCallback(() => {
    initAccount(defaultCapital)
  }, [initAccount, defaultCapital])

  if (!isInitialized || !account) {
    return <InitAccountCard onInit={handleInitAccount} defaultCapital={defaultCapital} />
  }

  const stats = getAccountStats()

  return (
    <div className="space-y-4">
      {/* Account Overview */}
      <AccountOverview account={account} stats={stats} onReset={resetAccount} />

      {/* Order Form & Positions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Order Form */}
        <div className="lg:col-span-1">
          <OrderForm prices={prices} />
        </div>

        {/* Positions & History */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="positions">
            <TabsList className="w-full">
              <TabsTrigger value="positions" className="flex-1">
                Positions ({account.positions.length})
              </TabsTrigger>
              <TabsTrigger value="history" className="flex-1">
                History
              </TabsTrigger>
            </TabsList>
            <TabsContent value="positions">
              <PositionsList
                positions={account.positions}
                prices={prices}
                onClose={(positionId, price) => closePosition({ positionId, price })}
              />
            </TabsContent>
            <TabsContent value="history">
              <TradeHistory trades={account.trades} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Init Account Card
// =============================================================================

function InitAccountCard({
  onInit,
  defaultCapital,
}: {
  onInit: () => void
  defaultCapital: number
}) {
  const [capital, setCapital] = useState(defaultCapital)

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Initialize Paper Trading Account
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="capital">Initial Capital (USDT)</Label>
          <Input
            id="capital"
            type="number"
            value={capital}
            onChange={(e) => setCapital(Number(e.target.value))}
            min={100}
            max={1000000}
          />
        </div>
        <Button onClick={onInit} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Create Account
        </Button>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// Account Overview
// =============================================================================

function AccountOverview({
  account,
  stats,
  onReset,
}: {
  account: PerpetualPaperAccount
  stats: PerpetualPaperAccountStats | null
  onReset: () => void
}) {
  const riskStyle = RISK_LEVEL_STYLES[account.riskLevel]
  const pnlPercent = stats?.totalPnlPercent ?? 0
  const isProfitable = pnlPercent >= 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Account Overview</CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={cn(riskStyle.bg, riskStyle.text, 'border-0')}>
              {riskStyle.label}
            </Badge>
            <Button variant="ghost" size="icon" onClick={onReset}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <StatItem label="Total Equity" value={`$${account.totalEquity.toFixed(2)}`} />
          <StatItem
            label="Total PnL"
            value={`${isProfitable ? '+' : ''}$${(stats?.totalPnl ?? 0).toFixed(2)}`}
            subValue={`${isProfitable ? '+' : ''}${pnlPercent.toFixed(2)}%`}
            valueClassName={isProfitable ? 'text-green-500' : 'text-red-500'}
          />
          <StatItem label="Available Margin" value={`$${account.availableMargin.toFixed(2)}`} />
          <StatItem label="Used Margin" value={`$${account.usedMargin.toFixed(2)}`} />
          <StatItem label="Margin Ratio" value={`${account.marginRatio.toFixed(1)}%`} />
          <StatItem
            label="Win Rate"
            value={`${(stats?.winRate ?? 0).toFixed(1)}%`}
            subValue={`${stats?.winTrades ?? 0}W / ${stats?.lossTrades ?? 0}L`}
          />
        </div>
      </CardContent>
    </Card>
  )
}

function StatItem({
  label,
  value,
  subValue,
  valueClassName,
}: {
  label: string
  value: string
  subValue?: string
  valueClassName?: string
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('text-lg font-semibold', valueClassName)}>{value}</p>
      {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
    </div>
  )
}

// =============================================================================
// Order Form
// =============================================================================

function OrderForm({ prices }: { prices: Record<string, number> }) {
  const { openPosition, account } = usePerpetualPaperTradingStore()

  const [coin, setCoin] = useState('BTC')
  const [side, setSide] = useState<PositionSide>('long')
  const [size, setSize] = useState('')
  const [leverage, setLeverage] = useState(10)
  const [error, setError] = useState<string | null>(null)

  const selectedCoin = SUPPORTED_COINS.find((c) => c.coin === coin)
  const currentPrice = prices[coin] ?? 0
  const maxLeverage = getMaxLeverage(coin)

  const notionalValue = Number(size) * currentPrice
  const requiredMargin = notionalValue / leverage

  const handleSubmit = () => {
    setError(null)

    if (!size || Number(size) <= 0) {
      setError('Please enter a valid size')
      return
    }

    if (currentPrice <= 0) {
      setError('Price not available')
      return
    }

    const result = openPosition({
      symbol: selectedCoin?.symbol ?? `${coin}-PERP`,
      coin,
      side,
      size: Number(size),
      price: currentPrice,
      leverage,
    })

    if (!result.success) {
      setError(result.error ?? 'Failed to open position')
    } else {
      setSize('')
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Open Position</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Coin Select */}
        <div>
          <Label>Asset</Label>
          <Select value={coin} onValueChange={setCoin}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_COINS.map((c) => (
                <SelectItem key={c.coin} value={c.coin}>
                  {c.coin} - {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Price Display */}
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground">Current Price</p>
          <p className="text-xl font-bold">${currentPrice.toLocaleString()}</p>
        </div>

        {/* Side Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={side === 'long' ? 'default' : 'outline'}
            className={cn(side === 'long' && 'bg-green-600 hover:bg-green-700')}
            onClick={() => setSide('long')}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Long
          </Button>
          <Button
            variant={side === 'short' ? 'default' : 'outline'}
            className={cn(side === 'short' && 'bg-red-600 hover:bg-red-700')}
            onClick={() => setSide('short')}
          >
            <TrendingDown className="h-4 w-4 mr-2" />
            Short
          </Button>
        </div>

        {/* Size Input */}
        <div>
          <Label>Size ({coin})</Label>
          <Input
            type="number"
            placeholder="0.00"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            step="0.001"
            min="0"
          />
        </div>

        {/* Leverage Slider */}
        <div>
          <div className="flex justify-between mb-2">
            <Label>Leverage</Label>
            <span className="text-sm font-medium">{leverage}x</span>
          </div>
          <Slider
            value={leverage}
            onChange={(v) => setLeverage(v)}
            min={1}
            max={maxLeverage}
            step={1}
            showValue={false}
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>1x</span>
            <span>{maxLeverage}x</span>
          </div>
        </div>

        {/* Order Summary */}
        {Number(size) > 0 && currentPrice > 0 && (
          <div className="p-3 bg-muted rounded-lg space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Notional Value</span>
              <span>${notionalValue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Required Margin</span>
              <span>${requiredMargin.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Available</span>
              <span>${(account?.availableMargin ?? 0).toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-2 bg-red-500/10 text-red-500 text-sm rounded">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          className={cn(
            'w-full',
            side === 'long' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
          )}
          disabled={!size || Number(size) <= 0 || currentPrice <= 0}
        >
          {side === 'long' ? 'Open Long' : 'Open Short'}
        </Button>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// Positions List
// =============================================================================

function PositionsList({
  positions,
  prices,
  onClose,
}: {
  positions: PerpetualPaperPosition[]
  prices: Record<string, number>
  onClose: (positionId: string, price: number) => void
}) {
  if (positions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No open positions
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y">
          {positions.map((position) => (
            <PositionRow
              key={position.id}
              position={position}
              currentPrice={prices[position.coin] ?? position.markPrice}
              onClose={() => onClose(position.id, prices[position.coin] ?? position.markPrice)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function PositionRow({
  position,
  currentPrice,
  onClose,
}: {
  position: PerpetualPaperPosition
  currentPrice: number
  onClose: () => void
}) {
  const isProfitable = position.unrealizedPnl >= 0
  const isLong = position.side === 'long'

  return (
    <div className="p-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {/* Symbol & Side */}
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">{position.coin}</span>
            <Badge
              variant="outline"
              className={cn(
                isLong ? 'text-green-500 border-green-500' : 'text-red-500 border-red-500'
              )}
            >
              {position.leverage}x {isLong ? 'Long' : 'Short'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {position.size} @ ${position.entryPrice.toLocaleString()}
          </p>
        </div>

        {/* PnL */}
        <div className="text-right">
          <p className={cn('font-semibold', isProfitable ? 'text-green-500' : 'text-red-500')}>
            {isProfitable ? '+' : ''}${position.unrealizedPnl.toFixed(2)}
          </p>
          <p className={cn('text-xs', isProfitable ? 'text-green-500' : 'text-red-500')}>
            {isProfitable ? '+' : ''}{position.returnOnEquity.toFixed(2)}% ROE
          </p>
        </div>

        {/* Liquidation Price */}
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Liq. Price</p>
          <p className="text-sm text-orange-500">${position.liquidationPrice.toFixed(2)}</p>
        </div>
      </div>

      {/* Close Button */}
      <Button variant="ghost" size="sm" onClick={onClose}>
        <X className="h-4 w-4 mr-1" />
        Close
      </Button>
    </div>
  )
}

// =============================================================================
// Trade History
// =============================================================================

function TradeHistory({ trades }: { trades: PerpetualPaperTrade[] }) {
  const sortedTrades = [...trades].reverse().slice(0, 50)

  if (sortedTrades.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
          No trade history
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y max-h-[400px] overflow-auto">
          {sortedTrades.map((trade) => (
            <TradeRow key={trade.id} trade={trade} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function TradeRow({ trade }: { trade: PerpetualPaperTrade }) {
  const isProfitable = (trade.realizedPnl ?? 0) >= 0
  const isBuy = trade.side === 'buy'

  const actionLabels: Record<string, string> = {
    open: 'Open',
    close: 'Close',
    add: 'Add',
    reduce: 'Reduce',
    liquidation: 'Liquidation',
  }

  return (
    <div className="p-3 flex items-center justify-between text-sm">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            trade.action === 'liquidation' ? 'bg-red-500' : isBuy ? 'bg-green-500' : 'bg-red-500'
          )}
        />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{trade.coin}</span>
            <span className="text-muted-foreground">{actionLabels[trade.action]}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {trade.size} @ ${trade.price.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="text-right">
        {trade.realizedPnl !== null && (
          <p className={cn('font-medium', isProfitable ? 'text-green-500' : 'text-red-500')}>
            {isProfitable ? '+' : ''}${trade.realizedPnl.toFixed(2)}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {new Date(trade.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  )
}

export default PerpetualPaperTradingPanel
