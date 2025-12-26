/**
 * PositionCard - 持仓信息卡片
 *
 * 显示单个持仓的详细信息
 */

'use client'

import React from 'react'
import { TrendingUp, TrendingDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { PaperPosition } from '@/types/paperTrading'

// =============================================================================
// Types
// =============================================================================

interface PositionCardProps {
  /** 持仓信息 */
  position: PaperPosition
  /** 平仓回调 */
  onClose?: (positionId: string) => void
  /** 是否禁用操作 */
  disabled?: boolean
}

// =============================================================================
// Component
// =============================================================================

export function PositionCard({
  position,
  onClose,
  disabled = false,
}: PositionCardProps) {
  const isProfit = position.unrealizedPnl >= 0
  const priceChange = position.currentPrice - position.entryPrice
  const priceChangePercent =
    (priceChange / position.entryPrice) * 100 * (position.side === 'long' ? 1 : -1)

  return (
    <div
      className={cn(
        'p-3 rounded-lg border transition-all',
        isProfit
          ? 'bg-[hsl(var(--rb-green))]/5 border-[hsl(var(--rb-green))]/20'
          : 'bg-[hsl(var(--rb-red))]/5 border-[hsl(var(--rb-red))]/20'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge
            variant={position.side === 'long' ? 'default' : 'secondary'}
            className={cn(
              'text-xs',
              position.side === 'long'
                ? 'bg-[hsl(var(--rb-green))]/10 text-[hsl(var(--rb-green))] border-[hsl(var(--rb-green))]/20'
                : 'bg-[hsl(var(--rb-red))]/10 text-[hsl(var(--rb-red))] border-[hsl(var(--rb-red))]/20'
            )}
          >
            {position.side === 'long' ? '多头' : '空头'}
          </Badge>
          <span className="font-medium text-sm">{position.symbol}</span>
        </div>

        {/* Close Button */}
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => onClose(position.id)}
            className="h-7 px-2 text-xs hover:bg-[hsl(var(--rb-red))]/10 hover:text-[hsl(var(--rb-red))]"
          >
            <X className="h-3 w-3 mr-1" />
            平仓
          </Button>
        )}
      </div>

      {/* Position Details */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        {/* Size */}
        <div className="flex justify-between">
          <span className="text-muted-foreground">数量</span>
          <span className="font-mono font-medium">
            {position.size.toFixed(4)}
          </span>
        </div>

        {/* Market Value */}
        <div className="flex justify-between">
          <span className="text-muted-foreground">市值</span>
          <span className="font-mono font-medium">
            ${(position.size * position.currentPrice).toFixed(2)}
          </span>
        </div>

        {/* Entry Price */}
        <div className="flex justify-between">
          <span className="text-muted-foreground">开仓价</span>
          <span className="font-mono">${position.entryPrice.toFixed(2)}</span>
        </div>

        {/* Current Price */}
        <div className="flex justify-between">
          <span className="text-muted-foreground">现价</span>
          <span
            className={cn(
              'font-mono flex items-center gap-1',
              isProfit ? 'text-[hsl(var(--rb-green))]' : 'text-[hsl(var(--rb-red))]'
            )}
          >
            ${position.currentPrice.toFixed(2)}
            {isProfit ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
          </span>
        </div>
      </div>

      {/* PnL Section */}
      <div className="mt-3 pt-3 border-t border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">未实现盈亏</span>
          <div className="text-right">
            <span
              className={cn(
                'font-mono font-bold',
                isProfit
                  ? 'text-[hsl(var(--rb-green))]'
                  : 'text-[hsl(var(--rb-red))]'
              )}
            >
              {isProfit ? '+' : ''}${position.unrealizedPnl.toFixed(2)}
            </span>
            <span
              className={cn(
                'ml-2 text-xs font-mono',
                isProfit
                  ? 'text-[hsl(var(--rb-green))]/70'
                  : 'text-[hsl(var(--rb-red))]/70'
              )}
            >
              ({isProfit ? '+' : ''}{position.unrealizedPnlPercent.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PositionCard
