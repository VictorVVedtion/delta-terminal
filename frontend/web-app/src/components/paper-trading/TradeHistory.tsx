/**
 * TradeHistory - 交易历史记录
 *
 * 显示最近的交易记录
 */

'use client'

import { ArrowDown, ArrowUp, Clock } from 'lucide-react'
import React from 'react'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { PaperTrade } from '@/types/paperTrading'

// =============================================================================
// Types
// =============================================================================

interface TradeHistoryProps {
  /** 交易记录列表 */
  trades: PaperTrade[]
  /** 显示数量限制 */
  limit?: number
}

// =============================================================================
// Component
// =============================================================================

export function TradeHistory({ trades, limit = 5 }: TradeHistoryProps) {
  const displayTrades = trades.slice(-limit).reverse()

  if (displayTrades.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground">暂无交易记录</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {displayTrades.map((trade) => (
        <TradeItem key={trade.id} trade={trade} />
      ))}

      {trades.length > limit && (
        <div className="text-center pt-2">
          <span className="text-xs text-muted-foreground">
            共 {trades.length} 条记录，显示最近 {limit} 条
          </span>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Trade Item
// =============================================================================

function TradeItem({ trade }: { trade: PaperTrade }) {
  const isBuy = trade.side === 'buy'
  const hasRealizedPnl = trade.realizedPnl !== undefined

  return (
    <div
      className={cn(
        'flex items-center justify-between p-2 rounded-md',
        'bg-card/50 border border-border/50',
        'hover:bg-card/80 transition-colors'
      )}
    >
      {/* Left: Icon + Info */}
      <div className="flex items-center gap-3">
        {/* Direction Icon */}
        <div
          className={cn(
            'w-7 h-7 rounded-full flex items-center justify-center',
            isBuy
              ? 'bg-[hsl(var(--rb-green))]/10'
              : 'bg-[hsl(var(--rb-red))]/10'
          )}
        >
          {isBuy ? (
            <ArrowUp className="h-4 w-4 text-[hsl(var(--rb-green))]" />
          ) : (
            <ArrowDown className="h-4 w-4 text-[hsl(var(--rb-red))]" />
          )}
        </div>

        {/* Trade Info */}
        <div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] px-1.5 py-0',
                isBuy
                  ? 'border-[hsl(var(--rb-green))]/30 text-[hsl(var(--rb-green))]'
                  : 'border-[hsl(var(--rb-red))]/30 text-[hsl(var(--rb-red))]'
              )}
            >
              {isBuy ? '买入' : '卖出'}
            </Badge>
            <span className="text-xs font-medium">{trade.symbol}</span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {formatTime(trade.timestamp)}
          </div>
        </div>
      </div>

      {/* Right: Amount + PnL */}
      <div className="text-right">
        <div className="text-xs font-mono">
          <span className="text-muted-foreground">
            {trade.size.toFixed(4)} @
          </span>
          <span className="font-medium ml-1">${trade.price.toFixed(2)}</span>
        </div>

        {/* Realized PnL */}
        {hasRealizedPnl && (
          <div
            className={cn(
              'text-[10px] font-mono',
              trade.realizedPnl! >= 0
                ? 'text-[hsl(var(--rb-green))]'
                : 'text-[hsl(var(--rb-red))]'
            )}
          >
            {trade.realizedPnl! >= 0 ? '+' : ''}
            ${trade.realizedPnl!.toFixed(2)}
          </div>
        )}

        {/* Fee */}
        <div className="text-[10px] text-muted-foreground">
          手续费: ${trade.fee.toFixed(2)}
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Helpers
// =============================================================================

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins} 分钟前`
  if (diffHours < 24) return `${diffHours} 小时前`
  if (diffDays < 7) return `${diffDays} 天前`

  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default TradeHistory
