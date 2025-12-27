/**
 * Paper Trading Dashboard - 虚拟账户交易仪表板
 * Story 2: 虚拟账户与模拟订单系统
 */

'use client'

import { Activity, DollarSign, Percent, TrendingDown, TrendingUp, X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatCurrency, formatPercentage, formatTimestamp } from '@/lib/utils'
import type { PaperAccount, PaperAccountStats } from '@/types/paperTrading'

interface PaperTradingDashboardProps {
  account: PaperAccount | null
  stats: PaperAccountStats | null
  currentPrice: number | null
  symbol: string
  priceLoading: boolean
  onBuy?: (size: number) => void
  onSell?: (size: number) => void
  onClosePosition?: (positionId: string) => void
  onStop?: () => void
}

/**
 * Paper Trading Dashboard 主组件
 */
export function PaperTradingDashboard({
  account,
  stats,
  currentPrice,
  symbol,
  priceLoading,
  onBuy,
  onSell,
  onClosePosition,
  onStop,
}: PaperTradingDashboardProps) {
  const isRunning = !!account
  const hasPositions = account && account.positions.length > 0

  // 预设交易数量
  const tradeSizes = [0.01, 0.1, 1]

  return (
    <div className="space-y-6">
      {/* Header 区域 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">Paper Trading</h2>
          <Badge variant={isRunning ? 'success' : 'outline'} className="gap-1.5">
            <Activity className="h-3 w-3" />
            {isRunning ? '运行中' : '已停止'}
          </Badge>
        </div>

        {/* 实时价格显示 */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-muted-foreground">{symbol}</div>
            {priceLoading ? (
              <div className="h-6 w-24 skeleton-shimmer rounded" />
            ) : currentPrice ? (
              <div className="text-lg font-mono font-semibold">
                ${formatCurrency(currentPrice)}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">--</div>
            )}
          </div>

          {isRunning && onStop && (
            <Button variant="destructive" size="sm" onClick={onStop}>
              停止交易
            </Button>
          )}
        </div>
      </div>

      {/* 账户概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              总资产
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats ? (
              <div className="text-2xl font-mono font-bold">
                ${formatCurrency(stats.totalEquity)}
              </div>
            ) : (
              <div className="h-8 w-32 skeleton-shimmer rounded" />
            )}
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              可用余额
            </CardTitle>
          </CardHeader>
          <CardContent>
            {account ? (
              <div className="text-2xl font-mono font-bold">
                ${formatCurrency(account.currentBalance)}
              </div>
            ) : (
              <div className="h-8 w-32 skeleton-shimmer rounded" />
            )}
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              {stats && stats.totalPnl >= 0 ? (
                <TrendingUp className="h-4 w-4 text-up" />
              ) : (
                <TrendingDown className="h-4 w-4 text-down" />
              )}
              总盈亏
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats ? (
              <div
                className={cn(
                  'text-2xl font-mono font-bold',
                  stats.totalPnl >= 0 ? 'text-up' : 'text-down'
                )}
              >
                {stats.totalPnl >= 0 ? '+' : ''}${formatCurrency(stats.totalPnl)}
              </div>
            ) : (
              <div className="h-8 w-32 skeleton-shimmer rounded" />
            )}
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Percent className="h-4 w-4" />
              盈亏百分比
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats ? (
              <div
                className={cn(
                  'text-2xl font-mono font-bold',
                  stats.totalPnlPercent >= 0 ? 'text-up' : 'text-down'
                )}
              >
                {formatPercentage(stats.totalPnlPercent)}
              </div>
            ) : (
              <div className="h-8 w-32 skeleton-shimmer rounded" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* 持仓列表与快捷交易 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 持仓列表 */}
        <Card className="glass lg:col-span-2">
          <CardHeader>
            <CardTitle>当前持仓</CardTitle>
          </CardHeader>
          <CardContent>
            {!account || account.positions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无持仓
              </div>
            ) : (
              <div className="space-y-3">
                {account.positions.map((position) => (
                  <div
                    key={position.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border/50"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{position.symbol}</span>
                        <Badge
                          variant={position.side === 'long' ? 'success' : 'destructive'}
                          className="text-xs"
                        >
                          {position.side.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-x-6 text-sm">
                        <div>
                          <span className="text-muted-foreground">数量: </span>
                          <span className="font-mono">{position.size}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">开仓价: </span>
                          <span className="font-mono">${formatCurrency(position.entryPrice)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">当前价: </span>
                          <span className="font-mono">${formatCurrency(position.currentPrice)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">时间: </span>
                          <span className="text-xs">{formatTimestamp(position.openedAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div
                          className={cn(
                            'text-lg font-mono font-bold',
                            position.unrealizedPnl >= 0 ? 'text-up' : 'text-down'
                          )}
                        >
                          {position.unrealizedPnl >= 0 ? '+' : ''}${formatCurrency(position.unrealizedPnl)}
                        </div>
                        <div
                          className={cn(
                            'text-sm font-mono',
                            position.unrealizedPnlPercent >= 0 ? 'text-up' : 'text-down'
                          )}
                        >
                          {formatPercentage(position.unrealizedPnlPercent)}
                        </div>
                      </div>

                      {onClosePosition && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => { onClosePosition(position.id); }}
                          className="gap-1.5"
                        >
                          <X className="h-3.5 w-3.5" />
                          平仓
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 快捷交易区 */}
        <Card className="glass">
          <CardHeader>
            <CardTitle>快捷交易</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 买入 */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">买入 {symbol}</div>
              <div className="grid grid-cols-3 gap-2">
                {tradeSizes.map((size) => (
                  <Button
                    key={`buy-${size}`}
                    variant="success"
                    size="sm"
                    onClick={() => onBuy?.(size)}
                    disabled={!isRunning || !currentPrice}
                    className="font-mono"
                  >
                    {size}
                  </Button>
                ))}
              </div>
            </div>

            {/* 卖出 */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">卖出 {symbol}</div>
              <div className="grid grid-cols-3 gap-2">
                {tradeSizes.map((size) => (
                  <Button
                    key={`sell-${size}`}
                    variant="destructive"
                    size="sm"
                    onClick={() => onSell?.(size)}
                    disabled={!isRunning || !currentPrice || !hasPositions}
                    className="font-mono"
                  >
                    {size}
                  </Button>
                ))}
              </div>
            </div>

            {/* 当前价格信息 */}
            {currentPrice && (
              <div className="pt-4 border-t border-border/50">
                <div className="text-xs text-muted-foreground mb-1">参考价格</div>
                <div className="font-mono text-lg font-semibold">
                  ${formatCurrency(currentPrice)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 统计信息 */}
      {stats && (
        <Card className="glass">
          <CardHeader>
            <CardTitle>交易统计</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              <div>
                <div className="text-xs text-muted-foreground mb-1">总交易次数</div>
                <div className="text-xl font-mono font-bold">{stats.totalTrades}</div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">盈利次数</div>
                <div className="text-xl font-mono font-bold text-up">{stats.winTrades}</div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">亏损次数</div>
                <div className="text-xl font-mono font-bold text-down">{stats.lossTrades}</div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">胜率</div>
                <div className="text-xl font-mono font-bold">
                  {stats.winRate.toFixed(1)}%
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">平均盈利</div>
                <div className="text-xl font-mono font-bold text-up">
                  ${formatCurrency(stats.avgWin)}
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">平均亏损</div>
                <div className="text-xl font-mono font-bold text-down">
                  ${formatCurrency(Math.abs(stats.avgLoss))}
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">已实现盈亏</div>
                <div
                  className={cn(
                    'text-xl font-mono font-bold',
                    stats.realizedPnl >= 0 ? 'text-up' : 'text-down'
                  )}
                >
                  {stats.realizedPnl >= 0 ? '+' : ''}${formatCurrency(stats.realizedPnl)}
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">未实现盈亏</div>
                <div
                  className={cn(
                    'text-xl font-mono font-bold',
                    stats.unrealizedPnl >= 0 ? 'text-up' : 'text-down'
                  )}
                >
                  {stats.unrealizedPnl >= 0 ? '+' : ''}${formatCurrency(stats.unrealizedPnl)}
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">最大回撤</div>
                <div className="text-xl font-mono font-bold text-down">
                  {stats.maxDrawdown.toFixed(2)}%
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">总手续费</div>
                <div className="text-xl font-mono font-bold text-muted-foreground">
                  ${formatCurrency(stats.totalFees)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
