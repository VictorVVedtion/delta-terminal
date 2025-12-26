/**
 * Paper Trading Example - 使用示例
 * Story 2: 虚拟账户与模拟订单系统
 *
 * 此文件展示如何使用 usePaperTrading Hook
 */

'use client'

import { useEffect, useState } from 'react'
import { usePaperTrading } from '@/hooks/usePaperTrading'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface PaperTradingExampleProps {
  agentId: string
}

export function PaperTradingExample({ agentId }: PaperTradingExampleProps) {
  const {
    account,
    stats,
    initAccount,
    buy,
    sell,
    closePosition,
    updatePrice,
    getPositionBySymbol,
    canBuy,
    canSell,
  } = usePaperTrading({ agentId })

  const [btcPrice, setBtcPrice] = useState(50000)

  // 初始化账户
  useEffect(() => {
    if (!account) {
      // 初始化 10000 USDT 虚拟资金
      initAccount(agentId, 10000)
    }
  }, [account, agentId, initAccount])

  // 模拟价格变化
  useEffect(() => {
    const interval = setInterval(() => {
      setBtcPrice((prev) => {
        const change = (Math.random() - 0.5) * 100
        return Math.max(45000, Math.min(55000, prev + change))
      })
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  // 更新持仓价格
  useEffect(() => {
    if (account && getPositionBySymbol('BTC/USDT')) {
      updatePrice('BTC/USDT', btcPrice)
    }
  }, [btcPrice, account, getPositionBySymbol, updatePrice])

  // 处理买入
  const handleBuy = () => {
    const size = 0.01 // 0.01 BTC
    const check = canBuy('BTC/USDT', size, btcPrice)
    if (!check.can) {
      alert(check.reason)
      return
    }

    const result = buy('BTC/USDT', size, btcPrice)
    if (result.success) {
      alert('买入成功!')
    } else {
      alert(`买入失败: ${result.error}`)
    }
  }

  // 处理卖出
  const handleSell = () => {
    const size = 0.01 // 0.01 BTC
    const check = canSell('BTC/USDT', size)
    if (!check.can) {
      alert(check.reason)
      return
    }

    const result = sell('BTC/USDT', size, btcPrice)
    if (result.success) {
      alert(`卖出成功! 已实现盈亏: ${result.trade?.realizedPnl?.toFixed(2)} USDT`)
    } else {
      alert(`卖出失败: ${result.error}`)
    }
  }

  // 处理平仓
  const handleClose = () => {
    const position = getPositionBySymbol('BTC/USDT')
    if (!position) {
      alert('无持仓')
      return
    }

    const result = closePosition(position.id, btcPrice)
    if (result.success) {
      alert(`平仓成功! 已实现盈亏: ${result.realizedPnl?.toFixed(2)} USDT`)
    } else {
      alert(`平仓失败: ${result.error}`)
    }
  }

  if (!account || !stats) {
    return <div>加载中...</div>
  }

  const btcPosition = getPositionBySymbol('BTC/USDT')

  return (
    <div className="space-y-4 p-4">
      {/* 账户概览 */}
      <Card>
        <CardHeader>
          <CardTitle>虚拟账户概览</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">总资产</span>
            <span className="font-bold">{stats.totalEquity.toFixed(2)} USDT</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">可用余额</span>
            <span>{account.currentBalance.toFixed(2)} USDT</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">总盈亏</span>
            <span
              className={
                stats.totalPnl >= 0 ? 'text-green-500' : 'text-red-500'
              }
            >
              {stats.totalPnl >= 0 ? '+' : ''}
              {stats.totalPnl.toFixed(2)} USDT ({stats.totalPnlPercent.toFixed(2)}%)
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">未实现盈亏</span>
            <span
              className={
                stats.unrealizedPnl >= 0 ? 'text-green-500' : 'text-red-500'
              }
            >
              {stats.unrealizedPnl >= 0 ? '+' : ''}
              {stats.unrealizedPnl.toFixed(2)} USDT
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">胜率</span>
            <span>{stats.winRate.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">总交易次数</span>
            <span>{stats.totalTrades}</span>
          </div>
        </CardContent>
      </Card>

      {/* BTC 价格 */}
      <Card>
        <CardHeader>
          <CardTitle>BTC/USDT 价格</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">${btcPrice.toFixed(2)}</div>
        </CardContent>
      </Card>

      {/* 持仓信息 */}
      <Card>
        <CardHeader>
          <CardTitle>BTC 持仓</CardTitle>
        </CardHeader>
        <CardContent>
          {btcPosition ? (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">数量</span>
                <span>{btcPosition.size.toFixed(4)} BTC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">开仓均价</span>
                <span>${btcPosition.entryPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">当前价格</span>
                <span>${btcPosition.currentPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">未实现盈亏</span>
                <span
                  className={
                    btcPosition.unrealizedPnl >= 0
                      ? 'text-green-500'
                      : 'text-red-500'
                  }
                >
                  {btcPosition.unrealizedPnl >= 0 ? '+' : ''}
                  {btcPosition.unrealizedPnl.toFixed(2)} USDT (
                  {btcPosition.unrealizedPnlPercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground">无持仓</div>
          )}
        </CardContent>
      </Card>

      {/* 交易按钮 */}
      <div className="flex gap-2">
        <Button onClick={handleBuy} variant="default" className="flex-1">
          买入 0.01 BTC
        </Button>
        <Button onClick={handleSell} variant="outline" className="flex-1">
          卖出 0.01 BTC
        </Button>
        {btcPosition && (
          <Button onClick={handleClose} variant="destructive" className="flex-1">
            平仓
          </Button>
        )}
      </div>

      {/* 交易历史 */}
      <Card>
        <CardHeader>
          <CardTitle>最近交易</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {account.trades.slice(0, 5).map((trade) => (
              <div
                key={trade.id}
                className="flex items-center justify-between border-b pb-2"
              >
                <div className="flex items-center gap-2">
                  <Badge variant={trade.side === 'buy' ? 'default' : 'outline'}>
                    {trade.side === 'buy' ? '买入' : '卖出'}
                  </Badge>
                  <span className="text-sm">{trade.symbol}</span>
                </div>
                <div className="text-right text-sm">
                  <div>
                    {trade.size.toFixed(4)} @ ${trade.price.toFixed(2)}
                  </div>
                  {trade.realizedPnl !== undefined && (
                    <div
                      className={
                        trade.realizedPnl >= 0 ? 'text-green-500' : 'text-red-500'
                      }
                    >
                      {trade.realizedPnl >= 0 ? '+' : ''}
                      {trade.realizedPnl.toFixed(2)} USDT
                    </div>
                  )}
                </div>
              </div>
            ))}
            {account.trades.length === 0 && (
              <div className="text-muted-foreground text-sm">暂无交易记录</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
