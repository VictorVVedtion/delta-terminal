/**
 * QuickTradeButtons - 快捷交易按钮组
 *
 * 提供预设数量的快速买入/卖出按钮
 */

'use client'

import { ArrowDown, ArrowUp, Loader2 } from 'lucide-react'
import React, { useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

interface QuickTradeButtonsProps {
  /** 交易对符号 */
  symbol: string
  /** 当前价格 */
  currentPrice: number | null
  /** 可用余额 */
  availableBalance: number
  /** 当前持仓数量 */
  positionSize: number
  /** 执行买入 */
  onBuy: (size: number) => void
  /** 执行卖出 */
  onSell: (size: number) => void
  /** 是否禁用 */
  disabled?: boolean
  /** 预设数量列表 */
  presetSizes?: number[]
}

// =============================================================================
// Default Presets
// =============================================================================

const DEFAULT_PRESETS = [0.001, 0.01, 0.1]

// =============================================================================
// Component
// =============================================================================

export function QuickTradeButtons({
  symbol,
  currentPrice,
  availableBalance,
  positionSize,
  onBuy,
  onSell,
  disabled = false,
  presetSizes = DEFAULT_PRESETS,
}: QuickTradeButtonsProps) {
  const [isProcessing, setIsProcessing] = useState<string | null>(null)

  // 计算可买入数量
  const maxBuySize = currentPrice
    ? Math.floor((availableBalance / currentPrice / 1.001) * 1000) / 1000
    : 0

  // 处理买入
  const handleBuy = async (size: number) => {
    if (disabled || !currentPrice) return

    const key = `buy_${size}`
    setIsProcessing(key)

    try {
      onBuy(size)
    } finally {
      setTimeout(() => { setIsProcessing(null); }, 300)
    }
  }

  // 处理卖出
  const handleSell = async (size: number) => {
    if (disabled || !currentPrice) return

    const key = `sell_${size}`
    setIsProcessing(key)

    try {
      onSell(size)
    } finally {
      setTimeout(() => { setIsProcessing(null); }, 300)
    }
  }

  // 基础资产名称
  const baseAsset = symbol.split('/')[0] || 'BTC'

  return (
    <div className="space-y-3">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          快捷交易
        </span>
        {currentPrice && (
          <span className="text-xs text-muted-foreground">
            可买 {maxBuySize.toFixed(4)} {baseAsset}
          </span>
        )}
      </div>

      {/* 买入按钮组 */}
      <div className="space-y-2">
        <span className="text-xs text-muted-foreground">买入 {baseAsset}</span>
        <div className="grid grid-cols-3 gap-2">
          {presetSizes.map((size) => {
            const key = `buy_${size}`
            const canBuy = size <= maxBuySize
            const isLoading = isProcessing === key

            return (
              <Button
                key={key}
                variant="outline"
                size="sm"
                disabled={disabled || !canBuy || isLoading}
                onClick={() => handleBuy(size)}
                className={cn(
                  'relative transition-all',
                  canBuy
                    ? 'border-[hsl(var(--rb-green))]/30 hover:bg-[hsl(var(--rb-green))]/10 hover:border-[hsl(var(--rb-green))]/50'
                    : 'opacity-50'
                )}
              >
                {isLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <ArrowUp className="h-3 w-3 mr-1 text-[hsl(var(--rb-green))]" />
                    <span className="font-mono text-xs">{size}</span>
                  </>
                )}
              </Button>
            )
          })}
        </div>
      </div>

      {/* 卖出按钮组 */}
      <div className="space-y-2">
        <span className="text-xs text-muted-foreground">
          卖出 {baseAsset}
          {positionSize > 0 && (
            <span className="ml-2 text-[hsl(var(--rb-green))]">
              持仓: {positionSize.toFixed(4)}
            </span>
          )}
        </span>
        <div className="grid grid-cols-3 gap-2">
          {presetSizes.map((size) => {
            const key = `sell_${size}`
            const canSell = size <= positionSize
            const isLoading = isProcessing === key

            return (
              <Button
                key={key}
                variant="outline"
                size="sm"
                disabled={disabled || !canSell || isLoading}
                onClick={() => handleSell(size)}
                className={cn(
                  'relative transition-all',
                  canSell
                    ? 'border-[hsl(var(--rb-red))]/30 hover:bg-[hsl(var(--rb-red))]/10 hover:border-[hsl(var(--rb-red))]/50'
                    : 'opacity-50'
                )}
              >
                {isLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <ArrowDown className="h-3 w-3 mr-1 text-[hsl(var(--rb-red))]" />
                    <span className="font-mono text-xs">{size}</span>
                  </>
                )}
              </Button>
            )
          })}
        </div>
      </div>

      {/* 全部卖出 */}
      {positionSize > 0 && (
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || isProcessing === 'sell_all'}
          onClick={() => handleSell(positionSize)}
          className="w-full border-[hsl(var(--rb-red))]/30 hover:bg-[hsl(var(--rb-red))]/10 hover:border-[hsl(var(--rb-red))]/50"
        >
          {isProcessing === 'sell_all' ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              <ArrowDown className="h-3 w-3 mr-1 text-[hsl(var(--rb-red))]" />
              全部卖出 ({positionSize.toFixed(4)} {baseAsset})
            </>
          )}
        </Button>
      )}
    </div>
  )
}

export default QuickTradeButtons
