/**
 * PaperTradingPanel - Paper Trading 状态面板
 * Story 2: 虚拟账户与模拟订单系统
 *
 * 显示正在运行的 Paper Trading 状态的滑出面板
 */

'use client'

import { Activity, Award, DollarSign, Play, Target,TrendingDown, TrendingUp, X } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription,CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useSingleAssetPrice } from '@/hooks/useHyperliquidPrice'
import { usePaperTrading } from '@/hooks/usePaperTrading'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

interface PaperTradingPanelProps {
  /** 是否打开面板 */
  isOpen: boolean
  /** 关闭回调 */
  onClose: () => void
  /** 策略 ID */
  strategyId: string
  /** 策略名称 */
  strategyName: string
  /** 交易对符号 */
  symbol: string
}

// =============================================================================
// Component
// =============================================================================

export function PaperTradingPanel({
  isOpen,
  onClose,
  strategyId,
  strategyName,
  symbol,
}: PaperTradingPanelProps) {
  // Paper Trading Hook
  const {
    account,
    stats,
    updatePrice,
    getPositionBySymbol,
    initAccount,
  } = usePaperTrading({ agentId: strategyId })

  // 创建账户的本地状态
  const [initialCapital, setInitialCapital] = useState(10000)
  const [isCreating, setIsCreating] = useState(false)

  // 实时价格订阅 (假设 symbol 为 "BTC/USDT", 提取 "BTC")
  const assetSymbol = symbol.split('/')[0] || 'BTC'
  const { price: currentPrice } = useSingleAssetPrice(assetSymbol, {
    refreshInterval: 5000,
    enabled: isOpen && !!account,
  })

  // 使用 ref 存储最新的回调函数，避免 useEffect 循环依赖
  const updatePriceRef = useRef(updatePrice)
  const getPositionBySymbolRef = useRef(getPositionBySymbol)

  // 同步更新 ref
  useEffect(() => {
    updatePriceRef.current = updatePrice
    getPositionBySymbolRef.current = getPositionBySymbol
  })

  // 更新持仓价格 - 使用 ref 打破依赖循环
  const lastPriceRef = useRef<number | null>(null)
  useEffect(() => {
    // 只在价格实际变化时更新，避免无限循环
    if (account && currentPrice && currentPrice !== lastPriceRef.current) {
      const hasPosition = getPositionBySymbolRef.current(symbol)
      if (hasPosition) {
        lastPriceRef.current = currentPrice
        updatePriceRef.current(symbol, currentPrice)
      }
    }
  }, [currentPrice, account, symbol])

  // ESC 键关闭
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => { window.removeEventListener('keydown', handleEscape); }
  }, [isOpen, onClose])

  // 创建账户
  const handleCreateAccount = () => {
    setIsCreating(true)
    try {
      initAccount(strategyId, initialCapital)
    } finally {
      setIsCreating(false)
    }
  }

  // 获取持仓
  const position = getPositionBySymbol(symbol)

  // Conditional rendering to prevent scroll issues with fixed position elements
  if (!isOpen) {
    return null
  }

  return (
    <>
      {/* Backdrop - 点击关闭面板 */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sliding Panel */}
      <aside
        className={cn(
          'fixed top-0 right-0 z-40 h-screen w-full sm:w-[480px]',
          'bg-card/95 backdrop-blur-md border-l border-border shadow-2xl',
          'flex flex-col animate-slide-in-right'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Paper Trading Panel"
      >
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-[hsl(var(--rb-yellow))]" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">{strategyName}</h2>
                <Badge
                  variant="secondary"
                  className="bg-[hsl(var(--rb-yellow))]/10 text-[hsl(var(--rb-yellow))] border-[hsl(var(--rb-yellow))]/20"
                >
                  Paper Trading
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{symbol}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-4 space-y-4">
            {!account ? (
              /* 无账户 - 创建账户入口 */
              <Card className="border-dashed border-2 border-[hsl(var(--rb-yellow))]/30">
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto p-3 rounded-full bg-[hsl(var(--rb-yellow))]/10 w-fit mb-2">
                    <Target className="h-8 w-8 text-[hsl(var(--rb-yellow))]" />
                  </div>
                  <CardTitle className="text-lg">开始 Paper Trading</CardTitle>
                  <CardDescription>
                    使用虚拟资金进行模拟交易，零风险测试策略
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 初始资金设置 */}
                  <div className="space-y-2">
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
                            'text-xs',
                            initialCapital === amount && 'border-[hsl(var(--rb-yellow))] bg-[hsl(var(--rb-yellow))]/10'
                          )}
                        >
                          ${amount.toLocaleString()}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* 创建按钮 */}
                  <Button
                    onClick={handleCreateAccount}
                    disabled={isCreating || initialCapital < 100}
                    className="w-full gap-2 bg-[hsl(var(--rb-yellow))] hover:bg-[hsl(var(--rb-yellow))]/90 text-black font-semibold"
                  >
                    <Play className="h-4 w-4" />
                    创建虚拟账户
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    Paper Trading 不会产生真实盈亏
                  </p>
                </CardContent>
              </Card>
            ) : !stats ? (
              <div className="text-center text-muted-foreground py-8">
                加载中...
              </div>
            ) : (
              <>
                {/* 账户总览 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <DollarSign className="h-4 w-4" />
                      账户总览
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* 总资产 */}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">总资产</span>
                      <span className="text-lg font-bold font-mono">
                        ${stats.totalEquity.toFixed(2)}
                      </span>
                    </div>

                    {/* 可用余额 */}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">可用余额</span>
                      <span className="font-mono">
                        ${account.currentBalance.toFixed(2)}
                      </span>
                    </div>

                    {/* 总盈亏 */}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">总盈亏</span>
                      <div className="flex items-center gap-2">
                        {stats.totalPnl >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-[hsl(var(--rb-green))]" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-[hsl(var(--rb-red))]" />
                        )}
                        <span
                          className={cn(
                            'font-mono font-bold',
                            stats.totalPnl >= 0
                              ? 'text-[hsl(var(--rb-green))]'
                              : 'text-[hsl(var(--rb-red))]'
                          )}
                        >
                          {stats.totalPnl >= 0 ? '+' : ''}
                          ${stats.totalPnl.toFixed(2)}
                          {' '}
                          ({stats.totalPnlPercent.toFixed(2)}%)
                        </span>
                      </div>
                    </div>

                    {/* 未实现盈亏 */}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">未实现盈亏</span>
                      <span
                        className={cn(
                          'font-mono',
                          stats.unrealizedPnl >= 0
                            ? 'text-[hsl(var(--rb-green))]'
                            : 'text-[hsl(var(--rb-red))]'
                        )}
                      >
                        {stats.unrealizedPnl >= 0 ? '+' : ''}
                        ${stats.unrealizedPnl.toFixed(2)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* 交易统计 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Award className="h-4 w-4" />
                      交易统计
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      {/* 胜率 */}
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="text-xs text-muted-foreground mb-1">胜率</div>
                        <div className="text-lg font-bold font-mono">
                          {stats.winRate.toFixed(1)}%
                        </div>
                      </div>

                      {/* 总交易次数 */}
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="text-xs text-muted-foreground mb-1">交易次数</div>
                        <div className="text-lg font-bold font-mono">
                          {stats.totalTrades}
                        </div>
                      </div>

                      {/* 盈利次数 */}
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="text-xs text-muted-foreground mb-1">盈利次数</div>
                        <div className="text-lg font-bold font-mono text-[hsl(var(--rb-green))]">
                          {stats.winTrades}
                        </div>
                      </div>

                      {/* 亏损次数 */}
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="text-xs text-muted-foreground mb-1">亏损次数</div>
                        <div className="text-lg font-bold font-mono text-[hsl(var(--rb-red))]">
                          {stats.lossTrades}
                        </div>
                      </div>
                    </div>

                    {/* 平均盈亏 */}
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-sm text-muted-foreground">平均盈利</span>
                      <span className="font-mono text-[hsl(var(--rb-green))]">
                        +${stats.avgWin.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">平均亏损</span>
                      <span className="font-mono text-[hsl(var(--rb-red))]">
                        ${stats.avgLoss.toFixed(2)}
                      </span>
                    </div>

                    {/* 总手续费 */}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">总手续费</span>
                      <span className="font-mono text-muted-foreground">
                        ${stats.totalFees.toFixed(2)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* 当前持仓 */}
                {position && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Activity className="h-4 w-4" />
                        当前持仓 - {symbol}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* 持仓数量 */}
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">持仓数量</span>
                        <span className="font-mono font-bold">
                          {position.size.toFixed(4)} {assetSymbol}
                        </span>
                      </div>

                      {/* 开仓均价 */}
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">开仓均价</span>
                        <span className="font-mono">
                          ${position.entryPrice.toFixed(2)}
                        </span>
                      </div>

                      {/* 当前价格 */}
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">当前价格</span>
                        <span className="font-mono">
                          ${position.currentPrice.toFixed(2)}
                        </span>
                      </div>

                      {/* 未实现盈亏 */}
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="text-sm text-muted-foreground">未实现盈亏</span>
                        <div className="flex items-center gap-2">
                          {position.unrealizedPnl >= 0 ? (
                            <TrendingUp className="h-4 w-4 text-[hsl(var(--rb-green))]" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-[hsl(var(--rb-red))]" />
                          )}
                          <span
                            className={cn(
                              'font-mono font-bold',
                              position.unrealizedPnl >= 0
                                ? 'text-[hsl(var(--rb-green))]'
                                : 'text-[hsl(var(--rb-red))]'
                            )}
                          >
                            {position.unrealizedPnl >= 0 ? '+' : ''}
                            ${position.unrealizedPnl.toFixed(2)}
                            {' '}
                            ({position.unrealizedPnlPercent.toFixed(2)}%)
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 最近交易 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Activity className="h-4 w-4" />
                      最近交易
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {account.trades.length === 0 ? (
                      <div className="text-center text-sm text-muted-foreground py-4">
                        暂无交易记录
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {account.trades.slice(0, 10).reverse().map((trade) => (
                          <div
                            key={trade.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={trade.side === 'buy' ? 'default' : 'outline'}
                                className={cn(
                                  trade.side === 'buy'
                                    ? 'bg-[hsl(var(--rb-green))]/10 text-[hsl(var(--rb-green))] border-[hsl(var(--rb-green))]/20'
                                    : 'bg-[hsl(var(--rb-red))]/10 text-[hsl(var(--rb-red))] border-[hsl(var(--rb-red))]/20'
                                )}
                              >
                                {trade.side === 'buy' ? '买入' : '卖出'}
                              </Badge>
                              <span className="text-sm font-mono">
                                {trade.size.toFixed(4)}
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-mono">
                                ${trade.price.toFixed(2)}
                              </div>
                              {trade.realizedPnl !== undefined && (
                                <div
                                  className={cn(
                                    'text-xs font-mono',
                                    trade.realizedPnl >= 0
                                      ? 'text-[hsl(var(--rb-green))]'
                                      : 'text-[hsl(var(--rb-red))]'
                                  )}
                                >
                                  {trade.realizedPnl >= 0 ? '+' : ''}
                                  ${trade.realizedPnl.toFixed(2)}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="flex items-center gap-3 px-4 py-3 border-t border-border bg-card/80 backdrop-blur-sm">
          <Button variant="outline" onClick={onClose} className="flex-1">
            关闭
          </Button>
        </footer>
      </aside>
    </>
  )
}

export default PaperTradingPanel
