'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'

interface OrderBookEntry {
  price: number
  amount: number
  total: number
}

interface OrderBookProps {
  asks: OrderBookEntry[]
  bids: OrderBookEntry[]
  spread: number
  spreadPercent: number
}

export function OrderBook({ asks, bids, spread, spreadPercent }: OrderBookProps) {
  const maxTotal = Math.max(
    ...asks.map(a => a.total),
    ...bids.map(b => b.total)
  )

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">订单簿</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-2">
          {/* Headers */}
          <div className="grid grid-cols-3 gap-2 px-4 text-xs text-muted-foreground">
            <div className="text-left">价格(USDT)</div>
            <div className="text-right">数量</div>
            <div className="text-right">总计</div>
          </div>

          {/* Asks (卖单) */}
          <div className="space-y-0.5">
            {asks.slice(0, 10).reverse().map((ask, index) => (
              <OrderBookRow
                key={`ask-${index}`}
                entry={ask}
                maxTotal={maxTotal}
                type="ask"
              />
            ))}
          </div>

          {/* Spread */}
          <div className="px-4 py-2 bg-muted/50">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">
                {formatCurrency(asks[asks.length - 1]?.price || 0)}
              </span>
              <span className="text-xs text-muted-foreground">
                价差: {formatCurrency(spread)} ({spreadPercent.toFixed(2)}%)
              </span>
            </div>
          </div>

          {/* Bids (买单) */}
          <div className="space-y-0.5">
            {bids.slice(0, 10).map((bid, index) => (
              <OrderBookRow
                key={`bid-${index}`}
                entry={bid}
                maxTotal={maxTotal}
                type="bid"
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface OrderBookRowProps {
  entry: OrderBookEntry
  maxTotal: number
  type: 'ask' | 'bid'
}

function OrderBookRow({ entry, maxTotal, type }: OrderBookRowProps) {
  const percentage = (entry.total / maxTotal) * 100

  return (
    <div className="relative px-4 py-1 hover:bg-muted/50 cursor-pointer group">
      {/* Background bar */}
      <div
        className={`absolute right-0 top-0 h-full ${
          type === 'ask' ? 'bg-red-500/10' : 'bg-green-500/10'
        }`}
        style={{ width: `${percentage}%` }}
      />

      {/* Content */}
      <div className="relative grid grid-cols-3 gap-2 text-sm">
        <div
          className={`text-left font-medium ${
            type === 'ask' ? 'text-red-400' : 'text-green-400'
          }`}
        >
          {formatCurrency(entry.price)}
        </div>
        <div className="text-right">{entry.amount.toFixed(6)}</div>
        <div className="text-right text-muted-foreground">
          {formatCurrency(entry.total)}
        </div>
      </div>
    </div>
  )
}
