'use client'

import React from 'react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatTimestamp } from '@/lib/utils'

interface Trade {
  id: string
  timestamp: number
  symbol: string
  side: 'buy' | 'sell'
  price: number
  amount: number
  total: number
  fee: number
  status: 'completed' | 'pending' | 'failed'
}

interface TradeHistoryProps {
  trades: Trade[]
  limit?: number
}

export function TradeHistory({ trades, limit = 20 }: TradeHistoryProps) {
  const displayTrades = trades.slice(0, limit)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">成交历史</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-auto max-h-[400px] scrollbar-thin">
          <table className="w-full">
            <thead className="sticky top-0 bg-background border-b">
              <tr className="text-xs text-muted-foreground">
                <th className="text-left p-3 font-medium">时间</th>
                <th className="text-left p-3 font-medium">交易对</th>
                <th className="text-center p-3 font-medium">方向</th>
                <th className="text-right p-3 font-medium">价格</th>
                <th className="text-right p-3 font-medium">数量</th>
                <th className="text-right p-3 font-medium">总额</th>
                <th className="text-center p-3 font-medium">状态</th>
              </tr>
            </thead>
            <tbody>
              {displayTrades.map((trade) => (
                <tr
                  key={trade.id}
                  className="border-b hover:bg-muted/50 transition-colors"
                >
                  <td className="p-3 text-xs text-muted-foreground">
                    {formatTimestamp(trade.timestamp)}
                  </td>
                  <td className="p-3 text-sm font-medium">{trade.symbol}</td>
                  <td className="p-3 text-center">
                    <Badge
                      variant={trade.side === 'buy' ? 'success' : 'destructive'}
                      className="text-xs"
                    >
                      {trade.side === 'buy' ? '买入' : '卖出'}
                    </Badge>
                  </td>
                  <td className="p-3 text-sm text-right">
                    ${formatCurrency(trade.price)}
                  </td>
                  <td className="p-3 text-sm text-right">
                    {trade.amount.toFixed(6)}
                  </td>
                  <td className="p-3 text-sm text-right font-medium">
                    ${formatCurrency(trade.total)}
                  </td>
                  <td className="p-3 text-center">
                    <StatusBadge status={trade.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {displayTrades.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              暂无成交记录
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: Trade['status'] }) {
  const variants = {
    completed: { variant: 'success' as const, label: '已完成' },
    pending: { variant: 'warning' as const, label: '处理中' },
    failed: { variant: 'destructive' as const, label: '失败' },
  }

  const { variant, label } = variants[status]

  return (
    <Badge variant={variant} className="text-xs">
      {label}
    </Badge>
  )
}
